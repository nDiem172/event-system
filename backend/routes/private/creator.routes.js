// creator.routes.js
const express = require('express');
const r = express.Router();
const { protect, authorize } = require('../../middleware/auth.middleware');
const c = require('../../controllers/main.controller');
r.use(protect, authorize('Content_Creator', 'Admin'));
r.get('/events', c.getMyEvents);
r.post('/events', c.createEvent);
r.put('/events/:id', c.updateEvent);
r.patch('/events/:id/submit', c.submitForReview);
module.exports = r;
