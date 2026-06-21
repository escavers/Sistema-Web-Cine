import { useMemo, useState } from 'react';
import RoleSelector from './components/RoleSelector';
import SaleWorkflow from './components/SaleWorkflow';
import ComprobanteViewer from './components/ComprobanteViewer';

const App = () => {
  const [currentRole, setCurrentRole] = useState(null);

  const comprobanteNumero = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('comprobante');
  }, []);

  const renderWorkflow = () => {
    if (currentRole === 'ENCARGADO') {
      return (
        <SaleWorkflow
          role="ENCARGADO"
          roleLabel="Encargado de boletería"
          userId={2}
          tipoVenta="PRESENCIAL"
          formaPagoPredeterminada="EFECTIVO"
          showBillingFields={true}
        />
      );
    }

    if (currentRole === 'CLIENTE') {
      return (
        <SaleWorkflow
          role="CLIENTE"
          roleLabel="Cliente online"
          userId={3}
          tipoVenta="ONLINE"
          formaPagoPredeterminada="QR"
          showBillingFields={false}
        />
      );
    }

    return <RoleSelector onSelectRole={setCurrentRole} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Módulo Transaccional</h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                Flujo especializado por perfil. Selecciona "Encargado" para venta presencial y "Cliente" para compra online.
              </p>
            </div>
            {currentRole ? (
              <button
                type="button"
                onClick={() => setCurrentRole(null)}
                className="rounded-full border border-slate-300 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cambiar rol
              </button>
            ) : null}
          </div>
        </div>

        {comprobanteNumero ? (
          <ComprobanteViewer numero={comprobanteNumero} />
        ) : (
          renderWorkflow()
        )}
      </div>
    </div>
  );
};

export default App;
