import type { AuthUser } from '../types';

type View = 'inicio' | 'registro-presencial' | 'usuarios';

interface HomePageProps {
  user: AuthUser;
  onNavigate: (view: View) => void;
}

const roleLabels = {
  ADMINISTRADOR: 'Administrador',
  BOLETERIA: 'Boletería',
  CLIENTE: 'Cliente'
};

export default function HomePage({ user, onNavigate }: HomePageProps) {
  const isAdmin = user.idRol === 'ADMINISTRADOR';
  const isBoleteria = user.idRol === 'BOLETERIA';

  return (
    <section className="space-y-8">
      <div className="card-cine p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-cinema-gold/30 bg-cinema-gold/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-cinema-gold">
              Sesión activa
            </div>
            <h2 className="mt-5 text-3xl font-bold text-white">Hola, {user.nombreCompleto}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-cinema-gray">
              Bienvenido al portal del cine. Las opciones disponibles se muestran según el perfil con el que ingresaste.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-sm leading-7 text-cinema-gray">
            <p><span className="font-semibold text-cinema-cream">Rol:</span> {roleLabels[user.idRol]}</p>
            <p><span className="font-semibold text-cinema-cream">Correo:</span> {user.correo}</p>
            <p><span className="font-semibold text-cinema-cream">CI:</span> {user.ci || 'No registrado'}</p>
          </div>
        </div>
      </div>

      {user.idRol === 'CLIENTE' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card-cine p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-cinema-gold">Mi cuenta</p>
            <p className="mt-4 text-2xl font-bold text-white">Activa</p>
            <p className="mt-2 text-sm leading-7 text-cinema-gray">
              Tu usuario está listo para los siguientes procesos del sistema de cine.
            </p>
          </div>
          <div className="card-cine p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-cinema-gold">Acceso</p>
            <p className="mt-4 text-2xl font-bold text-white">Validado</p>
            <p className="mt-2 text-sm leading-7 text-cinema-gray">
              El ingreso se realizó correctamente con las credenciales guardadas.
            </p>
          </div>
          <div className="card-cine p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-cinema-gold">Próximo paso</p>
            <p className="mt-4 text-2xl font-bold text-white">Continuar módulos</p>
            <p className="mt-2 text-sm leading-7 text-cinema-gray">
              Esta base queda preparada para compras, reservas o consulta de funciones.
            </p>
          </div>
        </div>
      )}

      {(isAdmin || isBoleteria) && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card-cine p-7">
            <h3 className="text-xl font-semibold text-white">Registrar cliente presencial</h3>
            <p className="mt-3 text-sm leading-7 text-cinema-gray">
              Cree una cuenta para clientes atendidos en boletería y entregue la contraseña temporal generada por el sistema.
            </p>
            <button className="btn-primary mt-6" onClick={() => onNavigate('registro-presencial')}>
              Abrir registro
            </button>
          </div>

          {isAdmin && (
            <div className="card-cine p-7">
              <h3 className="text-xl font-semibold text-white">Administrar usuarios</h3>
              <p className="mt-3 text-sm leading-7 text-cinema-gray">
                Revise cuentas activas, cree nuevos accesos y aplique bajas lógicas cuando corresponda.
              </p>
              <button className="btn-primary mt-6" onClick={() => onNavigate('usuarios')}>
                Ver usuarios
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
