import { useEffect, useState } from 'react';

const PaymentQRCodeModal = ({ open, onClose, onConfirmed, montoTotal }) => {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      setLoading(true);
      setSuccess(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Pago en línea</h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900">Cerrar</button>
        </div>

        <div className="mt-6 space-y-5">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <div className="mx-auto mb-4 h-24 w-24 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
              <p className="text-sm font-medium text-slate-700">Generando QR de pago...</p>
              <p className="text-sm text-slate-500">Esto puede tardar unos segundos.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 p-6 text-center">
              <div className="mx-auto mb-5 inline-flex h-40 w-40 items-center justify-center rounded-3xl bg-slate-950 text-white">
                <span className="text-sm">QR</span>
              </div>
              <p className="text-sm text-slate-500">Escanee el código QR para completar el pago.</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">Total: Bs{montoTotal.toFixed(2)}</p>
              {success ? (
                <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-700">
                  Pago simulado exitoso. Puede confirmar la compra.
                </div>
              ) : null}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onConfirmed}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {success ? 'Confirmar compra' : 'Esperando QR'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentQRCodeModal;
