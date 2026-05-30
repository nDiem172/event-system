import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { creatorAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const inp = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #ccc', marginBottom: 16, fontSize: 14, boxSizing: 'border-box' };
const lbl = { display: 'block', fontSize: 13, color: '#555', fontWeight: 'bold', marginBottom: 6 };

export default function EventFormPage() {
  const { id } = useParams(); // id = edit mode
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    title: '', description: '', location: '', category: 'Hội thảo',
    startTime: '', endTime: '', bannerUrl: '', totalTickets: 100,
    ticketTypes: [{ name: 'Vé thường', price: 0, quantity: 100, available: 100, coversAllSessions: false }],
    sessions: [{ date: '', startCheckIn: '08:00', endCheckIn: '18:00' }],
    registrationDeadline: '',
    policies: { terms: '', minAge: 0, refundPercentage: 100, cancelDeadlineHours: 24 },
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      creatorAPI.getMyEvents().then(({ data }) => {
        const ev = data.data.find(e => e._id === id);
        if (ev) {
          setForm({
            title: ev.title, description: ev.description, location: ev.location,
            category: ev.category, bannerUrl: ev.bannerUrl || '',
            startTime: ev.startTime?.slice(0, 16), endTime: ev.endTime?.slice(0, 16),
            registrationDeadline: ev.registrationDeadline?.slice(0, 16),
            totalTickets: ev.totalTickets,
            ticketTypes: ev.ticketTypes?.length ? ev.ticketTypes : [{ name: 'Vé thường', price: 0, quantity: 100, available: 100, coversAllSessions: false }],
            sessions: ev.sessions?.length
              ? ev.sessions.map((s) => ({
                  date: s.date?.slice(0, 10),
                  startCheckIn: s.startCheckIn || '08:00',
                  endCheckIn: s.endCheckIn || '18:00',
                }))
              : [{ date: ev.startTime?.slice(0, 10) || '', startCheckIn: '08:00', endCheckIn: '18:00' }],
            policies: ev.policies,
          });
        }
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setPol = (k) => (e) => setForm({ ...form, policies: { ...form.policies, [k]: e.target.value } });

  const updateTicketType = (idx, key, val) => {
    const types = [...form.ticketTypes];
    types[idx] = {
      ...types[idx],
      [key]: key === 'price' || key === 'quantity' ? Number(val) : key === 'coversAllSessions' ? Boolean(val) : val,
    };
    if (key === 'quantity') types[idx].available = Number(val);
    setForm({ ...form, ticketTypes: types });
  };

  const addTicketType = () => setForm({ ...form, ticketTypes: [...form.ticketTypes, { name: 'Loại vé mới', price: 0, quantity: 50, available: 50, coversAllSessions: false }] });
  const updateSession = (idx, key, val) => {
    const sessions = [...form.sessions];
    sessions[idx] = { ...sessions[idx], [key]: val };
    setForm({ ...form, sessions });
  };
  const addSession = () => setForm({ ...form, sessions: [...form.sessions, { date: '', startCheckIn: '08:00', endCheckIn: '18:00' }] });
  const removeSession = (idx) => setForm({ ...form, sessions: form.sessions.filter((_, i) => i !== idx) });
  const removeTicketType = (idx) => setForm({ ...form, ticketTypes: form.ticketTypes.filter((_, i) => i !== idx) });

  const handleSave = async (submit = false) => {
    if (!form.title || !form.startTime || !form.endTime || !form.location) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc'); return;
    }
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      toast.error('Thời gian kết thúc phải sau thời gian bắt đầu'); return;
    }
    setSubmitting(true);
    try {
      const total = form.ticketTypes.reduce((s, t) => s + t.quantity, 0);
      const payload = {
        ...form,
        totalTickets: total,
        availableTickets: total,
        sessions: form.sessions.filter((s) => s.date),
      };
      if (isEdit) {
        await creatorAPI.update(id, payload);
        if (submit) { await creatorAPI.submit(id); toast.success('Đã gửi yêu cầu phê duyệt!'); }
        else toast.success('Đã lưu nháp!');
      } else {
        const { data } = await creatorAPI.create(payload);
        if (submit) { await creatorAPI.submit(data.data._id); toast.success('Đã gửi yêu cầu phê duyệt!'); }
        else toast.success('Đã lưu nháp!');
      }
      navigate('/creator/events');
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi lưu sự kiện'); }
    setSubmitting(false);
  };

  if (loading) return <p style={{ textAlign: 'center', padding: 60 }}>Đang tải...</p>;

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <h2 style={{ color: '#1F3864', marginBottom: 24 }}>{isEdit ? '✏️ Chỉnh sửa sự kiện' : '➕ Tạo sự kiện mới'}</h2>

      <div style={{ background: '#fff', borderRadius: 14, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 20 }}>
        <h3 style={{ color: '#2E75B6', marginBottom: 20 }}>Thông tin cơ bản</h3>
        <label style={lbl}>Tên sự kiện *</label>
        <input style={inp} value={form.title} onChange={set('title')} placeholder="Nhập tên sự kiện" required />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={lbl}>Thời gian bắt đầu *</label>
            <input style={inp} type="datetime-local" value={form.startTime} onChange={set('startTime')} />
          </div>
          <div>
            <label style={lbl}>Thời gian kết thúc *</label>
            <input style={inp} type="datetime-local" value={form.endTime} onChange={set('endTime')} />
          </div>
        </div>

        <label style={lbl}>Địa điểm *</label>
        <input style={inp} value={form.location} onChange={set('location')} placeholder="Địa điểm tổ chức" />

        <label style={lbl}>Loại hình</label>
        <select style={inp} value={form.category} onChange={set('category')}>
          {['Hội thảo', 'Workshop', 'Concert', 'Triển lãm', 'Thể thao', 'Khác'].map(c => <option key={c}>{c}</option>)}
        </select>

        <label style={lbl}>URL Banner (hình ảnh)</label>
        <input style={inp} value={form.bannerUrl} onChange={set('bannerUrl')} placeholder="https://..." />
        {form.bannerUrl && <img src={form.bannerUrl} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 16 }} />}

        <label style={lbl}>Mô tả sự kiện *</label>
        <textarea style={{ ...inp, minHeight: 120, resize: 'vertical' }} value={form.description} onChange={set('description')} placeholder="Mô tả chi tiết về sự kiện..." />
      </div>

      {/* Sessions (phiên check-in theo ngày) */}
      <div style={{ background: '#fff', borderRadius: 14, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ color: '#2E75B6', margin: 0 }}>📅 Phiên sự kiện (check-in theo ngày)</h3>
          <button type="button" onClick={addSession} style={{ background: '#2E75B6', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13 }}>
            + Thêm phiên
          </button>
        </div>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>VD: sự kiện 3 ngày → tạo 3 phiên (ngày 1, 2, 3). Attendee chọn phiên khi đăng ký.</p>
        {form.sessions.map((s, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: 12, marginBottom: 12, padding: 14, background: '#F5F7FA', borderRadius: 10 }}>
            <div>
              <label style={{ ...lbl, marginBottom: 4 }}>Ngày phiên *</label>
              <input style={{ ...inp, marginBottom: 0 }} type="date" value={s.date} onChange={(e) => updateSession(i, 'date', e.target.value)} />
            </div>
            <div>
              <label style={{ ...lbl, marginBottom: 4 }}>Mở cổng</label>
              <input style={{ ...inp, marginBottom: 0 }} type="time" value={s.startCheckIn} onChange={(e) => updateSession(i, 'startCheckIn', e.target.value)} />
            </div>
            <div>
              <label style={{ ...lbl, marginBottom: 4 }}>Đóng cổng</label>
              <input style={{ ...inp, marginBottom: 0 }} type="time" value={s.endCheckIn} onChange={(e) => updateSession(i, 'endCheckIn', e.target.value)} />
            </div>
            <button type="button" onClick={() => removeSession(i)} disabled={form.sessions.length === 1}
              style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', alignSelf: 'end' }}>
              🗑️
            </button>
          </div>
        ))}
      </div>

      {/* Ticket Types */}
      <div style={{ background: '#fff', borderRadius: 14, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,08)', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: '#2E75B6', margin: 0 }}>🎟️ Loại vé</h3>
          <button onClick={addTicketType} style={{ background: '#2E75B6', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13 }}>
            + Thêm loại vé
          </button>
        </div>
        {form.ticketTypes.map((t, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 12, padding: 16, background: '#F5F7FA', borderRadius: 10 }}>
            <div>
              <label style={{ ...lbl, marginBottom: 4 }}>Tên loại vé</label>
              <input style={{ ...inp, marginBottom: 0 }} value={t.name} onChange={e => updateTicketType(i, 'name', e.target.value)} />
            </div>
            <div>
              <label style={{ ...lbl, marginBottom: 4 }}>Giá (đ) — 0 = miễn phí</label>
              <input style={{ ...inp, marginBottom: 0 }} type="number" min={0} value={t.price} onChange={e => updateTicketType(i, 'price', e.target.value)} />
            </div>
            <div>
              <label style={{ ...lbl, marginBottom: 4 }}>Số lượng</label>
              <input style={{ ...inp, marginBottom: 0 }} type="number" min={1} value={t.quantity} onChange={e => updateTicketType(i, 'quantity', e.target.value)} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={Boolean(t.coversAllSessions)} onChange={(e) => updateTicketType(i, 'coversAllSessions', e.target.checked)} />
              Trọn tất cả phiên
            </label>
            <button onClick={() => removeTicketType(i)} disabled={form.ticketTypes.length === 1}
              style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', height: 42 }}>
              🗑️
            </button>
          </div>
        ))}
      </div>

      {/* Policies */}
      <div style={{ background: '#fff', borderRadius: 14, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 24 }}>
        <h3 style={{ color: '#2E75B6', marginBottom: 20 }}>📋 Chính sách sự kiện</h3>
        <label style={lbl}>Quy định tham gia (Điều khoản)</label>
        <textarea style={{ ...inp, minHeight: 100, resize: 'vertical' }} value={form.policies.terms} onChange={setPol('terms')} placeholder="Nội dung quy định..." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <label style={lbl}>Độ tuổi tối thiểu</label>
            <input style={inp} type="number" min={0} value={form.policies.minAge} onChange={setPol('minAge')} />
          </div>
          <div>
            <label style={lbl}>Tỷ lệ hoàn tiền (%)</label>
            <input style={inp} type="number" min={0} max={100} value={form.policies.refundPercentage} onChange={setPol('refundPercentage')} />
          </div>
          <div>
            <label style={lbl}>Hủy trước (giờ)</label>
            <input style={inp} type="number" min={0} value={form.policies.cancelDeadlineHours} onChange={setPol('cancelDeadlineHours')} />
          </div>
          <div>
            <label style={lbl}>Hạn chót đăng ký *</label>
            <input style={inp} type="date" value={form.registrationDeadline} onChange={set('registrationDeadline')} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end' }}>
        <button onClick={() => navigate('/creator/events')}
          style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 8, padding: '12px 24px', cursor: 'pointer', fontSize: 15 }}>
          Hủy
        </button>
        <button onClick={() => handleSave(false)} disabled={submitting}
          style={{ background: '#7f8c8d', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', cursor: 'pointer', fontSize: 15, fontWeight: 'bold' }}>
          💾 Lưu nháp
        </button>
        <button onClick={() => handleSave(true)} disabled={submitting}
          style={{ background: '#1F3864', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', cursor: 'pointer', fontSize: 15, fontWeight: 'bold' }}>
          {submitting ? 'Đang gửi...' : '🚀 Gửi phê duyệt'}
        </button>
      </div>
    </div>
  );
}
