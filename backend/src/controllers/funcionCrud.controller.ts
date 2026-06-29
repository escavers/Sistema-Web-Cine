import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { z } from 'zod';
import { fail, ok } from '../utils/response.js';
import { createAudit } from '../services/audit.service.js';

const crearFuncionSchema = z.object({
  idSala: z.string().min(1),
  idPelicula: z.number().min(1),
  fecha: z.string().min(1),
  horaInicio: z.string().min(1),
  horaFin: z.string().min(1),
  precioBase: z.number().min(0),
});

export async function crearFuncion(req: Request, res: Response) {
  const parsed = crearFuncionSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 'Datos inválidos.', 400, { errores: parsed.error.flatten() });
  }

  const d = parsed.data;
  const actor = req.user!;

  // Validar que no haya conflicto de horario en la misma sala (margen 15 min)
  const [conflictos] = await pool.query<any[]>(
    `SELECT idFuncion, horaInicio, horaFin FROM Funcion
     WHERE idSala = ? AND fecha = ? AND estadoA = 1
     AND NOT (horaFin <= ? OR horaInicio >= ?)`,
    [d.idSala, d.fecha, d.horaInicio, d.horaFin]
  );

  if (conflictos.length > 0) {
    return fail(res, `Conflicto de horario. La sala ya tiene una función entre ${conflictos[0].horaInicio} y ${conflictos[0].horaFin}.`, 409);
  }

  // Validar margen de 15 minutos
  const [margen] = await pool.query<any[]>(
    `SELECT idFuncion, horaInicio, horaFin FROM Funcion
     WHERE idSala = ? AND fecha = ? AND estadoA = 1
     AND (
       ABS(TIMESTAMPDIFF(MINUTE, horaFin, ?)) < 15
       OR ABS(TIMESTAMPDIFF(MINUTE, horaInicio, ?)) < 15
     )`,
    [d.idSala, d.fecha, d.horaInicio, d.horaFin]
  );

  if (margen.length > 0) {
    return fail(res, `Debe haber al menos 15 minutos de diferencia entre funciones en la misma sala.`, 409);
  }

  const [result] = await pool.query<any>(
    `INSERT INTO Funcion (idSala, idPelicula, fecha, horaInicio, horaFin, precioBase, promocionActiva, estadoA, fechaA, usuarioA)
     VALUES (?, ?, ?, ?, ?, ?, 0, 1, CURDATE(), ?)`,
    [d.idSala, d.idPelicula, d.fecha, d.horaInicio, d.horaFin, d.precioBase, actor.idUsuario]
  );

  let promocionActivada = false;
  const [peliculaRows] = await pool.query<any[]>(
    `SELECT fechaEstreno FROM Pelicula WHERE idPelicula = ? AND estadoA = 1`,
    [d.idPelicula]
  );

  if (peliculaRows.length > 0) {
    const fechaEstreno = peliculaRows[0].fechaEstreno;
    if (fechaEstreno) {
      const [checkRows] = await pool.query<any[]>(
        `SELECT ? <= DATE_SUB(CURDATE(), INTERVAL 30 DAY) as elegible`,
        [fechaEstreno instanceof Date ? fechaEstreno.toISOString().split('T')[0] : String(fechaEstreno).split('T')[0]]
      );
      if (checkRows[0]?.elegible === 1) {
        await pool.query(
          'UPDATE Funcion SET promocionActiva = 1, fechaA = CURDATE(), usuarioA = ? WHERE idFuncion = ?',
          [actor.idUsuario, result.insertId]
        );
        promocionActivada = true;
      }
    }
  }

  await createAudit({ tablaNombre: 'Funcion', registroId: result.insertId, accion: 'FUNCION_CREADA', usuarioA: actor.idUsuario, req });

  return ok(res, {
    mensaje: 'Función creada correctamente.',
    idFuncion: result.insertId,
    promocionActivada,
  }, 201);
}

const copiarSemanaSchema = z.object({
  fechaOrigen: z.string().min(1),
  fechaDestino: z.string().min(1),
});

export async function copiarSemanaFunciones(req: Request, res: Response) {
  const parsed = copiarSemanaSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 'Datos inválidos.', 400, { errores: parsed.error.flatten() });
  }

  const { fechaOrigen, fechaDestino } = parsed.data;
  const actor = req.user!;

  const [funcionesOriginales] = await pool.query<any[]>(
    `SELECT idSala, idPelicula, horaInicio, horaFin, precioBase
     FROM Funcion
     WHERE fecha = ? AND estadoA = 1`,
    [fechaOrigen]
  );

  if (funcionesOriginales.length === 0) {
    return fail(res, 'No se encontraron funciones para la fecha de origen.', 404);
  }

  let copiadas = 0;
  let conflictos = 0;

  for (const f of funcionesOriginales) {
    const [conflicto] = await pool.query<any[]>(
      `SELECT idFuncion FROM Funcion
       WHERE idSala = ? AND fecha = ? AND estadoA = 1
       AND NOT (horaFin <= ? OR horaInicio >= ?)`,
      [f.idSala, fechaDestino, f.horaInicio, f.horaFin]
    );

    if (conflicto.length > 0) {
      conflictos++;
      continue;
    }

    const [margen] = await pool.query<any[]>(
      `SELECT idFuncion FROM Funcion
       WHERE idSala = ? AND fecha = ? AND estadoA = 1
       AND (
         ABS(TIMESTAMPDIFF(MINUTE, horaFin, ?)) < 15
         OR ABS(TIMESTAMPDIFF(MINUTE, horaInicio, ?)) < 15
       )`,
      [f.idSala, fechaDestino, f.horaInicio, f.horaFin]
    );

    if (margen.length > 0) {
      conflictos++;
      continue;
    }

    await pool.query(
      `INSERT INTO Funcion (idSala, idPelicula, fecha, horaInicio, horaFin, precioBase, promocionActiva, estadoA, fechaA, usuarioA)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1, CURDATE(), ?)`,
      [f.idSala, f.idPelicula, fechaDestino, f.horaInicio, f.horaFin, f.precioBase, actor.idUsuario]
    );
    copiadas++;
  }

  await createAudit({
    tablaNombre: 'Funcion',
    accion: 'COPIA_SEMANAL',
    usuarioA: actor.idUsuario,
    req,
    detalles: `Copia de ${fechaOrigen} a ${fechaDestino}: ${copiadas} copiadas, ${conflictos} conflictos.`
  });

  return ok(res, {
    mensaje: `Se copiaron ${copiadas} funciones.${conflictos > 0 ? ` ${conflictos} conflictos omitidos.` : ''}`,
    copiadas,
    conflictos,
  });
}

export async function eliminarFuncion(req: Request, res: Response) {
  const id = Number(req.params.id);
  const actor = req.user!;

  // Verificar que no tenga boletos vendidos
  const [boletos] = await pool.query<any[]>(
    `SELECT COUNT(*) as total
     FROM Boleto b
     JOIN Venta v ON b.idVenta = v.idVenta
     WHERE v.idFuncion = ? AND b.estadoA = 1`,
    [id]
  );
  if (boletos[0].total > 0) {
    return fail(res, 'No se puede eliminar una función que ya tiene boletos vendidos.', 400);
  }

  await pool.query('UPDATE Funcion SET estadoA = 0, fechaA = CURDATE(), usuarioA = ? WHERE idFuncion = ?', [actor.idUsuario, id]);

  await createAudit({ tablaNombre: 'Funcion', registroId: id, accion: 'FUNCION_ELIMINADA', usuarioA: actor.idUsuario, req });

  return ok(res, { mensaje: 'Función eliminada correctamente.' });
}
