import { useEffect, useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const ComprobanteViewer = ({ numero }) => {
  const [comprobante, setComprobante] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchComprobante = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/comprobantes/${encodeURIComponent(numero)}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'No se pudo cargar el comprobante');
        }
        setComprobante(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchComprobante();
  }, [numero]);

  const goHome = () => {
    window.location.href = window.location.origin;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-center text-slate-600">Cargando comprobante...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-center text-red-600">{error}</p>
        <div className="mt-6 text-center">
          <button onClick={goHome} className="rounded-full bg-indigo-600 px-5 py-3 text-white hover:bg-indigo-700">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Comprobante {comprobante.numero}</h1>
          <p className="text-sm text-slate-500">Venta #{comprobante.idVenta} • {new Date(comprobante.fechaCompra).toLocaleString()}</p>
        </div>
        <button onClick={goHome} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
          Volver al inicio
        </button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Cliente</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{comprobante.razonSocialCliente || 'Cliente'}</p>
            <p className="mt-1 text-sm text-slate-600">NIT/CID: {comprobante.nitCliente || '—'}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Función</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{comprobante.peliculaTitulo || '—'}</p>
            <p className="mt-1 text-sm text-slate-600">{new Date(comprobante.fecha).toLocaleDateString()} • {comprobante.horaInicio}</p>
            <p className="mt-1 text-sm text-slate-600">Sala: {comprobante.salaTipo || comprobante.idSala || '—'}</p>
            <p className="mt-2 text-sm text-slate-600">Asientos: {comprobante.asientos || '—'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Pago</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{comprobante.metodoPago || '—'}</p>
            <p className="mt-1 text-sm text-slate-600">Canal: {comprobante.canal || '—'}</p>
            <p className="mt-3 text-xl font-bold text-slate-900">Bs{Number(comprobante.montoTotal).toFixed(2)}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Escanea para abrir este comprobante</p>
            <img
              className="mx-auto mt-4 h-48 w-48 rounded-3xl bg-white p-3"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.href)}`}
              alt="QR comprobante"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComprobanteViewer;
