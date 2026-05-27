const Event   = require('../models/Event');
const Ticket  = require('../models/Ticket');
const User    = require('../models/User');
const { RefundRequest, WaitingList, Transaction, SystemLog, CheckInLog } = require('../models/index');
const { sendEmail, emailTemplates } = require('../utils/email.util');
const XLSX = require('xlsx');
const { generateQRCode, parseTicketCodeFromScan } = require('../utils/qr.util');
const crypto = require('crypto');
const qs = require('qs');


const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh';

const getTZParts = (date, timeZone = APP_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
};

// Create a Date that represents the *wall time* in the timezone, for consistent comparisons.
const nowInTZ = (timeZone = APP_TIMEZONE) => {
  const p = getTZParts(new Date(), timeZone);
  return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second));
};

// ══════════════════════════════════════════════
// CONTENT CREATOR — UC-08
// ══════════════════════════════════════════════
// const createEvent = async (req, res, next) => {
//   try {
//     const event = await Event.create({ ...req.body, createdBy: req.user._id, status: 'Draft' });
//     res.status(201).json({ success: true, message: 'Sự kiện đã được tạo.', data: event });
//   } catch (err) { next(err); }
// };
const createEvent = async (req, res, next) => {
  try {
    // Nếu không có sessions, tự tạo 1 phiên mặc định từ startTime để tránh lỗi check-in
    const sessions = req.body.sessions && req.body.sessions.length > 0 
        ? req.body.sessions 
        : [{ date: req.body.startTime, startCheckIn: "08:00", endCheckIn: "23:00" }];
        
    const event = await Event.create({ ...req.body, sessions, createdBy: req.user._id, status: 'Draft' });
    res.status(201).json({ success: true, message: 'Sự kiện đã được tạo.', data: event });
  } catch (err) { next(err); }
};

const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!event) return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện.' });
    if (!['Draft', 'Rejected'].includes(event.status)) {
      return res.status(400).json({ success: false, message: 'Chỉ được chỉnh sửa sự kiện ở trạng thái Nháp hoặc Từ chối.' });
    }
    Object.assign(event, req.body);
    await event.save();
    res.json({ success: true, message: 'Cập nhật sự kiện thành công.', data: event });
  } catch (err) { next(err); }
};

const submitForReview = async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!event) return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện.' });
    if (!['Draft', 'Rejected'].includes(event.status)) {
      return res.status(400).json({ success: false, message: 'Chỉ gửi duyệt được khi sự kiện ở trạng thái Nháp hoặc Từ chối.' });
    }
    event.status = 'Pending';
    await event.save();
    res.json({ success: true, message: 'Đã gửi yêu cầu phê duyệt thành công.' });
  } catch (err) { next(err); }
};

const getMyEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: events });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════
// MANAGER — UC-09, UC-10, UC-11
// ══════════════════════════════════════════════
const getPendingEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ status: 'Pending' }).populate('createdBy', 'fullName email').sort({ updatedAt: 1 });
    res.json({ success: true, data: events });
  } catch (err) { next(err); }
};

const approveEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event || event.status !== 'Pending') return res.status(400).json({ success: false, message: 'Sự kiện không ở trạng thái chờ duyệt.' });
    event.status = 'Public';
    event.approvedBy = req.user._id;
    event.approvedAt = new Date();
    await event.save();
    res.json({ success: true, message: 'Sự kiện đã được phê duyệt và công khai.' });
  } catch (err) { next(err); }
};

const rejectEvent = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối.' });
    const event = await Event.findById(req.params.id).populate('createdBy', 'email');
    if (!event || event.status !== 'Pending') return res.status(400).json({ success: false, message: 'Sự kiện không ở trạng thái chờ duyệt.' });
    event.status = 'Rejected';
    event.rejectedReason = reason;
    await event.save();
    try {
      await sendEmail({ to: event.createdBy.email, subject: 'Sự kiện bị từ chối', html: emailTemplates.eventRejected(event, reason) });
    } catch (_) {}
    res.json({ success: true, message: 'Đã từ chối sự kiện.' });
  } catch (err) { next(err); }
};

// Duyệt hoàn tiền

