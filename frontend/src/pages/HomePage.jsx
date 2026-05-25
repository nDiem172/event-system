import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventAPI } from '../utils/api';

const cardBase = {
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid rgba(31,56,100,0.10)',
};

export default function HomePage() {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [scope, setScope]     = useState('upcoming'); // upcoming | past
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data } = await eventAPI.getAll({ search, scope, page, limit: 12 });
      setEvents(data.data);
      setTotalPages(data.totalPages);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [page, scope]);
  useEffect(() => { setPage(1); }, [scope]);
  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchEvents(); };

  const tabsWrap = {
    display: 'inline-flex',
    padding: 6,
    borderRadius: 999,
    background: '#F2F5FA',
    border: '1px solid rgba(31,56,100,0.10)',
    gap: 6,
  };
  const tabStyle = (t) => ({
    position: 'relative',
    padding: '10px 16px',
    borderRadius: 999,
    border: 'none',
    cursor: 'pointer',
    background: scope === t ? '#1F3864' : 'transparent',
    color: scope === t ? '#fff' : '#1F3864',
    fontWeight: 800,
    fontSize: 13,
    letterSpacing: 0.2,
    transition: 'all 180ms ease',
    minWidth: 130,
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ color: '#1F3864', marginBottom: 8 }}>Khám phá Sự kiện</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>Tìm kiếm và đăng ký tham gia các sự kiện hấp dẫn</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <div style={tabsWrap} aria-label="Event scope tabs">
          <button type="button" style={tabStyle('upcoming')} onClick={() => setScope('upcoming')}>Sắp diễn ra</button>
          <button type="button" style={tabStyle('past')} onClick={() => setScope('past')}>Đã diễn ra</button>
        </div>
        <div style={{ fontSize: 13, color: '#667085' }}>
          {loading ? 'Đang tải...' : `${events.length} sự kiện`}
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Tìm kiếm sự kiện, địa điểm..."
          style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid #ccc', fontSize: 15 }}
        />
        <button type="submit" style={{ background: '#2E75B6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 15 }}>
          🔍 Tìm
        </button>
      </form>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#888' }}>Đang tải...</p>
      ) : events.length === 0 ? (
        <div style={{
          textAlign: 'center',
          color: '#667085',
          background: '#fff',
          border: '1px solid rgba(31,56,100,0.10)',
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🔎</div>
          <div style={{ fontWeight: 800, color: '#1F3864', marginBottom: 6 }}>Không có sự kiện phù hợp</div>
          <div style={{ fontSize: 13 }}>Thử đổi từ khóa tìm kiếm hoặc chuyển tab.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {events.map(ev => (
            <div key={ev._id} style={cardBase}>
              <div style={{ position: 'relative' }}>
                <img
                  src={ev.bannerUrl || 'https://via.placeholder.com/400x200?text=Event'}
                  alt={ev.title}
                  style={{ width: '100%', height: 180, objectFit: 'cover' }}
                />
                {scope === 'past' && (
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: 'rgba(17,24,39,0.72)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 800,
                    backdropFilter: 'blur(6px)',
                  }}>
                    Đã kết thúc
                  </div>
                )}
              </div>
              <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 8px', color: '#1F3864', fontSize: 16 }}>{ev.title}</h3>
                <p style={{ margin: '0 0 4px', color: '#666', fontSize: 13 }}>
                  📅 {new Date(ev.startTime).toLocaleDateString('vi-VN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
                <p style={{ margin: '0 0 12px', color: '#666', fontSize: 13 }}>📍 {ev.location}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span style={{
                    fontSize: 13, fontWeight: 'bold',
                    color: ev.ticketTypes?.[0]?.price === 0 ? '#27ae60' : '#2E75B6'
                  }}>
                    {ev.ticketTypes?.[0]?.price === 0 ? 'Miễn phí' : `${ev.ticketTypes[0].price.toLocaleString('vi-VN')} đ`}
                  </span>
                  {scope === 'upcoming' ? (
                    <span style={{ fontSize: 12, color: ev.availableTickets > 0 ? '#667085' : '#e74c3c', fontWeight: 700 }}>
                      {ev.availableTickets > 0 ? `Còn ${ev.availableTickets} vé` : 'Hết vé'}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#667085', fontWeight: 700 }}>Xem chi tiết</span>
                  )}
                </div>
                <Link to={`/events/${ev._id}`} style={{
                  display: 'block', textAlign: 'center', marginTop: 12,
                  background: scope === 'past' ? '#2E75B6' : '#1F3864',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: 12,
                  padding: '10px 0',
                  fontSize: 14,
                  fontWeight: 900,
                  boxShadow: '0 8px 18px rgba(31,56,100,0.22)',
                }}>
                  Xem chi tiết →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              style={{
                background: page === i + 1 ? '#1F3864' : '#fff',
                color: page === i + 1 ? '#fff' : '#1F3864',
                border: '1px solid rgba(31,56,100,0.18)',
                borderRadius: 10,
                padding: '8px 14px',
                cursor: 'pointer',
                fontWeight: 800,
              }}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
