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

  useEffect(() => {
    api.listarFunciones().then(res => {
      setFunciones(res.funciones);
      setFilteredFunciones(res.funciones);
    }).catch(() => {});
  }, []);

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

  const peliculasFiltradas = Array.from(
    new Map(funciones.map(funcion => [funcion.idPelicula ?? funcion.peliculaTitulo, funcion])).values()
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
    setPreviewFuncion(null);
    setModalFunciones([]);
    setSelectedModalFuncion(null);
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
    const fechas = Array.from(new Set(funcionesPorPelicula.map(fn => fn.fecha))).sort();
    const selected = fechas[0] || '';
    const funcionesFiltradas = selected ? funcionesPorPelicula.filter(fn => fn.fecha === selected) : funcionesPorPelicula;

    setModalFunciones(funcionesPorPelicula);
    setModalAvailableDates(fechas);
    setModalSelectedDate(selected);
    setSelectedModalFuncion(funcionesFiltradas.find(fn => fn.idFuncion === f.idFuncion) || funcionesFiltradas[0] || funcionesPorPelicula[0]);
    setPreviewFuncion(f);
  }

  useEffect(() => {
    if (modalSelectedDate && modalFunciones.length > 0) {
      const next = modalFunciones.find(fn => fn.fecha === modalSelectedDate && fn.idFuncion === selectedModalFuncion?.idFuncion)
        || modalFunciones.find(fn => fn.fecha === modalSelectedDate)
        || modalFunciones[0];
      setSelectedModalFuncion(next || null);
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

  const precioTotal = selectedFuncion ? Number(selectedFuncion.precioBase) * selectedAsientos.length : 0;

  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-bold text-white">Cartelera</h2>

      {message && <Message type={message.type} text={message.text} />}

      {step === 1 && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {peliculasFiltradas.map(f => (
              <div key={f.idPelicula ?? f.peliculaTitulo} className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#08080d] transition hover:border-cinema-gold/30">
                {f.peliculaPoster && (
                  <div className="relative overflow-hidden">
                    <img src={f.peliculaPoster} alt={f.peliculaTitulo} className="h-96 w-full object-cover transition duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition duration-300 group-hover:bg-black/40">
                      <button
                        type="button"
                        className="opacity-0 rounded-full bg-cinema-gold px-5 py-3 text-sm font-semibold text-cinema-black transition duration-300 group-hover:opacity-100"
                        onClick={() => openMovieModal(f)}
                      >
                        Comprar boletos
                      </button>
                    </div>
                  </div>
                )}
                <div className="space-y-3 p-5">
                  <h4 className="text-lg font-bold text-white">{f.peliculaTitulo}</h4>
                  {f.peliculaSinopsis && (
                    <p className="text-sm leading-6 text-cinema-gray line-clamp-4">{f.peliculaSinopsis}</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-3 text-xs uppercase tracking-[0.2em] text-cinema-cream">
                    <span className="rounded-full bg-white/5 px-3 py-1">{f.peliculaDuracion ? `${f.peliculaDuracion} min` : '—'}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1">{f.peliculaClasificacion || 'TP'}</span>
                  </div>
                </div>
              </div>
            ))}
            {peliculasFiltradas.length === 0 && (
              <p className="text-cinema-gray col-span-full text-center py-8">No hay películas disponibles en este momento.</p>
            )}
          </div>
        </>
      )}

      {previewFuncion && step === 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#08080d] shadow-2xl">
            <div className="flex flex-col gap-6 p-6 lg:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-3xl font-bold text-white">{previewFuncion.peliculaTitulo}</h3>
                  <p className="text-sm text-cinema-gray mt-2">
                    {previewFuncion.peliculaDirector ? `Director: ${previewFuncion.peliculaDirector}` : ''}
                    {previewFuncion.peliculaDuracion ? ` · ${previewFuncion.peliculaDuracion} min` : ''}
                    {previewFuncion.peliculaClasificacion ? ` · ${previewFuncion.peliculaClasificacion}` : ''}
                  </p>
                </div>
                <button className="btn-secondary" onClick={closePreviewModal}>Cerrar</button>
              </div>

              <div className="grid gap-6 lg:grid-cols-[350px_minmax(0,1fr)]">
                {previewFuncion.peliculaPoster && (
                  <img src={previewFuncion.peliculaPoster} alt={previewFuncion.peliculaTitulo} className="h-80 w-full rounded-3xl object-cover" />
                )}
                <div className="space-y-4">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                    <h4 className="text-white font-semibold mb-3">Sinopsis</h4>
                    <p className="text-sm leading-7 text-cinema-gray">{previewFuncion.peliculaSinopsis}</p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-cinema-cream/70">Información</p>
                      <p className="mt-3 text-sm text-cinema-gray">Sala: <span className="text-white">{selectedModalFuncion?.idSala || previewFuncion.idSala} ({selectedModalFuncion?.salaTipo || previewFuncion.salaTipo})</span></p>
                      <p className="mt-1 text-sm text-cinema-gray">Precio: <span className="text-white">Bs. {Number(selectedModalFuncion?.precioBase ?? previewFuncion.precioBase).toFixed(2)}</span></p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-cinema-cream/70">Selecciona fecha</p>
                      <div className="flex flex-wrap gap-3 mt-3">
                        {modalAvailableDates.map((date) => {
                          const formatted = new Date(date).toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: 'short' });
                          const active = modalSelectedDate === date;
                          return (
                            <button
                              key={date}
                              type="button"
                              className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${active ? 'bg-cinema-gold text-cinema-black' : 'bg-white/[0.05] text-cinema-gray hover:bg-white/[0.1]'}`}
                              onClick={() => setModalSelectedDate(date)}
                            >
                              {formatted}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-cinema-cream/70">Funciones por sala</p>
                      <div className="space-y-5 mt-3">
                        {Object.entries(funcionesPorSala).map(([salaTipo, funciones]) => (
                          <div key={salaTipo} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                            <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-white">{salaTipo}</h4>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {funciones.map(func => {
                                const time = func.horaInicio?.substring(0, 5) ?? '—';
                                const active = selectedModalFuncion?.idFuncion === func.idFuncion;
                                return (
                                  <button
                                    key={func.idFuncion}
                                    type="button"
                                    className={`group rounded-3xl border px-4 py-3 text-left transition ${active ? 'border-cinema-gold bg-cinema-gold/10 text-white' : 'border-white/10 bg-white/[0.03] text-cinema-gray hover:border-white/20'}`}
                                    onClick={() => setSelectedModalFuncion(func)}
                                  >
                                    <span className="block rounded-full bg-black/70 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white">Español</span>
                                    <span className="mt-3 block text-lg font-semibold text-white">{time}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        {funcionesPorSala && Object.keys(funcionesPorSala).length === 0 && (
                          <p className="text-sm text-cinema-gray">No hay funciones para la fecha seleccionada.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      className="btn-primary"
                      onClick={() => selectFuncion(selectedModalFuncion || previewFuncion)}
                    >
                      Comprar boleto
                    </button>
                    <button className="btn-secondary" onClick={closePreviewModal}>Cancelar</button>
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
              <span className="font-semibold text-white">{selectedFuncion.peliculaTitulo}</span> — {selectedFuncion.idSala} ({selectedFuncion.salaTipo}) — {new Date(selectedFuncion.fecha).toLocaleDateString('es-BO')} {selectedFuncion.horaInicio?.substring(0, 5)}
            </p>
            {selectedFuncion.peliculaSinopsis && (
              <p className="text-sm text-cinema-gray">{selectedFuncion.peliculaSinopsis}</p>
            )}
          </div>

          <SeatMap asientos={asientos} selectedAsientos={selectedAsientos} onToggle={toggleAsiento} />

          <div className="card-cine p-5 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-cinema-gray">Asientos seleccionados:</span>
              <span className="text-white font-semibold">{selectedAsientos.length}</span>
            </div>
            <div className="flex justify-between text-lg border-t border-white/10 pt-3">
              <span className="font-semibold text-cinema-cream">Total:</span>
              <span className="font-bold text-cinema-gold">Bs. {precioTotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-cinema-gray">Pago mediante QR (simulado)</p>
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
        <div className="card-cine p-8 text-center space-y-6">
          <h3 className="text-2xl font-bold text-cinema-gold">Escanea el código QR</h3>
          <p className="text-cinema-gray">Apunta tu cámara al siguiente código QR para completar el pago.</p>
          
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-2xl">
              {qrCode && <img src={qrCode} alt="QR Code" className="w-64 h-64" />}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-cinema-cream font-semibold">Tiempo restante:</p>
            <div className="text-4xl font-bold text-cinema-gold">
              {Math.floor(qrTimer / 60)}:{String(qrTimer % 60).padStart(2, '0')}
            </div>
            <p className="text-sm text-cinema-gray">10 minutos para completar la transacción</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
            <p className="text-sm text-cinema-gray">Comprobante de compra:</p>
            <p className="text-white font-semibold">{selectedFuncion.peliculaTitulo}</p>
            <p className="text-sm text-cinema-gray">{selectedFuncion.idSala} ({selectedFuncion.salaTipo})</p>
            <p className="text-sm text-cinema-gray">{new Date(selectedFuncion.fecha).toLocaleDateString('es-BO')} {selectedFuncion.horaInicio?.substring(0, 5)}</p>
            <div className="flex justify-between pt-2 border-t border-white/10">
              <span className="text-cinema-gray">Asientos: {selectedAsientos.length}</span>
              <span className="text-cinema-gold font-bold">Bs. {precioTotal.toFixed(2)}</span>
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

        <div className="card-cine p-8 text-center space-y-4">
          <h3 className="text-2xl font-bold text-cinema-gold">Compra exitosa</h3>
          <p className="text-cinema-gray">Comprobante: <span className="text-white font-semibold">{resultado.numeroComprobante}</span></p>
          <p className="text-cinema-gray">Total: <span className="text-cinema-gold font-bold">Bs. {Number(resultado.montoTotal).toFixed(2)}</span></p>
          <p className="text-sm text-cinema-gray">{emailStatus || 'El comprobante será enviado a tu correo electrónico.'}</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              className="btn-secondary"
              href="#"
              onClick={async (event) => {
                event.preventDefault();
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
                  setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo descargar el comprobante.' });
                }
              }}
            >
              Descargar comprobante PDF
            </a>
            <button className="btn-primary" onClick={nuevaCompra}>Nueva compra</button>
          </div>
        </div>
      )}
    </section>
  );
}
