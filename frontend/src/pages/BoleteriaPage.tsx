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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function update(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleBlur(name: string, value: string) {
    let error = '';
    if (name === 'nombre1' && !value.trim()) error = 'Ingresa el primer nombre del cliente.';
    else if (name === 'apellidoP' && !value.trim()) error = 'Ingresa el apellido paterno del cliente.';
    else if (name === 'ci' && !value.trim()) error = 'Ingresa el número de cédula de identidad.';
    else if (name === 'correo' && !value.trim()) error = 'Ingresa un correo electrónico.';
    else if (name === 'correo' && value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Ingresa un correo electrónico válido (ejemplo@correo.com).';
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (error) next[name] = error;
      else delete next[name];
      return next;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const errors: Record<string, string> = {};
    if (!form.nombre1.trim()) errors.nombre1 = 'Ingresa el primer nombre del cliente.';
    if (!form.apellidoP.trim()) errors.apellidoP = 'Ingresa el apellido paterno del cliente.';
    if (!form.ci.trim()) errors.ci = 'Ingresa el número de cédula de identidad.';
    if (!form.correo.trim()) errors.correo = 'Ingresa un correo electrónico.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) errors.correo = 'Ingresa un correo electrónico válido (ejemplo@correo.com).';

    if (form.fechaNacimiento) {
      const hoy = new Date();
      const nac = new Date(form.fechaNacimiento);
      let edad = hoy.getFullYear() - nac.getFullYear();
      if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--;
      if (edad < 12) {
        errors.fechaNacimiento = 'Debe tener al menos 12 años para registrarse.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      const firstField = ['nombre1', 'apellidoP', 'ci', 'correo', 'fechaNacimiento'].find((f) => errors[f]);
      if (firstField) {
        const el = document.getElementById(`field-${firstField}`) as HTMLInputElement | null;
        if (el) el.focus();
      }
      return;
    }

    setFieldErrors({});

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
        <Field label="Primer nombre" name="nombre1" value={form.nombre1} required onChange={update} onBlur={handleBlur} error={fieldErrors.nombre1} />
        <Field label="Segundo nombre" name="nombre2" value={form.nombre2} onChange={update} />
        <Field label="Apellido paterno" name="apellidoP" value={form.apellidoP} required onChange={update} onBlur={handleBlur} error={fieldErrors.apellidoP} />
        <Field label="Apellido materno" name="apellidoM" value={form.apellidoM} required onChange={update} />
        <Field label="CI" name="ci" value={form.ci} required onChange={update} onBlur={handleBlur} error={fieldErrors.ci} />
        <Field label="Correo" name="correo" type="email" value={form.correo} required onChange={update} onBlur={handleBlur} error={fieldErrors.correo} />
        <Field label="Teléfono" name="telefono" value={form.telefono} onChange={update} />
        <Field label="Fecha nacimiento" name="fechaNacimiento" type="date" value={form.fechaNacimiento} onChange={update} error={fieldErrors.fechaNacimiento} />
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
