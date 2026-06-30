import { useEffect, useState, useRef, useMemo } from 'react';
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
  promocionActiva?: number;
}

interface MovieWithFunciones {
  idPelicula: number;
  peliculaTitulo: string;
  posterUrl?: string;
  funciones: FuncionItem[];
}

interface CrearFuncionResponse {
  ok: boolean;
  mensaje: string;
  idFuncion: number;
  promocionActivada?: boolean;
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

const TIMELINE_START = 12;
const TIMELINE_END = 22;
const TIMELINE_MINUTES = (TIMELINE_END - TIMELINE_START) * 60;
const BUFFER = 15;

const formatTime = (mins: number) => {
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
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
  const [modalMsg, setModalMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const modalMsgTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      return { funciones: fRes.funciones, peliculas: pRes.peliculas };
    } catch {
      setMessage({ type: 'error', text: 'No se pudieron cargar los datos.' });
      return null;
    }
  }

  useEffect(() => { load(); }, []);

  const validateIdSala = (value: string): { valid: boolean; error: string } => {
    if (!value) return { valid: false, error: 'Selecciona una sala' };
    return { valid: true, error: '' };
  };

  const validateIdPelicula = (value: string): { valid: boolean; error: string } => {
    if (!value) return { valid: false, error: 'Selecciona una película' };
    return { valid: true, error: '' };
  };

