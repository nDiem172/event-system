import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_LABEL = {
  'Pending':        { label: 'Chờ thanh toán', color: '#e67e22' },
  'Valid':          { label: 'Hợp lệ',         color: '#27ae60' },
  'Checked-in':    { label: 'Đã check-in',     color: '#2E75B6' },
  'Canceled':      { label: 'Đã hủy',          color: '#e74c3c' },
  'Refund-Pending':{ label: 'Chờ hoàn tiền',   color: '#8e44ad' },
  'Refunded':      { label: 'Đã hoàn tiền',    color: '#7f8c8d' },
};

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // State quản lý mã QR động và thời gian đếm ngược
  const [dynamicQRUrl, setDynamicQRUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState(120); // Đếm ngược 120 giây (2 phút)

  const fetchTicket = () => {
    ticketAPI.getById(id)
      .then(({ data }) => {
        setTicket(data.data);
        setEditForm({ fullName: data.data.attendeeInfo.fullName, phone: data.data.attendeeInfo.phone });
        generateDynamicQR(data.data.ticketCode);
      })
      .catch(() => toast.error('Không tìm thấy vé'))
      .finally(() => setLoading(false));
  };

  // Hàm sinh mã QR có gắn kèm timestamp hết hạn (hiện tại + 2 phút)
  const generateDynamicQR = (code) => {
    if (!code) return;
    const expireTimestamp = Date.now() + 120 * 1000; // Thời gian hết hạn là 2 phút sau
    const qrText = encodeURIComponent(`${code}|${expireTimestamp}`);
    setDynamicQRUrl(`https://quickchart.io/qr?text=${qrText}&size=200`);
    setTimeLeft(120); // Reset đồng hồ về 120 giây
  };

  useEffect(() => { fetchTicket(); }, [id]);

  // Bộ đếm ngược giây và tự làm mới mã QR sau mỗi 2 phút
  useEffect(() => {
    if (ticket?.status !== 'Valid') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Khi đồng hồ về 0, tiến hành sinh mã mới
          generateDynamicQR(ticket.ticketCode);
          return 120;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [ticket]);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await ticketAPI.update(id, editForm);
      toast.success('Cập nhật thông tin thành công! Mã vé mới đã được đồng bộ.');
      setEditing(false);
      fetchTicket();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi cập nhật'); }
    setSaving(false);
  };

  const handleCancel = async () => {
    setCanceling(true);
    try {
      const { data } = await ticketAPI.cancel(id);
      toast.success(data.message);
      navigate('/my-tickets');
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi hủy vé'); }
    setCanceling(false);
    setShowConfirm(false);
  };

  if (loading) return <p style={{ textAlign: 'center', padding: 60 }}>Đang tải...</p>;
  if (!ticket) return <p style={{ textAlign: 'center', padding: 60 }}>Không tìm thấy vé.</p>;

  const ev = ticket.eventId;
  const st = STATUS_LABEL[ticket.status] || { label: ticket.status, color: '#888' };
  const canEdit   = ticket.status === 'Valid';
  const canCancel = ticket.status === 'Valid';

  return (
    <div style={{ maxWidth: 680, margin: '40px auto', padding: '0 20px' }}>
      {/* Header Card */}
      <div style={{ background: '#1F3864', borderRadius: '14px 14px 0 0', padding: '24px 28px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>{ev?.title}</h2>
            <p style={{ margin: '0 0 4px', opacity: 0.85, fontSize: 14 }}>📅 {ev?.startTime ? new Date(ev.startTime).toLocaleString('vi-VN') : '—'}</p>
            <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>📍 {ev?.location}</p>
          </div>
          <span style={{ background: st.color, padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            {st.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ background: '#fff', borderRadius: '0 0 14px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ borderTop: '2px dashed #e0e0e0', margin: '0 24px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: -36, top: -14, width: 28, height: 28, background: '#F5F7FA', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', right: -36, top: -14, width: 28, height: 28, background: '#F5F7FA', borderRadius: '50%' }} />
        </div>

        <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 24 }}>
          {/* Info */}
          <div>
            <h3 style={{ color: '#1F3864', marginBottom: 16 }}>Thông tin người tham dự</h3>
            {editing ? (
              <form onSubmit={handleSaveEdit}>
                <label style={{ fontSize: 13, color: '#555' }}>Họ và tên</label>
                <input value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} required
                  style={{ display: 'block', width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', marginBottom: 12, fontSize: 14, boxSizing: 'border-box' }} />
                <label style={{ fontSize: 13, color: '#555' }}>Số điện thoại</label>
                <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} required
                  style={{ display: 'block', width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', marginBottom: 16, fontSize: 14, boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" disabled={saving}
                    style={{ background: '#27ae60', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 14 }}>
                    {saving ? 'Đang lưu...' : '✅ Lưu'}
                  </button>
                  <button type="button" onClick={() => setEditing(false)}
                    style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 14 }}>
                    Hủy bỏ
                  </button>
                </div>
              </form>
            ) : (
              <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Họ và tên', ticket.attendeeInfo.fullName],
                    ['Email', ticket.attendeeInfo.email],
                    ['Số điện thoại', ticket.attendeeInfo.phone],
                    ['Nghề nghiệp', ticket.attendeeInfo.occupation || '—'],
                    ['Loại vé', ticket.ticketType],
                    ['Giá vé', ticket.price === 0 ? 'Miễn phí' : `${ticket.price.toLocaleString('vi-VN')} đ`],
                    ticket.checkedInAt ? ['Thời gian check-in', new Date(ticket.checkedInAt).toLocaleString('vi-VN')] : null,
                  ].filter(Boolean).map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px 0', color: '#888', width: 140 }}>{k}</td>
                      <td style={{ padding: '8px 0', fontWeight: 500, color: '#1F3864' }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!editing && (
              <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
                {canEdit && (
                  <button onClick={() => setEditing(true)}
                    style={{ background: '#2E75B6', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontSize: 14 }}>
                    ✏️ Chỉnh sửa thông tin
                  </button>
                )}
                {canCancel && (
                  <button onClick={() => setShowConfirm(true)}
                    style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontSize: 14 }}>
                    🗑️ Hủy vé
                  </button>
                )}
              </div>
            )}
          </div>

          {/* QR Code Section */}
          {ticket.status === 'Valid' && dynamicQRUrl && (
            <div style={{ textAlign: 'center', minWidth: 180 }}>
              <img src={dynamicQRUrl} alt="QR Code bảo mật" style={{ width: 160, height: 160, border: '4px solid #1F3864', borderRadius: 12 }} />
              
              {/* Thanh hiển thị thời gian đếm ngược làm mới mã */}
              

              <div style={{ marginTop: 8 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 'bold', color: '#1F3864', fontFamily: 'monospace' }}>
                  {ticket.ticketCode}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm cancel modal */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 32, maxWidth: 400, width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ color: '#1F3864', marginBottom: 8 }}>Xác nhận hủy vé?</h3>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>
              {ticket.price > 0
                ? 'Đây là vé có phí. Yêu cầu hoàn tiền sẽ được tạo và chờ Ban tổ chức phê duyệt.'
                : 'Vé sẽ bị hủy ngay lập tức và không thể khôi phục.'}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
              <button onClick={() => setShowConfirm(false)}
                style={{ background: '#eee', color: '#333', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 15 }}>
                Không
              </button>
              <button onClick={handleCancel} disabled={canceling}
                style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 15, fontWeight: 'bold' }}>
                {canceling ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}