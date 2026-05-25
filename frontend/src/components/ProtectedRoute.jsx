import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Chặn trang cần đăng nhập
export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="loading-screen">Đang tải...</div>;
  if (!user)   return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
};

// Chặn theo vai trò
export const RoleRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Đang tải...</div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
};
