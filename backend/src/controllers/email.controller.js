const EmailService = require('../services/email.service');
const pool = require('../config/db');

const enviarComprobanteEmail = async (req, res, next) => {
  try {
    const { idVenta, email } = req.body;

    console.log('📧 [EMAIL CONTROLLER] Recibido request:', { idVenta, email });

    if (!idVenta || !email) {
      console.error('❌ [EMAIL CONTROLLER] Falta idVenta o email');
      return res.status(400).json({ message: 'idVenta y email requeridos' });
    }

    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT
          c.numero,
          c.nitCliente,
          c.razonSocialCliente,
          v.montoTotal,
          v.fechaCompra,
          p.metodoPago,
          f.fecha,
          f.horaInicio,
          f.idSala,
          s.tipo AS salaTipo,
          pel.titulo AS peliculaTitulo,
          GROUP_CONCAT(CONCAT(a.fila, a.columna) ORDER BY a.fila, a.columna SEPARATOR ', ') AS asientos
        FROM Venta v
        LEFT JOIN Comprobante c ON v.idVenta = c.idVenta
        LEFT JOIN Pago p ON v.idVenta = p.idVenta
        LEFT JOIN Boleto b ON v.idVenta = b.idVenta
        LEFT JOIN Asiento a ON b.idAsiento = a.idAsiento
        LEFT JOIN Funcion f ON b.idFuncion = f.idFuncion
        LEFT JOIN Sala s ON f.idSala = s.idSala
        LEFT JOIN Pelicula pel ON f.idPelicula = pel.idPelicula
        WHERE v.idVenta = ?
        GROUP BY v.idVenta, c.numero, c.nitCliente, c.razonSocialCliente, v.montoTotal, v.fechaCompra, p.metodoPago, f.fecha, f.horaInicio, f.idSala, s.tipo, pel.titulo`,
        [idVenta]
      );

      if (!rows.length) {
        console.error(`❌ [EMAIL CONTROLLER] Venta ${idVenta} no encontrada`);
        return res.status(404).json({ message: 'Venta no encontrada' });
      }

      const comprobante = rows[0];
      console.log('✅ [EMAIL CONTROLLER] Datos de comprobante obtenidos:', comprobante);
      
      const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?comprobante=${encodeURIComponent(comprobante.numero)}`;

      const resultado = await EmailService.enviarComprobanteEmail({
        email,
        comprobante,
        numeroQR: qrUrl,
      });

      console.log('✅ [EMAIL CONTROLLER] Resultado de envío:', resultado);

      res.status(200).json({
        message: resultado.enviado ? 'Email enviado correctamente' : 'No se pudo enviar el email',
        ...resultado,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  enviarComprobanteEmail,
};
