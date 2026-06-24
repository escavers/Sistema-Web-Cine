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
  const rolesDisplay = user?.idRol.map(r => roleLabels[r] ?? r).join(', ') || '';

  return (
    <header className="border-b border-white/10 bg-cinema-black/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cinema-gold">Portal Cine</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Acceso de usuarios</h1>
        </div>

        {user ? (
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-white">{user.nombreCompleto}</p>
              <p className="text-xs text-cinema-gray">{rolesDisplay}</p>
            </div>
            <button className="btn-secondary" onClick={onLogout}>Cerrar sesión</button>
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
