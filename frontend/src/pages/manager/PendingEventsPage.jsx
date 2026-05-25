// PendingEventsPage.jsx
import { useEffect, useState } from 'react';
import { managerAPI } from '../../utils/api';
import toast from 'react-hot-toast';

export default function PendingEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(null);

  const fetch = () => {
    managerAPI.getPendingEvents()
      .then(({ data }) => setEvents(data.data))
      .finally(() => setLoading(false));
  };
  useEffect(fetch, []);

  const handleApprove = async (id) => {
    try {
      await managerAPI.approve(id);
      toast.success('Sự kiện đã được phê duyệt!');
      fetch();
      setSelected(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) { toast.error('Vui lòng nhập lý do từ chối'); return; }
    try {
      await managerAPI.reject(id, rejectReason);
      toast.success('Đã từ chối sự kiện');
      setShowReject(null); setRejectReason(''); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  if (loading) return <p>Đang tải...</p>;

  return (
    <div>
      <h2 style={{ color: '#1F3864', marginBottom: 24 }}>⏳ Sự kiện chờ duyệt ({events.length})</h2>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14 }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <p style={{ color: '#888' }}>Không có sự kiện nào chờ duyệt.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20 }}>
          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {events.map(ev => (
              <div key={ev._id} onClick={() => setSelected(ev)}
                style={{ background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', cursor: 'pointer', border: selected?._id === ev._id ? '2px solid #2E75B6' : '2px solid transparent' }}>
                <h3 style={{ margin: '0 0 6px', color: '#1F3864', fontSize: 15 }}>{ev.title}</h3>
                <p style={{ margin: '0 0 4px', color: '#666', fontSize: 13 }}>📅 {new Date(ev.startTime).toLocaleString('vi-VN')}</p>
                <p style={{ margin: '0 0 6px', color: '#666', fontSize: 13 }}>📍 {ev.location}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#888' }}>👤 {ev.createdBy?.fullName} ({ev.createdBy?.email})</p>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', height: 'fit-content', position: 'sticky', top: 20 }}>
              <h3 style={{ color: '#1F3864', marginBottom: 16 }}>{selected.title}</h3>
              {selected.bannerUrl && <img src={selected.bannerUrl} alt="banner" style={{ width: '100%', borderRadius: 8, maxHeight: 180, objectFit: 'cover', marginBottom: 16 }} />}
              <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse', marginBottom: 16 }}>
                {[
                  ['Bắt đầu', new Date(selected.startTime).toLocaleString('vi-VN')],
                  ['Kết thúc', new Date(selected.endTime).toLocaleString('vi-VN')],
                  ['Địa điểm', selected.location],
                  ['Loại hình', selected.category],
                  ['Người tạo', `${selected.createdBy?.fullName}`],
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '7px 0', color: '#888', width: 100 }}>{k}</td>
                    <td style={{ padding: '7px 0', fontWeight: 500 }}>{v}</td>
                  </tr>
                ))}
              </table>
              <p style={{ color: '#444', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>{selected.description?.slice(0, 300)}{selected.description?.length > 300 ? '...' : ''}</p>
              <div style={{ marginBottom: 16 }}>
                <strong style={{ fontSize: 13 }}>Loại vé:</strong>
                {selected.ticketTypes?.map(t => (
                  <div key={t.name} style={{ fontSize: 13, color: '#555', padding: '4px 0' }}>
                    {t.name}: {t.price === 0 ? 'Miễn phí' : `${t.price.toLocaleString('vi-VN')} đ`} ({t.quantity} vé)
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => handleApprove(selected._id)}
                  style={{ flex: 1, background: '#27ae60', color: '#fff', border: 'none', borderRadius: 8, padding: 12, cursor: 'pointer', fontSize: 15, fontWeight: 'bold' }}>
                  ✅ Phê duyệt
                </button>
                <button onClick={() => setShowReject(selected._id)}
                  style={{ flex: 1, background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, padding: 12, cursor: 'pointer', fontSize: 15, fontWeight: 'bold' }}>
                  ❌ Từ chối
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject modal */}
      {showReject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 32, maxWidth: 440, width: '90%' }}>
            <h3 style={{ color: '#e74c3c', marginBottom: 16 }}>Nhập lý do từ chối</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4}
              placeholder="Mô tả chi tiết lý do để Nhân viên TT biết cần sửa gì..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowReject(null); setRejectReason(''); }}
                style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' }}>Hủy</button>
              <button onClick={() => handleReject(showReject)}
                style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}>
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
