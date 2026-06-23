import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Field from '../components/Field';
import Message from '../components/Message';
import { api } from '../services/api';

const initial = {
  nombre1: '', nombre2: '', apellidoP: '', apellidoM: '',
  ci: '', correo: '', telefono: '', fechaNacimiento: '',
  contrasena: '', nit: '', razonSocial: ''
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

    // Auto-llenar NIT con CI
    useEffect(() => {
      if (form.ci && !form.nit) {
        setForm(c => ({ ...c, nit: form.ci }));
      }
    }, [form.ci]);

    function update(name: string, value: string) {
      setForm((c) => ({ ...c, [name]: value }));
    }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v || null]));
      const res = await api.registroCliente(payload);
      setMessage({ type: 'ok', text: res.mensaje });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'No se pudo crear la cuenta.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <div className="card-cine w-full max-w-2xl p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Crear cuenta de cliente</h2>
          <p className="mt-2 text-sm text-cinema-gray">Complete sus datos para registrarse en el portal.</p>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <Field label="Primer nombre" name="nombre1" value={form.nombre1} required onChange={update} />
          <Field label="Segundo nombre" name="nombre2" value={form.nombre2} onChange={update} />
          <Field label="Apellido paterno" name="apellidoP" value={form.apellidoP} required onChange={update} />
          <Field label="Apellido materno" name="apellidoM" value={form.apellidoM} onChange={update} />
          <Field label="CI" name="ci" value={form.ci} onChange={update} />
          <Field label="Correo" name="correo" type="email" value={form.correo} required onChange={update} />
          <Field label="Teléfono" name="telefono" value={form.telefono} onChange={update} />
          <Field label="Fecha nacimiento" name="fechaNacimiento" type="date" value={form.fechaNacimiento} onChange={update} />
          <Field label="Contraseña" name="contrasena" type="password" value={form.contrasena} required onChange={update} />
          <Field label="NIT" name="nit" value={form.nit} onChange={update} />
          <div className="md:col-span-2">
            <Field label="Razón social" name="razonSocial" value={form.razonSocial} onChange={update} />
          </div>
          <div className="md:col-span-2 space-y-4">
            {message && <Message type={message.type} text={message.text} />}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-cinema-gray">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-cinema-gold hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
