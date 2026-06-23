import { useEffect, useState } from 'react';
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
  idRol: 'CLIENTE' as Rol,
  nit: '',
  razonSocial: ''
};

const roleLabels: Record<Rol, string> = {
  CLIENTE: 'Cliente',
  BOLETERIA: 'Boletería',
  ADMINISTRADOR: 'Administrador'
};

const roles: Rol[] = ['CLIENTE', 'BOLETERIA', 'ADMINISTRADOR'];

export default function AdminUsersPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadUsers() {
    const response = await api.listarUsuarios();
    setUsuarios(response.usuarios);
  }

  useEffect(() => {
    loadUsers().catch((err) => {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo cargar la lista de usuarios.'
      });
    });
  }, []);

  function update(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [key, value || null])
      );

      const response = await api.crearUsuario(payload);
      setMessage({ type: 'ok', text: response.mensaje });
      setForm(initial);
      await loadUsers();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo crear el usuario.'
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
        text: err instanceof Error ? err.message : 'No se pudo cambiar el estado.'
      });
    }
  }

  async function darBaja(usuario: Usuario) {
    const confirmed = window.confirm(`¿Dar de baja a ${usuario.nombre1} ${usuario.apellidoP}?`);
    if (!confirmed) return;

    setMessage(null);

    try {
      const response = await api.darBajaUsuario(usuario.idUsuario);
      setMessage({ type: 'ok', text: response.mensaje });
      await loadUsers();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudo dar de baja.'
      });
    }
  }

  return (
    <section className="space-y-8">
      <div className="card-cine p-7">
        <h2 className="text-2xl font-bold text-white">Administración de usuarios</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-cinema-gray">
          Cree y gestione cuentas del sistema. Las bajas son lógicas para conservar historial y relaciones con otras tablas.
        </p>

        <form className="mt-6 grid gap-4 md:grid-cols-3" onSubmit={submit}>
          <Field label="Primer nombre" name="nombre1" value={form.nombre1} required onChange={update} />
          <Field label="Segundo nombre" name="nombre2" value={form.nombre2} onChange={update} />
          <Field label="Apellido paterno" name="apellidoP" value={form.apellidoP} required onChange={update} />
          <Field label="Apellido materno" name="apellidoM" value={form.apellidoM} onChange={update} />
          <Field label="CI" name="ci" value={form.ci} onChange={update} />
          <Field label="Correo" name="correo" type="email" value={form.correo} required onChange={update} />
          <Field label="Teléfono" name="telefono" value={form.telefono} onChange={update} />
          <Field label="Fecha nacimiento" name="fechaNacimiento" type="date" value={form.fechaNacimiento} onChange={update} />
          <label className="block">
            <span className="label-cine">Rol</span>
            <select className="input-cine" value={form.idRol} onChange={(event) => update('idRol', event.target.value)}>
              {roles.map((rol) => (
                <option key={rol} value={rol}>{roleLabels[rol]}</option>
              ))}
            </select>
          </label>
          <Field label="Contraseña" name="contrasena" type="password" value={form.contrasena} required onChange={update} />
          <Field label="NIT" name="nit" value={form.nit} onChange={update} />
          <Field label="Razón social" name="razonSocial" value={form.razonSocial} onChange={update} />

          <div className="md:col-span-3 space-y-4">
            {message && <Message type={message.type} text={message.text} />}
            <button className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>

      <div className="card-cine overflow-hidden">
        <div className="border-b border-white/10 px-6 py-5">
          <h3 className="text-xl font-bold text-white">Usuarios activos</h3>
          <p className="mt-1 text-sm text-cinema-gray">Cuentas disponibles actualmente en la base de datos.</p>
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
              {usuarios.map((usuario) => (
                <tr key={usuario.idUsuario} className="border-t border-white/5">
                  <td className="px-5 py-4 text-white">{usuario.nombre1} {usuario.apellidoP}</td>
                  <td className="px-5 py-4">{usuario.correo}</td>
                  <td className="px-5 py-4">{roleLabels[usuario.idRol]}</td>
                  <td className="px-5 py-4">{usuario.ci || '—'}</td>
                  <td className="px-5 py-4">{Boolean(usuario.estado) ? 'Activo' : 'Inactivo'}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
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

              {usuarios.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-center text-cinema-gray" colSpan={6}>
                    No hay usuarios activos para mostrar.
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
