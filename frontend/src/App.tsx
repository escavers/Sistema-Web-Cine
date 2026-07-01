import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import AdminUsersPage from './pages/AdminUsersPage';
import BoleteriaPage from './pages/BoleteriaPage';
import PeliculasPage from './pages/PeliculasPage';
import SalasPage from './pages/SalasPage';
import FuncionesPage from './pages/FuncionesPage';
import VentaPresencialPage from './pages/VentaPresencialPage';
import CompraOnlinePage from './pages/CompraOnlinePage';
import HistorialPage from './pages/HistorialPage';
import ReportesPage from './pages/ReportesPage';
import AccessValidationPage from './pages/AccessValidationPage';
import PromocionesPage from './pages/PromocionesPage';
import PerfilPage from './pages/PerfilPage';
import ComprobantePublicoPage from './pages/ComprobantePublicoPage';

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/registro" element={<PublicRoute><RegisterPage /></PublicRoute>} />

            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />

            <Route path="/usuarios" element={
              <ProtectedRoute roles={['ADMINISTRADOR']}>
                <AdminUsersPage />
              </ProtectedRoute>
            } />

            <Route path="/peliculas" element={
              <ProtectedRoute roles={['ADMINISTRADOR']}>
                <PeliculasPage />
              </ProtectedRoute>
            } />

            <Route path="/salas" element={
              <ProtectedRoute roles={['ADMINISTRADOR']}>
                <SalasPage />
              </ProtectedRoute>
            } />

            <Route path="/funciones" element={
              <ProtectedRoute roles={['ADMINISTRADOR']}>
                <FuncionesPage />
              </ProtectedRoute>
            } />

            <Route path="/boleteria/registro" element={
              <ProtectedRoute roles={['BOLETERIA', 'ADMINISTRADOR']}>
                <BoleteriaPage />
              </ProtectedRoute>
            } />

            <Route path="/boleteria/venta" element={
              <ProtectedRoute roles={['BOLETERIA', 'ADMINISTRADOR']}>
                <VentaPresencialPage />
              </ProtectedRoute>
            } />

            <Route path="/compra" element={
              <ProtectedRoute roles={['CLIENTE']}>
                <CompraOnlinePage />
              </ProtectedRoute>
            } />

            <Route path="/historial" element={
              <ProtectedRoute roles={['CLIENTE']}>
                <HistorialPage />
              </ProtectedRoute>
            } />

            <Route path="/reportes" element={
              <ProtectedRoute roles={['ADMINISTRADOR']}>
                <ReportesPage />
              </ProtectedRoute>
            } />

            <Route path="/acceso/validar" element={
              <ProtectedRoute roles={['ACCESO', 'ADMINISTRADOR']}>
                <AccessValidationPage />
              </ProtectedRoute>
            } />

            <Route path="/promociones" element={
              <ProtectedRoute roles={['ADMINISTRADOR']}>
                <PromocionesPage />
              </ProtectedRoute>
            } />

            <Route path="/perfil" element={
              <ProtectedRoute>
                <PerfilPage />
              </ProtectedRoute>
            } />

            <Route path="/comprobante/:numero" element={<ComprobantePublicoPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
