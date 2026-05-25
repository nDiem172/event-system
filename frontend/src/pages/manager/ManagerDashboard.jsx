// ManagerDashboard.jsx
import { useEffect, useState } from 'react';
import { managerAPI } from '../../utils/api';

const StatCard = ({ icon, label, value, color }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderLeft: `5px solid ${color}` }}>
    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 28, fontWeight: 'bold', color }}>{value}</div>
    <div style={{ color: '#888', fontSize: 14, marginTop: 4 }}>{label}</div>
  </div>
);

export default function ManagerDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    managerAPI.getDashboard().then(({ data }) => setStats(data.data)).catch(() => {});
  }, []);

  return (
    <div>
      <h2 style={{ color: '#1F3864', marginBottom: 24 }}>📊 Dashboard Quản lý</h2>
      {!stats ? <p>Đang tải...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
          <StatCard icon="🎪" label="Sự kiện đang chạy" value={stats.totalEvents}      color="#2E75B6" />
          <StatCard icon="📝" label="Tổng đăng ký"      value={stats.totalRegistrations} color="#27ae60" />
          <StatCard icon="✅" label="Đã check-in"        value={`${stats.checkedIn} (${stats.checkInRate}%)`} color="#8e44ad" />
          <StatCard icon="💰" label="Doanh thu (VNĐ)"   value={Number(stats.revenue).toLocaleString('vi-VN')} color="#e67e22" />
          <StatCard icon="🚫" label="Tỷ lệ hủy vé"      value={`${stats.cancelRate}%`}  color="#e74c3c" />
        </div>
      )}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
        <h3 style={{ color: '#1F3864', marginBottom: 12 }}>Truy cập nhanh</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { href: '/manager/events/pending', label: '⏳ Sự kiện chờ duyệt', color: '#e67e22' },
            { href: '/manager/refunds',         label: '💰 Yêu cầu hoàn tiền', color: '#8e44ad' },
          ].map(a => (
            <a key={a.href} href={a.href}
              style={{ background: a.color, color: '#fff', padding: '10px 20px', borderRadius: 10, textDecoration: 'none', fontWeight: 'bold', fontSize: 14 }}>
              {a.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
