import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const ROLE_HOME = {
  Attendee: '/',
  Content_Creator: '/creator/events',
  Manager: '/manager',
  Staff: '/staff/checkin',
  Admin: '/admin/users',
};

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Đã đăng xuất');
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Arial, sans-serif' }}>
      {/* ── Navbar ── */}
      <nav style={{ background: '#1F3864', color: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
        <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: 20 }}>
          🎫 EventSystem
        </Link>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link to="/" style={{ color: '#BDD7EE', textDecoration: 'none', fontSize: 14 }}>Sự kiện</Link>
          {user ? (
            <>
              {user.role === 'Attendee' && (
                <Link to="/my-tickets" style={{ color: '#BDD7EE', textDecoration: 'none', fontSize: 14 }}>Vé của tôi</Link>
              )}
              {user.role !== 'Attendee' && (
                <Link to={ROLE_HOME[user.role]} style={{ color: '#BDD7EE', textDecoration: 'none', fontSize: 14 }}>Quản trị</Link>
              )}
              <Link to="/profile" style={{ color: '#BDD7EE', textDecoration: 'none', fontSize: 14 }}>👤 {user.fullName}</Link>
              <button onClick={handleLogout} style={{ background: '#2E75B6', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ color: '#BDD7EE', textDecoration: 'none', fontSize: 14 }}>Đăng nhập</Link>
              <Link to="/register" style={{ background: '#2E75B6', color: '#fff', textDecoration: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13 }}>Đăng ký</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Content ── */}
      <main style={{ flex: 1, background: '#F5F7FA' }}>
        <Outlet />
      </main>

      <footer style={{ background: '#1F3864', color: '#BDD7EE', textAlign: 'center', padding: '16px', fontSize: 13 }}>
        © 2025 EventSystem — Nhóm 7 DHHTTT18B
      </footer>
    </div>
  );
}
