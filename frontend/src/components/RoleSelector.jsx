const RoleSelector = ({ onSelectRole }) => {
  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
      <h1 className="text-3xl font-semibold text-slate-900">Ingreso de usuario</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelectRole('ENCARGADO')}
          className="rounded-3xl border border-indigo-200 bg-indigo-600 px-6 py-5 text-left text-white shadow-sm transition hover:bg-indigo-700"
        >
          <p className="text-lg font-semibold">Encargado de boletería</p>
        </button>

        <button
          type="button"
          onClick={() => onSelectRole('CLIENTE')}
          className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5 text-left text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
        >
          <p className="text-lg font-semibold">Cliente online</p>
        </button>
      </div>
    </div>
  );
};

export default RoleSelector;
