import { memo, useEffect, useState, useRef } from 'react';
import Field from '../components/Field';
import Message from '../components/Message';
import { api } from '../services/api';

const initial = {
  titulo: '', director: '', sinopsis: '', posterUrl: '',
  duracionMinutos: '', clasificacionEdad: 'TP', fechaEstreno: ''
};

const clasificaciones = ['TP', '13', '16', '18'];

interface ValidationItem { valid: boolean; error: string }

interface ValidationFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  maxLength?: number;
  showCounter?: boolean;
  placeholder?: string;
  onChange: (name: string, value: string) => void;
  validation?: ValidationItem;
  optional?: boolean;
}

const ValidationField = memo(function ValidationField({
  label,
  name,
  type = 'text',
  value,
  maxLength,
  showCounter,
  placeholder,
  onChange,
  validation,
  optional = false,
}: ValidationFieldProps) {
  const isValid = validation?.valid;
  const error = validation?.error;
  const borderClass = !value && !optional ? 'border-white/10' : isValid ? 'border-green-500/50' : value && error ? 'border-red-500/50' : 'border-white/10';
  const focusBorderClass = isValid ? 'focus:border-green-500/70' : value && error ? 'focus:border-red-500/70' : 'focus:border-cinema-gold/50';

  return (
    <label className="block">
      <div className="flex items-center justify-between">
        <span className="label-cine">{label}</span>
        {showCounter && <span className="text-xs text-cinema-gray/60">{value.length}/{maxLength}</span>}
      </div>
      <div className="relative mt-2">
        <input
          className={`w-full rounded-xl border ${borderClass} ${focusBorderClass} bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder-cinema-gray/50 outline-none transition focus:ring-1 ${isValid ? 'focus:ring-green-500/30' : value && error ? 'focus:ring-red-500/30' : 'focus:ring-cinema-gold/30'}`}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(e) => onChange(name, e.target.value)}
        />
        {value && (isValid ? (
          <span className="absolute right-3 top-2.5 text-green-500">✓</span>
        ) : error ? (
          <span className="absolute right-3 top-2.5 text-red-500">✕</span>
        ) : null)}
      </div>
      {value && error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      {isValid && value && <p className="mt-1 text-xs text-green-400">✓ {label.toLowerCase()} válido</p>}
    </label>
  );
});

interface ValidationSelectProps {
  label: string;
  value: string;
  onChange: (name: string, value: string) => void;
  options: string[];
  validation?: ValidationItem;
}

const ValidationSelect = memo(function ValidationSelect({ label, value, onChange, options, validation }: ValidationSelectProps) {
  const isValid = validation?.valid;
  const error = validation?.error;
  const borderClass = isValid ? 'border-green-500/50' : error ? 'border-red-500/50' : 'border-white/10';

  return (
    <label className="block">
      <span className="label-cine">{label}</span>
      <div className="relative mt-2">
        <select
          className={`input-cine border ${borderClass} transition focus:border-cinema-gold/70`}
          value={value}
          onChange={(e) => onChange('clasificacionEdad', e.target.value)}
        >
          {options.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {isValid && <span className="absolute right-8 top-2.5 text-green-500">✓</span>}
      </div>
    </label>
  );
});

interface Validations {
  titulo: { valid: boolean; error: string };
  director: { valid: boolean; error: string };
  duracionMinutos: { valid: boolean; error: string };
  fechaEstreno: { valid: boolean; error: string };
  posterUrl: { valid: boolean; error: string };
  sinopsis: { valid: boolean; error: string };
  clasificacionEdad: { valid: boolean; error: string };
}

const PAGE_SIZE = 10;

const parseLocalDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatDateLocal = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-BO');
  } catch {
    return dateStr;
  }
};

