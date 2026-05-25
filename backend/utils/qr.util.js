const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

// Sinh chuỗi định danh vé duy nhất
const generateTicketCode = () => `TKT-${uuidv4().toUpperCase()}`;

// Tạo ảnh QR dạng base64 từ ticketCode
const generateQRCode = async (ticketCode) => {
  const dataUrl = await QRCode.toDataURL(ticketCode, {
    width: 300,
    margin: 2,
    color: { dark: '#1F3864', light: '#FFFFFF' },
  });
  return dataUrl;
};

module.exports = { generateTicketCode, generateQRCode };
