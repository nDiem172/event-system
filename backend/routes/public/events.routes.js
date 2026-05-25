const express = require('express');
const router = express.Router();
const Event = require('../../models/Event');

// GET /api/events — danh sách sự kiện công khai (UC-04)
router.get('/', async (req, res, next) => {
  try {
    const { search, category, from, to, scope = 'upcoming', page = 1, limit = 12 } = req.query;
    let filter = { status: 'Public' };
    const now = new Date();
    if (scope === 'upcoming') filter.endTime = { $gt: now };
    else if (scope === 'past') filter.endTime = { $lte: now };
    else if (scope !== 'all') return res.status(400).json({ success: false, message: 'scope không hợp lệ (upcoming|past|all)' });

    if (search) filter.$or = [{ title: { $regex: search, $options: 'i' } }, { location: { $regex: search, $options: 'i' } }];
    if (category) filter.category = category;
    if (from) filter.startTime = { $gte: new Date(from) };
    if (to)   filter.startTime = { ...filter.startTime, $lte: new Date(to) };

    const events = await Event.find(filter)
      .select('title location startTime endTime bannerUrl availableTickets ticketTypes category')
      .sort(scope === 'past' ? { startTime: -1 } : { startTime: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Event.countDocuments(filter);
    res.json({ success: true, data: events, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// GET /api/events/:id — chi tiết sự kiện
router.get('/:id', async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, status: 'Public' }).populate('createdBy', 'fullName');
    if (!event) return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện.' });
    res.json({ success: true, data: event });
  } catch (err) { next(err); }
});

module.exports = router;
