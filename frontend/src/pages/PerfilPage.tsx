import { useState } from 'react';
import Field from '../components/Field';
import Message from '../components/Message';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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
    fechaNacimiento: user?.fechaNacimiento ?? '',
    nit: user?.nit ?? '',
    razonSocial: user?.razonSocial ?? '',
  });
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [contrasenaNueva, setContrasenaNueva] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [seccion, setSeccion] = useState<'datos' | 'contrasena'>('datos');

  function update(name: string, value: string) {
    setForm((c) => ({ ...c, [name]: value }));
  }

  async function submitDatos(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!form.nombre1.trim()) return setMessage({ type: 'error', text: 'El primer nombre es obligatorio.' });
    if (!form.apellidoP.trim()) return setMessage({ type: 'error', text: 'El apellido paterno es obligatorio.' });
    if (!form.ci.trim()) return setMessage({ type: 'error', text: 'El CI es obligatorio.' });
    if (!form.correo.trim()) return setMessage({ type: 'error', text: 'El correo es obligatorio.' });

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        nombre1: form.nombre1.trim(),
        nombre2: form.nombre2.trim() || null,
        apellidoP: form.apellidoP.trim(),
        apellidoM: form.apellidoM.trim() || null,
        ci: form.ci.trim(),
        correo: form.correo.trim().toLowerCase(),
        telefono: form.telefono.trim() || null,
        fechaNacimiento: form.fechaNacimiento || null,
        nit: form.nit.trim() || null,
        razonSocial: form.razonSocial.trim() || null,
      };

      const res = await api.actualizarPerfil(payload);
      if (res.usuario) updateUser(res.usuario);
      setMessage({ type: 'ok', text: res.mensaje || 'Perfil actualizado correctamente.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'No se pudo actualizar el perfil.' });
    } finally {
      setLoading(false);
    }
  }

  async function submitContrasena(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!contrasenaActual) return setMessage({ type: 'error', text: 'Ingrese su contraseña actual.' });
    if (!contrasenaNueva) return setMessage({ type: 'error', text: 'Ingrese la nueva contraseña.' });
    if (contrasenaNueva.length < 8) return setMessage({ type: 'error', text: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    if (!/[A-Z]/.test(contrasenaNueva)) return setMessage({ type: 'error', text: 'La nueva contraseña debe incluir al menos una mayúscula.' });
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]]/.test(contrasenaNueva)) return setMessage({ type: 'error', text: 'La nueva contraseña debe incluir al menos un carácter especial.' });
    if (contrasenaNueva !== confirmarContrasena) return setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });

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
          onClick={() => { setSeccion('datos'); setMessage(null); }}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition ${seccion === 'datos' ? 'bg-cinema-gold text-cinema-black' : 'bg-white/[0.06] text-cinema-gray hover:bg-white/[0.1]'}`}
        >
          Datos personales
        </button>
        <button
          type="button"
          onClick={() => { setSeccion('contrasena'); setMessage(null); }}
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
            <Field label="Primer nombre" name="nombre1" value={form.nombre1} required onChange={update} />
            <Field label="Segundo nombre" name="nombre2" value={form.nombre2} onChange={update} />
            <Field label="Apellido paterno" name="apellidoP" value={form.apellidoP} required onChange={update} />
            <Field label="Apellido materno" name="apellidoM" value={form.apellidoM} onChange={update} />
            <Field label="CI" name="ci" value={form.ci} required onChange={update} />
            <Field label="Correo" name="correo" type="email" value={form.correo} required onChange={update} />
            <Field label="Teléfono" name="telefono" value={form.telefono} onChange={update} />
            <Field label="Fecha de nacimiento" name="fechaNacimiento" type="date" value={form.fechaNacimiento} onChange={update} />
          </div>

          <h3 className="text-lg font-semibold text-white pt-4 border-t border-white/10">Datos de facturación</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="NIT" name="nit" value={form.nit} onChange={update} />
            <Field label="Razón Social" name="razonSocial" value={form.razonSocial} onChange={update} />
          </div>

          <button className="btn-primary px-6 py-2 text-sm" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      )}

      {seccion === 'contrasena' && (
        <form className="card-cine p-6 space-y-4" onSubmit={submitContrasena}>
          <h3 className="text-lg font-semibold text-white">Cambiar contraseña</h3>
          <Field
            label="Contraseña actual"
            name="contrasenaActual"
            type="password"
            value={contrasenaActual}
            required
            onChange={(_n, v) => setContrasenaActual(v)}
          />
          <Field
            label="Nueva contraseña"
            name="contrasenaNueva"
            type="password"
            value={contrasenaNueva}
            required
            onChange={(_n, v) => setContrasenaNueva(v)}
          />
          <Field
            label="Confirmar nueva contraseña"
            name="confirmarContrasena"
            type="password"
            value={confirmarContrasena}
            required
            onChange={(_n, v) => setConfirmarContrasena(v)}
          />
          <p className="text-xs text-cinema-gray">Mínimo 8 caracteres, una mayúscula y un carácter especial.</p>

          <button className="btn-primary px-6 py-2 text-sm" disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      )}
    </div>
  );
}
