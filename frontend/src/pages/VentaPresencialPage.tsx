import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Message from '../components/Message';
import SeatMap from '../components/SeatMap.tsx';
import { api } from '../services/api';

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

  useEffect(() => {
    api.listarFunciones().then(res => setFunciones(res.funciones)).catch(() => {});
  }, []);

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
                    <td className="px-5 py-4">Bs. {Number(f.precioBase).toFixed(2)}</td>
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
          <button className="btn-primary mt-4" onClick={nuevaVenta}>Nueva venta</button>
        </div>
      )}
    </section>
  );
}
