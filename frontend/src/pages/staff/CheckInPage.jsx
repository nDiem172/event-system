import { useEffect, useRef, useState } from 'react';
import { staffAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const RESULT_COLORS = { success: '#27ae60', error: '#e74c3c', warn: '#e67e22' };

export default function CheckInPage() {
  const [tab, setTab]             = useState('qr');  // 'qr' | 'manual'
  const [eventId, setEventId]     = useState('');
  const [keyword, setKeyword]     = useState('');
  const [result, setResult]       = useState(null);   // { type, message, fullName }
  const [checking, setChecking]   = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState(() => {
    try { return JSON.parse(localStorage.getItem('offline_checkins') || '[]'); } catch { return []; }
  });
  const inputRef = useRef(null);
  const qrBuffer = useRef('');
  const qrTimer  = useRef(null);

  // Online/Offline detection
  useEffect(() => {
    const goOnline  = () => { setIsOffline(false); syncOffline(); };
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // QR keyboard input capture (USB/Bluetooth scanner)
  useEffect(() => {
    if (tab !== 'qr') return;
    const handleKey = (e) => {
      if (e.key === 'Enter') {
        const code = qrBuffer.current.trim();
        qrBuffer.current = '';
        clearTimeout(qrTimer.current);
        if (code && eventId) doCheckInQR(code);
      } else {
        qrBuffer.current += e.key;
        clearTimeout(qrTimer.current);
        qrTimer.current = setTimeout(() => { qrBuffer.current = ''; }, 200);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [tab, eventId]);

  const showResult = (type, message, fullName = '') => {
    setResult({ type, message, fullName });
    setTimeout(() => setResult(null), 4000);
  };

  const saveOffline = (qrCode) => {
    const entry = { qrCode, eventId, checkedInAt: new Date().toISOString() };
    const updated = [...offlineQueue, entry];
    setOfflineQueue(updated);
    localStorage.setItem('offline_checkins', JSON.stringify(updated));
    showResult('warn', `[OFFLINE] Đã lưu cục bộ, sẽ đồng bộ khi có mạng.`);
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

  const doCheckInQR = async (code) => {
    if (!eventId) { toast.error('Vui lòng nhập Mã sự kiện trước'); return; }
    if (checking) return;
    if (isOffline) { saveOffline(code); return; }
    setChecking(true);
    try {
      const { data } = await staffAPI.checkInQR({ qrCode: code, eventId });
      showResult('success', `Check-in thành công! ${new Date(data.data.checkedInAt).toLocaleTimeString('vi-VN')}`, data.data.fullName);
    } catch (err) {
      const msg = err.response?.data?.message || 'Lỗi không xác định';
      const isUsed = msg.includes('đã được sử dụng');
      showResult('error', msg, isUsed ? `Check-in lần trước: ${err.response?.data?.checkedInAt ? new Date(err.response.data.checkedInAt).toLocaleString('vi-VN') : ''}` : '');
    }
    setChecking(false);
  };

  const doCheckInManual = async (e) => {
    e.preventDefault();
    if (!eventId) { toast.error('Vui lòng nhập Mã sự kiện trước'); return; }
    setChecking(true);
    try {
      const { data } = await staffAPI.checkInManual({ keyword, eventId });
      showResult('success', 'Check-in thủ công thành công!', data.data.fullName);
      setKeyword('');
    } catch (err) { showResult('error', err.response?.data?.message || 'Không tìm thấy vé'); }
    setChecking(false);
  };

  const tabStyle = (t) => ({
    flex: 1, padding: '12px 0', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 'bold',
    background: tab === t ? '#1F3864' : '#eee', color: tab === t ? '#fff' : '#555',
    borderRadius: tab === t ? '8px 8px 0 0' : '8px 8px 0 0',
  });

  return (
    <div style={{ maxWidth: 580, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: '#1F3864', margin: 0 }}>📷 Soát vé / Check-in</h2>
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

      {/* Event ID input */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 20 }}>
        <label style={{ fontSize: 14, fontWeight: 'bold', color: '#555', display: 'block', marginBottom: 8 }}>
          Mã sự kiện (Event ID) *
        </label>
        <input value={eventId} onChange={e => setEventId(e.target.value)}
          placeholder="Nhập hoặc paste Event ID..."
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `2px solid ${eventId ? '#27ae60' : '#ccc'}`, fontSize: 14, boxSizing: 'border-box' }} />
        {!eventId && <p style={{ color: '#e67e22', fontSize: 12, margin: '6px 0 0' }}>⚠️ Cần nhập Event ID để bắt đầu soát vé</p>}
      </div>

      {/* Result banner */}
      {result && (
        <div style={{
          background: RESULT_COLORS[result.type] + '15',
          border: `2px solid ${RESULT_COLORS[result.type]}`,
          borderRadius: 12, padding: '16px 20px', marginBottom: 20, textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>
            {result.type === 'success' ? '✅' : result.type === 'warn' ? '⚠️' : '❌'}
          </div>
          {result.fullName && <div style={{ fontWeight: 'bold', fontSize: 18, color: RESULT_COLORS[result.type], marginBottom: 4 }}>{result.fullName}</div>}
          <div style={{ color: RESULT_COLORS[result.type], fontSize: 14 }}>{result.message}</div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
        <button style={tabStyle('qr')}     onClick={() => setTab('qr')}>     📷 Quét QR</button>
        <button style={tabStyle('manual')} onClick={() => setTab('manual')}> 🔍 Thủ công</button>
      </div>

      <div style={{ background: '#fff', borderRadius: '0 0 14px 14px', padding: 28, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
        {tab === 'qr' && (
          <div style={{ textAlign: 'center' }}>
            {/* Camera QR scanner area */}
            <div style={{ border: '3px dashed #2E75B6', borderRadius: 16, padding: '40px 20px', background: '#F0F6FF', marginBottom: 20 }}>
              <div style={{ fontSize: 64, marginBottom: 12 }}>📷</div>
              <p style={{ color: '#2E75B6', fontWeight: 'bold', fontSize: 16, margin: '0 0 8px' }}>
                {checking ? 'Đang xử lý...' : 'Hướng camera vào mã QR trên vé'}
              </p>
              <p style={{ color: '#888', fontSize: 13, margin: 0 }}>
                Hệ thống tự động nhận diện khi máy quét USB/Bluetooth kết nối
              </p>
            </div>

            {/* Manual QR input (fallback) */}
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 6 }}>
                Nhập mã vé thủ công (nếu không có máy quét):
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input ref={inputRef} placeholder="TKT-XXXXXXXX..."
                  onKeyDown={e => { if (e.key === 'Enter') { doCheckInQR(e.target.value); e.target.value = ''; } }}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 }} />
                <button
                  onClick={() => { if (inputRef.current) { doCheckInQR(inputRef.current.value); inputRef.current.value = ''; } }}
                  disabled={checking || !eventId}
                  style={{ background: '#1F3864', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>
                  Check-in
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'manual' && (
          <form onSubmit={doCheckInManual}>
            <label style={{ fontSize: 14, fontWeight: 'bold', color: '#555', display: 'block', marginBottom: 8 }}>
              Tìm kiếm theo SĐT hoặc Email
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <input value={keyword} onChange={e => setKeyword(e.target.value)} required
                placeholder="Nhập số điện thoại hoặc email..."
                style={{ flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid #ccc', fontSize: 15 }} />
              <button type="submit" disabled={checking || !eventId}
                style={{ background: '#1F3864', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', cursor: 'pointer', fontSize: 15, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                {checking ? '...' : '✅ Check-in'}
              </button>
            </div>
            <p style={{ color: '#888', fontSize: 13, marginTop: 12 }}>
              Dùng khi khách hàng quên vé, màn hình vỡ hoặc mã QR bị mờ.
            </p>
          </form>
        )}
      </div>

      {/* Offline queue display */}
      {offlineQueue.length > 0 && (
        <div style={{ background: '#fff8e1', border: '1px solid #e67e22', borderRadius: 12, padding: 16, marginTop: 20 }}>
          <h4 style={{ color: '#e67e22', margin: '0 0 10px' }}>⚠️ Dữ liệu chưa đồng bộ ({offlineQueue.length} vé)</h4>
          <p style={{ color: '#666', fontSize: 13, margin: 0 }}>Dữ liệu check-in đã được lưu cục bộ và sẽ tự động đồng bộ khi có kết nối mạng.</p>
        </div>
      )}
    </div>
  );
}
