import { useState, useEffect } from 'react';
import Message from '../components/Message';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Iconos SVG
const EyeIcon = ({ show }: { show: boolean }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {show ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    )}
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Componente InputField personalizado
const InputField = ({ 
  label, 
  name, 
  value, 
  onChange, 
  required = false, 
  type = 'text',
  placeholder = '',
  error,
  disabled = false,
  icon,
  onIconClick
}: any) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(name, e.target.value);
  };

  return (
    <div className="block">
      <label htmlFor={name} className="label-cine">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          value={value || ''}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full rounded-lg border px-4 py-2.5 text-sm transition
            ${disabled 
              ? 'bg-white/5 text-cinema-gray cursor-not-allowed border-white/5' 
              : error 
                ? 'border-red-500 bg-red-500/10 text-red-300 placeholder-red-300/50 focus:border-red-400 focus:ring-red-500/20' 
                : 'border-white/10 bg-black/20 text-white placeholder-gray-500 focus:border-cinema-gold focus:ring-cinema-gold/20'
            } focus:outline-none focus:ring-2 ${icon ? 'pr-10' : ''}`}
          required={required}
        />
        {icon && (
          <button
            type="button"
            onClick={onIconClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
          >
            {icon}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
          <span className="text-red-500">●</span>
          {error}
        </p>
      )}
    </div>
  );
};

export default function PerfilPage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    nombre1: user?.nombre1 ?? '',
    nombre2: user?.nombre2 ?? '',
    apellidoP: user?.apellidoP ?? '',
    apellidoM: user?.apellidoM ?? '',
    ci: user?.ci ?? '',
    correo: user?.correo ?? '',
    telefono: user?.telefono ?? '',
    fechaNacimiento: user?.fechaNacimiento ? user.fechaNacimiento.split('T')[0] : '',
    nit: (user as any)?.nit ?? '',
    razonSocial: (user as any)?.razonSocial ?? '',
  });
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [seccion, setSeccion] = useState<'datos' | 'contrasena'>('datos');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mostrarContrasenaActual, setMostrarContrasenaActual] = useState(false);
  const [mostrarContrasenaNueva, setMostrarContrasenaNueva] = useState(false);
  const [mostrarConfirmarContrasena, setMostrarConfirmarContrasena] = useState(false);

  const isCliente = user?.idRol?.includes('CLIENTE');

  function validarCampo(name: string, value: string): string {
    switch (name) {
      case 'correo':
        if (!value.trim()) return 'El correo es requerido';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Ingrese un correo electrónico válido';
        return '';
      case 'telefono':
        if (value.trim()) {
          const telefonoLimpio = value.trim().replace(/\s/g, '');
          if (!/^\d{8}$/.test(telefonoLimpio)) {
            return 'El teléfono debe tener exactamente 8 dígitos';
          }
          if (!/^[67]/.test(telefonoLimpio)) {
            return 'El teléfono debe comenzar con 6 o 7';
          }
          if (/^(\d)\1{7}$/.test(telefonoLimpio)) {
            return 'El teléfono no puede tener todos los dígitos iguales';
          }
        }
        return '';
      case 'nit':
        if (value.trim() && !/^\d{7,15}$/.test(value.trim())) {
          return 'El NIT debe contener solo números (7-15 dígitos)';
        }
        return '';
      case 'razonSocial':
        if (value.trim() && value.trim().length < 3) {
          return 'La razón social debe tener al menos 3 caracteres';
        }
        return '';
      case 'contrasenaActual':
        if (!value.trim()) return 'Ingrese su contraseña actual';
        return '';
      case 'contrasenaNueva':
        if (!value.trim()) return 'Ingrese la nueva contraseña';
        if (value.trim().length < 8) return 'La contraseña debe tener al menos 8 caracteres';
        if (!/[A-Z]/.test(value)) return 'La contraseña debe incluir al menos una letra mayúscula';
        if (!/[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]]/.test(value)) {
          return 'La contraseña debe incluir al menos un carácter especial';
        }
        return '';
      case 'confirmarContrasena':
        if (!value.trim()) return 'Confirme su nueva contraseña';
        if (value !== contrasenaNueva) return 'Las contraseñas no coinciden';
        return '';
      default:
        return '';
    }
  }

  function update(name: string, value: string) {
    setForm(prev => ({ ...prev, [name]: value }));
    const error = validarCampo(name, value);
    setErrores(prev => ({ ...prev, [name]: error }));
  }

  function updateContrasenaActual(name: string, value: string) {
    setContrasenaActual(value);
    const error = validarCampo(name, value);
    setErrores(prev => ({ ...prev, [name]: error }));
  }

  function updateContrasenaNueva(name: string, value: string) {
    setContrasenaNueva(value);
    const error = validarCampo(name, value);
    setErrores(prev => ({ ...prev, [name]: error }));
    if (confirmarContrasena) {
      const errorConfirm = validarCampo('confirmarContrasena', confirmarContrasena);
      setErrores(prev => ({ ...prev, confirmarContrasena: errorConfirm }));
    }
  }

  function updateConfirmarContrasena(name: string, value: string) {
    setConfirmarContrasena(value);
    const error = validarCampo(name, value);
    setErrores(prev => ({ ...prev, [name]: error }));
  }

  function getFortalezaContrasena(contrasena: string): { texto: string; color: string } {
    if (!contrasena) return { texto: '', color: '' };
    const length = contrasena.length;
    const hasUpper = /[A-Z]/.test(contrasena);
    const hasLower = /[a-z]/.test(contrasena);
    const hasNumber = /[0-9]/.test(contrasena);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]]/.test(contrasena);
    const puntos = [hasUpper, hasLower, hasNumber, hasSpecial, length >= 8].filter(Boolean).length;

    if (puntos <= 2) return { texto: 'Débil', color: 'text-red-400' };
    if (puntos <= 3) return { texto: 'Media', color: 'text-yellow-400' };
    return { texto: 'Fuerte', color: 'text-green-400' };
  }

  function validarFormularioDatos(): boolean {
    const nuevosErrores: Record<string, string> = {};
    let esValido = true;

    const errorCorreo = validarCampo('correo', form.correo);
    if (errorCorreo) {
      nuevosErrores.correo = errorCorreo;
      esValido = false;
    }

    const errorTelefono = validarCampo('telefono', form.telefono);
    if (errorTelefono) {
      nuevosErrores.telefono = errorTelefono;
      esValido = false;
    }

    if (isCliente && form.nit.trim()) {
      const errorNit = validarCampo('nit', form.nit);
      if (errorNit) {
        nuevosErrores.nit = errorNit;
        esValido = false;
      }
    }

    if (isCliente && form.razonSocial.trim()) {
      const errorRazonSocial = validarCampo('razonSocial', form.razonSocial);
      if (errorRazonSocial) {
        nuevosErrores.razonSocial = errorRazonSocial;
        esValido = false;
      }
    }

    setErrores(nuevosErrores);
    return esValido;
  }

  function validarFormularioContrasena(): boolean {
    const nuevosErrores: Record<string, string> = {};
    let esValido = true;

    const errorActual = validarCampo('contrasenaActual', contrasenaActual);
    if (errorActual) {
      nuevosErrores.contrasenaActual = errorActual;
      esValido = false;
    }

    const errorNueva = validarCampo('contrasenaNueva', contrasenaNueva);
    if (errorNueva) {
      nuevosErrores.contrasenaNueva = errorNueva;
      esValido = false;
    }

    const errorConfirm = validarCampo('confirmarContrasena', confirmarContrasena);
    if (errorConfirm) {
      nuevosErrores.confirmarContrasena = errorConfirm;
      esValido = false;
    }

    setErrores(nuevosErrores);
    return esValido;
  }

  async function submitDatos(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!validarFormularioDatos()) {
      setMessage({
        type: 'error',
        text: 'Por favor, corrija los errores marcados en rojo.'
      });
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        correo: form.correo.trim().toLowerCase(),
        telefono: form.telefono.trim() || null,
      };

      if (isCliente) {
        payload.nit = form.nit.trim() || null;
        payload.razonSocial = form.razonSocial.trim() || null;
      }

      const res = await api.actualizarPerfil(payload);
      if (res.usuario) updateUser(res.usuario);
      setMessage({ type: 'ok', text: res.mensaje || 'Perfil actualizado correctamente.' });
      setErrores({});
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'No se pudo actualizar el perfil.' });
    } finally {
      setLoading(false);
    }
  }

  async function submitContrasena(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!validarFormularioContrasena()) {
      setMessage({
        type: 'error',
        text: 'Por favor, corrija los errores marcados en rojo.'
      });
      return;
    }

    setLoading(true);
    try {
      const res = await api.actualizarPerfil({
        contrasenaActual,
        contrasenaNueva,
      });
      setMessage({ type: 'ok', text: res.mensaje || 'Contraseña actualizada correctamente.' });
      setContrasenaActual('');
      setContrasenaNueva('');
      setConfirmarContrasena('');
      setErrores({});
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>
        <p className="text-sm text-cinema-gray mt-1">Gestiona tus datos personales y contraseña.</p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setSeccion('datos'); setMessage(null); setErrores({}); }}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition ${seccion === 'datos' ? 'bg-cinema-gold text-cinema-black' : 'bg-white/[0.06] text-cinema-gray hover:bg-white/[0.1]'}`}
        >
          Datos personales
        </button>
        <button
          type="button"
          onClick={() => { setSeccion('contrasena'); setMessage(null); setErrores({}); }}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition ${seccion === 'contrasena' ? 'bg-cinema-gold text-cinema-black' : 'bg-white/[0.06] text-cinema-gray hover:bg-white/[0.1]'}`}
        >
          Contraseña
        </button>
      </div>

      {message && <Message type={message.type} text={message.text} />}

      {seccion === 'datos' && (
        <form className="card-cine p-6 space-y-4" onSubmit={submitDatos}>
          <h3 className="text-lg font-semibold text-white">Datos personales</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <InputField 
              label="Primer nombre" 
              name="nombre1" 
              value={form.nombre1} 
              onChange={update} 
              disabled 
            />
            <InputField 
              label="Segundo nombre" 
              name="nombre2" 
              value={form.nombre2} 
              onChange={update} 
              disabled 
            />
            <InputField 
              label="Apellido paterno" 
              name="apellidoP" 
              value={form.apellidoP} 
              onChange={update} 
              disabled 
            />
            <InputField 
              label="Apellido materno" 
              name="apellidoM" 
              value={form.apellidoM} 
              onChange={update} 
              disabled 
            />
            <InputField 
              label="CI" 
              name="ci" 
              value={form.ci} 
              onChange={update} 
              disabled 
            />
            <InputField 
              label="Correo" 
              name="correo" 
              type="email" 
              value={form.correo} 
              onChange={update}
              error={errores.correo}
              placeholder="ejemplo@correo.com"
              required
            />
            <InputField 
              label="Fecha de nacimiento" 
              name="fechaNacimiento" 
              type="date" 
              value={form.fechaNacimiento} 
              onChange={update} 
              disabled 
            />
            <InputField 
              label="Teléfono Celular" 
              name="telefono" 
              value={form.telefono} 
              onChange={update}
              error={errores.telefono}
              placeholder="Ej: 71234567"
              required
            />
          </div>

          {isCliente && (
            <>
              <h3 className="text-lg font-semibold text-white pt-4 border-t border-white/10">Datos de facturación</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <InputField 
                  label="NIT" 
                  name="nit" 
                  value={form.nit} 
                  onChange={update}
                  error={errores.nit}
                  placeholder="Ej: 14018202"
                />
                <InputField 
                  label="Razón Social" 
                  name="razonSocial" 
                  value={form.razonSocial} 
                  onChange={update}
                  error={errores.razonSocial}
                  placeholder="Ej: Alvarez SRL"
                />
              </div>
            </>
          )}

          <button className="btn-primary px-6 py-2 text-sm" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      )}

      {seccion === 'contrasena' && (
        <form className="card-cine p-6 space-y-4" onSubmit={submitContrasena}>
          <h3 className="text-lg font-semibold text-white">Cambiar contraseña</h3>
          
          <InputField
            label="Contraseña actual"
            name="contrasenaActual"
            type={mostrarContrasenaActual ? 'text' : 'password'}
            value={contrasenaActual}
            required
            onChange={updateContrasenaActual}
            error={errores.contrasenaActual}
            icon={<EyeIcon show={mostrarContrasenaActual} />}
            onIconClick={() => setMostrarContrasenaActual(!mostrarContrasenaActual)}
          />
          
          <InputField
            label="Nueva contraseña"
            name="contrasenaNueva"
            type={mostrarContrasenaNueva ? 'text' : 'password'}
            value={contrasenaNueva}
            required
            onChange={updateContrasenaNueva}
            error={errores.contrasenaNueva}
            icon={<EyeIcon show={mostrarContrasenaNueva} />}
            onIconClick={() => setMostrarContrasenaNueva(!mostrarContrasenaNueva)}
          />

          {contrasenaNueva && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-cinema-gray">Fortaleza:</span>
              <span className={`text-xs font-semibold ${getFortalezaContrasena(contrasenaNueva).color}`}>
                {getFortalezaContrasena(contrasenaNueva).texto}
              </span>
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    getFortalezaContrasena(contrasenaNueva).texto === 'Fuerte' ? 'bg-green-400 w-full' :
                    getFortalezaContrasena(contrasenaNueva).texto === 'Media' ? 'bg-yellow-400 w-2/3' :
                    'bg-red-400 w-1/3'
                  }`}
                />
              </div>
            </div>
          )}

          <InputField
            label="Confirmar nueva contraseña"
            name="confirmarContrasena"
            type={mostrarConfirmarContrasena ? 'text' : 'password'}
            value={confirmarContrasena}
            required
            onChange={updateConfirmarContrasena}
            error={errores.confirmarContrasena}
            icon={<EyeIcon show={mostrarConfirmarContrasena} />}
            onIconClick={() => setMostrarConfirmarContrasena(!mostrarConfirmarContrasena)}
          />

          <p className="text-xs text-cinema-gray">
            La contraseña debe tener: mínimo 8 caracteres, una mayúscula y un carácter especial.
          </p>

          <button className="btn-primary px-6 py-2 text-sm" disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      )}
    </div>
  );
}