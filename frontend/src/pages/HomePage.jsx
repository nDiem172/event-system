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
        <div style={{ textAlign: 'center', color: '#667085', background: '#fff', border: '1px solid rgba(31,56,100,0.10)', borderRadius: 16, padding: 28 }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🔎</div>
          <div style={{ fontWeight: 800, color: '#1F3864' }}>Không có sự kiện phù hợp</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {events.map(ev => {
            const now = new Date();
            const start = new Date(ev.startTime);
            const end = new Date(ev.endTime);
            const isHappening = now >= start && now <= end;
            const isEnded = now > end;

            return (
              <div key={ev._id} style={cardBase}>
                <div style={{ position: 'relative' }}>
                  <img src={ev.bannerUrl || 'https://via.placeholder.com/400x200?text=Event'} alt={ev.title} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                  
                  {/* Badge trạng thái mới */}
                  {isHappening && (
                    <div style={{ position: 'absolute', top: 12, left: 12, padding: '6px 10px', borderRadius: 999, background: '#e67e22', color: '#fff', fontSize: 12, fontWeight: 800, backdropFilter: 'blur(6px)' }}>
                      Đang diễn ra
                    </div>
                  )}
                  {scope === 'past' || isEnded ? (
                    <div style={{ position: 'absolute', top: 12, left: 12, padding: '6px 10px', borderRadius: 999, background: 'rgba(17,24,39,0.72)', color: '#fff', fontSize: 12, fontWeight: 800, backdropFilter: 'blur(6px)' }}>
                      Đã kết thúc
                    </div>
                  ) : null}
                </div>
                
                <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: '0 0 8px', color: '#1F3864', fontSize: 16 }}>{ev.title}</h3>
                  <p style={{ margin: '0 0 4px', color: '#666', fontSize: 13 }}>📅 {new Date(ev.startTime).toLocaleDateString('vi-VN')}</p>
                  <p style={{ margin: '0 0 12px', color: '#666', fontSize: 13 }}>📍 {ev.location}</p>
                  <Link to={`/events/${ev._id}`} style={{ display: 'block', textAlign: 'center', marginTop: 'auto', background: '#1F3864', color: '#fff', textDecoration: 'none', borderRadius: 12, padding: '10px 0', fontSize: 14, fontWeight: 900 }}>
                    Xem chi tiết →
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