export default function PeliculasPage() {
  const [peliculas, setPeliculas] = useState<any[]>([]);
  const [form, setForm] = useState(initial);
  const [editId, setEditId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [validations, setValidations] = useState<Validations>({
    titulo: { valid: false, error: '' },
    director: { valid: false, error: '' },
    duracionMinutos: { valid: false, error: '' },
    fechaEstreno: { valid: false, error: '' },
    posterUrl: { valid: false, error: '' },
    sinopsis: { valid: false, error: '' },
    clasificacionEdad: { valid: true, error: '' },
  });
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Funciones de validación
  const validateTitulo = (value: string): { valid: boolean; error: string } => {
    if (!value.trim()) return { valid: false, error: 'El título es obligatorio' };
    if (value.length < 2) return { valid: false, error: 'Mínimo 2 caracteres' };
    if (value.length > 150) return { valid: false, error: 'Máximo 150 caracteres' };
    return { valid: true, error: '' };
  };

  const validateDirector = (value: string): { valid: boolean; error: string } => {
    if (!value.trim()) return { valid: false, error: 'El director es obligatorio' };
    return { valid: true, error: '' };
  };

  const validateDuracion = (value: string): { valid: boolean; error: string } => {
    if (!value) return { valid: false, error: 'La duración es obligatoria' };
    const num = Number(value);
    if (isNaN(num) || num <= 0) return { valid: false, error: 'Debe ser un número mayor a 0' };
    if (num < 30 || num > 300) return { valid: false, error: 'Debe estar entre 30 y 300 minutos' };
    return { valid: true, error: '' };
  };

  const validateFechaEstreno = (value: string): { valid: boolean; error: string } => {
    if (!value) return { valid: false, error: 'La fecha es obligatoria' };
    const fecha = new Date(value);
    if (isNaN(fecha.getTime())) return { valid: false, error: 'Fecha inválida' };
    return { valid: true, error: '' };
  };

  const validatePosterUrl = (value: string): { valid: boolean; error: string } => {
    if (!value.trim()) return { valid: false, error: 'La URL es obligatoria' };
    try {
      new URL(value);
      return { valid: true, error: '' };
    } catch {
      return { valid: false, error: 'URL inválida' };
    }
  };

  const validateSinopsis = (value: string): { valid: boolean; error: string } => {
    if (!value.trim()) return { valid: false, error: 'La sinopsis es obligatoria' };
    if (value.length < 20) return { valid: false, error: 'Mínimo 20 caracteres' };
    if (value.length > 1000) return { valid: false, error: 'Máximo 1000 caracteres' };
    return { valid: true, error: '' };
  };

  const validateClasificacion = (value: string): { valid: boolean; error: string } => {
    if (!value) return { valid: false, error: 'Selecciona una clasificación' };
    return { valid: true, error: '' };
  };

  const validateAll = (formData: typeof initial): Validations => {
    return {
      titulo: validateTitulo(formData.titulo),
      director: validateDirector(formData.director),
      duracionMinutos: validateDuracion(formData.duracionMinutos),
      fechaEstreno: validateFechaEstreno(formData.fechaEstreno),
      posterUrl: validatePosterUrl(formData.posterUrl),
      sinopsis: validateSinopsis(formData.sinopsis),
      clasificacionEdad: validateClasificacion(formData.clasificacionEdad),
    };
  };

  async function load() {
    try {
      const res = await api.listarPeliculas();
      setPeliculas(res.peliculas);
    } catch (err) {
      setMessage({ type: 'error', text: 'No se pudieron cargar las películas.' });
    }
  }

  useEffect(() => { load(); }, []);

  function update(name: string, value: string) {
    setForm((prevForm) => ({ ...prevForm, [name]: value }));

    if (name === 'posterUrl') {
      setImageError(false);
    }
  }

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setValidations(validateAll(form));
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [form]);

  function edit(p: any) {
    const editForm = {
      titulo: p.titulo, director: p.director || '', sinopsis: p.sinopsis || '',
      posterUrl: p.posterUrl || '', duracionMinutos: String(p.duracionMinutos || ''),
      clasificacionEdad: p.clasificacionEdad || 'TP', fechaEstreno: p.fechaEstreno ? p.fechaEstreno.split('T')[0] : ''
    };
    setForm(editForm);
    setValidations(validateAll(editForm));
    setImageError(false);
    setEditId(p.idPelicula);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validateAll(form);
    
    // Verificar si todos los campos son válidos
    const allValid = Object.values(validationErrors).every(v => v.valid);
    if (!allValid) {
      setMessage({ type: 'error', text: 'Por favor, completa todos los campos correctamente.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const payload = {
        ...form,
        duracionMinutos: form.duracionMinutos ? Number(form.duracionMinutos) : null,
        fechaEstreno: form.fechaEstreno || null,
        posterUrl: form.posterUrl || null,
        sinopsis: form.sinopsis || null,
        director: form.director || null,
      };
      if (editId) {
        await api.actualizarPelicula(editId, payload);
        setMessage({ type: 'ok', text: 'Película actualizada correctamente.' });
      } else {
        await api.crearPelicula(payload);
        setMessage({ type: 'ok', text: 'Película creada correctamente.' });
      }
      setForm(initial);
      setEditId(null);
      setValidations({
        titulo: { valid: false, error: '' },
        director: { valid: false, error: '' },
        duracionMinutos: { valid: false, error: '' },
        fechaEstreno: { valid: false, error: '' },
        posterUrl: { valid: false, error: '' },
        sinopsis: { valid: false, error: '' },
        clasificacionEdad: { valid: true, error: '' },
      });
      setImageError(false);
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar.' });
    } finally {
      setLoading(false);
    }
  }

  async function del(id: number) {
    if (!window.confirm('¿Eliminar esta película?')) return;
    try {
      await api.eliminarPelicula(id);
      setMessage({ type: 'ok', text: 'Película eliminada.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al eliminar.' });
    }
  }

  const allValidationsValid = Object.values(validations).every(v => v.valid);

  const filtered = peliculas.filter(p => {
    const matchName = p.titulo.toLowerCase().includes(searchText.toLowerCase());
    const estreno = p.fechaEstreno ? p.fechaEstreno.split('T')[0] : '';
    const matchDate = (!filterDateFrom || estreno >= filterDateFrom) && (!filterDateTo || estreno <= filterDateTo);
    return matchName && matchDate;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [searchText, filterDateFrom, filterDateTo]);

  const SummaryCard = () => {
    if (!form.titulo && !form.posterUrl) return null;
    
    return (
      <div className="soft-card border-white/10 space-y-2 text-center">
        <p className="text-sm font-semibold text-cinema-cream truncate">{form.titulo || 'Título...'}</p>
        {form.director && <p className="text-xs text-cinema-gray">Director: {form.director}</p>}
        <div className="flex justify-center gap-2 flex-wrap">
          {form.duracionMinutos && <span className="text-xs bg-white/10 px-2 py-1 rounded-lg text-cinema-cream">{form.duracionMinutos} min</span>}
          {form.clasificacionEdad && <span className="text-xs bg-cinema-gold/20 px-2 py-1 rounded-lg text-cinema-gold font-semibold">{form.clasificacionEdad}</span>}
          {form.fechaEstreno && <span className="text-xs bg-white/10 px-2 py-1 rounded-lg text-cinema-gray">{new Date(form.fechaEstreno).toLocaleDateString('es-BO')}</span>}
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-8">
      <div className="card-cine p-7">
        <h2 className="text-2xl font-bold text-white">{editId ? 'Editar película' : 'Nueva película'}</h2>
        
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Formulario a la izquierda */}
          <div className="lg:col-span-2 space-y-4">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
              {/* Fila 1 */}
              <ValidationField
                label="Título"
                name="titulo"
                value={form.titulo}
                maxLength={150}
                showCounter={true}
                validation={validations.titulo}
                onChange={update}
              />
              <ValidationField
                label="Director"
                name="director"
                value={form.director}
                validation={validations.director}
                onChange={update}
              />

              {/* Fila 2 */}
              <ValidationField
                label="Duración (min)"
                name="duracionMinutos"
                type="number"
                value={form.duracionMinutos}
                validation={validations.duracionMinutos}
                onChange={update}
              />
              <ValidationSelect
                label="Clasificación"
                value={form.clasificacionEdad}
                onChange={update}
                options={clasificaciones}
                validation={validations.clasificacionEdad}
              />

              {/* Fila 3 */}
              <ValidationField
                label="Fecha Estreno"
                name="fechaEstreno"
                type="date"
                value={form.fechaEstreno}
                validation={validations.fechaEstreno}
                onChange={update}
              />
              <ValidationField
                label="URL Poster"
                name="posterUrl"
                value={form.posterUrl}
                validation={validations.posterUrl}
                onChange={update}
              />

              {/* Sinopsis - Full width */}
              <div className="md:col-span-2">
                <label className="block">
                  <div className="flex items-center justify-between">
                    <span className="label-cine">Sinopsis</span>
                    <span className="text-xs text-cinema-gray/60">{form.sinopsis.length}/1000</span>
                  </div>
                  <div className="relative mt-2">
                    <textarea
                      className={`w-full rounded-xl border ${form.sinopsis && validations.sinopsis.valid ? 'border-green-500/50' : form.sinopsis && validations.sinopsis.error ? 'border-red-500/50' : 'border-white/10'} bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder-cinema-gray/50 outline-none transition focus:ring-1 ${form.sinopsis && validations.sinopsis.valid ? 'focus:border-green-500/70 focus:ring-green-500/30' : form.sinopsis && validations.sinopsis.error ? 'focus:border-red-500/70 focus:ring-red-500/30' : 'focus:border-cinema-gold/50 focus:ring-cinema-gold/30'}`}
                      rows={3}
                      maxLength={1000}
                      value={form.sinopsis}
                      onChange={(e) => update('sinopsis', e.target.value)}
                    />
                    {form.sinopsis && (validations.sinopsis.valid ? (
                      <span className="absolute right-3 top-3 text-green-500">✓</span>
                    ) : validations.sinopsis.error ? (
                      <span className="absolute right-3 top-3 text-red-500">✕</span>
                    ) : null)}
                  </div>
                  {form.sinopsis && validations.sinopsis.error && <p className="mt-1 text-xs text-red-400">{validations.sinopsis.error}</p>}
                  {validations.sinopsis.valid && form.sinopsis && <p className="mt-1 text-xs text-green-400">✓ Sinopsis válida</p>}
                </label>
              </div>

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
                    ) : editId ? 'Actualizar' : 'Crear película'}
                  </button>
                  {editId && (
                    <button
                      type="button"
                      className="btn-secondary flex-1"
                      onClick={() => {
                        setEditId(null);
                        setForm(initial);
                        setValidations({
                          titulo: { valid: false, error: '' },
                          director: { valid: false, error: '' },
                          duracionMinutos: { valid: false, error: '' },
                          fechaEstreno: { valid: false, error: '' },
                          posterUrl: { valid: false, error: '' },
                          sinopsis: { valid: false, error: '' },
                          clasificacionEdad: { valid: true, error: '' },
                        });
                        setImageError(false);
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Vista Previa a la derecha */}
          <div className="space-y-4">
            <div className="soft-card border-white/10 overflow-hidden">
              <div className="aspect-[2/3] bg-white/[0.05] flex items-center justify-center relative">
                {!form.posterUrl || imageError ? (
                  <div className="text-center p-4">
                    <p className="text-sm text-cinema-gray/60 mb-2">Sin imagen</p>
                    {imageError && <p className="text-xs text-red-400">No se pudo cargar</p>}
                  </div>
                ) : (
                  <>
                    {imageLoading && (
                      <div className="absolute inset-0 bg-white/[0.05] flex items-center justify-center">
                        <div className="h-8 w-8 animate-pulse rounded-lg bg-white/20"></div>
                      </div>
                    )}
                    <img
                      src={form.posterUrl}
                      alt={form.titulo || 'Poster'}
                      className="w-full h-full object-cover"
                      onLoad={() => setImageLoading(false)}
                      onError={() => {
                        setImageLoading(false);
                        setImageError(true);
                      }}
                      onLoadStart={() => setImageLoading(true)}
                    />
                  </>
                )}
              </div>
              <div className="border-t border-white/10 p-3 text-center">
                {form.posterUrl && !imageError && validations.posterUrl.valid ? (
                  <p className="text-xs text-green-400">✓ Imagen cargada</p>
                ) : form.posterUrl && !validations.posterUrl.valid ? (
                  <p className="text-xs text-red-400">✕ URL inválida</p>
                ) : (
                  <p className="text-xs text-cinema-gray/60">Ingresa una URL</p>
                )}
              </div>
            </div>

            {/* Resumen */}
            <SummaryCard />
          </div>
        </div>
      </div>

      {/* Tabla de películas */}
      <div className="card-cine overflow-hidden">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h3 className="text-xl font-bold text-white">Películas en cartelera</h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar por nombre..."
                className="input-cine w-full sm:w-56 border border-white/10 bg-slate-950 text-sm text-white placeholder:text-cinema-gray"
              />
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="input-cine w-full sm:w-40 border border-white/10 bg-slate-950 text-sm text-white"
                title="Fecha estreno desde"
              />
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="input-cine w-full sm:w-40 border border-white/10 bg-slate-950 text-sm text-white"
                title="Fecha estreno hasta"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-cinema-gray">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.15em] text-cinema-cream">
              <tr>
                <th className="px-5 py-4">Título</th>
                <th className="px-5 py-4">Director</th>
                <th className="px-5 py-4">Duración</th>
                <th className="px-5 py-4">Clasificación</th>
                <th className="px-5 py-4">Estreno</th>
                <th className="px-5 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(p => (
                <tr key={p.idPelicula} className="border-t border-white/5">
                  <td className="px-5 py-4 text-white font-medium">{p.titulo}</td>
                  <td className="px-5 py-4">{p.director || '—'}</td>
                  <td className="px-5 py-4">{p.duracionMinutos ? `${p.duracionMinutos} min` : '—'}</td>
                  <td className="px-5 py-4">{p.clasificacionEdad}</td>
                  <td className="px-5 py-4">{p.fechaEstreno ? formatDateLocal(p.fechaEstreno) : '—'}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button className="btn-secondary px-3 py-1" onClick={() => edit(p)}>Editar</button>
                      <button className="btn-primary px-3 py-1" onClick={() => del(p.idPelicula)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="px-5 py-8 text-center" colSpan={6}>No hay películas registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 border-t border-white/10 px-6 py-4">
            <button
              className="btn-secondary px-3 py-1 text-xs"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(safePage - 1)}
            >
              Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                className={`px-3 py-1 text-xs rounded-lg border transition ${p === safePage ? 'bg-cinema-gold text-cinema-black border-cinema-gold font-bold' : 'border-white/10 text-cinema-gray hover:border-white/20'}`}
                onClick={() => setCurrentPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              className="btn-secondary px-3 py-1 text-xs"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(safePage + 1)}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
