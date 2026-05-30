const Ticket = require('../models/Ticket');
const Event  = require('../models/Event');
const { WaitingList, Transaction } = require('../models/index');
const { generateTicketCode, generateQRCode } = require('../utils/qr.util');
const { sendEmail, emailTemplates } = require('../utils/email.util');
const {
  MAX_TICKETS_PER_USER_PER_EVENT,
  resolveRegistrationSessions,
} = require('../utils/ticketSession.util');

const ACTIVE_TICKET_STATUSES = ['Pending', 'Valid', 'Checked-in', 'Refund-Pending'];

// ── GET /api/tickets/my-tickets ──────────────────────────────
const getMyTickets = async (req, res, next) => {
  try {
    const tickets = await Ticket.find({ userId: req.user._id })
      .populate('eventId', 'title startTime endTime location bannerUrl status sessions')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: tickets });
  } catch (err) { next(err); }
};

// ── GET /api/tickets/:id ─────────────────────────────────────
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('eventId', 'title startTime endTime location sessions');
    if (!ticket) return res.status(404).json({ success: false, message: 'Không tìm thấy vé.' });
    res.json({ success: true, data: ticket });
  } catch (err) { next(err); }
};

// ── POST /api/tickets/register ───────────────────────────────
// UC-05: Đăng ký tham gia sự kiện (tạo vé Pending, chờ thanh toán hoặc Valid nếu miễn phí)
// ── POST /api/tickets/register ───────────────────────────────
const registerTicket = async (req, res, next) => {
  try {
    const { eventId, ticketType, attendeeInfo, sessionIds, coversAllSessions } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Sự kiện không tồn tại.' });
    if (event.status !== 'Public') return res.status(400).json({ success: false, message: 'Sự kiện chưa công khai.' });
    
    // --- BẮT ĐẦU LOGIC KIỂM TRA HẠN CHÓT ĐĂNG KÝ (THEO NGÀY) ---
    if (event.registrationDeadline) {
      const now = new Date();
      // Lấy ngày deadline từ DB
      const deadline = new Date(event.registrationDeadline);
      // Ép mốc đóng cổng là 23:59:59 của ngày đó
      const deadlineEnd = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate(), 23, 59, 59);

      if (now > deadlineEnd) {
        return res.status(400).json({ 
          success: false, 
          message: `Sự kiện đã đóng cổng đăng ký. Hạn chót là hết ngày ${deadline.toLocaleDateString('vi-VN')}.` 
        });
      }
    }
    // --- KẾT THÚC LOGIC ---

    if (new Date(event.startTime) <= new Date()) return res.status(400).json({ success: false, message: 'Sự kiện đã bắt đầu hoặc đã kết thúc, không thể đăng ký.' });
    if (event.availableTickets <= 0) return res.status(400).json({ success: false, message: 'Sự kiện đã hết vé.' });

    const ticketCount = await Ticket.countDocuments({
      eventId,
      userId: req.user._id,
      status: { $in: ACTIVE_TICKET_STATUSES },
    });
    if (ticketCount >= MAX_TICKETS_PER_USER_PER_EVENT) {
      return res.status(400).json({
        success: false,
        message: `Bạn đã đăng ký tối đa ${MAX_TICKETS_PER_USER_PER_EVENT} vé cho sự kiện này.`,
      });
    }

    const tType = event.ticketTypes.find(t => t.name === ticketType);
    if (!tType) return res.status(400).json({ success: false, message: 'Loại vé không hợp lệ.' });

    const sessionResolved = resolveRegistrationSessions(event, {
      sessionIds,
      coversAllSessions: Boolean(coversAllSessions),
      ticketType: tType,
    });
    if (!sessionResolved.ok) {
      return res.status(400).json({ success: false, message: sessionResolved.message });
    }

    const isFree = tType.price === 0;
    const ticketCode = generateTicketCode();

    // Giảm số vé trống tạm (giữ slot)
    event.availableTickets -= 1;
    await event.save();

    const holdMinutes = parseInt(process.env.TICKET_HOLD_MINUTES) || 5;

    const ticket = await Ticket.create({
      eventId,
      userId: req.user._id,
      attendeeInfo,
      ticketType,
      price: tType.price,
      ticketCode: ticketCode,
      qrCode: ticketCode,
      status: isFree ? 'Valid' : 'Pending',
      holdExpiresAt: isFree ? undefined : new Date(Date.now() + holdMinutes * 60 * 1000),
    });

    if (isFree) {
      // Tạo QR ảnh và gửi email ngay
      const qrImage = await generateQRCode(ticketCode);
      ticket.qrCode = qrImage;
      await ticket.save();

      await Transaction.create({
        userId: req.user._id, eventId, ticketId: ticket._id,
        amount: 0, type: 'Payment', paymentMethod: 'Free', status: 'Success',
      });

      try {
        const ticketLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/my-tickets/${ticket._id}`;
        await sendEmail({ to: req.user.email, subject: `Vé tham gia: ${event.title}`, html: emailTemplates.ticketConfirm(event, qrImage, req.user.fullName, ticketLink) });
      } catch (_) {}

      return res.status(201).json({ success: true, message: 'Đăng ký thành công!', data: ticket });
    }
    if (!isFree) {
      try {
        // Gửi email hướng dẫn thanh toán
        const paymentLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/${ticket._id}`;
        await sendEmail({ 
          to: req.user.email, 
          subject: `Xác nhận giữ chỗ: ${event.title}`, 
          html: emailTemplates.paymentPending(event, req.user.fullName, tType.price, paymentLink) 
        });
      } catch (err) { 
        console.error("Lỗi gửi email thanh toán:", err); 
      }
    }

    // Sự kiện có phí → trả về ticketId để FE chuyển sang thanh toán
    res.status(201).json({ success: true, message: 'Slot vé đã được giữ. Vui lòng hoàn tất thanh toán.', data: { ticketId: ticket._id, amount: tType.price } });
  } catch (err) { next(err); }
};

