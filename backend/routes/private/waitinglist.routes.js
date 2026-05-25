const express = require('express');
const r = express.Router();
const { protect, authorize } = require('../../middleware/auth.middleware');
const { WaitingList } = require('../../models/index');
const Event = require('../../models/Event');
const { sendEmail, emailTemplates } = require('../../utils/email.util');

r.use(protect);

// POST /api/waitinglist/join — UC-07
r.post('/join', authorize('Attendee'), async (req, res, next) => {
  try {
    const { eventId } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Sự kiện không tồn tại.' });
    if (event.availableTickets > 0) return res.status(400).json({ success: false, message: 'Sự kiện vẫn còn vé, không cần vào hàng chờ.' });

    const existing = await WaitingList.findOne({ eventId, userId: req.user._id, status: 'Waiting' });
    if (existing) {
      const pos = await WaitingList.countDocuments({ eventId, status: 'Waiting', createdAt: { $lte: existing.createdAt } });
      return res.status(400).json({ success: false, message: `Bạn đã có trong danh sách chờ. Số thứ tự: ${pos}` });
    }

    const entry = await WaitingList.create({ eventId, userId: req.user._id });
    const position = await WaitingList.countDocuments({ eventId, status: 'Waiting', createdAt: { $lte: entry.createdAt } });

    res.status(201).json({ success: true, message: `Đã vào danh sách chờ thành công. Số thứ tự của bạn: ${position}` });
  } catch (err) { next(err); }
});

// GET /api/waitinglist/my — xem vị trí hàng chờ
r.get('/my', async (req, res, next) => {
  try {
    const entries = await WaitingList.find({ userId: req.user._id, status: { $in: ['Waiting','Notified'] } })
      .populate('eventId', 'title startTime');
    res.json({ success: true, data: entries });
  } catch (err) { next(err); }
});

module.exports = r;
