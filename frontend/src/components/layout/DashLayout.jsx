import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const MENUS = {
  creator: [
    { to: '/creator/events', label: '📋 Sự kiện của tôi' },
    { to: '/creator/events/new', label: '➕ Tạo sự kiện mới' },
  ],
  manager: [
    { to: '/manager', label: '📊 Dashboard', end: true },
    { to: '/manager/events/pending', label: '⏳ Sự kiện chờ duyệt' },
    { to: '/manager/refunds', label: '💰 Yêu cầu hoàn tiền' },
  ],
  staff: [
    { to: '/staff/checkin', label: '📷 Soát vé / Check-in' },
  ],
  admin: [
    { to: '/admin/users', label: '👥 Quản lý tài khoản' },
    { to: '/admin/logs', label: '📜 System Log' },
  ],
};

const ROLE_LABELS = { creator: 'Nhân viên TT', manager: 'Ban tổ chức', staff: 'Soát vé', admin: 'Quản trị viên' };

export default function DashLayout({ role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const menus = MENUS[role] || [];

  const handleLogout = () => { logout(); toast.success('Đã đăng xuất'); navigate('/'); };

  const linkStyle = ({ isActive }) => ({
    display: 'block', padding: '10px 16px', borderRadius: 8, marginBottom: 4,
    textDecoration: 'none', fontSize: 14,
    background: isActive ? '#2E75B6' : 'transparent',
    color: isActive ? '#fff' : '#BDD7EE',
    fontWeight: isActive ? 'bold' : 'normal',
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      {/* ── Sidebar ── */}
      <aside style={{ width: 240, background: '#1F3864', display: 'flex', flexDirection: 'column', padding: '20px 12px' }}>
        <NavLink to="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>
          🎫 EventSystem
        </NavLink>
        <div style={{ color: '#BDD7EE', fontSize: 12, marginBottom: 24, paddingLeft: 4 }}>
          {ROLE_LABELS[role]} — {user?.fullName}
        </div>
        <nav style={{ flex: 1 }}>
          {menus.map(m => (
            <NavLink key={m.to} to={m.to} end={m.end} style={linkStyle}>{m.label}</NavLink>
          ))}
          <NavLink to="/" style={linkStyle}>🏠 Trang chủ</NavLink>
        </nav>
        <button onClick={handleLogout} style={{ background: '#2E75B6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', marginTop: 8, fontSize: 14 }}>
          Đăng xuất
        </button>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, background: '#F5F7FA', overflowY: 'auto' }}>
        <div style={{ padding: 28 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
