import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Rol } from '../types';

const roleLabels: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  BOLETERIA: 'Boletería',
  CLIENTE: 'Cliente',
};

interface NavItem {
  to: string;
  label: string;
  roles: Rol[];
}

const navItems: NavItem[] = [
  { to: '/', label: 'Inicio', roles: ['ADMINISTRADOR', 'BOLETERIA', 'CLIENTE'] },
  { to: '/peliculas', label: 'Cartelera', roles: ['ADMINISTRADOR'] },
  { to: '/salas', label: 'Salas', roles: ['ADMINISTRADOR'] },
  { to: '/funciones', label: 'Funciones', roles: ['ADMINISTRADOR'] },
  { to: '/usuarios', label: 'Usuarios', roles: ['ADMINISTRADOR'] },
  { to: '/boleteria/registro', label: 'Registro presencial', roles: ['BOLETERIA', 'ADMINISTRADOR'] },
  { to: '/boleteria/venta', label: 'Venta boletería', roles: ['BOLETERIA', 'ADMINISTRADOR'] },
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

  const visibleItems = navItems.filter(
    (item) => user && item.roles.includes(user.idRol)
  );

  return (
    <div className="min-h-screen bg-cinema-black">
      <header className="border-b border-white/10 bg-cinema-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="no-underline">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cinema-gold">Cine La Paz</p>
            <h1 className="mt-0.5 text-xl font-bold text-white">Portal de Usuarios</h1>
          </Link>

          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-white">{user.nombreCompleto}</p>
                <p className="text-xs text-cinema-gray">{roleLabels[user.idRol]}</p>
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

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
