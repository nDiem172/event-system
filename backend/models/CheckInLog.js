const mongoose = require('mongoose');
const logSchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  scannedAt: { type: Date, default: Date.now },
  scannerName: String,
});
logSchema.index({ ticketId: 1, sessionId: 1 }, { unique: true });

module.exports = mongoose.model('CheckInLog', logSchema);