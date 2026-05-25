import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { creatorAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS = {
  Draft:    { label: 'Nháp',        color: '#7f8c8d' },
  Pending:  { label: 'Chờ duyệt',   color: '#e67e22' },
  Public:   { label: 'Công khai',   color: '#27ae60' },
  Rejected: { label: 'Từ chối',     color: '#e74c3c' },
  Canceled: { label: 'Đã hủy',      color: '#95a5a6' },
};

export default function CreatorEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    creatorAPI.getMyEvents()
      .then(({ data }) => setEvents(data.data))
      .catch(() => toast.error('Không tải được danh sách'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (id) => {
    try {
      await creatorAPI.submit(id);
      toast.success('Đã gửi phê duyệt!');
      setEvents(ev => ev.map(e => e._id === id ? { ...e, status: 'Pending' } : e));
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: '#1F3864', margin: 0 }}>📋 Sự kiện của tôi</h2>
        <Link to="/creator/events/new"
          style={{ background: '#1F3864', color: '#fff', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 'bold' }}>
          + Tạo sự kiện mới
        </Link>
      </div>

      {loading ? <p>Đang tải...</p> : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14 }}>
          <div style={{ fontSize: 48 }}>📭</div>
          <p style={{ color: '#888' }}>Chưa có sự kiện nào. Hãy tạo sự kiện đầu tiên!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {events.map(ev => {
            const st = STATUS[ev.status] || { label: ev.status, color: '#888' };
            return (
              <div key={ev._id} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <h3 style={{ margin: 0, color: '#1F3864', fontSize: 16 }}>{ev.title}</h3>
                    <span style={{ background: st.color + '22', color: st.color, padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 'bold' }}>{st.label}</span>
                  </div>
                  <p style={{ margin: '0 0 4px', color: '#666', fontSize: 13 }}>📅 {new Date(ev.startTime).toLocaleString('vi-VN')}</p>
                  <p style={{ margin: 0, color: '#666', fontSize: 13 }}>📍 {ev.location}</p>
                  {ev.status === 'Rejected' && ev.rejectedReason && (
                    <p style={{ margin: '8px 0 0', color: '#e74c3c', fontSize: 13, background: '#fdf0f0', padding: '6px 10px', borderRadius: 6 }}>
                      ❌ Lý do từ chối: {ev.rejectedReason}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {['Draft', 'Rejected'].includes(ev.status) && (
                    <>
                      <Link to={`/creator/events/${ev._id}/edit`}
                        style={{ background: '#2E75B6', color: '#fff', padding: '7px 14px', borderRadius: 8, textDecoration: 'none', fontSize: 13 }}>
                        ✏️ Sửa
                      </Link>
                      {ev.status === 'Draft' && (
                        <button onClick={() => handleSubmit(ev._id)}
                          style={{ background: '#1F3864', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13 }}>
                          🚀 Gửi duyệt
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
