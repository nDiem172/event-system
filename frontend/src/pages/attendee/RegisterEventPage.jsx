import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventAPI, ticketAPI, paymentAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const MAX_TICKETS = 4;

export default function RegisterEventPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [myTicketCount, setMyTicketCount] = useState(0);
  const [selectedType, setSelectedType] = useState('');
  const [coversAll, setCoversAll] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', occupation: '' });

  useEffect(() => {
    Promise.all([eventAPI.getById(id), ticketAPI.getMyTickets()])
      .then(([evRes, ticketsRes]) => {
        const ev = evRes.data.data;
        setEvent(ev);
        const count = (ticketsRes.data.data || []).filter(
          (t) => t.eventId?._id === id && ['Pending', 'Valid', 'Checked-in', 'Refund-Pending'].includes(t.status),
        ).length;
        setMyTicketCount(count);
        if (ev.ticketTypes?.length > 0) {
          const first = ev.ticketTypes[0];
          setSelectedType(first.name);
          setCoversAll(Boolean(first.coversAllSessions));
        }
        setForm((f) => ({
          ...f,
          fullName: user?.fullName || '',
          email: user?.email || '',
          phone: user?.phone || '',
        }));
      });
  }, [id, user]);

  const inp = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #ccc',
    marginBottom: 14,
    fontSize: 14,
    boxSizing: 'border-box',
  };

  const toggleSession = (sessionId) => {
    const sid = String(sessionId);
    setCoversAll(false);
    setSelectedSessionIds((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid],
    );
  };

  const handleTypeChange = (name) => {
    setSelectedType(name);
    const t = event?.ticketTypes?.find((x) => x.name === name);
    if (t?.coversAllSessions) {
      setCoversAll(true);
      setSelectedSessionIds((event.sessions || []).map((s) => String(s._id)));
    } else {
      setCoversAll(false);
      setSelectedSessionIds([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) {
      toast.error('Vui lòng đồng ý với quy định sự kiện');
      return;
    }
    if (myTicketCount >= MAX_TICKETS) {
      toast.error(`Bạn đã có tối đa ${MAX_TICKETS} vé cho sự kiện này.`);
      return;
    }
    if (!coversAll && selectedSessionIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một phiên.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await ticketAPI.register({
        eventId: id,
        ticketType: selectedType,
        attendeeInfo: form,
        coversAllSessions: coversAll,
        sessionIds: coversAll ? undefined : selectedSessionIds,
      });
      const ticket = data.data;
      if (ticket.status === 'Valid') {
        toast.success('Đăng ký thành công! Kiểm tra email để nhận vé.');
        navigate('/my-tickets');
      } else {
        const { data: pd } = await paymentAPI.createVNPay(ticket.ticketId || ticket._id);
        window.location.href = pd.paymentUrl;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi đăng ký');
    }
    setLoading(false);
  };

  if (!event) return <p style={{ textAlign: 'center', padding: 60 }}>Đang tải...</p>;

  const now = new Date();
  const isEnded = new Date(event.endTime) <= now;
  const isStarted = new Date(event.startTime) <= now;
  if (isEnded) return <p style={{ textAlign: 'center', padding: 60, color: '#888' }}>Sự kiện đã kết thúc, không thể đăng ký.</p>;
  if (isStarted) return <p style={{ textAlign: 'center', padding: 60, color: '#e67e22' }}>Sự kiện đã bắt đầu, không thể đăng ký.</p>;

  const tType = event.ticketTypes?.find((t) => t.name === selectedType);
  const slotsLeft = MAX_TICKETS - myTicketCount;

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 36, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#1F3864', marginBottom: 4 }}>Đăng ký tham gia</h2>
        <p style={{ color: '#666', marginBottom: 8 }}>{event.title}</p>
        <p style={{ color: '#2E75B6', fontSize: 13, marginBottom: 24 }}>
          Bạn đã có {myTicketCount}/{MAX_TICKETS} vé · Còn đăng ký thêm được {slotsLeft} vé
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 14, color: '#555', fontWeight: 'bold' }}>Loại vé</label>
          <select
            value={selectedType}
            onChange={(e) => handleTypeChange(e.target.value)}
            style={{ ...inp, marginTop: 6 }}
          >
            {event.ticketTypes?.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name} — {t.price === 0 ? 'Miễn phí' : `${t.price.toLocaleString('vi-VN')} đ`}
                {t.coversAllSessions ? ' (Trọn tất cả phiên)' : ''}
              </option>
            ))}
          </select>

          {(event.sessions || []).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 14, color: '#555', fontWeight: 'bold', display: 'block', marginBottom: 8 }}>
                Chọn phiên tham dự *
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={coversAll}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setCoversAll(checked);
                    if (checked) {
                      setSelectedSessionIds((event.sessions || []).map((s) => String(s._id)));
                    }
                  }}
                />
                <span style={{ fontSize: 14 }}>Trọn gói — tất cả phiên ({event.sessions.length} ngày)</span>
              </label>
              {!coversAll &&
                event.sessions.map((s, i) => (
                  <label
                    key={s._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      marginBottom: 6,
                      background: '#F5F7FA',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSessionIds.includes(String(s._id))}
                      onChange={() => toggleSession(s._id)}
                    />
                    <span style={{ fontSize: 13 }}>
                      Phiên {i + 1} · {new Date(s.date).toLocaleDateString('vi-VN')} · {s.startCheckIn}–{s.endCheckIn}
                    </span>
                  </label>
                ))}
            </div>
          )}

          {[
            { label: 'Họ và tên *', key: 'fullName', type: 'text' },
            { label: 'Email *', key: 'email', type: 'email' },
            { label: 'Số điện thoại *', key: 'phone', type: 'tel' },
            { label: 'Nghề nghiệp', key: 'occupation', type: 'text' },
          ].map((f) => (
            <div key={f.key}>
              <label style={{ fontSize: 14, color: '#555', fontWeight: 'bold' }}>{f.label}</label>
              <input
                style={{ ...inp, marginTop: 6 }}
                type={f.type}
                required={f.label.includes('*')}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            </div>
          ))}

          {event.policies?.terms && (
            <div style={{ background: '#F5F7FA', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13, color: '#555' }}>
              <strong>Quy định sự kiện:</strong>
              <br />
              {event.policies.terms}
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span style={{ fontSize: 14 }}>Tôi đồng ý với quy định và chính sách sự kiện</span>
          </label>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 0',
              borderTop: '1px solid #eee',
              marginBottom: 16,
            }}
          >
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>Tổng thanh toán:</span>
            <span style={{ fontWeight: 'bold', fontSize: 20, color: tType?.price === 0 ? '#27ae60' : '#1F3864' }}>
              {tType?.price === 0 ? 'Miễn phí' : `${tType?.price?.toLocaleString('vi-VN')} đ`}
            </span>
          </div>

          <button
            type="submit"
            disabled={loading || slotsLeft <= 0}
            style={{
              width: '100%',
              background: slotsLeft <= 0 ? '#aaa' : '#1F3864',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: 14,
              fontSize: 16,
              cursor: slotsLeft <= 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {loading ? 'Đang xử lý...' : slotsLeft <= 0 ? 'Đã đủ 4 vé' : tType?.price === 0 ? '🎫 Xác nhận đăng ký' : '💳 Tiếp tục thanh toán'}
          </button>
        </form>
      </div>
    </div>
  );
}
