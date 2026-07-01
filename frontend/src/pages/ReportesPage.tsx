import { useState, useEffect, useMemo, useCallback } from 'react';
import Field from '../components/Field';
import Message from '../components/Message';
import { api } from '../services/api';

type TabId = 'ocupacion' | 'mas-vistas' | 'ventas' | 'promociones';

const HEADER_MAP: Record<TabId, { key: string; label: string }[]> = {
  ocupacion: [
    { key: 'fecha', label: 'Fecha' },
    { key: 'idSala', label: 'Sala' },
    { key: 'salaTipo', label: 'Tipo' },
    { key: 'pelicula', label: 'Película' },
    { key: 'horaInicio', label: 'Hora' },
    { key: 'capacidadTotal', label: 'Capacidad' },
    { key: 'boletosVendidos', label: 'Vendidos' },
    { key: 'asientosDisponibles', label: 'Disponibles' },
    { key: 'ocupacionPorcentaje', label: '% Ocupación' },
  ],
  'mas-vistas': [
    { key: 'pelicula', label: 'Película' },
    { key: 'director', label: 'Director' },
    { key: 'totalBoletosVendidos', label: 'Boletos' },
    { key: 'ingresoTotal', label: 'Ingreso (Bs.)' },
    { key: 'promedioOcupacion', label: '% Ocupación' },
    { key: 'cantidadFunciones', label: 'Funciones' },
    { key: 'semanasEnCartelera', label: 'Semanas' },
  ],
  ventas: [
    { key: 'idVenta', label: '# Venta' },
    { key: 'fechaCompra', label: 'Fecha Compra' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'pelicula', label: 'Película' },
    { key: 'fechaFuncion', label: 'Fecha Función' },
    { key: 'horaInicio', label: 'Hora' },
    { key: 'sala', label: 'Sala' },
    { key: 'cantidadEntradas', label: 'Entradas' },
    { key: 'montoTotal', label: 'Monto (Bs.)' },
    { key: 'metodoPago', label: 'Pago' },
    { key: 'canal', label: 'Canal' },
    { key: 'estadoVenta', label: 'Estado' },
  ],
  promociones: [
    { key: 'pelicula', label: 'Película' },
    { key: 'funcionesActivas', label: 'Funciones con 2x1' },
    { key: 'fechaInicio', label: 'Desde' },
    { key: 'fechaFin', label: 'Hasta' },
  ],
};

function formatCell(val: any, key: string): string {
  if (val === null || val === undefined) return '—';
  if (key === 'fecha' || key === 'fechaCompra' || key === 'fechaFuncion' || key === 'fechaInicio' || key === 'fechaFin') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('es-BO');
  }
  if (key === 'horaInicio') return String(val).substring(0, 5);
  if (key === 'ocupacionPorcentaje' || key === 'promedioOcupacion') return `${val}%`;
  if (key === 'montoTotal' || key === 'ingresoTotal') return `Bs. ${Number(val).toFixed(2)}`;
  if (typeof val === 'number') return val.toLocaleString('es-BO', { maximumFractionDigits: 2 });
  return String(val);
}

