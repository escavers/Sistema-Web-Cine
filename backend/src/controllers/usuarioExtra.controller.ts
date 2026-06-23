import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { fail, ok } from '../utils/response.js';

export async function obtenerEmail(req: Request, res: Response) {
  const idUsuario = Number(req.params.id);

  if (isNaN(idUsuario)) {
    return fail(res, 'ID inválido.', 400);
  }

  const [rows] = await pool.query<any[]>(
    'SELECT correo FROM Usuario WHERE idUsuario = ? AND estadoA = 1',
    [idUsuario]
  );

  if (!rows.length) {
    return fail(res, 'Usuario no encontrado.', 404);
  }

  return ok(res, { email: rows[0].correo });
}
