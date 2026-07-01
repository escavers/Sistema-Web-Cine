import { Link } from 'react-router-dom';
import type { AuthUser } from '../types';

interface HeaderProps {
  user: AuthUser | null;
  onLogout: () => void;
}

const roleLabels: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  BOLETERIA: 'Boletería',
  CLIENTE: 'Cliente',
  ACCESO: 'Encargado de Acceso',
};

export default function Header({ user, onLogout }: HeaderProps) {
  const rolesDisplay = user?.idRol?.map((rol) => roleLabels[rol] ?? rol).join(', ') || '';

  const handleLogout = () => {
    onLogout();
  };

  return (
    <header className="border-b border-white/10 bg-cinema-black/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cinema-gold">
            Portal Cine
          </p>

          <h1 className="mt-1 text-2xl font-bold text-white">
            Acceso de usuarios
          </h1>
        </div>

        {user ? (
          <div className="flex items-center gap-4">
            {/* Redirección directa a la página de perfil con un Link */}
            <Link
              to="/perfil"
              className="group flex flex-col text-right items-end justify-center cursor-pointer focus:outline-none"
              title="Ir a mi perfil"
            >
              <p className="text-sm font-semibold text-white group-hover:text-cinema-gold transition-colors duration-200 flex items-center gap-1">
                {user.nombreCompleto || `${user.nombre1} ${user.apellidoP}`}
                <span className="text-[11px] opacity-60 group-hover:opacity-100 transition-opacity">⚙️</span>
              </p>

              <p className="text-xs text-cinema-gray group-hover:text-cinema-gray/80 transition-colors duration-200">
                {rolesDisplay}
              </p>
            </Link>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleLogout}
            >
              Cerrar sesión
            </button>
          </div>
        ) : (
          <div className="hidden rounded-full border border-cinema-gold/30 bg-cinema-gold/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cinema-gold md:block">
            Clientes y personal autorizado
          </div>
        )}
      </div>
    </header>
  );
}