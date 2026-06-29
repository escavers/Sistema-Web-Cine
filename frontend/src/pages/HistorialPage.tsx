import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Message from '../components/Message';
import { api } from '../services/api';
import * as QRCode from 'qrcode';

export default function HistorialPage() {
  const { user } = useAuth();
  const [historial, setHistorial] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loadingCancel, setLoadingCancel] = useState<number | null>(null);

  const [filterPelicula, setFilterPelicula] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterSalaTipo, setFilterSalaTipo] = useState('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [showModal, setShowModal] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState<any>(null);
  const [modalBoletos, setModalBoletos] = useState<any[]>([]);
  const [modalQrUrls, setModalQrUrls] = useState<string[]>([]);
  const [currentTicketIndex, setCurrentTicketIndex] = useState(0);

  const fetchHistorial = () => {
    if (!user) return;
    api.historialCliente(user.idUsuario)
      .then(res => setHistorial(res.historial))
      .catch(err => setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al cargar historial.' }));
  };

  useEffect(() => { fetchHistorial(); }, [user]);
  useEffect(() => { setCurrentPage(1); }, [filterPelicula, filterEstado, filterSalaTipo, filterFechaDesde, filterFechaHasta]);

  const closeModal = () => {
    setShowModal(false);
    setSelectedVenta(null);
    setModalBoletos([]);
    setModalQrUrls([]);
    setCurrentTicketIndex(0);
  };

  const handleDescargarPdf = async (numero: string) => {
    try {
      const blob = await api.descargarComprobantePdf(numero);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${numero}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch {
      setMessage({ type: 'error', text: 'No se pudo descargar el comprobante.' });
    }
  };

  const handleDescargarTicket = async (numero: string) => {
    try {
      const blob = await api.descargarComprobanteTicketPdf(numero);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ticket-${numero}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch {
      setMessage({ type: 'error', text: 'No se pudo descargar el ticket.' });
    }
  };

  const handleVerTickets = async (venta: any) => {
    setSelectedVenta(venta);
    setModalBoletos([]);
    setModalQrUrls([]);
    setCurrentTicketIndex(0);
    try {
      const res = await api.obtenerBoletos(venta.idVenta);
      const boletosList = res.boletos || [];
      setModalBoletos(boletosList);

      const qrPromises = boletosList.map(async (b: any) => {
        const qrData = b.codigoAcceso || String(b.idBoleto);
        return QRCode.toDataURL(qrData);
      });

      const urls = await Promise.all(qrPromises);
      setModalQrUrls(urls);
      setShowModal(true);
    } catch {
      setSelectedVenta(null);
      setMessage({ type: 'error', text: 'No se pudieron cargar los boletos para visualización.' });
    }
  };

  const handleCancel = async (idVenta: number) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar esta compra? La acción requiere al menos 24 horas antes de la función.')) return;
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
  };

  const uniqueSalaTipos = [...new Set(historial.map(h => h.salaTipo).filter(Boolean))].sort();

  const parseLocalDate = (fecha: string | Date | null): Date | null => {
    if (!fecha) return null;
    if (fecha instanceof Date) return fecha;
    const match = fecha.match(/\d{4}-\d{2}-\d{2}/);
    if (!match) return new Date(fecha);
    const [y, m, d] = match[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const buildFuncionDateTime = (fecha: string | Date | null, hora: string | undefined): Date | null => {
    if (!fecha) return null;
    const localDate = parseLocalDate(fecha);
    if (!localDate) return null;
    if (hora) {
      const [h, m] = hora.split(':').map(Number);
      if (!Number.isNaN(h) && !Number.isNaN(m)) localDate.setHours(h, m, 0, 0);
    }
    return localDate;
  };

  const historialFiltrado = historial.filter(h => {
    if (filterPelicula && !h.peliculaTitulo.toLowerCase().includes(filterPelicula.toLowerCase())) return false;
    if (filterEstado && h.estadoVenta !== filterEstado) return false;
    if (filterSalaTipo && h.salaTipo !== filterSalaTipo) return false;
    if (filterFechaDesde) { const d = parseLocalDate(h.fecha); if (d && d < parseLocalDate(filterFechaDesde)!) return false; }
    if (filterFechaHasta) { const d = parseLocalDate(h.fecha); if (d && d > parseLocalDate(filterFechaHasta)!) return false; }
    return true;
  });

  const totalPages = Math.ceil(historialFiltrado.length / ITEMS_PER_PAGE) || 1;
  const paginatedData = historialFiltrado.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const canCancelVenta = (h: any) => {
    if (h.estadoVenta !== 'COMPLETADA') return false;
    const fechaFuncion = buildFuncionDateTime(h.fecha, h.horaInicio);
    if (!fechaFuncion) return false;
    return (fechaFuncion.getTime() - Date.now()) / (1000 * 60 * 60) >= 24;
  };

  const estadoBadge = (estado: string) => {
    const base = 'rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-wider';
    if (estado === 'COMPLETADA') return `${base} bg-emerald-500/20 text-emerald-300`;
    if (estado === 'CANCELADA') return `${base} bg-red-500/20 text-red-300`;
    return `${base} bg-cinema-gold/20 text-cinema-gold`;
  };

  return (
    <section className="space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-2xl font-bold text-white">Mi historial de compras</h2>
        <span className="text-[10px] sm:text-xs text-cinema-gray">{historialFiltrado.length} de {historial.length} · Pág. {currentPage}/{totalPages}</span>
      </div>
      {message && <Message type={message.type} text={message.text} />}

      {/* ── Filtros ── */}
      <div className="card-cine p-3 sm:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 items-end">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <span className="label-cine block mb-1">Película</span>
            <input type="text" value={filterPelicula} onChange={e => setFilterPelicula(e.target.value)} placeholder="Buscar..." className="input-cine mt-0" />
          </div>
          <div>
            <span className="label-cine block mb-1">Estado</span>
            <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="input-cine mt-0">
              <option value="">Todos</option>
              <option value="COMPLETADA">Completada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
          <div>
            <span className="label-cine block mb-1">Tipo sala</span>
            <select value={filterSalaTipo} onChange={e => setFilterSalaTipo(e.target.value)} className="input-cine mt-0">
              <option value="">Todas</option>
              {uniqueSalaTipos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <span className="label-cine block mb-1">Desde</span>
            <input type="date" value={filterFechaDesde} onChange={e => setFilterFechaDesde(e.target.value)} className="input-cine mt-0" />
          </div>
          <div>
            <span className="label-cine block mb-1">Hasta</span>
            <input type="date" value={filterFechaHasta} onChange={e => setFilterFechaHasta(e.target.value)} className="input-cine mt-0" />
          </div>
          <div className="col-span-2 sm:col-span-3 lg:col-span-1 flex justify-end">
            <button type="button" onClick={() => { setFilterPelicula(''); setFilterEstado(''); setFilterSalaTipo(''); setFilterFechaDesde(''); setFilterFechaHasta(''); }} className="btn-secondary px-3 py-2 text-xs w-full sm:w-auto">
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="card-cine overflow-hidden">
        {/* ── VISTA MÓVIL ── */}
        <div className="md:hidden flex flex-col gap-3 p-3 sm:p-4">
          {paginatedData.map((h, i) => {
            const cc = canCancelVenta(h);
            return (
              <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <span className={estadoBadge(h.estadoVenta)}>{h.estadoVenta || '—'}</span>
                  <span className="text-cinema-gold font-bold text-sm">Bs. {Number(h.montoTotal).toFixed(2)}</span>
                </div>
                <p className="text-white font-bold text-sm leading-tight">{h.peliculaTitulo}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-cinema-gray font-bold">Fecha / Hora</span>
                    <p className="text-white">{h.fecha ? parseLocalDate(h.fecha)?.toLocaleDateString('es-BO') : '—'} <span className="text-cinema-cream">{h.horaInicio?.substring(0, 5)}</span></p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-cinema-gray font-bold">Sala / Asientos</span>
                    <p className="text-white">Sala {h.idSala?.replace('SALA-', '')} {h.salaTipo ? `(${h.salaTipo})` : ''}</p>
                    <p className="text-cinema-cream text-[11px] truncate">{h.asientos}</p>
                  </div>
                </div>
                {h.estadoVenta === 'COMPLETADA' && (
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <button type="button" className="flex-1 rounded-lg bg-cinema-gold hover:bg-cinema-gold/80 text-cinema-black py-2 text-[11px] font-bold transition" onClick={() => handleVerTickets(h)}>
                      Ver Tickets
                    </button>
                    <button type="button" className="flex-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white py-2 text-[11px] font-bold transition" onClick={() => handleDescargarPdf(h.numero)}>
                      Comprobante
                    </button>
                    <button type="button" className="rounded-lg border border-cinema-gold/30 bg-cinema-gold/10 hover:bg-cinema-gold/20 text-cinema-gold py-2 px-2 text-[11px] font-bold transition" onClick={() => handleDescargarTicket(h.numero)} title="Descargar ticket térmico">
                      🎟️
                    </button>
                  </div>
                )}
                {cc && (
                  <button className="w-full rounded-lg bg-red-600/90 py-2 text-[11px] font-bold text-white hover:bg-red-500 disabled:opacity-50 transition" disabled={loadingCancel === h.idVenta} onClick={() => handleCancel(h.idVenta)}>
                    {loadingCancel === h.idVenta ? 'Cancelando...' : 'Cancelar Compra'}
                  </button>
                )}
              </div>
            );
          })}
          {historialFiltrado.length === 0 && (
            <div className="p-6 text-center text-cinema-gray text-sm">{historial.length === 0 ? 'No tienes compras registradas.' : 'No hay resultados.'}</div>
          )}
        </div>

        {/* ── VISTA DESKTOP (Tabla) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-cinema-gray">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.15em] text-cinema-cream">
              <tr>
                <th className="px-3 py-3">Película</th>
                <th className="px-3 py-3">Fecha</th>
                <th className="px-3 py-3">Hora</th>
                <th className="px-3 py-3">Sala</th>
                <th className="px-3 py-3">Asientos</th>
                <th className="px-3 py-3">Total</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((h, i) => {
                const cc = canCancelVenta(h);
                return (
                  <tr key={i} className="border-t border-white/5">
                    <td className="px-3 py-3 truncate max-w-[180px]" title={h.peliculaTitulo}>{h.peliculaTitulo}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{h.fecha ? parseLocalDate(h.fecha)?.toLocaleDateString('es-BO') : '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{h.horaInicio?.substring(0, 5)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">Sala {h.idSala?.replace('SALA-', '')} {h.salaTipo ? `(${h.salaTipo})` : ''}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs">{h.asientos}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-cinema-gold font-semibold">Bs. {Number(h.montoTotal).toFixed(2)}</td>
                    <td className="px-3 py-3 whitespace-nowrap"><span className={estadoBadge(h.estadoVenta)}>{h.estadoVenta || '—'}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        {h.estadoVenta === 'COMPLETADA' && (
                          <>
                            <button type="button" className="rounded-lg bg-cinema-gold hover:bg-cinema-gold/80 text-cinema-black px-2 py-1 text-[11px] font-bold transition" onClick={() => handleVerTickets(h)}>
                              Tickets
                            </button>
                            <button type="button" className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white px-2 py-1 text-[11px] font-bold transition" onClick={() => handleDescargarPdf(h.numero)}>
                              PDF
                            </button>
                            <button type="button" className="rounded-lg border border-cinema-gold/30 bg-cinema-gold/10 hover:bg-cinema-gold/20 text-cinema-gold px-2 py-1 text-[11px] font-bold transition" onClick={() => handleDescargarTicket(h.numero)} title="Ticket térmico">
                              🎟️
                            </button>
                          </>
                        )}
                        {cc && (
                          <button className="rounded-lg bg-red-600/90 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition whitespace-nowrap" disabled={loadingCancel === h.idVenta} onClick={() => handleCancel(h.idVenta)}>
                            {loadingCancel === h.idVenta ? '...' : 'Cancelar'}
                          </button>
                        )}
                        {h.estadoVenta !== 'COMPLETADA' && !cc && <span className="text-[11px] text-cinema-gray">—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {historialFiltrado.length === 0 && (
                <tr><td className="px-3 py-8 text-center" colSpan={8}>{historial.length === 0 ? 'No tienes compras registradas.' : 'No hay resultados.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Paginación ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-cinema-gray/70 transition hover:border-white/20 hover:text-white disabled:opacity-30 disabled:pointer-events-none">
            Ant.
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} type="button" onClick={() => setCurrentPage(p)} className={`rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold transition ${p === currentPage ? 'bg-cinema-gold/15 text-cinema-gold shadow-sm shadow-cinema-gold/5' : 'text-cinema-gray/60 hover:bg-white/[0.04] hover:text-white'}`}>
              {p}
            </button>
          ))}
          <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-cinema-gray/70 transition hover:border-white/20 hover:text-white disabled:opacity-30 disabled:pointer-events-none">
            Sig.
          </button>
        </div>
      )}

      {/* ── MODAL BOLETO ── */}
      {showModal && selectedVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4" onClick={closeModal}>
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d14] p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-cinema-gold">Vista Previa de Boleto</h4>
              <button onClick={closeModal} className="text-cinema-gray hover:text-white transition" title="Cerrar">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Boleto */}
            <div className="border border-dashed border-white/20 bg-white/[0.01] rounded-xl p-4 sm:p-5 space-y-3 sm:space-y-4 text-center relative overflow-hidden">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-[#0d0d14] border-r border-t border-b border-white/10 rounded-r-full" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-[#0d0d14] border-l border-t border-b border-white/10 rounded-l-full" />

              <div className="text-xs sm:text-sm font-black tracking-[0.25em] text-cinema-gold">CINE LA PAZ</div>
              <div className="text-[9px] sm:text-[10px] text-cinema-gray font-mono uppercase tracking-widest">Boleto de Entrada</div>
              <hr className="border-white/5 my-1" />

              <div className="space-y-1 text-left text-[11px] sm:text-xs">
                <div className="mb-2">
                  <p className="text-cinema-gray uppercase text-[8px] sm:text-[9px] tracking-wider font-bold">Película</p>
                  <p className="font-bold text-white text-xs sm:text-sm truncate">{selectedVenta.peliculaTitulo}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-cinema-gray uppercase text-[7px] sm:text-[8px] tracking-wider font-bold">Sala</p>
                    <p className="font-medium text-white">{selectedVenta.idSala}</p>
                  </div>
                  <div>
                    <p className="text-cinema-gray uppercase text-[7px] sm:text-[8px] tracking-wider font-bold">Fecha</p>
                    <p className="font-medium text-white">{selectedVenta.fecha ? parseLocalDate(selectedVenta.fecha)?.toLocaleDateString('es-BO') : ''}</p>
                  </div>
                  <div>
                    <p className="text-cinema-gray uppercase text-[7px] sm:text-[8px] tracking-wider font-bold">Horario</p>
                    <p className="font-medium text-white">{selectedVenta.horaInicio?.substring(0, 5)}</p>
                  </div>
                  <div>
                    <p className="text-cinema-gray uppercase text-[7px] sm:text-[8px] tracking-wider font-bold">Asiento</p>
                    <p className="font-medium text-cinema-gold font-mono truncate">
                      {modalBoletos[currentTicketIndex]
                        ? (modalBoletos[currentTicketIndex].idAsiento.includes('-')
                            ? modalBoletos[currentTicketIndex].idAsiento.split('-').pop()
                            : modalBoletos[currentTicketIndex].idAsiento)
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <hr className="border-white/5 my-1" />

              {/* QR */}
              <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl mx-auto w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] border-2 border-cinema-gold shadow-lg shadow-black/40">
                {modalQrUrls[currentTicketIndex] ? (
                  <img src={modalQrUrls[currentTicketIndex]} alt="Boleto QR" className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px]" />
                ) : (
                  <div className="h-[100px] w-[100px] sm:h-[120px] sm:w-[120px] animate-pulse bg-cinema-gray/20 rounded-lg" />
                )}
              </div>

              <div className="text-[10px] sm:text-xs font-mono font-black text-cinema-gold tracking-wide bg-white/5 py-1.5 px-2 rounded-lg border border-white/5 break-all">
                CÓDIGO: {modalBoletos[currentTicketIndex]?.codigoAcceso || `#${modalBoletos[currentTicketIndex]?.idBoleto}`}
              </div>
              <div className="text-[9px] sm:text-[10px] text-cinema-gray font-mono">
                Comprobante: {selectedVenta.numero || 'N/A'}
              </div>
              <div className="text-[9px] sm:text-[10px] text-cinema-gold font-bold">
                ¡Presenta este QR para ingresar a la sala!
              </div>
              <div className="text-[8px] sm:text-[9px] text-cinema-gray font-mono">
                (Ingreso manual: {modalBoletos[currentTicketIndex]?.idBoleto})
              </div>
            </div>

            {/* Navegación entre boletos */}
            {modalBoletos.length > 1 && (
              <div className="flex justify-between items-center px-1 text-[11px] sm:text-xs text-cinema-cream">
                <button type="button" disabled={currentTicketIndex === 0} onClick={() => setCurrentTicketIndex(prev => prev - 1)} className="rounded-lg bg-white/5 hover:bg-white/10 px-2 sm:px-2.5 py-1.5 font-bold transition disabled:opacity-30 disabled:pointer-events-none">
                  ◀ Ant.
                </button>
                <span className="font-semibold text-cinema-gray">
                  {currentTicketIndex + 1} / {modalBoletos.length}
                </span>
                <button type="button" disabled={currentTicketIndex === modalBoletos.length - 1} onClick={() => setCurrentTicketIndex(prev => prev + 1)} className="rounded-lg bg-white/5 hover:bg-white/10 px-2 sm:px-2.5 py-1.5 font-bold transition disabled:opacity-30 disabled:pointer-events-none">
                  Sig. ▶
                </button>
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => handleDescargarPdf(selectedVenta.numero)} className="btn-primary py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 w-full">
                📥 Descargar Comprobante PDF
              </button>
              <button type="button" onClick={() => handleDescargarTicket(selectedVenta.numero)} className="rounded-xl border border-cinema-gold/30 bg-cinema-gold/10 hover:bg-cinema-gold/20 text-cinema-gold font-bold py-2 sm:py-2.5 text-[11px] sm:text-xs uppercase tracking-wider transition w-full flex items-center justify-center gap-1.5">
                🎟️ Descargar Ticket Térmico
              </button>
              <button type="button" onClick={closeModal} className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold py-2 sm:py-2.5 text-[11px] sm:text-xs uppercase tracking-wider transition w-full">
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