const getPendingRefunds = async (req, res, next) => {
  try {
    const refunds = await RefundRequest.find({ status: 'Pending' })
      .populate('userId', 'fullName email')
      .populate('eventId', 'title date startDate')
      .populate('ticketId', 'attendeeInfo price ticketType')
      .sort({ createdAt: 1 });

    // Tính số tiền hoàn thực tế cho mỗi yêu cầu
    const calculateRefundRate = (eventDate, cancelDate) => {
      const eventTime = new Date(eventDate).getTime();
      const cancelTime = new Date(cancelDate).getTime();

      const diffMinutes = (eventTime - cancelTime) / (1000 * 60);
      const diffDays = diffMinutes / (60 * 24);

      // quá giờ (sau khi sự kiện diễn ra)
      if (diffMinutes <= 0) return 0;

      // ≤ 10 phút sau khi đặt
      if (diffMinutes <= 10) return 0.9;

      // trong ngày diễn ra sự kiện
      if (diffDays < 1) return 0;

      // 1–5 ngày trước sự kiện
      if (diffDays <= 5) return 0.5;

      // > 5 ngày trước sự kiện
      return 0.8;
    };

    const refundsWithActualAmount = refunds.map(refund => {
      const eventDate = refund.eventId?.date || refund.eventId?.startDate;
      const cancelDate = refund.createdAt;
      const refundRate = calculateRefundRate(eventDate, cancelDate);
      const originalAmount = refund.ticketId?.price || 0;
      const actualAmount = Math.floor(originalAmount * refundRate);

      return {
        ...refund.toObject(),
        expectedAmount: actualAmount,
        refundRate: refundRate
      };
    });

    res.json({ success: true, data: refundsWithActualAmount });
  } catch (err) { next(err); }
};

const calculateRefundRate = (eventDate, cancelDate) => {
  const eventTime = new Date(eventDate).getTime();
  const cancelTime = new Date(cancelDate).getTime();

  const diffMinutes = (eventTime - cancelTime) / (1000 * 60);
  const diffDays = diffMinutes / (60 * 24);

  // hủy sau khi sự kiện diễn ra
  if (diffMinutes <= 0) return 0;

  // hủy trong 10 phút sau khi đặt/hủy
  if (diffMinutes <= 10) return 0.8;

  // hủy trong ngày diễn ra
  if (diffDays < 1) return 0;

  // hủy trước ≤ 5 ngày
  if (diffDays <= 5) return 0.5;

  // hủy trước > 5 ngày
  return 1;
};

