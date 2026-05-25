const Event   = require('../models/Event');
const Ticket  = require('../models/Ticket');
const User    = require('../models/User');
const { RefundRequest, WaitingList, Transaction, SystemLog } = require('../models/index');
const { sendEmail, emailTemplates } = require('../utils/email.util');
const XLSX = require('xlsx');
const { generateQRCode } = require('../utils/qr.util');

// ══════════════════════════════════════════════
// CONTENT CREATOR — UC-08
// ══════════════════════════════════════════════
const createEvent = async (req, res, next) => {
  try {
    const event = await Event.create({ ...req.body, createdBy: req.user._id, status: 'Draft' });
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
      .populate('eventId', 'title')
      .populate('ticketId', 'attendeeInfo price ticketType')
      .sort({ createdAt: 1 });
    res.json({ success: true, data: refunds });
  } catch (err) { next(err); }
};

const approveRefund = async (req, res, next) => {
  try {
    const { actualAmount } = req.body;
    const refund = await RefundRequest.findById(req.params.id).populate('userId', 'email').populate('eventId', 'title');
    if (!refund || refund.status !== 'Pending') return res.status(400).json({ success: false, message: 'Yêu cầu không hợp lệ.' });
    refund.status = 'Refunded';
    refund.actualAmount = actualAmount;
    refund.approvedBy = req.user._id;
    await refund.save();
    await Ticket.findByIdAndUpdate(refund.ticketId, { status: 'Refunded' });
    await Transaction.create({
      userId: refund.userId._id, eventId: refund.eventId._id, ticketId: refund.ticketId,
      amount: actualAmount, type: 'Refund', status: 'Success',
    });
    try {
      await sendEmail({ to: refund.userId.email, subject: 'Hoàn tiền đã được duyệt', html: emailTemplates.refundApproved(refund.eventId, actualAmount) });
    } catch (_) {}
    res.json({ success: true, message: 'Đã duyệt hoàn tiền thành công.' });
  } catch (err) { next(err); }
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
const checkInByQR = async (req, res, next) => {
  try {
    const { qrCode, eventId } = req.body;
    // qrCode ở đây là ticketCode string (chuỗi TKT-xxx)
    const ticket = await Ticket.findOne({ qrCode: { $regex: qrCode } }).populate('userId', 'fullName');
    if (!ticket) return res.status(404).json({ success: false, message: 'Mã vé không hợp lệ.' });
    if (ticket.eventId.toString() !== eventId) return res.status(400).json({ success: false, message: 'Vé không thuộc sự kiện này.' });
    if (ticket.status === 'Checked-in') {
      return res.status(400).json({ success: false, message: 'Vé đã được sử dụng.', checkedInAt: ticket.checkedInAt });
    }
    if (ticket.status !== 'Valid') return res.status(400).json({ success: false, message: `Vé không hợp lệ (trạng thái: ${ticket.status}).` });

    ticket.status = 'Checked-in';
    ticket.checkedInAt = new Date();
    await ticket.save();

    res.json({ success: true, message: 'Check-in thành công!', data: { fullName: ticket.attendeeInfo.fullName, checkedInAt: ticket.checkedInAt } });
  } catch (err) { next(err); }
};

const checkInManual = async (req, res, next) => {
  try {
    const { keyword, eventId } = req.body; // keyword: SĐT hoặc email
    const ticket = await Ticket.findOne({
      eventId,
      status: 'Valid',
      $or: [{ 'attendeeInfo.phone': keyword }, { 'attendeeInfo.email': keyword }],
    });
    if (!ticket) return res.status(404).json({ success: false, message: 'Không tìm thấy vé phù hợp.' });

    ticket.status = 'Checked-in';
    ticket.checkedInAt = new Date();
    await ticket.save();

    res.json({ success: true, message: 'Check-in thủ công thành công!', data: { fullName: ticket.attendeeInfo.fullName, checkedInAt: ticket.checkedInAt } });
  } catch (err) { next(err); }
};

// Offline Sync: nhận mảng check-in từ thiết bị
const syncOfflineCheckins = async (req, res, next) => {
  try {
    const { checkins } = req.body; // [{ qrCode, eventId, checkedInAt }]
    const results = [];
    for (const item of checkins) {
      const ticket = await Ticket.findOne({ qrCode: { $regex: item.qrCode } });
      if (!ticket || ticket.status === 'Checked-in') {
        results.push({ qrCode: item.qrCode, status: 'skipped', reason: ticket?.status === 'Checked-in' ? 'Đã check-in' : 'Không tìm thấy' });
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
      await sendEmail({ to: email, subject: 'Tài khoản nội bộ đã được tạo', html: `<p>Chào ${fullName},</p><p>Tài khoản của bạn đã được tạo với mật khẩu tạm: <strong>${tempPassword}</strong></p><p>Vui lòng đổi mật khẩu sau khi đăng nhập.</p>` });
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
