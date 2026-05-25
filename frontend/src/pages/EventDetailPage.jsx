import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { eventAPI, waitingAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const btn = (bg) => ({ background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', cursor: 'pointer', fontSize: 16, fontWeight: 'bold', width: '100%', marginBottom: 10 });

export default function EventDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventAPI.getById(id)
      .then(({ data }) => setEvent(data.data))
      .catch(() => toast.error('Không tìm thấy sự kiện'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleJoinWaitlist = async () => {
    if (!user) return navigate('/login');
    try {
      const { data } = await waitingAPI.join(id);
      toast.success(data.message);
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  if (loading) return <p style={{ textAlign: 'center', padding: 60 }}>Đang tải...</p>;
  if (!event)  return <p style={{ textAlign: 'center', padding: 60 }}>Không tìm thấy sự kiện.</p>;

  const now = new Date();
  const isEnded = new Date(event.endTime) <= now;
  const isStarted = new Date(event.startTime) <= now;
  const isFree    = event.ticketTypes?.[0]?.price === 0;
  const hasTicket = event.availableTickets > 0;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px' }}>
      <img src={event.bannerUrl || 'https://via.placeholder.com/1000x350?text=Event'} alt={event.title}
        style={{ width: '100%', borderRadius: 14, maxHeight: 360, objectFit: 'cover', marginBottom: 28 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32 }}>
        {/* Left */}
        <div>
          <h1 style={{ color: '#1F3864', marginBottom: 16 }}>{event.title}</h1>
          <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
            <div>
              <div style={{ color: '#888', fontSize: 12 }}>THỜI GIAN BẮT ĐẦU</div>
              <div style={{ fontWeight: 'bold', color: '#1F3864' }}>
                {new Date(event.startTime).toLocaleString('vi-VN')}
              </div>
            </div>
            <div>
              <div style={{ color: '#888', fontSize: 12 }}>THỜI GIAN KẾT THÚC</div>
              <div style={{ fontWeight: 'bold', color: '#1F3864' }}>
                {new Date(event.endTime).toLocaleString('vi-VN')}
              </div>
            </div>
          </div>
          <p style={{ marginBottom: 12 }}>📍 <strong>{event.location}</strong></p>
          <hr style={{ margin: '20px 0', borderColor: '#e0e0e0' }} />
          <h3 style={{ color: '#1F3864' }}>Mô tả sự kiện</h3>
          <p style={{ color: '#444', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{event.description}</p>

          {event.policies?.terms && (
            <>
              <h3 style={{ color: '#1F3864', marginTop: 24 }}>Quy định tham gia</h3>
              <p style={{ color: '#444', lineHeight: 1.7 }}>{event.policies.terms}</p>
            </>
          )}
        </div>

        {/* Right — ticket box */}
        <div>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', position: 'sticky', top: 20 }}>
            <h3 style={{ color: '#1F3864', marginBottom: 16 }}>Thông tin vé</h3>
            {event.ticketTypes?.map(t => (
              <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 15 }}>
                <span>{t.name}</span>
                <strong style={{ color: t.price === 0 ? '#27ae60' : '#2E75B6' }}>
                  {t.price === 0 ? 'Miễn phí' : `${t.price.toLocaleString('vi-VN')} đ`}
                </strong>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #eee', margin: '16px 0' }} />
            {isEnded ? (
              <p style={{ fontSize: 13, color: '#888', fontWeight: 'bold', marginBottom: 16 }}>⏱️ Sự kiện đã kết thúc</p>
            ) : isStarted ? (
              <p style={{ fontSize: 13, color: '#e67e22', fontWeight: 'bold', marginBottom: 16 }}>⏱️ Sự kiện đã bắt đầu</p>
            ) : (
              <p style={{ fontSize: 13, color: hasTicket ? '#27ae60' : '#e74c3c', fontWeight: 'bold', marginBottom: 16 }}>
                {hasTicket ? `✅ Còn ${event.availableTickets} vé` : '❌ Đã hết vé'}
              </p>
            )}

            {!isEnded && !isStarted && hasTicket ? (
              user ? (
                user.role === 'Attendee' ? (
                  <Link to={`/events/${id}/register`}>
                    <button style={btn('#1F3864')}>🎫 Đăng ký tham gia</button>
                  </Link>
                ) : (
                  <p style={{ color: '#888', fontSize: 13, textAlign: 'center' }}>Chỉ Người tham dự mới đăng ký được</p>
                )
              ) : (
                <Link to={`/login`} state={{ from: `/events/${id}/register` }}>
                  <button style={btn('#2E75B6')}>Đăng nhập để đăng ký</button>
                </Link>
              )
            ) : (
              !isEnded && !isStarted && user?.role === 'Attendee' && (
                <button onClick={handleJoinWaitlist} style={btn('#e67e22')}>
                  ⏳ Vào danh sách chờ
                </button>
              )
            )}

            {event.policies?.minAge > 0 && (
              <p style={{ fontSize: 12, color: '#888', textAlign: 'center' }}>
                ⚠️ Yêu cầu độ tuổi tối thiểu: {event.policies.minAge}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
