// RefundRequestsPage.jsx
import { useEffect, useState } from 'react';
import { managerAPI } from '../../utils/api';
import toast from 'react-hot-toast';

export default function RefundRequestsPage() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { type: 'approve'|'reject', refund }
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const fetch = () => managerAPI.getPendingRefunds().then(({ data }) => setRefunds(data.data)).finally(() => setLoading(false));
  useEffect(fetch, []);

  const handleApprove = async () => {
    if (!amount || isNaN(amount)) { toast.error('Nhập số tiền hợp lệ'); return; }
    try {
      await managerAPI.approveRefund(modal.refund._id, Number(amount));
      toast.success('Đã duyệt hoàn tiền!'); setModal(null); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const handleReject = async () => {
    if (!reason.trim()) { toast.error('Vui lòng nhập lý do'); return; }
    try {
      await managerAPI.rejectRefund(modal.refund._id, reason);
      toast.success('Đã từ chối yêu cầu hoàn tiền'); setModal(null); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  if (loading) return <p>Đang tải...</p>;

  return (
    <div>
      <h2 style={{ color: '#1F3864', marginBottom: 24 }}>💰 Yêu cầu hoàn tiền ({refunds.length})</h2>
      {refunds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 14 }}>
          <div style={{ fontSize: 48 }}>✅</div><p style={{ color: '#888' }}>Không có yêu cầu hoàn tiền nào đang chờ.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {refunds.map(r => (
            <div key={r._id} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 6px', color: '#1F3864', fontSize: 15 }}>{r.eventId?.title}</h3>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#555' }}>👤 {r.userId?.fullName} ({r.userId?.email})</p>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#555' }}>🎫 Loại: {r.ticketId?.ticketType} — Giá: {r.ticketId?.price?.toLocaleString('vi-VN')} đ</p>
                <p style={{ margin: 0, fontSize: 13, color: '#8e44ad', fontWeight: 'bold' }}>Dự kiến hoàn: {r.expectedAmount?.toLocaleString('vi-VN')} đ</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setModal({ type: 'approve', refund: r }); setAmount(r.expectedAmount); }}
                  style={{ background: '#27ae60', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>
                  ✅ Duyệt
                </button>
                <button onClick={() => { setModal({ type: 'reject', refund: r }); setReason(''); }}
                  style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>
                  ❌ Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 32, maxWidth: 440, width: '90%' }}>
            {modal.type === 'approve' ? (
              <>
                <h3 style={{ color: '#27ae60', marginBottom: 16 }}>Duyệt hoàn tiền</h3>
                <p style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>Số tiền hoàn trả dự kiến: <strong>{modal.refund.expectedAmount?.toLocaleString('vi-VN')} đ</strong></p>
                <label style={{ fontSize: 14, fontWeight: 'bold' }}>Số tiền hoàn trả thực tế (đ)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min={0}
                  style={{ display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #ccc', marginTop: 8, marginBottom: 16, fontSize: 15, boxSizing: 'border-box' }} />
                <p style={{ color: '#888', fontSize: 12, marginBottom: 20 }}>⚠️ Vui lòng thực hiện hoàn tiền thực tế qua cổng VNPay trước khi bấm Xác nhận.</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setModal(null)} style={{ background: '#eee', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' }}>Hủy</button>
                  <button onClick={handleApprove} style={{ background: '#27ae60', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}>Xác nhận đã hoàn tiền</button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ color: '#e74c3c', marginBottom: 16 }}>Từ chối hoàn tiền</h3>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} placeholder="Lý do từ chối..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', marginBottom: 16 }} />
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={() => setModal(null)} style={{ background: '#eee', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' }}>Hủy</button>
                  <button onClick={handleReject} style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}>Xác nhận từ chối</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
