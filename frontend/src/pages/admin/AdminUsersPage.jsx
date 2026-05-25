// AdminUsersPage.jsx
import { useEffect, useState } from 'react';
import { adminAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const ROLES    = ['Attendee', 'Content_Creator', 'Manager', 'Staff', 'Admin'];
const STATUSES = ['Active', 'Locked', 'Pending_Verification'];
const ROLE_LABELS = { Attendee: 'Người tham dự', Content_Creator: 'Nhân viên TT', Manager: 'Quản lý', Staff: 'Soát vé', Admin: 'Quản trị viên' };
const STATUS_COLORS = { Active: '#27ae60', Locked: '#e74c3c', Pending_Verification: '#e67e22' };

export default function AdminUsersPage() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modal, setModal]     = useState(null); // { type:'create'|'edit', user? }
  const [form, setForm]       = useState({ fullName:'', email:'', phone:'', role:'Staff', status:'Active' });
  const [saving, setSaving]   = useState(false);

  const fetch = (params = {}) => {
    adminAPI.getUsers({ search, role: roleFilter, ...params })
      .then(({ data }) => setUsers(data.data))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, []);

  const handleSearch = (e) => { e.preventDefault(); fetch(); };

  const openCreate = () => { setForm({ fullName:'', email:'', phone:'', role:'Staff', status:'Active' }); setModal({ type:'create' }); };
  const openEdit   = (u)  => { setForm({ fullName: u.fullName, email: u.email, phone: u.phone, role: u.role, status: u.status }); setModal({ type:'edit', user: u }); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal.type === 'create') {
        await adminAPI.createUser(form);
        toast.success('Tạo tài khoản thành công! Email đã gửi mật khẩu tạm.');
      } else {
        await adminAPI.updateUser(modal.user._id, { status: form.status, role: form.role });
        toast.success('Cập nhật tài khoản thành công!');
      }
      setModal(null); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa tài khoản này?')) return;
    try {
      await adminAPI.deleteUser(id);
      toast.success('Đã xóa tài khoản');
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid #ccc', marginBottom:14, fontSize:14, boxSizing:'border-box' };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <h2 style={{ color:'#1F3864', margin:0 }}>👥 Quản lý tài khoản</h2>
        <button onClick={openCreate} style={{ background:'#1F3864', color:'#fff', border:'none', borderRadius:8, padding:'10px 20px', cursor:'pointer', fontSize:14, fontWeight:'bold' }}>
          + Tạo tài khoản nội bộ
        </button>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} style={{ display:'flex', gap:10, marginBottom:20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên, email, SĐT..."
          style={{ flex:1, padding:'9px 14px', borderRadius:8, border:'1px solid #ccc', fontSize:14 }} />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          style={{ padding:'9px 14px', borderRadius:8, border:'1px solid #ccc', fontSize:14 }}>
          <option value="">Tất cả vai trò</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <button type="submit" style={{ background:'#2E75B6', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', cursor:'pointer', fontSize:14 }}>🔍</button>
      </form>

      {/* Table */}
      {loading ? <p>Đang tải...</p> : (
        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.07)', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
            <thead style={{ background:'#1F3864', color:'#fff' }}>
              <tr>{['Họ tên','Email','SĐT','Vai trò','Trạng thái','Thao tác'].map(h => (
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontWeight:'bold' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const sc = STATUS_COLORS[u.status] || '#888';
                return (
                  <tr key={u._id} style={{ borderBottom:'1px solid #f0f0f0', background: i%2===0 ? '#fff':'#fafafa' }}>
                    <td style={{ padding:'11px 16px', fontWeight:500 }}>{u.fullName}</td>
                    <td style={{ padding:'11px 16px', color:'#555' }}>{u.email}</td>
                    <td style={{ padding:'11px 16px', color:'#555' }}>{u.phone}</td>
                    <td style={{ padding:'11px 16px' }}><span style={{ background:'#EBF4FF', color:'#2E75B6', padding:'3px 10px', borderRadius:12, fontSize:12, fontWeight:'bold' }}>{ROLE_LABELS[u.role]}</span></td>
                    <td style={{ padding:'11px 16px' }}><span style={{ background: sc+'22', color:sc, padding:'3px 10px', borderRadius:12, fontSize:12, fontWeight:'bold' }}>{u.status}</span></td>
                    <td style={{ padding:'11px 16px' }}>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => openEdit(u)} style={{ background:'#2E75B6', color:'#fff', border:'none', borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:12 }}>✏️ Sửa</button>
                        <button onClick={() => handleDelete(u._id)} style={{ background:'#e74c3c', color:'#fff', border:'none', borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:12 }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.length === 0 && <p style={{ textAlign:'center', padding:32, color:'#888' }}>Không tìm thấy tài khoản nào.</p>}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:32, maxWidth:440, width:'90%' }}>
            <h3 style={{ color:'#1F3864', marginBottom:20 }}>{modal.type === 'create' ? '+ Tạo tài khoản nội bộ' : '✏️ Chỉnh sửa tài khoản'}</h3>
            {modal.type === 'create' && (
              <>
                <label style={{ fontSize:13, fontWeight:'bold' }}>Họ và tên</label>
                <input style={inp} value={form.fullName} onChange={e => setForm({...form, fullName:e.target.value})} />
                <label style={{ fontSize:13, fontWeight:'bold' }}>Email</label>
                <input style={inp} type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} />
                <label style={{ fontSize:13, fontWeight:'bold' }}>Số điện thoại</label>
                <input style={inp} value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} />
              </>
            )}
            <label style={{ fontSize:13, fontWeight:'bold' }}>Vai trò</label>
            <select style={inp} value={form.role} onChange={e => setForm({...form, role:e.target.value})}>
              {ROLES.filter(r => r !== 'Attendee').map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            {modal.type === 'edit' && (
              <>
                <label style={{ fontSize:13, fontWeight:'bold' }}>Trạng thái</label>
                <select style={inp} value={form.status} onChange={e => setForm({...form, status:e.target.value})}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </>
            )}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
              <button onClick={() => setModal(null)} style={{ background:'#eee', border:'none', borderRadius:8, padding:'10px 20px', cursor:'pointer' }}>Hủy</button>
              <button onClick={handleSave} disabled={saving} style={{ background:'#1F3864', color:'#fff', border:'none', borderRadius:8, padding:'10px 24px', cursor:'pointer', fontWeight:'bold' }}>
                {saving ? 'Đang lưu...' : '💾 Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
