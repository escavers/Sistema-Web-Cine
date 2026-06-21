const pool = require('../config/db');

const obtenerComprobantePorNumero = async (numero) => {
  if (!numero) {
    const error = new Error('Número de comprobante requerido');
    error.status = 400;
    throw error;
  }

  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT
        c.idComprobante,
        c.numero,
        c.fechaEmision,
        c.nitCliente,
        c.razonSocialCliente,
        v.idVenta,
        v.fechaCompra,
        v.tipo AS canal,
        v.montoTotal,
        p.metodoPago,
        p.codigoTransaccion,
        f.idFuncion,
        f.fecha,
        f.horaInicio,
        f.idSala,
        s.tipo AS salaTipo,
        pel.titulo AS peliculaTitulo,
        GROUP_CONCAT(CONCAT(a.fila, a.columna) ORDER BY a.fila, a.columna SEPARATOR ', ') AS asientos
      FROM Comprobante c
      JOIN Venta v ON c.idVenta = v.idVenta
      LEFT JOIN Pago p ON v.idVenta = p.idVenta
      LEFT JOIN Boleto b ON v.idVenta = b.idVenta
      LEFT JOIN Asiento a ON b.idAsiento = a.idAsiento
      LEFT JOIN Funcion f ON b.idFuncion = f.idFuncion
      LEFT JOIN Sala s ON f.idSala = s.idSala
      LEFT JOIN Pelicula pel ON f.idPelicula = pel.idPelicula
      WHERE c.numero = ?
      GROUP BY c.idComprobante,
        c.numero,
        c.fechaEmision,
        c.nitCliente,
        c.razonSocialCliente,
        v.idVenta,
        v.fechaCompra,
        v.tipo,
        v.montoTotal,
        p.metodoPago,
        p.codigoTransaccion,
        f.idFuncion,
        f.fecha,
        f.horaInicio,
        f.idSala,
        s.tipo,
        pel.titulo`,
      [numero]
    );

    if (!rows.length) {
      const error = new Error(`Comprobante no encontrado: ${numero}`);
      error.status = 404;
      throw error;
    }

    return rows[0];
  } finally {
    connection.release();
  }
};

module.exports = {
  obtenerComprobantePorNumero,
};
