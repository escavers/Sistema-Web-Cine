const pool = require('../config/db');

const calcularMontoTotal = async (connection, idFuncion, cantidadBoletos) => {
  const [rows] = await connection.execute(
    'SELECT precioBase FROM Funcion WHERE idFuncion = ?',
    [idFuncion]
  );

  if (!rows.length) {
    const error = new Error('Función no encontrada');
    error.status = 404;
    throw error;
  }

  const precioBase = parseFloat(rows[0].precioBase);
  return Number((precioBase * cantidadBoletos).toFixed(2));
};

const procesarVenta = async ({
  idCliente = null,
  idEncargado = null,
  idFuncion,
  tipo = 'ONLINE',
  formaPago,
  asientos,
  nitCliente = null,
  razonSocialCliente = null,
  usuarioA,
  codigoTransaccion = null,
}) => {
  if (!idFuncion || !Array.isArray(asientos) || asientos.length === 0 || !formaPago) {
    const error = new Error('Faltan datos requeridos para procesar la venta');
    error.status = 400;
    throw error;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Validar que el cliente existe si se proporciona idCliente
    if (idCliente) {
      const [clienteRows] = await connection.execute(
        'SELECT idUsuario FROM Cliente WHERE idUsuario = ?',
        [idCliente]
      );
      if (!clienteRows.length) {
        const error = new Error(`Cliente no encontrado: idCliente=${idCliente}`);
        error.status = 404;
        throw error;
      }
    }

    // Validar que el encargado existe si se proporciona idEncargado
    if (idEncargado) {
      const [encargadoRows] = await connection.execute(
        'SELECT idUsuario FROM Usuario WHERE idUsuario = ?',
        [idEncargado]
      );
      if (!encargadoRows.length) {
        const error = new Error(`Encargado no encontrado: idEncargado=${idEncargado}`);
        error.status = 404;
        throw error;
      }
    }

    const montoTotal = await calcularMontoTotal(connection, idFuncion, asientos.length);
    const fechaCompra = new Date();
    const estadoVenta = 'COMPLETADA';

    const [ventaResult] = await connection.execute(
      `INSERT INTO Venta
        (idCliente, idEncargado, idPromocion, fechaCompra, tipo, montoTotal, estado, estadoA, fechaA, usuarioA)
      VALUES (?, ?, NULL, ?, ?, ?, ?, 1, NOW(), ?)`,
      [idCliente, idEncargado, fechaCompra, tipo, montoTotal, estadoVenta, usuarioA]
    );

    const idVenta = ventaResult.insertId;

    const ticketPromises = asientos.map(async (idAsiento) => {
      await connection.execute(
        `INSERT INTO Boleto
          (idFuncion, idAsiento, idVenta, precioPagado, estadoA, fechaA, usuarioA)
        VALUES (?, ?, ?, ?, 1, NOW(), ?)`,
        [idFuncion, idAsiento, idVenta, montoTotal / asientos.length, usuarioA]
      );

      const [seatRows] = await connection.execute(
        'SELECT estado FROM Asiento WHERE idAsiento = ? FOR UPDATE',
        [idAsiento]
      );

      if (!seatRows.length) {
        const error = new Error(`Asiento no encontrado: ${idAsiento}`);
        error.status = 404;
        throw error;
      }

      if (!seatRows[0].estado) {
        const error = new Error(`Asiento ocupado: ${idAsiento}`);
        error.status = 409;
        throw error;
      }

      await connection.execute(
        'UPDATE Asiento SET estado = 0, usuarioA = ? WHERE idAsiento = ?',
        [usuarioA, idAsiento]
      );
    });

    await Promise.all(ticketPromises);

    const codigo = codigoTransaccion || `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fechaPago = new Date();
    const estadoPago = 'APROBADO';

    await connection.execute(
      `INSERT INTO Pago
        (idVenta, fechaPago, montoTotal, metodoPago, estado, codigoTransaccion, estadoA, fechaA, usuarioA)
      VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), ?)`,
      [idVenta, fechaPago, montoTotal, formaPago, estadoPago, codigo, usuarioA]
    );

    const numeroComprobante = `C-${Date.now()}-${idVenta}`;
    const fechaEmision = new Date();

    await connection.execute(
      `INSERT INTO Comprobante
        (idVenta, numero, fechaEmision, nitCliente, razonSocialCliente, estadoA, usuarioA)
      VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [idVenta, numeroComprobante, fechaEmision, nitCliente, razonSocialCliente, usuarioA]
    );

    await connection.commit();

    return {
      idVenta,
      montoTotal,
      numeroComprobante,
      codigoTransaccion: codigo,
      asientos,
      tipo,
      formaPago,
      fechaCompra: fechaCompra.toISOString(),
      metodoPago: formaPago,
      nitCliente,
      razonSocialCliente,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  procesarVenta,
};
