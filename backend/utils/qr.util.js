const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const generateTicketCode = () => {
  const shortId = uuidv4().replace(/-/g, '').substring(0, 6).toUpperCase();
  return `TKT-${shortId}`;
};

const generateQRCode = async (ticketCode) => {
  const dataUrl = await QRCode.toDataURL(ticketCode, {
    width: 300,
    margin: 2,
    color: { dark: '#1F3864', light: '#FFFFFF' },
  });
  return dataUrl;
};


const TICKET_CODE_RE = /TKT-[A-Z0-9]{6}/i;
const parseTicketCodeFromScan = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  // Lấy phần đầu tiên trước dấu | (nếu có)
  const cleanRaw = raw.split('|')[0];
  const match = cleanRaw.trim().match(TICKET_CODE_RE);
  return match ? match[0].toUpperCase() : null;
};

module.exports = { generateTicketCode, generateQRCode, parseTicketCodeFromScan };