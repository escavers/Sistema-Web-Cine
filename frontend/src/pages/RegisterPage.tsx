import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  contrasena: '', 
  nit: '', 
  razonSocial: ''
};

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
  icon,
  onIconClick,
  max // Añadimos max para restringir fechas en el calendario
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
          max={max}
          className={`w-full rounded-lg border px-4 py-2.5 text-sm transition
            ${error 
              ? 'border-red-500 bg-red-500/10 text-red-300 placeholder-red-300/50 focus:border-red-400 focus:ring-red-500/20' 
              : 'border-white/10 bg-black/20 text-white placeholder-gray-500 focus:border-cinema-gold focus:ring-cinema-gold/20'
            } focus:outline-none focus:ring-2 ${icon ? 'pr-10' : ''}`}
          required={required}
        />
        {icon && (
          <button
            type="button"
            onClick={onIconClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {icon}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
          <span className="text-red-500">🔴</span>
          {error}
        </p>
      )}
    </div>
  );
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmarContrasena, setMostrarConfirmarContrasena] = useState(false);

  // Obtener la fecha de hoy en formato YYYY-MM-DD para limitar el HTML input date
  const hoyString = new Date().toISOString().split('T')[0];

  function validarCampo(name: string, value: string): string {
    switch (name) {
      case 'nombre1':
        if (!value.trim()) return 'El primer nombre es requerido';
        if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(value.trim())) return 'El nombre solo puede contener letras';
        if (value.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
        return '';
      case 'nombre2':
        if (value.trim() && !/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(value.trim())) return 'El nombre solo puede contener letras';
        return '';
      case 'apellidoP':
        if (!value.trim()) return 'El apellido paterno es requerido';
        if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(value.trim())) return 'El apellido solo puede contener letras';
        if (value.trim().length < 2) return 'El apellido debe tener al menos 2 caracteres';
        return '';
      case 'apellidoM':
        if (value.trim() && !/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(value.trim())) return 'El apellido solo puede contener letras';
        return '';
      case 'ci':
        if (!value.trim()) return 'El CI es requerido';
        if (!/^[0-9]+[A-Za-z0-9\-]*$/.test(value.trim()) || !/[0-9]/.test(value)) {
          return 'El CI debe contener números y puede incluir letras o guiones (ej: 1234567LP)';
        }
        return '';
      case 'correo':
        if (!value.trim()) return 'El correo es requerido';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Ingrese un correo electrónico válido';
        return '';
      case 'telefono':
        if (value.trim()) {
          const telefonoLimpio = value.trim();
          if (!/^[67][0-9]{7}$/.test(telefonoLimpio)) {
            return 'El teléfono debe tener 8 dígitos y comenzar con 6 o 7';
          }
          if (/^(\d)\1{7}$/.test(telefonoLimpio)) {
            return 'El teléfono no puede tener todos los dígitos iguales';
          }
        }
        return '';
      case 'fechaNacimiento':
        if (!value) return 'La fecha de nacimiento es requerida';
        
        const nacimiento = new Date(value);
        const hoy = new Date();
        
        if (isNaN(nacimiento.getTime())) return 'Fecha inválida';
        if (nacimiento >= hoy) return 'La fecha de nacimiento no puede ser futura';
        
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const mes = hoy.getMonth() - nacimiento.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
          edad--;
        }
        
        if (edad < 1) return 'La edad ingresada debe ser mayor a 1 año';
        if (edad > 120) return 'Ingrese una edad válida (menor a 120 años)';
        return '';
      case 'contrasena':
        if (!value.trim()) return 'La contraseña es requerida';
        if (value.trim().length < 8) return 'La contraseña debe tener al menos 8 caracteres';
        if (!/[A-Z]/.test(value)) return 'La contraseña debe incluir al menos una letra mayúscula';
        if (!/[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]]/.test(value)) {
          return 'La contraseña debe incluir al menos un carácter especial';
        }
        return '';
      case 'confirmarContrasena':
        if (!value.trim()) return 'Confirme su contraseña';
        if (value !== form.contrasena) return 'Las contraseñas no coinciden';
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

  function updateConfirmarContrasena(name: string, value: string) {
    setConfirmarContrasena(value);
    const error = validarCampo(name, value);
    setErrores(prev => ({ ...prev, [name]: error }));
  }

  useEffect(() => {
    if (confirmarContrasena) {
      const error = validarCampo('confirmarContrasena', confirmarContrasena);
      setErrores(prev => ({ ...prev, confirmarContrasena: error }));
    }
  }, [form.contrasena]);

  function validarFormularioCompleto(): boolean {
    const nuevosErrores: Record<string, string> = {};
    let esValido = true;

    // Añadida 'fechaNacimiento' a la lista de validación obligatoria en el Submit
    const camposAValidar = ['nombre1', 'apellidoP', 'ci', 'correo', 'fechaNacimiento', 'contrasena', 'confirmarContrasena'];
    
    camposAValidar.forEach(key => {
      let value = '';
      if (key === 'confirmarContrasena') {
        value = confirmarContrasena;
      } else {
        value = form[key as keyof typeof form] as string;
      }
      const error = validarCampo(key, value);
      if (error) {
        nuevosErrores[key] = error;
        esValido = false;
      }
    });

    setErrores(nuevosErrores);
    return esValido;
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!validarFormularioCompleto()) {
      setMessage({
        type: 'error',
        text: 'Por favor, corrija los errores marcados en rojo.'
      });
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
      setErrores({});

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
          <InputField 
            label="Primer nombre" 
            name="nombre1" 
            value={form.nombre1} 
            required 
            onChange={update}
            error={errores.nombre1}
            placeholder="Ej: Juan"
          />
          <InputField 
            label="Segundo nombre" 
            name="nombre2" 
            value={form.nombre2} 
            onChange={update}
            error={errores.nombre2}
            placeholder="Ej: Carlos"
          />
          <InputField 
            label="Apellido paterno" 
            name="apellidoP" 
            value={form.apellidoP} 
            required 
            onChange={update}
            error={errores.apellidoP}
            placeholder="Ej: Pérez"
          />
          <InputField 
            label="Apellido materno" 
            name="apellidoM" 
            value={form.apellidoM} 
            onChange={update}
            error={errores.apellidoM}
            placeholder="Ej: Gómez"
          />
          <InputField 
            label="CI" 
            name="ci" 
            value={form.ci} 
            required 
            onChange={update}
            error={errores.ci}
            placeholder="Ej: 1234567 o 1234567LP"
          />
          <InputField 
            label="Correo" 
            name="correo" 
            type="email" 
            value={form.correo} 
            required 
            onChange={update}
            error={errores.correo}
            placeholder="ejemplo@correo.com"
          />
          <InputField 
            label="Teléfono" 
            name="telefono" 
            value={form.telefono} 
            onChange={update}
            error={errores.telefono}
            placeholder="Ej: 71234567"
          />
          <InputField 
            label="Fecha de nacimiento" 
            name="fechaNacimiento" 
            type="date" 
            required
            value={form.fechaNacimiento} 
            onChange={update}
            error={errores.fechaNacimiento}
            max={hoyString} // Evita que se seleccionen fechas futuras en el calendario nativo
          />

          <InputField
            label="Contraseña"
            name="contrasena"
            value={form.contrasena}
            onChange={update}
            type={mostrarContrasena ? 'text' : 'password'}
            error={errores.contrasena}
            required
            placeholder="Mínimo 8 caracteres"
            icon={mostrarContrasena ? '👁️' : '👁️‍🗨️'}
            onIconClick={() => setMostrarContrasena(!mostrarContrasena)}
          />

          <InputField
            label="Confirmar contraseña"
            name="confirmarContrasena"
            value={confirmarContrasena}
            onChange={updateConfirmarContrasena}
            type={mostrarConfirmarContrasena ? 'text' : 'password'}
            error={errores.confirmarContrasena}
            required
            placeholder="Repita su contraseña"
            icon={mostrarConfirmarContrasena ? '👁️' : '👁️‍🗨️'}
            onIconClick={() => setMostrarConfirmarContrasena(!mostrarConfirmarContrasena)}
          />

          {/* Indicador de fortaleza de contraseña */}
          {form.contrasena && (
            <div className="md:col-span-2 flex items-center gap-2">
              <span className="text-xs text-cinema-gray">Fortaleza:</span>
              <span className={`text-xs font-semibold ${getFortalezaContrasena(form.contrasena).color}`}>
                {getFortalezaContrasena(form.contrasena).texto}
              </span>
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    getFortalezaContrasena(form.contrasena).texto === 'Fuerte' ? 'bg-green-400 w-full' :
                    getFortalezaContrasena(form.contrasena).texto === 'Media' ? 'bg-yellow-400 w-2/3' :
                    'bg-red-400 w-1/3'
                  }`}
                />
              </div>
            </div>
          )}

          <div className="md:col-span-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-cinema-gray">
            Los datos de facturación podrán completarse al momento de realizar una compra.
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