import type { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { createAudit } from '../services/audit.service.js';
import { generarContrasenaTemporal, hashPassword } from '../utils/password.js';
import { fail, ok } from '../utils/response.js';

const rolSchema = z.enum(['ADMINISTRADOR', 'BOLETERIA', 'CLIENTE', 'ACCESO']);

const crearUsuarioSchema = z.object({
  nombre1: z.string().min(1),
  nombre2: z.string().optional().nullable(),
  apellidoP: z.string().min(1),
  apellidoM: z.string().optional().nullable(),
  ci: z.string().min(1),
  correo: z.string().email(),
  telefono: z.string().optional().nullable(),
  fechaNacimiento: z.string().optional().nullable(),
  contrasena: z.string().optional().nullable(),
  idRol: z.array(rolSchema).min(1).max(1),
  nit: z.string().optional().nullable(),
  razonSocial: z.string().optional().nullable()
});

const actualizarUsuarioSchema = z.object({
  nombre1: z.string().min(1).optional(),
  nombre2: z.string().optional().nullable(),
  apellidoP: z.string().min(1).optional(),
  apellidoM: z.string().optional().nullable(),
  ci: z.string().min(1).optional().nullable(),
  correo: z.string().email().optional(),
  telefono: z.string().optional().nullable(),
  fechaNacimiento: z.string().optional().nullable(),
  nit: z.string().optional().nullable(),
  razonSocial: z.string().optional().nullable(),
  estado: z.boolean().optional(),
  idRol: z.array(rolSchema).min(1).max(1).optional()
});

export async function listarUsuarios(_req: Request, res: Response) {
  const [rows] = await pool.query(
    `
    SELECT
      u.idUsuario,
      u.nombre1,
      u.nombre2,
      u.apellidoP,
      u.apellidoM,
      u.ci,
      u.correo,
      u.telefono,
      u.fechaNacimiento,
      u.nit,
      u.razonSocial,
      u.estado,
      u.estadoA,
      u.fechaA,
      u.usuarioA,
      GROUP_CONCAT(ur.idRol) AS idRol
    FROM Usuario u
    LEFT JOIN Usuario_Rol ur ON u.idUsuario = ur.idUsuario
    WHERE u.estadoA = TRUE
    GROUP BY u.idUsuario
    ORDER BY u.idUsuario DESC
    `
  );

  const usuarios = (rows as any[]).map(u => ({
    ...u,
    idRol: u.idRol ? u.idRol.split(',') : []
  }));

  return ok(res, { usuarios });
}

export async function crearUsuario(req: Request, res: Response) {
  const parsed = crearUsuarioSchema.safeParse(req.body);

  if (!parsed.success) {
    return fail(res, 'Revise los datos del formulario.', 400, { errores: parsed.error.flatten() });
  }

  const data = parsed.data;
  const actor = req.user!;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const contrasenaTemporal =
      data.contrasena && data.contrasena.trim() !== ''
        ? data.contrasena.trim()
        : generarContrasenaTemporal(
            data.ci,
            data.apellidoP,
            data.apellidoM || ''
          );

    const hashedPassword = await hashPassword(contrasenaTemporal);
    const rolSeleccionado = data.idRol[0];

    const [result] = await connection.query<any>(
      `
      INSERT INTO Usuario
      (
        nombre1,
        nombre2,
        apellidoP,
        apellidoM,
        ci,
        correo,
        telefono,
        fechaNacimiento,
        contrasena,
        nit,
        razonSocial,
        estado,
        estadoA,
        fechaA,
        usuarioA
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE, CURDATE(), ?)
      `,
      [
        data.nombre1,
        data.nombre2 ?? null,
        data.apellidoP,
        data.apellidoM ?? null,
        data.ci,
        data.correo,
        data.telefono ?? null,
        data.fechaNacimiento ?? null,
        hashedPassword,
        data.nit ?? null,
        data.razonSocial ?? null,
        actor.idUsuario
      ]
    );

    const idUsuario = result.insertId as number;

    await connection.query(
      `INSERT INTO Usuario_Rol (idUsuario, idRol) VALUES (?, ?)`,
      [idUsuario, rolSeleccionado]
    );

    await connection.commit();

    await createAudit({
      tablaNombre: 'Usuario',
      registroId: idUsuario,
      accion: 'USUARIO_CREADO',
      usuarioA: actor.idUsuario,
      req,
      detalles: `Usuario creado desde administración con rol ${rolSeleccionado}.`
    });

    return ok(
      res,
      {
        mensaje: 'Usuario registrado correctamente.',
        idUsuario,
        contrasenaTemporal
      },
      201
    );
  } catch (error: any) {
    await connection.rollback();

    if (error?.code === 'ER_DUP_ENTRY') {
      return fail(res, 'El correo o CI ya está registrado.', 409);
    }

    if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
      return fail(res, 'Falta el rol seleccionado en la tabla Rol.', 500);
    }

    console.error(error);
    return fail(res, 'No se pudo registrar el usuario.', 500);
  } finally {
    connection.release();
  }
}

