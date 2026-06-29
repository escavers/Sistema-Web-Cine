import { useEffect, useState, useRef } from 'react';
import Field from '../components/Field';
import Message from '../components/Message';
import { api } from '../services/api';

const initial = { idSala: '', idPelicula: '', fecha: '', horaInicio: '', precioBase: '' };
const diasSemana = [
  { key: 'lunes', label: 'Lunes', value: 1 },
  { key: 'martes', label: 'Martes', value: 2 },
  { key: 'miercoles', label: 'Miércoles', value: 3 },
  { key: 'jueves', label: 'Jueves', value: 4 },
  { key: 'viernes', label: 'Viernes', value: 5 },
  { key: 'sabado', label: 'Sábado', value: 6 },
  { key: 'domingo', label: 'Domingo', value: 0 },
];

interface Validations {
  idSala: { valid: boolean; error: string };
  idPelicula: { valid: boolean; error: string };
  fecha: { valid: boolean; error: string };
  horaInicio: { valid: boolean; error: string };
  precioBase: { valid: boolean; error: string };
  fechaInicio?: { valid: boolean; error: string };
  fechaFin?: { valid: boolean; error: string };
}

interface FuncionItem {
  idFuncion: number;
  idSala: string;
  idPelicula: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  precioBase: number;
  peliculaTitulo: string;
}

interface MovieWithFunciones {
  idPelicula: number;
  peliculaTitulo: string;
  posterUrl?: string;
  funciones: FuncionItem[];
}

const parseLocalDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatDateLocal = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-BO');
  } catch {
    return dateStr;
  }
};

