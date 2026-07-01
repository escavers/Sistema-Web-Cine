import { useState } from 'react';
import { Link } from 'react-router-dom';
import Field from '../components/Field';
import Message from '../components/Message';
import { api, setSession } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ correo: '', contrasena: '' });
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function update(name: string, value: string) {
    setForm((c) => ({ ...c, [name]: value }));
  }

  function handleBlur(name: string, value: string) {
    let error = '';
    if (name === 'correo' && !value.trim()) error = 'Ingresa tu correo electrónico.';
    else if (name === 'correo' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Ingresa un correo electrónico válido (ejemplo@correo.com).';
    else if (name === 'contrasena' && !value.trim()) error = 'Ingresa tu contraseña.';
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (error) next[name] = error;
      else delete next[name];
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const errors: Record<string, string> = {};
    if (!form.correo.trim()) errors.correo = 'Ingresa tu correo electrónico.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) errors.correo = 'Ingresa un correo electrónico válido (ejemplo@correo.com).';
    if (!form.contrasena.trim()) errors.contrasena = 'Ingresa tu contraseña.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstField = errors.correo ? 'correo' : 'contrasena';
      const el = document.getElementById(`field-${firstField}`) as HTMLInputElement | null;
      if (el) el.focus();
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      const res = await api.login(form);
      setSession(res.token, res.usuario);
      login(res.token, res.usuario);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al iniciar sesión.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <div className="card-cine w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cinema-gold">Cine La Paz</p>
          <h2 className="mt-3 text-2xl font-bold text-white">Iniciar sesión</h2>
          <p className="mt-2 text-sm text-cinema-gray">Ingrese con sus credenciales registradas.</p>
        </div>

        <form className="space-y-5" onSubmit={submit}>
          <Field label="Correo" name="correo" type="email" value={form.correo} required onChange={update} onBlur={handleBlur} error={fieldErrors.correo} />
          <Field label="Contraseña" name="contrasena" type="password" value={form.contrasena} required onChange={update} onBlur={handleBlur} error={fieldErrors.contrasena} />
          {message && <Message type={message.type} text={message.text} />}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Validando...' : 'Ingresar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-cinema-gray">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-cinema-gold hover:underline">
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
