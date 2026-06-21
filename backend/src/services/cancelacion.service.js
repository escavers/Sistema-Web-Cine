const pool = require('../config/db');

const procesarCancelacion = async ({ idVenta, usuarioA }) => {
  if (!idVenta) {
    const error = new Error('Se requiere idVenta para cancelar');
    error.status = 400;
    throw error;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [ventaRows] = await connection.execute(
      `SELECT v.idVenta, MIN(CONCAT(f.fecha, ' ', f.horaInicio)) AS fechaHoraFuncion
       FROM Venta v
       JOIN Boleto b ON v.idVenta = b.idVenta
       JOIN Funcion f ON b.idFuncion = f.idFuncion
       WHERE v.idVenta = ?
       GROUP BY v.idVenta`,
      [idVenta]
    );

    if (!ventaRows.length) {
      const error = new Error('Venta no encontrada o no tiene boletos asociados');
      error.status = 404;
      throw error;
    }

    const fechaHoraFuncion = new Date(ventaRows[0].fechaHoraFuncion);
    const ahora = new Date();
    const diferenciaMs = fechaHoraFuncion - ahora;
    const diferenciaHoras = diferenciaMs / (1000 * 60 * 60);

    if (diferenciaHoras < 24) {
      const error = new Error('No es posible cancelar con menos de 24 horas de anticipación');
      error.status = 400;
      throw error;
    }

    const [boletosRows] = await connection.execute(
      'SELECT idAsiento FROM Boleto WHERE idVenta = ?',
      [idVenta]
    );

    if (!boletosRows.length) {
      const error = new Error('No se encontraron boletos para esta venta');
      error.status = 404;
      throw error;
    }

    await connection.execute(
      `INSERT INTO Cancelacion
        (idVenta, fechaHora, estado, estadoA, fechaA, usuarioA)
      VALUES (?, NOW(), 'APROBADA', 1, NOW(), ?)`,
      [idVenta, usuarioA]
    );

    const asientoPromises = boletosRows.map(({ idAsiento }) =>
      connection.execute(
        'UPDATE Asiento SET estado = 1, usuarioA = ? WHERE idAsiento = ?',
        [usuarioA, idAsiento]
      )
    );

    await Promise.all(asientoPromises);

    await connection.commit();

    return {
      idVenta,
      asientosLiberados: boletosRows.map((row) => row.idAsiento),
      fechaHoraFuncion: fechaHoraFuncion.toISOString(),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  procesarCancelacion,
};
