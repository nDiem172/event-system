const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: (process.env.SMTP_PASS || '').trim() },
});

const sendEmail = async ({ to, subject, html }) => {
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
    from: `"Event System" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html: finalHtml,
  });
};

// ── Templates ────────────────────────────────────────────────
const emailTemplates = {
  verification: (link, fullName) => `
    <h2>Xác thực tài khoản</h2>
    <p>Chào <strong>${fullName}</strong>,</p>
    <p>Vui lòng nhấn vào đường dẫn bên dưới để kích hoạt tài khoản của bạn:</p>
    <div style="text-align: center;">
      <a href="${link}" style="background:#2E75B6;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Xác thực ngay</a>
    </div>
    <p>Link hết hạn sau 2 giờ.</p>`,

  ticketConfirm: (event, qrCode, fullName, ticketLink) => `
    <h2>🎫 Xác nhận đăng ký thành công!</h2>
    <p>Chào <strong>${fullName}</strong>,</p>
    <p>Bạn đã đăng ký tham gia sự kiện: <strong>${event.title}</strong></p>
    <p>📅 Thời gian: ${new Date(event.startTime).toLocaleString('vi-VN')}</p> 
    <p>📍 Địa điểm: ${event.location}</p>
    <p>Mã QR vé của bạn:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${ticketLink}" style="background:#2E75B6;color:white;padding:15px 35px;text-decoration:none;border-radius:5px;font-weight:bold;display:inline-block;box-shadow: 0 4px 10px rgba(46,117,182,0.3);">
        👉 NHẤN ĐỂ LẤY MÃ QR VÀO CỔNG
      </a>
    </div>
    <p>Vui lòng mang mã QR này đến sự kiện để check-in.</p>
    <p style="color: #666; font-size: 13px;">Lưu ý: Mã QR hiển thị trên web là mã động, tự động thay đổi để bảo mật. Vui lòng không chụp màn hình.</p>`,

  ticketCanceled: (event, fullName, ticketLink) => `
    <h2>Xác nhận hủy vé</h2>
    <p>Chào <strong>${fullName}</strong>,</p>
    <p>Vé tham gia sự kiện <strong>${event.title}</strong> của bạn đã được hủy thành công.</p>
    <div style="text-align: center;">
      <a href="${ticketLink}" style="background:#2E75B6;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;font-weight:bold;display:inline-block;box-shadow: 0 2px 5px rgba(0,0,0,0.1);">Xem chi tiết tại đây</a>
    </div>
  `,
  paymentPending: (event, fullName, price, paymentLink) => {
    return `
      <h2>Xác nhận giữ chỗ: ${event.title}</h2>
      <p>Chào ${fullName},</p>
      <p>Chúng tôi đã giữ chỗ cho bạn. Vui lòng hoàn tất thanh toán số tiền: <strong>${price.toLocaleString()} VNĐ</strong>.</p>
      <p><a href="${paymentLink}" style="padding: 10px 20px; background: #2E75B6; color: white; text-decoration: none;">Thanh toán ngay</a></p>
      <p>Cảm ơn bạn!</p>
    `;
  },

  refundPending: (event, amount) => `
    <h2>Yêu cầu hoàn tiền đã được ghi nhận</h2>
    <p>Yêu cầu hủy vé sự kiện <strong>${event.title}</strong> đã được ghi nhận.</p>
    <p>Số tiền hoàn dự kiến: <strong>${amount.toLocaleString('vi-VN')} VNĐ</strong></p>
    <p>Tiền sẽ được hoàn trong 15-30 ngày làm việc sau khi được phê duyệt.</p>`,

  refundApproved: (event, amount) => `
    <h2>Yêu cầu hoàn tiền đã được duyệt</h2>
    <p>Yêu cầu hoàn tiền vé sự kiện <strong>${event.title}</strong> đã được xét duyệt.</p>
    <p>Số tiền hoàn trả thực tế: <strong>${amount.toLocaleString('vi-VN')} VNĐ</strong></p>
    <p>Tiền sẽ được chuyển về phương thức thanh toán gốc trong 15-30 ngày làm việc.</p>`,

  refundRejected: (event, reason) => `
    <h2>Yêu cầu hoàn tiền bị từ chối</h2>
    <p>Yêu cầu hoàn tiền vé sự kiện <strong>${event.title}</strong> đã bị từ chối.</p>
    <p>Lý do: ${reason}</p>`,

  waitlistNotify: (event, link) => `
    <h2>Có vé trống cho sự kiện bạn quan tâm!</h2>
    <p>Sự kiện <strong>${event.title}</strong> vừa có vé trống.</p>
    <p>Nhấn vào đây để đăng ký ngay (link hết hạn sau 2 giờ):</p>
    <a href="${link}" style="background:#2E75B6;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;font-weight:bold;display:inline-block;box-shadow: 0 2px 5px rgba(0,0,0,0.1);">Đăng ký ngay</a>`,

  accountLocked: () => `
    <h2>Tài khoản bị tạm khóa</h2>
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
  
  internalAccountCreated: (fullName, email, tempPassword, loginLink) => `
    <h2>Tài khoản nội bộ đã được tạo</h2>
    <p>Chào <strong>${fullName}</strong>,</p>
    <p>Tài khoản của bạn đã được tạo thành công trên hệ thống với thông tin đăng nhập như sau:</p>
    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #2E75B6;">
      <p style="margin: 5px 0;"><strong>Tên đăng nhập:</strong> ${email}</p>
      <p style="margin: 5px 0;"><strong>Mật khẩu tạm:</strong> <span style="color: #d32f2f; font-weight: bold; font-size: 15px;">${tempPassword}</span></p>
    </div>
     <p>Vui lòng thay đổi mật khẩu sau khi đăng nhập để bảo mật tài khoản của bạn tại đây:</p>
    <div style="text-align: center; margin: 25px 0;">
      <a href="${loginLink}" style="background:#2E75B6;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;font-weight:bold;display:inline-block;box-shadow: 0 2px 5px rgba(0,0,0,0.1);">Đăng nhập ngay</a>
    </div>
    `,
  
  
};

module.exports = { sendEmail, emailTemplates };
