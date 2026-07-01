import type { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { createAudit } from '../services/audit.service.js';
import { generarContrasenaTemporal, hashPassword } from '../utils/password.js';
import { fail, ok } from '../utils/response.js';
import {validarNombre, validarCI, validarTelefono, validarCorreo, validarFechaNacimiento} from '../utils/validators.js';

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
  idRol: z.array(rolSchema).min(1).max(1)
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
  estado: z.boolean().optional(),
  idRol: z.array(rolSchema).min(1).max(1).optional(),
  cambiarContrasena: z.boolean().optional(),
  nuevaContrasena: z.string().min(8).optional()
});

// Función para normalizar nombres (capitalizar)
function normalizarNombre(nombre: string): string {
  if (!nombre) return nombre;
  return nombre.trim().toLowerCase().replace(/\b\w/g, letra => letra.toUpperCase());
}

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

    // Normalizar nombres (capitalizar)
    const nombre1 = normalizarNombre(data.nombre1);
    const nombre2 = data.nombre2 ? normalizarNombre(data.nombre2) : null;
    const apellidoP = normalizarNombre(data.apellidoP);
    const apellidoM = data.apellidoM ? normalizarNombre(data.apellidoM) : null;

    // Validaciones
    if (!validarNombre(nombre1))
      return fail(res, 'El primer nombre solo puede contener letras.', 400);

    if (nombre2 && !validarNombre(nombre2))
      return fail(res, 'El segundo nombre solo puede contener letras.', 400);

    if (!validarNombre(apellidoP))
      return fail(res, 'El apellido paterno solo puede contener letras.', 400);

    if (apellidoM && !validarNombre(apellidoM))
      return fail(res, 'El apellido materno solo puede contener letras.', 400);

    // Validar CI (permitir números, guiones y letras)
    if (!validarCI(data.ci))
      return fail(res, 'El CI no es válido.', 400);

    // Validar CI duplicado
    const [ciExistente] = await connection.query<any[]>(
      'SELECT idUsuario FROM Usuario WHERE ci = ?',
      [data.ci]
    );
    if (ciExistente.length > 0) {
      return fail(res, 'El CI ya se encuentra registrado.', 400);
    }

    if (!validarCorreo(data.correo))
      return fail(res, 'El correo electrónico no es válido.', 400);

    // Validar correo duplicado
    const [correoExistente] = await connection.query<any[]>(
      'SELECT idUsuario FROM Usuario WHERE correo = ?',
      [data.correo]
    );
    if (correoExistente.length > 0) {
      return fail(res, 'El correo electrónico ya está registrado.', 400);
    }

    // Validar teléfono
    if (data.telefono) {
      if (!validarTelefono(data.telefono))
        return fail(res, 'El teléfono debe tener 8 dígitos y comenzar con 6 o 7.', 400);

      // Validar teléfono duplicado
      const [telefonoExistente] = await connection.query<any[]>(
        'SELECT idUsuario FROM Usuario WHERE telefono = ?',
        [data.telefono]
      );
      if (telefonoExistente.length > 0) {
        return fail(res, 'El teléfono ya se encuentra registrado.', 400);
      }
    }

    if (data.fechaNacimiento && !validarFechaNacimiento(data.fechaNacimiento))
      return fail(res, 'La fecha de nacimiento no es válida o la persona es menor de 1 año o mayor de 120 años.', 400);

    const contrasenaTemporal = data.contrasena && data.contrasena.trim() !== ''
      ? data.contrasena.trim()
      : generarContrasenaTemporal(data.ci, apellidoP, apellidoM || '');

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
        estado,
        estadoA,
        fechaA,
        usuarioA
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE, CURDATE(), ?)
      `,
      [
        nombre1,
        nombre2,
        apellidoP,
        apellidoM,
        data.ci,
        data.correo,
        data.telefono ?? null,
        data.fechaNacimiento ?? null,
        hashedPassword,
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
      return fail(res, 'El rol seleccionado no existe.', 400);
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

    // Validar que no se esté desactivando a sí mismo
    if (data.estado === false && idUsuario === actor.idUsuario) {
      await connection.rollback();
      return fail(res, 'No puede desactivar su propia cuenta.', 400);
    }

    // Validar CI duplicado solo si cambió
    if (data.ci && data.ci !== actual.ci) {
      if (!validarCI(data.ci)) {
        return fail(res, 'El CI no es válido.', 400);
      }
      const [ciExistente] = await connection.query<any[]>(
        'SELECT idUsuario FROM Usuario WHERE ci = ? AND idUsuario != ?',
        [data.ci, idUsuario]
      );
      if (ciExistente.length > 0) {
        return fail(res, 'El CI ya se encuentra registrado por otro usuario.', 400);
      }
    }

    // Validar correo duplicado solo si cambió
    if (data.correo && data.correo !== actual.correo) {
      if (!validarCorreo(data.correo)) {
        return fail(res, 'El correo electrónico no es válido.', 400);
      }
      const [correoExistente] = await connection.query<any[]>(
        'SELECT idUsuario FROM Usuario WHERE correo = ? AND idUsuario != ?',
        [data.correo, idUsuario]
      );
      if (correoExistente.length > 0) {
        return fail(res, 'El correo electrónico ya está registrado por otro usuario.', 400);
      }
    }

    // Validar teléfono duplicado solo si cambió
    if (data.telefono && data.telefono !== actual.telefono) {
      if (!validarTelefono(data.telefono)) {
        return fail(res, 'El teléfono debe tener 8 dígitos y comenzar con 6 o 7.', 400);
      }
      const [telefonoExistente] = await connection.query<any[]>(
        'SELECT idUsuario FROM Usuario WHERE telefono = ? AND idUsuario != ?',
        [data.telefono, idUsuario]
      );
      if (telefonoExistente.length > 0) {
        return fail(res, 'El teléfono ya se encuentra registrado por otro usuario.', 400);
      }
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
      'estado'
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const campo of camposPermitidos) {
      if (Object.prototype.hasOwnProperty.call(data, campo)) {
        // Normalizar nombres si son campos de texto
        let valor = (data as any)[campo];
        if (['nombre1', 'nombre2', 'apellidoP', 'apellidoM'].includes(campo) && valor) {
          valor = normalizarNombre(valor);
        }
        updates.push(`${campo} = ?`);
        values.push(valor);
      }
    }

    // Manejar cambio de contraseña
    if (data.cambiarContrasena && data.nuevaContrasena) {
      const hashedPassword = await hashPassword(data.nuevaContrasena);
      updates.push('contrasena = ?');
      values.push(hashedPassword);
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

    if (updates.length === 0 && !data.idRol && !data.cambiarContrasena) {
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

    if (data.cambiarContrasena) {
      await createAudit({
        tablaNombre: 'Usuario',
        registroId: idUsuario,
        accion: 'CONTRASENA_CAMBIADA',
        campo: 'contrasena',
        valorAnterior: '[HASH]',
        valorNuevo: '[HASH]',
        usuarioA: actor.idUsuario,
        req,
        detalles: 'Contraseña cambiada desde administración.'
      });
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
      return fail(res, 'El rol seleccionado no existe.', 400);
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

  // No permitir darse de baja a sí mismo
  if (idUsuario === actor.idUsuario) {
    return fail(res, 'No puede dar de baja su propia cuenta.', 400);
  }

  const [actualRows] = await pool.query<any[]>(
    `SELECT nombre1, apellidoP, estadoA FROM Usuario WHERE idUsuario = ? LIMIT 1`,
    [idUsuario]
  );

  if (!actualRows[0]) return fail(res, 'Usuario no encontrado.', 404);

  if (!actualRows[0].estadoA) {
    return fail(res, 'El usuario ya está dado de baja.', 400);
  }

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
    valorAnterior: true,
    valorNuevo: false,
    usuarioA: actor.idUsuario,
    req,
    detalles: `Baja lógica del usuario ${actualRows[0].nombre1} ${actualRows[0].apellidoP}.`
  });

  return ok(res, { 
    mensaje: `El usuario ${actualRows[0].nombre1} ${actualRows[0].apellidoP} fue dado de baja correctamente.` 
  });
}