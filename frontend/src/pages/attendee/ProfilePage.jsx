import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../utils/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState('info');
  const [form, setForm] = useState({ fullName: user?.fullName || '', phone: user?.phone || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const inp = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #ccc', marginBottom: 14, fontSize: 14, boxSizing: 'border-box' };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await userAPI.updateProfile(form);
      setUser(data.data);
      localStorage.setItem('user', JSON.stringify(data.data));
      toast.success('Cập nhật thông tin thành công!');
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
    setSaving(false);
  };

  const handleChangePw = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { toast.error('Mật khẩu xác nhận không khớp'); return; }
    if (pwForm.newPassword.length < 8) { toast.error('Mật khẩu tối thiểu 8 ký tự'); return; }
    setSaving(true);
    try {
      await userAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Đổi mật khẩu thành công!');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
    setSaving(false);
  };

  const tabStyle = (t) => ({
    padding: '10px 24px', cursor: 'pointer', border: 'none', fontSize: 14, fontWeight: 'bold',
    background: tab === t ? '#1F3864' : '#eee', color: tab === t ? '#fff' : '#555', borderRadius: '8px 8px 0 0',
  });

  return (
    <div style={{ maxWidth: 560, margin: '40px auto', padding: '0 20px' }}>
      <h2 style={{ color: '#1F3864', marginBottom: 8 }}>👤 Tài khoản của tôi</h2>
      <p style={{ color: '#888', marginBottom: 20 }}>Email: {user?.email} &nbsp;|&nbsp; Vai trò: {user?.role}</p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
        <button style={tabStyle('info')} onClick={() => setTab('info')}>Thông tin</button>
        <button style={tabStyle('password')} onClick={() => setTab('password')}>Đổi mật khẩu</button>
      </div>

      <div style={{ background: '#fff', borderRadius: '0 8px 14px 14px', padding: 28, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
        {tab === 'info' && (
          <form onSubmit={handleUpdateProfile}>
            <label style={{ fontSize: 14, color: '#555', fontWeight: 'bold' }}>Họ và tên</label>
            <input style={{ ...inp, marginTop: 6 }} value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
            <label style={{ fontSize: 14, color: '#555', fontWeight: 'bold' }}>Email (không thể thay đổi)</label>
            <input style={{ ...inp, marginTop: 6, background: '#f5f5f5' }} value={user?.email} disabled />
            <label style={{ fontSize: 14, color: '#555', fontWeight: 'bold' }}>Số điện thoại</label>
            <input style={{ ...inp, marginTop: 6 }} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <button type="submit" disabled={saving}
              style={{ background: '#1F3864', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 28px', fontSize: 15, cursor: 'pointer', fontWeight: 'bold' }}>
              {saving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
            </button>
          </form>
        )}

        {tab === 'password' && (
          <form onSubmit={handleChangePw}>
            {[
              { label: 'Mật khẩu hiện tại', key: 'currentPassword' },
              { label: 'Mật khẩu mới (≥ 8 ký tự)', key: 'newPassword' },
              { label: 'Xác nhận mật khẩu mới', key: 'confirm' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 14, color: '#555', fontWeight: 'bold' }}>{f.label}</label>
                <input type="password" required style={{ ...inp, marginTop: 6 }}
                  value={pwForm[f.key]} onChange={e => setPwForm({ ...pwForm, [f.key]: e.target.value })} />
              </div>
            ))}
            <button type="submit" disabled={saving}
              style={{ background: '#2E75B6', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 28px', fontSize: 15, cursor: 'pointer', fontWeight: 'bold' }}>
              {saving ? 'Đang lưu...' : '🔐 Đổi mật khẩu'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
