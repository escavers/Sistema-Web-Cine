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
  { to: '/boleteria/registro', label: 'Registro Asistido', roles: ['BOLETERIA'] },
  { to: '/boleteria/venta', label: 'Venta boletería', roles: ['BOLETERIA', 'ADMINISTRADOR'] },
  { to: '/acceso/validar', label: 'Control de acceso', roles: ['ACCESO', 'ADMINISTRADOR'] },
  { to: '/compra', label: 'Comprar boletos', roles: ['CLIENTE'] },
  { to: '/historial', label: 'Mi historial', roles: ['CLIENTE'] },
  { to: '/reportes', label: 'Reportes', roles: ['ADMINISTRADOR'] },
  { to: '/promociones', label: 'Promociones', roles: ['ADMINISTRADOR'] },
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
    <div className="flex min-h-screen flex-col bg-cinema-black">
      {/* Gold accent bar */}
      <div className="h-[3px] bg-gradient-to-r from-cinema-gold/20 via-cinema-gold to-cinema-gold/20" />

      <header className="border-b border-white/10 bg-[linear-gradient(90deg,#08080d_0%,#0a0a14_75%,#1f0f00_100%)] shadow-[0_40px_100px_-50px_rgba(245,158,11,0.3)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <Link to="/" className="no-underline group">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.06] transition group-hover:border-cinema-gold/30 group-hover:shadow-lg group-hover:shadow-cinema-gold/5">
                <img src={logoImg} alt="Cine La Paz Logo" className="w-8 h-8 object-contain brightness-0 invert" />
              </div>
              <div>
                <p className="text-3xl font-black uppercase tracking-[0.4em] text-cinema-gold drop-shadow-[0_0_12px_rgba(245,158,11,0.2)]">CINE LA PAZ</p>
              </div>
            </div>
          </Link>

          {user ? (
            <div className="flex flex-col items-start gap-3 sm:items-end md:flex-row md:items-center md:gap-5">
              
              {/* CORRECCIÓN: Botón interactivo de perfil con diseño premium integrado en el Layout */}
              <button
                type="button"
                onClick={() => navigate('/perfil')}
                className="group flex items-center gap-3 text-right cursor-pointer focus:outline-none bg-transparent border-none p-1 rounded-xl border border-transparent hover:border-cinema-gold/30 hover:bg-cinema-gold/5 transition-all duration-300"
                title="Ver mi perfil"
              >
                {/* Iniciales en un badge circular dorado brillante */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cinema-gold text-black font-black text-sm tracking-wide shadow-md shadow-cinema-gold/20 group-hover:scale-105 transition-transform duration-200">
                  {user.nombre1?.charAt(0).toUpperCase() || 'U'}
                  {user.apellidoP?.charAt(0).toUpperCase() || ''}
                </div>

                {/* Nombres y Roles del Usuario autenticado */}
                <div className="hidden md:block text-right">
                  <p className="text-sm font-bold text-white group-hover:text-cinema-gold transition-colors duration-200">
                    {user.nombreCompleto || `${user.nombre1} ${user.apellidoP}`}
                  </p>
                  <p className="text-[10px] text-cinema-gold bg-cinema-gold/10 px-1.5 py-0.5 rounded border border-cinema-gold/20 inline-block font-bold tracking-wider mt-0.5 uppercase">
                    {rolesDisplay}
                  </p>
                </div>
              </button>

              {/* Separador vertical */}
              <div className="h-6 w-px bg-white/10 hidden md:block" />

              <button 
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-cinema-gray/80 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white" 
                onClick={handleLogout}
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <div className="hidden rounded-full border border-cinema-gold/20 bg-cinema-gold/[0.06] px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cinema-gold/80 md:block">
              Cine La Paz
            </div>
          )}
        </div>
      </header>

      {user && (
        <nav className="border-b border-white/[0.03] bg-white/[0.01]">
          <div className="mx-auto flex max-w-7xl gap-0.5 overflow-x-auto px-6 py-2">
            {visibleItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={location.pathname === item.to ? 'page' : undefined}
                className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                  location.pathname === item.to
                    ? 'bg-cinema-gold/15 text-cinema-gold shadow-sm shadow-cinema-gold/5'
                    : 'text-cinema-gray/70 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 overflow-x-hidden px-6 py-8">
        <Outlet />
      </main>

      {user && roles.includes('CLIENTE') && (
        <footer className="border-t border-white/[0.04] bg-white/[0.01]">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 py-8 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="Cine La Paz" className="h-6 w-6 object-contain brightness-0 invert opacity-40" />
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-cinema-gold/60">Cine La Paz</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-cinema-gray/40">
              <span>&copy; {new Date().getFullYear()} Cine La Paz</span>
              <span className="hidden sm:inline">·</span>
              <Link to="/compra" className="transition hover:text-cinema-gold/60">Comprar boletos</Link>
              <span className="hidden sm:inline">·</span>
              <Link to="/historial" className="transition hover:text-cinema-gold/60">Mi historial</Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}