import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Message from '../components/Message';
import { api } from '../services/api';

export default function HistorialPage() {
  const { user } = useAuth();
  const [historial, setHistorial] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loadingCancel, setLoadingCancel] = useState<number | null>(null);

  const [filterEstado, setFilterEstado] = useState('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  const [searchPelicula, setSearchPelicula] = useState('');

  const fetchHistorial = useCallback(() => {
    if (!user) return;
    api.historialCliente(user.idUsuario)
      .then(res => {
        setHistorial(res.historial);
        setPage(1);
      })
      .catch(err => setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al cargar historial.' }));
  }, [user]);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  // rerender-functional-setstate: functional setState para reset estable
  useEffect(() => {
    setPage(1);
  }, [filterEstado, filterFechaDesde, filterFechaHasta, searchPelicula]);

  const handleCancel = useCallback(async (idVenta: number) => {
    const confirmCancel = window.confirm('¿Estás seguro de que deseas cancelar esta compra? La acción requiere al menos 24 horas antes de la función.');
    if (!confirmCancel) return;

    setMessage(null);
    setLoadingCancel(idVenta);
    try {
      const res = await api.cancelarVenta(idVenta);
      setMessage({ type: 'ok', text: res.mensaje });
      fetchHistorial();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al cancelar la compra.' });
    } finally {
      setLoadingCancel(null);
    }
  }, [fetchHistorial]);

  const buildFuncionDateTime = useCallback((fecha: string | Date | null, hora: string | undefined) => {
    if (!fecha) return null;
    const fechaObj = new Date(fecha);
    if (Number.isNaN(fechaObj.getTime())) return null;
    if (hora) {
      const [h, m] = hora.split(':').map(Number);
      if (!Number.isNaN(h) && !Number.isNaN(m)) {
        fechaObj.setHours(h, m, 0, 0);
      }
    }
    return fechaObj;
  }, []);

  const downloadPdf = useCallback(async (numero: string) => {
    try {
      const blob = await api.descargarComprobantePdf(numero);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${numero}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setMessage({ type: 'error', text: 'Error al descargar el PDF' });
    }
  }, []);

  // rerender-derived-state + js-combine-iterations: filtrar y calcular totales en un solo paso
  const { filteredHistorial, totalMonto } = useMemo(() => {
    let total = 0;
    const filtered = historial.filter(h => {
      if (filterEstado && h.estadoVenta !== filterEstado) return false;

      if (filterFechaDesde) {
        const hDate = h.fecha ? new Date(h.fecha).toISOString().split('T')[0] : '';
        if (hDate < filterFechaDesde) return false;
      }

      if (filterFechaHasta) {
        const hDate = h.fecha ? new Date(h.fecha).toISOString().split('T')[0] : '';
        if (hDate > filterFechaHasta) return false;
      }

      if (searchPelicula) {
        const title = h.peliculaTitulo?.toLowerCase() || '';
        if (!title.includes(searchPelicula.toLowerCase())) return false;
      }

      total += Number(h.montoTotal || 0);
      return true;
    });
    return { filteredHistorial: filtered, totalMonto: total };
  }, [historial, filterEstado, filterFechaDesde, filterFechaHasta, searchPelicula]);

  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredHistorial.length / itemsPerPage);
  const currentItems = filteredHistorial.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const hasActiveFilters = filterEstado || filterFechaDesde || filterFechaHasta || searchPelicula;

  const clearFilters = useCallback(() => {
    setFilterEstado('');
    setFilterFechaDesde('');
    setFilterFechaHasta('');
    setSearchPelicula('');
  }, []);

  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-bold text-white">Mi historial de compras</h2>
      {message && <Message type={message.type} text={message.text} />}

      <div className="card-cine p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="label-cine">Buscar por película</label>
            <input
              type="text"
              className="input-cine"
              placeholder="Ej: Mufasa..."
              value={searchPelicula}
              onChange={e => setSearchPelicula(e.target.value)}
            />
          </div>
          <div>
            <label className="label-cine">Desde</label>
            <input
              type="date"
              className="input-cine"
              value={filterFechaDesde}
              onChange={e => setFilterFechaDesde(e.target.value)}
            />
          </div>
          <div>
            <label className="label-cine">Hasta</label>
            <input
              type="date"
              className="input-cine"
              value={filterFechaHasta}
              onChange={e => setFilterFechaHasta(e.target.value)}
            />
          </div>
          <div>
            <label className="label-cine">Filtrar por estado</label>
            <select
              className="input-cine"
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="COMPLETADA">Completada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
        </div>
        {hasActiveFilters && (
          <div className="mt-3 flex items-center gap-4">
            <button
              className="text-xs font-semibold text-cinema-gold underline transition hover:text-white"
              onClick={clearFilters}
            >
              Limpiar filtros
            </button>
            <span className="text-xs text-cinema-gray">
              Mostrando {filteredHistorial.length} de {historial.length} compras | Total: Bs. {totalMonto.toFixed(2)}
            </span>
          </div>
        )}
        {!hasActiveFilters && historial.length > 0 && (
          <div className="mt-3 text-xs text-cinema-gray">
            Total: {historial.length} compras | Bs. {historial.reduce((s, h) => s + Number(h.montoTotal || 0), 0).toFixed(2)}
          </div>
        )}
      </div>

      <div className="card-cine overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-cinema-gray" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.15em] text-cinema-cream">
              <tr>
                <th className="px-5 py-4">Comprobante</th>
                <th className="px-5 py-4">Película</th>
                <th className="px-5 py-4">Fecha función</th>
                <th className="px-5 py-4">Horario</th>
                <th className="px-5 py-4">Sala</th>
                <th className="px-5 py-4">Asientos</th>
                <th className="px-5 py-4">Total</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4">Acción</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((h, i) => {
                const canCancel = h.estadoVenta === 'COMPLETADA' && (() => {
                  const fechaFuncion = buildFuncionDateTime(h.fecha, h.horaInicio);
                  if (!fechaFuncion) return false;
                  const diffHours = (fechaFuncion.getTime() - Date.now()) / (1000 * 60 * 60);
                  return diffHours >= 24;
                })();

                return (
                  <tr key={h.numero || i} className="border-t border-white/5">
                    <td className="px-5 py-4 text-white font-medium">
                      <div>{h.numero}</div>
                      {h.estadoVenta === 'COMPLETADA' && (
                        <button
                          onClick={() => downloadPdf(h.numero)}
                          className="mt-2 inline-flex items-center gap-1 rounded bg-white/[0.05] px-2 py-1 text-[10px] uppercase tracking-wider text-cinema-gold transition hover:bg-cinema-gold hover:text-black"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                          PDF
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-4">{h.peliculaTitulo}</td>
                    <td className="px-5 py-4">{h.fecha ? new Date(h.fecha).toLocaleDateString('es-BO') : '—'}</td>
                    <td className="px-5 py-4">{h.horaInicio?.substring(0, 5)}</td>
                    <td className="px-5 py-4">{h.salaTipo || h.idSala}</td>
                    <td className="px-5 py-4">{h.asientos}</td>
                    <td className="px-5 py-4 text-cinema-gold font-semibold">Bs. {Number(h.montoTotal).toFixed(2)}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        h.estadoVenta === 'COMPLETADA' ? 'bg-emerald-500/20 text-emerald-300' :
                        h.estadoVenta === 'CANCELADA' ? 'bg-red-500/20 text-red-300' :
                        'bg-cinema-gold/20 text-cinema-gold'
                      }`}>
                        {h.estadoVenta || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {canCancel ? (
                        <button
                          className="rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                          disabled={loadingCancel === h.idVenta}
                          onClick={() => handleCancel(h.idVenta)}
                        >
                          {loadingCancel === h.idVenta ? 'Cancelando…' : 'Cancelar'}
                        </button>
                      ) : (
                        <span className="text-xs text-cinema-cream">No cancelable</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredHistorial.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center" colSpan={9}>
                    {historial.length === 0 ? 'No tienes compras registradas.' : 'No hay compras que coincidan con los filtros.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/5 px-5 py-4 bg-white/[0.01]">
            <p className="text-sm text-cinema-gray">
              Página <span className="font-semibold text-white">{page}</span> de <span className="font-semibold text-white">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              <button
                className="btn-secondary px-3 py-1 text-xs"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <button
                className="btn-secondary px-3 py-1 text-xs"
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