export async function actualizarUsuario(req: Request, res: Response) {
  const idUsuario = Number(req.params.id);
  const parsed = actualizarUsuarioSchema.safeParse(req.body);

  if (Number.isNaN(idUsuario) || !parsed.success) {
    return fail(res, 'Datos inválidos.', 400);
  }

  const data = parsed.data;
  const actor = req.user!;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [actualRows] = await connection.query<any[]>(
      `SELECT * FROM Usuario WHERE idUsuario = ? LIMIT 1`,
      [idUsuario]
    );

    const actual = actualRows[0];

    if (!actual) {
      await connection.rollback();
      return fail(res, 'Usuario no encontrado.', 404);
    }

    const [rolActualRows] = await connection.query<any[]>(
      `SELECT idRol FROM Usuario_Rol WHERE idUsuario = ? LIMIT 1`,
      [idUsuario]
    );

    const rolAnterior = rolActualRows[0]?.idRol ?? null;

    const camposPermitidos = [
      'nombre1',
      'nombre2',
      'apellidoP',
      'apellidoM',
      'ci',
      'correo',
      'telefono',
      'fechaNacimiento',
      'nit',
      'razonSocial',
      'estado'
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const campo of camposPermitidos) {
      if (Object.prototype.hasOwnProperty.call(data, campo)) {
        updates.push(`${campo} = ?`);
        values.push((data as any)[campo]);
      }
    }

    if (updates.length > 0) {
      updates.push('fechaA = CURDATE()');
      updates.push('usuarioA = ?');
      values.push(actor.idUsuario);
      values.push(idUsuario);

      await connection.query(
        `UPDATE Usuario SET ${updates.join(', ')} WHERE idUsuario = ?`,
        values
      );
    }

    if (data.idRol && data.idRol.length > 0) {
      const rolSeleccionado = data.idRol[0];

      await connection.query(
        `DELETE FROM Usuario_Rol WHERE idUsuario = ?`,
        [idUsuario]
      );

      await connection.query(
        `INSERT INTO Usuario_Rol (idUsuario, idRol) VALUES (?, ?)`,
        [idUsuario, rolSeleccionado]
      );
    }

    if (updates.length === 0 && !data.idRol) {
      await connection.rollback();
      return fail(res, 'No hay campos para actualizar.', 400);
    }

    await connection.commit();

    for (const campo of camposPermitidos) {
      if (Object.prototype.hasOwnProperty.call(data, campo)) {
        await createAudit({
          tablaNombre: 'Usuario',
          registroId: idUsuario,
          accion: 'USUARIO_MODIFICADO',
          campo,
          valorAnterior: actual[campo],
          valorNuevo: (data as any)[campo],
          usuarioA: actor.idUsuario,
          req,
          detalles: `Campo ${campo} actualizado desde administración.`
        });
      }
    }

    if (data.idRol && data.idRol[0] !== rolAnterior) {
      await createAudit({
        tablaNombre: 'Usuario_Rol',
        registroId: idUsuario,
        accion: 'ROL_USUARIO_MODIFICADO',
        campo: 'idRol',
        valorAnterior: rolAnterior,
        valorNuevo: data.idRol[0],
        usuarioA: actor.idUsuario,
        req,
        detalles: 'Rol de usuario actualizado desde administración.'
      });
    }

    return ok(res, { mensaje: 'Usuario actualizado correctamente.' });
  } catch (error: any) {
    await connection.rollback();

    if (error?.code === 'ER_DUP_ENTRY') {
      return fail(res, 'El correo o CI ya está registrado.', 409);
    }

    if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
      return fail(res, 'El rol seleccionado no existe.', 500);
    }

    console.error(error);
    return fail(res, 'No se pudo actualizar el usuario.', 500);
  } finally {
    connection.release();
  }
}

export async function darBajaUsuario(req: Request, res: Response) {
  const idUsuario = Number(req.params.id);
  const actor = req.user!;

  if (Number.isNaN(idUsuario)) {
    return fail(res, 'ID inválido.', 400);
  }

  const [actualRows] = await pool.query<any[]>(
    `SELECT estadoA FROM Usuario WHERE idUsuario = ? LIMIT 1`,
    [idUsuario]
  );

  if (!actualRows[0]) return fail(res, 'Usuario no encontrado.', 404);

  await pool.query(
    `
    UPDATE Usuario
    SET estadoA = FALSE, fechaA = CURDATE(), usuarioA = ?
    WHERE idUsuario = ?
    `,
    [actor.idUsuario, idUsuario]
  );

  await createAudit({
    tablaNombre: 'Usuario',
    registroId: idUsuario,
    accion: 'USUARIO_DADO_BAJA',
    campo: 'estadoA',
    valorAnterior: actualRows[0].estadoA,
    valorNuevo: false,
    usuarioA: actor.idUsuario,
    req,
    detalles: 'Baja lógica de usuario. No se elimina físicamente para conservar historial.'
  });

  return ok(res, { mensaje: 'Usuario dado de baja correctamente.' });
}