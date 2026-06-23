import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Message from '../components/Message';
import SeatMap from '../components/SeatMap.tsx';
import { api } from '../services/api';

export default function CompraOnlinePage() {
  const { user } = useAuth();
  const [funciones, setFunciones] = useState<any[]>([]);
  const [filteredFunciones, setFilteredFunciones] = useState<any[]>([]);
  const [selectedFuncion, setSelectedFuncion] = useState<any>(null);
  const [asientos, setAsientos] = useState<any[]>([]);
  const [selectedAsientos, setSelectedAsientos] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [filterPelicula, setFilterPelicula] = useState('');
  const [filterFecha, setFilterFecha] = useState('');

  useEffect(() => {
    api.listarFunciones().then(res => {
      setFunciones(res.funciones);
      setFilteredFunciones(res.funciones);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let result = funciones;
    if (filterPelicula) result = result.filter(f => f.peliculaTitulo === filterPelicula);
    if (filterFecha) result = result.filter(f => f.fecha === filterFecha);
    setFilteredFunciones(result);
  }, [filterPelicula, filterFecha, funciones]);

  const peliculasUnicas = [...new Set(funciones.map(f => f.peliculaTitulo))];
  const fechasUnicas = [...new Set(funciones.map(f => f.fecha))];

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

  async function confirmarCompra() {
    if (!selectedFuncion || !selectedAsientos.length || !user) return;
    setLoading(true);
    setMessage(null);
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
  }

  const precioTotal = selectedFuncion ? Number(selectedFuncion.precioBase) * selectedAsientos.length : 0;

  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-bold text-white">Comprar boletos</h2>

      {message && <Message type={message.type} text={message.text} />}

      {step === 1 && (
        <>
          <div className="card-cine p-5">
            <div className="flex flex-wrap gap-4">
              <label className="block flex-1 min-w-[200px]">
                <span className="label-cine">Película</span>
                <select className="input-cine" value={filterPelicula} onChange={e => setFilterPelicula(e.target.value)}>
                  <option value="">Todas</option>
                  {peliculasUnicas.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="block flex-1 min-w-[200px]">
                <span className="label-cine">Fecha</span>
                <select className="input-cine" value={filterFecha} onChange={e => setFilterFecha(e.target.value)}>
                  <option value="">Todas</option>
                  {fechasUnicas.map(f => <option key={f} value={f}>{new Date(f).toLocaleDateString('es-BO')}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFunciones.map(f => (
              <div key={f.idFuncion} className="card-cine p-5 transition hover:border-cinema-gold/30 cursor-pointer" onClick={() => selectFuncion(f)}>
                {f.peliculaPoster && <img src={f.peliculaPoster} alt={f.peliculaTitulo} className="w-full h-40 object-cover rounded-xl mb-3" />}
                <h4 className="font-bold text-white">{f.peliculaTitulo}</h4>
                <p className="text-sm text-cinema-gray mt-1">{f.idSala} ({f.salaTipo})</p>
                <p className="text-sm text-cinema-gray">{new Date(f.fecha).toLocaleDateString('es-BO')} • {f.horaInicio?.substring(0, 5)}</p>
                <p className="text-cinema-gold font-semibold mt-2">Bs. {Number(f.precioBase).toFixed(2)}</p>
              </div>
            ))}
            {filteredFunciones.length === 0 && (
              <p className="text-cinema-gray col-span-full text-center py-8">No hay funciones disponibles con los filtros seleccionados.</p>
            )}
          </div>
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

      {step === 3 && resultado && (
        <div className="card-cine p-8 text-center space-y-4">
          <h3 className="text-2xl font-bold text-cinema-gold">Compra exitosa</h3>
          <p className="text-cinema-gray">Comprobante: <span className="text-white font-semibold">{resultado.numeroComprobante}</span></p>
          <p className="text-cinema-gray">Total: <span className="text-cinema-gold font-bold">Bs. {Number(resultado.montoTotal).toFixed(2)}</span></p>
          <p className="text-sm text-cinema-gray">El comprobante fue enviado a tu correo electrónico.</p>
          <button className="btn-primary mt-4" onClick={nuevaCompra}>Nueva compra</button>
        </div>
      )}
    </section>
  );
}
