import { Link } from 'react-router-dom';
export default function UnauthorizedPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 80 }}>🚫</div>
        <h2 style={{ color: '#1F3864' }}>Không có quyền truy cập</h2>
        <p style={{ color: '#666' }}>Bạn không có quyền truy cập trang này.</p>
        <Link to="/" style={{ background: '#2E75B6', color: '#fff', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', display: 'inline-block', marginTop: 16 }}>
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
