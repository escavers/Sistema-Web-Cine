import { useState, useEffect } from 'react';
import Field from '../components/Field';
import Message from '../components/Message';
import { api } from '../services/api';

export default function ReportesPage() {
  const [tab, setTab] = useState<'ocupacion' | 'mas-vistas' | 'ventas'>('ocupacion');
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

  useEffect(() => {
    if (tab === 'ocupacion') {
      api.listarPeliculas().then(res => setPeliculas(res.peliculas || [])).catch(() => {});
      api.listarSalas().then(res => setSalas(res.salas || [])).catch(() => {});
    }
  }, [tab]);

  function buildParams() {
    const params: any = {};
    if (fechaInicio) params.fechaInicio = fechaInicio;
    if (fechaFin) params.fechaFin = fechaFin;
    if (tab === 'ocupacion') {
      if (idPelicula) params.idPelicula = Number(idPelicula);
      if (idSala) params.idSala = idSala;
    }
    if (tab === 'mas-vistas') {
      params.orden = orden;
    }
    return params;
  }

  async function loadReport() {
    setLoading(true);
    setMessage(null);
    setData([]);
    try {
      const params = buildParams();
      let res;
      if (tab === 'ocupacion') res = await api.reporteOcupacion(params);
      else if (tab === 'mas-vistas') res = await api.reporteMasVistas(params);
      else res = await api.reporteVentas(params);

      setData(res.reporte || []);
      if (!res.reporte?.length) setMessage({ type: 'ok', text: 'No hay datos para el rango seleccionado.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al cargar reporte.' });
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {
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

  function resetFilters() {
    setFechaInicio('');
    setFechaFin('');
    setIdPelicula('');
    setIdSala('');
    setOrden('DESC');
    setData([]);
    setMessage(null);
  }

  const tabs = [
    { id: 'ocupacion' as const, label: 'Ocupación' },
    { id: 'mas-vistas' as const, label: 'Más vistas' },
    { id: 'ventas' as const, label: 'Ventas' },
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

          <Field label="Desde" name="fechaInicio" type="date" value={fechaInicio} onChange={(_, v) => setFechaInicio(v)} />
          <Field label="Hasta" name="fechaFin" type="date" value={fechaFin} onChange={(_, v) => setFechaFin(v)} />

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
            {loading ? 'Cargando...' : 'Consultar'}
          </button>
          <button
            className="rounded-lg border border-cinema-gold/40 bg-cinema-gold/10 px-4 py-2 text-xs font-semibold text-cinema-gold transition hover:bg-cinema-gold/20 disabled:opacity-50"
            disabled={downloading}
            onClick={downloadPdf}
          >
            {downloading ? 'Generando...' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      {message && <Message type={message.type} text={message.text} />}

      {data.length > 0 && (
        <div className="card-cine overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-cinema-gray">
              <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.15em] text-cinema-cream">
                <tr>
                  {Object.keys(data[0]).map(key => (
                    <th key={key} className="px-5 py-4">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="border-t border-white/5">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-5 py-4">
                        {val === null ? '—' :
                         typeof val === 'number' ? Number(val).toLocaleString('es-BO', { maximumFractionDigits: 2 }) :
                         String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
