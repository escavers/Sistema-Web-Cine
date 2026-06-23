import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Rol } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Rol[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cinema-black">
        <p className="text-cinema-gray">Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.idRol)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
