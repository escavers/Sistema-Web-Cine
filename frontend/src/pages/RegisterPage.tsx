import { useState } from 'react';
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
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function update(name: string, value: string) {
    setForm((c) => ({ ...c, [name]: value }));
  }

  function updateConfirmarContrasena(_name: string, value: string) {
    setConfirmarContrasena(value);
  }

  function validarFormulario() {
    if (!form.nombre1.trim()) return 'Ingrese su primer nombre.';
    if (!form.apellidoP.trim()) return 'Ingrese su apellido paterno.';
    if (!form.ci.trim()) return 'Ingrese su CI.';
    if (!form.correo.trim()) return 'Ingrese su correo electrónico.';
    if (!form.contrasena.trim()) return 'Ingrese una contraseña.';
    if (!confirmarContrasena.trim()) return 'Confirme su contraseña.';

    if (form.contrasena.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres.';
    }

    if (!/[A-Z]/.test(form.contrasena)) {
      return 'La contraseña debe incluir al menos una letra mayúscula.';
    }

    if (!/[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]]/.test(form.contrasena)) {
      return 'La contraseña debe incluir al menos un carácter especial.';
    }

    if (form.contrasena !== confirmarContrasena) {
      return 'Las contraseñas no coinciden.';
    }

    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const errorValidacion = validarFormulario();

    if (errorValidacion) {
      setMessage({ type: 'error', text: errorValidacion });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        nombre1: form.nombre1.trim(),
        nombre2: form.nombre2.trim() || null,
        apellidoP: form.apellidoP.trim(),
        apellidoM: form.apellidoM.trim() || null,
        ci: form.ci.trim(),
        correo: form.correo.trim().toLowerCase(),
        telefono: form.telefono.trim() || null,
        fechaNacimiento: form.fechaNacimiento || null,
        contrasena: form.contrasena,
        nit: form.nit.trim() || null,
        razonSocial: form.razonSocial.trim() || null
      };

      const res = await api.registroCliente(payload);

      setMessage({ type: 'ok', text: res.mensaje || 'Cuenta creada correctamente.' });
      setForm(initial);
      setConfirmarContrasena('');

      setTimeout(() => navigate('/login'), 1500);
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
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center px-4">
      <div className="card-cine w-full max-w-2xl p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Registro de cliente</h2>
          <p className="mt-2 text-sm text-cinema-gray">
            Cree su cuenta para comprar entradas en línea y consultar su historial.
          </p>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <Field label="Primer nombre" name="nombre1" value={form.nombre1} required onChange={update} />
          <Field label="Segundo nombre" name="nombre2" value={form.nombre2} onChange={update} />
          <Field label="Apellido paterno" name="apellidoP" value={form.apellidoP} required onChange={update} />
          <Field label="Apellido materno" name="apellidoM" value={form.apellidoM} onChange={update} />
          <Field label="CI" name="ci" value={form.ci} required onChange={update} />
          <Field label="Correo" name="correo" type="email" value={form.correo} required onChange={update} />
          <Field label="Teléfono" name="telefono" value={form.telefono} onChange={update} />
          <Field label="Fecha de nacimiento" name="fechaNacimiento" type="date" value={form.fechaNacimiento} onChange={update} />
          <Field label="Contraseña" name="contrasena" type="password" value={form.contrasena} required onChange={update} />
          <Field
            label="Confirmar contraseña"
            name="confirmarContrasena"
            type="password"
            value={confirmarContrasena}
            required
            onChange={updateConfirmarContrasena}
          />

          <div className="md:col-span-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-cinema-gray">
            Los datos de facturación podrán completarse al momento de realizar una compra.
          </div>

          <div className="md:col-span-2 space-y-4">
            {message && <Message type={message.type} text={message.text} />}

            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Registrando...' : 'Crear cuenta'}
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