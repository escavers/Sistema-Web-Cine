import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { ok, fail } from '../utils/response.js';

export async function reporteOcupacion(req: Request, res: Response) {
  const { fechaInicio, fechaFin } = req.query;

  let where = 'WHERE f.estadoA = 1';
  const params: any[] = [];

  if (fechaInicio) { where += ' AND f.fecha >= ?'; params.push(fechaInicio); }
  if (fechaFin) { where += ' AND f.fecha <= ?'; params.push(fechaFin); }

  const [rows] = await pool.query(
    `SELECT
       f.fecha,
       f.idSala,
       s.tipo AS salaTipo,
       p.titulo AS pelicula,
       f.horaInicio,
       s.capacidadTotal,
       COUNT(b.idBoleto) AS boletosVendidos,
       ROUND(COUNT(b.idBoleto) / s.capacidadTotal * 100, 1) AS ocupacionPorcentaje
     FROM Funcion f
     JOIN Sala s ON f.idSala = s.idSala
     JOIN Pelicula p ON f.idPelicula = p.idPelicula
     LEFT JOIN Boleto b ON f.idFuncion = b.idFuncion AND b.estadoA = 1
     ${where}
     GROUP BY f.idFuncion, f.fecha, f.idSala, s.tipo, p.titulo, f.horaInicio, s.capacidadTotal
     ORDER BY f.fecha DESC, f.horaInicio`,
    params
  );

  return ok(res, { reporte: rows });
}

export async function reporteMasVistas(req: Request, res: Response) {
  const { fechaInicio, fechaFin } = req.query;

  let where = 'WHERE f.estadoA = 1 AND b.estadoA = 1';
  const params: any[] = [];

  if (fechaInicio) { where += ' AND f.fecha >= ?'; params.push(fechaInicio); }
  if (fechaFin) { where += ' AND f.fecha <= ?'; params.push(fechaFin); }

  const [rows] = await pool.query(
    `SELECT
       p.titulo AS pelicula,
       p.director,
       COUNT(b.idBoleto) AS totalBoletosVendidos,
       ROUND(SUM(b.precioPagado), 2) AS ingresoTotal
     FROM Boleto b
     JOIN Funcion f ON b.idFuncion = f.idFuncion
     JOIN Pelicula p ON f.idPelicula = p.idPelicula
     ${where}
     GROUP BY p.idPelicula, p.titulo, p.director
     ORDER BY totalBoletosVendidos DESC
     LIMIT 10`,
    params
  );

  return ok(res, { reporte: rows });
}

export async function reporteVentas(req: Request, res: Response) {
  const { fechaInicio, fechaFin } = req.query;

  let where = 'WHERE v.estadoA = 1';
  const params: any[] = [];

  if (fechaInicio) { where += ' AND DATE(v.fechaCompra) >= ?'; params.push(fechaInicio); }
  if (fechaFin) { where += ' AND DATE(v.fechaCompra) <= ?'; params.push(fechaFin); }

  const [rows] = await pool.query(
    `SELECT
       DATE(v.fechaCompra) AS fecha,
       v.tipo AS canal,
       COUNT(v.idVenta) AS totalVentas,
       SUM(v.montoTotal) AS ingresoTotal,
       ROUND(AVG(v.montoTotal), 2) AS ventaPromedio
     FROM Venta v
     ${where}
       AND v.estado = 'COMPLETADA'
     GROUP BY DATE(v.fechaCompra), v.tipo
     ORDER BY fecha DESC`,
    params
  );

  return ok(res, { reporte: rows });
}

export async function historialCliente(req: Request, res: Response) {
  const idCliente = Number(req.params.idCliente);
  const usuario = req.user;

  if (!usuario) {
    return fail(res, 'Debe iniciar sesión para continuar.', 401);
  }

  if (usuario.idRol === 'CLIENTE' && usuario.idUsuario !== idCliente) {
    return fail(res, 'No puede acceder al historial de otro cliente.', 403);
  }

  const [rows] = await pool.query(
    `SELECT
       v.idVenta,
       c.numero,
       p.titulo AS peliculaTitulo,
       f.fecha,
       f.horaInicio,
       s.tipo AS salaTipo,
       GROUP_CONCAT(CONCAT(a.fila, a.columna) ORDER BY a.fila, a.columna SEPARATOR ', ') AS asientos,
       v.montoTotal,
       v.estado
     FROM Comprobante c
     JOIN Venta v ON c.idVenta = v.idVenta
     JOIN Boleto b ON v.idVenta = b.idVenta
     JOIN Funcion f ON b.idFuncion = f.idFuncion
     JOIN Pelicula p ON f.idPelicula = p.idPelicula
     JOIN Sala s ON f.idSala = s.idSala
     JOIN Asiento a ON b.idAsiento = a.idAsiento
     WHERE v.idCliente = ? AND v.estadoA = 1 AND v.estado = 'COMPLETADA'
     GROUP BY c.idComprobante, c.numero, p.titulo, f.fecha, f.horaInicio, s.tipo, v.montoTotal, v.estado, v.idVenta
     ORDER BY f.fecha DESC, f.horaInicio DESC`,
    [idCliente]
  );

  return ok(res, { historial: rows });
}
