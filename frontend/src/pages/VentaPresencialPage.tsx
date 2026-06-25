import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Message from '../components/Message';
import SeatMap from '../components/SeatMap.tsx';
import { api } from '../services/api';

export default function VentaPresencialPage() {
  const { user } = useAuth();
  const [funciones, setFunciones] = useState<any[]>([]);
  const [peliculas, setPeliculas] = useState<any[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFunciones, setModalFunciones] = useState<any[]>([]);
  const [modalAvailableDates, setModalAvailableDates] = useState<string[]>([]);
  const [modalSelectedDate, setModalSelectedDate] = useState('');
  const [selectedModalFuncion, setSelectedModalFuncion] = useState<any>(null);
  const [selectedModalIsPast, setSelectedModalIsPast] = useState(false);
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

  useEffect(() => {
    api.listarFunciones().then(res => setFunciones(res.funciones)).catch(() => {});
    api.listarPeliculas().then(res => setPeliculas(res.peliculas)).catch(() => {});
  }, []);
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
    const [yStr, mStr, dStr] = fechaStr.split('-');
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

  useEffect(() => {
    if (selectedModalFuncion) {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const isToday = selectedModalFuncion.fecha === todayStr;
      const fechaHora = buildLocalDateTime(selectedModalFuncion.fecha, selectedModalFuncion.horaInicio || '00:00');
      const past = isToday && fechaHora ? fechaHora.getTime() <= Date.now() : false;
      setSelectedModalIsPast(past);
    } else {
      setSelectedModalIsPast(false);
    }
  }, [selectedModalFuncion]);

  function openMovieModal(movie) {
    const funcionesPorPelicula = funciones.filter(fn => fn.peliculaTitulo === movie.peliculaTitulo);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const fechasSet = new Set<string>(funcionesPorPelicula.map(fn => fn.fecha));
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    fechasSet.add(todayStr);
    const fechas = Array.from(fechasSet).sort().filter(d => {
      const dateObj = buildLocalDateTime(d);
      return dateObj ? dateObj >= todayStart : false;
    });
    const selected = fechas[0] || '';
    setSelectedMovie(movie);
    setModalFunciones(funcionesPorPelicula);
    setModalAvailableDates(fechas);
    setModalSelectedDate(selected);
    setSelectedModalFuncion(null);
    setModalOpen(true);
  }
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

  function nuevaVenta() {
    setStep(1);
    setSelectedFuncion(null);
    setSelectedAsientos([]);
    setResultado(null);
    setMessage(null);
  }

  const precioTotal = selectedFuncion ? Number(selectedFuncion.precioBase) * selectedAsientos.length : 0;

  const peliculasFiltradas = Array.from(
    new Map(funciones.map(funcion => [funcion.idPelicula ?? funcion.peliculaTitulo, funcion])).values()
  );

  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-bold text-white">Venta presencial de boletos</h2>

      {message && <Message type={message.type} text={message.text} />}

      {step === 1 && (
  <>
    <div className="grid gap-4 lg:grid-cols-3">
      {peliculasFiltradas.map(movie => (
        <div key={movie.idPelicula ?? movie.peliculaTitulo} className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#08080d] transition hover:border-cinema-gold/30">
          {movie.peliculaPoster && (
            <div className="relative overflow-hidden">
              <img src={movie.peliculaPoster} alt={movie.peliculaTitulo} className="w-full object-contain max-h-[36rem] mx-auto transition duration-500 group-hover:scale-105" />
              <div className="pointer-events-none absolute inset-0 bg-black/0 transition duration-300 group-hover:bg-black/20" />
              <button
                type="button"
                className="absolute left-1/2 bottom-4 z-10 -translate-x-1/2 rounded-full bg-cinema-gold px-5 py-3 text-sm font-semibold text-cinema-black shadow-lg shadow-black/20 opacity-0 transition duration-300 group-hover:opacity-100"
                onClick={() => openMovieModal(movie)}
              >
                Ver funciones
              </button>
            </div>
          )}
          <div className="space-y-3 p-5">
            <h4 className="text-lg font-bold text-white">{movie.peliculaTitulo}</h4>
          </div>
        </div>
      ))}
    </div>
    {peliculasFiltradas.length === 0 && (
      <p className="text-cinema-gray col-span-full text-center py-8">No hay películas disponibles.</p>
    )}
    {modalOpen && selectedMovie && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <div className="w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-[2rem] border border-white/10 bg-[#08080d] shadow-2xl">
                <div className="flex flex-col gap-6 p-6 lg:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-3xl font-bold text-white">{selectedMovie.peliculaTitulo}</h3>
                    <button className="btn-secondary shrink-0" onClick={() => setModalOpen(false)}>Cerrar</button>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[350px_minmax(0,1fr)]">
                    {selectedMovie.peliculaPoster && (
                      <img src={selectedMovie.peliculaPoster} alt={selectedMovie.peliculaTitulo} className="max-h-[40vh] lg:max-h-[80vh] w-full rounded-3xl bg-black object-contain" />
                    )}
                    
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <p className="label-cine">Selecciona fecha</p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                          {modalAvailableDates.filter(date => {
                            const today = new Date();
                            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                            const dateObj = buildLocalDateTime(date);
                            return dateObj ? dateObj >= todayStart : false;
                          }).map(date => {
                            const fechaObj = buildLocalDateTime(date) || new Date(date);
                            const weekday = fechaObj.toLocaleDateString('es-BO', { weekday: 'short' });
                            const day = fechaObj.toLocaleDateString('es-BO', { day: '2-digit' });
                            const month = fechaObj.toLocaleDateString('es-BO', { month: 'short' });
                            const active = modalSelectedDate === date;
                            return (
                              <button
                                key={date}
                                type="button"
                                className={`group flex flex-col items-center justify-center gap-1 rounded-[2rem] border px-3 py-4 text-center transition ${active ? 'border-cinema-gold bg-cinema-gold text-cinema-black' : 'border-white/10 bg-white/[0.05] text-cinema-gray hover:border-white/20 hover:bg-white/[0.1]'}`}
                                onClick={() => setModalSelectedDate(date)}
                              >
                                <span className="text-[10px] uppercase tracking-[0.25em] text-cinema-cream/80">{weekday}</span>
                                <span className="text-2xl font-bold leading-none">{day}</span>
                                <span className="text-xs uppercase tracking-[0.2em] text-cinema-cream/80">{month}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="label-cine">Funciones</p>
                      {Object.entries(modalFunciones.filter(fn => fn.fecha === modalSelectedDate).reduce((acc, fn) => {
                        const sala = fn.salaTipo || 'GENERAL';
                        if (!acc[sala]) acc[sala] = [];
                        acc[sala].push(fn);
                        return acc;
                      }, {} as Record<string, any[]>)).map(([salaTipo, funciones]) => (
                        <div key={salaTipo} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                          <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-white">{salaTipo}</h4>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {funciones.map(func => {
                              const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
                              const isToday = func.fecha === todayStr;
                              const fechaHora = buildLocalDateTime(func.fecha, func.horaInicio || '00:00');
                              const isPast = isToday && fechaHora ? fechaHora.getTime() <= Date.now() : false;
                              const active = selectedModalFuncion?.idFuncion === func.idFuncion;
                              return (
                                <button
                                  key={func.idFuncion}
                                  type="button"
                                  disabled={isPast}
                                  className={`group rounded-3xl border px-4 py-3 text-left transition ${active ? 'border-cinema-gold bg-cinema-gold/10 text-white' : isPast ? 'border-white/10 bg-white/[0.02] text-cinema-gray opacity-60 cursor-not-allowed' : 'border-white/10 bg-white/[0.03] text-cinema-gray hover:border-white/20'}`}
                                  onClick={() => { if (!isPast) setSelectedModalFuncion(func); }}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="block rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] bg-black/70 text-white">Español</span>
                                    <span className="mt-3 block text-lg font-semibold text-white">
                                      {func.horaInicio?.substring(0,5)}{isPast && <span className="text-sm text-red-400 ml-1">(Cerrada)</span>}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {modalFunciones.filter(fn => fn.fecha === modalSelectedDate).length === 0 && (
                        <p className="text-sm text-cinema-gray">No hay funciones para la fecha seleccionada.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      className="btn-primary"
                      disabled={!selectedModalFuncion || selectedModalIsPast}
                      onClick={() => {
                        if (selectedModalFuncion && !selectedModalIsPast) {
                          selectFuncion(selectedModalFuncion);
                          setModalOpen(false);
                        }
                      }}
                    >
                      {selectedModalFuncion ? (selectedModalIsPast ? 'Función cerrada' : 'Seleccionar') : 'Seleccione una función'}
                    </button>
                    <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
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
              <span className="font-semibold text-white">{selectedFuncion.peliculaTitulo}</span> — {selectedFuncion.idSala} ({selectedFuncion.salaTipo}) — {new Date(selectedFuncion.fecha).toLocaleDateString('es-BO')} {selectedFuncion.horaInicio?.substring(0, 5)}
            </p>
          </div>

          <SeatMap asientos={asientos} selectedAsientos={selectedAsientos} onToggle={toggleAsiento} />

          <div className="card-cine p-5 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-cinema-gray">Asientos seleccionados:</span>
              <div className="text-right">
                <span className="text-white font-semibold block">{selectedAsientos.length}</span>
                {selectedAsientos.length > 0 && (
                  <span className="text-cinema-cream/70 text-xs mt-1 block">
                    {selectedAsientos.map(code => code.split('-').slice(-1)[0]).join(', ')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-cinema-gray">Precio por boleto:</span>
              <span className="text-white">Bs. {Number(selectedFuncion.precioBase).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg border-t border-white/10 pt-3">
              <span className="font-semibold text-cinema-cream">Total:</span>
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
        <div className="card-cine p-8 text-center space-y-4">
          <h3 className="text-2xl font-bold text-cinema-gold">Venta registrada</h3>
          <p className="text-cinema-gray">Comprobante: <span className="text-white font-semibold">{resultado.numeroComprobante}</span></p>
          <p className="text-cinema-gray">Total: <span className="text-cinema-gold font-bold">Bs. {Number(resultado.montoTotal).toFixed(2)}</span></p>
          <div className="flex gap-4 justify-center mt-6">
            <button className="btn-secondary" onClick={async () => {
              try {
                const blob = await api.descargarComprobanteTicketPdf(resultado.numeroComprobante);
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
              } catch (err) {
                alert('Error al generar ticket.');
              }
            }}>
              Imprimir ticket
            </button>
            <button className="btn-primary" onClick={nuevaVenta}>Nueva venta</button>
          </div>
        </div>
      )}
    </section>
  );
}