// ── PUT /api/tickets/:id/update ──────────────────────────────
// UC-03C: Chỉnh sửa thông tin vé
const updateTicketInfo = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, userId: req.user._id });
    if (!ticket) return res.status(404).json({ success: false, message: 'Không tìm thấy vé.' });
    if (ticket.status !== 'Valid') return res.status(400).json({ success: false, message: 'Chỉ vé hợp lệ mới được chỉnh sửa.' });

    const event = await Event.findById(ticket.eventId);
    const hoursLeft = (new Date(event.startTime) - Date.now()) / 3600000;
    if (hoursLeft < 24) return res.status(400).json({ success: false, message: 'Đã quá thời hạn chỉnh sửa (trước 24h).' });

    const { fullName, phone } = req.body;
    ticket.attendeeInfo.fullName = fullName || ticket.attendeeInfo.fullName;
    ticket.attendeeInfo.phone    = phone    || ticket.attendeeInfo.phone;

    // Tạo lại QR với cùng ticketCode
    const newQR = await generateQRCode(ticket.qrCode.includes('TKT') ? ticket.qrCode : generateTicketCode());
    ticket.qrCode = newQR;
    await ticket.save();

    try {
      const ticketLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/my-tickets/${ticket._id}`;
      await sendEmail({ to: req.user.email, subject: `Vé đã được cập nhật: ${event.title}`, html: emailTemplates.ticketUpdated(event, newQR, req.user.fullName, ticketLink) });
    } catch (_) {}

    res.json({ success: true, message: 'Cập nhật thông tin vé thành công.', data: ticket });
  } catch (err) { next(err); }
};

// ── DELETE /api/tickets/:id/cancel ──────────────────────────
// UC-03D: Hủy vé (miễn phí và có phí)
const cancelTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, userId: req.user._id });
    if (!ticket) return res.status(404).json({ success: false, message: 'Không tìm thấy vé.' });
    if (!['Valid'].includes(ticket.status)) return res.status(400).json({ success: false, message: 'Không thể hủy vé ở trạng thái này.' });

    const event = await Event.findById(ticket.eventId);
    const hoursLeft = (new Date(event.startTime) - Date.now()) / 3600000;
    const deadline  = event.policies?.cancelDeadlineHours || 24;
    if (hoursLeft < deadline) return res.status(400).json({ success: false, message: `Đã quá thời hạn cho phép hủy vé (${deadline} giờ trước sự kiện).` });

    const isPaid = ticket.price > 0;

    if (isPaid) {
      // Vé có phí → tạo RefundRequest
      const { RefundRequest } = require('../models/index');
      const expected = Math.round(ticket.price * (event.policies.refundPercentage / 100));
      ticket.status = 'Refund-Pending';
      await ticket.save();
      event.availableTickets += 1;
      await event.save();

      await RefundRequest.create({
        ticketId: ticket._id, userId: req.user._id, eventId: event._id,
        expectedAmount: expected,
      });

      try {
        const ticketLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/my-tickets/${ticket._id}`;
        await sendEmail({ to: req.user.email, subject: 'Yêu cầu hoàn tiền đã được ghi nhận', html: emailTemplates.refundPending(event, expected, req.user.fullName, ticketLink) });
      } catch (_) {}
    } else {
      // Vé miễn phí → hủy ngay
      ticket.status = 'Canceled';
      await ticket.save();
      event.availableTickets += 1;
      await event.save();

      try {
        const ticketLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/my-tickets/${ticket._id}`;
        await sendEmail({ to: req.user.email, subject: 'Xác nhận hủy vé', html: emailTemplates.ticketCanceled(event, req.user.fullName, ticketLink  ) });
      } catch (_) {}
    }

    // Kích hoạt hàng chờ
    const nextWaiting = await WaitingList.findOne({ eventId: event._id, status: 'Waiting' }).sort({ createdAt: 1 });
    if (nextWaiting) {
      const waitUser = await require('../models/User').findById(nextWaiting.userId);
      const expiry = parseInt(process.env.WAITLIST_EXPIRE_HOURS) || 2;
      nextWaiting.status = 'Notified';
      nextWaiting.notifiedAt = new Date();
      nextWaiting.inviteExpiry = new Date(Date.now() + expiry * 3600000);
      await nextWaiting.save();
      const link = `${process.env.CLIENT_URL}/events/${event._id}?wl=${nextWaiting._id}`;
      try {
        await sendEmail({ to: waitUser.email, subject: `Có vé trống: ${event.title}`, html: emailTemplates.waitlistNotify(event, link) });
      } catch (_) {}
    }

    res.json({ success: true, message: isPaid ? 'Yêu cầu hủy vé và hoàn tiền đã được ghi nhận.' : 'Hủy vé thành công.' });
  } catch (err) { next(err); }
};

module.exports = { getMyTickets, getTicketById, registerTicket, updateTicketInfo, cancelTicket };

