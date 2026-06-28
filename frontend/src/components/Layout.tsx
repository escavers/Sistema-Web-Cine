import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Rol } from '../types';
import logoImg from '../logo.png';

const roleLabels: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  BOLETERIA: 'Boletería',
  CLIENTE: 'Cliente',
  ACCESO: 'Encargado de Acceso',
};

interface NavItem {
  to: string;
  label: string;
  roles: Rol[];
}

const navItems: NavItem[] = [
  { to: '/', label: 'Inicio', roles: ['ADMINISTRADOR', 'BOLETERIA', 'CLIENTE', 'ACCESO'] },
  { to: '/peliculas', label: 'Cartelera', roles: ['ADMINISTRADOR'] },
  { to: '/salas', label: 'Salas', roles: ['ADMINISTRADOR'] },
  { to: '/funciones', label: 'Funciones', roles: ['ADMINISTRADOR'] },
  { to: '/usuarios', label: 'Usuarios', roles: ['ADMINISTRADOR'] },
  { to: '/boleteria/registro', label: 'Registro presencial', roles: ['BOLETERIA', 'ADMINISTRADOR'] },
  { to: '/boleteria/venta', label: 'Venta boletería', roles: ['BOLETERIA', 'ADMINISTRADOR'] },
  { to: '/acceso/validar', label: 'Control de acceso', roles: ['ACCESO', 'ADMINISTRADOR'] },
  { to: '/compra', label: 'Comprar boletos', roles: ['CLIENTE'] },
  { to: '/historial', label: 'Mi historial', roles: ['CLIENTE'] },
  { to: '/reportes', label: 'Reportes', roles: ['ADMINISTRADOR'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const roles = Array.isArray(user?.idRol) ? user.idRol : typeof user?.idRol === 'string' ? [user.idRol] : [];

  const visibleItems = navItems.filter(
    (item) => user && item.roles.some(r => roles.includes(r))
  );

  const rolesDisplay = roles.map(r => roleLabels[r]).join(', ') || '';

  return (
    <div className="min-h-screen bg-cinema-black">
      <header className="border-b border-white/10 bg-gradient-to-r from-[#09090f] via-[#110f1a] to-[#1f160d] shadow-[0_35px_120px_-65px_rgba(255,158,0,0.45)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <Link to="/" className="no-underline">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center">
                <img src={logoImg} alt="Cine La Paz Logo" className="w-10 h-10 object-contain brightness-0 invert" />
              </div>
              <div>
                <p className="text-4xl font-semibold uppercase tracking-[0.35em] text-cinema-gold">CINE LA PAZ</p>
              </div>
            </div>
          </Link>

          {user ? (
            <div className="flex flex-col items-start gap-3 sm:items-end md:flex-row md:items-center md:gap-6 md:items-center">
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-white">{user.nombreCompleto}</p>
                <p className="text-xs text-cinema-gray">{rolesDisplay}</p>
              </div>
              <button className="btn-secondary text-xs" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          ) : (
            <div className="hidden rounded-full border border-cinema-gold/30 bg-cinema-gold/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cinema-gold md:block">
              Cine La Paz
            </div>
          )}
        </div>
      </header>

      {user && (
        <nav className="border-b border-white/5 bg-white/[0.02]">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6 py-2">
            {visibleItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  location.pathname === item.to
                    ? 'bg-cinema-gold text-cinema-black'
                    : 'text-cinema-gray hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <main className="relative z-10 mx-auto max-w-7xl overflow-x-hidden px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
