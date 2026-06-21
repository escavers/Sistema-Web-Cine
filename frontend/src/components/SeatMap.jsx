import { Fragment, useMemo, useEffect, useState } from 'react';

const SeatMap = ({ seats, selectedSeats, onToggleSeat }) => {
  const gridTemplate = useMemo(() => {
    const rows = [...new Set(seats.map((seat) => seat.fila))].sort();
    const columns = [...new Set(seats.map((seat) => seat.columna))].sort((a, b) => a - b);
    return { rows, columns };
  }, [seats]);

  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const columnSize = useMemo(() => {
    // Return [minPx, maxPx, dotSizePx]
    if (viewportWidth < 640) return [36, 56, 10]; // small phones
    if (viewportWidth < 1024) return [48, 72, 12]; // tablets / small desktop
    if (viewportWidth < 1440) return [64, 96, 16]; // desktop
    return [80, 120, 18]; // large desktop
  }, [viewportWidth]);

  const buildSeat = (fila, columna) => {
    const seat = seats.find((s) => s.fila === fila && s.columna === columna);
    if (!seat) {
      return <div key={`${fila}-${columna}`} className="h-12" />;
    }

    const occupied = !seat.estado;
    const selected = selectedSeats.includes(seat.idAsiento);

    const baseClasses = 'flex aspect-square h-12 items-center justify-center rounded-md transition-all focus:outline-none';
    const stateClasses = occupied
      ? 'cursor-not-allowed bg-red-500 text-white opacity-95'
      : selected
      ? 'bg-indigo-600 shadow-lg text-white'
      : 'bg-slate-100 hover:bg-slate-200';

    const focusRing = !occupied ? 'focus:ring-2 focus:ring-indigo-200' : '';

    return (
      <button
        key={seat.idAsiento}
        type="button"
        disabled={occupied}
        onClick={() => onToggleSeat(seat.idAsiento)}
        aria-pressed={selected}
        className={`${baseClasses} ${stateClasses} ${focusRing}`}
      >
        <div className={`h-6 w-6 md:h-8 md:w-8 rounded-sm ${occupied ? 'bg-red-600' : selected ? 'bg-white/20' : 'bg-slate-300/60'}`} />
      </button>
    );
  };

  return (
    <div className="space-y-5 flex flex-col items-center">
      <div className="flex items-end justify-center">
        <div className="w-full mx-auto px-2">
          <svg viewBox="0 0 200 30" className="mx-auto block h-8 w-full overflow-visible">
            <path d="M5 25 C60 -10 140 -10 195 25" stroke="#F59E0B" strokeWidth="6" fill="none" strokeLinecap="round" />
          </svg>
          <div className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Pantalla</div>
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        <div
          className="grid gap-4 w-full"
          style={{
            gridTemplateColumns: `minmax(3rem, auto) repeat(${gridTemplate.columns.length}, minmax(${columnSize[0]}px, ${columnSize[1]}px))`,
          }}
        >
            <div className="w-12" />
          {gridTemplate.columns.map((col) => (
            <div
              key={`col-${col}`}
              className="flex h-10 items-center justify-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
            >
              {col}
            </div>
          ))}

          {gridTemplate.rows.map((fila) => (
            <Fragment key={`row-${fila}`}>
              <div className="flex h-12 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700">
                {fila}
              </div>
              {gridTemplate.columns.map((columna) => buildSeat(fila, columna))}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-slate-700">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Disponible
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-2 text-indigo-800">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" /> Seleccionado
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-2 text-red-800">
          <span className="h-2.5 w-2.5 rounded-full bg-red-600" /> Ocupado
        </span>
      </div>
    </div>
  );
};

export default SeatMap;
