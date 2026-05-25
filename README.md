# 🎫 EventSystem — Hệ thống Quản lý Sự kiện và Đăng ký Tham gia
**Nhóm 7 — DHHTTT18B — Học kỳ 2 / 2025–2026**  
Stack: MongoDB · Express.js · React.js · Node.js (MERN)

---

## 📁 Cấu trúc dự án

```
event-system/
├── backend/
│   ├── server.js                  ← Entry point
│   ├── .env.example               ← Copy thành .env và điền thông tin
│   ├── config/db.js               ← Kết nối MongoDB
│   ├── models/
│   │   ├── User.js
│   │   ├── Event.js
│   │   ├── Ticket.js              ← 6 trạng thái vé
│   │   └── index.js               ← Transaction, RefundRequest, WaitingList, SystemLog
│   ├── middleware/
│   │   └── auth.middleware.js     ← JWT protect + authorize(role)
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── ticket.controller.js
│   │   └── main.controller.js     ← Creator/Manager/Staff/Admin
│   ├── routes/
│   │   ├── public/
│   │   │   ├── auth.routes.js
│   │   │   └── events.routes.js
│   │   └── private/
│   │       ├── user.routes.js
│   │       ├── ticket.routes.js
│   │       ├── creator.routes.js
│   │       ├── manager.routes.js
│   │       ├── staff.routes.js
│   │       ├── admin.routes.js
│   │       ├── payment.routes.js  ← VNPay integration
│   │       └── waitinglist.routes.js
│   └── utils/
│       ├── email.util.js          ← Nodemailer + 10 templates
│       └── qr.util.js             ← QR Code generator
│
└── frontend/
    ├── public/index.html
    └── src/
        ├── App.jsx                ← Router chính (5 nhóm role)
        ├── index.js
        ├── context/
        │   └── AuthContext.jsx    ← Global auth state
        ├── components/
        │   ├── ProtectedRoute.jsx ← Bảo vệ route theo role
        │   └── layout/
        │       ├── MainLayout.jsx ← Navbar + Footer
        │       └── DashLayout.jsx ← Sidebar cho admin/manager/...
        ├── utils/
        │   └── api.js             ← Axios + tất cả API calls
        └── pages/
            ├── HomePage.jsx
            ├── EventDetailPage.jsx
            ├── UnauthorizedPage.jsx
            ├── auth/
            │   ├── LoginPage.jsx
            │   ├── RegisterPage.jsx
            │   └── VerifyEmailPage.jsx
            ├── attendee/
            │   ├── RegisterEventPage.jsx
            │   ├── MyTicketsPage.jsx
            │   ├── TicketDetailPage.jsx   ← QR, chỉnh sửa, hủy vé
            │   ├── ProfilePage.jsx
            │   └── PaymentResultPage.jsx
            ├── creator/
            │   ├── CreatorEventsPage.jsx
            │   └── EventFormPage.jsx      ← Tạo + chỉnh sửa sự kiện
            ├── manager/
            │   ├── ManagerDashboard.jsx
            │   ├── PendingEventsPage.jsx  ← Phê duyệt / Từ chối
            │   ├── RefundRequestsPage.jsx ← Duyệt hoàn tiền
            │   └── EventReportPage.jsx    ← Báo cáo + xuất Excel
            ├── staff/
            │   └── CheckInPage.jsx        ← QR + Thủ công + Offline Sync
            └── admin/
                ├── AdminUsersPage.jsx
                └── SystemLogPage.jsx
```

---

## 🚀 Hướng dẫn cài đặt và chạy

### 1. Clone project và cài dependencies

