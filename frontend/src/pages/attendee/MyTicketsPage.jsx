import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ticketAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_LABEL = {
  'Pending':        { label: 'Chờ thanh toán', color: '#e67e22' },
  'Valid':          { label: 'Hợp lệ',         color: '#27ae60' },
  'Checked-in':    { label: 'Đã check-in',     color: '#2E75B6' },
  'Canceled':      { label: 'Đã hủy',          color: '#e74c3c' },
  'Refund-Pending':{ label: 'Chờ hoàn tiền',   color: '#8e44ad' },
  'Refunded':      { label: 'Đã hoàn tiền',    color: '#7f8c8d' },
  'Expired':       { label: 'Hết hiệu lực',   color: '#95a5a6' },
};

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ticketAPI.getMyTickets()
      .then(({ data }) => setTickets(data.data))
      .catch(() => toast.error('Không tải được danh sách vé'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ textAlign: 'center', padding: 60 }}>Đang tải...</p>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>
      <h2 style={{ color: '#1F3864', marginBottom: 24 }}>🎫 Vé của tôi</h2>

      {tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 56 }}>🎟️</div>
          <h3 style={{ color: '#888' }}>Bạn chưa có vé nào</h3>
          <Link to="/" style={{ background: '#2E75B6', color: '#fff', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', display: 'inline-block', marginTop: 16 }}>
            Khám phá sự kiện ngay
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tickets.map(ticket => {
            const ev = ticket.eventId;
            const st = STATUS_LABEL[ticket.status] || { label: ticket.status, color: '#888' };
            return (
              <div key={ticket._id} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', gap: 20, alignItems: 'center' }}>
                <img
                  src={ev?.bannerUrl || 'https://via.placeholder.com/100x80?text=Event'}
                  alt={ev?.title}
                  style={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 6px', color: '#1F3864', fontSize: 16 }}>{ev?.title || 'Sự kiện đã xóa'}</h3>
                  <p style={{ margin: '0 0 4px', color: '#666', fontSize: 13 }}>
                    📅 {ev?.startTime ? new Date(ev.startTime).toLocaleString('vi-VN') : '—'}
                  </p>
                  <p style={{ margin: '0 0 4px', color: '#666', fontSize: 13 }}>📍 {ev?.location}</p>
                  <p style={{ margin: 0, fontSize: 13 }}>
                    Loại vé: <strong>{ticket.ticketType}</strong> —{' '}
                    {ticket.price === 0 ? 'Miễn phí' : `${ticket.price.toLocaleString('vi-VN')} đ`}
                  </p>
                  {ticket.sessionLabels?.length > 0 && (
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: '#667085' }}>
                      Phiên: {ticket.sessionLabels.join(' · ')}
                    </p>
                  )}
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888' }}>Mã: {ticket.ticketCode}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                  <span style={{ background: st.color + '22', color: st.color, padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 'bold' }}>
                    {st.label}
                  </span>
                  <Link to={`/my-tickets/${ticket._id}`}
                    style={{ background: '#1F3864', color: '#fff', padding: '7px 16px', borderRadius: 8, textDecoration: 'none', fontSize: 13 }}>
                    Xem vé →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
