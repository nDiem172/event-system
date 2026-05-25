import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Tự động đính kèm token vào mọi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Xử lý lỗi 401 toàn cục
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────
export const authAPI = {
  register:           (data) => api.post('/auth/register', data),
  login:              (data) => api.post('/auth/login', data),
  verifyEmail:        (token) => api.get(`/auth/verify-email?token=${token}`),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  getMe:              () => api.get('/auth/me'),
};

// ── Events (public) ──────────────────────────
export const eventAPI = {
  getAll:   (params) => api.get('/events', { params }),
  getById:  (id)     => api.get(`/events/${id}`),
};

// ── Tickets ──────────────────────────────────
export const ticketAPI = {
  getMyTickets: ()              => api.get('/tickets/my-tickets'),
  getById:      (id)            => api.get(`/tickets/${id}`),
  register:     (data)          => api.post('/tickets/register', data),
  update:       (id, data)      => api.put(`/tickets/${id}/update`, data),
  cancel:       (id)            => api.delete(`/tickets/${id}/cancel`),
};

// ── User ─────────────────────────────────────
export const userAPI = {
  updateProfile:    (data) => api.put('/user/profile', data),
  changePassword:   (data) => api.put('/user/change-password', data),
};

// ── Waiting List ─────────────────────────────
export const waitingAPI = {
  join:  (eventId) => api.post('/waitinglist/join', { eventId }),
  getMy: ()        => api.get('/waitinglist/my'),
};

// ── Payment ──────────────────────────────────
export const paymentAPI = {
  createVNPay: (ticketId) => api.post('/payment/vnpay/create', { ticketId }),
};

// ── Creator ──────────────────────────────────
export const creatorAPI = {
  getMyEvents:  ()              => api.get('/creator/events'),
  create:       (data)          => api.post('/creator/events', data),
  update:       (id, data)      => api.put(`/creator/events/${id}`, data),
  submit:       (id)            => api.patch(`/creator/events/${id}/submit`),
};

// ── Manager ──────────────────────────────────
export const managerAPI = {
  getPendingEvents: ()              => api.get('/manager/events/pending'),
  approve:          (id)            => api.patch(`/manager/events/${id}/approve`),
  reject:           (id, reason)    => api.patch(`/manager/events/${id}/reject`, { reason }),
  getPendingRefunds:()              => api.get('/manager/refunds'),
  approveRefund:    (id, amount)    => api.patch(`/manager/refunds/${id}/approve`, { actualAmount: amount }),
  rejectRefund:     (id, reason)    => api.patch(`/manager/refunds/${id}/reject`, { reason }),
  getDashboard:     (params)        => api.get('/manager/dashboard', { params }),
  exportAttendees:  (eventId)       => api.get(`/manager/events/${eventId}/export`, { responseType: 'blob' }),
  adjustStock:      (eventId, data) => api.patch(`/manager/events/${eventId}/stock`, data),
};

// ── Staff ────────────────────────────────────
export const staffAPI = {
  checkInQR:     (data)  => api.post('/staff/checkin/qr', data),
  checkInManual: (data)  => api.post('/staff/checkin/manual', data),
  syncOffline:   (data)  => api.post('/staff/checkin/sync', data),
};

// ── Admin ────────────────────────────────────
export const adminAPI = {
  getUsers:     (params)      => api.get('/admin/users', { params }),
  createUser:   (data)        => api.post('/admin/users', data),
  updateUser:   (id, data)    => api.patch(`/admin/users/${id}`, data),
  deleteUser:   (id)          => api.delete(`/admin/users/${id}`),
  getLogs:      (params)      => api.get('/admin/logs', { params }),
};

export default api;
