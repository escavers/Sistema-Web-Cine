import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Message from '../components/Message';
import { api } from '../services/api';

export default function HistorialPage() {
  const { user } = useAuth();
  const [historial, setHistorial] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loadingCancel, setLoadingCancel] = useState<number | null>(null);

  const fetchHistorial = () => {
    if (!user) return;
    api.historialCliente(user.idUsuario)
      .then(res => setHistorial(res.historial))
      .catch(err => setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al cargar historial.' }));
  };

  useEffect(() => {
    fetchHistorial();
  }, [user]);

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

  const buildFuncionDateTime = (fecha: string | Date | null, hora: string | undefined) => {
    if (!fecha) return null;
    const fechaObj = new Date(fecha);
    if (Number.isNaN(fechaObj.getTime())) return null;
    if (hora) {
      const [h, m] = hora.split(':').map(Number);
      if (!Number.isNaN(h) && !Number.isNaN(m)) {
        fechaObj.setHours(h, m, 0, 0);
      }
    }
    return fechaObj;
  };

  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-bold text-white">Mi historial de compras</h2>
      {message && <Message type={message.type} text={message.text} />}

      <div className="card-cine overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-cinema-gray">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.15em] text-cinema-cream">
              <tr>
                <th className="px-5 py-4">Comprobante</th>
                <th className="px-5 py-4">Película</th>
                <th className="px-5 py-4">Fecha función</th>
                <th className="px-5 py-4">Horario</th>
                <th className="px-5 py-4">Sala</th>
                <th className="px-5 py-4">Asientos</th>
                <th className="px-5 py-4">Total</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4">Acción</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((h, i) => {
                const canCancel = h.estadoVenta === 'COMPLETADA' && (() => {
                  const fechaFuncion = buildFuncionDateTime(h.fecha, h.horaInicio);
                  if (!fechaFuncion) return false;
                  const now = new Date();
                  const diffHours = (fechaFuncion.getTime() - now.getTime()) / (1000 * 60 * 60);
                  return diffHours >= 24;
                })();

                return (
                  <tr key={i} className="border-t border-white/5">
                    <td className="px-5 py-4 text-white font-medium">{h.numero}</td>
                    <td className="px-5 py-4">{h.peliculaTitulo}</td>
                    <td className="px-5 py-4">{h.fecha ? new Date(h.fecha).toLocaleDateString('es-BO') : '—'}</td>
                    <td className="px-5 py-4">{h.horaInicio?.substring(0, 5)}</td>
                    <td className="px-5 py-4">{h.salaTipo || h.idSala}</td>
                    <td className="px-5 py-4">{h.asientos}</td>
                    <td className="px-5 py-4 text-cinema-gold font-semibold">Bs. {Number(h.montoTotal).toFixed(2)}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        h.estadoVenta === 'COMPLETADA' ? 'bg-emerald-500/20 text-emerald-300' :
                        h.estadoVenta === 'CANCELADA' ? 'bg-red-500/20 text-red-300' :
                        'bg-cinema-gold/20 text-cinema-gold'
                      }`}>
                        {h.estadoVenta || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {canCancel ? (
                        <button
                          className="rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                          disabled={loadingCancel === h.idVenta}
                          onClick={() => handleCancel(h.idVenta)}
                        >
                          {loadingCancel === h.idVenta ? 'Cancelando...' : 'Cancelar'}
                        </button>
                      ) : (
                        <span className="text-xs text-cinema-cream">No cancelable</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {historial.length === 0 && (
                <tr><td className="px-5 py-8 text-center" colSpan={9}>No tienes compras registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
