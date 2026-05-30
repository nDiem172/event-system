const express = require('express');
const r = express.Router();
const { protect } = require('../../middleware/auth.middleware');
const crypto = require('crypto');
const qs = require('qs');     

const nowVnpayFormat = () => new Date().toISOString().replace(/\D/g, '').slice(0, 14);

const Ticket = require('../../models/Ticket');
const Event = require('../../models/Event');
const { Transaction } = require('../../models/index');
const { generateQRCode } = require('../../utils/qr.util');
const { sendEmail, emailTemplates } = require('../../utils/email.util');
const User = require('../../models/User');

// ====================== TẠO URL THANH TOÁN ======================
r.post('/vnpay/create', protect, async (req, res, next) => {
  try {
    const { ticketId } = req.body;
    const ticket = await Ticket.findOne({ _id: ticketId, userId: req.user._id, status: 'Pending' });
    if (!ticket) return res.status(404).json({ success: false, message: 'Vé không hợp lệ.' });

    const event = await Event.findById(ticket.eventId);

    const createDate = nowVnpayFormat();
    const orderId = `TICKET${Date.now()}`;

let params = {
  vnp_Version: "2.1.0",
  vnp_Command: "pay",
  vnp_TmnCode: process.env.VNPAY_TMN_CODE,
  vnp_Amount: Math.round(ticket.price * 100),
  vnp_CreateDate: createDate,
  vnp_CurrCode: "VND",
  vnp_IpAddr: req.ip || "127.0.0.1",
  vnp_Locale: "vn",
  vnp_OrderInfo: `Thanh_toan_ve_${event._id}`,
  vnp_OrderType: "other",
  vnp_ReturnUrl: process.env.VNPAY_RETURN_URL,
  vnp_TxnRef: orderId
};

    // === Sắp xếp theo thứ tự alphabet ===
    params = Object.fromEntries(
      Object.entries(params).sort(([a], [b]) => a.localeCompare(b))
    );

    // Tạo signData KHÔNG encode (rất quan trọng)
    const signData = qs.stringify(params, { encode: true });

    const hmac = crypto.createHmac("sha512", process.env.VNPAY_HASH_SECRET);
    const secureHash = hmac
      .update(Buffer.from(signData, "utf-8"))
      .digest("hex");

    // Thêm SecureHash vào params
    params.vnp_SecureHash = secureHash;

    // Tạo URL thanh toán với encode=true
    const paymentUrl = `${process.env.VNPAY_URL}?${qs.stringify(params, { encode: true })}`;

    console.log("[VNPay] SignData:", signData);
    console.log("[VNPay] SecureHash:", secureHash);

    await Transaction.create({
      userId: req.user._id,
      eventId: ticket.eventId,
      ticketId: ticket._id,
      amount: ticket.price,
      type: 'Payment',
      paymentMethod: 'VNPay',
      transactionRef: orderId,
      status: 'Pending',
    });

    res.json({ success: true, paymentUrl, orderId });
  } catch (err) {
    console.error('VNPay Create Error:', err);
    next(err);
  }
});

// ====================== VNPAY RETURN ======================
r.get('/vnpay/return', async (req, res, next) => {
  try {
    const { vnp_SecureHash, ...vnpParams } = req.query;

    const secretKey = process.env.VNPAY_HASH_SECRET;

    // Sắp xếp và tạo signData để verify (không encode)
    const sortedKeys = Object.keys(vnpParams).sort();
    const signData = sortedKeys
      .map(key => `${key}=${vnpParams[key]}`)
      .join('&');

    const hmac = crypto.createHmac('sha512', secretKey);
    const computedHash = hmac
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    if (computedHash !== vnp_SecureHash) {
      console.error('❌ Hash mismatch');
      console.error('Computed:', computedHash);
      console.error('Received :', vnp_SecureHash);
      return res.redirect(`${process.env.CLIENT_URL}/payment/result?status=invalid`);
    }

    const txn = await Transaction.findOne({ transactionRef: vnpParams.vnp_TxnRef });
    if (!txn) {
      return res.redirect(`${process.env.CLIENT_URL}/payment/result?status=notfound`);
    }

    if (vnpParams.vnp_ResponseCode === '00') {
      txn.status = 'Success';
      txn.vnpayData = req.query;
      txn.vnpTransactionNo = vnpParams.vnp_TransactionNo;
      txn.paymentDate = vnpParams.vnp_PayDate;
      txn.bankCode = vnpParams.vnp_BankCode;
      await txn.save();

      const ticket = await Ticket.findById(txn.ticketId);
      if (ticket) {
        ticket.status = 'Valid';
        ticket.holdExpiresAt = undefined;
        await ticket.save();

        const qrImage = await generateQRCode(ticket.ticketCode || `TKT-${ticket._id}`);
        ticket.qrCode = qrImage;
        await ticket.save();

        const event = await Event.findById(ticket.eventId);
        const user = await User.findById(ticket.userId);

        if (user && event) {
          try {
            const ticketLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/my-tickets/${ticket._id}`;
            await sendEmail({
              to: user.email,
              subject: `Vé tham gia: ${event.title}`,
              html: emailTemplates.ticketConfirm(event, qrImage, user.fullName, ticketLink, ticket),
            });
          } catch (e) {
            console.error('Send email error:', e);
          }
        }
      }
      return res.redirect(`${process.env.CLIENT_URL}/payment/result?status=success&ticketId=${txn.ticketId}`);
    } else {
      txn.status = 'Failed';
      await txn.save();
      return res.redirect(`${process.env.CLIENT_URL}/payment/result?status=failed`);
    }
  } catch (err) {
    console.error('VNPay Return Error:', err);
    next(err);
  }
});

module.exports = r;