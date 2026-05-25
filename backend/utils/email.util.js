const nodemailer = require('nodemailer');

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error('SMTP chưa cấu hình đầy đủ (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).');
  }

  const secure =
    process.env.SMTP_SECURE !== undefined
      ? String(process.env.SMTP_SECURE).toLowerCase() === 'true' || String(process.env.SMTP_SECURE) === '1'
      : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = getTransporter();
  const finalHtml = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      ${html}
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0 20px 0;" />
      <p style="font-size: 12px; color: #9d1111; text-align: center;">
        
        <strong>Thư này được gửi từ địa chỉ mail không chấp nhận mail đến. Vui lòng không trả lời thư này./.</strong>
      </p>
    </div>
  `;
  await transporter.sendMail({
    from: `"Event System" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html: finalHtml,
  });
};

// ── Templates ────────────────────────────────────────────────
const emailTemplates = {
  verification: (link) => `
    <h2>Xác thực tài khoản</h2>
    <p>Nhấn vào đường dẫn bên dưới để xác thực tài khoản của bạn:</p>
    <a href="${link}" style="background:#2E75B6;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Xác thực ngay</a>
    <p>Link hết hạn sau 24 giờ.</p>`,

  ticketConfirm: (event, qrCode) => `
    <h2>🎫 Xác nhận đăng ký thành công!</h2>
    <p>Bạn đã đăng ký tham gia sự kiện: <strong>${event.title}</strong></p>
    <p>📅 Thời gian: ${new Date(event.startTime).toLocaleString('vi-VN')}</p>
    <p>📍 Địa điểm: ${event.location}</p>
    <p>Mã QR vé của bạn:</p>
    <img src="${qrCode}" alt="QR Code vé" style="width:200px;height:200px;" />
    <p>Vui lòng mang mã QR này đến sự kiện để check-in.</p>`,

  ticketCanceled: (event) => `
    <h2>Xác nhận hủy vé</h2>
    <p>Vé tham gia sự kiện <strong>${event.title}</strong> của bạn đã được hủy thành công.</p>`,

  refundPending: (event, amount) => `
    <h2>Yêu cầu hoàn tiền đã được ghi nhận</h2>
    <p>Yêu cầu hủy vé sự kiện <strong>${event.title}</strong> đã được ghi nhận.</p>
    <p>Số tiền hoàn dự kiến: <strong>${amount.toLocaleString('vi-VN')} VNĐ</strong></p>
    <p>Tiền sẽ được hoàn trong 15-30 ngày làm việc sau khi được phê duyệt.</p>`,

  refundApproved: (event, amount) => `
    <h2>✅ Yêu cầu hoàn tiền đã được duyệt</h2>
    <p>Yêu cầu hoàn tiền vé sự kiện <strong>${event.title}</strong> đã được xét duyệt.</p>
    <p>Số tiền hoàn trả thực tế: <strong>${amount.toLocaleString('vi-VN')} VNĐ</strong></p>
    <p>Tiền sẽ được chuyển về phương thức thanh toán gốc trong 15-30 ngày làm việc.</p>`,

  refundRejected: (event, reason) => `
    <h2>❌ Yêu cầu hoàn tiền bị từ chối</h2>
    <p>Yêu cầu hoàn tiền vé sự kiện <strong>${event.title}</strong> đã bị từ chối.</p>
    <p>Lý do: ${reason}</p>`,

  waitlistNotify: (event, link) => `
    <h2>🎉 Có vé trống cho sự kiện bạn quan tâm!</h2>
    <p>Sự kiện <strong>${event.title}</strong> vừa có vé trống.</p>
    <p>Nhấn vào đây để đăng ký ngay (link hết hạn sau 2 giờ):</p>
    <a href="${link}" style="background:#2E75B6;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Đăng ký ngay</a>`,

  accountLocked: () => `
    <h2>⚠️ Tài khoản bị tạm khóa</h2>
    <p>Tài khoản của bạn đã bị khóa tạm 15 phút do đăng nhập sai quá 5 lần.</p>
    <p>Nếu đây không phải bạn, hãy liên hệ quản trị viên ngay.</p>`,

  ticketUpdated: (event, qrCode) => `
    <h2>Thông tin vé đã được cập nhật</h2>
    <p>Thông tin vé tham gia sự kiện <strong>${event.title}</strong> đã được cập nhật.</p>
    <p>Mã QR mới của bạn:</p>
    <img src="${qrCode}" alt="QR Code vé" style="width:200px;height:200px;" />`,

  eventRejected: (event, reason) => `
    <h2>Sự kiện của bạn bị từ chối</h2>
    <p>Sự kiện <strong>${event.title}</strong> đã bị từ chối phê duyệt.</p>
    <p>Lý do: ${reason}</p>
    <p>Vui lòng chỉnh sửa và gửi lại.</p>`,
};

module.exports = { sendEmail, emailTemplates };
