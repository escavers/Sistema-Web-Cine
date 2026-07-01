import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { z } from 'zod';
import { fail, ok } from '../utils/response.js';
import { createAudit } from '../services/audit.service.js';

const asientoSchema = z.object({
  fila: z.string().min(1),
  numero: z.number().min(1),
  activo: z.boolean(),
});

const crearSalaSchema = z.object({
  idSala: z.string().min(1),
  tipo: z.string().min(1),
  capacidadTotal: z.number().min(1),
  filas: z.number().min(1),
  columnas: z.number().min(1),
  asientos: z.array(asientoSchema).optional(),
});

const actualizarSalaSchema = z.object({
  tipo: z.string().min(1).optional(),
  filas: z.number().min(1).optional(),
  columnas: z.number().min(1).optional(),
  capacidadTotal: z.number().min(0).optional(),
  asientos: z.array(asientoSchema).optional(),
});

export async function listarSalas(_req: Request, res: Response) {
  const [rows] = await pool.query('SELECT * FROM Sala WHERE estadoA = 1 ORDER BY idSala');
  return ok(res, { salas: rows });
}

export async function listarAsientosSala(req: Request<{ id: string }>, res: Response) {
  const idSala = req.params.id;
  const [rows] = await pool.query(
    `SELECT idAsiento, fila, columna, estado
     FROM Asiento
     WHERE idSala = ? AND estadoA = 1
     ORDER BY fila, columna`,
    [idSala]
  );
  return ok(res, { asientos: rows });
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

    const values: any[][] = [];
    for (let f = 0; f < d.filas; f++) {
      for (let c = 1; c <= d.columnas; c++) {
        const activo = d.asientos ? !!d.asientos.find(a => a.fila === letras[f] && a.numero === c && a.activo) : true;
        values.push([`${d.idSala}-${letras[f]}${c}`, d.idSala, letras[f], c, activo ? 1 : 0, 1, null, null]);
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

    await createAudit({ tablaNombre: 'Sala', registroId: d.idSala, accion: 'SALA_CREADA', usuarioA: actor.idUsuario, req, detalles: `Sala "${d.idSala}" creada con ${values.filter(v => v[4] === 1).length} asientos activos.` });

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
  const parsed = actualizarSalaSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 'Datos inválidos.', 400, { errores: parsed.error.flatten() });
  }

  const d = parsed.data;
  const actor = req.user!;

  if (d.tipo || d.filas || d.columnas || typeof d.capacidadTotal !== 'undefined') {
    const updates: string[] = [];
    const params: any[] = [];
    if (d.tipo) {
      updates.push('tipo = ?');
      params.push(d.tipo);
    }
    if (typeof d.capacidadTotal !== 'undefined') {
      updates.push('capacidadTotal = ?');
      params.push(d.capacidadTotal);
    }
    if (d.filas) {
      updates.push('filas = ?');
      params.push(d.filas);
    }
    if (d.columnas) {
      updates.push('columnas = ?');
      params.push(d.columnas);
    }
    updates.push('fechaA = CURDATE()', 'usuarioA = ?');
    params.push(actor.idUsuario, id);
    await pool.query(`UPDATE Sala SET ${updates.join(', ')} WHERE idSala = ?`, params);
  }

  if (d.asientos) {
    const values: any[][] = d.asientos.map(a => [`${id}-${a.fila}${a.numero}`, id, a.fila, a.numero, a.activo ? 1 : 0, 1, null, actor.idUsuario]);
    for (let i = 0; i < values.length; i += 100) {
      const lote = values.slice(i, i + 100);
      const placeholders = lote.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      await pool.query(
        `INSERT INTO Asiento (idAsiento, idSala, fila, columna, estado, estadoA, fechaA, usuarioA)
         VALUES ${placeholders}
         ON DUPLICATE KEY UPDATE estado = VALUES(estado), estadoA = VALUES(estadoA), fechaA = CURDATE(), usuarioA = VALUES(usuarioA)`,
        lote.flat()
      );
    }
  }

  await createAudit({ tablaNombre: 'Sala', registroId: id, accion: 'SALA_MODIFICADA', usuarioA: actor.idUsuario, req });

  return ok(res, { mensaje: 'Sala actualizada correctamente.' });
}

export async function eliminarSala(req: Request, res: Response) {
  const id = req.params.id;
  const actor = req.user!;

  // Verificar si existen funciones activas vinculadas a la sala
  const [funciones] = await pool.query<any[]>(
    `SELECT COUNT(*) as total FROM Funcion WHERE idSala = ? AND estadoA = 1`,
    [id]
  );

  if (funciones[0].total > 0) {
    return fail(res, 'No se puede eliminar la sala porque tiene funciones activas programadas', 400);
  }

  await pool.query('UPDATE Sala SET estadoA = 0, fechaA = CURDATE(), usuarioA = ? WHERE idSala = ?', [actor.idUsuario, id]);

  await createAudit({ tablaNombre: 'Sala', registroId: id, accion: 'SALA_ELIMINADA', usuarioA: actor.idUsuario, req });

  return ok(res, { mensaje: 'Sala eliminada correctamente.' });
}
