import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Message from '../components/Message';
import SeatMap from '../components/SeatMap.tsx';
import { api } from '../services/api';
import * as QRCode from 'qrcode';

export default function CompraOnlinePage() {
  const { user } = useAuth();
  const [funciones, setFunciones] = useState<any[]>([]);
  const [filteredFunciones, setFilteredFunciones] = useState<any[]>([]);
  const [selectedFuncion, setSelectedFuncion] = useState<any>(null);
  const [previewFuncion, setPreviewFuncion] = useState<any>(null);
  const [modalFunciones, setModalFunciones] = useState<any[]>([]);
  const [selectedModalFuncion, setSelectedModalFuncion] = useState<any>(null);
  const [asientos, setAsientos] = useState<any[]>([]);
  const [selectedAsientos, setSelectedAsientos] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2 | 2.5 | 3>(1);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [modalSelectedDate, setModalSelectedDate] = useState('');
  const [modalAvailableDates, setModalAvailableDates] = useState<string[]>([]);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [qrTimer, setQrTimer] = useState<number>(600);
  const [qrConfirmed, setQrConfirmed] = useState(false);
  const [selectedModalIsPast, setSelectedModalIsPast] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Estados para la vista previa del boleto (carrusel de QRs individuales)
  const [showModal, setShowModal] = useState(false);
  const [modalBoletos, setModalBoletos] = useState<any[]>([]);
  const [modalQrUrls, setModalQrUrls] = useState<string[]>([]);
  const [currentTicketIndex, setCurrentTicketIndex] = useState(0);

  const getCleanSalaCode = (idSala?: string) => {
    if (!idSala) return '';
    return idSala.includes('SALA-')
      ? 'S' + idSala.split('-').pop()
      : (idSala.startsWith('S') ? idSala : 'S' + idSala);
  };

  // Cargar detalles del comprobante y generar QRs de boletos individuales para el modal
  useEffect(() => {
    if (showModal && resultado?.idVenta) {
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
        })
        .catch(err => console.error('Error al cargar boletos para modal online:', err));
    } else {
      setModalBoletos([]);
      setModalQrUrls([]);
      setCurrentTicketIndex(0);
    }
  }, [showModal, resultado, selectedFuncion]);

  useEffect(() => {
    setLoading(true);
    api.listarFunciones().then(res => {
      setFunciones(res.funciones);
      setFilteredFunciones(res.funciones);
    }).catch(() => { }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (step !== 2 || !selectedFuncion) return;
    const interval = setInterval(async () => {
      try {
        const fresh = await api.obtenerAsientosPorFuncion(selectedFuncion.idFuncion);
        setAsientos(fresh.asientos || []);
      } catch { /* ignore */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [step, selectedFuncion]);

  // Muestra la duración en formato 'Xh Ym' o 'Ym'
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
    // Extraer fecha YYYY-MM-DD desde posibles formatos: 'YYYY-MM-DD', 'YYYY-MM-DDTHH:MM:SS', 'YYYY-MM-DD HH:MM:SS'
    let fechaStr = '';
    if (fecha instanceof Date) {
      fechaStr = fecha.toISOString().slice(0, 10);
    } else {
      const s = String(fecha);
      const match = s.match(/\d{4}-\d{2}-\d{2}/);
      if (!match) return null;
      fechaStr = match[0];
    }

    const [yStr, mStr, dStr] = fechaStr.split('-');
    const y = Number(yStr), m = Number(mStr), d = Number(dStr);
    if ([y, m, d].some(v => Number.isNaN(v))) return null;
    const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
    // detectar hora proporcionada: prioridad a 'hora' argumento; si no, intentar extraer hora de 'fecha' original
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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 2.5 && qrTimer > 0 && !qrConfirmed) {
      interval = setInterval(() => {
        setQrTimer(prev => {
          if (prev <= 1) {
            setMessage({ type: 'error', text: 'El QR ha expirado. Por favor intenta nuevamente.' });
            setStep(2);
            return 600;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, qrTimer, qrConfirmed]);



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

  // Update selectedModalIsPast whenever a modal function is selected
  useEffect(() => {
    if (selectedModalFuncion) {
      const todayStr = new Date().toLocaleDateString('en-CA'); // Local date in YYYY-MM-DD
      const isToday = selectedModalFuncion.fecha === todayStr;
      const fechaHora = buildLocalDateTime(selectedModalFuncion.fecha, selectedModalFuncion.horaInicio || '00:00');
      const past = isToday && fechaHora ? fechaHora.getTime() <= Date.now() : false;
      setSelectedModalIsPast(past);
    } else {
      setSelectedModalIsPast(false);
    }
  }, [selectedModalFuncion]);

  const peliculasFiltradas = Array.from(
    new Map(funciones.map(funcion => [funcion.idPelicula ?? funcion.peliculaTitulo, funcion])).values()
  );

  const peliculasBuscadas = peliculasFiltradas.filter(f =>
    f.peliculaTitulo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const peliculasPromo = peliculasBuscadas.filter(f =>
    funciones.some(fn => fn.peliculaTitulo === f.peliculaTitulo && fn.promocionActiva === 1)
  );
  const peliculasNormales = peliculasBuscadas.filter(f =>
    !funciones.some(fn => fn.peliculaTitulo === f.peliculaTitulo && fn.promocionActiva === 1)
  );

  const modalFuncionesFiltradas = modalSelectedDate
    ? modalFunciones.filter(fn => fn.fecha === modalSelectedDate)
    : modalFunciones;

  const funcionesPorSala = modalFuncionesFiltradas.reduce<Record<string, any[]>>((acc, fn) => {
    const sala = fn.salaTipo || 'GENERAL';
    if (!acc[sala]) acc[sala] = [];
    acc[sala].push(fn);
    return acc;
  }, {});

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

  function openMovieModal(f: any) {
    const funcionesPorPelicula = funciones.filter(fn => fn.peliculaTitulo === f.peliculaTitulo);
    // Sólo fechas desde hoy en adelante, incluyendo hoy even if no functions
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

  useEffect(() => {
    if (!modalSelectedDate || modalFunciones.length === 0) return;
    if (!selectedModalFuncion) return;
    if (selectedModalFuncion.fecha !== modalSelectedDate) {
      setSelectedModalFuncion(null);
    }
  }, [modalSelectedDate, modalFunciones]);

  function closePreviewModal() {
    setPreviewFuncion(null);
    setModalFunciones([]);
    setSelectedModalFuncion(null);
    setModalAvailableDates([]);
    setModalSelectedDate('');
  }

  function toggleAsiento(id: string) {
    setSelectedAsientos(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  }

  async function confirmarCompra() {
    if (!selectedFuncion || !selectedAsientos.length || !user) return;

    try {
      // Generar QR ficticio basado en la compra
      const qrData = `CINE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const qrImageUrl = await QRCode.toDataURL(qrData);
      setQrCode(qrImageUrl);
      setQrTimer(600); // 10 minutos
      setQrConfirmed(false);
      setStep(2.5);
    } catch (err) {
      setMessage({ type: 'error', text: 'No se pudo generar el código QR.' });
    }
  }

  async function confirmarPagoQR() {
    if (!selectedFuncion || !selectedAsientos.length || !user) return;
    setLoading(true);
    setMessage(null);
    setQrConfirmed(true);
    try {
      const res = await api.crearVenta({
        idCliente: user.idUsuario,
        idFuncion: selectedFuncion.idFuncion,
        tipo: 'ONLINE',
        formaPago: 'QR',
        asientos: selectedAsientos,
        usuarioA: user.idUsuario,
      });
      setResultado(res);
      setEmailStatus(res.emailEnviado ? 'Se envió el comprobante a tu correo.' : `No fue posible enviar el correo: ${res.emailMotivo || 'no disponible'}`);
      setStep(3);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al procesar la compra.' });
    } finally {
      setLoading(false);
    }
  }

  function nuevaCompra() {
    setStep(1);
    setSelectedFuncion(null);
    setSelectedAsientos([]);
    setResultado(null);
    setMessage(null);
    setEmailStatus(null);
    setQrCode('');
    setQrTimer(600);
    setQrConfirmed(false);
  }

  const is2x1 = selectedFuncion?.promocionActiva === 1;
  const seatsToPay = is2x1 ? Math.ceil(selectedAsientos.length / 2) : selectedAsientos.length;
  const precioTotal = selectedFuncion ? Number(selectedFuncion.precioBase) * seatsToPay : 0;

  const pageTitle = step === 2 ? 'Selección de asientos' : step === 2.5 ? 'Confirmar Compra' : 'Cartelera';



  return (
    <section className="space-y-8">
      {message && <Message type={message.type} text={message.text} />}

      {loading && funciones.length === 0 && (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-3xl border border-white/[0.06] bg-white/[0.03] overflow-hidden animate-pulse">
              <div className="aspect-[3/4] bg-white/[0.05]" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-white/[0.06] rounded w-3/4" />
                <div className="h-3 bg-white/[0.04] rounded w-full" />
                <div className="h-3 bg-white/[0.04] rounded w-2/3" />
                <div className="flex gap-2 pt-2">
                  <div className="h-6 bg-white/[0.04] rounded-full w-16" />
                  <div className="h-6 bg-white/[0.04] rounded-full w-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 1 && (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-bold text-white">{pageTitle}</h2>
            <div className="relative w-full sm:w-72">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cinema-gray/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Buscar película..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-cinema-gray/50 outline-none transition focus:border-cinema-gold/40 focus:bg-white/[0.05]"
              />
            </div>
          </div>
          {/* Seccion Promocion 2x1 */}
          {peliculasPromo.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 px-4 py-2">
                  <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  <span className="text-sm font-black uppercase tracking-wider text-amber-400">Promocion 2x1</span>
                </div>
                <span className="text-xs text-cinema-gray/50">{peliculasPromo.length} pelicula(s)</span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 mb-10">
                {peliculasPromo.map(f => (
                  <div key={f.idPelicula ?? f.peliculaTitulo} className="group relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-b from-amber-500/[0.04] to-transparent shadow-lg shadow-amber-500/10 transition-all duration-500 hover:border-cinema-gold/30 hover:shadow-xl hover:shadow-cinema-gold/5">
                    <div className="relative overflow-hidden aspect-[3/4]">
                      {f.peliculaPoster ? (
                        <img src={f.peliculaPoster} alt={f.peliculaTitulo} referrerPolicy="no-referrer" className="w-full h-full object-cover transition duration-700 group-hover:scale-110" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%2318181b%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%22100%22 y=%22150%22 fill=%22%2352525b%22 font-family=%22system-ui%22 font-size=%2213%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3ESin imagen%3C/text%3E%3C/svg%3E'; e.currentTarget.onerror = null; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white/[0.03]">
                          <span className="text-5xl opacity-20">🎬</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#08080d] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-black shadow-lg shadow-amber-500/40 animate-pulse">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                        ¡2x1!
                      </span>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                        <button
                          type="button"
                          className="rounded-full bg-cinema-gold px-6 py-3 text-sm font-bold text-cinema-black shadow-2xl shadow-black/40 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 hover:bg-cinema-goldLight active:scale-95"
                          onClick={() => openMovieModal(f)}
                        >
                          Comprar boletos
                        </button>
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-lg font-bold text-white leading-tight flex-1">{f.peliculaTitulo}</h4>
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1 text-[11px] font-black text-black uppercase tracking-wider shadow-lg shadow-amber-500/30">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                          2x1
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-3 py-1 text-[11px] font-semibold text-cinema-cream/80 uppercase tracking-wider border border-white/[0.06]">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {f.peliculaDuracion ? formatDuration(f.peliculaDuracion) : '—'}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-3 py-1 text-[11px] font-semibold text-cinema-gold uppercase tracking-wider border border-white/[0.06]">
                          {f.peliculaClasificacion || 'TP'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cartelera regular */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Cartelera</h3>
              <span className="text-xs text-cinema-gray/50">{peliculasNormales.length} pelicula(s)</span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
              {peliculasNormales.map(f => (
                <div key={f.idPelicula ?? f.peliculaTitulo} className="group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent transition-all duration-500 hover:border-cinema-gold/30 hover:shadow-xl hover:shadow-cinema-gold/5">
                    <div className="relative overflow-hidden aspect-[3/4]">
                    {f.peliculaPoster ? (
                      <img src={f.peliculaPoster} alt={f.peliculaTitulo} referrerPolicy="no-referrer" className="w-full h-full object-cover transition duration-700 group-hover:scale-110" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%2318181b%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%22100%22 y=%22150%22 fill=%22%2352525b%22 font-family=%22system-ui%22 font-size=%2213%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3ESin imagen%3C/text%3E%3C/svg%3E'; e.currentTarget.onerror = null; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/[0.03]">
                        <span className="text-5xl opacity-20">🎬</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#08080d] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                      <button
                        type="button"
                        className="rounded-full bg-cinema-gold px-6 py-3 text-sm font-bold text-cinema-black shadow-2xl shadow-black/40 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 hover:bg-cinema-goldLight active:scale-95"
                        onClick={() => openMovieModal(f)}
                      >
                        Comprar boletos
                      </button>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <h4 className="text-lg font-bold text-white leading-tight">{f.peliculaTitulo}</h4>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-3 py-1 text-[11px] font-semibold text-cinema-cream/80 uppercase tracking-wider border border-white/[0.06]">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {f.peliculaDuracion ? formatDuration(f.peliculaDuracion) : '—'}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-3 py-1 text-[11px] font-semibold text-cinema-gold uppercase tracking-wider border border-white/[0.06]">
                        {f.peliculaClasificacion || 'TP'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {peliculasNormales.length === 0 && peliculasPromo.length === 0 && (
                <p className="text-cinema-gray col-span-full text-center py-8">
                  {busqueda ? `No hay películas que coincidan con "${busqueda}".` : 'No hay películas disponibles en este momento.'}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {previewFuncion && step === 1 && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm p-4 md:items-center" role="dialog" aria-modal="true" aria-labelledby="preview-funcion-title">
           <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/[0.08] bg-[#08080d] shadow-2xl shadow-black/60 my-8 md:my-0">
            <div className="flex flex-col gap-6 p-6 lg:p-8">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 id="preview-funcion-title" className="text-2xl font-bold text-white lg:text-3xl">{previewFuncion.peliculaTitulo}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-cinema-gray">
                    {previewFuncion.peliculaDirector && <span>{previewFuncion.peliculaDirector}</span>}
                    {previewFuncion.peliculaDuracion && (
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {formatDuration(previewFuncion.peliculaDuracion)}
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
                          onClick={() => { if (selectedModalFuncion && !selectedModalIsPast) selectFuncion(selectedModalFuncion); }}
                        >
                          {selectedModalIsPast ? 'Función cerrada' : 'Comprar boleto'}
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

      {step === 2 && selectedFuncion && (
        <div className="space-y-6">
          <div className="card-cine p-5 space-y-3">
            <p className="text-sm text-cinema-gray">
              <span className="font-semibold text-white">{selectedFuncion.peliculaTitulo}</span> — {selectedFuncion.idSala} ({selectedFuncion.salaTipo}) — {(buildLocalDateTime(selectedFuncion.fecha) || new Date()).toLocaleDateString('es-BO')} {selectedFuncion.horaInicio?.substring(0, 5)}
            </p>
            {selectedFuncion.promocionActiva === 1 && (
              <span className="inline-block rounded-full bg-cinema-gold/20 border border-cinema-gold/30 px-3 py-1 text-xs font-bold text-cinema-gold">
                🔥 ¡Promoción 2x1 Aplicada!
              </span>
            )}
          </div>

          <SeatMap asientos={asientos} selectedAsientos={selectedAsientos} onToggle={toggleAsiento} />

          <div className="card-cine p-5 space-y-4">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-cinema-gray">Asientos seleccionados:</span>
                <span className="text-white font-semibold">{selectedAsientos.length}</span>
              </div>
              {selectedAsientos.length > 0 && (
                <p className="text-xs text-cinema-gray">Códigos: <span className="text-white">{selectedAsientos.map(code => code.split('-').slice(-1)[0]).join(', ')}</span></p>
              )}
            </div>
            <div className="flex justify-between text-lg border-t border-white/10 pt-3">
              <span className="font-semibold text-cinema-cream">Total:</span>
              <span className="font-bold text-cinema-gold">Bs. {precioTotal.toFixed(2)}</span>
            </div>
            <div className="flex gap-3">
              <button className="btn-secondary" onClick={() => setStep(1)}>Volver</button>
              <button className="btn-primary" disabled={loading || !selectedAsientos.length} onClick={confirmarCompra}>
                {loading ? 'Procesando...' : 'Pagar con QR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2.5 && selectedFuncion && (
        <div className="card-cine mx-auto max-w-xl p-6 text-center space-y-4">
          <h3 className="text-xl font-bold text-cinema-gold">Escanea el código QR</h3>
          <p className="text-sm text-cinema-gray">Apunta tu cámara al siguiente código QR para completar el pago.</p>

          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-2xl">
              {qrCode && <img src={qrCode} alt="QR Code" className="w-52 h-52" />}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-cinema-cream font-semibold">Tiempo restante:</p>
            <div className="text-3xl font-bold text-cinema-gold">
              {Math.floor(qrTimer / 60)}:{String(qrTimer % 60).padStart(2, '0')}
            </div>
            <p className="text-xs text-cinema-gray">10 minutos para completar la transacción</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-2 text-left">
            <p className="text-xs uppercase tracking-[0.18em] text-cinema-cream/70">Comprobante</p>
            <p className="text-sm text-white font-semibold">{selectedFuncion.peliculaTitulo}</p>
            <p className="text-xs text-cinema-gray">{selectedFuncion.idSala} ({selectedFuncion.salaTipo})</p>
            <p className="text-xs text-cinema-gray">{(buildLocalDateTime(selectedFuncion.fecha) || new Date()).toLocaleDateString('es-BO')} {selectedFuncion.horaInicio?.substring(0, 5)}</p>
            <div className="pt-2 border-t border-white/10 text-sm">
              <p className="text-cinema-gray">Asientos: {selectedAsientos.length}</p>
              <p className="text-xs text-white/90 mt-1">{selectedAsientos.map(code => code.split('-').slice(-1)[0]).join(', ')}</p>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/10 text-sm">
              <span className="text-cinema-gray">Total {selectedFuncion.promocionActiva === 1 && <span className="text-xs text-cinema-gold font-bold">(Promo 2x1)</span>}</span>
              <span className="text-cinema-gold font-semibold">Bs. {precioTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button className="btn-secondary" onClick={() => {
              setQrCode('');
              setQrTimer(600);
              setQrConfirmed(false);
              setStep(2);
            }}>Cancelar</button>
            <button
              className="btn-primary"
              disabled={loading || qrConfirmed}
              onClick={confirmarPagoQR}
            >
              {loading ? 'Procesando...' : 'Confirmar pago'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && resultado && (
        <div className="space-y-6">
          <div className="card-cine p-8 text-center space-y-4">
            <h3 className="text-2xl font-bold text-cinema-gold font-black">Compra Exitosa</h3>
            <p className="text-cinema-gray text-sm">Comprobante de Venta: <span className="text-white font-mono font-bold bg-white/5 px-2.5 py-1 rounded">{resultado.numeroComprobante}</span></p>
            <p className="text-cinema-gray text-sm">Total Cobrado: <span className="text-cinema-gold font-bold">Bs. {Number(resultado.montoTotal).toFixed(2)}</span></p>
            <p className="text-sm text-cinema-gray">{emailStatus || 'El comprobante ha sido enviado a tu correo electrónico.'}</p>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center pt-2">
              <button
                type="button"
                className="btn-primary flex items-center gap-1.5"
                onClick={() => setShowModal(true)}
              >
                🎟️ Ver Boletos (Códigos QR)
              </button>
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold px-5 py-2.5 text-sm transition"
                onClick={nuevaCompra}
              >
                Nueva compra
              </button>
            </div>
          </div>

          {/* VENTANA EMERGENTE (MODAL) CON VISTA PREVIA Y ACCIONES DE BOLETOS INDIVIDUALES */}
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
                  <div className="text-[10px] text-cinema-gray font-mono uppercase tracking-widest">Boleto de Entrada</div>

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
                        <p className="font-medium text-white">{selectedFuncion?.fecha ? (buildLocalDateTime(selectedFuncion.fecha) || new Date()).toLocaleDateString('es-BO') : ''}</p>
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
                    type="button"
                    onClick={async () => {
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
                    }}
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
        </div>
      )}
    </section>
  );
}
