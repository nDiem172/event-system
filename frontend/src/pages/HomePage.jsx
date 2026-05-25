import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventAPI } from '../utils/api';

const card = { background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' };

export default function HomePage() {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data } = await eventAPI.getAll({ search, page, limit: 12 });
      setEvents(data.data);
      setTotalPages(data.totalPages);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [page]);
  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchEvents(); };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ color: '#1F3864', marginBottom: 8 }}>Khám phá Sự kiện</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>Tìm kiếm và đăng ký tham gia các sự kiện hấp dẫn</p>

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
        <p style={{ textAlign: 'center', color: '#888' }}>Không tìm thấy sự kiện nào.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {events.map(ev => (
            <div key={ev._id} style={card}>
              <img
                src={ev.bannerUrl || 'https://via.placeholder.com/400x200?text=Event'}
                alt={ev.title}
                style={{ width: '100%', height: 180, objectFit: 'cover' }}
              />
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
                  <span style={{ fontSize: 12, color: ev.availableTickets > 0 ? '#888' : '#e74c3c' }}>
                    {ev.availableTickets > 0 ? `Còn ${ev.availableTickets} vé` : 'Hết vé'}
                  </span>
                </div>
                <Link to={`/events/${ev._id}`} style={{
                  display: 'block', textAlign: 'center', marginTop: 12,
                  background: '#1F3864', color: '#fff', textDecoration: 'none',
                  borderRadius: 8, padding: '8px 0', fontSize: 14, fontWeight: 'bold'
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
              style={{ background: page === i + 1 ? '#2E75B6' : '#fff', color: page === i + 1 ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