export default function FuncionesPage() {
  const [funciones, setFunciones] = useState<any[]>([]);
  const [peliculas, setPeliculas] = useState<any[]>([]);
  const [salas, setSalas] = useState<any[]>([]);
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [programacionMasiva, setProgramacionMasiva] = useState(false);
  const [masivaDatos, setMasivaDatos] = useState({
    fechaInicio: '',
    fechaFin: '',
    diasSeleccionados: [] as number[],
  });
  const [validations, setValidations] = useState<Validations>({
    idSala: { valid: false, error: '' },
    idPelicula: { valid: false, error: '' },
    fecha: { valid: false, error: '' },
    horaInicio: { valid: false, error: '' },
    precioBase: { valid: false, error: '' },
  });
  const [conflictoHorario, setConflictoHorario] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [selectedMovie, setSelectedMovie] = useState<MovieWithFunciones | null>(null);
  const [selectedFunctionIds, setSelectedFunctionIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    try {
      const [fRes, pRes, sRes] = await Promise.all([
        api.listarFunciones(),
        api.listarPeliculas(),
        api.listarSalas(),
      ]);
      setFunciones(fRes.funciones);
      setPeliculas(pRes.peliculas);
      setSalas(sRes.salas);
    } catch {
      setMessage({ type: 'error', text: 'No se pudieron cargar los datos.' });
    }
  }

  useEffect(() => { load(); }, []);

  // Validaciones
  const validateIdSala = (value: string): { valid: boolean; error: string } => {
    if (!value) return { valid: false, error: 'Selecciona una sala' };
    return { valid: true, error: '' };
  };

  const validateIdPelicula = (value: string): { valid: boolean; error: string } => {
    if (!value) return { valid: false, error: 'Selecciona una película' };
    return { valid: true, error: '' };
  };

  const validateFecha = (value: string): { valid: boolean; error: string } => {
    if (!value) return { valid: false, error: 'La fecha es obligatoria' };
    const fecha = parseLocalDate(value);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fecha < hoy) return { valid: false, error: 'No puedes programar fechas pasadas' };
    return { valid: true, error: '' };
  };

  const validateHoraInicio = (value: string): { valid: boolean; error: string } => {
    if (!value) return { valid: false, error: 'La hora es obligatoria' };
    return { valid: true, error: '' };
  };

  const validatePrecio = (value: string): { valid: boolean; error: string } => {
    if (!value) return { valid: false, error: 'El precio es obligatorio' };
    const num = Number(value);
    if (isNaN(num) || num <= 0) return { valid: false, error: 'El precio debe ser mayor a 0' };
    return { valid: true, error: '' };
  };

  const getMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const hasScheduleConflict = (room: string, date: string, startTime: string, duration: number) => {
    const buffer = 15;
    const newStart = getMinutes(startTime);
    const newEnd = newStart + duration;

    return funciones
      .filter((f) => f.idSala === room && f.fecha === date)
      .some((f) => {
        const existingStart = getMinutes(f.horaInicio.substring(0, 5));
        const existingEnd = getMinutes(f.horaFin.substring(0, 5));
        return newStart < existingEnd + buffer && newEnd > existingStart - buffer;
      });
  };

  const getScheduleConflictMessage = (room: string, date: string, startTime: string, duration: number) => {
    const buffer = 15;
    const newStart = getMinutes(startTime);
    const newEnd = newStart + duration;

    for (const f of funciones.filter((func) => func.idSala === room && func.fecha === date)) {
      const existingStart = getMinutes(f.horaInicio.substring(0, 5));
      const existingEnd = getMinutes(f.horaFin.substring(0, 5));
      if (newStart < existingEnd + buffer && newEnd > existingStart - buffer) {
        return `⚠ Conflicto: ${f.peliculaTitulo} en esta sala bloquea el horario. Debe haber al menos ${buffer} minutos de recarga entre funciones.`;
      }
    }

    return '';
  };

  const validateAll = (formData: typeof form): Validations => {
    const validations = {
      idSala: validateIdSala(formData.idSala),
      idPelicula: validateIdPelicula(formData.idPelicula),
      fecha: programacionMasiva ? { valid: true, error: '' } : validateFecha(formData.fecha),
      horaInicio: validateHoraInicio(formData.horaInicio),
      precioBase: validatePrecio(formData.precioBase),
      fechaInicio: programacionMasiva ? validateFecha(masivaDatos.fechaInicio) : { valid: true, error: '' },
      fechaFin: programacionMasiva ? validateFecha(masivaDatos.fechaFin) : { valid: true, error: '' },
    };

    if (!programacionMasiva && formData.idSala && formData.fecha && formData.horaInicio && formData.idPelicula) {
      const pelicula = peliculas.find((p) => p.idPelicula === Number(formData.idPelicula));
      const duration = pelicula?.duracionMinutos || 120;
      const conflictMessage = getScheduleConflictMessage(formData.idSala, formData.fecha, formData.horaInicio, duration);
      if (conflictMessage) {
        return { ...validations, horaInicio: { valid: false, error: conflictMessage } };
      }
    }

    if (programacionMasiva && formData.idSala && formData.horaInicio && formData.idPelicula && masivaDatos.fechaInicio && masivaDatos.fechaFin) {
      const pelicula = peliculas.find((p) => p.idPelicula === Number(formData.idPelicula));
      const duration = pelicula?.duracionMinutos || 120;
      const rangeDates = generarFechasEnRango(masivaDatos.fechaInicio, masivaDatos.fechaFin, masivaDatos.diasSeleccionados);
      const conflictingDate = rangeDates.find((fecha) => hasScheduleConflict(formData.idSala, fecha, formData.horaInicio, duration));

      if (conflictingDate) {
        return {
          ...validations,
          horaInicio: { valid: false, error: `⚠ Conflicto en programación masiva: la sala ya tiene una función el ${formatDateLocal(conflictingDate)}` },
        };
      }
    }

    return validations;
  };

  // Detectar conflicto de horarios
  const detectarConflicto = (idSala: string, fecha: string, horaInicio: string, duracion: number) => {
    const conflictMessage = getScheduleConflictMessage(idSala, fecha, horaInicio, duracion);
    setConflictoHorario(conflictMessage);
  };

  function openMovieModal(movie: any) {
    setSelectedMovie(movie);
    setSelectedFunctionIds([]);
  }

  function closeMovieModal() {
    setSelectedMovie(null);
    setSelectedFunctionIds([]);
  }

  function toggleFunctionSelection(idFuncion: number) {
    setSelectedFunctionIds((prev) =>
      prev.includes(idFuncion) ? prev.filter((id) => id !== idFuncion) : [...prev, idFuncion]
    );
  }

  async function handleBulkDelete() {
    if (selectedFunctionIds.length === 0) return;
    if (!window.confirm(`Eliminar ${selectedFunctionIds.length} función(es) seleccionada(s)?`)) return;

    setBulkDeleting(true);
    let eliminadas = 0;
    let fallidas = 0;
    for (const id of selectedFunctionIds) {
      try {
        await api.eliminarFuncion(id);
        eliminadas += 1;
      } catch {
        fallidas += 1;
      }
    }

    await load();
    setBulkDeleting(false);
    closeMovieModal();
    setMessage({
      type: fallidas > 0 ? 'error' : 'ok',
      text: `${eliminadas} función(es) eliminada(s).${fallidas > 0 ? ` ${fallidas} no se pudieron eliminar.` : ''}`,
    });
  }

  const moviesWithFunciones = peliculas.map((p): MovieWithFunciones => ({
    idPelicula: p.idPelicula,
    peliculaTitulo: p.titulo,
    posterUrl: p.posterUrl,
    funciones: funciones.filter((f) => f.idPelicula === p.idPelicula),
  })).filter((m) => m.funciones.length > 0);

  const filteredMovies = moviesWithFunciones.filter((movie) =>
    movie.peliculaTitulo.toLowerCase().includes(searchText.toLowerCase())
  );

  const groupedByDate: Record<string, FuncionItem[]> = selectedMovie
    ? selectedMovie.funciones.reduce<Record<string, FuncionItem[]>>((acc, fn) => {
        acc[fn.fecha] = acc[fn.fecha] || [];
        acc[fn.fecha].push(fn);
        return acc;
      }, {} as Record<string, FuncionItem[]>)
    : {};

  function update(name: string, value: string) {
    setForm((prevForm) => ({ ...prevForm, [name]: value }));
  }
  
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setValidations(validateAll(form));

      if (form.idSala && form.fecha && form.horaInicio && form.idPelicula) {
        const pelicula = peliculas.find(p => p.idPelicula === Number(form.idPelicula));
        detectarConflicto(form.idSala, form.fecha, form.horaInicio, pelicula?.duracionMinutos || 120);
      }
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [form, peliculas]);

  const calcularHoraFin = (horaInicio: string, duracion: number) => {
    if (!horaInicio) return '';
    const [h, m] = horaInicio.split(':').map(Number);
    const finMin = h * 60 + m + duracion;
    const hFin = String(Math.floor(finMin / 60) % 24).padStart(2, '0');
    const mFin = String(finMin % 60).padStart(2, '0');
    return `${hFin}:${mFin}`;
  };

  const generarFechasEnRango = (inicio: string, fin: string, dias: number[]): string[] => {
    const resultado: string[] = [];
    const fechaInicio = parseLocalDate(inicio);
    const fechaFin = parseLocalDate(fin);

    for (let d = new Date(fechaInicio); d <= fechaFin; d.setDate(d.getDate() + 1)) {
      if (dias.includes(d.getDay())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        resultado.push(`${y}-${m}-${day}`);
      }
    }

    return resultado;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validateAll(form);
    const allValid = Object.values(validationErrors).every(v => v.valid);

    if (!allValid || conflictoHorario) {
      setMessage({ type: 'error', text: conflictoHorario || 'Por favor, completa todos los campos correctamente.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const pelicula = peliculas.find(p => p.idPelicula === Number(form.idPelicula));
      const duracion = pelicula?.duracionMinutos || 120;
      const horaFin = calcularHoraFin(form.horaInicio, duracion);

      const payload = {
        idSala: form.idSala,
        idPelicula: Number(form.idPelicula),
        fecha: form.fecha,
        horaInicio: form.horaInicio + ':00',
        horaFin: horaFin + ':00',
        precioBase: Number(form.precioBase),
      };

      const res = await api.crearFuncion(payload);
      const promoMsg = res.promocionActivada ? ' ¡2x1 activado!' : '';
      setMessage({ type: 'ok', text: 'Función creada correctamente.' + promoMsg });
      setForm(initial);
      setValidations({
        idSala: { valid: false, error: '' },
        idPelicula: { valid: false, error: '' },
        fecha: { valid: false, error: '' },
        horaInicio: { valid: false, error: '' },
        precioBase: { valid: false, error: '' },
      });
      setConflictoHorario('');
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al crear función.' });
    } finally {
      setLoading(false);
    }
  }

  async function submitMasiva(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validateAll(form);
    const allValid = Object.values(validationErrors).every(v => v.valid);

    if (!allValid || masivaDatos.diasSeleccionados.length === 0) {
      setMessage({ type: 'error', text: 'Completa todos los campos y selecciona al menos un día.' });
      return;
    }

    const fechas = generarFechasEnRango(masivaDatos.fechaInicio, masivaDatos.fechaFin, masivaDatos.diasSeleccionados);

    if (fechas.length === 0) {
      setMessage({ type: 'error', text: 'No hay fechas válidas en el rango seleccionado.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const pelicula = peliculas.find(p => p.idPelicula === Number(form.idPelicula));
      const duracion = pelicula?.duracionMinutos || 120;
      const horaFin = calcularHoraFin(form.horaInicio, duracion);

      let exitosas = 0;
      let conflictos = 0;
      let promocionActivadaCount = 0;

      for (const fecha of fechas) {
        if (hasScheduleConflict(form.idSala, fecha, form.horaInicio, duracion)) {
          conflictos++;
          continue;
        }

        const payload = {
          idSala: form.idSala,
          idPelicula: Number(form.idPelicula),
          fecha: fecha,
          horaInicio: form.horaInicio + ':00',
          horaFin: horaFin + ':00',
          precioBase: Number(form.precioBase),
        };
        const res = await api.crearFuncion(payload);
        if (res.promocionActivada) promocionActivadaCount++;
        exitosas++;
      }

      const promoMsg = promocionActivadaCount > 0 ? ` (${promocionActivadaCount} con 2x1 activado)` : '';
      setMessage({
        type: 'ok',
        text: `${exitosas} función(es) creada(s).${promoMsg} ${conflictos > 0 ? `${conflictos} con conflictos de horario.` : ''}`,
      });

      setForm(initial);
      setMasivaDatos({ fechaInicio: '', fechaFin: '', diasSeleccionados: [] });
      setProgramacionMasiva(false);
      setValidations({
        idSala: { valid: false, error: '' },
        idPelicula: { valid: false, error: '' },
        fecha: { valid: false, error: '' },
        horaInicio: { valid: false, error: '' },
        precioBase: { valid: false, error: '' },
      });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al crear funciones.' });
    } finally {
      setLoading(false);
    }
  }

  async function del(id: number) {
    if (!window.confirm('¿Eliminar esta función?')) return;
    try {
      await api.eliminarFuncion(id);
      setMessage({ type: 'ok', text: 'Función eliminada.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al eliminar.' });
    }
  }

  // Helpers
  const peliculaSeleccionada = peliculas.find(p => p.idPelicula === Number(form.idPelicula));
  const duracionPelicula = peliculaSeleccionada?.duracionMinutos || 120;
  const horaFinalCalculada = calcularHoraFin(form.horaInicio, duracionPelicula);
  const funcionesSalaSeleccionada = form.idSala && form.fecha 
    ? funciones.filter(f => f.idSala === form.idSala && f.fecha === form.fecha).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
    : [];
  const allValid = Object.values(validations).every(v => v.valid);

  // Función para obtener mensajes de validación específicos
  const getValidationFeedback = (): string | null => {
    if (!validations.idPelicula.valid) return '❌ Selecciona una película';
    if (!validations.idSala.valid) return '❌ Selecciona una sala';
    if (!validations.horaInicio.valid) return '❌ Especifica la hora de inicio';
    
    if (programacionMasiva) {
      if (!masivaDatos.fechaInicio) return '❌ Ingresa la fecha de inicio';
      if (!masivaDatos.fechaFin) return '❌ Ingresa la fecha de fin';
      if (masivaDatos.diasSeleccionados.length === 0) return '❌ Selecciona al menos un día de la semana';
      if (parseLocalDate(masivaDatos.fechaInicio) > parseLocalDate(masivaDatos.fechaFin)) return '❌ La fecha de fin debe ser posterior a la fecha de inicio';
    } else {
      if (!validations.fecha.valid) return '❌ Selecciona una fecha válida';
    }
    
    if (!validations.precioBase.valid) return '❌ Ingresa un precio válido (mayor a 0)';
    if (conflictoHorario) return conflictoHorario;
    
    return null;
  };

  const validationFeedback = getValidationFeedback();

  return (
    <section className="space-y-8">
      <div className="card-cine p-7">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">{programacionMasiva ? 'Programación masiva' : 'Nueva función'}</h2>
          <button
            type="button"
            className="btn-secondary px-4 py-2 text-sm"
            onClick={() => {
              setProgramacionMasiva(!programacionMasiva);
              setForm(initial);
              setValidations({
                idSala: { valid: false, error: '' },
                idPelicula: { valid: false, error: '' },
                fecha: { valid: false, error: '' },
                horaInicio: { valid: false, error: '' },
                precioBase: { valid: false, error: '' },
              });
            }}
          >
            {programacionMasiva ? '← Volver a único' : 'Programación masiva →'}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Formulario */}
          <div className="lg:col-span-2">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={programacionMasiva ? submitMasiva : submit}>
              {/* Película */}
              <label className="block md:col-span-2">
                <span className="label-cine">Película</span>
                <div className="relative mt-2">
                  <select
                    className={`input-cine border ${!form.idPelicula ? 'border-white/10' : 'border-green-500/50'} transition focus:border-cinema-gold/70`}
                    value={form.idPelicula}
                    onChange={(e) => update('idPelicula', e.target.value)}
                  >
                    <option value="">Seleccionar película...</option>
                    {peliculas.map(p => <option key={p.idPelicula} value={p.idPelicula}>{p.titulo}</option>)}
                  </select>
                  {form.idPelicula && <span className="absolute right-3 top-2.5 text-green-500">✓</span>}
                </div>
              </label>

              {/* Sala */}
              <label className="block">
                <span className="label-cine">Sala</span>
                <div className="relative mt-2">
                  <select
                    className={`input-cine border ${!form.idSala ? 'border-white/10' : 'border-green-500/50'} transition focus:border-cinema-gold/70`}
                    value={form.idSala}
                    onChange={(e) => update('idSala', e.target.value)}
                  >
                    <option value="">Seleccionar sala...</option>
                    {salas.map(s => <option key={s.idSala} value={s.idSala}>{s.idSala} ({s.tipo})</option>)}
                  </select>
                  {form.idSala && <span className="absolute right-3 top-2.5 text-green-500">✓</span>}
                </div>
              </label>

              {/* Hora Inicio */}
              <Field
                label="Hora inicio"
                name="horaInicio"
                type="time"
                value={form.horaInicio}
                onChange={update}
              />

              {/* Fecha(s) */}
              {!programacionMasiva ? (
                <Field
                  label="Fecha"
                  name="fecha"
                  type="date"
                  value={form.fecha}
                  onChange={update}
                />
              ) : (
                <>
                  <Field
                    label="Fecha inicio"
                    name="fechaInicio"
                    type="date"
                    value={masivaDatos.fechaInicio}
                    onChange={(name, value) => setMasivaDatos(m => ({ ...m, fechaInicio: value }))}
                  />
                  <Field
                    label="Fecha fin"
                    name="fechaFin"
                    type="date"
                    value={masivaDatos.fechaFin}
                    onChange={(name, value) => setMasivaDatos(m => ({ ...m, fechaFin: value }))}
                  />
                </>
              )}

              {/* Precio */}
              <Field
                label="Precio base (Bs.)"
                name="precioBase"
                type="number"
                value={form.precioBase}
                onChange={update}
              />

              {/* Días de la semana (solo programación masiva) */}
              {programacionMasiva && (
                <div className="md:col-span-2">
                  <span className="label-cine block mb-3">Días de la semana</span>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {diasSemana.map(d => (
                      <label key={d.key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={masivaDatos.diasSeleccionados.includes(d.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMasivaDatos(m => ({
                                ...m,
                                diasSeleccionados: [...m.diasSeleccionados, d.value].sort(),
                              }));
                            } else {
                              setMasivaDatos(m => ({
                                ...m,
                                diasSeleccionados: m.diasSeleccionados.filter(v => v !== d.value),
                              }));
                            }
                          }}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-xs text-cinema-cream">{d.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensaje y Botón */}
              <div className="md:col-span-2 space-y-4">
                {message && <Message type={message.type} text={message.text} />}
                {validationFeedback && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                    <p className="text-sm text-yellow-300">{validationFeedback}</p>
                  </div>
                )}
                <button
                  className="btn-primary w-full disabled:opacity-50"
                  disabled={loading || !allValid || conflictoHorario !== '' || (programacionMasiva && masivaDatos.diasSeleccionados.length === 0)}
                >
                  {loading ? 'Creando...' : programacionMasiva ? 'Crear todas las funciones' : 'Crear función'}
                </button>
              </div>
            </form>
          </div>

          {/* Vista previa de película + Resumen */}
          <div className="space-y-4">
            {/* Vista previa */}
            {peliculaSeleccionada && (
              <div className="soft-card border-white/10 overflow-hidden">
                <div className="aspect-[2/3] bg-white/[0.05] flex items-center justify-center">
                  {peliculaSeleccionada.posterUrl ? (
                    <img
                      src={peliculaSeleccionada.posterUrl}
                      alt={peliculaSeleccionada.titulo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-cinema-gray/60">Sin poster</span>
                  )}
                </div>
                <div className="p-3 space-y-2 text-sm border-t border-white/10">
                  <p className="font-semibold text-cinema-cream text-center">{peliculaSeleccionada.titulo}</p>
                  {peliculaSeleccionada.director && <p className="text-xs text-cinema-gray">Dir: {peliculaSeleccionada.director}</p>}
                  <div className="flex justify-between text-xs">
                    <span className="text-cinema-gray">⏱ {peliculaSeleccionada.duracionMinutos} min</span>
                    <span className="text-cinema-gold font-semibold">{peliculaSeleccionada.clasificacionEdad}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Resumen */}
            {form.idPelicula && form.idSala && (
              <div className="soft-card border-white/10 space-y-3">
                <h4 className="text-sm font-bold text-cinema-cream uppercase tracking-wider border-b border-white/10 pb-2">Resumen</h4>
                <div className="space-y-2 text-sm">
                  {form.idPelicula && <div className="flex justify-between"><span className="text-cinema-gray">Película:</span><span className="text-cinema-cream font-semibold">{peliculaSeleccionada?.titulo}</span></div>}
                  {form.idSala && <div className="flex justify-between"><span className="text-cinema-gray">Sala:</span><span className="text-cinema-cream font-semibold">{form.idSala}</span></div>}
                  {!programacionMasiva && form.fecha && <div className="flex justify-between"><span className="text-cinema-gray">Fecha:</span><span className="text-cinema-cream">{formatDateLocal(form.fecha)}</span></div>}
                  {form.horaInicio && <div className="flex justify-between"><span className="text-cinema-gray">Inicio:</span><span className="text-cinema-cream">{form.horaInicio}</span></div>}
                  {form.horaInicio && <div className="flex justify-between"><span className="text-cinema-gray">Fin:</span><span className="text-cinema-gold font-semibold">{horaFinalCalculada}</span></div>}
                  {form.precioBase && <div className="flex justify-between border-t border-white/10 pt-2 mt-2"><span className="text-cinema-gray">Precio:</span><span className="text-green-400 font-semibold">Bs. {Number(form.precioBase).toFixed(2)}</span></div>}
                </div>
              </div>
            )}

            {/* Agenda de la sala */}
            {form.idSala && form.fecha && funcionesSalaSeleccionada.length > 0 && (
              <div className="soft-card border-white/10 space-y-2">
                <h4 className="text-xs font-bold text-cinema-cream uppercase tracking-wider">📅 Agenda {form.idSala} - {formatDateLocal(form.fecha)}</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {funcionesSalaSeleccionada.map(f => (
                    <div key={f.idFuncion} className="text-xs bg-white/[0.05] p-2 rounded border border-white/10">
                      <div className="flex justify-between">
                        <span className="text-cinema-cream font-semibold">{f.horaInicio.substring(0, 5)} - {f.horaFin.substring(0, 5)}</span>
                      </div>
                      <p className="text-cinema-gray text-xs truncate">{f.peliculaTitulo}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de funciones */}
      <div className="card-cine overflow-hidden">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Funciones programadas</h3>
              <p className="text-sm text-cinema-gray">Gestión por película y programación agrupada por fecha.</p>
            </div>
            <div className="relative max-w-md">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar película..."
                className="input-cine w-full border border-white/10 bg-slate-950 text-sm text-white placeholder:text-cinema-gray"
              />
            </div>
          </div>
        </div>
        <div className="p-6">
          {filteredMovies.length === 0 ? (
            <div className="p-8 text-center text-cinema-gray">No hay funciones programadas para esa búsqueda.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredMovies.map((movie) => {
                const rooms = Array.from(new Set(movie.funciones.map((f: any) => f.idSala))).sort();
                const ultimaFecha = movie.funciones
                  .map((f: any) => f.fecha)
                  .sort()
                  .reverse()[0];

                return (
                  <div key={movie.idPelicula} className="soft-card border-white/10 overflow-hidden">
                    <div className="aspect-[2/3] bg-white/[0.05] flex items-center justify-center overflow-hidden">
                      {movie.posterUrl ? (
                        <img src={movie.posterUrl} alt={movie.peliculaTitulo} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-cinema-gray/60">Sin poster</span>
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <h4 className="text-lg font-semibold text-white truncate">{movie.peliculaTitulo}</h4>
                        <p className="text-xs text-cinema-gray">{movie.funciones.length} función(es)</p>
                      </div>
                      <div className="text-xs text-cinema-gray space-y-1">
                        <p>Sala(s): <span className="text-white">{rooms.join(', ')}</span></p>
                        <p>Última fecha: <span className="text-white">{ultimaFecha ? formatDateLocal(ultimaFecha) : '---'}</span></p>
                      </div>
                      <button
                        type="button"
                        className="btn-primary w-full"
                        onClick={() => openMovieModal(movie)}
                      >
                        Ver programación
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {selectedMovie && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto">
          <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-[#070707] shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cinema-cream/60">Funciones por película</p>
                <h3 className="mt-2 text-2xl font-bold text-white">{selectedMovie.peliculaTitulo}</h3>
                <p className="text-sm text-cinema-gray">{selectedMovie.funciones.length} función(es) programada(s)</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn-secondary px-4 py-2"
                  onClick={closeMovieModal}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className="btn-primary disabled:opacity-50"
                  disabled={selectedFunctionIds.length === 0 || bulkDeleting}
                  onClick={handleBulkDelete}
                >
                  {bulkDeleting ? 'Eliminando...' : `Eliminar ${selectedFunctionIds.length} seleccionada(s)`}
                </button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              {Object.entries(groupedByDate).length === 0 ? (
                <div className="text-cinema-gray">No hay funciones para esta película.</div>
              ) : (
                Object.entries(groupedByDate).sort(([a], [b]) => a.localeCompare(b)).map(([fecha, funcs]) => (
                  <div key={fecha} className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-cinema-cream">{formatDateLocal(fecha)}</p>
                        <p className="text-xs text-cinema-gray">{funcs.length} función(es)</p>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary px-3 py-1 text-xs"
                        onClick={() => {
                          const fechasIds = funcs.map((f: any) => f.idFuncion);
                          setSelectedFunctionIds((prev) => Array.from(new Set([...prev, ...fechasIds])));
                        }}
                      >
                        Seleccionar todas
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {funcs.sort((a: any, b: any) => a.horaInicio.localeCompare(b.horaInicio)).map((func: any) => (
                        <label key={func.idFuncion} className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                          <input
                            type="checkbox"
                            checked={selectedFunctionIds.includes(func.idFuncion)}
                            onChange={() => toggleFunctionSelection(func.idFuncion)}
                            className="h-4 w-4 rounded border-white/20 bg-slate-900 text-cinema-gold"
                          />
                          <div className="min-w-0 flex-1 space-y-1 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-white">{func.horaInicio?.substring(0, 5)} - {func.horaFin?.substring(0, 5)}</span>
                              <span className="text-xs text-cinema-gray">Sala {func.idSala}</span>
                            </div>
                            <p className="text-xs text-cinema-gray truncate">Precio: Bs. {Number(func.precioBase).toFixed(2)}</p>
                          </div>
                          <button
                            type="button"
                            className="btn-secondary whitespace-nowrap px-3 py-1 text-xs"
                            onClick={() => del(func.idFuncion)}
                          >
                            Eliminar
                          </button>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
