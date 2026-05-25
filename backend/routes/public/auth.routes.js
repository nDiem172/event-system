// ── routes/public/auth.routes.js ─────────────────────────────
const express = require('express');
const router = express.Router();
const { register, login, verifyEmail, resendVerification, getMe } = require('../../controllers/auth.controller');
const { protect } = require('../../middleware/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.get('/me', protect, getMe);

module.exports = router;
