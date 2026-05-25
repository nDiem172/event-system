// PaymentResultPage.jsx
import { useLocation, Link } from 'react-router-dom';

export default function PaymentResultPage() {
  const location = useLocation();
  const params   = new URLSearchParams(location.search);
  const status   = params.get('status');
  const ticketId = params.get('ticketId');

  const configs = {
    success: { icon: '✅', title: 'Thanh toán thành công!', desc: 'Vé của bạn đã được tạo. Kiểm tra email để nhận mã QR.', color: '#27ae60', actions: [{ to: ticketId ? `/my-tickets/${ticketId}` : '/my-tickets', label: 'Xem vé của tôi' }] },
    failed:  { icon: '❌', title: 'Thanh toán thất bại', desc: 'Giao dịch không thành công. Vui lòng thử lại.', color: '#e74c3c', actions: [{ to: '/', label: 'Về trang chủ' }] },
    invalid: { icon: '⚠️', title: 'Giao dịch không hợp lệ', desc: 'Chữ ký giao dịch không đúng. Liên hệ hỗ trợ nếu cần.', color: '#e67e22', actions: [{ to: '/', label: 'Về trang chủ' }] },
  };

  const cfg = configs[status] || configs.invalid;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
      <div style={{ textAlign: 'center', background: '#fff', padding: 52, borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.1)', maxWidth: 440 }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>{cfg.icon}</div>
        <h2 style={{ color: cfg.color, marginBottom: 12 }}>{cfg.title}</h2>
        <p style={{ color: '#666', marginBottom: 28, lineHeight: 1.6 }}>{cfg.desc}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {cfg.actions.map(a => (
            <Link key={a.to} to={a.to}
              style={{ background: '#1F3864', color: '#fff', padding: '11px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 'bold', fontSize: 15 }}>
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
