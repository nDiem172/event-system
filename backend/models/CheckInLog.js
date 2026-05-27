const mongoose = require('mongoose');
const logSchema = new mongoose.Schema({
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
    scannedAt: { type: Date, default: Date.now },
    scannerName: String 
});
module.exports = mongoose.model('CheckInLog', logSchema);