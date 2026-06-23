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

export default function SeatMap({ asientos, selectedAsientos, onToggle }: SeatMapProps) {
  if (!asientos.length) {
    return <p className="text-cinema-gray text-center py-8">No hay asientos disponibles.</p>;
  }

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
        <div className="mx-auto mb-6 h-2 w-3/4 rounded-full bg-gradient-to-r from-cinema-gold/0 via-cinema-gold/60 to-cinema-gold/0" />
        <p className="text-xs uppercase tracking-[0.2em] text-cinema-gray">Pantalla</p>
      </div>

      <div className="flex flex-col items-center gap-1.5">
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
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border text-[10px] font-semibold transition ${
                      colores[estado]
                    }`}
                    onClick={() => onToggle(asiento.idAsiento)}
                    title={`${asiento.fila}${asiento.columna}`}
                  >
                    {asiento.columna}
                  </button>
                );
              })}
            <span className="w-6 text-center text-xs font-bold text-cinema-gold">{fila}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center gap-6 text-xs">
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
