import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { fail, ok } from '../utils/response.js';

export async function obtenerComprobantePorNumero(req: Request, res: Response) {
  const { numero } = req.params;

  if (!numero) {
    return fail(res, 'Número de comprobante requerido.', 400);
  }

  const [rows] = await pool.query(
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
      f.horaFin,
      f.idSala,
      s.tipo AS salaTipo,
      pel.titulo AS peliculaTitulo,
      pel.posterUrl AS peliculaPoster,
      pel.clasificacionEdad AS peliculaClasificacion,
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
    GROUP BY c.idComprobante, c.numero, c.fechaEmision, c.nitCliente, c.razonSocialCliente,
      v.idVenta, v.fechaCompra, v.tipo, v.montoTotal, p.metodoPago, p.codigoTransaccion,
      f.idFuncion, f.fecha, f.horaInicio, f.horaFin, f.idSala, s.tipo, pel.titulo, pel.posterUrl, pel.clasificacionEdad`,
    [numero]
  );

  if (!(rows as any[]).length) {
    return fail(res, `Comprobante no encontrado: ${numero}`, 404);
  }

  return ok(res, { comprobante: (rows as any[])[0] });
}
