import { useState, useEffect } from 'react';
import { api } from '../services/api';
import Message from '../components/Message';

export default function PromocionesPage() {
  const [funciones, setFunciones] = useState<any[]>([]);
  const [reglas, setReglas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const [filterPelicula, setFilterPelicula] = useState('');
  const [filterEstado, setFilterEstado] = useState('TODOS');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.obtenerFuncionesPromocion();
      setFunciones(res.funciones || []);
      setReglas(res.reglas || null);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Error al conectar con el servidor para cargar las promociones.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const parseLocalDate = (fecha: string | Date | null): Date | null => {
    if (!fecha) return null;
    if (fecha instanceof Date) return fecha;
    const match = fecha.match(/\d{4}-\d{2}-\d{2}/);
    if (!match) return new Date(fecha);
    const [y, m, d] = match[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const filteredFunciones = funciones.filter(f => {
    if (filterPelicula && !f.peliculaTitulo.toLowerCase().includes(filterPelicula.toLowerCase())) return false;
    if (filterEstado === 'ACTIVO' && !f.promocionActiva) return false;
    if (filterEstado === 'INACTIVO' && f.promocionActiva) return false;
    return true;
  });

  return (
    <section className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex rounded-full bg-cinema-gold/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-cinema-gold mb-2">
            Modulo de Marketing
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-white">Promociones del Cine</h2>
          <p className="text-sm text-cinema-gray">
            Panel informativo de reglas de negocio y estado de la promocion automatica 2x1 en cartelera.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="btn-secondary flex items-center justify-center gap-1.5 self-start sm:self-center"
        >
          Actualizar
        </button>
      </div>

      {message && <Message type={message.type} text={message.text} />}

      <div className="card-cine p-5 sm:p-6 bg-gradient-to-br from-cinema-gold/5 via-transparent to-transparent">
        <h3 className="text-md sm:text-lg font-black text-cinema-gold uppercase tracking-wider mb-3">
          Reglas del 2x1 Automatico
        </h3>
        <p className="text-xs sm:text-sm text-cinema-cream/90 leading-relaxed mb-4">
          La promocion se aplica de forma <strong>100% automatizada</strong> en el sistema de ventas para incentivar la asistencia a funciones de peliculas que ya pasaron su periodo de estreno y tienen alta disponibilidad de asientos.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {reglas?.condiciones?.map((c: string, idx: number) => (
            <div key={idx} className="flex gap-3 items-start bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-xl">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cinema-gold/15 text-cinema-gold text-xs font-bold font-mono">
                {idx + 1}
              </span>
              <div>
                <p className="text-xs sm:text-sm text-white/90 font-medium">
                  {idx === 0 ? "Mas de 30 dias en cartelera" : "Menos del 70% de ocupacion"}
                </p>
                <p className="text-[11px] text-cinema-gray mt-0.5">{c}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-cine p-4">
        <div className="grid gap-3 sm:grid-cols-3 items-end">
          <div>
            <span className="label-cine block mb-1">Buscar Pelicula</span>
            <input
              type="text"
              value={filterPelicula}
              onChange={e => setFilterPelicula(e.target.value)}
              placeholder="Ej: Inside Out..."
              className="input-cine mt-0"
            />
          </div>
          <div>
            <span className="label-cine block mb-1">Filtrar por Estado 2x1</span>
            <select
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value)}
              className="input-cine mt-0"
            >
              <option value="TODOS">Todos</option>
              <option value="ACTIVO">2x1 Activo</option>
              <option value="INACTIVO">2x1 Inactivo</option>
            </select>
          </div>
          <div className="text-cinema-gray text-xs sm:text-right pb-3 font-medium">
            Mostrando {filteredFunciones.length} de {funciones.length} funciones
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cinema-gold border-t-transparent" />
          <span className="text-xs text-cinema-gray font-medium">Analizando cartelera y ocupacion...</span>
        </div>
      ) : (
        <div className="card-cine overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-white/[0.02] text-cinema-cream/60 border-b border-white/5 uppercase tracking-wider text-[10px] font-bold">
                  <th className="px-4 py-3.5">Pelicula</th>
                  <th className="px-4 py-3.5">Fecha y Hora</th>
                  <th className="px-4 py-3.5">Sala</th>
                  <th className="px-4 py-3.5">Ocupacion</th>
                  <th className="px-4 py-3.5">Estado Promocion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredFunciones.map((f) => {
                  let badgeClass = "bg-gray-500/15 text-gray-400 border-gray-500/20";
                  let statusText = "Inactivo";
                  let tooltip = "";

                  if (f.promocionActiva) {
                    badgeClass = "bg-amber-500/15 text-amber-400 border-amber-500/30";
                    statusText = "2x1 Activo";
                    tooltip = "Cumple todas las condiciones.";
                  } else if (!f.masDe30Dias) {
                    badgeClass = "bg-blue-500/15 text-blue-400 border-blue-500/20";
                    statusText = "Estreno (<30d)";
                    tooltip = "Pelicula demasiado reciente en cartelera.";
                  } else if (f.porcentajeOcupacion >= 70) {
                    badgeClass = "bg-rose-500/15 text-rose-400 border-rose-500/20";
                    statusText = "Alta Ocupacion (>=70%)";
                    tooltip = "Ocupacion superior al limite permitido para la oferta.";
                  }

                  return (
                    <tr key={f.idFuncion} className="hover:bg-white/[0.01] transition-colors duration-150">
                      <td className="px-4 py-4">
                        <div className="font-bold text-white text-xs sm:text-sm">{f.peliculaTitulo}</div>
                        <div className="text-[10px] text-cinema-gray/60 mt-0.5">
                          Estreno: {f.fechaEstreno ? parseLocalDate(f.fechaEstreno)?.toLocaleDateString('es-BO') : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-white font-medium">
                          {f.fecha ? parseLocalDate(f.fecha)?.toLocaleDateString('es-BO') : '—'}
                        </div>
                        <div className="text-[10px] text-cinema-gray mt-0.5">
                          {f.horaInicio?.substring(0, 5)} - {f.horaFin?.substring(0, 5)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-white font-medium">Sala {f.idSala?.replace('SALA-', '')}</div>
                        <div className="text-[10px] text-cinema-gray uppercase tracking-wider">{f.salaTipo}</div>
                      </td>
                      <td className="px-4 py-4 min-w-[150px]">
                        <div className="flex justify-between items-center text-[10px] text-cinema-gray font-medium mb-1">
                          <span>{f.vendidos} / {f.capacidadTotal} boletos</span>
                          <span className={f.porcentajeOcupacion >= 70 ? "text-rose-400" : "text-cinema-cream"}>
                            {f.porcentajeOcupacion.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-white/[0.04] rounded-full h-1.5 overflow-hidden border border-white/5">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              f.porcentajeOcupacion >= 70 ? 'bg-rose-500' : 'bg-cinema-gold'
                            }`}
                            style={{ width: `${Math.min(f.porcentajeOcupacion, 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider border ${badgeClass}`}
                          title={tooltip}
                        >
                          {statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredFunciones.length === 0 && (
                  <tr>
                    <td className="px-4 py-12 text-center text-cinema-gray/80 font-medium" colSpan={5}>
                      {funciones.length === 0 ? 'No hay funciones registradas.' : 'No se encontraron resultados con los filtros aplicados.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
