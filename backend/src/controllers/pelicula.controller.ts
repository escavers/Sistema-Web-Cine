import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { z } from 'zod';
import { fail, ok } from '../utils/response.js';
import { createAudit } from '../services/audit.service.js';

const crearPeliculaSchema = z.object({
  titulo: z.string().min(1, 'El título es obligatorio.'),
  director: z.string().nullable().optional(),
  sinopsis: z.string().nullable().optional(),
  posterUrl: z.string().nullable().optional(),
  duracionMinutos: z.number().nullable().optional(),
  clasificacionEdad: z.string().optional().default('TP'),
  fechaEstreno: z.string().nullable().optional(),
});

const actualizarPeliculaSchema = crearPeliculaSchema.partial();

export async function listarPeliculas(_req: Request, res: Response) {
  const [rows] = await pool.query(
    `SELECT * FROM Pelicula WHERE estadoA = 1 ORDER BY fechaEstreno DESC`
  );
  return ok(res, { peliculas: rows });
}

export async function crearPelicula(req: Request, res: Response) {
  const parsed = crearPeliculaSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 'Datos inválidos.', 400, { errores: parsed.error.flatten() });
  }

  const d = parsed.data;
  const actor = req.user!;

  const [result] = await pool.query<any>(
    `INSERT INTO Pelicula (titulo, director, sinopsis, posterUrl, duracionMinutos, clasificacionEdad, fechaEstreno, estadoA, fechaA, usuarioA)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURDATE(), ?)`,
    [d.titulo, d.director ?? null, d.sinopsis ?? null, d.posterUrl ?? null, d.duracionMinutos ?? null, d.clasificacionEdad, d.fechaEstreno ?? null, actor.idUsuario]
  );

  await createAudit({ tablaNombre: 'Pelicula', registroId: result.insertId, accion: 'PELICULA_CREADA', usuarioA: actor.idUsuario, req, detalles: `Película "${d.titulo}" creada.` });

  return ok(res, { mensaje: 'Película creada correctamente.', idPelicula: result.insertId }, 201);
}

export async function actualizarPelicula(req: Request, res: Response) {
  const id = Number(req.params.id);
  const parsed = actualizarPeliculaSchema.safeParse(req.body);
  if (isNaN(id) || !parsed.success) {
    return fail(res, 'Datos inválidos.', 400);
  }

  const data = parsed.data;
  const actor = req.user!;
  const campos = ['titulo', 'director', 'sinopsis', 'posterUrl', 'duracionMinutos', 'clasificacionEdad', 'fechaEstreno'];
  const updates: string[] = [];
  const values: unknown[] = [];

  for (const c of campos) {
    if (Object.prototype.hasOwnProperty.call(data, c)) {
      updates.push(`${c} = ?`);
      values.push((data as any)[c]);
    }
  }

  if (updates.length === 0) return fail(res, 'No hay campos para actualizar.', 400);

  updates.push('fechaA = CURDATE()');
  updates.push('usuarioA = ?');
  values.push(actor.idUsuario);
  values.push(id);

  await pool.query(`UPDATE Pelicula SET ${updates.join(', ')} WHERE idPelicula = ?`, values);

  await createAudit({ tablaNombre: 'Pelicula', registroId: id, accion: 'PELICULA_MODIFICADA', usuarioA: actor.idUsuario, req });

  return ok(res, { mensaje: 'Película actualizada correctamente.' });
}

export async function eliminarPelicula(req: Request, res: Response) {
  const id = Number(req.params.id);
  const actor = req.user!;

  await pool.query('UPDATE Pelicula SET estadoA = 0, fechaA = CURDATE(), usuarioA = ? WHERE idPelicula = ?', [actor.idUsuario, id]);

  await createAudit({ tablaNombre: 'Pelicula', registroId: id, accion: 'PELICULA_ELIMINADA', usuarioA: actor.idUsuario, req });

  return ok(res, { mensaje: 'Película eliminada correctamente.' });
}
