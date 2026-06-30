import { useState, useRef } from 'react';
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const firstErrorRef = useRef<HTMLInputElement | null>(null);

  function update(name: string, value: string) {
    setForm((c) => ({ ...c, [name]: value }));
  }

  function updateConfirmarContrasena(_name: string, value: string) {
    setConfirmarContrasena(value);
  }

  function validateField(name: string, value: string) {
    let error = '';
    if (name === 'nombre1' && !value.trim()) error = 'Ingresa tu primer nombre.';
    else if (name === 'apellidoP' && !value.trim()) error = 'Ingresa tu apellido paterno.';
    else if (name === 'ci' && !value.trim()) error = 'Ingresa tu número de cédula de identidad.';
    else if (name === 'correo' && !value.trim()) error = 'Ingresa un correo electrónico.';
    else if (name === 'correo' && value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Ingresa un correo electrónico válido (ejemplo@correo.com).';
    else if (name === 'contrasena' && !value.trim()) error = 'Ingresa una contraseña.';
    else if (name === 'contrasena' && value.length < 8) error = 'La contraseña debe tener al menos 8 caracteres.';
    else if (name === 'contrasena' && !/[A-Z]/.test(value)) error = 'La contraseña debe incluir al menos una letra mayúscula.';
    else if (name === 'contrasena' && !/[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]]/.test(value)) error = 'La contraseña debe incluir al menos un carácter especial.';
    else if (name === 'confirmarContrasena' && !value.trim()) error = 'Confirme su contraseña.';
    else if (name === 'confirmarContrasena' && value !== form.contrasena) error = 'Las contraseñas no coinciden.';
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (error) next[name] = error;
      else delete next[name];
      return next;
    });
  }

  function handleBlur(name: string, value: string) {
    validateField(name, value);
  }

  function validarFormulario() {
    if (!form.nombre1.trim()) return 'Ingrese su primer nombre.';
    if (!form.apellidoP.trim()) return 'Ingrese su apellido paterno.';
    if (!form.ci.trim()) return 'Ingrese su CI.';
    if (!form.correo.trim()) return 'Ingrese su correo electrónico.';
    if (form.fechaNacimiento) {
      const hoy = new Date();
      const nac = new Date(form.fechaNacimiento);
      let edad = hoy.getFullYear() - nac.getFullYear();
      if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--;
      if (edad < 12) return 'Debe tener al menos 12 años para registrarse.';
    }
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
      const fieldMap: Record<string, string> = {
        'Ingrese su primer nombre.': 'nombre1',
        'Ingrese su apellido paterno.': 'apellidoP',
        'Ingrese su CI.': 'ci',
        'Ingrese su correo electrónico.': 'correo',
        'Ingrese una contraseña.': 'contrasena',
        'Confirme su contraseña.': 'confirmarContrasena',
      };
      const fieldName = fieldMap[errorValidacion];
      if (fieldName) {
        const el = document.getElementById(`field-${fieldName}`) as HTMLInputElement | null;
        if (el) el.focus();
      }
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
          <Field label="Primer nombre" name="nombre1" value={form.nombre1} required onChange={update} onBlur={handleBlur} error={fieldErrors.nombre1} />
          <Field label="Segundo nombre" name="nombre2" value={form.nombre2} onChange={update} />
          <Field label="Apellido paterno" name="apellidoP" value={form.apellidoP} required onChange={update} onBlur={handleBlur} error={fieldErrors.apellidoP} />
          <Field label="Apellido materno" name="apellidoM" value={form.apellidoM} onChange={update} />
          <Field label="CI" name="ci" value={form.ci} required onChange={update} onBlur={handleBlur} error={fieldErrors.ci} />
          <Field label="Correo" name="correo" type="email" value={form.correo} required onChange={update} onBlur={handleBlur} error={fieldErrors.correo} />
          <Field label="Teléfono" name="telefono" value={form.telefono} onChange={update} />
          <Field label="Fecha de nacimiento" name="fechaNacimiento" type="date" value={form.fechaNacimiento} onChange={update} />
          <Field label="Contraseña" name="contrasena" type="password" value={form.contrasena} required onChange={update} onBlur={handleBlur} error={fieldErrors.contrasena} />
          <Field
            label="Confirmar contraseña"
            name="confirmarContrasena"
            type="password"
            value={confirmarContrasena}
            required
            onChange={updateConfirmarContrasena}
            onBlur={handleBlur}
            error={fieldErrors.confirmarContrasena}
          />

          <Field label="NIT (opcional)" name="nit" value={form.nit} onChange={update} />
          <Field label="Razón social (opcional)" name="razonSocial" value={form.razonSocial} onChange={update} />

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