import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const roleLabels = { ADMINISTRADOR: 'Administrador', BOLETERIA: 'Boletería', CLIENTE: 'Cliente' };

export default function HomePage() {
  const { user } = useAuth();
  if (!user) return null;

  const isAdmin = user.idRol === 'ADMINISTRADOR';
  const isBoleteria = user.idRol === 'BOLETERIA';
  const isCliente = user.idRol === 'CLIENTE';

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
              Bienvenido al portal de Cine La Paz. Las opciones disponibles se muestran según el perfil con el que ingresaste.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-sm leading-7 text-cinema-gray">
            <p><span className="font-semibold text-cinema-cream">Rol:</span> {roleLabels[user.idRol]}</p>
            <p><span className="font-semibold text-cinema-cream">Correo:</span> {user.correo}</p>
            <p><span className="font-semibold text-cinema-cream">CI:</span> {user.ci || 'No registrado'}</p>
          </div>
        </div>
      </div>

      {isCliente && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Link to="/compra" className="card-cine p-6 transition hover:border-cinema-gold/30">
            <p className="text-sm uppercase tracking-[0.2em] text-cinema-gold">Comprar boletos</p>
            <p className="mt-4 text-2xl font-bold text-white">Cartelera</p>
            <p className="mt-2 text-sm leading-7 text-cinema-gray">Explora las películas en cartelera y compra tus boletos online.</p>
          </Link>
          <Link to="/historial" className="card-cine p-6 transition hover:border-cinema-gold/30">
            <p className="text-sm uppercase tracking-[0.2em] text-cinema-gold">Historial</p>
            <p className="mt-4 text-2xl font-bold text-white">Mis compras</p>
            <p className="mt-2 text-sm leading-7 text-cinema-gray">Consulta tus compras anteriores y comprobantes.</p>
          </Link>
          <div className="card-cine p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-cinema-gold">Cuenta</p>
            <p className="mt-4 text-2xl font-bold text-white">Activa</p>
            <p className="mt-2 text-sm leading-7 text-cinema-gray">Tu usuario está listo para usar en el portal.</p>
          </div>
        </div>
      )}

      {(isAdmin || isBoleteria) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {isBoleteria && (
            <>
              <Link to="/boleteria/registro" className="card-cine p-7 transition hover:border-cinema-gold/30">
                <h3 className="text-xl font-semibold text-white">Registrar cliente presencial</h3>
                <p className="mt-3 text-sm leading-7 text-cinema-gray">Cree cuentas para clientes atendidos en boletería.</p>
                <span className="btn-primary mt-6 inline-block">Abrir registro</span>
              </Link>
              <Link to="/boleteria/venta" className="card-cine p-7 transition hover:border-cinema-gold/30">
                <h3 className="text-xl font-semibold text-white">Venta de boletos</h3>
                <p className="mt-3 text-sm leading-7 text-cinema-gray">Registre ventas presenciales de boletos.</p>
                <span className="btn-primary mt-6 inline-block">Iniciar venta</span>
              </Link>
            </>
          )}
          {isAdmin && (
            <>
              <Link to="/peliculas" className="card-cine p-7 transition hover:border-cinema-gold/30">
                <h3 className="text-xl font-semibold text-white">Gestión de películas</h3>
                <p className="mt-3 text-sm leading-7 text-cinema-gray">Administre la cartelera del cine.</p>
                <span className="btn-primary mt-6 inline-block">Ver películas</span>
              </Link>
              <Link to="/funciones" className="card-cine p-7 transition hover:border-cinema-gold/30">
                <h3 className="text-xl font-semibold text-white">Gestión de funciones</h3>
                <p className="mt-3 text-sm leading-7 text-cinema-gray">Administre los horarios y precios de las funciones.</p>
                <span className="btn-primary mt-6 inline-block">Ver funciones</span>
              </Link>
              <Link to="/salas" className="card-cine p-7 transition hover:border-cinema-gold/30">
                <h3 className="text-xl font-semibold text-white">Gestión de salas</h3>
                <p className="mt-3 text-sm leading-7 text-cinema-gray">Administre las salas y configure los asientos.</p>
                <span className="btn-primary mt-6 inline-block">Ver salas</span>
              </Link>
              <Link to="/usuarios" className="card-cine p-7 transition hover:border-cinema-gold/30">
                <h3 className="text-xl font-semibold text-white">Administrar usuarios</h3>
                <p className="mt-3 text-sm leading-7 text-cinema-gray">Cree cuentas, active o desactive usuarios del sistema.</p>
                <span className="btn-primary mt-6 inline-block">Ver usuarios</span>
              </Link>
              <Link to="/reportes" className="card-cine p-7 transition hover:border-cinema-gold/30">
                <h3 className="text-xl font-semibold text-white">Reportes</h3>
                <p className="mt-3 text-sm leading-7 text-cinema-gray">Consulte métricas de ocupación, ventas y películas más vistas.</p>
                <span className="btn-primary mt-6 inline-block">Ver reportes</span>
              </Link>
            </>
          )}
        </div>
      )}
    </section>
  );
}
