import { memo, useEffect, useState, useRef } from 'react';
import Field from '../components/Field';
import Message from '../components/Message';
import { api } from '../services/api';

const initial = { idSala: '', tipo: 'Estándar', capacidadTotal: '', filas: '', columnas: '' };
const tipos = ['Estándar', '3D', 'VIP'];

interface ValidationItem { valid: boolean; error: string }

interface ValidationFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  placeholder?: string;
  onChange: (name: string, value: string) => void;
  validation?: ValidationItem;
  disabled?: boolean;
}

const ValidationField = memo(function ValidationField({
  label,
  name,
  type = 'text',
  value,
  placeholder,
  onChange,
  validation,
  disabled = false,
}: ValidationFieldProps) {
  const isValid = validation?.valid;
  const error = validation?.error;
  const borderClass = !value ? 'border-white/10' : isValid ? 'border-green-500/50' : value && error ? 'border-red-500/50' : 'border-white/10';
  const focusBorderClass = isValid ? 'focus:border-green-500/70' : value && error ? 'focus:border-red-500/70' : 'focus:border-cinema-gold/50';

  return (
    <label className="block">
      <span className="label-cine">{label}</span>
      <div className="relative mt-2">
        <input
          className={`w-full rounded-xl border ${borderClass} ${focusBorderClass} bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder-cinema-gray/50 outline-none transition focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed ${isValid ? 'focus:ring-green-500/30' : value && error ? 'focus:ring-red-500/30' : 'focus:ring-cinema-gold/30'}`}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(name, e.target.value)}
        />
        {value && (isValid ? (
          <span className="absolute right-3 top-2.5 text-green-500">✓</span>
        ) : error ? (
          <span className="absolute right-3 top-2.5 text-red-500">✕</span>
        ) : null)}
      </div>
      {value && error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {isValid && value && <p className="mt-1 text-xs text-green-400">✓ Válido</p>}
    </label>
  );
});

interface Validations {
  idSala: { valid: boolean; error: string };
  filas: { valid: boolean; error: string };
  columnas: { valid: boolean; error: string };
}

