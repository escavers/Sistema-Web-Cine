import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { fail, ok } from '../utils/response.js';

export async function listarFunciones(_req: Request, res: Response) {
  const [rows] = await pool.query(
    `SELECT f.idFuncion, f.idSala, s.tipo AS salaTipo, s.capacidadTotal,
            f.idPelicula, f.fecha, f.horaInicio, f.horaFin, f.precioBase, f.promocionActiva,
            p.titulo AS peliculaTitulo, p.director AS peliculaDirector, p.posterUrl AS peliculaPoster,
            p.duracionMinutos AS peliculaDuracion, p.clasificacionEdad AS peliculaClasificacion,
            p.sinopsis AS peliculaSinopsis
     FROM Funcion f
     JOIN Pelicula p ON f.idPelicula = p.idPelicula
     JOIN Sala s ON f.idSala = s.idSala
     WHERE f.estadoA = 1 AND p.estadoA = 1
     ORDER BY f.fecha, f.horaInicio`
  );

  return ok(res, { funciones: rows });
}

export async function obtenerAsientosPorFuncion(req: Request<{ id: string }>, res: Response) {
  const idFuncion = parseInt(req.params.id, 10);

  if (isNaN(idFuncion)) {
    return fail(res, 'ID de función inválido.', 400);
  }

  const [rows] = await pool.query(
    `SELECT
       a.idAsiento,
       a.idSala,
       a.fila,
       a.columna,
       CASE
         WHEN EXISTS(
           SELECT 1 FROM Boleto b
           JOIN Venta v ON b.idVenta = v.idVenta
           WHERE v.idFuncion = f.idFuncion
             AND b.idAsiento = a.idAsiento
             AND b.estadoA = 1
         ) THEN 0
         ELSE a.estado
       END AS estado
     FROM Asiento a
     JOIN Funcion f ON a.idSala = f.idSala
     WHERE f.idFuncion = ?
     ORDER BY a.fila, a.columna`,
    [idFuncion]
  );

  return ok(res, { asientos: rows });
}
