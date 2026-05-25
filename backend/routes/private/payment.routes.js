const express = require('express');
const r = express.Router();
const { protect } = require('../../middleware/auth.middleware');
const crypto = require('crypto');

const nowVnpayFormat = () => new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const Ticket = require('../../models/Ticket');
const Event  = require('../../models/Event');
const { Transaction } = require('../../models/index');
const { generateQRCode } = require('../../utils/qr.util');
const { sendEmail, emailTemplates } = require('../../utils/email.util');
const User = require('../../models/User');

// POST /api/payment/vnpay/create  — tạo URL thanh toán VNPay
r.post('/vnpay/create', protect, async (req, res, next) => {
  try {
    const { ticketId } = req.body;
    const ticket = await Ticket.findOne({ _id: ticketId, userId: req.user._id, status: 'Pending' });
    if (!ticket) return res.status(404).json({ success: false, message: 'Vé không hợp lệ hoặc đã hết thời gian giữ slot.' });

    const event = await Event.findById(ticket.eventId);
    const tmnCode    = process.env.VNPAY_TMN_CODE;
    const secretKey  = process.env.VNPAY_HASH_SECRET;
    const returnUrl  = process.env.VNPAY_RETURN_URL;
    const vnpUrl     = process.env.VNPAY_URL;
    const createDate = nowVnpayFormat();
    const orderId    = ticket._id.toString().slice(-8).toUpperCase();

    let params = {
      vnp_Version:    '2.1.0',
      vnp_Command:    'pay',
      vnp_TmnCode:    tmnCode,
      vnp_Amount:     ticket.price * 100,
      vnp_CreateDate: createDate,
      vnp_CurrCode:   'VND',
      vnp_IpAddr:     req.ip,
      vnp_Locale:     'vn',
      vnp_OrderInfo:  `Thanh toan ve: ${event.title}`,
      vnp_OrderType:  'other',
      vnp_ReturnUrl:  returnUrl,
      vnp_TxnRef:     orderId,
    };

    // Sắp xếp và ký
    const sorted = Object.keys(params).sort().reduce((obj, k) => { obj[k] = params[k]; return obj; }, {});
    const signData = new URLSearchParams(sorted).toString();
    const hmac = crypto.createHmac('sha512', secretKey).update(signData).digest('hex');
    const paymentUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${hmac}`;

    // Lưu txnRef để đối soát
    await Transaction.create({
      userId: req.user._id, eventId: ticket.eventId, ticketId: ticket._id,
      amount: ticket.price, type: 'Payment', paymentMethod: 'VNPay',
      transactionRef: orderId, status: 'Pending',
    });

    res.json({ success: true, paymentUrl });
  } catch (err) { next(err); }
});

// GET /api/payment/vnpay/return — VNPay callback (redirect về FE qua query params)
r.get('/vnpay/return', async (req, res, next) => {
  try {
    const { vnp_SecureHash, vnp_TxnRef, vnp_ResponseCode, ...rest } = req.query;
    const secretKey = process.env.VNPAY_HASH_SECRET;
    const sorted    = Object.keys(rest).sort().reduce((obj, k) => { obj[k] = rest[k]; return obj; }, {});
    const signData  = new URLSearchParams(sorted).toString();
    const checkHash = crypto.createHmac('sha512', secretKey).update(signData).digest('hex');

    if (checkHash !== vnp_SecureHash) {
      return res.redirect(`${process.env.CLIENT_URL}/payment/result?status=invalid`);
    }

    const txn = await Transaction.findOne({ transactionRef: vnp_TxnRef });
    if (!txn) return res.redirect(`${process.env.CLIENT_URL}/payment/result?status=notfound`);

    if (vnp_ResponseCode === '00') {
      // Thành công
      txn.status = 'Success';
      txn.vnpayData = req.query;
      await txn.save();

      const ticket = await Ticket.findById(txn.ticketId);
      ticket.status = 'Valid';
      ticket.holdExpiresAt = undefined;
      await ticket.save();

      // Tạo QR và gửi email
      const qrImage = await generateQRCode(ticket.qrCode);
      ticket.qrCode = qrImage;
      await ticket.save();

      const event = await Event.findById(ticket.eventId);
      const user  = await User.findById(ticket.userId);
      try {
        await sendEmail({ to: user.email, subject: `Vé tham gia: ${event.title}`, html: emailTemplates.ticketConfirm(event, qrImage) });
      } catch (_) {}

      return res.redirect(`${process.env.CLIENT_URL}/payment/result?status=success&ticketId=${ticket._id}`);
    } else {
      txn.status = 'Failed';
      await txn.save();
      // Giải phóng slot vé
      const ticket = await Ticket.findById(txn.ticketId);
      if (ticket && ticket.status === 'Pending') {
        ticket.status = 'Canceled';
        await ticket.save();
        await Event.findByIdAndUpdate(ticket.eventId, { $inc: { availableTickets: 1 } });
      }
      return res.redirect(`${process.env.CLIENT_URL}/payment/result?status=failed`);
    }
  } catch (err) { next(err); }
});

module.exports = r;
