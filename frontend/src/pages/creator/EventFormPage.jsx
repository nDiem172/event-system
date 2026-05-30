import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { creatorAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const inp = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid #ccc', marginBottom: 16, fontSize: 14, boxSizing: 'border-box',
};
const lbl = { display: 'block', fontSize: 13, color: '#555', fontWeight: 'bold', marginBottom: 6 };

const card = {
  background: '#fff', borderRadius: 14, padding: 32,
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 20,
};

export default function EventFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    title: '', description: '', location: '', category: 'Hội thảo',
    startTime: '', endTime: '', bannerUrl: '',
    ticketTypes: [{ name: 'Vé thường', price: 0, quantity: 100, available: 100, coversAllSessions: false }],
    sessions: [{ date: '', startCheckIn: '08:00', endCheckIn: '18:00' }],
    registrationDeadline: '',
    policies: { terms: '', minAge: 0, refundPercentage: 100, cancelDeadlineHours: 24 },
  });
  const [loading, setLoading]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    creatorAPI.getMyEvents().then(({ data }) => {
      const ev = data.data.find((e) => e._id === id);
      if (!ev) return;
      setForm({
        title:       ev.title,
        description: ev.description,
        location:    ev.location,
        category:    ev.category,
        bannerUrl:   ev.bannerUrl || '',
        startTime:   ev.startTime?.slice(0, 16) || '',
        endTime:     ev.endTime?.slice(0, 16) || '',
        // FIX 3: slice(0,10) thay vì slice(0,16) cho type="date"
        registrationDeadline: ev.registrationDeadline
          ? new Date(ev.registrationDeadline).toISOString().slice(0, 10)
          : '',
        ticketTypes: ev.ticketTypes?.length
          ? ev.ticketTypes
          : [{ name: 'Vé thường', price: 0, quantity: 100, available: 100, coversAllSessions: false }],
        sessions: ev.sessions?.length
          ? ev.sessions.map((s) => ({
              date:          s.date?.slice(0, 10) || '',
              startCheckIn:  s.startCheckIn || '08:00',
              endCheckIn:    s.endCheckIn || '18:00',
            }))
          : [{ date: ev.startTime?.slice(0, 10) || '', startCheckIn: '08:00', endCheckIn: '18:00' }],
        policies: ev.policies || { terms: '', minAge: 0, refundPercentage: 100, cancelDeadlineHours: 24 },
      });
    }).finally(() => setLoading(false));
  }, [id]);

