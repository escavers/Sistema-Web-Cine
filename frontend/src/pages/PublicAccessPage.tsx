import { useState } from 'react';
import Field from '../components/Field';
import Message from '../components/Message';
import { api, setSession } from '../services/api';
import type { AuthUser } from '../types';

interface PublicAccessPageProps {
  onLogin: (user: AuthUser) => void;
}

const loginInitial = {
  correo: '',
  contrasena: ''
};

const registerInitial = {
  nombre1: '',
  nombre2: '',
  apellidoP: '',
  apellidoM: '',
  ci: '',
  correo: '',
  telefono: '',
  fechaNacimiento: '',
  contrasena: '',
  nit: '',
  razonSocial: ''
};

export default function PublicAccessPage({ onLogin }: PublicAccessPageProps) {
  const [mode, setMode] = useState<'login' | 'registro'>('login');
  const [loginForm, setLoginForm] = useState(loginInitial);
  const [registerForm, setRegisterForm] = useState(registerInitial);
  const [message, setMessage] = useState<{ type: 'ok' | 'error' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function updateLogin(name: string, value: string) {
    setLoginForm((current) => ({ ...current, [name]: value }));
  }

  function updateRegister(name: string, value: string) {
    setRegisterForm((current) => ({ ...current, [name]: value }));
  }

  async function submitLogin(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const response = await api.login(loginForm);
      setSession(response.token, response.usuario);
      onLogin(response.usuario);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo iniciar sesión.'
      });
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const payload = Object.fromEntries(
        Object.entries(registerForm).map(([key, value]) => [key, value || null])
      );

      const response = await api.registroCliente(payload);
      setMessage({ type: 'ok', text: response.mensaje });
      setLoginForm({ correo: registerForm.correo, contrasena: '' });
      setRegisterForm(registerInitial);
      setMode('login');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo crear la cuenta.'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-[1fr_480px]">
      <section>
        <div className="inline-flex rounded-full border border-cinema-gold/30 bg-cinema-gold/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-cinema-gold">
          Bienvenido
        </div>

        <h2 className="mt-6 max-w-3xl text-5xl font-black leading-tight text-white">
          Ingresa al portal del cine y administra tu experiencia de manera sencilla.
        </h2>

        <p className="mt-5 max-w-2xl text-base leading-8 text-cinema-gray">
          Crea tu cuenta como cliente, inicia sesión o accede como personal autorizado para continuar con los procesos internos del cine.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="soft-card">
            <p className="font-semibold text-cinema-cream">Cuenta de cliente</p>
            <p className="mt-2 text-sm leading-6 text-cinema-gray">Registro rápido para acceder al sistema.</p>
          </div>
          <div className="soft-card">
            <p className="font-semibold text-cinema-cream">Atención presencial</p>
            <p className="mt-2 text-sm leading-6 text-cinema-gray">El personal puede registrar clientes en boletería.</p>
          </div>
          <div className="soft-card">
            <p className="font-semibold text-cinema-cream">Acceso protegido</p>
            <p className="mt-2 text-sm leading-6 text-cinema-gray">Cada perfil accede solo a sus funciones.</p>
          </div>
        </div>
      </section>

      <section className="card-cine p-7">
        <div className="mb-6 grid grid-cols-2 rounded-2xl border border-white/10 bg-black/20 p-1">
          <button
            className={mode === 'login' ? 'btn-primary py-2' : 'rounded-xl px-4 py-2 text-sm font-semibold text-cinema-gray transition hover:text-white'}
            onClick={() => {
              setMode('login');
              setMessage(null);
            }}
            type="button"
          >
            Iniciar sesión
          </button>
          <button
            className={mode === 'registro' ? 'btn-primary py-2' : 'rounded-xl px-4 py-2 text-sm font-semibold text-cinema-gray transition hover:text-white'}
            onClick={() => {
              setMode('registro');
              setMessage(null);
            }}
            type="button"
          >
            Crear cuenta
          </button>
        </div>

        {mode === 'login' ? (
          <form className="space-y-5" onSubmit={submitLogin}>
            <div>
              <h3 className="text-2xl font-bold text-white">Acceso al portal</h3>
              <p className="mt-2 text-sm leading-6 text-cinema-gray">
                Ingrese con el correo y contraseña registrados en la base de datos.
              </p>
            </div>

            <Field label="Correo" name="correo" type="email" value={loginForm.correo} required onChange={updateLogin} />
            <Field label="Contraseña" name="contrasena" type="password" value={loginForm.contrasena} required onChange={updateLogin} />

            {message && <Message type={message.type} text={message.text} />}

            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Validando...' : 'Ingresar'}
            </button>
          </form>
        ) : (
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submitRegister}>
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold text-white">Crear cuenta de cliente</h3>
              <p className="mt-2 text-sm leading-6 text-cinema-gray">
                Complete sus datos para probar el acceso como cliente.
              </p>
            </div>

            <Field label="Primer nombre" name="nombre1" value={registerForm.nombre1} required onChange={updateRegister} />
            <Field label="Segundo nombre" name="nombre2" value={registerForm.nombre2} onChange={updateRegister} />
            <Field label="Apellido paterno" name="apellidoP" value={registerForm.apellidoP} required onChange={updateRegister} />
            <Field label="Apellido materno" name="apellidoM" value={registerForm.apellidoM} onChange={updateRegister} />
            <Field label="CI" name="ci" value={registerForm.ci} onChange={updateRegister} />
            <Field label="Correo" name="correo" type="email" value={registerForm.correo} required onChange={updateRegister} />
            <Field label="Teléfono" name="telefono" value={registerForm.telefono} onChange={updateRegister} />
            <Field label="Fecha nacimiento" name="fechaNacimiento" type="date" value={registerForm.fechaNacimiento} onChange={updateRegister} />
            <Field label="Contraseña" name="contrasena" type="password" value={registerForm.contrasena} required onChange={updateRegister} />
            <Field label="NIT" name="nit" value={registerForm.nit} onChange={updateRegister} />

            <div className="md:col-span-2">
              <Field label="Razón social" name="razonSocial" value={registerForm.razonSocial} onChange={updateRegister} />
            </div>

            <div className="md:col-span-2 space-y-4">
              {message && <Message type={message.type} text={message.text} />}
              <button className="btn-primary w-full" disabled={loading}>
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
