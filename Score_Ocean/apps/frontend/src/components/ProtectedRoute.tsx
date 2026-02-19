import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string[];
}

function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const accessToken = localStorage.getItem('accessToken');
  const userStr = localStorage.getItem('user');

  if (!accessToken || !userStr) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && requiredRole.length > 0) {
    const user = JSON.parse(userStr);
    if (!requiredRole.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

export default ProtectedRoute;
