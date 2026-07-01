import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Message from '../components/Message';
import SeatMap from '../components/SeatMap.tsx';
import { api } from '../services/api';
import * as QRCode from 'qrcode';

export default function VentaPresencialPage() {
  const { user } = useAuth();
  const [funciones, setFunciones] = useState<any[]>([]);
  const [selectedFuncion, setSelectedFuncion] = useState<any>(null);
  const [asientos, setAsientos] = useState<any[]>([]);
  const [selectedAsientos, setSelectedAsientos] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formaPago, setFormaPago] = useState('EFECTIVO');
  const [nit, setNit] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const [showModal, setShowModal] = useState(false);
  const [modalBoletos, setModalBoletos] = useState<any[]>([]);
  const [modalQrUrls, setModalQrUrls] = useState<string[]>([]);
  const [currentTicketIndex, setCurrentTicketIndex] = useState(0);

  const [previewFuncion, setPreviewFuncion] = useState<any>(null);
  const [modalFunciones, setModalFunciones] = useState<any[]>([]);
  const [modalSelectedDate, setModalSelectedDate] = useState('');
  const [modalAvailableDates, setModalAvailableDates] = useState<string[]>([]);
  const [selectedModalFuncion, setSelectedModalFuncion] = useState<any>(null);
  const [selectedModalIsPast, setSelectedModalIsPast] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filtroClasificacion, setFiltroClasificacion] = useState('');
  const [filtroPromocion, setFiltroPromocion] = useState(false);

  useEffect(() => {
    api.listarFunciones().then(res => setFunciones(res.funciones)).catch(() => {});
  }, []);

  function formatDuration(minutes?: number | null) {
    if (minutes === null || minutes === undefined) return '—';
    const m = Number(minutes) || 0;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
  }

  // Construye un Date en hora local a partir de fecha 'YYYY-MM-DD' y hora 'HH:MM'
  function buildLocalDateTime(fecha?: string | Date | null, hora?: string | null) {
    if (!fecha) return null;
    let fechaStr = '';
    if (fecha instanceof Date) {
      fechaStr = fecha.toISOString().slice(0, 10);
    } else {
      const s = String(fecha);
      const match = s.match(/\d{4}-\d{2}-\d{2}/);
      if (!match) return null;
      fechaStr = match[0];
    }

    const [yStr, mStr, dStr] = fechaStr.slice(0, 10).split('-');
    const y = Number(yStr), m = Number(mStr), d = Number(dStr);
    if ([y, m, d].some(v => Number.isNaN(v))) return null;
    const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
    let horaToUse: string | null = hora || null;
    if (!horaToUse && typeof fecha === 'string') {
      const s = fecha as string;
      const timeMatch = s.match(/\d{2}:\d{2}(:\d{2})?/);
      if (timeMatch) horaToUse = timeMatch[0];
    }
    if (horaToUse) {
      const [hhStr, mmStr] = horaToUse.split(':');
      const hh = Number(hhStr || 0);
      const mm = Number(mmStr || 0);
      if (!Number.isNaN(hh)) dt.setHours(hh, Number.isNaN(mm) ? 0 : mm, 0, 0);
    }
    return dt;
  }

  const parseLocalDate = (fecha: string | Date | null) => {
    if (!fecha) return null;
    if (fecha instanceof Date) return fecha;
    const match = fecha.match(/\d{4}-\d{2}-\d{2}/);
    if (!match) return new Date(fecha); // Fallback
    const [y, m, d] = match[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  useEffect(() => {
    if (selectedModalFuncion) {
      const todayStr = new Date().toLocaleDateString('en-CA'); // Local date in YYYY-MM-DD
      const isToday = selectedModalFuncion.fecha === todayStr;
      const fechaHora = buildLocalDateTime(selectedModalFuncion.fecha, selectedModalFuncion.horaInicio || '00:00');
      const isPast = selectedModalFuncion.horaInicio
        ? (fechaHora ? fechaHora.getTime() <= Date.now() : true)
        : true;
      setSelectedModalIsPast(isPast);
    } else {
      setSelectedModalIsPast(false);
    }
  }, [selectedModalFuncion]);

  useEffect(() => {
    document.body.style.overflow = previewFuncion && step === 1 ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [previewFuncion, step]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (previewFuncion && step === 1) closePreviewModal();
        if (showModal) setShowModal(false);
      }
    }
    if (previewFuncion || showModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [previewFuncion, showModal, step]);

  function openMovieModal(f: any) {
    const funcionesPorPelicula = funciones.filter(fn => fn.peliculaTitulo === f.peliculaTitulo);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; // Local date in YYYY-MM-DD
    const fechasSet = new Set<string>(funcionesPorPelicula.map(fn => fn.fecha));
    fechasSet.add(todayStr);
    const fechas = Array.from(fechasSet).sort().filter(d => d >= todayStr);
    const selected = fechas[0] || '';

    setModalFunciones(funcionesPorPelicula);
    setModalAvailableDates(fechas);
    setModalSelectedDate(selected);
    setSelectedModalFuncion(null);
    setPreviewFuncion(f);
  }

  function closePreviewModal() {
    setPreviewFuncion(null);
    setModalFunciones([]);
    setSelectedModalFuncion(null);
    setModalAvailableDates([]);
    setModalSelectedDate('');
  }

  const clasificaciones = Array.from(new Set(funciones.map(f => f.peliculaClasificacion).filter(Boolean))) as string[];

  const peliculasFiltradas = (() => {
    const unique = Array.from(
      new Map(funciones.map(funcion => [funcion.idPelicula ?? funcion.peliculaTitulo, funcion])).values()
    );
    return unique.filter(f => {
      if (searchText && !f.peliculaTitulo?.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filtroClasificacion && f.peliculaClasificacion !== filtroClasificacion) return false;
      if (filtroPromocion && !funciones.some(fn => fn.peliculaTitulo === f.peliculaTitulo && fn.promocionActiva === 1)) return false;
      return true;
    });
  })();

  const modalFuncionesFiltradas = modalSelectedDate
    ? modalFunciones.filter(fn => fn.fecha === modalSelectedDate)
    : modalFunciones;

  const funcionesPorSala = modalFuncionesFiltradas.reduce<Record<string, any[]>>((acc, fn) => {
    const sala = fn.salaTipo || 'GENERAL';
    if (!acc[sala]) acc[sala] = [];
    acc[sala].push(fn);
    return acc;
  }, {});

  const getCleanSalaCode = (idSala?: string) => {
    if (!idSala) return '';
    return idSala.includes('SALA-')
      ? 'S' + idSala.split('-').pop()
      : (idSala.startsWith('S') ? idSala : 'S' + idSala);
  };

  // Generar QR y mostrar ventana emergente al procesar la venta presencial
  useEffect(() => {
    if (step === 3 && resultado?.idVenta) {
      api.obtenerBoletos(resultado.idVenta)
        .then(async (res: any) => {
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
        })
        .catch(err => console.error('Error al cargar boletos para modal:', err));
    } else {
      setShowModal(false);
      setModalBoletos([]);
      setModalQrUrls([]);
      setCurrentTicketIndex(0);
    }
  }, [step, resultado, selectedFuncion]);

  async function selectFuncion(f: any) {
    setSelectedFuncion(f);
    setSelectedAsientos([]);
    try {
      const res = await api.obtenerAsientosPorFuncion(f.idFuncion);
      setAsientos(res.asientos);
      setStep(2);
    } catch {
      setMessage({ type: 'error', text: 'No se pudieron cargar los asientos.' });
    }
  }

  function toggleAsiento(id: string) {
    setSelectedAsientos(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  }

  async function confirmarVenta() {
    if (!selectedFuncion || !selectedAsientos.length || !user) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.crearVenta({
        idEncargado: user.idUsuario,
        idFuncion: selectedFuncion.idFuncion,
        tipo: 'PRESENCIAL',
        formaPago,
        asientos: selectedAsientos,
        nitCliente: nit || null,
        razonSocialCliente: razonSocial || null,
        usuarioA: user.idUsuario,
      });
      setResultado(res);
      setStep(3);
      setMessage({ type: 'ok', text: 'Venta procesada correctamente.' });
      // Marcar asientos como vendidos en la UI
      setAsientos(prev => prev.map(a => selectedAsientos.includes(a.idAsiento) ? { ...a, estado: 0 } : a));
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al procesar la venta.' });
    } finally {
      setLoading(false);
    }
  }

  async function printTicket() {
    if (!resultado?.numeroComprobante) return;
    try {
      const blob = await api.descargarComprobanteTicketPdf(resultado.numeroComprobante);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      setMessage({ type: 'error', text: 'No se pudo generar la impresión del comprobante.' });
    }
  }

  async function downloadTicket() {
    if (!resultado?.numeroComprobante) return;
    try {
      const blob = await api.descargarComprobantePdf(resultado.numeroComprobante);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${resultado.numeroComprobante}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage({ type: 'error', text: 'No se pudo descargar el comprobante.' });
    }
  }

  function nuevaVenta() {
    setStep(1);
    setSelectedFuncion(null);
    setSelectedAsientos([]);
    setResultado(null);
    setMessage(null);
  }

  const is2x1 = selectedFuncion?.promocionActiva === 1;
  const seatsToPay = is2x1 ? Math.ceil(selectedAsientos.length / 2) : selectedAsientos.length;
  const precioTotal = selectedFuncion ? Number(selectedFuncion.precioBase) * seatsToPay : 0;


  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-bold text-white">Venta presencial de boletos</h2>

      {message && <Message type={message.type} text={message.text} />}

      {step === 1 && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-cinema-gray/50 pointer-events-none"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar película..."
                autoComplete="off"
                className="input-cine w-full pr-8"
                style={{ paddingLeft: '2.5rem' }}
              />
              {searchText && (
                <button type="button" onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-cinema-gray hover:text-white transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
            <select
              value={filtroClasificacion}
              onChange={(e) => setFiltroClasificacion(e.target.value)}
              className="input-cine w-auto min-w-[150px]"
            >
              <option value="">Todas las clasificaciones</option>
              {clasificaciones.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setFiltroPromocion(!filtroPromocion)}
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                filtroPromocion
                  ? 'border-cinema-gold/60 bg-cinema-gold/15 text-cinema-gold shadow-sm shadow-cinema-gold/10'
                  : 'border-white/[0.08] bg-white/[0.04] text-cinema-gray hover:border-white/20 hover:text-cinema-cream'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${filtroPromocion ? 'bg-cinema-gold' : 'bg-white/[0.15]'}`} />
              2x1
            </button>
          </div>

          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {peliculasFiltradas.map(f => (
              <div key={f.idPelicula ?? f.peliculaTitulo} className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#08080d] transition hover:border-cinema-gold/30">
                {f.peliculaPoster && (
                  <div className="relative overflow-hidden">
                    <img src={f.peliculaPoster} alt={f.peliculaTitulo} referrerPolicy="no-referrer" className="w-full object-contain max-h-[30rem] mx-auto transition duration-500 group-hover:scale-105" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%2318181b%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%22100%22 y=%22150%22 fill=%22%2352525b%22 font-family=%22system-ui%22 font-size=%2213%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3ESin imagen%3C/text%3E%3C/svg%3E'; e.currentTarget.onerror = null; }} />
                    <div className="pointer-events-none absolute inset-0 bg-black/0 transition duration-300 group-hover:bg-black/20" />
                    <button
                      type="button"
                      className="absolute left-1/2 bottom-4 z-10 -translate-x-1/2 rounded-full bg-cinema-gold px-5 py-3 text-sm font-semibold text-cinema-black shadow-lg shadow-black/20 opacity-0 transition duration-300 group-hover:opacity-100 whitespace-nowrap"
                      onClick={() => openMovieModal(f)}
                    >
                      Vender boletos
                    </button>
                  </div>
                )}
                <div className="space-y-3 p-5">
                  <h4 className="text-lg font-bold text-white leading-snug">
                    {f.peliculaTitulo}
                    {funciones.some(fn => fn.peliculaTitulo === f.peliculaTitulo && fn.promocionActiva === 1) && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-cinema-gold to-cinema-goldLight px-3 py-1 text-xs font-black uppercase tracking-wider text-cinema-black shadow-lg shadow-cinema-gold/25 align-middle">
                        🔥 2x1
                      </span>
                    )}
                  </h4>
                  <div className="flex flex-wrap gap-2 pt-2 text-xs uppercase tracking-[0.2em] text-cinema-cream">
                    <span className="rounded-full bg-white/5 px-3 py-1">{f.peliculaDuracion ? formatDuration(f.peliculaDuracion) : '—'}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1">{f.peliculaClasificacion || 'TP'}</span>
                    {f.peliculaFechaEstreno && (() => {
                      const estreno = new Date(f.peliculaFechaEstreno);
                      const hoy = new Date();
                      const dias = Math.floor((hoy.getTime() - estreno.getTime()) / (1000 * 60 * 60 * 24));
                      return dias > 0 ? (
                        <span className="rounded-full bg-white/5 px-3 py-1 text-cinema-gray/60">{dias} días en cartelera</span>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            ))}
            {peliculasFiltradas.length === 0 && (
              <p className="text-cinema-gray col-span-full text-center py-8">No hay películas disponibles en este momento.</p>
            )}
          </div>

          {previewFuncion && (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm p-4 md:items-center" role="dialog" aria-modal="true" aria-labelledby="preview-funcion-title">
              <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/[0.08] bg-[#08080d] shadow-2xl shadow-black/60 my-8 md:my-0">
                <div className="flex flex-col gap-6 p-6 lg:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 id="preview-funcion-title" className="text-2xl font-bold text-white lg:text-3xl">{previewFuncion.peliculaTitulo}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-cinema-gray">
                        {previewFuncion.peliculaDirector && <span>{previewFuncion.peliculaDirector}</span>}
                        {previewFuncion.peliculaDuracion && (
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {previewFuncion.peliculaDuracion} min
                          </span>
                        )}
                        <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-cinema-gold">{previewFuncion.peliculaClasificacion || 'TP'}</span>
                      </div>
                    </div>
                    <button className="btn-secondary shrink-0" onClick={closePreviewModal} aria-label="Cerrar">Cerrar</button>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
                    {/* Poster */}
                    <div className="hidden lg:block">
                      {previewFuncion.peliculaPoster ? (
                        <img src={previewFuncion.peliculaPoster} alt={previewFuncion.peliculaTitulo} referrerPolicy="no-referrer" className="w-full rounded-2xl bg-black object-cover aspect-[2/3]" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%2318181b%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%22100%22 y=%22150%22 fill=%22%2352525b%22 font-family=%22system-ui%22 font-size=%2213%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3ESin imagen%3C/text%3E%3C/svg%3E'; e.currentTarget.onerror = null; }} />
                      ) : (
                        <div className="w-full aspect-[2/3] rounded-2xl bg-white/[0.03] flex items-center justify-center text-6xl opacity-20">🎬</div>
                      )}
                    </div>

                    <div className="space-y-5">
                      {/* Sinopsis */}
                      {previewFuncion.peliculaSinopsis && (
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                          <p className="text-sm leading-7 text-cinema-gray/90">{previewFuncion.peliculaSinopsis}</p>
                        </div>
                      )}

                      {/* Date selector */}
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-cinema-cream/60 font-semibold mb-3">Selecciona una fecha</p>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                          {modalAvailableDates.map((date) => {
                            const fechaObj = buildLocalDateTime(date) || new Date();
                            const weekday = fechaObj.toLocaleDateString('es-BO', { weekday: 'short' });
                            const day = fechaObj.toLocaleDateString('es-BO', { day: '2-digit' });
                            const month = fechaObj.toLocaleDateString('es-BO', { month: 'short' });
                            const active = modalSelectedDate === date;
                            const hasFuncs = modalFunciones.filter(fn => fn.fecha === date).length > 0;
                            return (
                              <button
                                key={date}
                                type="button"
                                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border py-3 text-center transition-all duration-200 ${
                                  active
                                    ? 'border-cinema-gold bg-cinema-gold text-cinema-black shadow-lg shadow-cinema-gold/20'
                                    : hasFuncs
                                      ? 'border-white/[0.08] bg-white/[0.03] text-cinema-cream hover:border-white/20 hover:bg-white/[0.06]'
                                      : 'border-white/[0.04] bg-white/[0.01] text-cinema-gray/40 cursor-default'
                                }`}
                                onClick={() => hasFuncs && setModalSelectedDate(date)}
                              >
                                <span className={`text-[9px] uppercase tracking-[0.15em] font-semibold ${active ? 'text-cinema-black/70' : 'text-cinema-cream/50'}`}>{weekday}</span>
                                <span className="text-xl font-bold leading-none">{day}</span>
                                <span className={`text-[10px] uppercase tracking-[0.15em] ${active ? 'text-cinema-black/70' : 'text-cinema-cream/60'}`}>{month}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Functions by room type */}
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-cinema-cream/60 font-semibold mb-3">Horarios disponibles</p>
                        {Object.keys(funcionesPorSala).length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center">
                            <p className="text-sm text-cinema-gray">No hay funciones para esta fecha.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {Object.entries(funcionesPorSala).map(([salaTipo, funciones]) => (
                              <div key={salaTipo} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">{salaTipo}</h4>
                                  <span className="text-[10px] text-cinema-gray/60">{funciones.length} horario(s)</span>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                  {funciones.map(func => {
                                    const time = func.horaInicio?.substring(0, 5) ?? '—';
                                    const fechaHora = buildLocalDateTime(func.fecha, func.horaInicio || '00:00');
                                    const isPast = func.horaInicio ? (fechaHora ? fechaHora.getTime() <= Date.now() : true) : true;
                                    const active = selectedModalFuncion?.idFuncion === func.idFuncion;
                                    return (
                                      <button
                                        key={func.idFuncion}
                                        type="button"
                                        disabled={isPast}
                                        className={`rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                                          active
                                            ? 'border-cinema-gold bg-cinema-gold/10 ring-1 ring-cinema-gold/30'
                                            : isPast
                                              ? 'border-white/[0.04] bg-white/[0.01] opacity-40 cursor-not-allowed'
                                              : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                                        }`}
                                        onClick={() => { if (!isPast) setSelectedModalFuncion(func); }}
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <span className={`text-lg font-bold tabular-nums ${active ? 'text-cinema-gold' : 'text-white'}`}>
                                              {time}
                                            </span>
                                            {func.promocionActiva === 1 && (
                                              <span className="rounded bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 uppercase tracking-wider">2x1</span>
                                            )}
                                          </div>
                                          {isPast && <span className="text-[10px] text-red-400">Cerrada</span>}
                                        </div>
                                        <p className="text-[10px] text-cinema-gray/60 mt-1">{func.idSala}</p>
                                        {func.capacidadTotal > 0 && (
                                          <p className={`text-[10px] mt-0.5 ${(func.capacidadTotal - (func.boletosVendidos || 0)) < 10 ? 'text-red-400' : 'text-green-400'}`}>
                                            {func.capacidadTotal - (func.boletosVendidos || 0)} asiento(s) libre(s)
                                          </p>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Selected function summary & CTA */}
                      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                        {selectedModalFuncion ? (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="space-y-1">
                              <p className="text-xs text-cinema-cream/60 uppercase tracking-wider font-semibold">Función seleccionada</p>
                              <p className="text-white font-bold">{selectedModalFuncion.idSala} · {selectedModalFuncion.horaInicio?.substring(0, 5)}</p>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-cinema-gray">Bs. {Number(selectedModalFuncion.precioBase).toFixed(2)}</span>
                                {selectedModalFuncion.promocionActiva === 1 && (
                                  <span className="text-amber-400 font-bold text-xs bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">2x1 activo</span>
                                )}
                              </div>
                            </div>
                            <button
                              className="btn-primary"
                              disabled={selectedModalIsPast}
                              onClick={() => { if (selectedModalFuncion && !selectedModalIsPast) { selectFuncion(selectedModalFuncion); closePreviewModal(); } }}
                            >
                              {selectedModalIsPast ? 'Función cerrada' : 'Seleccionar asientos'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-sm text-cinema-gray/60">Selecciona un horario para continuar</p>
                            <button className="btn-secondary text-sm" onClick={closePreviewModal}>Cancelar</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {step === 2 && selectedFuncion && (
        <div className="space-y-6">
           <div className="card-cine p-5">
            <p className="text-sm text-cinema-gray">
              <span className="font-semibold text-white">{selectedFuncion.peliculaTitulo}</span> — {selectedFuncion.idSala} ({selectedFuncion.salaTipo}) — {(parseLocalDate(selectedFuncion.fecha) || new Date()).toLocaleDateString('es-BO')} {selectedFuncion.horaInicio?.substring(0, 5)}
            </p>
            {selectedFuncion.promocionActiva === 1 && (
              <span className="mt-2 inline-block rounded-full bg-cinema-gold/20 border border-cinema-gold/30 px-3 py-1 text-xs font-bold text-cinema-gold">
                🔥 ¡Promoción 2x1 Activa!
              </span>
            )}
          </div>

          <SeatMap asientos={asientos} selectedAsientos={selectedAsientos} onToggle={toggleAsiento} />

          <div className="card-cine p-5 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-cinema-gray">Asientos seleccionados:</span>
              <span className="text-white font-semibold">{selectedAsientos.length}</span>
            </div>
            {selectedAsientos.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedAsientos.map(id => {
                  const a = asientos.find(s => s.idAsiento === id);
                  return a ? (
                    <span key={id} className="inline-flex items-center rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[11px] font-semibold text-cinema-gold/90 font-mono tracking-wide">
                      {a.fila}{a.columna}
                    </span>
                  ) : null;
                })}
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-cinema-gray">Precio por boleto:</span>
              <span className="text-white">Bs. {Number(selectedFuncion.precioBase).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg border-t border-white/10 pt-3">
              <span className="font-semibold text-cinema-cream">Total {is2x1 && <span className="text-xs text-cinema-gold font-bold">(Promo 2x1)</span>}:</span>
              <span className="font-bold text-cinema-gold">Bs. {precioTotal.toFixed(2)}</span>
            </div>

            <label className="block">
              <span className="label-cine">Método de pago</span>
              <select className="input-cine" value={formaPago} onChange={e => setFormaPago(e.target.value)}>
                <option value="EFECTIVO">Efectivo</option>
                <option value="QR">QR</option>
                <option value="TARJETA">Tarjeta</option>
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="label-cine">NIT (opcional)</span>
                <input className="input-cine" value={nit} onChange={e => setNit(e.target.value)} placeholder="NIT o CI" />
              </label>
              <label className="block">
                <span className="label-cine">Razón social (opcional)</span>
                <input className="input-cine" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} placeholder="Razón social" />
              </label>
            </div>

            <div className="flex gap-3">
              <button className="btn-secondary" onClick={() => setStep(1)}>Volver</button>
              <button className="btn-primary" disabled={loading || !selectedAsientos.length} onClick={confirmarVenta}>
                {loading ? 'Procesando...' : 'Confirmar venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && resultado && (
        <div className="space-y-6">
          <div className="card-cine p-8 text-center space-y-4">
            <h3 className="text-2xl font-bold text-cinema-gold font-black">Venta Procesada Exitosamente</h3>
            <p className="text-cinema-gray text-sm">Comprobante de Venta: <span className="text-white font-mono font-bold bg-white/5 px-2.5 py-1 rounded">{resultado.numeroComprobante}</span></p>
            <p className="text-cinema-gray text-sm">Total Cobrado: <span className="text-cinema-gold font-bold">Bs. {Number(resultado.montoTotal).toFixed(2)}</span></p>
            
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center pt-2">
              <button 
                className="btn-primary flex items-center gap-1.5" 
                onClick={() => setShowModal(true)}
              >
                🎟️ Ver Boletos (Códigos QR)
              </button>
              <button 
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold px-5 py-2.5 text-sm transition" 
                onClick={() => setStep(2)}
              >
                Volver
              </button>
              <button 
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold px-5 py-2.5 text-sm transition" 
                onClick={nuevaVenta}
              >
                Nueva venta
              </button>
            </div>
          </div>

          {/* VENTANA EMERGENTE (MODAL) CON VISTA PREVIA Y ACCIONES */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4" onClick={() => setShowModal(false)} role="dialog" aria-modal="true" aria-labelledby="ticket-modal-title">
              <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0d14] p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header del Modal */}
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <h4 id="ticket-modal-title" className="text-xs font-bold uppercase tracking-wider text-cinema-gold">Vista Previa de Boleto</h4>
                  <button 
                    onClick={() => setShowModal(false)}
                    className="text-cinema-gray hover:text-white transition"
                    aria-label="Cerrar"
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
                  <div className="text-[10px] text-cinema-gray font-mono uppercase tracking-widest">Boleto de Entrada Presencial</div>
                  
                  <hr className="border-white/5 my-1" />

                  <div className="space-y-1 text-left text-xs">
                    <div className="mb-2">
                      <p className="text-cinema-gray uppercase text-[9px] tracking-wider font-bold">Película</p>
                      <p className="font-bold text-white text-sm truncate">{selectedFuncion?.peliculaTitulo}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <p className="text-cinema-gray uppercase text-[8px] tracking-wider font-bold">Sala</p>
                        <p className="font-medium text-white">{selectedFuncion?.idSala} ({selectedFuncion?.salaTipo})</p>
                      </div>
                      <div>
                        <p className="text-cinema-gray uppercase text-[8px] tracking-wider font-bold">Fecha</p>
                        <p className="font-medium text-white">{selectedFuncion?.fecha ? (parseLocalDate(selectedFuncion.fecha) || new Date()).toLocaleDateString('es-BO') : ''}</p>
                      </div>
                      <div>
                        <p className="text-cinema-gray uppercase text-[8px] tracking-wider font-bold">Horario</p>
                        <p className="font-medium text-white">{selectedFuncion?.horaInicio?.substring(0, 5)}</p>
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
                    Comprobante: {resultado?.numeroComprobante || 'N/A'}
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
                    onClick={printTicket}
                    className="btn-primary py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 w-full"
                  >
                    🖨️ Imprimir Boleto
                  </button>
                  <button 
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 text-xs uppercase tracking-wider transition"
                  >
                    Volver
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
