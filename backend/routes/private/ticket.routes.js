// ════════════════════════════════════════════════════
// routes/private/ticket.routes.js
// ════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/auth.middleware');
const { getMyTickets, getTicketById, registerTicket, updateTicketInfo, cancelTicket } = require('../../controllers/ticket.controller');

router.use(protect);
router.get('/my-tickets', getMyTickets);
router.get('/:id', getTicketById);
router.post('/register', authorize('Attendee'), registerTicket);
router.put('/:id/update', authorize('Attendee'), updateTicketInfo);
router.delete('/:id/cancel', authorize('Attendee'), cancelTicket);

module.exports = router;
