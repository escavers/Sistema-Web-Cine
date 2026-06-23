import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Message from '../components/Message';
import { api } from '../services/api';

export default function HistorialPage() {
  const { user } = useAuth();
  const [historial, setHistorial] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    api.historialCliente(user.idUsuario)
      .then(res => setHistorial(res.historial))
      .catch(err => setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al cargar historial.' }));
  }, [user]);

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
              </tr>
            </thead>
            <tbody>
              {historial.map((h, i) => (
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
                      h.estado === 'COMPLETADA' ? 'bg-emerald-500/20 text-emerald-300' :
                      h.estado === 'CANCELADA' ? 'bg-red-500/20 text-red-300' :
                      'bg-cinema-gold/20 text-cinema-gold'
                    }`}>
                      {h.estado || '—'}
                    </span>
                  </td>
                </tr>
              ))}
              {historial.length === 0 && (
                <tr><td className="px-5 py-8 text-center" colSpan={8}>No tienes compras registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
