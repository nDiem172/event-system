import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute';

// Layout
import MainLayout   from './components/layout/MainLayout';
import DashLayout   from './components/layout/DashLayout';

// Public pages
import HomePage          from './pages/HomePage';
import EventDetailPage   from './pages/EventDetailPage';
import LoginPage         from './pages/auth/LoginPage';
import RegisterPage      from './pages/auth/RegisterPage';
import VerifyEmailPage   from './pages/auth/VerifyEmailPage';
import PaymentResultPage from './pages/attendee/PaymentResultPage';
import UnauthorizedPage  from './pages/UnauthorizedPage';

// Attendee pages
import MyTicketsPage  from './pages/attendee/MyTicketsPage';
import TicketDetail   from './pages/attendee/TicketDetailPage';
import RegisterEvent  from './pages/attendee/RegisterEventPage';
import ProfilePage    from './pages/attendee/ProfilePage';

// Creator pages
import CreatorEventsPage from './pages/creator/CreatorEventsPage';
import EventFormPage     from './pages/creator/EventFormPage';

// Manager pages
import ManagerDashboard   from './pages/manager/ManagerDashboard';
import PendingEventsPage  from './pages/manager/PendingEventsPage';
import RefundRequestsPage from './pages/manager/RefundRequestsPage';
import EventReportPage    from './pages/manager/EventReportPage';

// Staff pages
import CheckInPage from './pages/staff/CheckInPage';

// Admin pages
import AdminUsersPage from './pages/admin/AdminUsersPage';
import SystemLogPage  from './pages/admin/SystemLogPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        <Routes>
          {/* ── Public ──────────────────────────── */}
          <Route element={<MainLayout />}>
            <Route path="/"              element={<HomePage />} />
            <Route path="/events/:id"    element={<EventDetailPage />} />
            <Route path="/login"         element={<LoginPage />} />
            <Route path="/register"      element={<RegisterPage />} />
            <Route path="/verify-email"  element={<VerifyEmailPage />} />
            <Route path="/unauthorized"  element={<UnauthorizedPage />} />
            <Route path="/payment/result" element={<PaymentResultPage />} />
          </Route>

          {/* ── Attendee ────────────────────────── */}
          <Route element={<MainLayout />}>
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/my-tickets" element={<ProtectedRoute><MyTicketsPage /></ProtectedRoute>} />
            <Route path="/my-tickets/:id" element={<ProtectedRoute><TicketDetail /></ProtectedRoute>} />
            <Route path="/events/:id/register" element={<ProtectedRoute><RegisterEvent /></ProtectedRoute>} />
          </Route>

          {/* ── Creator ─────────────────────────── */}
          <Route path="/creator" element={
            <RoleRoute roles={['Content_Creator','Admin']}><DashLayout role="creator" /></RoleRoute>
          }>
            <Route index element={<Navigate to="events" replace />} />
            <Route path="events"         element={<CreatorEventsPage />} />
            <Route path="events/new"     element={<EventFormPage />} />
            <Route path="events/:id/edit" element={<EventFormPage />} />
          </Route>

          {/* ── Manager ─────────────────────────── */}
          <Route path="/manager" element={
            <RoleRoute roles={['Manager','Admin']}><DashLayout role="manager" /></RoleRoute>
          }>
            <Route index element={<ManagerDashboard />} />
            <Route path="events/pending"  element={<PendingEventsPage />} />
            <Route path="refunds"         element={<RefundRequestsPage />} />
            <Route path="events/:id/report" element={<EventReportPage />} />
          </Route>

          {/* ── Staff ───────────────────────────── */}
          <Route path="/staff" element={
            <RoleRoute roles={['Staff','Manager','Admin']}><DashLayout role="staff" /></RoleRoute>
          }>
            <Route index element={<Navigate to="checkin" replace />} />
            <Route path="checkin" element={<CheckInPage />} />
          </Route>

          {/* ── Admin ───────────────────────────── */}
          <Route path="/admin" element={
            <RoleRoute roles={['Admin']}><DashLayout role="admin" /></RoleRoute>
          }>
            <Route index element={<Navigate to="users" replace />} />
            <Route path="users"  element={<AdminUsersPage />} />
            <Route path="logs"   element={<SystemLogPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
