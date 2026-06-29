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

  // Filters
  const [filterPelicula, setFilterPelicula] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterSalaTipo, setFilterSalaTipo] = useState('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');

  // Estados para la vista previa del boleto (carrusel de QRs individuales)
  const [showModal, setShowModal] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState<any>(null);
  const [modalBoletos, setModalBoletos] = useState<any[]>([]);
  const [modalQrUrls, setModalQrUrls] = useState<string[]>([]);
  const [currentTicketIndex, setCurrentTicketIndex] = useState(0);

  const getCleanSalaCode = (idSala?: string) => {
    if (!idSala) return '';
    return idSala.includes('SALA-')
      ? 'S' + idSala.split('-').pop()
      : (idSala.startsWith('S') ? idSala : 'S' + idSala);
  };

  const fetchHistorial = () => {
    if (!user) return;
    api.historialCliente(user.idUsuario)
      .then(res => setHistorial(res.historial))
      .catch(err => setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al cargar historial.' }));
  };

  useEffect(() => {
    fetchHistorial();
  }, [user]);

  const handleDescargarPdf = async (numero: string) => {
    try {
      const blob = await api.descargarComprobantePdf(numero);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${numero}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage({ type: 'error', text: 'No se pudo descargar el comprobante.' });
    }
  };

  const handleVerTickets = async (venta: any) => {
    setSelectedVenta(venta);
    try {
      const res = await api.obtenerBoletos(venta.idVenta);
      const boletosList = res.boletos || [];
      setModalBoletos(boletosList);
      setCurrentTicketIndex(0);
      
      // Generar URLs de QR para cada boleto individual
      const qrPromises = boletosList.map(async (b: any) => {
        const qrData = b.codigoAcceso || String(b.idBoleto);
        return QRCode.toDataURL(qrData);
      });
      
      const urls = await Promise.all(qrPromises);
      setModalQrUrls(urls);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'No se pudieron cargar los boletos para visualización.' });
    }
  };

  const handleCancel = async (idVenta: number) => {
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
  };

  const uniqueSalaTipos = [...new Set(historial.map(h => h.salaTipo).filter(Boolean))].sort();

  const historialFiltrado = historial.filter(h => {
    if (filterPelicula && !h.peliculaTitulo.toLowerCase().includes(filterPelicula.toLowerCase())) return false;
    if (filterEstado && h.estadoVenta !== filterEstado) return false;
    if (filterSalaTipo && h.salaTipo !== filterSalaTipo) return false;
    if (filterFechaDesde) {
      const d = parseLocalDate(h.fecha);
      if (d && d < parseLocalDate(filterFechaDesde)!) return false;
    }
    if (filterFechaHasta) {
      const d = parseLocalDate(h.fecha);
      if (d && d > parseLocalDate(filterFechaHasta)!) return false;
    }
    return true;
  });

  const parseLocalDate = (fecha: string | Date | null) => {
    if (!fecha) return null;
    if (fecha instanceof Date) return fecha;
    const match = fecha.match(/\d{4}-\d{2}-\d{2}/);
    if (!match) return new Date(fecha); // Fallback
    const [y, m, d] = match[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const buildFuncionDateTime = (fecha: string | Date | null, hora: string | undefined) => {
    if (!fecha) return null;
    const localDate = parseLocalDate(fecha);
    if (!localDate) return null;
    if (hora) {
      const [h, m] = hora.split(':').map(Number);
      if (!Number.isNaN(h) && !Number.isNaN(m)) {
        localDate.setHours(h, m, 0, 0);
      }
    }
    return localDate;
  };

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Mi historial de compras</h2>
        <span className="text-xs text-cinema-gray">{historialFiltrado.length} de {historial.length} compra(s)</span>
      </div>
      {message && <Message type={message.type} text={message.text} />}

      {/* Filters */}
      <div className="card-cine p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[160px] flex-1">
            <span className="label-cine block mb-1">Película</span>
            <input
              type="text"
              value={filterPelicula}
              onChange={e => setFilterPelicula(e.target.value)}
              placeholder="Buscar..."
              className="input-cine mt-0"
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <span className="label-cine block mb-1">Estado</span>
            <select
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value)}
              className="input-cine mt-0"
            >
              <option value="">Todos</option>
              <option value="COMPLETADA">Completada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
          <div className="min-w-[140px] flex-1">
            <span className="label-cine block mb-1">Tipo sala</span>
            <select
              value={filterSalaTipo}
              onChange={e => setFilterSalaTipo(e.target.value)}
              className="input-cine mt-0"
            >
              <option value="">Todas</option>
              {uniqueSalaTipos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[130px] flex-1">
            <span className="label-cine block mb-1">Fecha desde</span>
            <input
              type="date"
              value={filterFechaDesde}
              onChange={e => setFilterFechaDesde(e.target.value)}
              className="input-cine mt-0"
            />
          </div>
          <div className="min-w-[130px] flex-1">
            <span className="label-cine block mb-1">Fecha hasta</span>
            <input
              type="date"
              value={filterFechaHasta}
              onChange={e => setFilterFechaHasta(e.target.value)}
              className="input-cine mt-0"
            />
          </div>
          <div className="flex items-center pb-0.5">
            <button
              type="button"
              onClick={() => { setFilterPelicula(''); setFilterEstado(''); setFilterSalaTipo(''); setFilterFechaDesde(''); setFilterFechaHasta(''); }}
              className="btn-secondary px-3 py-2 text-xs"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="card-cine overflow-hidden">
        {/* VISTA MÓVIL (Tarjetas) */}
        <div className="md:hidden flex flex-col gap-4 p-4">
          {historialFiltrado.map((h, i) => {
            const canCancel = h.estadoVenta === 'COMPLETADA' && (() => {
              const fechaFuncion = buildFuncionDateTime(h.fecha, h.horaInicio);
              if (!fechaFuncion) return false;
              const now = new Date();
              const diffHours = (fechaFuncion.getTime() - now.getTime()) / (1000 * 60 * 60);
              return diffHours >= 24;
            })();

            return (
              <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex justify-end items-start">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider ${
                    h.estadoVenta === 'COMPLETADA' ? 'bg-emerald-500/20 text-emerald-300' :
                    h.estadoVenta === 'CANCELADA' ? 'bg-red-500/20 text-red-300' :
                    'bg-cinema-gold/20 text-cinema-gold'
                  }`}>
                    {h.estadoVenta || '—'}
                  </span>
                </div>
                
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-cinema-gray font-bold">Película</span>
                  <p className="text-white font-bold text-base leading-tight">{h.peliculaTitulo}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-cinema-gray font-bold">Fecha / Hora</span>
                    <p className="text-white">
                      {h.fecha ? parseLocalDate(h.fecha)?.toLocaleDateString('es-BO') : '—'} <br/>
                      <span className="text-cinema-cream text-xs">{h.horaInicio?.substring(0, 5)}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-cinema-gray font-bold">Sala / Asientos</span>
                    <p className="text-white">
                      Sala {h.idSala ? h.idSala.replace('SALA-', '') : ''} {h.salaTipo ? `(${h.salaTipo})` : ''} <br/>
                      <span className="text-cinema-cream text-xs">{h.asientos}</span>
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                     <span className="text-[10px] uppercase tracking-wider text-cinema-gray font-bold">Total</span>
                     <p className="text-cinema-gold font-bold text-lg">Bs. {Number(h.montoTotal).toFixed(2)}</p>
                  </div>
                </div>

                {(h.estadoVenta === 'COMPLETADA' || canCancel) && (
                  <div className="flex flex-col gap-2 pt-3 border-t border-white/5">
                    {h.estadoVenta === 'COMPLETADA' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="flex-1 rounded-lg bg-cinema-gold hover:bg-cinema-gold/80 text-cinema-black py-2.5 text-xs font-bold transition flex justify-center items-center gap-1.5"
                          onClick={() => handleVerTickets(h)}
                        >
                          🔍 Ver Tickets
                        </button>
                        <button
                          type="button"
                          className="flex-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white py-2.5 text-xs font-bold transition flex justify-center items-center gap-1.5"
                          onClick={() => handleDescargarPdf(h.numero)}
                        >
                          📥 PDF
                        </button>
                      </div>
                    )}
                    {canCancel && (
                      <button
                        className="w-full rounded-lg bg-red-600/90 py-2.5 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50 transition"
                        disabled={loadingCancel === h.idVenta}
                        onClick={() => handleCancel(h.idVenta)}
                      >
                        {loadingCancel === h.idVenta ? 'Cancelando...' : 'Cancelar Compra'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {historialFiltrado.length === 0 && (
            <div className="p-8 text-center text-cinema-gray text-sm">{historial.length === 0 ? 'No tienes compras registradas.' : 'No hay resultados con los filtros aplicados.'}</div>
          )}
        </div>

        {/* VISTA DESKTOP (Tabla) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-cinema-gray">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.15em] text-cinema-cream">
              <tr>
                <th className="px-3 py-3 w-[22%]">Película</th>
                <th className="px-3 py-3 w-[12%]">Fecha</th>
                <th className="px-3 py-3 w-[8%]">Hora</th>
                <th className="px-3 py-3 w-[10%]">Sala</th>
                <th className="px-3 py-3 w-[10%]">Asientos</th>
                <th className="px-3 py-3 w-[10%]">Total</th>
                <th className="px-3 py-3 w-[10%]">Estado</th>
                <th className="px-3 py-3 w-[18%]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {historialFiltrado.map((h, i) => {
                const canCancel = h.estadoVenta === 'COMPLETADA' && (() => {
                  const fechaFuncion = buildFuncionDateTime(h.fecha, h.horaInicio);
                  if (!fechaFuncion) return false;
                  const now = new Date();
                  const diffHours = (fechaFuncion.getTime() - now.getTime()) / (1000 * 60 * 60);
                  return diffHours >= 24;
                })();

                return (
                  <tr key={i} className="border-t border-white/5">
                    <td className="px-3 py-3 truncate max-w-0" title={h.peliculaTitulo}>{h.peliculaTitulo}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{h.fecha ? parseLocalDate(h.fecha)?.toLocaleDateString('es-BO') : '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{h.horaInicio?.substring(0, 5)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">Sala {h.idSala ? h.idSala.replace('SALA-', '') : ''} {h.salaTipo ? `(${h.salaTipo})` : ''}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{h.asientos}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-cinema-gold font-semibold">Bs. {Number(h.montoTotal).toFixed(2)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        h.estadoVenta === 'COMPLETADA' ? 'bg-emerald-500/20 text-emerald-300' :
                        h.estadoVenta === 'CANCELADA' ? 'bg-red-500/20 text-red-300' :
                        'bg-cinema-gold/20 text-cinema-gold'
                      }`}>
                        {h.estadoVenta || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {h.estadoVenta === 'COMPLETADA' && (
                          <>
                            <button
                              type="button"
                              className="rounded-lg bg-cinema-gold hover:bg-cinema-gold/80 text-cinema-black px-2 py-1 text-[11px] font-bold transition"
                              onClick={() => handleVerTickets(h)}
                            >
                              Tickets
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white px-2 py-1 text-[11px] font-bold transition"
                              onClick={() => handleDescargarPdf(h.numero)}
                            >
                              PDF
                            </button>
                          </>
                        )}
                        {canCancel && (
                          <button
                            className="rounded-lg bg-red-600/90 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition whitespace-nowrap"
                            disabled={loadingCancel === h.idVenta}
                            onClick={() => handleCancel(h.idVenta)}
                          >
                            {loadingCancel === h.idVenta ? '...' : 'Cancelar'}
                          </button>
                        )}
                        {h.estadoVenta !== 'COMPLETADA' && !canCancel && (
                          <span className="text-[11px] text-cinema-gray">{h.estadoVenta === 'CANCELADA' ? '—' : '—'}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {historialFiltrado.length === 0 && (
                <tr><td className="px-3 py-8 text-center" colSpan={8}>{historial.length === 0 ? 'No tienes compras registradas.' : 'No hay resultados con los filtros aplicados.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VENTANA EMERGENTE (MODAL) CON VISTA PREVIA Y ACCIONES DE BOLETOS INDIVIDUALES */}
      {showModal && selectedVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-center">
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0d14] p-6 shadow-2xl space-y-5">
            {/* Header del Modal */}
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cinema-gold">Vista Previa de Boleto</h4>
              <button 
                onClick={() => setShowModal(false)}
                className="text-cinema-gray hover:text-white transition"
                title="Cerrar vista previa"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Cuerpo del Boleto Estilo Físico */}
            <div className="border border-dashed border-white/20 bg-white/[0.01] rounded-xl p-5 space-y-4 text-center relative overflow-hidden">
              {/* Semicírculos laterales de boleto de cine */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-7 bg-[#0d0d14] border-r border-t border-b border-white/10 rounded-r-full"></div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-7 bg-[#0d0d14] border-l border-t border-b border-white/10 rounded-l-full"></div>

              <div className="text-sm font-black tracking-[0.25em] text-cinema-gold">CINE LA PAZ</div>
              <div className="text-[10px] text-cinema-gray font-mono uppercase tracking-widest">Boleto de Entrada</div>
              
              <hr className="border-white/5 my-1" />

              <div className="space-y-1 text-left text-xs">
                <div className="mb-2">
                  <p className="text-cinema-gray uppercase text-[9px] tracking-wider font-bold">Película</p>
                  <p className="font-bold text-white text-sm truncate">{selectedVenta.peliculaTitulo}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <p className="text-cinema-gray uppercase text-[8px] tracking-wider font-bold">Sala</p>
                    <p className="font-medium text-white">{selectedVenta.idSala}</p>
                  </div>
                  <div>
                    <p className="text-cinema-gray uppercase text-[8px] tracking-wider font-bold">Fecha</p>
                     <p className="font-medium text-white">{selectedVenta.fecha ? parseLocalDate(selectedVenta.fecha)?.toLocaleDateString('es-BO') : ''}</p>
                  </div>
                  <div>
                    <p className="text-cinema-gray uppercase text-[8px] tracking-wider font-bold">Horario</p>
                    <p className="font-medium text-white">{selectedVenta.horaInicio?.substring(0, 5)}</p>
                  </div>
                  <div>
                    <p className="text-cinema-gray uppercase text-[8px] tracking-wider font-bold">Asiento</p>
                    <p className="font-medium text-cinema-gold font-mono truncate">
                      {modalBoletos[currentTicketIndex]
                        ? (modalBoletos[currentTicketIndex].idAsiento.includes('-')
                            ? modalBoletos[currentTicketIndex].idAsiento.split('-').pop()
                            : modalBoletos[currentTicketIndex].idAsiento)
                        : ''}
                    </p>
                  </div>
                </div>
              </div>

              <hr className="border-white/5 my-1" />

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-2.5 bg-white rounded-xl mx-auto w-36 h-36 border-2 border-cinema-gold shadow-lg shadow-black/40">
                {modalQrUrls[currentTicketIndex] ? (
                  <img src={modalQrUrls[currentTicketIndex]} alt="Boleto QR" className="w-32 h-32" />
                ) : (
                  <div className="h-32 w-32 animate-pulse bg-cinema-gray/20 rounded-lg"></div>
                )}
              </div>

              <div className="text-xs font-mono font-black text-cinema-gold tracking-wide mt-2 bg-white/5 py-1.5 px-2 rounded-lg border border-white/5">
                CÓDIGO DE ACCESO: {modalBoletos[currentTicketIndex]?.codigoAcceso || `#${modalBoletos[currentTicketIndex]?.idBoleto}`}
              </div>
              <div className="text-[10px] text-cinema-gray font-mono">
                Comprobante: {selectedVenta.numero || 'N/A'}
              </div>
              <div className="text-[10px] text-cinema-gold font-bold">
                ¡Presenta este QR para ingresar a la sala!
              </div>
              <div className="text-[9px] text-cinema-gray font-mono">
                (Para ingreso manual por teclado use el Nro: {modalBoletos[currentTicketIndex]?.idBoleto})
              </div>
            </div>

            {/* Controles de Navegación de Boletos (Si hay más de uno) */}
            {modalBoletos.length > 1 && (
              <div className="flex justify-between items-center px-1 text-xs text-cinema-cream">
                <button
                  type="button"
                  disabled={currentTicketIndex === 0}
                  onClick={() => setCurrentTicketIndex(prev => prev - 1)}
                  className="rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1.5 font-bold transition disabled:opacity-30 disabled:pointer-events-none"
                >
                  ◀ Anterior
                </button>
                <span className="font-semibold text-cinema-gray">
                  Boleto {currentTicketIndex + 1} de {modalBoletos.length}
                </span>
                <button
                  type="button"
                  disabled={currentTicketIndex === modalBoletos.length - 1}
                  onClick={() => setCurrentTicketIndex(prev => prev + 1)}
                  className="rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-1.5 font-bold transition disabled:opacity-30 disabled:pointer-events-none"
                >
                  Siguiente ▶
                </button>
              </div>
            )}

            {/* Acciones del Modal */}
            <div className="flex flex-col gap-2">
              <button 
                type="button"
                onClick={() => handleDescargarPdf(selectedVenta.numero)}
                className="btn-primary py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 w-full"
              >
                📥 Descargar Boleto PDF
              </button>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 text-xs uppercase tracking-wider transition w-full"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