```bash
# Backend
cd event-system/backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Cấu hình Backend

```bash
cd backend
cp .env.example .env
# Mở .env và điền các thông tin:
# - MONGO_URI: chuỗi kết nối MongoDB (local hoặc Atlas)
# - JWT_SECRET: chuỗi bí mật bất kỳ (đủ dài)
# - SMTP_*: thông tin Gmail SMTP (bật App Password)
# - VNPAY_*: thông tin sandbox VNPay
# - RETURN_INTERNAL_PASSWORD: true/false (demo/dev nên để true nếu chưa cấu hình SMTP)
```

### 3. Chạy project

```bash
# Terminal 1 — Backend (port 8001)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm start
```

### 3.1. (Demo) Tạo sẵn vài sự kiện

```bash
cd backend
npm run seed:events
```

### 4. Tạo tài khoản Admin đầu tiên

## 🔑 Phân quyền hệ thống

| Role | Trang sau đăng nhập | Quyền chính |
|------|--------------------|-|
| **Attendee** | `/` (Trang chủ) | Xem SK, đăng ký, quản lý vé |
| **Content_Creator** | `/creator/events` | Tạo/sửa sự kiện, gửi duyệt |
| **Manager** | `/manager` | Duyệt SK, hoàn tiền, báo cáo |
| **Staff** | `/staff/checkin` | Check-in QR/thủ công/offline |
| **Admin** | `/admin/users` | Quản lý tài khoản, cấu hình, log |

---

## 🎫 Trạng thái vé (Ticket Status)

```
Pending        → Chờ thanh toán (đang ở cổng VNPay)
Valid          → Hợp lệ (sẵn sàng check-in)
Checked-in    → Đã tham gia (Staff đã quét QR)
Canceled       → Đã hủy (vé miễn phí hoặc không hoàn tiền)
Refund-Pending → Chờ hoàn tiền (đang chờ Manager duyệt)
Refunded       → Đã hoàn tiền (Manager đã duyệt xong)
```

---

## 📡 API Endpoints tóm tắt

### Public
- `POST /api/auth/register` — Đăng ký
- `POST /api/auth/login` — Đăng nhập
- `GET  /api/auth/verify-email?token=` — Xác thực email
- `GET  /api/events` — Danh sách sự kiện công khai
- `GET  /api/events/:id` — Chi tiết sự kiện

### Attendee (cần token)
- `GET/PUT /api/user/profile` — Hồ sơ cá nhân
- `GET     /api/tickets/my-tickets` — Danh sách vé
- `POST    /api/tickets/register` — Đăng ký sự kiện
- `PUT     /api/tickets/:id/update` — Chỉnh sửa thông tin vé
- `DELETE  /api/tickets/:id/cancel` — Hủy vé
- `POST    /api/waitinglist/join` — Vào hàng chờ

### Content Creator
- `GET/POST     /api/creator/events` — Xem/Tạo sự kiện
- `PUT          /api/creator/events/:id` — Chỉnh sửa
- `PATCH        /api/creator/events/:id/submit` — Gửi duyệt

### Manager
- `GET   /api/manager/events/pending` — Danh sách chờ duyệt
- `PATCH /api/manager/events/:id/approve` — Phê duyệt
- `PATCH /api/manager/events/:id/reject` — Từ chối
- `GET   /api/manager/refunds` — Yêu cầu hoàn tiền
- `PATCH /api/manager/refunds/:id/approve` — Duyệt hoàn tiền
- `GET   /api/manager/dashboard` — Thống kê
- `GET   /api/manager/events/:id/export` — Xuất Excel

### Staff
- `POST /api/staff/checkin/qr` — Check-in bằng QR
- `POST /api/staff/checkin/manual` — Check-in thủ công
- `POST /api/staff/checkin/sync` — Đồng bộ offline

### Admin
- `GET/POST       /api/admin/users` — Quản lý tài khoản
- `PATCH/DELETE   /api/admin/users/:id`
- `GET            /api/admin/logs` — System Log

---

## 📦 Dependencies chính

### Backend
| Package | Mục đích |
|---------|---------|
| express | Web framework |
| mongoose | MongoDB ODM |
| bcryptjs | Hash mật khẩu |
| jsonwebtoken | JWT authentication |
| nodemailer | Gửi email |
| qrcode | Tạo mã QR |
| xlsx | Xuất file Excel |
| uuid | Sinh mã định danh vé |

### Frontend
| Package | Mục đích |
|---------|---------|
| react-router-dom v6 | Routing |
| axios | HTTP client |
| react-hot-toast | Thông báo toast |
| recharts | Biểu đồ dashboard |

