const express = require('express');
const r = express.Router();
const { protect, authorize } = require('../../middleware/auth.middleware');
const c = require('../../controllers/main.controller');
r.use(protect, authorize('Staff', 'Manager', 'Admin'));
r.post('/checkin/qr', c.checkInByQR);
r.post('/checkin/manual', c.checkInManual);
r.post('/checkin/sync', c.syncOfflineCheckins);
module.exports = r;
