const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { SystemLog } = require('../models/index');

// ── Xác thực JWT ────────────────────────────────────────────
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Không có quyền truy cập. Vui lòng đăng nhập.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Token không hợp lệ.' });
    }
    if (req.user.status === 'Locked') {
      return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};

// ── Kiểm tra vai trò ────────────────────────────────────────
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Vai trò "${req.user.role}" không có quyền truy cập chức năng này.`,
    });
  }
  next();
};

// ── Ghi System Log ──────────────────────────────────────────
const logAction = (action, level = 'INFO') => async (req, res, next) => {
  try {
    await SystemLog.create({
      userId: req.user?._id,
      action,
      details: JSON.stringify({ params: req.params, body: req.body }),
      ip: req.ip,
      level,
    });
  } catch (_) { /* không block request nếu log lỗi */ }
  next();
};

module.exports = { protect, authorize, logAction };
