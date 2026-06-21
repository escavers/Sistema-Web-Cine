import { useEffect, useMemo, useState } from 'react';
import SeatMap from './SeatMap';
import PaymentQRCodeModal from './PaymentQRCodeModal';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const SaleWorkflow = ({
  role,
  roleLabel,
  userId,
  tipoVenta,
  formaPagoPredeterminada,
  showBillingFields,
}) => {
  const [funciones, setFunciones] = useState([]);
  const [selectedPeliculaId, setSelectedPeliculaId] = useState(null);
  const [selectedFuncion, setSelectedFuncion] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [nit, setNit] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [email, setEmail] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [comprobante, setComprobante] = useState(null);
  const [lastSeatsRaw, setLastSeatsRaw] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchFunciones = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/funciones`);
        const data = await response.json();
        setFunciones(data);
      } catch (error) {
        setMensaje('No se pudieron cargar las funciones. Verifica backend o base de datos.');
      }
    };

    fetchFunciones();
  }, []);

  useEffect(() => {
    if (role === 'CLIENTE') {
      const fetchEmail = async () => {
        try {
          const response = await fetch(`${BACKEND_URL}/usuarios/${userId}/email`);
          if (response.ok) {
            const data = await response.json();
            setEmail(data.email);
          }
        } catch (error) {
          console.error('Error al cargar email del usuario:', error);
        }
      };

      fetchEmail();
    }
  }, [role, userId]);

  const peliculas = useMemo(() => {
    const map = new Map();
    funciones.forEach((f) => {
      if (!map.has(f.idPelicula)) map.set(f.idPelicula, { idPelicula: f.idPelicula, peliculaTitulo: f.peliculaTitulo, peliculaDuracion: f.peliculaDuracion, peliculaClasificacion: f.peliculaClasificacion });
    });
    return Array.from(map.values());
  }, [funciones]);

  const fechas = useMemo(() => {
    const s = new Set();
    funciones.forEach((f) => s.add(f.fecha));
    return Array.from(s).sort();
  }, [funciones]);

  const salaTipos = useMemo(() => {
    const s = new Set();
    funciones.forEach((f) => s.add(f.salaTipo || f.idSala));
    return Array.from(s);
  }, [funciones]);

  const [selectedFecha, setSelectedFecha] = useState(null);
  const [selectedSalaTipo, setSelectedSalaTipo] = useState(null);
  const [viewStep, setViewStep] = useState(1);
  const [selectedFormaPago, setSelectedFormaPago] = useState(formaPagoPredeterminada);

  const formatFecha = (fechaIso) => {
    if (!fechaIso) return '';
    return new Date(fechaIso).toLocaleDateString(undefined, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatHora = (hora) => {
    if (!hora) return '';
    const [rawHours = '0', rawMinutes = '0'] = hora.split(':');
    const hours = rawHours.padStart(2, '0');
    const minutes = rawMinutes.padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return '';
    const m = Number(minutes) || 0;
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return mm === 0 ? `${h} h` : `${h} h ${mm} min`;
  };

  const funcionesFiltradas = useMemo(() => {
    return funciones
      .filter((f) => (selectedPeliculaId ? f.idPelicula === Number(selectedPeliculaId) : true))
      .filter((f) => (selectedFecha ? f.fecha === selectedFecha : true))
      .filter((f) => (selectedSalaTipo ? (f.salaTipo || f.idSala) === selectedSalaTipo : true))
      .sort((a, b) => (a.horaInicio > b.horaInicio ? 1 : -1));
  }, [funciones, selectedPeliculaId, selectedFecha, selectedSalaTipo]);

  useEffect(() => {
    if (!selectedFuncion) return;

    const fetchSeats = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/funciones/${selectedFuncion.idFuncion}/asientos`);
        const data = await response.json();
        console.debug('Fetched seats for funcion', selectedFuncion.idFuncion, 'status', response.status, 'data', data);
        setLastSeatsRaw(data);
        if (!response.ok) {
          setMensaje(data.message || 'Error al obtener asientos desde backend');
          setSeats([]);
          return;
        }
        setSeats(Array.isArray(data) ? data : data.asientos || []);
        setSelectedSeats([]);
      } catch (error) {
        setMensaje('No se pudieron cargar los asientos. Revisa el backend.');
      }
    };

    fetchSeats();
  }, [selectedFuncion]);

  const precioUnitario = Number(selectedFuncion?.precioBase || 0);
  const total = useMemo(() => Number((precioUnitario * selectedSeats.length).toFixed(2)), [precioUnitario, selectedSeats.length]);

  const selectedSeatLabels = useMemo(() => {
    if (!selectedSeats.length) return '';
    return selectedSeats
      .map((id) => {
        const s = seats.find((x) => x.idAsiento === id);
        return s ? `${s.fila}${s.columna}` : id;
      })
      .join(', ');
  }, [selectedSeats, seats]);

  const comprobanteSeatLabels = useMemo(() => {
    if (!comprobante?.asientos?.length) return '';
    return comprobante.asientos
      .map((id) => {
        const s = seats.find((x) => x.idAsiento === id);
        return s ? `${s.fila}${s.columna}` : id;
      })
      .join(', ');
  }, [comprobante, seats]);

  const handleToggleSeat = (seatId) => {
    setSelectedSeats((prev) => (prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]));
  };

  const handleStartPayment = () => {
    if (!selectedFuncion) {
      setMensaje('Selecciona una función primero.');
      return;
    }
    if (!selectedSeats.length) {
      setMensaje('Selecciona al menos un asiento.');
      return;
    }
    setMensaje(null);
    setShowQrModal(true);
  };

  const handleConfirmSale = async () => {
    setShowQrModal(false);
    setIsSubmitting(true);

    const payload = {
      idCliente: role === 'CLIENTE' ? userId : null,
      idEncargado: role === 'ENCARGADO' ? userId : null,
      idFuncion: selectedFuncion.idFuncion,
      tipo: tipoVenta,
      formaPago: role === 'ENCARGADO' ? selectedFormaPago : formaPagoPredeterminada,
      asientos: selectedSeats,
      nitCliente: nit || null,
      razonSocialCliente: razonSocial || null,
      usuarioA: userId,
    };

    try {
      const response = await fetch(`${BACKEND_URL}/ventas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al procesar la venta');
      }

      setComprobante({
        idVenta: data.venta.idVenta,
        numero: data.venta.numeroComprobante,
        monto: data.venta.montoTotal,
        codigoTransaccion: data.venta.codigoTransaccion,
        fechaCompra: data.venta.fechaCompra || new Date().toISOString(),
        metodoPago: data.venta.metodoPago,
        nitCliente: data.venta.nitCliente,
        razonSocialCliente: data.venta.razonSocialCliente,
        asientos: data.venta.asientos || selectedSeats,
        canal: data.venta.tipo || tipoVenta,
      });

      setMensaje(`Venta creada con éxito. ID de venta: ${data.venta.idVenta}, total: Bs${data.venta.montoTotal}`);
      setSeats((current) =>
        current.map((seat) => (selectedSeats.includes(seat.idAsiento) ? { ...seat, estado: false } : seat))
      );
      setSelectedSeats([]);

      // Enviar comprobante por email si se proporcionó
      if (email) {
        try {
          console.log('📧 Iniciando envío de email a:', email);
          const emailResponse = await fetch(`${BACKEND_URL}/enviar-comprobante-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idVenta: data.venta.idVenta,
              email,
            }),
          });
          const emailData = await emailResponse.json();
          console.log('📧 Respuesta del servidor:', emailData);
          if (emailData.enviado) {
            setMensaje((prev) => prev + '\n✅ Email enviado correctamente');
          }
        } catch (err) {
          console.error('❌ Error al enviar email:', err);
        }
      }
    } catch (error) {
      setMensaje(error.message || 'Error inesperado al procesar la venta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToStep = (step) => {
    setMensaje(null);
    if (step === 1) {
      setViewStep(1);
      return;
    }
    if (step === 2) {
      if (!selectedFuncion) {
        setMensaje('Selecciona una función primero.');
        return;
      }
      setViewStep(2);
      return;
    }
    if (step === 3) {
      if (!selectedFuncion) {
        setMensaje('Selecciona una función primero.');
        return;
      }
      if (!selectedSeats.length) {
        setMensaje('Selecciona al menos un asiento antes de proceder al pago.');
        return;
      }
      setViewStep(3);
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">{roleLabel}</h2>
        <p className="mt-2 text-slate-600">Aquí ves un flujo especializado según tu rol: {role === 'ENCARGADO' ? 'boletería presencial' : 'compra online'}.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,820px)] max-w-[1200px] mx-auto w-full px-4">
        <aside className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">Datos de venta</h3>
            <p className="text-sm text-slate-600">Modo: <strong>{tipoVenta}</strong></p>
            <p className="text-sm text-slate-600">Forma de pago: <strong>{role === 'ENCARGADO' ? selectedFormaPago : formaPagoPredeterminada}</strong></p>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
            <label className="block text-sm font-medium text-slate-700">
              Película
              <select
                value={selectedPeliculaId || ''}
                onChange={(event) => {
                  const val = event.target.value || null;
                  setSelectedPeliculaId(val);
                  setSelectedFecha(null);
                  setSelectedSalaTipo(null);
                  setSelectedFuncion(null);
                  setViewStep(1);
                }}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
              >
                <option value="">Todas las películas</option>
                {peliculas.map((p) => (
                  <option key={p.idPelicula} value={p.idPelicula}>
                    {p.peliculaTitulo}
                  </option>
                ))}
              </select>
            </label>

            {selectedPeliculaId && (() => {
              const mov = peliculas.find((x) => String(x.idPelicula) === String(selectedPeliculaId));
              if (!mov) return null;
              return (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-800">Detalles de la película</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-slate-500">Duración</p>
                      <p className="mt-1 font-semibold text-slate-900">{formatDuration(mov.peliculaDuracion)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Clasificación</p>
                      <p className="mt-1 font-semibold text-slate-900">{mov.peliculaClasificacion || '—'}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div>
              <p className="text-sm font-medium text-slate-700">Seleccione fecha</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {fechas.length === 0 ? (
                  <div className="text-sm text-slate-500">No hay fechas disponibles</div>
                ) : (
                  fechas.map((f) => {
                    const active = selectedFecha === f;
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => { setSelectedFecha(active ? null : f); setSelectedFuncion(null); setViewStep(1); }}
                        className={`flex-shrink-0 rounded-lg border px-3 py-2 text-sm font-medium ${active ? 'bg-amber-400 text-white' : 'bg-white text-slate-700'} shadow-sm`}
                      >
                        {new Date(f).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })}
                      </button>
                    );
                  })
                )}
              </div>

              <p className="mt-4 text-sm font-medium text-slate-700">Tipo de sala</p>
              <div className="mt-3 flex gap-3 flex-wrap">
                {salaTipos.map((s) => {
                  const active = selectedSalaTipo === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSelectedSalaTipo(active ? null : s); setSelectedFuncion(null); setViewStep(1); }}
                      className={`rounded-full px-3 py-2 text-sm font-medium ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {role === 'ENCARGADO' ? (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-700">Forma de pago</p>
                <div className="mt-2 flex gap-3">
                  {['EFECTIVO', 'QR', 'TARJETA'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedFormaPago(m)}
                      className={`rounded-full px-3 py-2 text-sm font-medium ${selectedFormaPago === m ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {showBillingFields ? (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  NIT (opcional)
                  <input
                    value={nit}
                    onChange={(event) => setNit(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-indigo-500"
                    placeholder="1234567-8"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Razón social (opcional)
                  <input
                    value={razonSocial}
                    onChange={(event) => setRazonSocial(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-indigo-500"
                    placeholder="Nombre de la empresa"
                  />
                </label>
              </>
            ) : null}
          </div>

        </aside>

        <main className="space-y-6">
          <div className="mb-6">
            <nav className="flex items-center justify-center gap-4">
              <button type="button" onClick={() => goToStep(1)} className="flex items-center gap-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 ease-in-out transform ${viewStep === 1 ? 'bg-indigo-600 text-white scale-110 shadow-md' : 'bg-slate-100 text-slate-700 hover:scale-105'}`}>1</span>
                <span className={`text-sm font-medium transition-colors duration-200 ${viewStep === 1 ? 'text-slate-900' : 'text-slate-500'}`}>Función</span>
              </button>

              <div className={`h-0.5 w-6 transition-colors duration-200 ${viewStep > 1 ? 'bg-indigo-400' : 'bg-slate-200'}`} />

              <button type="button" onClick={() => goToStep(2)} className="flex items-center gap-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 ease-in-out transform ${viewStep === 2 ? 'bg-indigo-600 text-white scale-110 shadow-md' : (viewStep > 2 ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-700 hover:scale-105')}`}>2</span>
                <span className={`text-sm font-medium transition-colors duration-200 ${viewStep === 2 ? 'text-slate-900' : 'text-slate-500'}`}>Asientos</span>
              </button>

              <div className={`h-0.5 w-6 transition-colors duration-200 ${viewStep > 2 ? 'bg-indigo-400' : 'bg-slate-200'}`} />

              <button type="button" onClick={() => goToStep(3)} className="flex items-center gap-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 ease-in-out transform ${viewStep === 3 ? 'bg-indigo-600 text-white scale-110 shadow-md' : 'bg-slate-100 text-slate-700 hover:scale-105'}`}>3</span>
                <span className={`text-sm font-medium transition-colors duration-200 ${viewStep === 3 ? 'text-slate-900' : 'text-slate-500'}`}>Pago</span>
              </button>
            </nav>
          </div>
          {viewStep === 1 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900">Seleccione una función</h3>
                <p className="mt-1 text-sm text-slate-600">Haz clic en una opción para continuar con la selección de asientos</p>
              </div>

              <div className="space-y-6">
                {!selectedPeliculaId ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                    Selecciona una película para ver las fechas disponibles.
                  </div>
                ) : !selectedFecha ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                    Selecciona una fecha primero para ver las funciones.
                  </div>
                ) : (
                  (() => {
                    const grupos = Array.from(funcionesFiltradas.reduce((m, f) => {
                      const tipo = f.salaTipo || f.idSala || 'General';
                      if (!m.has(tipo)) m.set(tipo, []);
                      m.get(tipo).push(f);
                      return m;
                    }, new Map()));

                    if (!grupos.length) {
                      return (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                          No hay funciones que coincidan con los filtros seleccionados.
                        </div>
                      );
                    }

                    return grupos.map(([tipo, lista]) => (
                      <div key={tipo} className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                          <h4 className="text-lg font-semibold text-slate-800">{tipo}</h4>
                          <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
                            {lista.length} función{lista.length !== 1 ? 'es' : ''}
                          </span>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                          {lista
                            .sort((a, b) => (a.horaInicio > b.horaInicio ? 1 : -1))
                            .map((f) => (
                              <button
                                key={f.idFuncion}
                                type="button"
                                onClick={() => setSelectedFuncion(f)}
                                className={`group relative flex items-center justify-between rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                                  selectedFuncion?.idFuncion === f.idFuncion
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md'
                                    : 'border-slate-200 bg-white text-slate-900 hover:border-indigo-300 hover:shadow-md'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500">{f.idSala}</span>
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${selectedFuncion?.idFuncion === f.idFuncion ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                    {formatHora(f.horaInicio)}
                                  </span>
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    ));
                  })()
                )}
              </div>

              {selectedFuncion && (
                <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Función seleccionada</p>
                      <h4 className="mt-2 text-lg font-semibold text-slate-900">{selectedFuncion.peliculaTitulo}</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewStep(2)}
                      className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                      disabled={!selectedFuncion}
                    >
                      Siguiente: seleccionar asientos
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Fecha</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{formatFecha(selectedFuncion.fecha)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Hora</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{formatHora(selectedFuncion.horaInicio)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Sala</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{selectedFuncion.salaTipo || selectedFuncion.idSala}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {viewStep === 2 && selectedFuncion && (
            <>
              <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 shadow-sm">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Mapa de asientos</h3>
                    <p className="mt-1 text-sm text-slate-600">{selectedFuncion.peliculaTitulo}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500">
                      <span>{formatFecha(selectedFuncion.fecha)}</span>
                      <span>•</span>
                      <span>{formatHora(selectedFuncion.horaInicio)}</span>
                      <span>•</span>
                      <span>{selectedFuncion.salaTipo || selectedFuncion.idSala}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setViewStep(1)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Volver a seleccionar función
                    </button>
                    <button
                      type="button"
                      onClick={() => goToStep(3)}
                      disabled={!selectedSeats.length}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Siguiente: pagar
                    </button>
                  </div>
                </div>
                <div className="flex justify-center overflow-x-auto rounded-xl bg-white p-6 shadow-inner">
                  {seats.length === 0 ? (
                    <div className="w-full text-center text-sm text-slate-500">
                      No se encontraron asientos para esta función.
                      {lastSeatsRaw && (
                        <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-slate-50 p-3 text-left text-xs text-slate-700">{JSON.stringify(lastSeatsRaw, null, 2)}</pre>
                      )}
                    </div>
                  ) : (
                    <SeatMap seats={seats} selectedSeats={selectedSeats} onToggleSeat={handleToggleSeat} />
                  )}
                </div>
              </section>
            </>
          )}

          {viewStep === 3 && selectedFuncion && (
            <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 to-white p-8 shadow-sm">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900">Resumen de compra</h3>
                  <div className="space-y-1 text-sm">
                    <div className="text-slate-700">
                      Asientos seleccionados: <span className="font-semibold text-indigo-600">{selectedSeats.length}</span>
                      {selectedSeats.length > 0 && (
                        <div className="mt-2 text-sm text-slate-700">Códigos: <span className="font-medium text-slate-900">{selectedSeatLabels}</span></div>
                      )}
                    </div>
                    <p className="text-slate-700">Precio unitario: <span className="font-semibold text-indigo-600">Bs{precioUnitario.toFixed(2)}</span></p>
                    <p className="mt-3 border-t border-slate-200 pt-3 text-lg font-bold text-slate-900">Total: <span className="text-indigo-600">Bs{total.toFixed(2)}</span></p>
                  </div>
                </div>

                <div className="space-y-4">
                  {showBillingFields ? (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">
                        NIT (opcional)
                        <input value={nit} onChange={(e) => setNit(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-indigo-500" placeholder="1234567-8" />
                      </label>
                      <label className="block text-sm font-medium text-slate-700">
                        Razón social (opcional)
                        <input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-indigo-500" placeholder="Nombre de la empresa" />
                      </label>
                    </div>
                  ) : null}
                  
                  {role === 'ENCARGADO' && (
                    <label className="block text-sm font-medium text-slate-700">
                      Email (opcional)
                      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-indigo-500" placeholder="correo@ejemplo.com" />
                    </label>
                  )}

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setViewStep(2)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Volver a asientos</button>
                    <button
                      type="button"
                      onClick={() => {
                        if (role === 'CLIENTE') {
                          setShowQrModal(true);
                        } else {
                          handleConfirmSale();
                        }
                      }}
                      disabled={!selectedSeats.length || isSubmitting}
                      className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Procesando...' : role === 'CLIENTE' ? '💳 Pagar con QR' : '✓ Registrar venta presencial'}
                    </button>
                  </div>
                </div>
              </div>
              {mensaje && (
                <div className={`mt-6 rounded-xl p-4 text-sm font-medium ${mensaje.includes('éxito') ? 'bg-green-50 text-green-900' : 'bg-amber-50 text-amber-900'}`}>
                  {mensaje}
                </div>
              )}
              {comprobante && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-800 mb-4">Comprobante</p>
                  
                  <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                    {/* Datos del comprobante */}
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">Número / Venta</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{comprobante.numero}</p>
                        <p className="mt-1 text-xs text-slate-600">ID: {comprobante.idVenta}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">Cliente / Razón Social</p>
                        <p className="mt-2 font-semibold text-slate-900">{comprobante.razonSocialCliente || razonSocial || 'Cliente'}</p>
                        <p className="mt-1 text-xs text-slate-600">NIT/CID: {comprobante.nitCliente || nit || '—'}</p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs text-slate-500">Fecha de compra</p>
                          <p className="mt-2 font-semibold text-slate-900">{comprobante.fechaCompra ? new Date(comprobante.fechaCompra).toLocaleString() : ''}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs text-slate-500">Método de pago</p>
                          <p className="mt-2 font-semibold text-slate-900">{comprobante.metodoPago || selectedFormaPago || formaPagoPredeterminada}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">Función</p>
                        <p className="mt-2 font-semibold text-slate-900">{selectedFuncion?.peliculaTitulo}</p>
                        <p className="mt-1 text-xs text-slate-600">{selectedFuncion ? `${formatFecha(selectedFuncion.fecha)} • ${formatHora(selectedFuncion.horaInicio)}` : ''}</p>
                        <p className="mt-2 text-xs text-slate-500">Sala</p>
                        <p className="font-semibold text-slate-900">{selectedFuncion?.salaTipo || selectedFuncion?.idSala}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">Asientos</p>
                        <p className="mt-2 font-semibold text-slate-900">{comprobanteSeatLabels || selectedSeatLabels || (comprobante.asientos ? comprobante.asientos.join(', ') : '')}</p>
                      </div>

                      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                        <p className="text-xs text-slate-500">Monto total</p>
                        <p className="mt-2 text-2xl font-bold text-indigo-600">Bs{Number(comprobante.monto).toFixed(2)}</p>
                      </div>
                    </div>

                    {/* QR */}
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500 text-center mb-4">Escanea para verificar</p>
                      <img
                        className="h-64 w-64 rounded-lg bg-white p-2"
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`${window.location.origin}/?comprobante=${comprobante.numero}`)}`}
                        alt="QR comprobante"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setComprobante(null); setMensaje(null); }}
                      className="flex-1 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      onClick={() => { window.print(); }}
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Imprimir
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      <PaymentQRCodeModal
        open={showQrModal}
        montoTotal={total}
        onClose={() => setShowQrModal(false)}
        onConfirmed={handleConfirmSale}
      />
    </div>
  );
};

export default SaleWorkflow;
