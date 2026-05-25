import { useEffect, useState } from 'react';
import { adminAPI } from '../../utils/api';

const LEVEL_COLORS = { INFO: '#2E75B6', WARN: '#e67e22', ERROR: '#e74c3c' };

export default function SystemLogPage() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [filters, setFilters] = useState({ level: '', action: '', from: '', to: '' });

  const fetch = (p = 1) => {
    setLoading(true);
    adminAPI.getLogs({ ...filters, page: p, limit: 50 })
      .then(({ data }) => { setLogs(data.data); setTotal(data.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(page); }, [page]);

  const handleFilter = (e) => { e.preventDefault(); setPage(1); fetch(1); };
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });
  const totalPages = Math.ceil(total / 50);

  const inp = { padding:'8px 12px', borderRadius:8, border:'1px solid #ccc', fontSize:13 };

  return (
    <div>
      <h2 style={{ color:'#1F3864', marginBottom:20 }}>📜 System Log ({total.toLocaleString()} bản ghi)</h2>

      {/* Filters */}
      <form onSubmit={handleFilter} style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:20 }}>
        <select value={filters.level} onChange={set('level')} style={inp}>
          <option value="">Tất cả mức độ</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
        </select>
        <input value={filters.action} onChange={set('action')} placeholder="Tìm theo hành động..." style={{ ...inp, flex:1, minWidth:200 }} />
        <input type="datetime-local" value={filters.from} onChange={set('from')} style={inp} />
        <input type="datetime-local" value={filters.to} onChange={set('to')} style={inp} />
        <button type="submit" style={{ background:'#2E75B6', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', cursor:'pointer', fontSize:13 }}>🔍 Lọc</button>
        <button type="button" onClick={() => { setFilters({ level:'', action:'', from:'', to:'' }); setPage(1); fetch(1); }}
          style={{ background:'#eee', color:'#333', border:'none', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontSize:13 }}>Xóa lọc</button>
      </form>

      {/* Table */}
      {loading ? <p>Đang tải...</p> : (
        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.07)', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead style={{ background:'#1F3864', color:'#fff' }}>
              <tr>{['Thời gian','Người dùng','Hành động','IP','Mức độ'].map(h => (
                <th key={h} style={{ padding:'11px 14px', textAlign:'left' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const lc = LEVEL_COLORS[log.level] || '#888';
                return (
                  <tr key={log._id} style={{ borderBottom:'1px solid #f0f0f0', background: i%2===0 ? '#fff':'#fafafa' }}>
                    <td style={{ padding:'9px 14px', color:'#555', whiteSpace:'nowrap' }}>{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
                    <td style={{ padding:'9px 14px', color:'#333' }}>{log.userId?.fullName || '—'}<br /><span style={{ color:'#aaa', fontSize:11 }}>{log.userId?.email}</span></td>
                    <td style={{ padding:'9px 14px', color:'#1F3864', maxWidth:300 }}>{log.action}</td>
                    <td style={{ padding:'9px 14px', color:'#888', fontSize:12 }}>{log.ip || '—'}</td>
                    <td style={{ padding:'9px 14px' }}>
                      <span style={{ background: lc+'22', color: lc, padding:'3px 10px', borderRadius:12, fontSize:12, fontWeight:'bold' }}>{log.level}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {logs.length === 0 && <p style={{ textAlign:'center', padding:32, color:'#888' }}>Không có log nào.</p>}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:20 }}>
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
            style={{ background: page===1 ? '#eee':'#2E75B6', color: page===1 ? '#aaa':'#fff', border:'none', borderRadius:8, padding:'7px 16px', cursor: page===1 ? 'default':'pointer' }}>
            ← Trước
          </button>
          <span style={{ padding:'7px 16px', fontSize:14, color:'#555' }}>Trang {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
            style={{ background: page===totalPages ? '#eee':'#2E75B6', color: page===totalPages ? '#aaa':'#fff', border:'none', borderRadius:8, padding:'7px 16px', cursor: page===totalPages ? 'default':'pointer' }}>
            Sau →
          </button>
        </div>
      )}
    </div>
  );
}
