import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { z } from 'zod';
import { fail, ok } from '../utils/response.js';
import { createAudit } from '../services/audit.service.js';

const crearPeliculaSchema = z.object({
  titulo: z.string().min(1, 'El título es obligatorio.'),
  director: z.string().min(1, 'El director es obligatorio').regex(/^[a-zA-ZáéíóúñÑ\s.'-]+$/, 'Solo letras permitidas'),
  sinopsis: z.string().nullable().optional(),
  posterUrl: z.string().nullable().optional(),
  duracionMinutos: z.number().min(1, 'Duración mínima 1 minuto').max(600, 'Duración máxima 600 minutos'),
  clasificacionEdad: z.string().optional().default('TP'),
  fechaEstreno: z.string().nullable().optional().refine(
    (val) => {
      if (!val) return true;
      const date = new Date(val);
      const minDate = new Date('2020-01-01');
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      return date >= minDate && date <= maxDate;
    },
    'La fecha debe estar entre 2020-01-01 y un año en el futuro'
  ),
});

const actualizarPeliculaSchema = crearPeliculaSchema.partial();

export async function listarPeliculas(_req: Request, res: Response) {
  const [rows] = await pool.query(
    `SELECT * FROM Pelicula WHERE estadoA = 1 ORDER BY fechaEstreno DESC`
  );
  return ok(res, { peliculas: rows });
}

export async function crearPelicula(req: Request, res: Response) {
  try {
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
  } catch (error) {
    return fail(res, 'Error al crear la película.', 500);
  }
}

export async function actualizarPelicula(req: Request, res: Response) {
  try {
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
  } catch (error) {
    return fail(res, 'Error al actualizar la película.', 500);
  }
}

export async function eliminarPelicula(req: Request, res: Response) {
  const id = Number(req.params.id);
  const actor = req.user!;

  if (isNaN(id)) {
    return fail(res, 'ID de película inválido.', 400);
  }

  const [funciones] = await pool.query<any[]>(
    'SELECT COUNT(*) as total FROM Funcion WHERE idPelicula = ? AND estadoA = 1',
    [id]
  );

  if (funciones[0]?.total > 0) {
    return fail(res, 'No se puede eliminar la película porque está asociada a funciones activas.', 400);
  }

  await pool.query('UPDATE Pelicula SET estadoA = 0, fechaA = CURDATE(), usuarioA = ? WHERE idPelicula = ?', [actor.idUsuario, id]);

  await createAudit({ tablaNombre: 'Pelicula', registroId: id, accion: 'PELICULA_ELIMINADA', usuarioA: actor.idUsuario, req });

  return ok(res, { mensaje: 'Película eliminada correctamente.' });
}
