// RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../utils/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const inp = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #ccc', marginBottom: 16, fontSize: 15, boxSizing: 'border-box' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Mật khẩu xác nhận không khớp'); return; }
    if (form.password.length < 8) { toast.error('Mật khẩu tối thiểu 8 ký tự'); return; }
    setLoading(true);
    try {
      const { data } = await authAPI.register({ fullName: form.fullName, email: form.email, phone: form.phone, password: form.password });
      toast.success(data.message);
      navigate('/login');
    } catch (err) { toast.error(err.response?.data?.message || 'Đăng ký thất bại'); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', background: '#F5F7FA', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 40, width: 420, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#1F3864', textAlign: 'center', marginBottom: 28 }}>Tạo tài khoản</h2>
        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 14, color: '#555' }}>Họ và tên</label>
          <input style={inp} type="text" required value={form.fullName} onChange={set('fullName')} />
          <label style={{ fontSize: 14, color: '#555' }}>Email</label>
          <input style={inp} type="email" required value={form.email} onChange={set('email')} />
          <label style={{ fontSize: 14, color: '#555' }}>Số điện thoại</label>
          <input style={inp} type="tel" required value={form.phone} onChange={set('phone')} pattern="[0-9]+" title="Chỉ nhập số" />
          <label style={{ fontSize: 14, color: '#555' }}>Mật khẩu (≥ 8 ký tự)</label>
          <input style={inp} type="password" required minLength={8} value={form.password} onChange={set('password')} />
          <label style={{ fontSize: 14, color: '#555' }}>Xác nhận mật khẩu</label>
          <input style={inp} type="password" required value={form.confirm} onChange={set('confirm')} />
          <button type="submit" disabled={loading}
            style={{ width: '100%', background: '#1F3864', color: '#fff', border: 'none', borderRadius: 8, padding: 12, fontSize: 16, cursor: 'pointer', fontWeight: 'bold' }}>
            {loading ? 'Đang đăng ký...' : '🎉 Đăng ký'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#666' }}>
          Đã có tài khoản? <Link to="/login" style={{ color: '#2E75B6' }}>Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
