import { pool } from '../config/db.js';

/**
 * Servicio encargado de las promociones automatizadas del cine.
 * Cumple con HU-11: Activa automáticamente 2x1 para películas que:
 * - Tienen más de 30 días en cartelera (fechaEstreno < 30 días atrás).
 * - Su ocupación en la función es menor al 70%.
 */
export async function runPromoSchedulerJob(): Promise<void> {
  console.log("Iniciando verificación automática de promociones 2x1 (HU-11)...");

  try {
    // 1. Obtener todas las funciones activas futuras o del día actual de películas
    // que se estrenaron hace más de 30 días.
    const query = `
      SELECT 
        f.idFuncion, 
        f.idSala, 
        f.idPelicula, 
        s.capacidadTotal, 
        p.titulo, 
        p.fechaEstreno
      FROM Funcion f
      JOIN Sala s ON f.idSala = s.idSala
      JOIN Pelicula p ON f.idPelicula = p.idPelicula
      WHERE f.estadoA = 1 
        AND f.fecha >= CURDATE()
        AND p.fechaEstreno <= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `;

    const [funciones] = await pool.query<any[]>(query);
    console.log(`Se encontraron ${funciones.length} funciones para evaluar.`);

    for (const funcion of funciones) {
      // 2. Obtener el número de boletos vendidos y activos (estadoA = 1) para esta función
      const [boletos] = await pool.query<any[]>(
        'SELECT COUNT(*) as vendidos FROM Boleto WHERE idFuncion = ? AND estadoA = 1',
        [funcion.idFuncion]
      );

      const vendidos = boletos[0]?.vendidos || 0;
      const capacidad = funcion.capacidadTotal;
      const porcentajeOcupacion = capacidad > 0 ? (vendidos / capacidad) * 100 : 0;

      console.log(`Evaluando función ID ${funcion.idFuncion} ("${funcion.titulo}"):`);
      console.log(`  -> Ocupación actual: ${porcentajeOcupacion.toFixed(2)}% (${vendidos}/${capacidad} vendidos).`);

      // 3. Evaluar la condición: Ocupación < 70%
      if (porcentajeOcupacion < 70) {
        // Activar promoción
        const [updateResult] = await pool.query<any>(
          'UPDATE Funcion SET promocionActiva = 1, usuarioA = 1, fechaA = CURDATE() WHERE idFuncion = ?',
          [funcion.idFuncion]
        );

        if (updateResult.affectedRows > 0) {
          console.log(`  [PROMO ACTIVADA 2x1] Se activó la promoción para la función ID ${funcion.idFuncion}.`);
        }
      } else {
        console.log(`  [SIN CAMBIOS] Ocupación es >= 70%. No se aplica promoción.`);
      }
    }

    console.log("Verificación automática de promociones 2x1 finalizada exitosamente.");
  } catch (error) {
    console.error("Error en la ejecución del Job de Promociones 2x1:", error);
    throw error;
  }
}