export default function SalasPage() {
  const [salas, setSalas] = useState<any[]>([]);
  const [form, setForm] = useState(initial);
  const [editId, setEditId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [validations, setValidations] = useState<Validations>({
    idSala: { valid: false, error: '' },
    filas: { valid: false, error: '' },
    columnas: { valid: false, error: '' },
  });
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Funciones de validación
  const validateIdSala = (value: string, existingSalas: any[]): { valid: boolean; error: string } => {
    if (!value.trim()) return { valid: false, error: 'El ID es obligatorio' };
    if (!editId && existingSalas.some(s => s.idSala === value)) {
      return { valid: false, error: 'Este ID ya existe' };
    }
    return { valid: true, error: '' };
  };

  const validateFilas = (value: string): { valid: boolean; error: string } => {
    if (!value) return { valid: false, error: 'Las filas son obligatorias' };
    const num = Number(value);
    if (isNaN(num) || num < 1) return { valid: false, error: 'Mínimo 1 fila' };
    if (num > 26) return { valid: false, error: 'Máximo 26 filas (letras)' };
    return { valid: true, error: '' };
  };

  const validateColumnas = (value: string): { valid: boolean; error: string } => {
    if (!value) return { valid: false, error: 'Las columnas son obligatorias' };
    const num = Number(value);
    if (isNaN(num) || num < 1) return { valid: false, error: 'Mínimo 1 columna' };
    if (num > 50) return { valid: false, error: 'Máximo 50 columnas' };
    return { valid: true, error: '' };
  };

  const validateAll = (formData: typeof initial, existingSalas: any[]): Validations => {
    return {
      idSala: !editId ? validateIdSala(formData.idSala, existingSalas) : { valid: true, error: '' },
      filas: validateFilas(formData.filas),
      columnas: validateColumnas(formData.columnas),
    };
  };

  async function load() {
    try {
      const res = await api.listarSalas();
      setSalas(res.salas);
    } catch {
      setMessage({ type: 'error', text: 'No se pudieron cargar las salas.' });
    }
  }

  useEffect(() => { load(); }, []);

  function update(name: string, value: string) {
    setForm((prevForm) => ({ ...prevForm, [name]: value }));
  }
  
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setValidations(validateAll(form, salas));
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [form, salas]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validateAll(form, salas);
    const allValid = Object.values(validationErrors).every(v => v.valid) && form.tipo;
    
    if (!allValid) {
      setMessage({ type: 'error', text: 'Por favor, completa todos los campos correctamente.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const payload = {
        ...form,
        capacidadTotal: Number(form.filas) * Number(form.columnas),
        filas: Number(form.filas),
        columnas: Number(form.columnas),
      };
      if (editId) {
        await api.actualizarSala(editId, payload);
        setMessage({ type: 'ok', text: 'Sala actualizada.' });
      } else {
        await api.crearSala(payload);
        setMessage({ type: 'ok', text: 'Sala creada. Los asientos se generaron automáticamente.' });
      }
      setForm(initial);
      setEditId(null);
      setValidations({
        idSala: { valid: false, error: '' },
        filas: { valid: false, error: '' },
        columnas: { valid: false, error: '' },
      });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar.' });
    } finally {
      setLoading(false);
    }
  }

  async function del(id: string) {
    if (!window.confirm('¿Eliminar esta sala y todos sus asientos?')) return;
    try {
      await api.eliminarSala(id);
      setMessage({ type: 'ok', text: 'Sala eliminada.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al eliminar.' });
    }
  }

  // Componente para vista previa de asientos
  const SeatPreview = () => {
    const filas = Number(form.filas) || 0;
    const columnas = Number(form.columnas) || 0;

    if (filas === 0 || columnas === 0) {
      return (
        <div className="text-center text-cinema-gray/60 py-12">
          <p className="text-sm">Ingresa filas y columnas para ver vista previa</p>
        </div>
      );
    }

    const filasArray = Array.from({ length: filas }, (_, i) => String.fromCharCode(65 + i));

    return (
      <div className="space-y-6">
        {/* Pantalla */}
        <div className="text-center">
          <div className="relative">
            <div className="bg-gradient-to-b from-cinema-gold/30 to-cinema-gold/10 border-b-2 border-cinema-gold px-4 py-3 rounded-lg mb-6">
              <p className="text-cinema-gold font-bold tracking-widest">━━━ PANTALLA ━━━</p>
            </div>
          </div>
        </div>

        {/* Asientos */}
        <div className="flex flex-col gap-2 bg-white/[0.02] p-6 rounded-xl border border-white/5">
          {filasArray.map((fila) => (
            <div key={fila} className="flex gap-1 justify-center items-center">
              <span className="text-xs font-bold text-cinema-gold w-4">{fila}</span>
              <div className="flex gap-1">
                {Array.from({ length: columnas }, (_, col) => (
                  <div
                    key={`${fila}${col + 1}`}
                    className="h-6 w-6 bg-green-500/40 border border-green-500/60 rounded text-xs flex items-center justify-center text-white/40 hover:bg-green-500/60 hover:text-white/60 transition"
                    title={`${fila}${col + 1}`}
                  >
                    {col + 1}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Numeración de columnas */}
          <div className="flex gap-1 justify-center items-center mt-4">
            <span className="w-4"></span>
            <div className="flex gap-1 text-xs text-cinema-gray/50">
              {Array.from({ length: columnas > 20 ? 10 : columnas }, (_, col) => (
                <span key={col} className="w-6 text-center">
                  {col === 0 ? 1 : col === 9 ? 10 : ''}
                </span>
              ))}
              {columnas > 20 && <span>...{columnas}</span>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Componente Resumen
  const SummaryCard = () => {
    const capacidad = Number(form.filas) * Number(form.columnas) || 0;
    const isLarge = capacidad > 300;

    return (
      <div className="soft-card border-white/10 space-y-3">
        <div className="border-b border-white/10 pb-3">
          <h4 className="text-sm font-bold text-cinema-cream uppercase tracking-wider">Resumen de la Sala</h4>
        </div>
        
        <div className="space-y-2 text-sm">
          {form.idSala && (
            <div className="flex justify-between">
              <span className="text-cinema-gray">ID:</span>
              <span className="text-cinema-cream font-semibold">{form.idSala}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-cinema-gray">Tipo:</span>
            <span className="text-cinema-cream font-semibold">{form.tipo}</span>
          </div>
          
          {form.filas && (
            <div className="flex justify-between">
              <span className="text-cinema-gray">Filas:</span>
              <span className="text-cinema-cream">{form.filas}</span>
            </div>
          )}
          
          {form.columnas && (
            <div className="flex justify-between">
              <span className="text-cinema-gray">Columnas:</span>
              <span className="text-cinema-cream">{form.columnas}</span>
            </div>
          )}
          
          {capacidad > 0 && (
            <div className="border-t border-white/10 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-cinema-gray">Capacidad Total:</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-lg ${isLarge ? 'text-yellow-400' : 'text-cinema-gold'}`}>
                    {capacidad}
                  </span>
                  <span className="text-cinema-gray">asientos</span>
                  {isLarge && <span className="text-xs text-yellow-400">⚠</span>}
                </div>
              </div>
              {isLarge && (
                <p className="text-xs text-yellow-400 mt-1">⚠ Capacidad muy grande</p>
              )}
            </div>
          )}

          {capacidad > 0 && (
            <div className="text-center mt-3 pt-2 border-t border-white/10">
              <div className="inline-flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-lg">
                <span className="text-lg">🎟</span>
                <span className="text-xs font-semibold text-green-400">{capacidad} asientos generados</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const allValidationsValid = Object.values(validations).every(v => v.valid) && form.tipo && form.filas && form.columnas;

  return (
    <section className="space-y-8">
      <div className="card-cine p-7">
        <h2 className="text-2xl font-bold text-white">{editId ? 'Editar sala' : 'Nueva sala'}</h2>
        
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Formulario a la izquierda */}
          <div className="space-y-4">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
              {/* ID Sala */}
              {!editId ? (
                <ValidationField
                  label="ID Sala"
                  name="idSala"
                  value={form.idSala}
                  placeholder="Ej: SALA-1"
                  validation={validations.idSala}
                  onChange={update}
                />
              ) : null}

              {/* Tipo - Full width o media dependiendo si está en edición */}
              <label className={`block ${editId ? 'md:col-span-2' : ''}`}>
                <span className="label-cine">Tipo</span>
                <div className="relative mt-2">
                  <select
                    className="input-cine border border-white/10 transition focus:border-cinema-gold/50 focus:ring-1 focus:ring-cinema-gold/30"
                    value={form.tipo}
                    onChange={(e) => update('tipo', e.target.value)}
                  >
                    {tipos.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span className="absolute right-8 top-2.5 text-green-500">✓</span>
                </div>
              </label>

              {/* Filas */}
              <ValidationField
                label="Filas"
                name="filas"
                type="number"
                value={form.filas}
                placeholder="1-26"
                validation={validations.filas}
                onChange={update}
              />

              {/* Columnas */}
              <ValidationField
                label="Columnas"
                name="columnas"
                type="number"
                value={form.columnas}
                placeholder="1-50"
                validation={validations.columnas}
                onChange={update}
              />

              {/* Capacidad Total - Auto-calculado, no editable */}
              <label className="block md:col-span-2">
                <span className="label-cine">Capacidad Total (Auto)</span>
                <div className="relative mt-2">
                  <input
                    className="w-full rounded-xl border border-green-500/50 bg-green-500/5 px-4 py-2.5 text-sm text-green-400 placeholder-cinema-gray/50 outline-none transition cursor-not-allowed"
                    type="number"
                    value={Number(form.filas) * Number(form.columnas) || 0}
                    disabled
                  />
                  <span className="absolute right-3 top-2.5 text-green-500">✓</span>
                </div>
              </label>

              {/* Botones - Full width */}
              <div className="md:col-span-2 space-y-4">
                {message && <Message type={message.type} text={message.text} />}
                <div className="flex gap-3">
                  <button
                    className="btn-primary flex-1 disabled:opacity-50"
                    disabled={loading || !allValidationsValid}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cinema-black border-t-transparent"></span>
                        {editId ? 'Actualizando...' : 'Creando...'}
                      </span>
                    ) : editId ? 'Actualizar' : 'Crear sala'}
                  </button>
                  {editId && (
                    <button
                      type="button"
                      className="btn-secondary flex-1"
                      onClick={() => {
                        setEditId(null);
                        setForm(initial);
                        setValidations({
                          idSala: { valid: false, error: '' },
                          filas: { valid: false, error: '' },
                          columnas: { valid: false, error: '' },
                        });
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Vista previa a la derecha */}
          <div className="space-y-4">
            <div className="soft-card border-white/10 overflow-y-auto max-h-[600px]">
              <SeatPreview />
            </div>
            <SummaryCard />
          </div>
        </div>
      </div>

      {/* Tabla de salas */}
      <div className="card-cine overflow-hidden">
        <div className="border-b border-white/10 px-6 py-5">
          <h3 className="text-xl font-bold text-white">Salas del cine</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-cinema-gray">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.15em] text-cinema-cream">
              <tr>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Tipo</th>
                <th className="px-5 py-4">Filas × Cols</th>
                <th className="px-5 py-4">Capacidad</th>
                <th className="px-5 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {salas.map(s => (
                <tr key={s.idSala} className="border-t border-white/5">
                  <td className="px-5 py-4 text-white font-medium">{s.idSala}</td>
                  <td className="px-5 py-4">{s.tipo}</td>
                  <td className="px-5 py-4">{s.filas} × {s.columnas}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded text-green-400 text-xs font-semibold">
                      🎟 {s.capacidadTotal}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        className="btn-secondary px-3 py-1"
                        onClick={() => {
                          setForm({
                            idSala: s.idSala,
                            tipo: s.tipo,
                            capacidadTotal: String(s.capacidadTotal),
                            filas: String(s.filas),
                            columnas: String(s.columnas)
                          });
                          setValidations({
                            idSala: { valid: true, error: '' },
                            filas: { valid: true, error: '' },
                            columnas: { valid: true, error: '' },
                          });
                          setEditId(s.idSala);
                        }}
                      >
                        Editar
                      </button>
                      <button className="btn-primary px-3 py-1" onClick={() => del(s.idSala)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {salas.length === 0 && (
                <tr><td className="px-5 py-8 text-center" colSpan={5}>No hay salas registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
