import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { z } from 'zod';
import { fail, ok } from '../utils/response.js';
import { createAudit } from '../services/audit.service.js';

const crearSalaSchema = z.object({
  idSala: z.string().min(1),
  tipo: z.string().min(1),
  capacidadTotal: z.number().min(1),
  filas: z.number().min(1),
  columnas: z.number().min(1),
});

export async function listarSalas(_req: Request, res: Response) {
  const [rows] = await pool.query('SELECT * FROM Sala WHERE estadoA = 1 ORDER BY idSala');
  return ok(res, { salas: rows });
}

export async function crearSala(req: Request, res: Response) {
  const parsed = crearSalaSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 'Datos inválidos.', 400, { errores: parsed.error.flatten() });
  }

  const d = parsed.data;
  const actor = req.user!;
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO Sala (idSala, tipo, capacidadTotal, filas, columnas, estadoA, fechaA, usuarioA)
       VALUES (?, ?, ?, ?, ?, 1, CURDATE(), ?)`,
      [d.idSala, d.tipo, d.capacidadTotal, d.filas, d.columnas, actor.idUsuario]
    );

    // Generar asientos automáticamente
    const values: any[][] = [];
    for (let f = 0; f < d.filas; f++) {
      for (let c = 1; c <= d.columnas; c++) {
        values.push([`${d.idSala}-${letras[f]}${c}`, d.idSala, letras[f], c, 1, 1, null, null]);
      }
    }

    for (let i = 0; i < values.length; i += 100) {
      const lote = values.slice(i, i + 100);
      const placeholders = lote.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      await connection.query(
        `INSERT INTO Asiento (idAsiento, idSala, fila, columna, estado, estadoA, fechaA, usuarioA) VALUES ${placeholders}`,
        lote.flat()
      );
    }

    await connection.commit();

    await createAudit({ tablaNombre: 'Sala', registroId: d.idSala, accion: 'SALA_CREADA', usuarioA: actor.idUsuario, req, detalles: `Sala "${d.idSala}" creada con ${d.filas * d.columnas} asientos.` });

    return ok(res, { mensaje: 'Sala creada correctamente.', idSala: d.idSala }, 201);
  } catch (error: any) {
    await connection.rollback();
    if (error?.code === 'ER_DUP_ENTRY') return fail(res, 'Ya existe una sala con ese ID.', 409);
    throw error;
  } finally {
    connection.release();
  }
}

export async function actualizarSala(req: Request, res: Response) {
  const id = req.params.id;
  const { tipo } = req.body;
  const actor = req.user!;

  await pool.query('UPDATE Sala SET tipo = ?, fechaA = CURDATE(), usuarioA = ? WHERE idSala = ?', [tipo, actor.idUsuario, id]);

  await createAudit({ tablaNombre: 'Sala', registroId: id, accion: 'SALA_MODIFICADA', usuarioA: actor.idUsuario, req });

  return ok(res, { mensaje: 'Sala actualizada correctamente.' });
}

export async function eliminarSala(req: Request, res: Response) {
  const id = req.params.id;
  const actor = req.user!;

  await pool.query('UPDATE Sala SET estadoA = 0, fechaA = CURDATE(), usuarioA = ? WHERE idSala = ?', [actor.idUsuario, id]);

  await createAudit({ tablaNombre: 'Sala', registroId: id, accion: 'SALA_ELIMINADA', usuarioA: actor.idUsuario, req });

  return ok(res, { mensaje: 'Sala eliminada correctamente.' });
}
