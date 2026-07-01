import { useEffect, useMemo, useState } from 'react';
import Message from '../components/Message';
import { api } from '../services/api';
import type { Rol, Usuario } from '../types';

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
  idRol: ['CLIENTE'] as Rol[]
};

const roleLabels: Record<Rol, string> = {
  CLIENTE: 'Cliente',
  BOLETERIA: 'Boletería',
  ADMINISTRADOR: 'Administrador',
  ACCESO: 'Acceso',
};

const allRoles: Rol[] = ['CLIENTE', 'BOLETERIA', 'ADMINISTRADOR', 'ACCESO'];

type EstadoFiltro = 'TODOS' | 'ACTIVO' | 'INACTIVO';

// Componente InputField fuera del componente principal
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

export default function AdminUsersPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [contrasenaCopiada, setContrasenaCopiada] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [rolFiltro, setRolFiltro] = useState<'TODOS' | Rol>('TODOS');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('TODOS');

  async function loadUsers() {
    const response = await api.listarUsuarios();
    setUsuarios(response.usuarios);
  }

  useEffect(() => {
    loadUsers().catch((err) => {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo cargar la información de usuarios.'
      });
    });
  }, []);

  function generarContrasena(ci: string, apellidoP: string, apellidoM: string) {
    const inicialP = apellidoP.trim().charAt(0).toUpperCase();
    const inicialM = apellidoM.trim().charAt(0).toUpperCase();
    return `${ci}${inicialP}${inicialM}!`;
  }

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
        return '';
      case 'correo':
        if (!value.trim()) return 'El correo es requerido';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Ingrese un correo electrónico válido';
        return '';
      case 'telefono':
        if (value.trim() && !/^[67][0-9]{7}$/.test(value.trim())) return 'El teléfono debe tener 8 dígitos y comenzar con 6 o 7';
        return '';
      case 'contrasena':
        if (!editandoId && !value.trim()) return 'La contraseña es requerida';
        if (!editandoId && value.trim().length < 8) return 'La contraseña debe tener al menos 8 caracteres';
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
    if (form.ci && form.apellidoP && !editandoId) {
      const contrasenaGenerada = generarContrasena(form.ci, form.apellidoP, form.apellidoM || '');
      setForm(prev => ({ ...prev, contrasena: contrasenaGenerada }));
    }
  }, [form.ci, form.apellidoP, form.apellidoM, editandoId]);

  function seleccionarRol(rol: Rol) {
    setForm(prev => ({ ...prev, idRol: [rol] }));
  }

  function limpiarFormulario() {
    setForm(initial);
    setEditandoId(null);
    setErrores({});
    setMessage(null);
    setContrasenaCopiada(false);
  }

  function editarUsuario(usuario: Usuario) {
    setEditandoId(usuario.idUsuario);
    setMessage(null);
    setErrores({});

    setForm({
      nombre1: usuario.nombre1 || '',
      nombre2: usuario.nombre2 || '',
      apellidoP: usuario.apellidoP || '',
      apellidoM: usuario.apellidoM || '',
      ci: usuario.ci || '',
      correo: usuario.correo || '',
      telefono: usuario.telefono || '',
      fechaNacimiento: usuario.fechaNacimiento || '',
      contrasena: '',
      idRol: usuario.idRol?.length ? [usuario.idRol[0]] : ['CLIENTE']
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validarFormularioCompleto(): boolean {
    const nuevosErrores: Record<string, string> = {};
    let esValido = true;

    const camposAValidar = ['nombre1', 'apellidoP', 'ci', 'correo'];
    if (!editandoId) {
      camposAValidar.push('contrasena');
    }
    
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
        apellidoM: form.apellidoM.trim() || null,
        ci: form.ci.trim(),
        correo: form.correo.trim().toLowerCase(),
        telefono: form.telefono.trim() || null,
        fechaNacimiento: form.fechaNacimiento || null,
        idRol: [form.idRol[0]]
      };

      const response = editandoId
        ? await api.actualizarUsuario(editandoId, payload)
        : await api.crearUsuario({ ...payload, contrasena: form.contrasena });

      setMessage({
        type: 'ok',
        text: response.mensaje || (editandoId ? 'Usuario actualizado correctamente.' : 'Usuario registrado correctamente.')
      });

      limpiarFormulario();
      await loadUsers();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error
          ? err.message
          : editandoId
            ? 'No se pudo actualizar el usuario.'
            : 'No se pudo registrar el usuario.'
      });
    } finally {
      setLoading(false);
    }
  }

  async function cambiarEstado(usuario: Usuario) {
    setMessage(null);

    try {
      const response = await api.actualizarUsuario(usuario.idUsuario, {
        estado: !Boolean(usuario.estado)
      });

      setMessage({ type: 'ok', text: response.mensaje });
      await loadUsers();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo actualizar el estado del usuario.'
      });
    }
  }

  async function darBaja(usuario: Usuario) {
    const confirmado = window.confirm(`¿Está seguro que desea dar de baja a ${usuario.nombre1} ${usuario.apellidoP}?`);
    if (!confirmado) return;

    setMessage(null);

    try {
      const response = await api.darBajaUsuario(usuario.idUsuario);
      setMessage({ type: 'ok', text: response.mensaje });
      await loadUsers();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo completar la baja del usuario.'
      });
    }
  }

  function formatRoles(roles: Rol[]) {
    if (!roles || roles.length === 0) return 'Sin rol';
    return roleLabels[roles[0]];
  }

  function copiarContrasena() {
    if (form.contrasena) {
      navigator.clipboard.writeText(form.contrasena);
      setContrasenaCopiada(true);
      setTimeout(() => setContrasenaCopiada(false), 3000);
    }
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

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return usuarios.filter((usuario) => {
      const nombreCompleto = `${usuario.nombre1 || ''} ${usuario.apellidoP || ''} ${usuario.apellidoM || ''}`.toLowerCase();
      const correo = (usuario.correo || '').toLowerCase();
      const ci = (usuario.ci || '').toLowerCase();

      const coincideBusqueda =
        !texto ||
        nombreCompleto.includes(texto) ||
        correo.includes(texto) ||
        ci.includes(texto);

      const coincideRol =
        rolFiltro === 'TODOS' ||
        usuario.idRol?.[0] === rolFiltro;

      const coincideEstado =
        estadoFiltro === 'TODOS' ||
        (estadoFiltro === 'ACTIVO' && Boolean(usuario.estado)) ||
        (estadoFiltro === 'INACTIVO' && !Boolean(usuario.estado));

      return coincideBusqueda && coincideRol && coincideEstado;
    });
  }, [usuarios, busqueda, rolFiltro, estadoFiltro]);

  return (
    <section className="space-y-8">
      {/* Mensaje flotante */}
      {message && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-down">
          <Message type={message.type} text={message.text} />
        </div>
      )}

      <div className="card-cine p-7">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {editandoId ? 'Editar usuario' : 'Administración de usuarios'}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-cinema-gray">
              Registre y actualice cuentas con acceso al sistema. Cada usuario debe tener un único rol asignado.
            </p>
          </div>

          {editandoId && (
            <button type="button" className="btn-secondary px-4 py-2" onClick={limpiarFormulario}>
              Cancelar edición
            </button>
          )}
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-3" onSubmit={submit}>
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
            placeholder="Ej: 1234567"
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
            label="Fecha nacimiento" 
            name="fechaNacimiento" 
            type="date" 
            value={form.fechaNacimiento} 
            onChange={update}
          />
          <InputField
            label="Contraseña"
            name="contrasena"
            value={form.contrasena}
            onChange={update}
            type={mostrarContrasena ? 'text' : 'password'}
            error={errores.contrasena}
            required={!editandoId}
            placeholder={editandoId ? 'Dejar vacío para mantener' : 'Se genera automáticamente'}
            icon={mostrarContrasena ? '👁️' : '👁️‍🗨️'}
            onIconClick={() => setMostrarContrasena(!mostrarContrasena)}
          />

          <div className="block">
            <span className="label-cine">
              Rol <span className="ml-1 text-red-500">*</span>
            </span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {allRoles.map((rol) => (
                <button
                  key={rol}
                  type="button"
                  onClick={() => seleccionarRol(rol)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    form.idRol[0] === rol
                      ? 'bg-cinema-gold text-cinema-black'
                      : 'bg-white/[0.05] text-cinema-gray hover:bg-white/[0.1]'
                  }`}
                >
                  {roleLabels[rol]}
                </button>
              ))}
            </div>
          </div>

          {!editandoId && form.contrasena && (
            <div className="md:col-span-3 space-y-2">
              <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-cinema-gray">
                    Contraseña temporal: 
                    <span className="ml-2 font-mono text-white">{form.contrasena}</span>
                  </span>
                  <button
                    type="button"
                    onClick={copiarContrasena}
                    className="btn-secondary px-3 py-1 text-xs"
                  >
                    {contrasenaCopiada ? '✅ Copiado' : '📋 Copiar'}
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-cinema-gray">Fortaleza:</span>
                  <span className={`text-xs font-semibold ${getFortalezaContrasena(form.contrasena).color}`}>
                    {getFortalezaContrasena(form.contrasena).texto}
                  </span>
                </div>
              </div>
            </div>
          )}

          {editandoId && (
            <div className="md:col-span-3">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Desea cambiar la contraseña de este usuario?')) {
                    const nuevaContrasena = prompt('Ingrese la nueva contraseña (mínimo 8 caracteres):');
                    if (nuevaContrasena && nuevaContrasena.length >= 8) {
                      setForm(prev => ({ ...prev, contrasena: nuevaContrasena }));
                    } else if (nuevaContrasena !== null) {
                      alert('La contraseña debe tener al menos 8 caracteres.');
                    }
                  }
                }}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Cambiar contraseña
              </button>
            </div>
          )}

          <div className="md:col-span-3 space-y-4">
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" disabled={loading}>
                {loading
                  ? 'Guardando...'
                  : editandoId
                    ? 'Guardar cambios'
                    : 'Crear usuario'}
              </button>

              {!editandoId && (
                <button type="button" className="btn-secondary px-4 py-2" onClick={limpiarFormulario}>
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="card-cine overflow-hidden">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Usuarios registrados</h3>
              <p className="mt-1 text-sm text-cinema-gray">
                {usuariosFiltrados.length} resultado(s) de {usuarios.length} cuenta(s) registradas.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3 lg:min-w-[720px]">
              <div>
                <label className="label-cine">Buscar</label>
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Nombre, correo o CI"
                  className="input-cine"
                />
              </div>

              <div>
                <label className="label-cine">Rol</label>
                <select
                  value={rolFiltro}
                  onChange={(e) => setRolFiltro(e.target.value as 'TODOS' | Rol)}
                  className="input-cine"
                >
                  <option value="TODOS">Todos</option>
                  {allRoles.map((rol) => (
                    <option key={rol} value={rol}>
                      {roleLabels[rol]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-cine">Estado</label>
                <select
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value as EstadoFiltro)}
                  className="input-cine"
                >
                  <option value="TODOS">Todos</option>
                  <option value="ACTIVO">Activos</option>
                  <option value="INACTIVO">Inactivos</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-cinema-gray">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.15em] text-cinema-cream">
              <tr>
                <th className="px-5 py-4">Nombre</th>
                <th className="px-5 py-4">Correo</th>
                <th className="px-5 py-4">Rol</th>
                <th className="px-5 py-4">CI</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {usuariosFiltrados.map((usuario) => (
                <tr key={usuario.idUsuario} className="border-t border-white/5">
                  <td className="px-5 py-4 text-white">
                    {usuario.nombre1} {usuario.apellidoP}
                  </td>
                  <td className="px-5 py-4">{usuario.correo}</td>
                  <td className="px-5 py-4">{formatRoles(usuario.idRol)}</td>
                  <td className="px-5 py-4">{usuario.ci || '—'}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        Boolean(usuario.estado)
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : 'bg-red-500/10 text-red-300'
                      }`}
                    >
                      {Boolean(usuario.estado) ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-secondary px-3 py-2" onClick={() => editarUsuario(usuario)}>
                        Editar
                      </button>

                      <button className="btn-secondary px-3 py-2" onClick={() => cambiarEstado(usuario)}>
                        {Boolean(usuario.estado) ? 'Inactivar' : 'Activar'}
                      </button>

                    </div>
                  </td>
                </tr>
              ))}

              {usuariosFiltrados.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center text-cinema-gray" colSpan={6}>
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-1rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </section>
  );
}