  const validateFecha = (value: string, fechaEstreno?: string): { valid: boolean; error: string } => {
    if (!value) return { valid: false, error: 'La fecha es obligatoria' };
    const fecha = parseLocalDate(value);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fecha < hoy) return { valid: false, error: 'No puedes programar fechas pasadas' };
    if (fechaEstreno) {
      const estreno = parseLocalDate(fechaEstreno);
      if (fecha < estreno) return { valid: false, error: 'No puedes programar antes de la fecha de estreno de la película' };
    }
    return { valid: true, error: '' };
  };

  const validateHoraInicio = (value: string): { valid: boolean; error: string } => {
    if (!value) return { valid: false, error: 'La hora es obligatoria' };
    if (value < '12:00' || value > '22:00') return { valid: false, error: 'La función debe ser entre 12:00 y 22:00' };
    return { valid: true, error: '' };
  };

  const validatePrecio = (value: string): { valid: boolean; error: string } => {
    if (!value) return { valid: false, error: 'El precio base es obligatorio' };
    const num = Number(value);
    if (isNaN(num)) return { valid: false, error: 'El precio debe ser un número válido' };
    if (num < 0) return { valid: false, error: 'El precio no puede ser menor a 0' };
    if (num > 9999) return { valid: false, error: 'El precio no puede tener más de 4 dígitos' };
    return { valid: true, error: '' };
  };

  const getMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const hasScheduleConflict = (room: string, date: string, startTime: string, duration: number) => {
    const newStart = getMinutes(startTime);
    const newEnd = newStart + duration;

    return funciones
      .filter((f) => f.idSala === room && f.fecha === date)
      .some((f) => {
        const existingStart = getMinutes(f.horaInicio.substring(0, 5));
        const existingEnd = getMinutes(f.horaFin.substring(0, 5));
        return newStart < existingEnd + BUFFER && newEnd > existingStart - BUFFER;
      });
  };

  const getScheduleConflictMessage = (room: string, date: string, startTime: string, duration: number) => {
    const newStart = getMinutes(startTime);
    const newEnd = newStart + duration;

    for (const f of funciones.filter((func) => func.idSala === room && func.fecha === date)) {
      const existingStart = getMinutes(f.horaInicio.substring(0, 5));
      const existingEnd = getMinutes(f.horaFin.substring(0, 5));
      if (newStart < existingEnd + BUFFER && newEnd > existingStart - BUFFER) {
        return `⚠ Conflicto: ${f.peliculaTitulo} en esta sala bloquea el horario. Debe haber al menos ${BUFFER} minutos de recarga entre funciones.`;
      }
    }

    return '';
  };

  const validateAll = (formData: typeof form): Validations => {
    const peliculaSeleccionada = peliculas.find((p) => p.idPelicula === Number(formData.idPelicula));
    const fechaEstreno = peliculaSeleccionada?.fechaEstreno;

    const validations = {
      idSala: validateIdSala(formData.idSala),
      idPelicula: validateIdPelicula(formData.idPelicula),
      fecha: programacionMasiva ? { valid: true, error: '' } : validateFecha(formData.fecha, fechaEstreno),
      horaInicio: validateHoraInicio(formData.horaInicio),
      precioBase: validatePrecio(formData.precioBase),
      fechaInicio: programacionMasiva ? validateFecha(masivaDatos.fechaInicio, fechaEstreno) : { valid: true, error: '' },
      fechaFin: programacionMasiva ? validateFecha(masivaDatos.fechaFin, fechaEstreno) : { valid: true, error: '' },
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

  const detectarConflicto = (idSala: string, fecha: string, horaInicio: string, duracion: number) => {
    const conflictMessage = getScheduleConflictMessage(idSala, fecha, horaInicio, duracion);
    setConflictoHorario(conflictMessage);
  };

  function openMovieModal(movie: any) {
    setSelectedMovie(movie);
    setSelectedFunctionIds([]);
    setModalMsg(null);
  }

  function closeMovieModal() {
    setSelectedMovie(null);
    setSelectedFunctionIds([]);
    setModalMsg(null);
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
    const validationMessage = getValidationFeedback(validationErrors);

    if (!allValid || conflictoHorario) {
      setMessage({ type: 'error', text: conflictoHorario || validationMessage || 'Por favor, completa todos los campos correctamente.' });
      setValidations(validationErrors);
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

      const res = await api.crearFuncion(payload) as CrearFuncionResponse;
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
    const validationMessage = getValidationFeedback(validationErrors);

    if (!allValid || masivaDatos.diasSeleccionados.length === 0) {
      setMessage({ type: 'error', text: validationMessage || (masivaDatos.diasSeleccionados.length === 0 ? 'Selecciona al menos un día de la semana.' : 'Completa todos los campos correctamente.') });
      setValidations(validationErrors);
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
      const fechasConflicto: string[] = [];

      for (const fecha of fechas) {
        if (hasScheduleConflict(form.idSala, fecha, form.horaInicio, duracion)) {
          conflictos++;
          fechasConflicto.push(fecha);
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
        const res = await api.crearFuncion(payload) as CrearFuncionResponse;
        if (res.promocionActivada) promocionActivadaCount++;
        exitosas++;
      }

      const promoMsg = promocionActivadaCount > 0 ? ` (${promocionActivadaCount} con 2x1 activado)` : '';
      let conflictDetail = '';
      if (fechasConflicto.length > 0) {
        const datesStr = fechasConflicto.length <= 3
          ? fechasConflicto.map(f => formatDateLocal(f)).join(', ')
          : `${fechasConflicto.slice(0, 3).map(f => formatDateLocal(f)).join(', ')} y ${fechasConflicto.length - 3} más`;
        conflictDetail = ` Conflicto en: ${datesStr}`;
      }
      setMessage({
        type: conflictos > 0 && exitosas === 0 ? 'error' : 'ok',
        text: `${exitosas} función(es) creada(s).${promoMsg}${conflictDetail}`,
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
    try {
      setModalMsg(null);
      await api.eliminarFuncion(id);
      setModalMsg({ type: 'ok', text: 'Función eliminada.' });
      if (modalMsgTimeoutRef.current) clearTimeout(modalMsgTimeoutRef.current);
      modalMsgTimeoutRef.current = setTimeout(() => setModalMsg(null), 2000);
      if (selectedMovie) {
        const remaining = selectedMovie.funciones.filter(f => f.idFuncion !== id);
        if (remaining.length > 0) {
          setSelectedMovie({ ...selectedMovie, funciones: remaining });
          setSelectedFunctionIds(prev => prev.filter(fid => fid !== id));
        } else {
          closeMovieModal();
        }
      }
      load();
    } catch (err) {
      setModalMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error al eliminar.' });
    }
  }

  // Derived state
  const peliculaSeleccionada = peliculas.find(p => p.idPelicula === Number(form.idPelicula));
  const duracionPelicula = peliculaSeleccionada?.duracionMinutos || 120;
  const horaFinalCalculada = calcularHoraFin(form.horaInicio, duracionPelicula);
  const funcionesSalaSeleccionada = form.idSala && form.fecha 
    ? funciones.filter(f => f.idSala === form.idSala && f.fecha === form.fecha).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
    : [];
  const allValid = Object.values(validations).every(v => v.valid);
  const salaSeleccionada = salas.find(s => s.idSala === form.idSala);

  // Promo eligibility based on release date
  const isPromoEligible = useMemo(() => {
    if (!peliculaSeleccionada?.fechaEstreno) return false;
    const estreno = new Date(peliculaSeleccionada.fechaEstreno);
    const hoy = new Date();
    const diff = Math.floor((hoy.getTime() - estreno.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 30;
  }, [peliculaSeleccionada]);

  // Timeline helpers
  const getTimelineLeft = (time: string) => {
    const mins = getMinutes(time);
    return ((mins - TIMELINE_START * 60) / TIMELINE_MINUTES) * 100;
  };

  const getTimelineWidth = (start: string, end: string) => {
    const s = getMinutes(start);
    const e = getMinutes(end);
    return Math.max(((e - s) / TIMELINE_MINUTES) * 100, 2);
  };

  const timelineProposedStart = form.horaInicio ? getTimelineLeft(form.horaInicio) : null;
  const timelineProposedWidth = form.horaInicio ? getTimelineWidth(form.horaInicio, horaFinalCalculada) : null;

  // Suggested available time slots
  const availableSlots = useMemo(() => {
    if (!form.idSala || !form.fecha) return [];
    const slots: string[] = [];
    const sorted = funcionesSalaSeleccionada;

    let cursor = TIMELINE_START * 60;
    const endOfDay = TIMELINE_END * 60;

    for (const f of sorted) {
      const existingStart = getMinutes(f.horaInicio.substring(0, 5));
      const gapEnd = existingStart - BUFFER;
      if (cursor + duracionPelicula <= gapEnd) {
        for (let t = cursor; t + duracionPelicula <= gapEnd; t += 30) {
          slots.push(formatTime(t));
        }
      }
      cursor = getMinutes(f.horaFin.substring(0, 5)) + BUFFER;
    }

    if (cursor + duracionPelicula <= endOfDay) {
      for (let t = cursor; t + duracionPelicula <= endOfDay; t += 30) {
        slots.push(formatTime(t));
      }
    }

    return slots;
  }, [form.idSala, form.fecha, funcionesSalaSeleccionada, duracionPelicula]);

  const getValidationFeedback = (errors?: Validations): string | null => {
    const source = errors ?? validations;
    if (!source.idPelicula.valid) return source.idPelicula.error || 'Selecciona una película';
    if (!source.idSala.valid) return source.idSala.error || 'Selecciona una sala';
    if (!source.horaInicio.valid) return source.horaInicio.error || 'Especifica la hora de inicio';

    if (programacionMasiva) {
      if (!masivaDatos.fechaInicio) return 'Ingresa la fecha de inicio';
      if (!masivaDatos.fechaFin) return 'Ingresa la fecha de fin';
      if (masivaDatos.diasSeleccionados.length === 0) return 'Selecciona al menos un día de la semana';
      if (parseLocalDate(masivaDatos.fechaInicio) > parseLocalDate(masivaDatos.fechaFin)) return 'La fecha de fin debe ser posterior a la fecha de inicio';
    } else {
      if (!source.fecha.valid) return source.fecha.error || 'Selecciona una fecha válida';
    }

    if (!source.precioBase.valid) return source.precioBase.error || 'Ingresa un precio válido entre 0 y 9999';
    if (conflictoHorario) return conflictoHorario;

    return null;
  };

  const validationFeedback = getValidationFeedback();

  const HOUR_LABELS = Array.from({ length: TIMELINE_END - TIMELINE_START }, (_, i) => i + TIMELINE_START);

  return (
    <section className="space-y-8">
      <div className="card-cine p-7">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{programacionMasiva ? 'Programación masiva' : 'Nueva función'}</h2>
            {isPromoEligible && peliculaSeleccionada && (
              <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-[11px] font-bold text-black uppercase tracking-wider shadow-lg shadow-amber-500/25">
                2x1 Disponible
              </span>
            )}
          </div>
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
            {programacionMasiva ? '← Individual' : 'Masiva →'}
          </button>
          <button
            type="button"
            className="btn-secondary px-4 py-2 text-sm"
            onClick={async () => {
              const hoy = new Date();
              const lunesActual = new Date(hoy);
              lunesActual.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
              const lunesSiguiente = new Date(lunesActual);
              lunesSiguiente.setDate(lunesActual.getDate() + 7);

              const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

              if (!confirm(`Copiar funciones del ${fmt(lunesActual)} al ${fmt(lunesSiguiente)}?`)) return;

              try {
                setLoading(true);
                const res = await api.copiarSemanaFunciones({
                  fechaOrigen: fmt(lunesActual),
                  fechaDestino: fmt(lunesSiguiente),
                });
                setMessage({ type: 'ok', text: res.mensaje });
                const refresh = await api.listarFunciones();
                setFunciones(refresh.funciones || []);
              } catch (err) {
                setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al copiar semana.' });
              } finally {
                setLoading(false);
              }
            }}
          >
            Copiar semana anterior
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Formulario (left 2/3) */}
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
                error={validations.horaInicio.error}
              />

              {/* Fecha(s) */}
              {!programacionMasiva ? (
                <Field
                  label="Fecha"
                  name="fecha"
                  type="date"
                  value={form.fecha}
                  onChange={update}
                  error={validations.fecha.error}
                />
              ) : (
                <>
                  <Field
                    label="Fecha inicio"
                    name="fechaInicio"
                    type="date"
                    value={masivaDatos.fechaInicio}
                    onChange={(name, value) => setMasivaDatos(m => ({ ...m, fechaInicio: value }))}
                    error={validations.fechaInicio?.error}
                  />
                  <Field
                    label="Fecha fin"
                    name="fechaFin"
                    type="date"
                    value={masivaDatos.fechaFin}
                    onChange={(name, value) => setMasivaDatos(m => ({ ...m, fechaFin: value }))}
                    error={validations.fechaFin?.error}
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
                min="0"
                max="9999"
                step="0.01"
                error={validations.precioBase.error}
              />

              {/* Días de la semana (solo programación masiva) */}
              {programacionMasiva && (
                <div className="md:col-span-2">
                  <span className="label-cine block mb-3">Días de la semana</span>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {diasSemana.map(d => (
                      <label key={d.key} className="flex items-center gap-2 cursor-pointer group">
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
                          className="w-4 h-4 rounded border-white/20 bg-white/[0.05] text-cinema-gold focus:ring-cinema-gold/40"
                        />
                        <span className="text-xs text-cinema-cream group-hover:text-white transition-colors">{d.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensaje y Botón */}
              <div className="md:col-span-2 space-y-4">
                {message && <Message type={message.type} text={message.text} />}
                {validationFeedback && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
                    <p className="text-sm text-red-300">{validationFeedback}</p>
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

            {/* Timeline - visible cuando hay sala+fecha seleccionados */}
            {form.idSala && form.fecha && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-cinema-cream uppercase tracking-wider">
                    Programación — {form.idSala} <span className="text-cinema-gray lowercase">para el</span> {formatDateLocal(form.fecha)}
                  </h4>
                  {funcionesSalaSeleccionada.length > 0 && (
                    <span className="text-[11px] text-cinema-gray bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/10">
                      {funcionesSalaSeleccionada.length} función(es) existente(s)
                    </span>
                  )}
                </div>

                {funcionesSalaSeleccionada.length === 0 && !form.horaInicio ? (
                  <div className="bg-white/[0.03] rounded-xl border border-dashed border-white/10 p-6 text-center">
                    <p className="text-sm text-cinema-gray">No hay funciones programadas en esta sala para esta fecha.</p>
                    <p className="text-xs text-cinema-gray mt-1">Selecciona un horario disponible abajo.</p>
                  </div>
                ) : (
                  <>
                    {/* Barra de timeline horizontal */}
                    <div className="relative pt-6 pb-2">
                      {/* Time labels */}
                      <div className="flex justify-between mb-2 px-0">
                        {HOUR_LABELS.map((h) => (
                          <span key={h} className="text-[10px] text-cinema-gray/50 font-mono -translate-x-1/2 first:translate-x-0 last:translate-x-0">
                            {String(h).padStart(2, '0')}:00
                          </span>
                        ))}
                      </div>
                      {/* Timeline track */}
                      <div className="relative h-10 bg-white/[0.03] rounded-lg border border-white/[0.06] overflow-hidden">
                        {/* Hour grid lines */}
                        {HOUR_LABELS.map((h) => (
                          <div
                            key={h}
                            className="absolute top-0 bottom-0 border-l border-white/[0.04]"
                            style={{ left: `${((h - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100}%` }}
                          />
                        ))}
                        {/* Existing function blocks */}
                        {funcionesSalaSeleccionada.map((f) => {
                          const left = getTimelineLeft(f.horaInicio.substring(0, 5));
                          const width = getTimelineWidth(f.horaInicio.substring(0, 5), f.horaFin.substring(0, 5));
                          return (
                            <div
                              key={f.idFuncion}
                              className="absolute top-1 bottom-1 rounded-md bg-gradient-to-r from-blue-500/40 to-blue-600/30 border border-blue-400/30 flex items-center px-2 overflow-hidden group cursor-default"
                              style={{ left: `${left}%`, width: `${width}%`, minWidth: width < 5 ? `${width}%` : undefined }}
                              title={`${f.peliculaTitulo} (${f.horaInicio.substring(0, 5)} - ${f.horaFin.substring(0, 5)})`}
                            >
                              <span className="text-[10px] text-blue-200 font-medium truncate whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                {f.horaInicio.substring(0, 5)} {f.peliculaTitulo}
                              </span>
                            </div>
                          );
                        })}
                        {/* Proposed function block */}
                        {form.horaInicio && timelineProposedStart !== null && timelineProposedWidth !== null && (
                          <div
                            className={`absolute top-1 bottom-1 rounded-md border-2 flex items-center justify-center overflow-hidden transition-all duration-200 group ${
                              conflictoHorario
                                ? 'bg-red-500/30 border-red-400/60'
                                : 'bg-cinema-gold/20 border-cinema-gold/60'
                            }`}
                            style={{ left: `${timelineProposedStart}%`, width: `${timelineProposedWidth}%`, minWidth: '2.5rem' }}
                          >
                            <span className={`text-[10px] font-bold truncate px-1 ${
                              conflictoHorario ? 'text-red-300' : 'text-cinema-gold'
                            }`}>
                              {form.horaInicio}
                            </span>
                            <button
                              type="button"
                              onClick={() => update('horaInicio', '')}
                              className="absolute top-1/2 -translate-y-1/2 right-0.5 w-3.5 h-3.5 rounded-full bg-red-500/80 border border-red-400 text-white text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 shadow"
                              title="Quitar horario"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Legend */}
                      <div className="flex items-center gap-4 mt-3 text-[11px] text-cinema-gray">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-blue-500/40 border border-blue-400/30" />
                          <span>Existente</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-3 h-3 rounded-sm border-2 ${conflictoHorario ? 'border-red-400 bg-red-500/30' : 'border-cinema-gold bg-cinema-gold/20'}`} />
                          <span>{conflictoHorario ? 'Conflicto' : 'Nueva'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-white/[0.04] border border-dashed border-white/10" />
                          <span>Disponible</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Suggested available slots */}
                {availableSlots.length > 0 && !form.horaInicio && (
                  <div className="mt-3">
                    <p className="text-xs text-cinema-cream/70 mb-2 font-semibold uppercase tracking-wider">
                      Horarios sugeridos ({duracionPelicula} min + {BUFFER} min recarga)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {availableSlots.slice(0, 12).map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => update('horaInicio', slot)}
                          className="px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs text-cinema-cream hover:bg-cinema-gold/20 hover:border-cinema-gold/40 hover:text-cinema-gold transition-all duration-200"
                        >
                          {slot}
                        </button>
                      ))}
                      {availableSlots.length > 12 && (
                        <span className="px-3 py-1.5 text-xs text-cinema-gray self-center">
                          +{availableSlots.length - 12} más
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Context Panel (right 1/3) */}
          <div className="space-y-4">
            {/* Movie card with promo badge */}
            {peliculaSeleccionada ? (
              <div className="soft-card border-white/10 overflow-hidden">
                <div className="flex gap-4">
                  <div className="w-20 h-28 rounded-xl overflow-hidden shrink-0 bg-white/[0.05]">
                    {peliculaSeleccionada.posterUrl ? (
                      <img
                        src={peliculaSeleccionada.posterUrl}
                        alt={peliculaSeleccionada.titulo}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%2318181b%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%22100%22 y=%22150%22 fill=%22%2352525b%22 font-family=%22system-ui%22 font-size=%2213%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3ESin imagen%3C/text%3E%3C/svg%3E'; e.currentTarget.onerror = null; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-cinema-gray/40 text-[10px]">Sin poster</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h4 className="font-bold text-white text-sm leading-tight truncate">{peliculaSeleccionada.titulo}</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-cinema-gray bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/10">
                        {peliculaSeleccionada.duracionMinutos} min
                      </span>
                      <span className="text-[11px] text-cinema-gold font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        {peliculaSeleccionada.clasificacionEdad || 'TP'}
                      </span>
                    </div>
                    {isPromoEligible && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400/20 to-amber-600/20 border border-amber-500/30 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        2x1 Disponible
                      </span>
                    )}
                    {peliculaSeleccionada.fechaEstreno && (
                      <p className="text-[10px] text-cinema-gray/60">
                        Estreno: {formatDateLocal(peliculaSeleccionada.fechaEstreno)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="soft-card border-white/10 py-8 text-center">
                <div className="text-3xl mb-2 opacity-30">🎬</div>
                <p className="text-xs text-cinema-gray">Selecciona una película</p>
              </div>
            )}

            {/* Room info */}
            {salaSeleccionada && (
              <div className="soft-card border-white/10">
                <h4 className="text-xs font-bold text-cinema-cream uppercase tracking-wider mb-3 border-b border-white/10 pb-2">
                  Sala {form.idSala}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-cinema-gray text-xs">Tipo</span>
                    <span className="text-cinema-cream font-semibold text-xs">{salaSeleccionada.tipo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cinema-gray text-xs">Capacidad</span>
                    <span className="text-cinema-cream font-semibold text-xs">{salaSeleccionada.capacidadTotal} asientos</span>
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            {form.idPelicula && form.idSala && (
              <div className="soft-card border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-cinema-cream uppercase tracking-wider border-b border-white/10 pb-2">Resumen</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-cinema-gray">Película</span>
                    <span className="text-cinema-cream font-semibold truncate ml-2">{peliculaSeleccionada?.titulo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cinema-gray">Sala</span>
                    <span className="text-cinema-cream">{form.idSala}</span>
                  </div>
                  {!programacionMasiva && form.fecha && (
                    <div className="flex justify-between">
                      <span className="text-cinema-gray">Fecha</span>
                      <span className="text-cinema-cream">{formatDateLocal(form.fecha)}</span>
                    </div>
                  )}
                  {form.horaInicio && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-cinema-gray">Inicio</span>
                        <span className="text-cinema-cream">{form.horaInicio}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cinema-gray">Fin</span>
                        <span className="text-cinema-gold font-semibold">{horaFinalCalculada}</span>
                      </div>
                    </>
                  )}
                  {form.precioBase && (
                    <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                      <span className="text-cinema-gray">Precio</span>
                      <span className="text-green-400 font-semibold">Bs. {Number(form.precioBase).toFixed(2)}</span>
                    </div>
                  )}
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
                        <img src={movie.posterUrl} alt={movie.peliculaTitulo} referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%2318181b%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%22100%22 y=%22150%22 fill=%22%2352525b%22 font-family=%22system-ui%22 font-size=%2213%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3ESin imagen%3C/text%3E%3C/svg%3E'; e.currentTarget.onerror = null; }} />
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
        <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto" onClick={closeMovieModal}>
          <div
            className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-[#070707] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-white/10 bg-gradient-to-r from-white/[0.02] to-transparent">
              <div className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-20 rounded-xl overflow-hidden shrink-0 bg-white/[0.05] hidden sm:block">
                    {selectedMovie.posterUrl ? (
                      <img src={selectedMovie.posterUrl} alt={selectedMovie.peliculaTitulo} referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%2318181b%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%22100%22 y=%22150%22 fill=%22%2352525b%22 font-family=%22system-ui%22 font-size=%2213%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3ESin imagen%3C/text%3E%3C/svg%3E'; e.currentTarget.onerror = null; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-cinema-gray/30 text-lg">🎬</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-cinema-cream/50">Funciones por película</p>
                    <h3 className="mt-1 text-xl font-bold text-white truncate">{selectedMovie.peliculaTitulo}</h3>
                    <p className="text-xs text-cinema-gray">{selectedMovie.funciones.length} función(es) programada(s)</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={closeMovieModal}>
                    Cerrar
                  </button>
                  <button
                    type="button"
                    className="btn-primary disabled:opacity-50 text-sm"
                    disabled={selectedFunctionIds.length === 0 || bulkDeleting}
                    onClick={handleBulkDelete}
                  >
                    {bulkDeleting ? 'Eliminando...' : `Eliminar ${selectedFunctionIds.length}`}
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-6 max-h-[65vh] overflow-y-auto">
              {Object.entries(groupedByDate).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-cinema-gray">
                  <span className="text-4xl mb-3 opacity-30">📅</span>
                  <p className="text-sm">No hay funciones para esta película.</p>
                </div>
              ) : (
                Object.entries(groupedByDate).sort(([a], [b]) => a.localeCompare(b)).map(([fecha, funcs]) => {
                  const sorted = funcs.sort((a: any, b: any) => a.horaInicio.localeCompare(b.horaInicio));
                  const allSelected = sorted.every((f: any) => selectedFunctionIds.includes(f.idFuncion));
                  return (
                    <div key={fecha}>
                      {/* Date header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 rounded-full bg-cinema-gold/60" />
                          <div>
                            <p className="text-base font-bold text-white">{formatDateLocal(fecha)}</p>
                            <p className="text-[11px] text-cinema-gray">{sorted.length} función(es)</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                            allSelected
                              ? 'border-cinema-gold/40 bg-cinema-gold/10 text-cinema-gold'
                              : 'border-white/10 bg-white/[0.03] text-cinema-gray hover:border-white/20 hover:text-cinema-cream'
                          }`}
                          onClick={() => {
                            if (allSelected) {
                              setSelectedFunctionIds((prev) => prev.filter((id) => !sorted.some((f: any) => f.idFuncion === id)));
                            } else {
                              const ids = sorted.map((f: any) => f.idFuncion);
                              setSelectedFunctionIds((prev) => Array.from(new Set([...prev, ...ids])));
                            }
                          }}
                        >
                          {allSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
                        </button>
                      </div>

                      {/* Function cards */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        {sorted.map((func: any) => {
                          const isSelected = selectedFunctionIds.includes(func.idFuncion);
                          return (
                            <div
                              key={func.idFuncion}
                              className={`rounded-2xl border transition-all duration-200 p-4 ${
                                isSelected
                                  ? 'border-cinema-gold/40 bg-cinema-gold/[0.04]'
                                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleFunctionSelection(func.idFuncion)}
                                  className="mt-1 h-4 w-4 rounded border-white/20 bg-white/[0.05] text-cinema-gold focus:ring-cinema-gold/40"
                                />
                                <div className="min-w-0 flex-1 space-y-2">
                                  {/* Time range */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-base font-bold text-white tabular-nums">
                                      {func.horaInicio?.substring(0, 5)}
                                    </span>
                                    <span className="text-cinema-gray/40">—</span>
                                    <span className="text-base font-bold text-cinema-gold tabular-nums">
                                      {func.horaFin?.substring(0, 5)}
                                    </span>
                                  </div>
                                  {/* Meta row */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 text-[11px] text-cinema-gray bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/10">
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                      {func.idSala}
                                    </span>
                                    {func.promocionActiva === 1 && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-wider">
                                        2x1
                                      </span>
                                    )}
                                  </div>
                                  {/* Price row */}
                                  <div className="flex items-center justify-between pt-1">
                                    <span className="text-sm font-semibold text-green-400">
                                      Bs. {Number(func.precioBase).toFixed(2)}
                                    </span>
                                    <button
                                      type="button"
                                      className="text-[11px] text-red-400/60 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                                      onClick={() => del(func.idFuncion)}
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with selection count */}
            <div className="border-t border-white/10 px-6 py-4 bg-white/[0.02] space-y-2">
              {modalMsg && (
                <div className={`text-xs px-3 py-2 rounded-lg ${
                  modalMsg.type === 'ok'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {modalMsg.text}
                </div>
              )}
              {selectedFunctionIds.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-cinema-cream">
                    <span className="font-bold text-cinema-gold">{selectedFunctionIds.length}</span> función(es) seleccionada(s)
                  </p>
                  <button
                    type="button"
                    className="text-xs text-cinema-gray hover:text-white transition-colors"
                    onClick={() => setSelectedFunctionIds([])}
                  >
                    Limpiar selección
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
