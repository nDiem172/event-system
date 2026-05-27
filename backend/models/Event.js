const mongoose = require('mongoose');

const ticketTypeSchema = new mongoose.Schema({
  name:  { type: String, required: true },  // VD: "VIP", "General"
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0 },
  available: { type: Number, required: true, min: 0 },
}, { _id: false });

const eventSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true },
    location:    { type: String, required: true },
    category:    { type: String, default: 'Khác' },
    // Mảng các phiên check-in
    sessions: [{
        date: { type: Date, required: true },
        startCheckIn: { type: String, required: true }, 
        endCheckIn: { type: String, required: true }   
    }],
    startTime:   { type: Date, required: true },
    endTime:     { type: Date, required: true },
    registrationDeadline: { type: Date, required: true },
    bannerUrl:   { type: String },
    totalTickets:    { type: Number, required: true, min: 1 },
    availableTickets:{ type: Number, required: true, min: 0 },
    ticketTypes: [ticketTypeSchema],
    policies: {
      terms:            { type: String, default: '' },
      minAge:           { type: Number, default: 0 },
      refundPercentage: { type: Number, default: 0, min: 0, max: 100 },
      cancelDeadlineHours: { type: Number, default: 24 },
    },
    status: {
      type: String,
      enum: ['Draft', 'Pending', 'Public', 'Rejected', 'Canceled'],
      default: 'Draft',
    },
    rejectedReason: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
  },
  { timestamps: true }
);

// Validate: endTime > startTime
eventSchema.pre('save', function (next) {
  if (this.endTime <= this.startTime) {
    return next(new Error('Thời gian kết thúc phải sau thời gian bắt đầu'));
  }
  next();
});

module.exports = mongoose.model('Event', eventSchema);
