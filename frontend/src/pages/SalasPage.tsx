import { useEffect, useState } from 'react';
import Field from '../components/Field';
import Message from '../components/Message';
import { api } from '../services/api';

const initial = { idSala: '', tipo: 'Estándar', capacidadTotal: '', filas: '', columnas: '' };
const tipos = ['Estándar', '3D', 'VIP'];

export default function SalasPage() {
  const [salas, setSalas] = useState<any[]>([]);
  const [form, setForm] = useState(initial);
  const [editId, setEditId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const res = await api.listarSalas();
      setSalas(res.salas);
    } catch {
      setMessage({ type: 'error', text: 'No se pudieron cargar las salas.' });
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
      const payload = {
        ...form,
        capacidadTotal: Number(form.capacidadTotal),
        filas: Number(form.filas),
        columnas: Number(form.columnas),
      };
      if (editId) {
        await api.actualizarSala(editId, payload);
        setMessage({ type: 'ok', text: 'Sala actualizada.' });
      } else {
        await api.crearSala(payload);
        setMessage({ type: 'ok', text: 'Sala creada. Los asientos se generaron automáticamente.' });
      }
      setForm(initial);
      setEditId(null);
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar.' });
    } finally {
      setLoading(false);
    }
  }

  async function del(id: string) {
    if (!window.confirm('¿Eliminar esta sala y todos sus asientos?')) return;
    try {
      await api.eliminarSala(id);
      setMessage({ type: 'ok', text: 'Sala eliminada.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al eliminar.' });
    }
  }

  return (
    <section className="space-y-8">
      <div className="card-cine p-7">
        <h2 className="text-2xl font-bold text-white">{editId ? 'Editar sala' : 'Nueva sala'}</h2>
        <form className="mt-6 grid gap-4 md:grid-cols-4" onSubmit={submit}>
          {!editId && <Field label="ID Sala" name="idSala" value={form.idSala} required onChange={update} placeholder="Ej: SALA-5" />}
          <label className="block">
            <span className="label-cine">Tipo</span>
            <select className="input-cine" value={form.tipo} onChange={e => update('tipo', e.target.value)}>
              {tipos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <Field label="Filas" name="filas" type="number" value={form.filas} required onChange={update} />
          <Field label="Columnas" name="columnas" type="number" value={form.columnas} required onChange={update} />
          <Field label="Capacidad total" name="capacidadTotal" type="number" value={form.capacidadTotal} required onChange={update} />
          <div className="md:col-span-4 space-y-4">
            {message && <Message type={message.type} text={message.text} />}
            <div className="flex gap-3">
              <button className="btn-primary" disabled={loading}>{loading ? 'Guardando...' : editId ? 'Actualizar' : 'Crear sala'}</button>
              {editId && <button type="button" className="btn-secondary" onClick={() => { setEditId(null); setForm(initial); }}>Cancelar</button>}
            </div>
          </div>
        </form>
      </div>

      <div className="card-cine overflow-hidden">
        <div className="border-b border-white/10 px-6 py-5">
          <h3 className="text-xl font-bold text-white">Salas del cine</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-cinema-gray">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.15em] text-cinema-cream">
              <tr>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Tipo</th>
                <th className="px-5 py-4">Filas × Cols</th>
                <th className="px-5 py-4">Capacidad</th>
                <th className="px-5 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {salas.map(s => (
                <tr key={s.idSala} className="border-t border-white/5">
                  <td className="px-5 py-4 text-white font-medium">{s.idSala}</td>
                  <td className="px-5 py-4">{s.tipo}</td>
                  <td className="px-5 py-4">{s.filas} × {s.columnas}</td>
                  <td className="px-5 py-4">{s.capacidadTotal}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button className="btn-secondary px-3 py-1" onClick={() => { setForm({ idSala: s.idSala, tipo: s.tipo, capacidadTotal: String(s.capacidadTotal), filas: String(s.filas), columnas: String(s.columnas) }); setEditId(s.idSala); }}>Editar</button>
                      <button className="btn-primary px-3 py-1" onClick={() => del(s.idSala)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {salas.length === 0 && (
                <tr><td className="px-5 py-8 text-center" colSpan={5}>No hay salas registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