const set = (k) => (e) => {
  const val = e.target.value;
  const updated = { ...form, [k]: val };

  // Khi điền startTime → tự điền ngày cho phiên 1 nếu chưa có
  if (k === 'startTime' && val) {
    const dateOnly = val.slice(0, 10); // "2026-06-02"
    const sessions = [...updated.sessions];
    if (!sessions[0].date) {
      sessions[0] = { ...sessions[0], date: dateOnly };
      updated.sessions = sessions;
    }
  }

  setForm(updated);
};
  const setPol = (k) => (e) => setForm({ ...form, policies: { ...form.policies, [k]: e.target.value } });

  // ── Session helpers ──────────────────────────────────────
  const updateSession   = (idx, key, val) => {
    const sessions = [...form.sessions];
    sessions[idx] = { ...sessions[idx], [key]: val };
    setForm({ ...form, sessions });
  };
  const addSession    = () => setForm({ ...form, sessions: [...form.sessions, { date: '', startCheckIn: '08:00', endCheckIn: '18:00' }] });
  const removeSession = (idx) => setForm({ ...form, sessions: form.sessions.filter((_, i) => i !== idx) });

  // ── TicketType helpers ───────────────────────────────────
  const updateTicketType = (idx, key, val) => {
    const types = [...form.ticketTypes];
    types[idx] = {
      ...types[idx],
      [key]: key === 'price' || key === 'quantity'
        ? Number(val)
        : key === 'coversAllSessions'
          ? Boolean(val)
          : val,
    };
    if (key === 'quantity') types[idx].available = Number(val);
    setForm({ ...form, ticketTypes: types });
  };
  const addTicketType    = () => setForm({ ...form, ticketTypes: [...form.ticketTypes, { name: 'Loại vé mới', price: 0, quantity: 50, available: 50, coversAllSessions: false }] });
  const removeTicketType = (idx) => setForm({ ...form, ticketTypes: form.ticketTypes.filter((_, i) => i !== idx) });

  // ── Save / Submit ────────────────────────────────────────
  const handleSave = async (submit = false) => {
    if (!form.title || !form.startTime || !form.endTime || !form.location) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc'); return;
    }
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      toast.error('Thời gian kết thúc phải sau thời gian bắt đầu'); return;
    }
    if (!form.registrationDeadline) {
      toast.error('Vui lòng chọn hạn chót đăng ký'); return;
    }
    const validSessions = form.sessions.filter((s) => s.date);
    if (validSessions.length === 0) {
      toast.error('Vui lòng thêm ít nhất một phiên sự kiện'); return;
    }

    setSubmitting(true);
    try {
      const total = form.ticketTypes.reduce((s, t) => s + t.quantity, 0);
      const payload = {
        ...form,
        totalTickets:     total,
        availableTickets: total,
        sessions:         validSessions,
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
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi lưu sự kiện');
    }
    setSubmitting(false);
  };

  if (loading) return <p style={{ textAlign: 'center', padding: 60 }}>Đang tải...</p>;

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <h2 style={{ color: '#1F3864', marginBottom: 24 }}>
        {isEdit ? '✏️ Chỉnh sửa sự kiện' : '➕ Tạo sự kiện mới'}
      </h2>

      {/* ── THÔNG TIN CƠ BẢN ── */}
      <div style={card}>
        <h3 style={{ color: '#2E75B6', marginBottom: 20 }}>Thông tin cơ bản</h3>

        <label style={lbl}>Tên sự kiện *</label>
        <input style={inp} value={form.title} onChange={set('title')} placeholder="Nhập tên sự kiện" />

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
          {['Hội thảo', 'Workshop', 'Concert', 'Triển lãm', 'Thể thao', 'Khác'].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <label style={lbl}>URL Banner (hình ảnh)</label>
        <input style={inp} value={form.bannerUrl} onChange={set('bannerUrl')} placeholder="https://..." />
        {form.bannerUrl && (
          <img src={form.bannerUrl} alt="preview"
            style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 16 }} />
        )}

        <label style={lbl}>Mô tả sự kiện *</label>
        <textarea style={{ ...inp, minHeight: 120, resize: 'vertical' }}
          value={form.description} onChange={set('description')}
          placeholder="Mô tả chi tiết về sự kiện..." />
      </div>

      {/* ── PHIÊN SỰ KIỆN ── */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ color: '#2E75B6', margin: 0 }}>📅 Phiên sự kiện</h3>
          <button type="button" onClick={addSession}
            style={{ background: '#2E75B6', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13 }}>
            + Thêm phiên
          </button>
        </div>
        {/* <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
          Sự kiện <strong>1 ngày</strong> → 1 phiên. Sự kiện <strong>nhiều ngày</strong> → mỗi ngày 1 phiên.
          Người đăng ký sẽ chọn phiên nào họ tham dự.
        </p> */}

        {form.sessions.map((s, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto',
            gap: 12, marginBottom: 12, padding: 14, background: '#F5F7FA', borderRadius: 10,
          }}>
            <div>
              <label style={{ ...lbl, marginBottom: 4 }}>Ngày phiên {i + 1} *</label>
              <input style={{ ...inp, marginBottom: 0 }} type="date"
                value={s.date} onChange={(e) => updateSession(i, 'date', e.target.value)} />
            </div>
            <div>
              <label style={{ ...lbl, marginBottom: 4 }}>Mở cổng</label>
              <input style={{ ...inp, marginBottom: 0 }} type="time"
                value={s.startCheckIn} onChange={(e) => updateSession(i, 'startCheckIn', e.target.value)} />
            </div>
            <div>
              <label style={{ ...lbl, marginBottom: 4 }}>Đóng cổng</label>
              <input style={{ ...inp, marginBottom: 0 }} type="time"
                value={s.endCheckIn} onChange={(e) => updateSession(i, 'endCheckIn', e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="button" onClick={() => removeSession(i)}
                disabled={form.sessions.length === 1}
                style={{
                  background: form.sessions.length === 1 ? '#ccc' : '#e74c3c',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '10px 14px', cursor: form.sessions.length === 1 ? 'not-allowed' : 'pointer',
                }}>
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── LOẠI VÉ ── */}
      {/* FIX 1: tách checkbox "Trọn tất cả phiên" ra hàng riêng, không nhét vào grid */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ color: '#2E75B6', margin: 0 }}>🎟️ Loại vé</h3>
          <button type="button" onClick={addTicketType}
            style={{ background: '#2E75B6', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', fontSize: 13 }}>
            + Thêm loại vé
          </button>
        </div>

        {form.ticketTypes.map((t, i) => (
          <div key={i} style={{ marginBottom: 16, padding: 16, background: '#F5F7FA', borderRadius: 10 }}>
            {/* Hàng 1: tên, giá, số lượng, nút xóa */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>Tên loại vé</label>
                <input style={{ ...inp, marginBottom: 0 }} value={t.name}
                  onChange={(e) => updateTicketType(i, 'name', e.target.value)} />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>Giá (đ) — 0 = miễn phí</label>
                <input style={{ ...inp, marginBottom: 0 }} type="number" min={0} value={t.price}
                  onChange={(e) => updateTicketType(i, 'price', e.target.value)} />
              </div>
              <div>
                <label style={{ ...lbl, marginBottom: 4 }}>Số lượng</label>
                <input style={{ ...inp, marginBottom: 0 }} type="number" min={1} value={t.quantity}
                  onChange={(e) => updateTicketType(i, 'quantity', e.target.value)} />
              </div>
              <button type="button" onClick={() => removeTicketType(i)}
                disabled={form.ticketTypes.length === 1}
                style={{
                  background: form.ticketTypes.length === 1 ? '#ccc' : '#e74c3c',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '10px 14px', cursor: form.ticketTypes.length === 1 ? 'not-allowed' : 'pointer', height: 42,
                }}>
                🗑️
              </button>
            </div>

            {/* Hàng 2: checkbox trọn phiên — nằm riêng, không trong grid */}
            {form.sessions.length > 1 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer', fontSize: 13, color: '#555' }}>
                <input type="checkbox" checked={Boolean(t.coversAllSessions)}
                  onChange={(e) => updateTicketType(i, 'coversAllSessions', e.target.checked)} />
                <span>
                  Vé này bao gồm <strong>tất cả {form.sessions.length} phiên</strong>
                  {' '}(người đăng ký không cần chọn phiên riêng lẻ)
                </span>
              </label>
            )}
          </div>
        ))}
      </div>

      {/* ── CHÍNH SÁCH ── */}
      {/* FIX 2: tách "Hạn chót đăng ký" ra hàng riêng, không nhét vào grid 3 cột */}
      <div style={card}>
        <h3 style={{ color: '#2E75B6', marginBottom: 20 }}>📋 Chính sách sự kiện</h3>

        <label style={lbl}>Quy định tham gia (Điều khoản)</label>
        <textarea style={{ ...inp, minHeight: 100, resize: 'vertical' }}
          value={form.policies.terms} onChange={setPol('terms')}
          placeholder="Nội dung quy định..." />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
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
        </div>

        {/* Hạn chót đăng ký — hàng riêng, rõ ràng */}
        <div style={{ background: '#FFF8E1', border: '1px solid #F9CA24', borderRadius: 10, padding: '14px 16px' }}>
          <label style={{ ...lbl, color: '#856404', marginBottom: 8 }}>
            📌 Hạn chót đăng ký *
          </label>
          <p style={{ fontSize: 12, color: '#856404', margin: '0 0 10px' }}>
            Sau ngày này hệ thống tự động đóng cổng đăng ký (tính đến hết 23:59 ngày được chọn).
          </p>
          <input
            style={{ ...inp, marginBottom: 0, maxWidth: 240, background: '#fff' }}
            type="date"
            value={form.registrationDeadline}
            onChange={set('registrationDeadline')}
          />
        </div>
      </div>

      {/* ── ACTIONS ── */}
      <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end', paddingBottom: 40 }}>
        <button type="button" onClick={() => navigate('/creator/events')}
          style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 8, padding: '12px 24px', cursor: 'pointer', fontSize: 15 }}>
          Hủy
        </button>
        <button type="button" onClick={() => handleSave(false)} disabled={submitting}
          style={{ background: '#7f8c8d', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', cursor: 'pointer', fontSize: 15, fontWeight: 'bold' }}>
          💾 Lưu nháp
        </button>
        <button type="button" onClick={() => handleSave(true)} disabled={submitting}
          style={{ background: '#1F3864', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', cursor: 'pointer', fontSize: 15, fontWeight: 'bold' }}>
          {submitting ? 'Đang gửi...' : '🚀 Gửi phê duyệt'}
        </button>
      </div>
    </div>
  );
}