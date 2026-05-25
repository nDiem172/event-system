const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Ticket = require('./models/Ticket');
const Event = require('./models/Event');

dotenv.config();
connectDB();

const app = express();

// ── Middleware ──────────────────────────────
const splitList = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const allowedOrigins = new Set([
  ...splitList(process.env.CLIENT_URL),
  ...splitList(process.env.CLIENT_URLS),
]);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl/postman/server-to-server
      if (allowedOrigins.has(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
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

// ── Background job: expire Pending tickets ───────────────────
let expiring = false;
const expirePendingTickets = async () => {
  if (expiring) return;
  expiring = true;
  try {
    const now = new Date();
    const expired = await Ticket.find({
      status: 'Pending',
      holdExpiresAt: { $exists: true, $ne: null, $lt: now },
    }).select('_id eventId');

    if (expired.length === 0) return;

    for (const t of expired) {
      const updated = await Ticket.updateOne(
        { _id: t._id, status: 'Pending' },
        { $set: { status: 'Canceled', holdExpiresAt: undefined } }
      );
      if (updated.modifiedCount === 1) {
        await Event.updateOne({ _id: t.eventId }, { $inc: { availableTickets: 1 } });
      }
    }
  } catch (err) {
    console.error('❌ Ticket expire job error:', err.message);
  } finally {
    expiring = false;
  }
};

const intervalSeconds = Number(process.env.TICKET_EXPIRE_JOB_INTERVAL_SECONDS || 60);
if (intervalSeconds > 0) {
  setInterval(expirePendingTickets, intervalSeconds * 1000);
}
