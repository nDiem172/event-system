// user.routes.js
const express = require('express');
const r = express.Router();
const { protect } = require('../../middleware/auth.middleware');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

r.use(protect);

// PUT /api/user/profile — UC-03A cập nhật thông tin cá nhân
r.put('/profile', async (req, res, next) => {
  try {
    const { fullName, phone, occupation, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { fullName, phone, occupation, avatar },
      { new: true, runValidators: true }
    ).select('-password');
    res.json({ success: true, message: 'Cập nhật thông tin thành công.', data: user });
  } catch (err) { next(err); }
});

// PUT /api/user/change-password
r.put('/change-password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng.' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Đổi mật khẩu thành công.' });
  } catch (err) { next(err); }
});

module.exports = r;
