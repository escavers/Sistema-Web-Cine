import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Message from '../components/Message';
import { api } from '../services/api';

export default function ComprobantePublicoPage() {
  const { numero } = useParams<{ numero: string }>();
  const [busqueda, setBusqueda] = useState(numero ?? '');
  const [comprobante, setComprobante] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (!busqueda.trim()) return;
    setLoading(true);
    setMessage(null);
    setComprobante(null);
    try {
      const res = await api.obtenerComprobante(busqueda.trim());
      if (res.ok && res.comprobante) {
        setComprobante(res.comprobante);
      } else {
        setMessage({ type: 'error', text: 'Comprobante no encontrado.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al buscar comprobante.' });
    } finally {
      setLoading(false);
    }
  }

  async function descargarPdf() {
    if (!busqueda.trim()) return;
    setDownloading(true);
    setMessage(null);
    try {
      const blob = await api.descargarComprobantePdf(busqueda.trim());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobante-${busqueda.trim()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al descargar PDF.' });
    } finally {
      setDownloading(false);
    }
  }

  function formatFecha(val: any): string {
    if (!val) return '—';
    const d = new Date(val);
    return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('es-BO');
  }

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <div className="card-cine w-full max-w-lg p-8">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cinema-gold">Cine La Paz</p>
          <h2 className="mt-3 text-2xl font-bold text-white">Consulta de Comprobante</h2>
          <p className="mt-2 text-sm text-cinema-gray">Ingrese el número de comprobante para ver los detalles.</p>
        </div>

        <form className="space-y-5" onSubmit={buscar}>
          <label className="block">
            <span className="label-cine">Número de comprobante</span>
            <input
              type="text"
              className="input-cine"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Ej: CMP-20250101-0001"
              required
            />
          </label>
          {message && <Message type={message.type} text={message.text} />}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
        </form>

        {comprobante && (
          <div className="mt-6 space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="text-lg font-bold text-white">Detalle del Comprobante</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-cinema-gray">Película</span>
                <p className="font-semibold text-white">{comprobante.pelicula ?? '—'}</p>
              </div>
              <div>
                <span className="text-cinema-gray">Fecha</span>
                <p className="font-semibold text-white">{formatFecha(comprobante.fecha)}</p>
              </div>
              <div>
                <span className="text-cinema-gray">Hora</span>
                <p className="font-semibold text-white">{comprobante.horaInicio ?? comprobante.hora ?? '—'}</p>
              </div>
              <div>
                <span className="text-cinema-gray">Sala</span>
                <p className="font-semibold text-white">{comprobante.sala ?? '—'}</p>
              </div>
              <div>
                <span className="text-cinema-gray">Asientos</span>
                <p className="font-semibold text-white">{comprobante.asientos ?? comprobante.numeroAsientos ?? '—'}</p>
              </div>
              <div>
                <span className="text-cinema-gray">Monto total</span>
                <p className="font-semibold text-cinema-gold">
                  Bs. {Number(comprobante.montoTotal ?? comprobante.monto ?? 0).toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-cinema-gray">Método de pago</span>
                <p className="font-semibold text-white">{comprobante.metodoPago ?? '—'}</p>
              </div>
              <div>
                <span className="text-cinema-gray">Estado</span>
                <p className="font-semibold text-white">{comprobante.estado ?? '—'}</p>
              </div>
            </div>

            <div className="pt-3">
              <button
                className="w-full rounded-lg border border-cinema-gold/40 bg-cinema-gold/10 px-4 py-2 text-sm font-semibold text-cinema-gold transition hover:bg-cinema-gold/20 disabled:opacity-50"
                disabled={downloading}
                onClick={descargarPdf}
              >
                {downloading ? 'Generando…' : 'Descargar PDF'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