const approveRefund = async (req, res, next) => {
  try {
    const refund = await RefundRequest.findById(req.params.id)
      .populate('userId', 'email')
      .populate('eventId', 'title date startDate');

    if (!refund || refund.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Yêu cầu không hợp lệ.',
      });
    }

    // ==========================
    // FIND PAYMENT GỐC
    // ==========================
    const paymentTxn = await Transaction.findOne({
      ticketId: refund.ticketId,
      type: 'Payment',
      status: 'Success',
    });

    if (!paymentTxn) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy giao dịch thanh toán gốc.',
      });
    }

    if (paymentTxn.paymentMethod !== 'VNPay') {
      return res.status(400).json({
        success: false,
        message: `Chỉ hoàn VNPay. Giao dịch này là ${paymentTxn.paymentMethod}.`,
      });
    }

    if (!paymentTxn.vnpTransactionNo || !paymentTxn.paymentDate) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu vnpTransactionNo hoặc paymentDate.',
      });
    }

    // ==========================
    // REFUND RULE LOGIC (QUAN TRỌNG)
    // ==========================
    const calculateRefundRate = (eventDate, cancelDate) => {
      const eventTime = new Date(eventDate).getTime();
      const cancelTime = new Date(cancelDate).getTime();

      const diffMinutes = (eventTime - cancelTime) / (1000 * 60);
      const diffDays = diffMinutes / (60 * 24);

      // quá giờ (sau khi sự kiện diễn ra)
      if (diffMinutes <= 0) return 0;

      // ≤ 10 phút sau khi đặt
      if (diffMinutes <= 10) return 0.9;

      // trong ngày diễn ra sự kiện
      if (diffDays < 1) return 0;

      // 1–5 ngày trước sự kiện
      if (diffDays <= 5) return 0.5;

      // > 5 ngày trước sự kiện
      return 0.8;
    };

    // ==========================
    // TÍNH TIỀN HOÀN (SERVER SIDE ONLY)
    // ==========================
    const originalAmount = paymentTxn.amount;

    const eventDate =
      refund.eventId.date || refund.eventId.startDate;

    const cancelDate = new Date(refund.createdAt);

    const refundRate = calculateRefundRate(eventDate, cancelDate);

    const actualAmount = Math.floor(originalAmount * refundRate);

    console.log("ORIGINAL:", originalAmount);
    console.log("RATE:", refundRate);
    console.log("ACTUAL:", actualAmount);

    // ==========================
    // FORMAT DATE VNPay
    // ==========================
    function formatDateVNPay(date) {
      return (
        date.getFullYear().toString() +
        String(date.getMonth() + 1).padStart(2, '0') +
        String(date.getDate()).padStart(2, '0') +
        String(date.getHours()).padStart(2, '0') +
        String(date.getMinutes()).padStart(2, '0') +
        String(date.getSeconds()).padStart(2, '0')
      );
    }

    const createDate = formatDateVNPay(new Date());

    const txnRef = paymentTxn.transactionRef;

    let transactionDate = paymentTxn.paymentDate;

    if (!/^\d{14}$/.test(String(transactionDate))) {
      transactionDate = formatDateVNPay(new Date(transactionDate));
    }

    // ==========================
    // VNPay REQUEST
    // ==========================
    // Nếu hoàn toàn bộ (100%) dùng '02', nếu hoàn một phần dùng '03'
    const transactionType = refundRate === 1 ? '02' : '03';

    const refundData = {
      vnp_RequestId: Date.now().toString(),
      vnp_Version: '2.1.0',
      vnp_Command: 'refund',
      vnp_TmnCode: process.env.VNPAY_TMN_CODE,
      vnp_TransactionType: transactionType,
      vnp_TxnRef: txnRef,
      vnp_TransactionNo: paymentTxn.vnpTransactionNo,

      // 🔥 QUAN TRỌNG NHẤT
      vnp_Amount: actualAmount * 100,

      vnp_OrderInfo: `Hoan tien ve ${refund.eventId.title}`,
      vnp_TransactionDate: transactionDate,
      vnp_CreateBy: req.user?.email || 'admin',
      vnp_CreateDate: createDate,
      vnp_IpAddr: '127.0.0.1',
    };

    // ==========================
    // SIGN DATA
    // ==========================
    const signData = [
      refundData.vnp_RequestId,
      refundData.vnp_Version,
      refundData.vnp_Command,
      refundData.vnp_TmnCode,
      refundData.vnp_TransactionType,
      refundData.vnp_TxnRef,
      refundData.vnp_Amount,
      refundData.vnp_TransactionNo,
      refundData.vnp_TransactionDate,
      refundData.vnp_CreateBy,
      refundData.vnp_CreateDate,
      refundData.vnp_IpAddr,
      refundData.vnp_OrderInfo,
    ].join('|');

    refundData.vnp_SecureHash = crypto
      .createHmac('sha512', process.env.VNPAY_HASH_SECRET)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    // ==========================
    // CALL VNPay
    // ==========================
    const response = await axios.post(
      process.env.VNPAY_REFUND_URL,
      refundData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );

    if (!response.data || response.data.vnp_ResponseCode !== '00') {
      return res.status(400).json({
        success: false,
        message: 'VNPay hoàn tiền thất bại.',
        data: response.data,
      });
    }

    // ==========================
    // UPDATE DATABASE
    // ==========================
    refund.status = 'Refunded';
    refund.actualAmount = actualAmount;
    refund.refundRate = refundRate;
    refund.approvedBy = req.user._id;

    await refund.save();

    await Ticket.findByIdAndUpdate(refund.ticketId, {
      status: 'Refunded',
    });

    await Transaction.create({
      userId: refund.userId._id,
      eventId: refund.eventId._id,
      ticketId: refund.ticketId,
      amount: actualAmount,
      type: 'Refund',
      status: 'Success',
      paymentMethod: 'VNPay',
      transactionRef: response.data.vnp_TransactionNo || 'REFUND-' + Date.now(),
    });

    await Event.findByIdAndUpdate(refund.eventId._id, {
      $inc: { availableTickets: 1 },
    });

    return res.json({
      success: true,
      message: 'Hoàn tiền thành công.',
      data: {
        originalAmount,
        refundRate,
        actualAmount,
        vnp: response.data,
      },
    });

  } catch (err) {
    console.error('Refund Error:', err);
    next(err);
  }
};


