const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// ── Middleware ──────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// ── Public Routes ───────────────────────────
app.use('/api/auth',    require('./routes/public/auth.routes'));
app.use('/api/events',  require('./routes/public/events.routes'));

// ── Private Routes ──────────────────────────
app.use('/api/user',       require('./routes/private/user.routes'));
app.use('/api/tickets',    require('./routes/private/ticket.routes'));
app.use('/api/creator',    require('./routes/private/creator.routes'));
app.use('/api/manager',    require('./routes/private/manager.routes'));
app.use('/api/staff',      require('./routes/private/staff.routes'));
app.use('/api/admin',      require('./routes/private/admin.routes'));
app.use('/api/payment',    require('./routes/private/payment.routes'));
app.use('/api/waitinglist',require('./routes/private/waitinglist.routes'));

// ── Global Error Handler ────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ',
  });
});

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => console.log(`✅  Server đang chạy tại http://${HOST}:${PORT}`));
