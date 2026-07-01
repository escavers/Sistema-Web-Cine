import { useEffect, useState, useRef, useMemo } from 'react';
import Field from '../components/Field';
import Message from '../components/Message';
import { api } from '../services/api';

const initial = { idSala: '', idPelicula: '', fecha: '', horaInicio: '', precioBase: '' };
const diasSemana = [
  { key: 'lunes', label: 'Lunes', short: 'Lun', value: 1 },
  { key: 'martes', label: 'Martes', short: 'Mar', value: 2 },
  { key: 'miercoles', label: 'Miércoles', short: 'Mié', value: 3 },
  { key: 'jueves', label: 'Jueves', short: 'Jue', value: 4 },
  { key: 'viernes', label: 'Viernes', short: 'Vie', value: 5 },
  { key: 'sabado', label: 'Sábado', short: 'Sáb', value: 6 },
  { key: 'domingo', label: 'Domingo', short: 'Dom', value: 0 },
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState<'hour' | '30min' | '15min'>('hour');
  const [timelineScrollPct, setTimelineScrollPct] = useState(0);
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const [showMovieSelector, setShowMovieSelector] = useState(false);
  const [searchMovie, setSearchMovie] = useState('');
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

  const parseLocalDateTime = (date: string, time: string) => {
    const [y, m, d] = date.split('-').map(Number);
    const [h, min] = time.split(':').map(Number);
    return new Date(y, m - 1, d, h, min, 0, 0);
  };

  const validateFecha = (value: string, hora?: string, fechaEstreno?: string): { valid: boolean; error: string } => {
    if (!value) return { valid: false, error: 'La fecha es obligatoria' };
    const fecha = parseLocalDate(value);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fecha < hoy) {
      return { valid: false, error: 'No puedes programar fechas pasadas' };
    }

    if (value === hoy.toISOString().slice(0, 10) && hora) {
      const fechaHora = parseLocalDateTime(value, hora);
      const ahora = new Date();
      ahora.setSeconds(0, 0);
      if (fechaHora < ahora) {
        return { valid: false, error: 'No puedes programar una hora pasada para hoy' };
      }
    }

    if (fechaEstreno) {
      const estreno = parseLocalDate(fechaEstreno);
      if (fecha < estreno) {
        return { valid: false, error: 'No puedes programar antes de la fecha de estreno de la película' };
      }
      if (value === estreno.toISOString().slice(0, 10) && hora) {
        const fechaHora = parseLocalDateTime(value, hora);
        const estrenoHora = new Date(estreno);
        estrenoHora.setHours(0, 0, 0, 0);
        if (fechaHora < estrenoHora) {
          return { valid: false, error: 'No puedes programar antes de la fecha de estreno de la película' };
        }
      }
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
    if (num <= 0) return { valid: false, error: 'El precio debe ser mayor a 0' };
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
      fecha: programacionMasiva ? { valid: true, error: '' } : validateFecha(formData.fecha, formData.horaInicio, fechaEstreno),
      horaInicio: validateHoraInicio(formData.horaInicio),
      precioBase: validatePrecio(formData.precioBase),
      fechaInicio: programacionMasiva ? validateFecha(masivaDatos.fechaInicio, formData.horaInicio, fechaEstreno) : { valid: true, error: '' },
      fechaFin: programacionMasiva ? validateFecha(masivaDatos.fechaFin, formData.horaInicio, fechaEstreno) : { valid: true, error: '' },
    };

    if (programacionMasiva && masivaDatos.fechaInicio && masivaDatos.fechaFin && parseLocalDate(masivaDatos.fechaFin) < parseLocalDate(masivaDatos.fechaInicio)) {
      return {
        ...validations,
        fechaFin: { valid: false, error: 'La fecha de fin no puede ser anterior a la fecha de inicio' },
      };
    }

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
      const nextValidations = validateAll(form);
      setValidations(nextValidations);
      if (Object.values(nextValidations).every((v) => v.valid) && conflictoHorario === '') {
        setMessage(null);
      }

      if (!programacionMasiva && form.idSala && form.fecha && form.horaInicio && form.idPelicula) {
        const pelicula = peliculas.find(p => p.idPelicula === Number(form.idPelicula));
        detectarConflicto(form.idSala, form.fecha, form.horaInicio, pelicula?.duracionMinutos || 120);
      }
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [form, peliculas, masivaDatos, programacionMasiva, conflictoHorario]);

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

  const addDaysToDate = (dateStr: string, days: number) => {
    const date = parseLocalDate(dateStr);
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleTimelineScroll = () => {
    const el = timelineContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      setTimelineScrollPct(0);
      return;
    }
    setTimelineScrollPct((el.scrollLeft / maxScroll) * 100);
  };

  const handleMiniMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const timelineEl = timelineContainerRef.current;
    if (!timelineEl) return;
    const maxScroll = timelineEl.scrollWidth - timelineEl.clientWidth;
    timelineEl.scrollLeft = ratio * maxScroll;
  };

  const handleZoomChange = (level: 'hour' | '30min' | '15min') => {
    setTimelineZoom(level);
    requestAnimationFrame(() => handleTimelineScroll());
  };

  const handleCopiarSemana = () => {
    if (!masivaDatos.fechaInicio || !masivaDatos.fechaFin) {
      setMessage({ type: 'error', text: 'Define el rango antes de copiar la semana.' });
      return;
    }
    setMasivaDatos((prev) => ({
      ...prev,
      fechaInicio: addDaysToDate(prev.fechaInicio, 7),
      fechaFin: addDaysToDate(prev.fechaFin, 7),
    }));
    setMessage({ type: 'ok', text: 'Semana copiada al siguiente período.' });
  };

  const openMovieSelector = () => setShowMovieSelector(true);

  const closeMovieSelector = () => {
    setShowMovieSelector(false);
    setSearchMovie('');
  };

  const selectMovie = (id: number) => {
    update('idPelicula', id.toString());
    closeMovieSelector();
  };

  useEffect(() => {
    document.body.style.overflow = showMovieSelector ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showMovieSelector]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && showMovieSelector) closeMovieSelector();
    }
    if (showMovieSelector) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showMovieSelector]);

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

    setValidations(validationErrors);
    setShowConfirmModal(true);
  }

  async function confirmMasiva() {
    setShowConfirmModal(false);
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
      const fechas = massPreviewDates;

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
  const peliculasFiltradas = peliculas.filter(p => p.titulo.toLowerCase().includes(searchMovie.toLowerCase()));

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
    const pct = ((mins - TIMELINE_START * 60) / TIMELINE_MINUTES) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  const getTimelineWidth = (start: string, end: string) => {
    const s = getMinutes(start);
    const e = getMinutes(end);
    const pct = ((e - s) / TIMELINE_MINUTES) * 100;
    return Math.max(2, Math.min(100, pct));
  };

  const timelineProposedStart = form.horaInicio ? getTimelineLeft(form.horaInicio) : null;
  const timelineProposedWidth = form.horaInicio ? getTimelineWidth(form.horaInicio, horaFinalCalculada) : null;
  const massTimelineProposedStart = form.horaInicio ? getTimelineLeft(form.horaInicio) : null;
  const massTimelineProposedWidth = form.horaInicio ? getTimelineWidth(form.horaInicio, horaFinalCalculada) : null;

  const massPreviewDates = useMemo(() => {
    if (!programacionMasiva || !masivaDatos.fechaInicio || !masivaDatos.fechaFin || masivaDatos.diasSeleccionados.length === 0) {
      return [] as string[];
    }

    if (parseLocalDate(masivaDatos.fechaInicio) > parseLocalDate(masivaDatos.fechaFin)) {
      return [] as string[];
    }

    return generarFechasEnRango(masivaDatos.fechaInicio, masivaDatos.fechaFin, masivaDatos.diasSeleccionados);
  }, [programacionMasiva, masivaDatos]);

  const massPreviewDateForTimeline = useMemo(() => {
    if (massPreviewDates.length === 0 || !form.idSala) return '';
    const firstWithFunciones = massPreviewDates.find((fecha) =>
      funciones.some((f) => f.idSala === form.idSala && f.fecha === fecha)
    );
    return firstWithFunciones ?? massPreviewDates[0];
  }, [massPreviewDates, form.idSala, funciones]);

  const massConflictDates = useMemo(() => {
    if (!form.idSala || !form.horaInicio || !form.idPelicula || massPreviewDates.length === 0) return [] as string[];
    return massPreviewDates.filter((fecha) => hasScheduleConflict(form.idSala, fecha, form.horaInicio, duracionPelicula));
  }, [massPreviewDates, form.idSala, form.horaInicio, form.idPelicula, duracionPelicula]);

  const funcionesSalaSeleccionadaMass = useMemo(() => {
    if (!form.idSala || !massPreviewDateForTimeline) return [] as FuncionItem[];
    return funciones
      .filter((f) => f.idSala === form.idSala && f.fecha === massPreviewDateForTimeline)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }, [funciones, form.idSala, massPreviewDateForTimeline]);

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

  const availableSlotsMass = useMemo(() => {
    if (!form.idSala || !massPreviewDateForTimeline) return [];
    const slots: string[] = [];
    const sorted = funcionesSalaSeleccionadaMass;

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
  }, [form.idSala, massPreviewDateForTimeline, funcionesSalaSeleccionadaMass, duracionPelicula]);

  const getValidationFeedback = (errors?: Validations): string | null => {
    const source = errors ?? validations;
    if (!source.idPelicula.valid) return source.idPelicula.error || 'Selecciona una película';
    if (!source.idSala.valid) return source.idSala.error || 'Selecciona una sala';
    if (!source.horaInicio.valid) return source.horaInicio.error || 'Especifica la hora de inicio';

    if (programacionMasiva) {
      if (!masivaDatos.fechaInicio) return 'Ingresa la fecha de inicio';
      if (!source.fechaInicio?.valid) return source.fechaInicio?.error || 'Ingresa una fecha de inicio válida';
      if (!masivaDatos.fechaFin) return 'Ingresa la fecha de fin';
      if (!source.fechaFin?.valid) return source.fechaFin?.error || 'Ingresa una fecha de fin válida';
      if (masivaDatos.diasSeleccionados.length === 0) return 'Selecciona al menos un día de la semana';
      if (parseLocalDate(masivaDatos.fechaInicio) > parseLocalDate(masivaDatos.fechaFin)) return 'La fecha de fin debe ser posterior a la fecha de inicio';
    } else {
      if (!source.fecha.valid) return source.fecha.error || 'Selecciona una fecha válida';
    }

    if (!source.precioBase.valid) return source.precioBase.error || 'Ingresa un precio válido mayor a 0 y menor a 10000';
    if (conflictoHorario) return conflictoHorario;

    return null;
  };

  const validationFeedback = getValidationFeedback();

  const selectedDayLabels = useMemo(() => {
    return diasSemana
      .filter((d) => masivaDatos.diasSeleccionados.includes(d.value))
      .map((d) => d.short);
  }, [masivaDatos.diasSeleccionados]);

  const massPreviewSummary = useMemo(() => {
    if (!programacionMasiva) return null;
    const total = massPreviewDates.length;
    const conflicts = massConflictDates.length;
    const days = selectedDayLabels.length > 0 ? selectedDayLabels.join(' · ') : 'Ninguno';
    return {
      total,
      conflicts,
      days,
      range: masivaDatos.fechaInicio && masivaDatos.fechaFin ? `${formatDateLocal(masivaDatos.fechaInicio)} — ${formatDateLocal(masivaDatos.fechaFin)}` : null,
      schedule: form.horaInicio ? `${form.horaInicio} → ${horaFinalCalculada}` : null,
    };
  }, [programacionMasiva, massPreviewDates, massConflictDates, selectedDayLabels, masivaDatos.fechaInicio, masivaDatos.fechaFin, form.horaInicio, horaFinalCalculada]);

  const presetDays = {
    todos: diasSemana.map((d) => d.value),
    lunesAViernes: diasSemana.filter((d) => d.value >= 1 && d.value <= 5).map((d) => d.value),
    finesDeSemana: diasSemana.filter((d) => d.value === 6 || d.value === 0).map((d) => d.value),
    ninguno: [] as number[],
  };

  const applyDayPreset = (preset: number[]) => {
    setMasivaDatos((prev) => ({ ...prev, diasSeleccionados: preset }));
  };

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
              setMessage(null);
              setConflictoHorario('');
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
              <div className="block md:col-span-2">
                <span className="label-cine">Película</span>
                <button type="button" onClick={openMovieSelector} className="mt-2 w-full text-left">
                  {form.idPelicula && peliculaSeleccionada ? (
                    <div className="flex items-center gap-3 rounded-xl border border-green-500/50 bg-white/[0.05] p-3 transition-all duration-200 hover:bg-white/[0.08] hover:border-green-500/70">
                      <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 bg-white/[0.05]">
                        {peliculaSeleccionada.posterUrl ? (
                          <img src={peliculaSeleccionada.posterUrl} alt={peliculaSeleccionada.titulo} referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%2318181b%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%22100%22 y=%22150%22 fill=%22%2352525b%22 font-family=%22system-ui%22 font-size=%2213%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3ESin imagen%3C/text%3E%3C/svg%3E'; e.currentTarget.onerror = null; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-cinema-gray/40 text-[8px]">Sin poster</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{peliculaSeleccionada.titulo}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-cinema-gray">{peliculaSeleccionada.duracionMinutos} min</span>
                          <span className="text-[11px] text-cinema-gold font-semibold">{peliculaSeleccionada.clasificacionEdad || 'TP'}</span>
                          {peliculaSeleccionada.fechaEstreno && (
                            <span className="text-[11px] text-cinema-gray/60">{new Date(peliculaSeleccionada.fechaEstreno).getFullYear()}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-green-500 text-lg shrink-0">✓</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] p-3 transition-all duration-200 hover:bg-white/[0.06] hover:border-white/[0.2]">
                      <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cinema-gold/60"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      </div>
                      <span className="text-sm text-cinema-gray/70">Seleccionar película...</span>
                    </div>
                  )}
                </button>
              </div>

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
              <div className="md:col-span-2 space-y-4">
                <div className="flex flex-col gap-3">
                  <span className="label-cine block">Días de la semana</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-cinema-cream hover:bg-cinema-gold/10"
                      onClick={() => applyDayPreset(presetDays.todos)}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-cinema-cream hover:bg-cinema-gold/10"
                      onClick={() => applyDayPreset(presetDays.lunesAViernes)}
                    >
                      Lunes a viernes
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-cinema-cream hover:bg-cinema-gold/10"
                      onClick={() => applyDayPreset(presetDays.finesDeSemana)}
                    >
                      Fines de semana
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-cinema-cream hover:bg-cinema-gold/10"
                      onClick={() => {
                        applyDayPreset(presetDays.ninguno);
                        setMessage(null);
                      }}
                    >
                      Ninguno
                    </button>
                  </div>
                </div>
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
                <div className="rounded-2xl border border-cinema-gold/20 bg-white/[0.03] p-3 text-xs text-cinema-gray">
                  <p className="font-semibold text-cinema-cream">Vista previa masiva</p>
                  <p className="mt-2">Días seleccionados: {selectedDayLabels.length > 0 ? selectedDayLabels.join(' · ') : 'Ninguno'}</p>
                  <p>Rango: {masivaDatos.fechaInicio && masivaDatos.fechaFin ? `${formatDateLocal(masivaDatos.fechaInicio)} — ${formatDateLocal(masivaDatos.fechaFin)}` : 'No definido'}</p>
                  <p>Funciones posibles: {massPreviewDates.length}</p>
                  <p className={massConflictDates.length > 0 ? 'text-amber-200' : 'text-cinema-gray'}>
                    Conflictos detectados: {massConflictDates.length}
                  </p>
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

            {programacionMasiva && form.idSala && massPreviewDateForTimeline && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md border-b border-white/10 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-cinema-cream uppercase tracking-wider">
                        Programación masiva — {form.idSala}
                      </h4>
                      <p className="text-xs text-cinema-gray">
                        Fecha de vista previa: {formatDateLocal(massPreviewDateForTimeline)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="btn-secondary text-xs px-3 py-2"
                        onClick={handleCopiarSemana}
                      >
                        Copiar semana
                      </button>
                      <button
                        type="button"
                        className="btn-primary text-xs px-3 py-2"
                        onClick={() => setShowConfirmModal(true)}
                      >
                        Crear todas
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mb-4 text-sm text-cinema-gray">
                  {funcionesSalaSeleccionadaMass.length > 0 ? (
                    <p>{funcionesSalaSeleccionadaMass.length} función(es) existente(s) para la fecha de vista previa.</p>
                  ) : (
                    <p>No hay funciones programadas en esta sala para la fecha de vista previa.</p>
                  )}
                  {form.horaInicio && (
                    <p className="mt-2 text-xs text-cinema-gray">Horario propuesto: {form.horaInicio} - {horaFinalCalculada}</p>
                  )}
                </div>

                {availableSlotsMass.length > 0 && !form.horaInicio && (
                  <div className="mt-3">
                    <p className="text-xs text-cinema-cream/70 mb-2 font-semibold uppercase tracking-wider">
                      Horarios sugeridos ({duracionPelicula} min + {BUFFER} min recarga)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {availableSlotsMass.slice(0, 12).map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => update('horaInicio', slot)}
                          className="px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs text-cinema-cream hover:bg-cinema-gold/20 hover:border-cinema-gold/40 hover:text-cinema-gold transition-all duration-200"
                        >
                          {slot}
                        </button>
                      ))}
                      {availableSlotsMass.length > 12 && (
                        <span className="px-3 py-1.5 text-xs text-cinema-gray self-center">
                          +{availableSlotsMass.length - 12} más
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
                  {programacionMasiva && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 mt-2 text-xs">
                      <p className="font-semibold text-cinema-cream mb-2">Preview masiva</p>
                      <div className="space-y-1 text-cinema-gray">
                        <p>Días: {selectedDayLabels.length > 0 ? selectedDayLabels.join(' · ') : 'Ninguno'}</p>
                        <p>Rango: {massPreviewSummary?.range || 'No definido'}</p>
                        <p>Funciones estimadas: <span className="text-white font-semibold">{massPreviewSummary?.total ?? 0}</span></p>
                        <p className={massPreviewSummary?.conflicts ? 'text-amber-200' : 'text-cinema-gray'}>Conflictos detectados: <span className="text-white font-semibold">{massPreviewSummary?.conflicts ?? 0}</span></p>
                        {massPreviewSummary?.conflicts ? (
                          <p className="text-[11px] text-amber-300">Se crearán solo las funciones sin conflicto. Revisa las fechas bloqueadas antes de confirmar.</p>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showConfirmModal && massPreviewSummary && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Confirmar programación masiva</h3>
                <p className="mt-1 text-sm text-cinema-gray">Revisa cuántas funciones se crearán y cuántas fechas presentan conflictos.</p>
              </div>
              <button
                type="button"
                className="text-cinema-gray hover:text-white"
                onClick={() => setShowConfirmModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-cinema-cream/60 mb-3">Resumen</p>
                <div className="space-y-2 text-sm text-cinema-gray">
                  <p><span className="text-cinema-cream">Sala:</span> {form.idSala}</p>
                  <p><span className="text-cinema-cream">Película:</span> {peliculaSeleccionada?.titulo}</p>
                  <p><span className="text-cinema-cream">Horario:</span> {massPreviewSummary.schedule || 'No definido'}</p>
                  <p><span className="text-cinema-cream">Rango:</span> {massPreviewSummary.range || 'No definido'}</p>
                  <p><span className="text-cinema-cream">Días:</span> {massPreviewSummary.days}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-cinema-cream/60 mb-3">Valores estimados</p>
                <div className="space-y-2 text-sm text-cinema-gray">
                  <p><span className="text-cinema-cream">Funciones totales:</span> {massPreviewSummary.total}</p>
                  <p><span className="text-cinema-cream">Conflictos:</span> {massPreviewSummary.conflicts}</p>
                  <p><span className="text-cinema-cream">Precio:</span> Bs. {Number(form.precioBase || '0').toFixed(2)}</p>
                </div>
              </div>
            </div>
            {massPreviewSummary.conflicts > 0 && (
              <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
                <p className="font-semibold">Advertencia de conflicto</p>
                <p>Hay {massPreviewSummary.conflicts} fecha(s) con conflicto en la sala seleccionada. Solo se crearán las fechas válidas.</p>
              </div>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-secondary w-full sm:w-auto"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary w-full sm:w-auto"
                onClick={confirmMasiva}
              >
                Confirmar creación ({massPreviewSummary.total - massPreviewSummary.conflicts} válidas)
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

      {/* Movie selector modal */}
      {showMovieSelector && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm p-4 md:items-center" role="dialog" aria-modal="true" aria-labelledby="movie-selector-title">
          <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/[0.08] bg-[#08080d] shadow-2xl shadow-black/60 my-8 md:my-0" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <h2 id="movie-selector-title" className="text-lg font-bold text-white">Seleccionar película</h2>
              <button type="button" onClick={closeMovieSelector} className="text-cinema-gray hover:text-white transition-colors p-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <div className="relative">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-cinema-gray/50"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  value={searchMovie}
                  onChange={(e) => setSearchMovie(e.target.value)}
                  placeholder="Buscar por título..."
                  autoFocus
                  autoComplete="off"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] pl-10 pr-4 py-3 text-sm text-white placeholder-cinema-gray/50 outline-none transition-all duration-200 focus:border-cinema-gold/60 focus:bg-white/[0.08] focus:ring-1 focus:ring-cinema-gold/20"
                />
                {searchMovie && (
                  <button type="button" onClick={() => setSearchMovie('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-cinema-gray hover:text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            </div>

            {/* Grid */}
            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
              {peliculasFiltradas.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-cinema-gray/60 text-sm">No se encontraron películas con ese título.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {peliculasFiltradas.map((p) => (
                    <button
                      type="button"
                      key={p.idPelicula}
                      onClick={() => selectMovie(p.idPelicula)}
                      className={`group text-left rounded-2xl border overflow-hidden transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${Number(form.idPelicula) === p.idPelicula ? 'border-green-500/60 bg-green-500/5' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.15]'}`}
                    >
                      <div className="aspect-[3/4] bg-white/[0.03] overflow-hidden">
                        {p.posterUrl ? (
                          <img src={p.posterUrl} alt={p.titulo} referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%2318181b%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%22100%22 y=%22150%22 fill=%22%2352525b%22 font-family=%22system-ui%22 font-size=%2213%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3ESin imagen%3C/text%3E%3C/svg%3E'; e.currentTarget.onerror = null; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-cinema-gray/30 text-xs">Sin poster</div>
                        )}
                      </div>
                      <div className="p-3 space-y-1.5">
                        <p className="text-sm font-semibold text-white leading-tight line-clamp-2 group-hover:text-cinema-gold transition-colors">{p.titulo}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-cinema-gray">{p.duracionMinutos} min</span>
                          <span className="text-[11px] text-cinema-gold font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded">{p.clasificacionEdad || 'TP'}</span>
                          {p.fechaEstreno && (
                            <span className="text-[11px] text-cinema-gray/60">{new Date(p.fechaEstreno).getFullYear()}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
