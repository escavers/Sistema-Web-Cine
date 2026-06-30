import { pool } from '../config/db.js';

/**
 * Servicio encargado de las promociones automatizadas del cine.
 * Cumple con HU-11: Activa automáticamente 2x1 para películas que:
 * - Tienen más de 30 días en cartelera (fechaEstreno < 30 días atrás).
 * - Su ocupación en la función es menor al 70%.
 */
/**
 * Evalúa las condiciones para la promoción 2x1 de una función específica y actualiza su estado.
 * Reglas:
 * - La película debe tener más de 30 días en cartelera.
 * - La ocupación actual de la sala para la función debe ser menor al 70%.
 * Retorna true si hubo un cambio en el estado de promocionActiva.
 */
export async function evaluarPromocionFuncion(idFuncion: number, connectionOrPool: any = pool): Promise<boolean> {
  // 1. Obtener la función, sala y película asociada
  const [funcionRows] = await connectionOrPool.query(
    `SELECT 
       f.idFuncion, 
       f.idSala, 
       f.idPelicula, 
       f.promocionActiva,
       s.capacidadTotal, 
       p.titulo, 
       p.fechaEstreno
     FROM Funcion f
     JOIN Sala s ON f.idSala = s.idSala
     JOIN Pelicula p ON f.idPelicula = p.idPelicula
     WHERE f.idFuncion = ? AND f.estadoA = 1`,
    [idFuncion]
  );

  if (!funcionRows.length) return false;
  const funcion = funcionRows[0];

  // 2. Obtener el número de boletos vendidos y activos (estadoA = 1) para esta función
  const [boletos] = await connectionOrPool.query(
    `SELECT COUNT(*) as vendidos
     FROM Boleto b
     JOIN Venta v ON b.idVenta = v.idVenta
     WHERE v.idFuncion = ? AND b.estadoA = 1`,
    [idFuncion]
  );

  const vendidos = boletos[0]?.vendidos || 0;
  const capacidad = funcion.capacidadTotal;
  const porcentajeOcupacion = capacidad > 0 ? (vendidos / capacidad) * 100 : 0;

  // 3. Verificar si la película se estrenó hace más de 30 días
  const [dateRows] = await connectionOrPool.query(
    `SELECT ? <= DATE_SUB(CURDATE(), INTERVAL 30 DAY) as masDe30Dias`,
    [funcion.fechaEstreno]
  );
  const masDe30Dias = dateRows[0]?.masDe30Dias === 1;

  // 4. Evaluar condiciones
  const cumpleCondiciones = masDe30Dias && (porcentajeOcupacion < 70);
  const nuevoEstado = cumpleCondiciones ? 1 : 0;

  // 5. Si el estado cambia, actualizar la base de datos
  if (funcion.promocionActiva !== nuevoEstado) {
    await connectionOrPool.query(
      'UPDATE Funcion SET promocionActiva = ?, usuarioA = 1, fechaA = CURDATE() WHERE idFuncion = ?',
      [nuevoEstado, idFuncion]
    );
    console.log(`  [PROMO ${nuevoEstado === 1 ? 'ACTIVADA' : 'DESACTIVADA'}] Función ID ${idFuncion} ("${funcion.titulo}"): cambió a ${nuevoEstado === 1 ? '2x1 activo' : '2x1 inactivo'} (Ocupación: ${porcentajeOcupacion.toFixed(2)}%, >30 días: ${masDe30Dias}).`);
    return true;
  }
  
  return false;
}

export async function runPromoSchedulerJob(): Promise<void> {
  console.log("Iniciando verificación automática de promociones 2x1 (HU-11)...");

  try {
    // Obtener todas las funciones activas del día actual o futuras para evaluar
    const query = `
      SELECT f.idFuncion, p.titulo
      FROM Funcion f
      JOIN Pelicula p ON f.idPelicula = p.idPelicula
      WHERE f.estadoA = 1 
        AND f.fecha >= CURDATE()
    `;

    const [funciones] = await pool.query<any[]>(query);
    console.log(`Se encontraron ${funciones.length} funciones activas para evaluar.`);

    let actualizadas = 0;
    for (const funcion of funciones) {
      const cambio = await evaluarPromocionFuncion(funcion.idFuncion, pool);
      if (cambio) {
        actualizadas++;
      }
    }

    console.log(`Verificación automática de promociones 2x1 finalizada exitosamente. ${actualizadas} funciones actualizadas.`);
  } catch (error) {
    console.error("Error en la ejecución del Job de Promociones 2x1:", error);
    throw error;
  }
}
