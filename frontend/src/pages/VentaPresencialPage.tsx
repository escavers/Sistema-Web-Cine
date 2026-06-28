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

  useEffect(() => {
    api.listarFunciones().then(res => setFunciones(res.funciones)).catch(() => {});
  }, []);

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
      const blob = await api.descargarComprobantePdf(resultado.numeroComprobante);
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
        <div className="card-cine overflow-hidden">
          <div className="border-b border-white/10 px-6 py-5">
            <h3 className="text-lg font-bold text-white">Seleccionar función</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-cinema-gray">
              <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.15em] text-cinema-cream">
                <tr>
                  <th className="px-5 py-4">Película</th>
                  <th className="px-5 py-4">Sala</th>
                  <th className="px-5 py-4">Fecha</th>
                  <th className="px-5 py-4">Horario</th>
                  <th className="px-5 py-4">Precio</th>
                  <th className="px-5 py-4">Acción</th>
                </tr>
              </thead>
              <tbody>
                {funciones.map(f => (
                  <tr key={f.idFuncion} className="border-t border-white/5">
                    <td className="px-5 py-4 text-white font-medium">{f.peliculaTitulo}</td>
                    <td className="px-5 py-4">{f.idSala} ({f.salaTipo})</td>
                    <td className="px-5 py-4">{new Date(f.fecha).toLocaleDateString('es-BO')}</td>
                    <td className="px-5 py-4">{f.horaInicio?.substring(0, 5)}</td>
                    <td className="px-5 py-4">
                      Bs. {Number(f.precioBase).toFixed(2)}
                      {f.promocionActiva === 1 && (
                        <span className="ml-2 rounded bg-cinema-gold/20 px-2 py-0.5 text-xs font-bold text-cinema-gold">
                          2x1
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <button className="btn-primary px-3 py-1" onClick={() => selectFuncion(f)}>Seleccionar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 2 && selectedFuncion && (
        <div className="space-y-6">
          <div className="card-cine p-5">
            <p className="text-sm text-cinema-gray">
              <span className="font-semibold text-white">{selectedFuncion.peliculaTitulo}</span> — {selectedFuncion.idSala} ({selectedFuncion.salaTipo}) — {new Date(selectedFuncion.fecha).toLocaleDateString('es-BO')} {selectedFuncion.horaInicio?.substring(0, 5)}
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
                onClick={nuevaVenta}
              >
                Nueva venta
              </button>
            </div>
          </div>

          {/* VENTANA EMERGENTE (MODAL) CON VISTA PREVIA Y ACCIONES */}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
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
                        <p className="font-medium text-white">{selectedFuncion?.fecha ? new Date(selectedFuncion.fecha).toLocaleDateString('es-BO') : ''}</p>
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
