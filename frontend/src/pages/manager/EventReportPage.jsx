import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { managerAPI } from '../../utils/api';
import toast from 'react-hot-toast';

export default function EventReportPage() {
  const { id } = useParams();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    managerAPI.getDashboard({ eventId: id }).then(({ data }) => setStats(data.data)).catch(() => {});
  }, [id]);

  const handleExport = async () => {
    try {
      const { data } = await managerAPI.exportAttendees(id);
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a'); a.href = url; a.download = 'attendees.xlsx'; a.click();
      toast.success('Đã xuất file Excel!');
    } catch { toast.error('Lỗi xuất file'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: '#1F3864', margin: 0 }}>📊 Báo cáo sự kiện</h2>
        <button onClick={handleExport} style={{ background: '#27ae60', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>
          📥 Xuất Excel danh sách tham dự
        </button>
      </div>
      {!stats ? <p>Đang tải...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
          {[
            ['📝 Tổng đăng ký', stats.totalRegistrations, '#2E75B6'],
            ['✅ Đã check-in', stats.checkedIn, '#27ae60'],
            ['📈 Tỷ lệ check-in', `${stats.checkInRate}%`, '#8e44ad'],
            ['💰 Doanh thu', `${Number(stats.revenue).toLocaleString('vi-VN')} đ`, '#e67e22'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderLeft: `5px solid ${color}` }}>
              <div style={{ fontSize: 26, fontWeight: 'bold', color }}>{value}</div>
              <div style={{ color: '#888', fontSize: 14, marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
