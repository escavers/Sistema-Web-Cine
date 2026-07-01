interface Asiento {
  idAsiento: string;
  fila: string;
  columna: number;
  estado: number | boolean;
}

interface SeatMapProps {
  asientos: Asiento[];
  selectedAsientos: string[];
  onToggle: (id: string) => void;
}

export default function SeatMap({ asientos = [], selectedAsientos = [], onToggle }: SeatMapProps) {
  if (!asientos.length) {
    return <p className="text-cinema-gray text-center py-8">No hay asientos disponibles.</p>;
  }

  const allOccupied = asientos.every(a => !a.estado);

  // Agrupar por fila
  const filas = [...new Set(asientos.map(a => a.fila))].sort();
  const maxCol = Math.max(...asientos.map(a => a.columna));

  function getEstado(idAsiento: string): 'disponible' | 'seleccionado' | 'ocupado' {
    const asiento = asientos.find(a => a.idAsiento === idAsiento);
    if (!asiento) return 'ocupado';
    if (!asiento.estado) return 'ocupado';
    if (selectedAsientos.includes(idAsiento)) return 'seleccionado';
    return 'disponible';
  }

  const colores = {
    disponible: 'border-white/20 bg-white/[0.05] hover:border-cinema-gold/50 hover:bg-cinema-gold/10',
    seleccionado: 'border-cinema-gold bg-cinema-gold/20 text-cinema-gold',
    ocupado: 'border-red-500/30 bg-red-500/10 text-red-400 cursor-not-allowed opacity-50',
  };

  return (
    <div className="card-cine p-6">
      <div className="mb-4 text-center">
        <div className="mx-auto mb-6 h-2 w-3/4 max-w-[300px] rounded-full bg-gradient-to-r from-cinema-gold/0 via-cinema-gold/60 to-cinema-gold/0" />
        <p className="text-xs uppercase tracking-[0.2em] text-cinema-gray">Pantalla</p>
      </div>

      <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex flex-col items-center gap-1.5 min-w-max mx-auto">
          {filas.map(fila => (
            <div key={fila} className="flex items-center gap-1.5">
              <span className="w-6 text-center text-xs font-bold text-cinema-gold">{fila}</span>
              {asientos
              .filter(a => a.fila === fila)
              .sort((a, b) => a.columna - b.columna)
              .map(asiento => {
                const estado = getEstado(asiento.idAsiento);
                return (
                  <button
                    key={asiento.idAsiento}
                    disabled={estado === 'ocupado'}
                    aria-label={`Asiento ${asiento.fila}${asiento.columna}, ${estado === 'ocupado' ? 'ocupado' : estado === 'seleccionado' ? 'seleccionado' : 'disponible'}`}
                    aria-disabled={estado === 'ocupado' ? true : undefined}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border text-[10px] font-semibold transition ${
                      colores[estado]
                    }`}
                    onClick={() => onToggle(asiento.idAsiento)}
                    title={`${asiento.fila}${asiento.columna}`}
                  />
                );
              })}
            <span className="w-6 text-center text-xs font-bold text-cinema-gold">{fila}</span>
          </div>
        ))}

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-cinema-gray">
          <span className="w-6" />
          {Array.from({ length: maxCol }, (_, index) => (
            <span key={index} className="flex h-5 w-8 items-center justify-center rounded-md bg-white/[0.03]">{index + 1}</span>
          ))}
          <span className="w-6" />
        </div>
      </div>
    </div>

      {allOccupied && (
        <p className="mt-4 text-center text-sm text-red-400 font-semibold">
          Esta función no tiene asientos disponibles.
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-4 sm:gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border border-white/20 bg-white/[0.05]" />
          <span className="text-cinema-gray">Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border border-cinema-gold bg-cinema-gold/20" />
          <span className="text-cinema-gray">Seleccionado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border border-red-500/30 bg-red-500/10" />
          <span className="text-cinema-gray">Ocupado</span>
        </div>
      </div>
    </div>
  );
}
