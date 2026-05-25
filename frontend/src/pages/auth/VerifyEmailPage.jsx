// VerifyEmailPage.jsx
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authAPI } from '../../utils/api';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState('loading');
  const location = useLocation();
  useEffect(() => {
    const token = new URLSearchParams(location.search).get('token');
    if (!token) { setStatus('error'); return; }
    authAPI.verifyEmail(token).then(() => setStatus('success')).catch(() => setStatus('error'));
  }, []);
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
      <div style={{ textAlign: 'center', background: '#fff', padding: 48, borderRadius: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxWidth: 420 }}>
        {status === 'loading' && <><div style={{ fontSize: 48 }}>⏳</div><p>Đang xác thực...</p></>}
        {status === 'success' && <><div style={{ fontSize: 60 }}>✅</div><h2 style={{ color: '#1F3864' }}>Xác thực thành công!</h2><p style={{ color: '#666' }}>Tài khoản của bạn đã được kích hoạt.</p><Link to="/login" style={{ background: '#2E75B6', color: '#fff', padding: '10px 28px', borderRadius: 8, textDecoration: 'none', display: 'inline-block', marginTop: 16, fontWeight: 'bold' }}>Đăng nhập ngay →</Link></>}
        {status === 'error' && <><div style={{ fontSize: 60 }}>❌</div><h2 style={{ color: '#e74c3c' }}>Link không hợp lệ</h2><p style={{ color: '#666' }}>Link đã hết hạn hoặc đã được sử dụng.</p><Link to="/login" style={{ color: '#2E75B6' }}>Quay về đăng nhập</Link></>}
      </div>
    </div>
  );
}
