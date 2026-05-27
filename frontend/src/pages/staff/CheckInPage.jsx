import { useEffect, useRef, useState } from 'react';
import { staffAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode'; 

const RESULT_COLORS = { success: '#27ae60', error: '#e74c3c', warn: '#e67e22' };

const FIELD_LABELS = [
  ['fullName',    '👤 Họ và tên'],
  ['ticketCode',  '🎫 Mã vé'],
  ['ticketType',  '🏷️ Loại vé'],
  ['phone',       '📞 Số điện thoại'],
  ['email',       '📧 Email'],
  ['eventTitle',  '📅 Sự kiện'],
  ['checkedInAt', '✅ Giờ check-in'],
];

export default function CheckInPage() {
  const [keyword, setKeyword]   = useState('');
  const [result, setResult]     = useState(null);
  const [checking, setChecking] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState(() => {
    try { return JSON.parse(localStorage.getItem('offline_checkins') || '[]'); } catch { return []; }
  });

  const scannerRef = useRef(null);

  useEffect(() => {
    const goOnline  = () => { setIsOffline(false); syncOffline(); };
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // 📸 KHỞI TẠO WEBCAM SOÁT VÉ MÃ ĐỘNG
  useEffect(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader", 
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scannerRef.current.render((decodedText) => {
        scannerRef.current.pause(true);
        
        doCheckInQR(decodedText).finally(() => {
          setTimeout(() => {
            if (scannerRef.current) scannerRef.current.resume();
          }, 3000);
        });
      }, (error) => {
        // Bỏ qua lỗi quét nền chưa thấy mã
      });
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, []);

  const showResult = (type, message, ticketData = null) => {
    setResult({ type, message, ticketData });
    if (type !== 'success') setTimeout(() => setResult(null), 6000);
  };

  const saveOffline = (qrCode) => {
    const entry = { qrCode, checkedInAt: new Date().toISOString() };
    const updated = [...offlineQueue, entry];
    setOfflineQueue(updated);
    localStorage.setItem('offline_checkins', JSON.stringify(updated));
    showResult('warn', '[OFFLINE] Đã lưu cục bộ dữ liệu soát vé.');
  };

  const syncOffline = async () => {
    const queue = JSON.parse(localStorage.getItem('offline_checkins') || '[]');
    if (queue.length === 0) return;
    try {
      const { data } = await staffAPI.syncOffline({ checkins: queue });
      toast.success(data.message);
      localStorage.removeItem('offline_checkins');
      setOfflineQueue([]);
    } catch { toast.error('Đồng bộ thất bại, sẽ thử lại sau.'); }
  };

  const handleSuccess = (data) => {
    const ticketData = {
      ...data,
      checkedInAt: data.checkedInAt ? new Date(data.checkedInAt).toLocaleString('vi-VN') : '',
    };
    showResult('success', 'Xác thực vé thành công!', ticketData);
  };

  const handleError = (err) => {
    const msg = err.response?.data?.message || 'Lỗi không xác định';
    const prevData = err.response?.data?.data;
    const prevAt = err.response?.data?.checkedInAt;
    const ticketData = prevData ? { ...prevData, checkedInAt: prevAt ? new Date(prevAt).toLocaleString('vi-VN') : '' } : null;
    showResult('error', msg, ticketData);
  };

  const doCheckInQR = async (code) => {
    if (!code?.trim()) return;
    if (isOffline) { saveOffline(code); return; }
    setChecking(true);
    try {
      const { data } = await staffAPI.checkInQR({ qrCode: code.trim() });
      handleSuccess(data.data);
    } catch (err) { handleError(err); }
    setChecking(false);
  };

  const doCheckInManual = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setChecking(true);
    try {
      let data;
      if (keyword.trim().toUpperCase().startsWith('TKT-')) {
        ({ data } = await staffAPI.checkInQR({ qrCode: keyword.trim() }));
      } else {
        ({ data } = await staffAPI.checkInManual({ keyword: keyword.trim() }));
      }
      handleSuccess(data.data);
      setKeyword('');
    } catch (err) { handleError(err); }
    setChecking(false);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: '#1F3864', margin: 0 }}>🎫 Soát vé</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: isOffline ? '#e74c3c' : '#27ae60' }} />
          <span style={{ fontSize: 13, color: isOffline ? '#e74c3c' : '#27ae60', fontWeight: 'bold' }}>
            {isOffline ? 'OFFLINE' : 'ONLINE'}
          </span>
          {offlineQueue.length > 0 && (
            <button onClick={syncOffline} style={{ background: '#2E75B6', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}>
              Đồng bộ ({offlineQueue.length})
            </button>
          )}
        </div>
      </div>

      {/* Thông báo kết quả */}
      {result && (
        <div style={{ background: RESULT_COLORS[result.type] + '12', border: `2px solid ${RESULT_COLORS[result.type]}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: result.ticketData ? 16 : 0 }}>
            <span style={{ fontSize: 36 }}>{result.type === 'success' ? '✅' : result.type === 'warn' ? '⚠️' : '❌'}</span>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 17, color: RESULT_COLORS[result.type] }}>{result.message}</div>
              {result.ticketData?.fullName && <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1F3864', marginTop: 2 }}>{result.ticketData.fullName}</div>}
            </div>
          </div>
          {result.ticketData && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <tbody>
                {FIELD_LABELS.map(([key, label]) =>
                  result.ticketData[key] ? (
                    <tr key={key} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '7px 0', color: '#888', width: 160, whiteSpace: 'nowrap' }}>{label}</td>
                      <td style={{ padding: '7px 0', fontWeight: 500, color: '#1F3864' }}>{result.ticketData[key]}</td>
                    </tr>
                  ) : null
                )}
              </tbody>
            </table>
          )}
          {result.type !== 'success' && (
            <button onClick={() => setResult(null)} style={{ marginTop: 12, background: 'transparent', border: `1px solid ${RESULT_COLORS[result.type]}`, color: RESULT_COLORS[result.type], borderRadius: 6, padding: '4px 14px', cursor: 'pointer', fontSize: 12 }}>Đóng</button>
          )}
        </div>
      )}

      {/* Giao diện */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minHeight: 300 }}>
          <h3 style={{ color: '#1F3864', margin: '0 0 15px', fontSize: 16, textAlign: 'center' }}>📷 Quét mã QR bằng Webcam</h3>
          <div id="reader" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden' }}></div>
          <p style={{ color: '#888', fontSize: 13, marginTop: 15, textAlign: 'center' }}>
            {checking ? 'Đang xác thực vé...' : 'Đưa mã QR động trên điện thoại vào khung hình'}
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <h3 style={{ color: '#1F3864', margin: '0 0 6px', fontSize: 16 }}>Tìm kiếm thủ công</h3>
          <p style={{ color: '#888', fontSize: 13, margin: '0 0 20px' }}>Dùng khi khách quên vé hoặc mã QR bị hỏng</p>
          <form onSubmit={doCheckInManual}>
            <label style={{ fontSize: 13, fontWeight: 'bold', color: '#555', display: 'block', marginBottom: 6 }}>Tìm kiếm (Mã vé, SĐT hoặc Email)</label>
            <input value={keyword} onChange={e => setKeyword(e.target.value)} required placeholder="VD: TKT-ABC123 · 09xxxxxxxx · email@..." style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1.5px solid #ccc', fontSize: 14, boxSizing: 'border-box', marginBottom: 14 }} />
            <button type="submit" disabled={checking} style={{ width: '100%', background: checking ? '#bbb' : '#1F3864', color: '#fff', border: 'none', borderRadius: 8, padding: '13px 0', cursor: checking ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 'bold' }}>
              {checking ? 'Đang xử lý...' : 'Xác thực và Check-in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}