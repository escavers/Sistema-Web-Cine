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
  idRol: ['CLIENTE'] as Rol[],
  nit: '',
  razonSocial: '',
  estado: true
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

  const [busqueda, setBusqueda] = useState('');
  const [rolFiltro, setRolFiltro] = useState<'TODOS' | Rol>('TODOS');
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>('TODOS');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [contrasenaTemporal, setContrasenaTemporal] = useState('');

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

  function update(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    if (errores[name]) {
      setErrores((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  function validar(): boolean {
    const e: Record<string, string> = {};
    const letras = /^[a-zA-ZáéíóúñÑ\s.'-]+$/;
    const ciPat = /^\d{3,15}$/;
    const telPat = /^[67]\d{7}$/;

    if (!form.nombre1.trim() || !letras.test(form.nombre1.trim())) {
      e.nombre1 = 'Solo letras, sin números';
    }
    if (form.nombre2.trim() && !letras.test(form.nombre2.trim())) {
      e.nombre2 = 'Solo letras, sin números';
    }
    if (!form.apellidoP.trim() || !letras.test(form.apellidoP.trim())) {
      e.apellidoP = 'Solo letras, sin números';
    }
    if (form.apellidoM.trim() && !letras.test(form.apellidoM.trim())) {
      e.apellidoM = 'Solo letras, sin números';
    }
    if (!ciPat.test(form.ci.trim())) {
      e.ci = 'Solo números (3-15 dígitos)';
    }
    if (form.telefono.trim() && !telPat.test(form.telefono.trim())) {
      e.telefono = 'Formato: 6 o 7 + 8 dígitos';
    }

    setErrores(e);
    return Object.keys(e).length === 0;
  }

  function seleccionarRol(rol: Rol) {
    setForm((current) => ({ ...current, idRol: [rol] }));
  }

  function limpiarFormulario() {
    setForm(initial);
    setEditandoId(null);
  }

  function editarUsuario(usuario: Usuario) {
    setEditandoId(usuario.idUsuario);
    setMessage(null);

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
      idRol: usuario.idRol?.length ? [usuario.idRol[0]] : ['CLIENTE'],
      nit: usuario.nit || '',
      razonSocial: usuario.razonSocial || '',
      estado: Boolean(usuario.estado)
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!validar()) {
      setMessage({ type: 'error', text: 'Corrija los errores del formulario.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const payload: Record<string, any> = {
        nombre1: form.nombre1.trim(),
        nombre2: form.nombre2.trim() || null,
        apellidoP: form.apellidoP.trim(),
        apellidoM: form.apellidoM.trim() || null,
        ci: form.ci.trim(),
        correo: form.correo.trim().toLowerCase(),
        telefono: form.telefono.trim() || null,
        fechaNacimiento: form.fechaNacimiento || null,
        idRol: [form.idRol[0]],
        nit: form.nit.trim() || null,
        razonSocial: form.razonSocial.trim() || null,
        contrasena: form.contrasena.trim() || null
      };
      if (editandoId) {
        payload.estado = form.estado;
      }

      const response = editandoId
        ? await api.actualizarUsuario(editandoId, payload)
        : await api.crearUsuario(payload);

      const msg = editandoId
        ? 'Usuario actualizado correctamente.'
        : response.contrasenaTemporal
          ? `Usuario registrado. Contraseña temporal: ${response.contrasenaTemporal}`
          : 'Usuario registrado correctamente.';

      setContrasenaTemporal(response.contrasenaTemporal || '');
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
    const confirmed = window.confirm(`¿Desea dar de baja a ${usuario.nombre1} ${usuario.apellidoP}?`);
    if (!confirmed) return;

    setMessage(null);

    try {
      const response = await api.darBajaUsuario(usuario.idUsuario);
      setMessage({ type: 'ok', text: response.mensaje });
      await loadUsers();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo completar la baja lógica del usuario.'
      });
    }
  }

  function formatRoles(roles: Rol[]) {
    if (!roles || roles.length === 0) return 'Sin rol';
    return roleLabels[roles[0]];
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
          <div>
            <Field label="Primer nombre" name="nombre1" value={form.nombre1} required onChange={update} />
            {errores.nombre1 && <p className="mt-1 text-xs text-red-400">{errores.nombre1}</p>}
          </div>
          <div>
            <Field label="Segundo nombre" name="nombre2" value={form.nombre2} onChange={update} />
            {errores.nombre2 && <p className="mt-1 text-xs text-red-400">{errores.nombre2}</p>}
          </div>
          <div>
            <Field label="Apellido paterno" name="apellidoP" value={form.apellidoP} required onChange={update} />
            {errores.apellidoP && <p className="mt-1 text-xs text-red-400">{errores.apellidoP}</p>}
          </div>
          <div>
            <Field label="Apellido materno" name="apellidoM" value={form.apellidoM} onChange={update} />
            {errores.apellidoM && <p className="mt-1 text-xs text-red-400">{errores.apellidoM}</p>}
          </div>
          <div>
            <Field label="CI" name="ci" value={form.ci} required onChange={update} />
            {errores.ci && <p className="mt-1 text-xs text-red-400">{errores.ci}</p>}
          </div>
          <Field label="Correo" name="correo" type="email" value={form.correo} required onChange={update} />
          <div>
            <Field label="Teléfono" name="telefono" value={form.telefono} onChange={update} />
            {errores.telefono && <p className="mt-1 text-xs text-red-400">{errores.telefono}</p>}
          </div>
          <Field label="Fecha nacimiento" name="fechaNacimiento" type="date" value={form.fechaNacimiento} onChange={update} min="1900-01-01" max={new Date().toISOString().split('T')[0]} />

          <div className="block">
            <span className="label-cine">Rol</span>
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

          {editandoId && (
            <div className="block">
              <span className="label-cine">Estado</span>
              <div className="mt-1 flex gap-2">
                <button type="button"
                  onClick={() => setForm(c => ({ ...c, estado: true }))}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    form.estado !== false
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/[0.05] text-cinema-gray hover:bg-white/[0.1]'
                  }`}>
                  Activo
                </button>
                <button type="button"
                  onClick={() => setForm(c => ({ ...c, estado: false }))}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    form.estado === false
                      ? 'bg-red-500 text-white'
                      : 'bg-white/[0.05] text-cinema-gray hover:bg-white/[0.1]'
                  }`}>
                  Inactivo
                </button>
              </div>
            </div>
          )}

          <Field label="NIT" name="nit" value={form.nit} onChange={update} />
          <Field label="Razón social" name="razonSocial" value={form.razonSocial} onChange={update} />
          <Field label="Contraseña (vacío = temporal)" name="contrasena" type="password" value={form.contrasena} onChange={update} />

          {contrasenaTemporal && (
            <div className="md:col-span-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              Contraseña temporal generada: <span className="font-mono font-bold">{contrasenaTemporal}</span>
            </div>
          )}

          <div className="md:col-span-3 space-y-4">
            {message && <Message type={message.type} text={message.text} />}

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

                      <button className="btn-primary px-3 py-2" onClick={() => darBaja(usuario)}>
                        Baja lógica
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {usuariosFiltrados.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center text-cinema-gray" colSpan={6}>
                    El usuario no existe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}