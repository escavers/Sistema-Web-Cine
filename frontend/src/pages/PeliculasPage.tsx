import { useEffect, useState } from 'react';
import Field from '../components/Field';
import Message from '../components/Message';
import { api } from '../services/api';

const initial = {
  titulo: '', director: '', sinopsis: '', posterUrl: '',
  duracionMinutos: '', clasificacionEdad: 'TP', fechaEstreno: ''
};

const clasificaciones = ['TP', '13', '16', '18'];

export default function PeliculasPage() {
  const [peliculas, setPeliculas] = useState<any[]>([]);
  const [form, setForm] = useState(initial);
  const [editId, setEditId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const res = await api.listarPeliculas();
      setPeliculas(res.peliculas);
    } catch (err) {
      setMessage({ type: 'error', text: 'No se pudieron cargar las películas.' });
    }
  }

  useEffect(() => { load(); }, []);

  function update(name: string, value: string) {
    setForm(c => ({ ...c, [name]: value }));
  }

  function edit(p: any) {
    setForm({
      titulo: p.titulo, director: p.director || '', sinopsis: p.sinopsis || '',
      posterUrl: p.posterUrl || '', duracionMinutos: String(p.duracionMinutos || ''),
      clasificacionEdad: p.clasificacionEdad || 'TP', fechaEstreno: p.fechaEstreno ? p.fechaEstreno.split('T')[0] : ''
    });
    setEditId(p.idPelicula);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const payload = {
        ...form,
        duracionMinutos: form.duracionMinutos ? Number(form.duracionMinutos) : null,
        fechaEstreno: form.fechaEstreno || null,
        posterUrl: form.posterUrl || null,
        sinopsis: form.sinopsis || null,
        director: form.director || null,
      };
      if (editId) {
        await api.actualizarPelicula(editId, payload);
        setMessage({ type: 'ok', text: 'Película actualizada correctamente.' });
      } else {
        await api.crearPelicula(payload);
        setMessage({ type: 'ok', text: 'Película creada correctamente.' });
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

  async function del(id: number) {
    if (!window.confirm('¿Eliminar esta película?')) return;
    try {
      await api.eliminarPelicula(id);
      setMessage({ type: 'ok', text: 'Película eliminada.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al eliminar.' });
    }
  }

  return (
    <section className="space-y-8">
      <div className="card-cine p-7">
        <h2 className="text-2xl font-bold text-white">{editId ? 'Editar película' : 'Nueva película'}</h2>
        <form className="mt-6 grid gap-4 md:grid-cols-3" onSubmit={submit}>
          <Field label="Título" name="titulo" value={form.titulo} required onChange={update} />
          <Field label="Director" name="director" value={form.director} onChange={update} />
          <Field label="Duración (min)" name="duracionMinutos" type="number" value={form.duracionMinutos} onChange={update} />
          <label className="block">
            <span className="label-cine">Clasificación</span>
            <select className="input-cine" value={form.clasificacionEdad} onChange={e => update('clasificacionEdad', e.target.value)}>
              {clasificaciones.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <Field label="Fecha estreno" name="fechaEstreno" type="date" value={form.fechaEstreno} onChange={update} />
          <Field label="URL poster" name="posterUrl" value={form.posterUrl} onChange={update} />
          <div className="md:col-span-3">
            <label className="block">
              <span className="label-cine">Sinopsis</span>
              <textarea className="input-cine" rows={3} value={form.sinopsis} onChange={e => update('sinopsis', e.target.value)} />
            </label>
          </div>
          <div className="md:col-span-3 space-y-4">
            {message && <Message type={message.type} text={message.text} />}
            <div className="flex gap-3">
              <button className="btn-primary" disabled={loading}>{loading ? 'Guardando...' : editId ? 'Actualizar' : 'Crear película'}</button>
              {editId && <button type="button" className="btn-secondary" onClick={() => { setEditId(null); setForm(initial); }}>Cancelar</button>}
            </div>
          </div>
        </form>
      </div>

      <div className="card-cine overflow-hidden">
        <div className="border-b border-white/10 px-6 py-5">
          <h3 className="text-xl font-bold text-white">Películas en cartelera</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-cinema-gray">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.15em] text-cinema-cream">
              <tr>
                <th className="px-5 py-4">Título</th>
                <th className="px-5 py-4">Director</th>
                <th className="px-5 py-4">Duración</th>
                <th className="px-5 py-4">Clasificación</th>
                <th className="px-5 py-4">Estreno</th>
                <th className="px-5 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {peliculas.map(p => (
                <tr key={p.idPelicula} className="border-t border-white/5">
                  <td className="px-5 py-4 text-white font-medium">{p.titulo}</td>
                  <td className="px-5 py-4">{p.director || '—'}</td>
                  <td className="px-5 py-4">{p.duracionMinutos ? `${p.duracionMinutos} min` : '—'}</td>
                  <td className="px-5 py-4">{p.clasificacionEdad}</td>
                  <td className="px-5 py-4">{p.fechaEstreno ? new Date(p.fechaEstreno).toLocaleDateString('es-BO') : '—'}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button className="btn-secondary px-3 py-1" onClick={() => edit(p)}>Editar</button>
                      <button className="btn-primary px-3 py-1" onClick={() => del(p.idPelicula)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {peliculas.length === 0 && (
                <tr><td className="px-5 py-8 text-center" colSpan={6}>No hay películas registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
