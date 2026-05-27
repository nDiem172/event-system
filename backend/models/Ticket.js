const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },

    // Thông tin hiển thị trên vé (cho phép chỉnh sửa độc lập với User)
    attendeeInfo: {
      fullName: { type: String, required: true },
      phone:    { type: String, required: true },
      email:    { type: String, required: true },
      occupation: { type: String },
    },

    ticketType: { type: String, required: true },
    price:      { type: Number, required: true, default: 0 },
    ticketCode: { type: String, required: true, unique: true },
    qrCode:     { type: String },  // base64 hoặc URL ảnh QR

    // ─── 7 trạng thái theo đặc tả ─────────────────────
    status: {
      type: String,
      enum: [
        'Pending', 
        'Valid', 
        'Checked-in', 
        'Canceled', 
        'Refund-Pending', 
        'Refunded', 
        'Expired'],
      default: 'Pending',
    },

    checkedInAt: Date,  // Thời gian check-in thực tế
    holdExpiresAt: Date, // Thời gian slot tạm hết hạn (khi Pending)
  },
  { timestamps: true }
);

// Index để tìm kiếm nhanh
ticketSchema.index({ eventId: 1, userId: 1 });
ticketSchema.index({ qrCode: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