export default function ReportesPage() {
  const [tab, setTab] = useState<TabId>('ocupacion');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [idPelicula, setIdPelicula] = useState('');
  const [idSala, setIdSala] = useState('');
  const [orden, setOrden] = useState<'DESC' | 'ASC'>('DESC');
  const [peliculas, setPeliculas] = useState<any[]>([]);
  const [salas, setSalas] = useState<any[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // async-parallel: cargar películas y salas en paralelo
  useEffect(() => {
    if (tab !== 'ocupacion') return;
    Promise.all([
      api.listarPeliculas().catch(() => ({ peliculas: [] })),
      api.listarSalas().catch(() => ({ salas: [] })),
    ]).then(([pelRes, salRes]) => {
      setPeliculas(pelRes.peliculas || []);
      setSalas(salRes.salas || []);
    });
  }, [tab]);

  const buildParams = useCallback(() => {
    const params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    if (tab === 'ocupacion') {
      if (idPelicula) params.idPelicula = Number(idPelicula);
      if (idSala) params.idSala = idSala;
    }
    if (tab === 'mas-vistas') params.orden = orden;
    return params;
  }, [fechaInicio, fechaFin, tab, idPelicula, idSala, orden]);

  const hasDateError = useMemo(
    () => !!(fechaInicio && fechaFin && fechaInicio > fechaFin),
    [fechaInicio, fechaFin]
  );

  async function loadReport() {
    if (hasDateError) {
      setMessage({ type: 'error', text: 'La fecha de inicio debe ser anterior a la fecha fin.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setData([]);
    try {
      if (tab === 'promociones') {
        const res = await api.listarFunciones();
        const funciones = res.funciones || [];
        const activas = funciones.filter((f: any) => f.promocionActiva === 1);
        const agrupadas: Record<string, any> = {};
        activas.forEach((f: any) => {
          const titulo = f.pelicula?.titulo ?? f.tituloPelicula ?? `Pelicula #${f.idPelicula}`;
          if (!agrupadas[titulo]) {
            agrupadas[titulo] = { pelicula: titulo, funcionesActivas: 0, fechaInicio: f.fecha, fechaFin: f.fecha };
          }
          agrupadas[titulo].funcionesActivas++;
          if (f.fecha < agrupadas[titulo].fechaInicio) agrupadas[titulo].fechaInicio = f.fecha;
          if (f.fecha > agrupadas[titulo].fechaFin) agrupadas[titulo].fechaFin = f.fecha;
        });
        const resultado = Object.values(agrupadas);
        setData(resultado);
        if (!resultado.length) setMessage({ type: 'ok', text: 'No hay películas con promoción 2x1 activa.' });
      } else {
        const params = buildParams();
        let res;
        if (tab === 'ocupacion') res = await api.reporteOcupacion(params);
        else if (tab === 'mas-vistas') res = await api.reporteMasVistas(params);
        else res = await api.reporteVentas(params);

        setData(res.reporte || []);
        if (!res.reporte?.length) setMessage({ type: 'ok', text: 'No hay datos para el rango seleccionado.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al cargar reporte.' });
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
    if (hasDateError) {
      setMessage({ type: 'error', text: 'La fecha de inicio debe ser anterior a la fecha fin.' });
      return;
    }

    setDownloading(true);
    setMessage(null);
    try {
      const params = buildParams();
      let blob: Blob;
      if (tab === 'ocupacion') blob = await api.descargarReporteOcupacionPdf(params);
      else if (tab === 'mas-vistas') blob = await api.descargarReporteMasVistasPdf(params);
      else blob = await api.descargarReporteVentasPdf(params);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-${tab}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al descargar PDF.' });
    } finally {
      setDownloading(false);
    }
  }

  // rerender-derived-state: derivar durante render, no en efecto
  const summary = useMemo(() => {
    if (!data.length) return null;
    if (tab === 'ocupacion') {
      const avg = data.reduce((s, r) => s + Number(r.ocupacionPorcentaje || 0), 0) / data.length;
      return `Promedio ocupación: ${avg.toFixed(1)}% | Total funciones: ${data.length}`;
    }
    if (tab === 'mas-vistas') {
      const totalBoletos = data.reduce((s, r) => s + Number(r.totalBoletosVendidos || 0), 0);
      const totalIngreso = data.reduce((s, r) => s + Number(r.ingresoTotal || 0), 0);
      return `Total boletos: ${totalBoletos.toLocaleString('es-BO')} | Ingreso total: Bs. ${totalIngreso.toFixed(2)}`;
    }
    if (tab === 'promociones') {
      const totalFunciones = data.reduce((s, r) => s + Number(r.funcionesActivas || 0), 0);
      return `Películas con 2x1: ${data.length} | Total funciones en promoción: ${totalFunciones}`;
    }
    const totalIngreso = data.reduce((s, r) => s + Number(r.montoTotal || 0), 0);
    return `Total ventas: ${data.length} | Ingreso total: Bs. ${totalIngreso.toFixed(2)}`;
  }, [data, tab]);

  function resetFilters() {
    setFechaInicio('');
    setFechaFin('');
    setIdPelicula('');
    setIdSala('');
    setOrden('DESC');
    setData([]);
    setMessage(null);
  }

  const headers = HEADER_MAP[tab];

  const tabs = [
    { id: 'ocupacion' as const, label: 'Ocupación' },
    { id: 'mas-vistas' as const, label: 'Más vistas' },
    { id: 'ventas' as const, label: 'Ventas' },
    { id: 'promociones' as const, label: 'Promociones' },
  ];

  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-bold text-white">Reportes</h2>

      <div className="card-cine p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
            {tabs.map(t => (
              <button key={t.id} className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                tab === t.id ? 'bg-cinema-gold text-cinema-black' : 'text-cinema-gray hover:text-white'
              }`} onClick={() => { setTab(t.id); resetFilters(); }}>
                {t.label}
              </button>
            ))}
          </div>

          <Field label="Desde" name="fechaInicio" type="date" value={fechaInicio} onChange={(_, v) => setFechaInicio(v)} disabled={tab === 'promociones'} />
          <Field label="Hasta" name="fechaFin" type="date" value={fechaFin} onChange={(_, v) => setFechaFin(v)} disabled={tab === 'promociones'} />

          {tab === 'ocupacion' && (
            <>
              <label className="block">
                <span className="label-cine">Película</span>
                <select className="input-cine" value={idPelicula} onChange={e => setIdPelicula(e.target.value)}>
                  <option value="">Todas</option>
                  {peliculas.map((p: any) => (
                    <option key={p.idPelicula} value={p.idPelicula}>{p.titulo}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label-cine">Sala</span>
                <select className="input-cine" value={idSala} onChange={e => setIdSala(e.target.value)}>
                  <option value="">Todas</option>
                  {salas.map((s: any) => (
                    <option key={s.idSala} value={s.idSala}>{s.idSala} - {s.tipo}</option>
                  ))}
                </select>
              </label>
            </>
          )}

          {tab === 'mas-vistas' && (
            <label className="block">
              <span className="label-cine">Orden</span>
              <select className="input-cine" value={orden} onChange={e => setOrden(e.target.value as 'DESC' | 'ASC')}>
                <option value="DESC">Mayor asistencia</option>
                <option value="ASC">Menor asistencia</option>
              </select>
            </label>
          )}

          <button className="btn-primary" disabled={loading} onClick={loadReport}>
            {loading ? 'Cargando…' : 'Consultar'}
          </button>
          <button
            className="rounded-lg border border-cinema-gold/40 bg-cinema-gold/10 px-4 py-2 text-xs font-semibold text-cinema-gold transition hover:bg-cinema-gold/20 disabled:opacity-50"
            disabled={downloading || tab === 'promociones'}
            onClick={downloadPdf}
          >
            {downloading ? 'Generando…' : 'Descargar PDF'}
          </button>
        </div>
        {tab === 'promociones' && (
          <p className="mt-4 text-xs text-cinema-gray">Reporte de películas con promoción 2x1 activa</p>
        )}
      </div>

      {message && <Message type={message.type} text={message.text} />}

      {loading && data.length === 0 && (
        <div className="card-cine overflow-hidden">
          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full text-sm text-cinema-gray" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.15em] text-cinema-cream">
                <tr>
                  {headers.map(h => (
                    <th key={h.key} className="px-5 py-4">{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(6)].map((_, i) => (
                  <tr key={i} className="border-t border-white/5 animate-pulse">
                    {headers.map(h => (
                      <td key={h.key} className="px-5 py-4">
                        <div className="h-4 bg-white/[0.06] rounded w-24" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.length > 0 && (
        <>
          <div className="card-cine overflow-hidden">
            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-full text-sm text-cinema-gray" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.15em] text-cinema-cream">
                  <tr>
                    {headers.map(h => (
                      <th key={h.key} className="px-5 py-4">{h.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i} className="border-t border-white/5">
                      {headers.map(h => (
                        <td key={h.key} className="px-5 py-4">
                          {formatCell(row[h.key], h.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {summary && (
            <div className="rounded-xl border border-cinema-gold/20 bg-cinema-gold/5 px-5 py-3 text-sm font-semibold text-cinema-gold">
              {summary}
            </div>
          )}
        </>
      )}
    </section>
  );
}
