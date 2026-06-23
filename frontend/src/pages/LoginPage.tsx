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

  function update(name: string, value: string) {
    setForm((c) => ({ ...c, [name]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
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
          <Field label="Correo" name="correo" type="email" value={form.correo} required onChange={update} />
          <Field label="Contraseña" name="contrasena" type="password" value={form.contrasena} required onChange={update} />
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
