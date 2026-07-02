import { useState, useEffect } from 'react';
import { api } from '../services/api';
import Message from '../components/Message';

// Elimina acentos y convierte a minusculas para comparaciones insensibles
function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseLocalDate(fecha: string | Date | null): Date | null {
  if (!fecha) return null;
  if (fecha instanceof Date) return fecha;
  const match = (fecha as string).match(/\d{4}-\d{2}-\d{2}/);
  if (!match) return new Date(fecha as string);
  const [y, m, d] = match[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function PromocionesPage() {
  const [funciones, setFunciones] = useState<any[]>([]);
  const [reglas, setReglas] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const [filterPelicula, setFilterPelicula] = useState('');
  const [filterEstado, setFilterEstado] = useState('TODOS');
  const [expandedPeliculas, setExpandedPeliculas] = useState<Set<number>>(new Set());

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

  useEffect(() => { loadData(); }, []);

  function togglePelicula(idPelicula: number) {
    setExpandedPeliculas(prev => {
      const next = new Set(prev);
      if (next.has(idPelicula)) next.delete(idPelicula);
      else next.add(idPelicula);
      return next;
    });
  }

  // -- Agrupar funciones por pelicula --
  const peliculasMap = new Map<number, { idPelicula: number; titulo: string; fechaEstreno: any; funciones: any[] }>();
  for (const f of funciones) {
    const id = f.idPelicula ?? f.peliculaTitulo; // fallback al titulo si no hay id
    if (!peliculasMap.has(id)) {
      peliculasMap.set(id, { idPelicula: id, titulo: f.peliculaTitulo, fechaEstreno: f.fechaEstreno, funciones: [] });
    }
    peliculasMap.get(id)!.funciones.push(f);
  }
  const todasLasPeliculas = Array.from(peliculasMap.values());

  // -- Filtrar por busqueda y estado --────────
  const peliculasFiltradas = todasLasPeliculas
    .filter(p => {
      if (filterPelicula && !normalizeStr(p.titulo).includes(normalizeStr(filterPelicula))) return false;
      if (filterEstado === 'ACTIVO' && !p.funciones.some(f => f.promocionActiva)) return false;
      if (filterEstado === 'INACTIVO' && p.funciones.some(f => f.promocionActiva)) return false;
      return true;
    })
    .map(p => ({
      ...p,
      funciones: p.funciones.filter(f => {
        if (filterEstado === 'ACTIVO' && !f.promocionActiva) return false;
        if (filterEstado === 'INACTIVO' && f.promocionActiva) return false;
        return true;
      })
    }))
    .filter(p => p.funciones.length > 0);

  const totalFuncionesVisibles = peliculasFiltradas.reduce((acc, p) => acc + p.funciones.length, 0);

  return (
    <section className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex rounded-full bg-cinema-gold/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-cinema-gold mb-2">
            Modulo de Marketing
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-white">Promociones del Cine</h2>
          <p className="text-sm text-cinema-gray">
            Panel informativo de reglas de negocio y estado de la promoción automática 2x1 en cartelera.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="btn-secondary flex items-center justify-center gap-1.5 self-start sm:self-center"
        >
          {loading ? '⏳ Actualizando...' : '⟳ Actualizar'}
        </button>
      </div>

      {message && <Message type={message.type} text={message.text} />}

      {/* Reglas del 2x1 */}
      <div className="card-cine p-5 sm:p-6 bg-gradient-to-br from-cinema-gold/5 via-transparent to-transparent">
        <h3 className="text-md sm:text-lg font-black text-cinema-gold uppercase tracking-wider mb-3 flex items-center gap-2">
          🎬 Reglas del 2x1 Automático
        </h3>
        <p className="text-xs sm:text-sm text-cinema-cream/90 leading-relaxed mb-4">
          La promoción se aplica de forma <strong>100% automatizada</strong> en el sistema de ventas para incentivar la asistencia a funciones de películas que ya pasaron su periodo de estreno y tienen alta disponibilidad de asientos.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {reglas?.condiciones?.map((c: string, idx: number) => (
            <div key={idx} className="flex gap-3 items-start bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-xl">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cinema-gold/15 text-cinema-gold text-xs font-bold font-mono">
                {idx + 1}
              </span>
              <div>
                <p className="text-xs sm:text-sm text-white/90 font-medium">
                  {idx === 0 ? 'Más de 30 días en cartelera' : 'Menos del 70% de ocupación'}
                </p>
                <p className="text-[11px] text-cinema-gray mt-0.5">{c}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="card-cine p-4">
        <div className="grid gap-3 sm:grid-cols-3 items-end">
          <div>
            <span className="label-cine block mb-1">Buscar Película</span>
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
            {peliculasFiltradas.length} película(s) · {totalFuncionesVisibles} función(es)
          </div>
        </div>
      </div>

      {/* Lista agrupada por película */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cinema-gold border-t-transparent" />
          <span className="text-xs text-cinema-gray font-medium">Analizando cartelera y ocupación...</span>
        </div>
      ) : peliculasFiltradas.length === 0 ? (
        <div className="card-cine p-10 text-center text-cinema-gray/80 font-medium">
          {funciones.length === 0 ? 'No hay funciones registradas.' : 'No se encontraron películas con los filtros aplicados.'}
        </div>
      ) : (
        <div className="space-y-3">
          {peliculasFiltradas.map(pelicula => {
            const tienePromo = pelicula.funciones.some(f => f.promocionActiva);
            const promoCount = pelicula.funciones.filter(f => f.promocionActiva).length;
            const expanded = expandedPeliculas.has(pelicula.idPelicula);

            return (
              <div key={pelicula.idPelicula} className="card-cine overflow-hidden">
                {/* Cabecera de Película */}
                <button
                  type="button"
                  onClick={() => togglePelicula(pelicula.idPelicula)}
                  className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm sm:text-base truncate">{pelicula.titulo}</span>
                        {tienePromo && (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400 tracking-wider uppercase">
                            🔥 {promoCount} con 2x1
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-cinema-gray mt-2 flex flex-wrap gap-4">
                        {(() => {
                          const fecha = pelicula.fechaEstreno ? parseLocalDate(pelicula.fechaEstreno) : null;
                          const dias = fecha ? Math.floor((new Date().getTime() - fecha.getTime()) / (1000 * 3600 * 24)) : 0;
                          const diasEn2x1 = Math.max(0, dias - 30);
                          return (
                            <>
                              <span><strong>Proyectada por 1ra vez:</strong> {fecha ? fecha.toLocaleDateString('es-BO') : '—'}</span>
                              <span><strong>Días en cartelera:</strong> {dias >= 0 ? dias : 0}</span>
                              {diasEn2x1 > 0 && <span><strong className="text-amber-400">Días en 2x1:</strong> <span className="text-amber-400">{diasEn2x1}</span></span>}
                            </>
                          );
                        })()}
                        {(() => {
                          const totalVendidos = pelicula.funciones.reduce((sum, f) => sum + f.vendidos, 0);
                          const totalCapacidad = pelicula.funciones.reduce((sum, f) => sum + f.capacidadTotal, 0);
                          const ocupacionGlobal = totalCapacidad > 0 ? (totalVendidos / totalCapacidad) * 100 : 0;
                          
                          const funciones2x1 = pelicula.funciones.filter(f => f.promocionActiva);
                          const vendidos2x1 = funciones2x1.reduce((sum, f) => sum + f.vendidos, 0);
                          const capacidad2x1 = funciones2x1.reduce((sum, f) => sum + f.capacidadTotal, 0);
                          const ocupacion2x1 = capacidad2x1 > 0 ? (vendidos2x1 / capacidad2x1) * 100 : 0;

                          return (
                            <>
                              <span><strong>Funciones programadas:</strong> {pelicula.funciones.length}</span>
                              <span><strong>Ocupación global:</strong> {ocupacionGlobal.toFixed(1)}%</span>
                              {funciones2x1.length > 0 && <span><strong className="text-amber-400">Ocupación en 2x1:</strong> <span className="text-amber-400">{ocupacion2x1.toFixed(1)}%</span></span>}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 text-cinema-gray text-lg">{expanded ? '▲' : '▼'}</span>
                </button>

                {/* Tabla de funciones (expandible) */}
                {expanded && (
                  <div className="border-t border-white/5 overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-white/[0.02] text-cinema-cream/60 border-b border-white/5 uppercase tracking-wider text-[10px] font-bold">
                          <th className="px-4 py-3">Fecha y Hora</th>
                          <th className="px-4 py-3">Sala</th>
                          <th className="px-4 py-3">Ocupación</th>
                          <th className="px-4 py-3">Estado 2x1</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {pelicula.funciones.map(f => {
                          let badgeClass = 'bg-gray-500/15 text-gray-400 border-gray-500/20';
                          let statusText = 'Inactivo';
                          let tooltip = '';

                          if (f.promocionActiva) {
                            badgeClass = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
                            statusText = '2x1 Activo';
                            tooltip = 'Cumple la condición de antigüedad.';
                          } else if (!f.masDe30Dias) {
                            badgeClass = 'bg-blue-500/15 text-blue-400 border-blue-500/20';
                            statusText = 'Fase de Estreno';
                            tooltip = 'Película demasiado reciente en cartelera.';
                          } else {
                            badgeClass = 'bg-gray-500/15 text-gray-400 border-gray-500/20';
                            statusText = '2x1 Inactivo';
                            tooltip = 'Promoción deshabilitada manualmente por el administrador.';
                          }

                          return (
                            <tr key={f.idFuncion} className="hover:bg-white/[0.01] transition-colors duration-150">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-white font-medium">
                                  {f.fecha ? parseLocalDate(f.fecha)?.toLocaleDateString('es-BO') : '—'}
                                </div>
                                <div className="text-[10px] text-cinema-gray mt-0.5">
                                  {f.horaInicio?.substring(0, 5)} – {f.horaFin?.substring(0, 5)}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-white font-medium">Sala {f.idSala?.replace('SALA-', '')}</div>
                                <div className="text-[10px] text-cinema-gray uppercase tracking-wider">{f.salaTipo}</div>
                              </td>
                              <td className="px-4 py-3 min-w-[140px]">
                                <div className="flex justify-between items-center text-[10px] text-cinema-gray font-medium mb-1">
                                  <span>{f.vendidos} / {f.capacidadTotal}</span>
                                  <span className={f.porcentajeOcupacion >= 70 ? 'text-rose-400' : 'text-cinema-cream'}>
                                    {f.porcentajeOcupacion.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full bg-white/[0.04] rounded-full h-1.5 overflow-hidden border border-white/5">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${f.porcentajeOcupacion >= 70 ? 'bg-rose-500' : 'bg-cinema-gold'}`}
                                    style={{ width: `${Math.min(f.porcentajeOcupacion, 100)}%` }}
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap align-top">
                                <details className="group">
                                  <summary className="cursor-pointer list-none flex items-center gap-2 outline-none">
                                    <span
                                      className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wider border ${badgeClass}`}
                                      title={tooltip}
                                    >
                                      {statusText}
                                    </span>
                                    <span className="text-cinema-gray text-xs group-open:rotate-180 transition-transform">▼</span>
                                  </summary>
                                  <div className="mt-2 text-[10px] text-cinema-gray bg-black/20 p-2.5 rounded border border-white/5 w-full whitespace-normal min-w-[240px]">
                                    <div className="font-bold text-white/80 mb-2 border-b border-white/10 pb-1">Análisis del Motor de Promociones:</div>
                                    <div className={`mb-2 ${f.masDe30Dias ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {f.masDe30Dias ? '✓' : '✗'} Regla de Antigüedad ({'>'} 30 días)
                                      <br />
                                      <span className="text-cinema-gray ml-3 opacity-90">
                                        {(() => {
                                          const fecha = pelicula.fechaEstreno ? parseLocalDate(pelicula.fechaEstreno) : null;
                                          const dias = fecha ? Math.floor((new Date().getTime() - fecha.getTime()) / (1000 * 3600 * 24)) : 0;
                                          const faltan = 30 - dias;
                                          return f.masDe30Dias 
                                            ? `Cumplido. Lleva ${dias - 30} día(s) en 2x1 (Total en cartelera: ${dias} días).`
                                            : `Incumplido. Faltan ${faltan > 0 ? faltan : 0} día(s) para poder aplicar.`;
                                        })()}
                                      </span>
                                    </div>
                                    <div className={`mt-2 pt-1.5 border-t border-white/10 font-black text-[11px] ${f.promocionActiva ? 'text-amber-400' : 'text-cinema-gray'}`}>
                                      {f.promocionActiva ? '➔ RESULTADO: 2x1 ACTIVADO' : '➔ RESULTADO: PROMOCIÓN DENEGADA'}
                                    </div>
                                  </div>
                                </details>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
