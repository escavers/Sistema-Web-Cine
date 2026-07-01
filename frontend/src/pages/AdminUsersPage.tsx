import { useEffect, useMemo, useState } from 'react';
import Field from '../components/Field';
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
  nit: '',
  razonSocial: '',
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

export default function AdminUsersPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [contrasenaTemporal, setContrasenaTemporal] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [contrasenaCopiada, setContrasenaCopiada] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [rolFiltro, setRolFiltro] = useState<'TODOS' | Rol>('TODOS');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('TODOS');

  const contrasenaPat = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

  function calcularErrores(f: typeof initial, esEdicion: boolean): Record<string, string> {
    const e: Record<string, string> = {};
    const letras = /^[a-zA-ZáéíóúñÑ\s.'-]+$/;
 
    const ciPat = /^\d{7,10}([- ]?[a-zA-Z0-9]{1,5})?$/;
    const telPat = /^[67]\d{7}$/;
    const emailPat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!f.nombre1.trim() || !letras.test(f.nombre1.trim())) {
      e.nombre1 = 'Solo letras, sin números';
    }
    if (f.nombre2.trim() && !letras.test(f.nombre2.trim())) {
      e.nombre2 = 'Solo letras, sin números';
    }
    if (!f.apellidoP.trim() || !letras.test(f.apellidoP.trim())) {
      e.apellidoP = 'Solo letras, sin números';
    }
    if (f.apellidoM.trim() && !letras.test(f.apellidoM.trim())) {
      e.apellidoM = 'Solo letras, sin números';
    }
    if (!ciPat.test(f.ci.trim())) {
      e.ci = 'Ej: 1234567 o 1234567-1L';
    }
    if (f.correo.trim() && !emailPat.test(f.correo.trim())) {
      e.correo = 'Correo electrónico inválido';
    }
    if (f.telefono.trim() && !telPat.test(f.telefono.trim())) {
      e.telefono = 'Formato: 6 o 7 + 8 dígitos';
    }
    if (!esEdicion && f.contrasena.trim() && !contrasenaPat.test(f.contrasena)) {
      e.contrasena = 'Debe incluir mayúscula, número y carácter especial';
    }

    // Validación de fecha de nacimiento añadida al cálculo global
    const errorFecha = validarFechaNacimientoLogica(f.fechaNacimiento);
    if (errorFecha) {
      e.fechaNacimiento = errorFecha;
    }

    return e;
  }

  // Función interna auxiliar para validar las restricciones de edad
  function validarFechaNacimientoLogica(fecha: string): string {
    if (!fecha) return 'La fecha de nacimiento es requerida';
    
    const nacimiento = new Date(fecha);
    const hoy = new Date();

    if (isNaN(nacimiento.getTime())) {
      return 'Fecha inválida';
    }
    if (nacimiento >= hoy) {
      return 'La fecha no puede ser futura o la actual';
    }

    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }

    if (edad < 1) return 'La edad debe ser mayor a 1 año';
    if (edad > 120) return 'Ingrese una edad válida (menor a 120 años)';
    
    return '';
  }

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

  function validarCampo(name: string, value: string, _f?: typeof initial): string {
    const letras = /^[a-zA-ZáéíóúñÑ\s.'-]+$/;
    const ciPat = /^\d{7,10}([-]?[a-zA-Z0-9]{1,5})?$/;
    const telPat = /^[67]\d{7}$/;
    const emailPat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    switch (name) {
      case 'nombre1': return (!value.trim() || !letras.test(value.trim())) ? 'Solo letras, sin números' : '';
      case 'nombre2': return (value.trim() && !letras.test(value.trim())) ? 'Solo letras, sin números' : '';
      case 'apellidoP': return (!value.trim() || !letras.test(value.trim())) ? 'Solo letras, sin números' : '';
      case 'apellidoM': return (value.trim() && !letras.test(value.trim())) ? 'Solo letras, sin números' : '';
      case 'ci': return (!ciPat.test(value.trim())) ? 'Ej: 1234567 o 1234567-1L' : '';
      case 'correo': return (value.trim() && !emailPat.test(value.trim())) ? 'Correo electrónico inválido' : '';
      case 'telefono': return (value.trim() && !telPat.test(value.trim())) ? 'Formato: 6 o 7 + 8 dígitos' : '';
      case 'fechaNacimiento': return validarFechaNacimientoLogica(value); // Caso añadido
      default: return '';
    }
  }

  function update(name: string, value: string) {
    setForm((current) => {
      const next = { ...current, [name]: value };
      setErrores((prev) => ({ ...prev, [name]: validarCampo(name, value, next) }));
      return next;
    });
  }

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
      fechaNacimiento: usuario.fechaNacimiento ? usuario.fechaNacimiento.split('T')[0] : '', // Sanitizado para el input date
      contrasena: '',
      nit: (usuario as any).nit || '',
      razonSocial: (usuario as any).razonSocial || '',
      idRol: usuario.idRol?.length ? [usuario.idRol[0]] : ['CLIENTE']
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validarFormularioCompleto(): boolean {
    const nuevosErrores: Record<string, string> = {};
    let esValido = true;

    // Se agrega 'fechaNacimiento' a la validación estricta previa al envío
    const camposAValidar = ['nombre1', 'apellidoP', 'ci', 'correo', 'fechaNacimiento'];
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

    if (form.telefono) {
      const errorTelefono = validarCampo('telefono', form.telefono);
      if (errorTelefono) {
        nuevosErrores.telefono = errorTelefono;
        esValido = false;
      }
    }

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

      if (editandoId && form.contrasena.trim()) {
        (payload as any).contrasena = form.contrasena.trim();
      }
      const response = editandoId
        ? await api.actualizarUsuario(editandoId, payload)
        : await api.crearUsuario({ ...payload, contrasena: form.contrasena });

      const contrIngresada = form.contrasena.trim();
      const contrMostrar = contrIngresada || response.contrasenaTemporal || '';
      const etiqueta = contrIngresada ? 'Contraseña generada' : 'Contraseña temporal generada';

      const msg = editandoId
        ? 'Usuario actualizado correctamente.'
        : contrMostrar
          ? `Usuario registrado. ${etiqueta}: ${contrMostrar}`
          : 'Usuario registrado correctamente.';

      setContrasenaTemporal(contrMostrar);
      setMessage({ type: 'ok', text: response.mensaje || msg });

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

  function seccion(titulo: string) {
    return (
      <div className="col-span-full mb-1 mt-4 flex items-center gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cinema-gold">{titulo}</span>
        <span className="flex-1 border-t border-white/10" />
      </div>
    );
  }

  function esValido(campo: string) {
    if (!form[campo as keyof typeof form]?.toString().trim()) return null;
    if (errores[campo]) return false;
    return true;
  }

  return (
    <section className="space-y-8">
      {/* Mensaje flotante */}
      {message && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-down">
          <Message type={message.type} text={message.text} />
        </div>
      )}

      <div className="card-cine p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {editandoId ? 'Editar usuario' : 'Administración de usuarios'}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-cinema-gray">
              Registre y actualice cuentas con acceso al sistema.
            </p>
          </div>

          {editandoId && (
            <button type="button" className="btn-secondary px-4 py-2 self-start" onClick={limpiarFormulario}>
              Cancelar edición
            </button>
          )}
        </div>

        <form className="mt-6 space-y-3" onSubmit={submit} autoComplete="off">
          {seccion('Datos personales')}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <fieldset className="relative">
              <Field label="Primer nombre" name="nombre1" value={form.nombre1} required onChange={update} error={errores.nombre1} placeholder="Ej: Juan" autoComplete="off" />
              {esValido('nombre1') && <span className="absolute right-2 top-[38px] text-emerald-400 text-lg leading-none">✓</span>}
            </fieldset>
            <fieldset className="relative">
              <Field label="Segundo nombre" name="nombre2" value={form.nombre2} onChange={update} error={errores.nombre2} placeholder="Ej: Carlos" autoComplete="off" />
              {esValido('nombre2') && <span className="absolute right-2 top-[38px] text-emerald-400 text-lg leading-none">✓</span>}
            </fieldset>
            <fieldset className="relative">
              <Field label="Apellido paterno" name="apellidoP" value={form.apellidoP} required onChange={update} error={errores.apellidoP} placeholder="Ej: Pérez" autoComplete="off" />
              {esValido('apellidoP') && <span className="absolute right-2 top-[38px] text-emerald-400 text-lg leading-none">✓</span>}
            </fieldset>
            <fieldset className="relative">
              <Field label="Apellido materno" name="apellidoM" value={form.apellidoM} onChange={update} error={errores.apellidoM} placeholder="Ej: García" autoComplete="off" />
              {esValido('apellidoM') && <span className="absolute right-2 top-[38px] text-emerald-400 text-lg leading-none">✓</span>}
            </fieldset>
            <fieldset className="relative">
              <Field label="Cédula de Identidad" name="ci" value={form.ci} required onChange={update} error={errores.ci} placeholder="1234567 o 1234567-1L" autoComplete="off" />
              {esValido('ci') && <span className="absolute right-2 top-[38px] text-emerald-400 text-lg leading-none">✓</span>}
            </fieldset>
            <fieldset className="relative">
              {/* CORRECCIÓN: Se agrega prop 'error' y 'required' para desplegar la alerta inline debajo del input */}
              <Field 
                label="Fecha de nacimiento" 
                name="fechaNacimiento" 
                type="date" 
                required
                value={form.fechaNacimiento} 
                onChange={update} 
                error={errores.fechaNacimiento}
                min="1900-01-01" 
                max={new Date().toISOString().split('T')[0]} 
                autoComplete="bday" 
              />
            </fieldset>
          </div>

          {seccion('Contacto')}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <fieldset className="relative">
              <Field label="Correo electrónico" name="correo" type="email" value={form.correo} required onChange={update} error={errores.correo} placeholder="Ej: usuario@correo.com" autoComplete="off" />
              {esValido('correo') && <span className="absolute right-2 top-[38px] text-emerald-400 text-lg leading-none">✓</span>}
            </fieldset>
            <fieldset className="relative">
              <label className="block">
                <span className="label-cine">Teléfono</span>
                <div className={`mt-2 flex items-center rounded-xl border bg-white/[0.05] text-sm transition-all duration-200 focus-within:ring-1 ${errores.telefono ? 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20' : 'border-white/[0.08] focus-within:border-cinema-gold/60 focus-within:ring-cinema-gold/20'}`}>
                  <span className="flex items-center px-3 py-2.5 text-cinema-gold/60 select-none shrink-0 border-r border-white/[0.06]">+591</span>
                  <input
                    name="telefono"
                    type="text"
                    value={form.telefono}
                    onChange={(e) => update('telefono', e.target.value)}
                    placeholder="71234567"
                    autoComplete="off"
                    className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-cinema-gray/50 px-3 py-2.5 min-w-0"
                    aria-describedby={errores.telefono ? 'telefono-error' : undefined}
                  />
                </div>
                {errores.telefono && <span id="telefono-error" role="alert" className="mt-1 block text-xs text-red-400">{errores.telefono}</span>}
              </label>
              {esValido('telefono') && <span className="absolute right-2 top-[38px] text-emerald-400 text-lg leading-none">✓</span>}
            </fieldset>
          </div>

          {seccion('Cuenta')}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="block">
              <span className="label-cine">Rol <span className="text-red-400">*</span></span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {allRoles.map((rol) => {
                  return (
                    <button
                      key={rol}
                      type="button"
                      onClick={() => seleccionarRol(rol)}
                      className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                        form.idRol[0] === rol
                          ? 'bg-cinema-gold text-cinema-black shadow-lg shadow-cinema-gold/20'
                          : 'bg-white/[0.05] text-cinema-gray hover:bg-white/[0.1] border border-transparent hover:border-white/10'
                      }`}
                    >
                      {roleLabels[rol]}
                    </button>
                  );
                })}
              </div>
            </div>

            <fieldset className="relative">
              <Field label="Contraseña" name="contrasena" type="password" value={form.contrasena} onChange={update} placeholder={editandoId ? 'Nueva contraseña' : 'Vacío = temporal'} autoComplete="new-password" />
              {!editandoId && (
                <p className="mt-1.5 text-[11px] leading-tight text-cinema-gray/60">
                  Mín. 8 caracteres — debe tener al menos una mayúscula, un número y un carácter especial
                </p>
              )}
              {editandoId && (
                <p className="mt-1.5 text-[11px] leading-tight text-cinema-gray/60">
                  Dejar vacío mantiene la contraseña actual
                </p>
              )}
            </fieldset>

            {editandoId && (
              <div className="block">
                <span className="label-cine">Estado <span className="text-red-400">*</span></span>
                <div className="mt-1.5 flex gap-2">
                  <button type="button"
                    onClick={() => setForm(c => ({ ...c, estado: true }))}
                    className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                      form.estado !== false
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : 'bg-white/[0.05] text-cinema-gray hover:bg-white/[0.1]'
                    }`}>
                    Activo
                  </button>
                  <button type="button"
                    onClick={() => setForm(c => ({ ...c, estado: false }))}
                    className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                      form.estado === false
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                        : 'bg-white/[0.05] text-cinema-gray hover:bg-white/[0.1]'
                    }`}>
                    Inactivo
                  </button>
                </div>
              </div>
            )}
          </div>

          {contrasenaTemporal && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
              <span className="font-medium">{form.contrasena.trim() ? 'Contraseña generada' : 'Contraseña temporal generada'}:</span>{' '}
              <span className="font-mono font-bold tracking-wider">{contrasenaTemporal}</span>
            </div>
          )}

          <div className="space-y-4 pt-4">
            {message && <Message type={message.type} text={message.text} />}

            <div className="flex flex-wrap gap-3">
              <button className="btn-primary min-w-[160px]" disabled={loading}>
                {loading ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Crear usuario'}
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
                <span className="text-cinema-gold font-semibold">{usuariosFiltrados.length}</span> de{' '}
                <span className="text-white font-semibold">{usuarios.length}</span> cuenta(s) registradas.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[560px]">
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
                <tr key={usuario.idUsuario} className="border-t border-white/5 transition-colors hover:bg-white/[0.02]">
                  <td className="px-5 py-4 font-medium text-white whitespace-nowrap">
                    <span>{usuario.nombre1} {usuario.apellidoP}</span>
                    {usuario.apellidoM && <span className="text-cinema-gray ml-1">{usuario.apellidoM}</span>}
                  </td>
                  <td className="px-5 py-4">{usuario.correo}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-md bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-cinema-cream">
                      {formatRoles(usuario.idRol)}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">{usuario.ci || '—'}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        Boolean(usuario.estado)
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : 'bg-red-500/10 text-red-300'
                      }`}
                    >
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                        Boolean(usuario.estado) ? 'bg-emerald-400' : 'bg-red-400'
                      }`} />
                      {Boolean(usuario.estado) ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => editarUsuario(usuario)}>
                        Editar
                      </button>
                      <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => cambiarEstado(usuario)}>
                        {Boolean(usuario.estado) ? 'Inactivar' : 'Activar'}
                      </button>
                      <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => darBaja(usuario)}>
                        Baja
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {usuariosFiltrados.length === 0 && (
                <tr>
                  <td className="px-5 py-12 text-center text-cinema-gray" colSpan={6}>
                    No se encontraron usuarios con los filtros aplicados.
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