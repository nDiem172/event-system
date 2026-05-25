// ── LoginPage.jsx ────────────────────────────────────────────
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

export function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [form, setForm]     = useState({ email: '', password: '' });
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

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', background: '#F5F7FA' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 40, width: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#1F3864', textAlign: 'center', marginBottom: 28 }}>Đăng nhập</h2>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#555' }}>Email</label>
          <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #ccc', marginBottom: 16, fontSize: 15, boxSizing: 'border-box' }} />

          <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#555' }}>Mật khẩu</label>
          <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #ccc', marginBottom: 24, fontSize: 15, boxSizing: 'border-box' }} />

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

// ── RegisterPage.jsx ─────────────────────────────────────────
export function RegisterPage() {
  const navigate  = useNavigate();
  const [form, setForm]     = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const { authAPI: aAPI } = require('../../utils/api');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Mật khẩu xác nhận không khớp'); return;
    }
    setLoading(true);
    try {
      const { default: toast } = await import('react-hot-toast');
      const { authAPI } = await import('../../utils/api');
      const { data } = await authAPI.register({ fullName: form.fullName, email: form.email, phone: form.phone, password: form.password });
      toast.success(data.message);
      navigate('/login');
    } catch (err) {
      const { default: toast } = await import('react-hot-toast');
      toast.error(err.response?.data?.message || 'Đăng ký thất bại');
    }
    setLoading(false);
  };

  const inp = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #ccc', marginBottom: 16, fontSize: 15, boxSizing: 'border-box' };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', background: '#F5F7FA', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 40, width: 420, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#1F3864', textAlign: 'center', marginBottom: 28 }}>Tạo tài khoản mới</h2>
        <form onSubmit={handleSubmit}>
          {[
            { label: 'Họ và tên', key: 'fullName', type: 'text' },
            { label: 'Email', key: 'email', type: 'email' },
            { label: 'Số điện thoại', key: 'phone', type: 'tel' },
            { label: 'Mật khẩu (tối thiểu 8 ký tự)', key: 'password', type: 'password' },
            { label: 'Xác nhận mật khẩu', key: 'confirm', type: 'password' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#555' }}>{f.label}</label>
              <input type={f.type} required value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={inp} />
            </div>
          ))}
          <button type="submit" disabled={loading}
            style={{ width: '100%', background: '#1F3864', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 16, cursor: 'pointer', fontWeight: 'bold' }}>
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

// ── VerifyEmailPage.jsx ──────────────────────────────────────
export function VerifyEmailPage() {
  const [status, setStatus] = useState('loading');
  const location = useLocation();

  useEffect(() => {
    const token = new URLSearchParams(location.search).get('token');
    if (!token) { setStatus('error'); return; }
    import('../../utils/api').then(({ authAPI }) =>
      authAPI.verifyEmail(token)
        .then(() => setStatus('success'))
        .catch(() => setStatus('error'))
    );
  }, [location]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', background: '#fff', padding: 40, borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        {status === 'loading' && <p>Đang xác thực...</p>}
        {status === 'success' && (
          <>
            <div style={{ fontSize: 60 }}>✅</div>
            <h2 style={{ color: '#1F3864' }}>Xác thực thành công!</h2>
            <p>Tài khoản của bạn đã được kích hoạt.</p>
            <Link to="/login" style={{ background: '#2E75B6', color: '#fff', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', display: 'inline-block', marginTop: 16 }}>Đăng nhập ngay</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 60 }}>❌</div>
            <h2 style={{ color: '#e74c3c' }}>Link xác thực không hợp lệ</h2>
            <p>Link đã hết hạn hoặc không đúng.</p>
            <Link to="/login" style={{ color: '#2E75B6' }}>Quay về đăng nhập</Link>
          </>
        )}
      </div>
    </div>
  );
}

import { useEffect } from 'react';
export default LoginPage;
export { LoginPage as default };
