const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { sendEmail, emailTemplates } = require('../utils/email.util');
const { SystemLog } = require('../models/index');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { fullName, email, phone, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email này đã được đăng ký.' });
    }

    const verificationToken = uuidv4();
    await User.create({
      fullName,
      email,
      phone,
      password,
      status: 'Pending_Verification',
      verificationToken,
      verificationExpires: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });

    // Gửi email xác thực
    const verifyLink = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    try {
      await sendEmail({ to: email, subject: 'Xác thực tài khoản Event System', html: emailTemplates.verification(verifyLink, fullName) });
    } catch (e) {
      console.error('Email lỗi:', e.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
    });
  } catch (err) { next(err); }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác.' });
    }

    // Kiểm tra khóa tạm
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(403).json({ success: false, message: `Tài khoản đang bị khóa tạm. Thử lại sau ${remaining} phút.` });
    }

    if (user.status === 'Locked') {
      return res.status(403).json({ success: false, message: 'Tài khoản bị khóa. Liên hệ quản trị viên.' });
    }
    if (user.status === 'Pending_Verification') {
      return res.status(403).json({ success: false, message: 'Vui lòng xác thực email trước khi đăng nhập.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.loginAttempts = 0;
        await user.save();
        try {
          await sendEmail({ to: email, subject: 'Cảnh báo bảo mật tài khoản', html: emailTemplates.accountLocked() });
        } catch (_) {}
        await SystemLog.create({ userId: user._id, action: 'Đăng nhập thất bại - Khóa tạm', level: 'WARN', ip: req.ip });
        return res.status(403).json({ success: false, message: 'Đăng nhập sai quá 5 lần. Tài khoản bị khóa 15 phút.' });
      }
      await user.save();
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác.' });
    }

    // Đăng nhập thành công — reset attempts
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    await SystemLog.create({ userId: user._id, action: 'Đăng nhập thành công', level: 'INFO', ip: req.ip });

    const token = signToken(user._id);
    res.json({
      success: true,
      token,
      user: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role, status: user.status },
    });
  } catch (err) { next(err); }
};

// GET /api/auth/verify-email?token=xxx
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).json({ success: false, message: 'Mã xác thực không hợp lệ hoặc đã hết hạn.' });

    if (user.verificationExpires && user.verificationExpires <= Date.now()) {
      return res.status(400).json({ success: false, message: 'Mã xác thực không hợp lệ hoặc đã hết hạn.' });
    }

    if (user.status === 'Active') {
      return res.json({ success: true, message: 'Tài khoản đã được kích hoạt trước đó. Bạn có thể đăng nhập.' });
    }

    user.status = 'Active';
    await user.save();
    return res.json({ success: true, message: 'Xác thực email thành công! Bạn có thể đăng nhập.' });
  } catch (err) { next(err); }
};

// POST /api/auth/resend-verification
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email, status: 'Pending_Verification' });
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản chờ xác thực.' });
    const token = uuidv4();
    user.verificationToken = token;
    user.verificationExpires = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await user.save();
    const link = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
    await sendEmail({ to: email, subject: 'Gửi lại xác thực tài khoản', html: emailTemplates.verification(link, user.fullName) });
    res.json({ success: true, message: 'Email xác thực đã được gửi lại.' });
  } catch (err) { next(err); }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

module.exports = { register, login, verifyEmail, resendVerification, getMe };
