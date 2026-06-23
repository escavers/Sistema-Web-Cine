import { useEffect, useState } from 'react';
import Field from '../components/Field';
import Message from '../components/Message';
import { api } from '../services/api';

const initial = { idSala: '', idPelicula: '', fecha: '', horaInicio: '', precioBase: '' };

export default function FuncionesPage() {
  const [funciones, setFunciones] = useState<any[]>([]);
  const [peliculas, setPeliculas] = useState<any[]>([]);
  const [salas, setSalas] = useState<any[]>([]);
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const [fRes, pRes, sRes] = await Promise.all([
        api.listarFunciones(),
        api.listarPeliculas(),
        api.listarSalas(),
      ]);
      setFunciones(fRes.funciones);
      setPeliculas(pRes.peliculas);
      setSalas(sRes.salas);
    } catch {
      setMessage({ type: 'error', text: 'No se pudieron cargar los datos.' });
    }
  }

  useEffect(() => { load(); }, []);

  function update(name: string, value: string) {
    setForm(c => ({ ...c, [name]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      // Calcular horaFin basado en duración de película
      const pel = peliculas.find(p => p.idPelicula === Number(form.idPelicula));
      const duracion = pel?.duracionMinutos || 120;
      const [h, m] = form.horaInicio.split(':').map(Number);
      const finMin = h * 60 + m + duracion;
      const hFin = String(Math.floor(finMin / 60) % 24).padStart(2, '0');
      const mFin = String(finMin % 60).padStart(2, '0');

      const payload = {
        idSala: form.idSala,
        idPelicula: Number(form.idPelicula),
        fecha: form.fecha,
        horaInicio: form.horaInicio + ':00',
        horaFin: `${hFin}:${mFin}:00`,
        precioBase: Number(form.precioBase),
      };

      await api.crearFuncion(payload);
      setMessage({ type: 'ok', text: 'Función creada correctamente.' });
      setForm(initial);
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al crear función.' });
    } finally {
      setLoading(false);
    }
  }

  async function del(id: number) {
    if (!window.confirm('¿Eliminar esta función?')) return;
    try {
      await api.eliminarFuncion(id);
      setMessage({ type: 'ok', text: 'Función eliminada.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al eliminar.' });
    }
  }

  return (
    <section className="space-y-8">
      <div className="card-cine p-7">
        <h2 className="text-2xl font-bold text-white">Nueva función</h2>
        <form className="mt-6 grid gap-4 md:grid-cols-3" onSubmit={submit}>
          <label className="block">
            <span className="label-cine">Película</span>
            <select className="input-cine" value={form.idPelicula} required onChange={e => update('idPelicula', e.target.value)}>
              <option value="">Seleccionar...</option>
              {peliculas.map(p => <option key={p.idPelicula} value={p.idPelicula}>{p.titulo}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label-cine">Sala</span>
            <select className="input-cine" value={form.idSala} required onChange={e => update('idSala', e.target.value)}>
              <option value="">Seleccionar...</option>
              {salas.map(s => <option key={s.idSala} value={s.idSala}>{s.idSala} ({s.tipo})</option>)}
            </select>
          </label>
          <Field label="Fecha" name="fecha" type="date" value={form.fecha} required onChange={update} />
          <Field label="Hora inicio" name="horaInicio" type="time" value={form.horaInicio} required onChange={update} />
          <Field label="Precio base (Bs.)" name="precioBase" type="number" value={form.precioBase} required onChange={update} />
          <div className="flex items-end">
            <div className="space-y-4 w-full">
              {message && <Message type={message.type} text={message.text} />}
              <button className="btn-primary w-full" disabled={loading}>{loading ? 'Creando...' : 'Crear función'}</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card-cine overflow-hidden">
        <div className="border-b border-white/10 px-6 py-5">
          <h3 className="text-xl font-bold text-white">Funciones programadas</h3>
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
                <th className="px-5 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {funciones.map(f => (
                <tr key={f.idFuncion} className="border-t border-white/5">
                  <td className="px-5 py-4 text-white font-medium">{f.peliculaTitulo}</td>
                  <td className="px-5 py-4">{f.idSala} ({f.salaTipo})</td>
                  <td className="px-5 py-4">{new Date(f.fecha).toLocaleDateString('es-BO')}</td>
                  <td className="px-5 py-4">{f.horaInicio?.substring(0, 5)} - {f.horaFin?.substring(0, 5)}</td>
                  <td className="px-5 py-4">Bs. {Number(f.precioBase).toFixed(2)}</td>
                  <td className="px-5 py-4">
                    <button className="btn-primary px-3 py-1" onClick={() => del(f.idFuncion)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {funciones.length === 0 && (
                <tr><td className="px-5 py-8 text-center" colSpan={6}>No hay funciones programadas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
