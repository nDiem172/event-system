const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:    { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    role: {
      type: String,
      enum: ['Attendee', 'Content_Creator', 'Manager', 'Staff', 'Admin'],
      default: 'Attendee',
    },
    status: {
      type: String,
      enum: ['Pending_Verification', 'Active', 'Locked'],
      default: 'Pending_Verification',
    },
    verificationToken: String,
    verificationExpires: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    avatar: String,
  },
  { timestamps: true }
);

// Hash password trước khi lưu
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// So sánh mật khẩu
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Kiểm tra tài khoản đang bị khóa tạm
userSchema.virtual('isLockedTemp').get(function () {
  return this.lockUntil && this.lockUntil > Date.now();
});

module.exports = mongoose.model('User', userSchema);