const rejectRefund = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const refund = await RefundRequest.findById(req.params.id).populate('userId', 'email').populate('eventId', 'title');
    if (!refund || refund.status !== 'Pending') return res.status(400).json({ success: false, message: 'Yêu cầu không hợp lệ.' });
    refund.status = 'Rejected';
    refund.reason = reason;
    refund.approvedBy = req.user._id;
    await refund.save();
    try {
      await sendEmail({ to: refund.userId.email, subject: 'Yêu cầu hoàn tiền bị từ chối', html: emailTemplates.refundRejected(refund.eventId, reason) });
    } catch (_) {}
    res.json({ success: true, message: 'Đã từ chối yêu cầu hoàn tiền.' });
  } catch (err) { next(err); }
};

// Xuất Excel danh sách người tham dự
const exportAttendees = async (req, res, next) => {
  try {
    const tickets = await Ticket.find({ eventId: req.params.eventId })
      .populate('userId', 'email');
    const event = await Event.findById(req.params.eventId);

    const rows = tickets.map((t, i) => ({
      STT: i + 1,
      'Họ tên': t.attendeeInfo.fullName,
      Email: t.attendeeInfo.email,
      SĐT: t.attendeeInfo.phone,
      'Nghề nghiệp': t.attendeeInfo.occupation || '',
      'Loại vé': t.ticketType,
      'Trạng thái vé': t.status,
      'Check-in': t.status === 'Checked-in' ? 'Đã check-in' : 'Chưa',
      'Thời gian check-in': t.checkedInAt ? new Date(t.checkedInAt).toLocaleString('vi-VN') : '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="attendees_${event.title}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) { next(err); }
};

// Dashboard thống kê
const getDashboard = async (req, res, next) => {
  try {
    const { eventId } = req.query;
    let filter = {};
    if (eventId) filter.eventId = eventId;

    const totalEvents = await Event.countDocuments({ status: 'Public' });
    const totalTickets = await Ticket.countDocuments({ ...filter, status: { $in: ['Valid','Checked-in'] } });
    const checkedIn   = await Ticket.countDocuments({ ...filter, status: 'Checked-in' });
    const revenue = await Transaction.aggregate([
      { $match: { ...filter, type: 'Payment', status: 'Success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const cancelRate = totalTickets > 0 ? ((await Ticket.countDocuments({ ...filter, status: { $in: ['Canceled','Refund-Pending','Refunded'] } })) / totalTickets * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        totalEvents,
        totalRegistrations: totalTickets,
        checkedIn,
        checkInRate: totalTickets > 0 ? ((checkedIn / totalTickets) * 100).toFixed(1) : 0,
        revenue: revenue[0]?.total || 0,
        cancelRate,
      },
    });
  } catch (err) { next(err); }
};

// Can thiệp kho vé
const adjustTicketStock = async (req, res, next) => {
  try {
    const { delta, reason } = req.body; // delta: số vé cộng/trừ
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện.' });
    event.availableTickets = Math.max(0, event.availableTickets + delta);
    event.totalTickets = Math.max(event.totalTickets, event.availableTickets);
    await event.save();
    await SystemLog.create({ userId: req.user._id, action: `Điều chỉnh kho vé sự kiện ${event.title}: ${delta > 0 ? '+' : ''}${delta}. Lý do: ${reason}`, level: 'WARN' });
    res.json({ success: true, message: 'Đã điều chỉnh kho vé.', data: event });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════
// STAFF — UC-12
// ══════════════════════════════════════════════

// const checkInByQR = async (req, res, next) => {
//   try {
//     const { qrCode: scanned } = req.body; 
    
//     const ticketCode = parseTicketCodeFromScan(scanned);
//     if (!ticketCode) {
//       return res.status(400).json({ success: false, message: 'Mã quét không hợp lệ (cần định dạng TKT-XXXXXX).' });
//     }

//     const ticket = await Ticket.findOne({ ticketCode }).populate('eventId', 'title location startTime');
//     if (!ticket) return res.status(404).json({ success: false, message: 'Không tìm thấy vé với mã này.' });

//     if (ticket.status === 'Checked-in') {
//       return res.status(400).json({
//         success: false,
//         message: 'Vé đã được check-in trước đó.',
//         checkedInAt: ticket.checkedInAt,
//         data: {
//           fullName: ticket.attendeeInfo.fullName,
//           phone: ticket.attendeeInfo.phone,
//           email: ticket.attendeeInfo.email,
//           ticketCode: ticket.ticketCode,
//           ticketType: ticket.ticketType,
//         },
//       });
//     }
    
//     if (ticket.status !== 'Valid') {
//       return res.status(400).json({ success: false, message: `Vé không hợp lệ (trạng thái: ${ticket.status}).` });
//     }

//     ticket.status = 'Checked-in';
//     ticket.checkedInAt = new Date();
//     await ticket.save();

//     res.json({
//       success: true,
//       message: 'Xác thực vé thành công!',
//       data: {
//         fullName: ticket.attendeeInfo.fullName,
//         phone: ticket.attendeeInfo.phone,
//         email: ticket.attendeeInfo.email,
//         ticketCode: ticket.ticketCode,
//         ticketType: ticket.ticketType,
//         checkedInAt: ticket.checkedInAt,
//         eventTitle: ticket.eventId.title,
//       },
//     });
//   } catch (err) { next(err); }
// };
const validateCheckInWindow = async (ticket, scannerName) => {
  if (ticket.status === 'Expired') return { ok: false, message: 'Vé này đã hết hiệu lực do đi trễ.' };
  if (!['Valid', 'Checked-in'].includes(ticket.status)) {
    return { ok: false, message: `Vé ở trạng thái ${ticket.status}, không thể check-in.` };
  }

  const event = ticket.eventId;
  const now = nowInTZ();

  // Hard stop: after event endTime, never allow check-in
  if (event.endTime) {
    const endParts = getTZParts(new Date(event.endTime));
    const eventEnd = new Date(Date.UTC(endParts.year, endParts.month - 1, endParts.day, endParts.hour, endParts.minute, endParts.second));
    if (now > eventEnd) {
      ticket.status = 'Expired';
      await ticket.save();
      return { ok: false, message: 'Sự kiện đã kết thúc. Không thể check-in.' };
    }
  }

  const sessions = event.sessions || [];
  const session = sessions.find((s) => {
    const dParts = getTZParts(new Date(s.date));
    const nParts = getTZParts(new Date(now));
    return dParts.year === nParts.year && dParts.month === nParts.month && dParts.day === nParts.day;
  });

  if (!session) return { ok: false, message: 'Hôm nay không có phiên sự kiện nào diễn ra.' };

  const [startH, startM] = session.startCheckIn.split(':').map(Number);
  const [endH, endM] = session.endCheckIn.split(':').map(Number);
  const nParts = getTZParts(new Date(now));
  const startTime = new Date(Date.UTC(nParts.year, nParts.month - 1, nParts.day, startH, startM, 0, 0));
  const endTime = new Date(Date.UTC(nParts.year, nParts.month - 1, nParts.day, endH, endM, 0, 0));
  const openTime = new Date(startTime.getTime() - (30 * 60 * 1000));

  if (now < openTime) return { ok: false, message: `Chưa đến giờ check-in. Mở cửa lúc ${session.startCheckIn}.` };
  if (now > endTime) {
    ticket.status = 'Expired';
    await ticket.save();
    return { ok: false, message: 'Đã quá thời hạn check-in. Vé đã bị khóa.' };
  }

  const startOfToday = new Date(Date.UTC(nParts.year, nParts.month - 1, nParts.day, 0, 0, 0, 0));
  const endOfToday = new Date(Date.UTC(nParts.year, nParts.month - 1, nParts.day, 23, 59, 59, 999));
  const alreadyCheckedIn = await CheckInLog.findOne({
    ticketId: ticket._id,
    scannedAt: { $gte: startOfToday, $lte: endOfToday },
  });
  if (alreadyCheckedIn) return { ok: false, message: 'Vé này đã được check-in cho ngày hôm nay rồi!' };

  await CheckInLog.create({ ticketId: ticket._id, scannedAt: now, scannerName });
  ticket.status = 'Checked-in';
  ticket.checkedInAt = now;
  await ticket.save();

  return {
    ok: true,
    data: {
      fullName: ticket.attendeeInfo.fullName,
      phone: ticket.attendeeInfo.phone,
      email: ticket.attendeeInfo.email,
      ticketCode: ticket.ticketCode,
      ticketType: ticket.ticketType,
      checkedInAt: ticket.checkedInAt,
      eventTitle: event.title,
    },
  };
};

const checkInByQR = async (req, res, next) => {
  try {
    const { qrCode: scanned } = req.body;
    const ticketCode = parseTicketCodeFromScan(scanned);
    if (!ticketCode) return res.status(400).json({ success: false, message: 'Mã không hợp lệ.' });

    const ticket = await Ticket.findOne({ ticketCode }).populate('eventId', 'title sessions endTime');
    if (!ticket) return res.status(404).json({ success: false, message: 'Vé không tồn tại.' });

    const checked = await validateCheckInWindow(ticket, req.user.fullName);
    if (!checked.ok) return res.status(400).json({ success: false, message: checked.message });

    res.json({ success: true, message: 'Xác thực vé thành công!', data: checked.data });
  } catch (err) { next(err); }
};

const checkInManual = async (req, res, next) => {
  try {
    const { keyword } = req.body;
    const keywordTrimmed = typeof keyword === 'string' ? keyword.trim() : keyword;

    const ticket = await Ticket.findOne({
      status: { $in: ['Valid', 'Checked-in'] },
      $or: [
        { 'attendeeInfo.phone': keywordTrimmed },
        { 'attendeeInfo.email': keywordTrimmed },
        { ticketCode: String(keywordTrimmed || '').toUpperCase() },
      ],
    }).populate('eventId', 'title sessions endTime');

    if (!ticket) return res.status(404).json({ success: false, message: 'Không tìm thấy vé phù hợp.' });
    const checked = await validateCheckInWindow(ticket, req.user.fullName);
    if (!checked.ok) return res.status(400).json({ success: false, message: checked.message });
    res.json({ success: true, message: 'Xác thực vé thành công!', data: checked.data });
  } catch (err) { next(err); }
};

// Offline Sync: nhận mảng check-in từ thiết bị
const syncOfflineCheckins = async (req, res, next) => {
  try {
    const { checkins } = req.body; 
    const results = [];
    for (const item of checkins) {
      const ticketCode = parseTicketCodeFromScan(item.qrCode);
      if (!ticketCode) {
        results.push({ qrCode: item.qrCode, status: 'skipped', reason: 'Mã quét không hợp lệ' });
        continue;
      }
      
      const ticket = await Ticket.findOne({ ticketCode });
      if (!ticket) {
        results.push({ qrCode: item.qrCode, status: 'skipped', reason: 'Không tìm thấy vé' });
        continue;
      }
      if (ticket.status === 'Checked-in') {
        results.push({ qrCode: item.qrCode, status: 'skipped', reason: 'Đã check-in' });
        continue;
      }
      
      ticket.status = 'Checked-in';
      ticket.checkedInAt = item.checkedInAt || new Date();
      await ticket.save();
      results.push({ qrCode: item.qrCode, status: 'success' });
    }
    res.json({ success: true, message: `Đồng bộ xong ${results.filter(r=>r.status==='success').length}/${checkins.length} vé.`, data: results });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════
// ADMIN — UC-13, UC-14, UC-15
// ══════════════════════════════════════════════
const getAllUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    let filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const { status, role } = req.body;
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Không thể thực hiện thao tác này với tài khoản của chính mình.' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { status, role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    if (status === 'Locked') {
      try { await sendEmail({ to: user.email, subject: 'Tài khoản bị khóa', html: emailTemplates.accountLocked() }); } catch(_) {}
    }
    await SystemLog.create({ userId: req.user._id, action: `Cập nhật tài khoản ${user.email}: status=${status}, role=${role}`, level: 'WARN' });
    res.json({ success: true, message: 'Cập nhật tài khoản thành công.', data: user });
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản của chính mình.' });
    }
    const hasActiveTickets = await Ticket.findOne({ userId: req.params.id, status: { $in: ['Valid','Pending','Checked-in'] } });
    if (hasActiveTickets) return res.status(400).json({ success: false, message: 'Tài khoản có vé đang hiệu lực, chỉ được phép khóa.' });
    await User.findByIdAndDelete(req.params.id);
    await SystemLog.create({ userId: req.user._id, action: `Xóa tài khoản userId=${req.params.id}`, level: 'WARN' });
    res.json({ success: true, message: 'Đã xóa tài khoản.' });
  } catch (err) { next(err); }
};

const getSystemLogs = async (req, res, next) => {
  try {
    const { level, action, userId, from, to, page = 1, limit = 50 } = req.query;
    let filter = {};
    if (level) filter.level = level;
    if (userId) filter.userId = userId;
    if (action) filter.action = { $regex: action, $options: 'i' };
    if (from || to) filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to)   filter.createdAt.$lte = new Date(to);

    const logs = await SystemLog.find(filter)
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await SystemLog.countDocuments(filter);
    res.json({ success: true, data: logs, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

const createInternalUser = async (req, res, next) => {
  try {
    const { fullName, email, phone, role } = req.body;
    if (!fullName || !email || !phone || !role) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin (fullName, email, phone, role).' });
    }
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const user = await User.create({ fullName, email, phone, password: tempPassword, role, status: 'Active' });
    let emailSent = false;
    try {
      // await sendEmail({ to: email, subject: 'Tài khoản nội bộ đã được tạo', html: `<p>Chào ${fullName},</p><p>Tài khoản của bạn đã được tạo với mật khẩu tạm: <strong>${tempPassword}</strong></p><p>Vui lòng đổi mật khẩu sau khi đăng nhập.</p>` });
      // emailSent = true;
      const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const loginLink = `${baseUrl}/login`;
      const ticketLink = `${baseUrl}/tickets`;
      await sendEmail({ 
        to: email, 
        subject: 'Tài khoản nội bộ đã được tạo', 
        html: emailTemplates.internalAccountCreated(fullName, email, tempPassword, loginLink) 
      });
      emailSent = true;
    } catch (_) {}

    await SystemLog.create({
      userId: req.user._id,
      action: `Tạo tài khoản nội bộ ${email} (role=${role})${emailSent ? '' : ' (email không gửi được)'}`,
      level: emailSent ? 'INFO' : 'WARN',
      ip: req.ip,
    });

    const returnTempPassword =
      String(process.env.RETURN_INTERNAL_PASSWORD || '').toLowerCase() === 'true' ||
      String(process.env.RETURN_INTERNAL_PASSWORD || '') === '1';

    res.status(201).json({
      success: true,
      message: emailSent
        ? 'Tạo tài khoản nội bộ thành công. Mật khẩu tạm đã được gửi qua email.'
        : (returnTempPassword
            ? 'Tạo tài khoản nội bộ thành công. SMTP chưa cấu hình/không gửi được email, trả về mật khẩu tạm để demo.'
            : 'Tạo tài khoản nội bộ thành công. SMTP chưa cấu hình/không gửi được email, vui lòng đặt lại mật khẩu hoặc cấu hình SMTP.'),
      data: {
        _id: user._id,
        fullName,
        email,
        role,
        ...(returnTempPassword ? { tempPassword } : {}),
      },
    });
  } catch (err) { next(err); }
};

module.exports = {
  createEvent, updateEvent, submitForReview, getMyEvents,
  getPendingEvents, approveEvent, rejectEvent,
  getPendingRefunds, approveRefund, rejectRefund,
  exportAttendees, getDashboard, adjustTicketStock,
  checkInByQR, checkInManual, syncOfflineCheckins,
  getAllUsers, updateUserStatus, deleteUser, getSystemLogs, createInternalUser,
};
