const mongoose = require('mongoose');
const CheckInLog = require('./CheckInLog');

// ── Transaction ─────────────────────────────────────────────
const transactionSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
    eventId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Event',  required: true },
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
    amount:   { type: Number, required: true },
    type:     { type: String, enum: ['Payment', 'Refund'], required: true },
    paymentMethod: { type: String, enum: ['VNPay', 'VietQR', 'Free', 'Mock', 'Refund'] },
    transactionRef: { type: String },  // Mã đối soát VNPay
    vnpTransactionNo: { type: String }, // Mã giao dịch VNPay (cần cho refund)
    paymentDate: { type: String },     // Ngày thanh toán VNPay (cần cho refund)
    bankCode: { type: String },        // Mã ngân hàng VNPay
    vnpayData: { type: Object },       // Lưu toàn bộ response VNPay để đối soát
    status: {
      type: String,
      enum: ['Pending', 'Success', 'Failed'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

// ── RefundRequest ────────────────────────────────────────────
const refundRequestSchema = new mongoose.Schema(
  {
    ticketId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
    eventId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Event',  required: true },
    expectedAmount: { type: Number, required: true }, // Tính tự động theo refundPercentage
    actualAmount:   { type: Number },                 // Manager nhập khi duyệt
    status: {
      type: String,
      enum: ['Pending', 'Refunded', 'Rejected'],
      default: 'Pending',
    },
    reason:     { type: String },    // Lý do từ chối
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ── WaitingList ──────────────────────────────────────────────
const waitingListSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
    status: {
      type: String,
      enum: ['Waiting', 'Notified', 'Expired'],
      default: 'Waiting',
    },
    notifiedAt:  Date,
    inviteExpiry: Date, // Link mời hết hạn sau X giờ
  },
  { timestamps: true }
);
waitingListSchema.index({ eventId: 1, createdAt: 1 }); // Sắp xếp theo thứ tự đăng ký

// ── SystemLog ────────────────────────────────────────────────
const systemLogSchema = new mongoose.Schema(
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action:  { type: String, required: true },
    details: { type: String },
    ip:      { type: String },
    level:   { type: String, enum: ['INFO', 'WARN', 'ERROR'], default: 'INFO' },
  },
  { timestamps: true }
);

module.exports = {
  Transaction:    mongoose.model('Transaction', transactionSchema),
  RefundRequest:  mongoose.model('RefundRequest', refundRequestSchema),
  WaitingList:    mongoose.model('WaitingList', waitingListSchema),
  SystemLog:      mongoose.model('SystemLog', systemLogSchema),
  CheckInLog,
};
