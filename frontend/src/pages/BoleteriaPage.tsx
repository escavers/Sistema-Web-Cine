import { useState } from 'react';
import Field from '../components/Field';
import Message from '../components/Message';
import { api } from '../services/api';

const initial = {
  nombre1: '',
  nombre2: '',
  apellidoP: '',
  apellidoM: '',
  ci: '',
  correo: '',
  telefono: '',
  fechaNacimiento: '',
  nit: '',
  razonSocial: ''
};

export default function BoleteriaPage() {
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<{ type: 'ok' | 'error' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function update(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, value || null])
      );

      const response = await api.registroPresencial(payload);

      setMessage({
        type: 'ok',
        text: `${response.mensaje} Contraseña temporal para entregar al cliente: ${response.cliente.contrasenaTemporal}`
      });

      setForm(initial);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo registrar al cliente.'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card-cine p-7">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Registro asistido de cliente</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-cinema-gray">
          Complete los datos del cliente atendido en boletería. La contraseña temporal se genera con el CI más la inicial del apellido paterno y materno.
        </p>
      </div>

      <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
        <Field label="Primer nombre" name="nombre1" value={form.nombre1} required onChange={update} />
        <Field label="Segundo nombre" name="nombre2" value={form.nombre2} onChange={update} />
        <Field label="Apellido paterno" name="apellidoP" value={form.apellidoP} required onChange={update} />
        <Field label="Apellido materno" name="apellidoM" value={form.apellidoM} required onChange={update} />
        <Field label="CI" name="ci" value={form.ci} required onChange={update} />
        <Field label="Correo" name="correo" type="email" value={form.correo} required onChange={update} />
        <Field label="Teléfono" name="telefono" value={form.telefono} onChange={update} />
        <Field label="Fecha nacimiento" name="fechaNacimiento" type="date" value={form.fechaNacimiento} onChange={update} />
        <Field label="NIT" name="nit" value={form.nit} onChange={update} />
        <Field label="Razón social" name="razonSocial" value={form.razonSocial} onChange={update} />

        <div className="md:col-span-2 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-cinema-gray">
            La contraseña temporal: 
          </div>
          {message && <Message type={message.type} text={message.text} />}
          <button className="btn-primary" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar cliente'}
          </button>
        </div>
      </form>
    </section>
  );
}
