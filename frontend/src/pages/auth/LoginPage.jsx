import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const ROLE_REDIRECT = {
  Attendee: '/',
  Content_Creator: '/creator/events',
  Manager: '/manager',
  Staff: '/staff/checkin',
  Admin: '/admin/users',
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success('Đăng nhập thành công!');
      const from = location.state?.from || ROLE_REDIRECT[user.role] || '/';
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng nhập thất bại');
    }
    setLoading(false);
  };

  const inp = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #ccc', marginBottom: 16, fontSize: 15, boxSizing: 'border-box' };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', background: '#F5F7FA' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 40, width: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#1F3864', textAlign: 'center', marginBottom: 28 }}>Đăng nhập</h2>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#555' }}>Email</label>
          <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inp} />
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#555' }}>Mật khẩu</label>
          <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={inp} />
          <button type="submit" disabled={loading}
            style={{ width: '100%', background: '#1F3864', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 16, cursor: 'pointer', fontWeight: 'bold' }}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#666' }}>
          Chưa có tài khoản? <Link to="/register" style={{ color: '#2E75B6' }}>Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}
