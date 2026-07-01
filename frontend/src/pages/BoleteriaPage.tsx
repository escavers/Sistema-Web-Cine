import { useEffect, useMemo, useState } from 'react';
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
  contrasena: ''
};

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
  max // Añadimos max para restringir fechas futuras en el calendario
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
          <span className="text-red-500"></span>
          {error}
        </p>
      )}
    </div>
  );
};

export default function BoleteriaPage() {
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<{ type: 'ok' | 'error' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  // Fecha actual en formato YYYY-MM-DD
  const hoyString = new Date().toISOString().split('T')[0];

  function generarContrasena(ci: string, apellidoP: string, apellidoM: string) {
    const ciLimpia = ci.replace(/[^0-9]/g, '');
    const inicialP = apellidoP.trim().charAt(0).toUpperCase();
    const inicialM = apellidoM.trim().charAt(0).toUpperCase();
    return `${ciLimpia}${inicialP}${inicialM}!`;
  }

  function validarCampo(name: string, value: string): string {
    switch (name) {
      case 'nombre1':
        if (!value.trim()) return 'El primer nombre es requerido';
        if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(value.trim())) return 'El nombre solo puede contener letras';
        if (value.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres';
        return '';
      case 'nombre2':
        if (value.trim() && !/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(value.trim())) return 'El nombre solo puede contener letras';
        return '';
      case 'apellidoP':
        if (!value.trim()) return 'El apellido paterno es requerido';
        if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(value.trim())) return 'El apellido solo puede contener letras';
        if (value.trim().length < 3) return 'El apellido debe tener al menos 3 caracteres';
        return '';
      case 'apellidoM':
        if (!value.trim()) return 'El apellido materno es requerido';
        if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(value.trim())) return 'El apellido solo puede contener letras';
        if (value.trim().length < 3) return 'El apellido debe tener al menos 3   caracteres';
        return '';
      case 'ci':
        if (!value.trim()) return 'El CI es requerido';
        const ciLimpia = value.replace(/[^0-9]/g, '');
        if (ciLimpia.length < 7 || ciLimpia.length > 10) return 'El CI debe tener entre 7 y 10 dígitos';
        if (!/^\d{7,10}[A-Za-z\-]*$/.test(value.replace(/\s/g, ''))) {
          return 'El CI solo puede contener números y opcionalmente letras o guiones al final (ej: 1234567LP o 1234567-1A)';
        }
        return '';
      case 'correo':
        if (!value.trim()) return 'El correo es requerido';
        if (!/^[^\s@]+@gmail\.com$/.test(value.trim())) return 'Ingrese un correo electrónico válido (debe ser de Gmail)';
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
      case 'fechaNacimiento':
        if (!value) return 'La fecha de nacimiento es requerida';
        
        const nacimiento = new Date(value);
        const hoy = new Date();
        
        if (isNaN(nacimiento.getTime())) return 'Fecha inválida';
        if (nacimiento >= hoy) return 'La fecha no puede ser futura o la actual';
        
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const mes = hoy.getMonth() - nacimiento.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
          edad--;
        }
        
        if (edad < 18) return 'La edad del cliente debe ser mayor o igual a 18 años';
        if (edad > 120) return 'Ingrese una edad válida (menor a 120 años)';
        return '';
      case 'contrasena':
      if (!value.trim()) return 'La contraseña es requerida';
        if (value.trim().length < 8) return 'La contraseña debe tener al menos 8 caracteres';
        if (value.trim().length > 15) return 'La contraseña no puede tener más de 15 caracteres';
        if (!/[A-Z]/.test(value)) return 'La contraseña debe incluir al menos una letra mayúscula';
        if (!/[0-9]/.test(value)) return 'La contraseña debe incluir al menos un número';
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
          return 'La contraseña debe incluir al menos un carácter especial';
        }
 
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

  // Auto-generar contraseña
  useEffect(() => {
    if (form.ci && form.apellidoP && form.apellidoM) {
      const contrasenaGenerada = generarContrasena(form.ci, form.apellidoP, form.apellidoM);
      setForm(prev => ({ ...prev, contrasena: contrasenaGenerada }));
    }
  }, [form.ci, form.apellidoP, form.apellidoM]);

  function validarFormularioCompleto(): boolean {
    const nuevosErrores: Record<string, string> = {};
    let esValido = true;

    // Añadimos 'fechaNacimiento' para asegurar que sea validada antes del submit
    const camposAValidar = ['nombre1', 'apellidoP', 'apellidoM', 'ci', 'correo', 'fechaNacimiento', 'contrasena'];
    
    camposAValidar.forEach(key => {
      const error = validarCampo(key, form[key as keyof typeof form] as string);
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
    const hasSpecial = /[^A-Za-z0-9]/.test(contrasena);
    const puntos = [hasUpper, hasLower, hasNumber, hasSpecial, length >= 8].filter(Boolean).length;

    if (puntos <= 2) return { texto: 'Débil', color: 'text-red-400' };
    if (puntos <= 3) return { texto: 'Media', color: 'text-yellow-400' };
    return { texto: 'Fuerte', color: 'text-green-400' };
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
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
        apellidoM: form.apellidoM.trim(),
        ci: form.ci.trim(),
        correo: form.correo.trim().toLowerCase(),
        telefono: form.telefono.trim() || null,
        fechaNacimiento: form.fechaNacimiento || null,
        contrasena: form.contrasena
      };

      const response = await api.registroPresencial(payload);

      setMessage({
        type: 'ok',
        text: `${response.mensaje} Contraseña temporal: ${response.cliente?.contrasenaTemporal || form.contrasena}`
      });

      setForm(initial);
      setErrores({});
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
          Complete los datos del cliente atendido en boletería. La contraseña temporal se genera automáticamente con el CI más la inicial del apellido paterno y materno.
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
          required 
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
        
        {/* CORRECCIÓN: Ahora el InputField cuenta con props error, max y required */}
        <InputField 
          label="Fecha nacimiento" 
          name="fechaNacimiento" 
          type="date" 
          required
          value={form.fechaNacimiento} 
          onChange={update}
          error={errores.fechaNacimiento}
          max={hoyString}
        />
        <InputField
          label="Contraseña temporal"
          name="contrasena"
          value={form.contrasena}
          onChange={update}
          type={mostrarContrasena ? 'text' : 'password'}
          error={errores.contrasena}
          required
          placeholder="Se genera automáticamente"
          icon={mostrarContrasena ? '👁️' : '👁️‍🗨️'}
          onIconClick={() => setMostrarContrasena(!mostrarContrasena)}
        />

        {/* Mostrar contraseña generada */}
        {form.contrasena && (
          <div className="md:col-span-2 space-y-2">
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="flex items-center justify-between">
                
                
              </div>
              <div className="mt-2 flex items-center gap-2">
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
            </div>
          </div>
        )}

        <div className="md:col-span-2 space-y-4">
          {message && <Message type={message.type} text={message.text} />}
          <button className="btn-primary" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar cliente'}
          </button>
        </div>
      </form>
    </section>
  );
}