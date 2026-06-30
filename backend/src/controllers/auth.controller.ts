import type { Request, Response } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { createAudit } from '../services/audit.service.js';
import { findUserByEmail, publicUser } from '../services/user.service.js';
import { comparePassword, generarContrasenaTemporal, hashPassword } from '../utils/password.js';
import { fail, ok } from '../utils/response.js';

const loginSchema = z.object({
  correo: z.string().email('Ingrese un correo válido.'),
  contrasena: z.string().min(1, 'La contraseña es obligatoria.')
});

const registroClienteSchema = z.object({
  nombre1: z.string().min(1, 'El primer nombre es obligatorio.'),
  nombre2: z.string().optional().nullable(),
  apellidoP: z.string().min(1, 'El apellido paterno es obligatorio.'),
  apellidoM: z.string().optional().nullable(),
  ci: z.string().min(1, 'El CI es obligatorio.'),
  correo: z.string().email('Ingrese un correo válido.'),
  telefono: z.string().optional().nullable(),
  fechaNacimiento: z.string().optional().nullable(),
  contrasena: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .regex(/[A-Z]/, 'La contraseña debe incluir al menos una letra mayúscula.')
    .regex(/[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]]/, 'La contraseña debe incluir al menos un carácter especial.'),
  nit: z.string().optional().nullable(),
  razonSocial: z.string().optional().nullable()
}).superRefine((data, ctx) => {
  if (data.fechaNacimiento) {
    const hoy = new Date();
    const nac = new Date(data.fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--;
    if (edad < 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe tener al menos 12 años para registrarse.',
        path: ['fechaNacimiento']
      });
    }
  }
});

const registroPresencialSchema = z.object({
  nombre1: z.string().min(1, 'El primer nombre es obligatorio.'),
  nombre2: z.string().optional().nullable(),
  apellidoP: z.string().min(1, 'El apellido paterno es obligatorio.'),
  apellidoM: z.string().min(1, 'El apellido materno es obligatorio para generar la contraseña temporal.'),
  ci: z.string().min(3, 'El CI es obligatorio.'),
  correo: z.string().email('Ingrese un correo válido.'),
  telefono: z.string().optional().nullable(),
  fechaNacimiento: z.string().optional().nullable(),
  nit: z.string().optional().nullable(),
  razonSocial: z.string().optional().nullable()
}).superRefine((data, ctx) => {
  if (data.fechaNacimiento) {
    const hoy = new Date();
    const nac = new Date(data.fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--;
    if (edad < 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe tener al menos 12 años para registrarse.',
        path: ['fechaNacimiento']
      });
    }
  }
});

function buildToken(usuario: { idUsuario: number; idRol: string[]; correo: string }) {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn']
  };

  return jwt.sign(
    {
      idUsuario: usuario.idUsuario,
      idRol: usuario.idRol,
      correo: usuario.correo
    },
    env.jwtSecret,
    options
  );
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    await createAudit({
      tablaNombre: 'Usuario',
      accion: 'LOGIN_FALLIDO_DATOS_INVALIDOS',
      campo: 'correo',
      valorNuevo: req.body?.correo ?? null,
      usuarioA: null,
      req,
      detalles: 'Intento de login con correo inválido o contraseña vacía.'
    });

    return fail(res, 'Ingrese un correo y contraseña válidos.', 400);
  }

  const { correo, contrasena } = parsed.data;
  const usuario = await findUserByEmail(correo);

  if (!usuario) {
    await createAudit({
      tablaNombre: 'Usuario',
      accion: 'LOGIN_FALLIDO_CORREO_NO_REGISTRADO_POSIBLE_TYPO',
      campo: 'correo',
      valorNuevo: correo,
      usuarioA: null,
      req,
      detalles: 'Correo no registrado. Puede ser error de tipeo o intento de acceso inválido.'
    });

    return fail(res, 'Correo o contraseña incorrectos.', 401);
  }

  if (!Boolean(usuario.estado) || !Boolean(usuario.estadoA)) {
    await createAudit({
      tablaNombre: 'Usuario',
      registroId: usuario.idUsuario,
      accion: 'LOGIN_FALLIDO_USUARIO_INACTIVO',
      campo: 'estado',
      valorNuevo: { estado: usuario.estado, estadoA: usuario.estadoA },
      usuarioA: usuario.idUsuario,
      req,
      detalles: 'Usuario inactivo o dado de baja intentó iniciar sesión.'
    });

    return fail(res, 'Su cuenta no se encuentra activa. Contacte con administración.', 403);
  }

  const passwordOk = await comparePassword(contrasena, usuario.contrasena);

  if (!passwordOk) {
    await createAudit({
      tablaNombre: 'Usuario',
      registroId: usuario.idUsuario,
      accion: 'LOGIN_FALLIDO_PASSWORD_INCORRECTA',
      campo: 'contrasena',
      valorAnterior: null,
      valorNuevo: null,
      usuarioA: usuario.idUsuario,
      req,
      detalles: 'Contraseña incorrecta. No se almacena la contraseña ingresada por seguridad.'
    });

    return fail(res, 'Correo o contraseña incorrectos.', 401);
  }

  const token = buildToken(usuario);

  await createAudit({
    tablaNombre: 'Usuario',
    registroId: usuario.idUsuario,
    accion: 'LOGIN_EXITOSO',
    usuarioA: usuario.idUsuario,
    req,
    detalles: `Inicio de sesión exitoso con roles [${usuario.idRol.join(', ')}].`
  });

  return ok(res, {
    mensaje: 'Inicio de sesión correcto.',
    token,
    usuario: publicUser(usuario)
  });
}

export async function me(req: Request, res: Response) {
  if (!req.user) return fail(res, 'Debe iniciar sesión.', 401);

  const usuario = await findUserByEmail(req.user.correo);
  if (!usuario) return fail(res, 'Usuario no encontrado.', 404);

  return ok(res, {
    usuario: publicUser(usuario)
  });
}

export async function registroClienteWeb(req: Request, res: Response) {
  const parsed = registroClienteSchema.safeParse(req.body);

  if (!parsed.success) {
    await createAudit({
      tablaNombre: 'Usuario',
      accion: 'REGISTRO_WEB_FALLIDO_DATOS_INVALIDOS',
      campo: 'formulario',
      valorNuevo: { correo: req.body?.correo ?? null, ci: req.body?.ci ?? null },
      usuarioA: null,
      req,
      detalles: 'Registro web rechazado por datos inválidos.'
    });

    return fail(res, 'Revise los datos del formulario.', 400, { errores: parsed.error.flatten() });
  }

  const data = parsed.data;
  const connection = await pool.getConnection();

  try {
  await connection.beginTransaction();

  const [duplicadoRows] = await connection.query<any[]>(
    `
    SELECT idUsuario, correo, ci
    FROM Usuario
    WHERE estadoA = TRUE
      AND (correo = ? OR ci = ?)
    LIMIT 1
    `,
    [data.correo, data.ci]
  );

  const duplicado = duplicadoRows[0];

  if (duplicado) {
    await connection.rollback();

    if (duplicado.correo === data.correo) {
      return fail(res, 'El correo ya está registrado.', 409);
    }

    if (duplicado.ci === data.ci) {
      return fail(res, 'El CI ya está registrado.', 409);
    }

    return fail(res, 'Ya existe una cuenta con esos datos.', 409);
  }

  const hashedPassword = await hashPassword(data.contrasena);
    const [resultUsuario] = await connection.query<any>(
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE, CURDATE(), NULL)
      `,
      [
        data.nombre1,
        data.nombre2 ?? null,
        data.apellidoP,
        data.apellidoM ?? null,
        data.ci ,
        data.correo,
        data.telefono ?? null,
        data.fechaNacimiento ?? null,
        hashedPassword,
        data.nit ?? null,
        data.razonSocial ?? null
      ]
    );

    const idUsuario = resultUsuario.insertId as number;

    await connection.query(
      `INSERT INTO Usuario_Rol (idUsuario, idRol) VALUES (?, 'CLIENTE')`,
      [idUsuario]
    );

    await connection.commit();

    await createAudit({
      tablaNombre: 'Usuario',
      registroId: idUsuario,
      accion: 'REGISTRO_WEB_CLIENTE',
      usuarioA: idUsuario,
      req,
      detalles: 'Cliente creó su cuenta desde el portal web.'
    });

    return ok(res, {
      mensaje: 'Cuenta creada correctamente. Ya puede iniciar sesión.'
    }, 201);
  } catch (error: any) {
    await connection.rollback();

    if (error?.code === 'ER_DUP_ENTRY') {
      await createAudit({
        tablaNombre: 'Usuario',
        accion: 'REGISTRO_WEB_FALLIDO_DUPLICADO',
        campo: 'correo_ci',
        valorNuevo: { correo: data.correo, ci: data.ci ?? null },
        usuarioA: null,
        req,
        detalles: 'Intento de registro web con correo o CI ya existente.'
      });

      return fail(res, 'El correo o CI ya está registrado.', 409);
    }

    if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
      return fail(res, 'Falta el rol CLIENTE en la tabla Rol. Ejecute el script SQL de roles mínimos.', 500);
    }

    console.error(error);
    return fail(res, 'No se pudo crear la cuenta. Verifique la conexión y estructura de la base de datos.', 500);
  } finally {
    connection.release();
  }
}

const actualizarPerfilSchema = z.object({
  nombre1: z.string().min(1).optional(),
  nombre2: z.string().optional().nullable(),
  apellidoP: z.string().min(1).optional(),
  apellidoM: z.string().optional().nullable(),
  ci: z.string().min(1).optional(),
  correo: z.string().email().optional(),
  telefono: z.string().optional().nullable(),
  fechaNacimiento: z.string().optional().nullable(),
  nit: z.string().optional().nullable(),
  razonSocial: z.string().optional().nullable(),
  contrasenaActual: z.string().optional(),
  contrasenaNueva: z.string().optional()
});

export async function actualizarPerfilPropio(req: Request, res: Response) {
  if (!req.user) return fail(res, 'Debe iniciar sesión.', 401);

  const parsed = actualizarPerfilSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 'Datos inválidos.', 400, { errores: parsed.error.flatten() });
  }

  const data = parsed.data;
  const actor = req.user;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const usuario = await findUserByEmail(actor.correo);
    if (!usuario) {
      await connection.rollback();
      return fail(res, 'Usuario no encontrado.', 404);
    }

    if (data.contrasenaNueva) {
      if (!data.contrasenaActual) {
        await connection.rollback();
        return fail(res, 'Debe ingresar su contraseña actual para cambiarla.', 400);
      }
      const passwordOk = await comparePassword(data.contrasenaActual, usuario.contrasena);
      if (!passwordOk) {
        await connection.rollback();
        return fail(res, 'La contraseña actual es incorrecta.', 400);
      }
      if (data.contrasenaNueva.length < 8) {
        await connection.rollback();
        return fail(res, 'La nueva contraseña debe tener al menos 8 caracteres.', 400);
      }
      if (!/[A-Z]/.test(data.contrasenaNueva)) {
        await connection.rollback();
        return fail(res, 'La nueva contraseña debe incluir al menos una mayúscula.', 400);
      }
      if (!/[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]]/.test(data.contrasenaNueva)) {
        await connection.rollback();
        return fail(res, 'La nueva contraseña debe incluir al menos un carácter especial.', 400);
      }
      const hashed = await hashPassword(data.contrasenaNueva);
      await connection.query('UPDATE Usuario SET contrasena = ? WHERE idUsuario = ?', [hashed, usuario.idUsuario]);
    }

    if (data.correo && data.correo !== usuario.correo) {
      const [dup] = await connection.query<any[]>(
        'SELECT idUsuario FROM Usuario WHERE correo = ? AND idUsuario != ? AND estadoA = 1 LIMIT 1',
        [data.correo, usuario.idUsuario]
      );
      if (dup.length > 0) {
        await connection.rollback();
        return fail(res, 'El correo ya está en uso.', 409);
      }
    }

    if (data.ci && data.ci !== usuario.ci) {
      const [dup] = await connection.query<any[]>(
        'SELECT idUsuario FROM Usuario WHERE ci = ? AND idUsuario != ? AND estadoA = 1 LIMIT 1',
        [data.ci, usuario.idUsuario]
      );
      if (dup.length > 0) {
        await connection.rollback();
        return fail(res, 'El CI ya está en uso.', 409);
      }
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (data.nombre1 !== undefined) { fields.push('nombre1 = ?'); values.push(data.nombre1); }
    if (data.nombre2 !== undefined) { fields.push('nombre2 = ?'); values.push(data.nombre2 ?? null); }
    if (data.apellidoP !== undefined) { fields.push('apellidoP = ?'); values.push(data.apellidoP); }
    if (data.apellidoM !== undefined) { fields.push('apellidoM = ?'); values.push(data.apellidoM ?? null); }
    if (data.ci !== undefined) { fields.push('ci = ?'); values.push(data.ci); }
    if (data.correo !== undefined) { fields.push('correo = ?'); values.push(data.correo); }
    if (data.telefono !== undefined) { fields.push('telefono = ?'); values.push(data.telefono ?? null); }
    if (data.fechaNacimiento !== undefined) { fields.push('fechaNacimiento = ?'); values.push(data.fechaNacimiento ?? null); }
    if (data.nit !== undefined) { fields.push('nit = ?'); values.push(data.nit ?? null); }
    if (data.razonSocial !== undefined) { fields.push('razonSocial = ?'); values.push(data.razonSocial ?? null); }

    if (fields.length > 0) {
      fields.push('fechaA = CURDATE()');
      values.push(usuario.idUsuario);
      await connection.query(`UPDATE Usuario SET ${fields.join(', ')} WHERE idUsuario = ?`, values);
    }

    await connection.commit();

    const updatedUser = await findUserByEmail(data.correo ?? actor.correo);

    await createAudit({
      tablaNombre: 'Usuario',
      registroId: usuario.idUsuario,
      accion: 'PERFIL_ACTUALIZADO',
      usuarioA: actor.idUsuario,
      req,
      detalles: 'El cliente actualizó su propio perfil.'
    });

    return ok(res, {
      mensaje: 'Perfil actualizado correctamente.',
      usuario: updatedUser ? publicUser(updatedUser) : null
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return fail(res, 'No se pudo actualizar el perfil.', 500);
  } finally {
    connection.release();
  }
}

export async function registroClientePresencial(req: Request, res: Response) {
  const parsed = registroPresencialSchema.safeParse(req.body);

  if (!parsed.success) {
    await createAudit({
      tablaNombre: 'Usuario',
      accion: 'REGISTRO_BOLETERIA_FALLIDO_DATOS_INVALIDOS',
      campo: 'formulario',
      valorNuevo: { correo: req.body?.correo ?? null, ci: req.body?.ci ?? null },
      usuarioA: req.user?.idUsuario ?? null,
      req,
      detalles: 'Registro presencial rechazado por datos inválidos.'
    });

    return fail(res, 'Revise los datos del formulario.', 400, { errores: parsed.error.flatten() });
  }

  const data = parsed.data;
  const actor = req.user!;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const contrasenaTemporal = generarContrasenaTemporal(data.ci, data.apellidoP, data.apellidoM);
    const hashedPassword = await hashPassword(contrasenaTemporal);

    const [resultUsuario] = await connection.query<any>(
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
        data.apellidoM,
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

    const idUsuario = resultUsuario.insertId as number;

    await connection.query(
      `INSERT INTO Usuario_Rol (idUsuario, idRol) VALUES (?, 'CLIENTE')`,
      [idUsuario]
    );

    await connection.commit();

    await createAudit({
      tablaNombre: 'Usuario',
      registroId: idUsuario,
      accion: 'REGISTRO_BOLETERIA_CLIENTE',
      usuarioA: actor.idUsuario,
      req,
      detalles: 'Cliente registrado presencialmente. La contraseña temporal fue generada con CI e iniciales de apellidos.'
    });

    return ok(res, {
      mensaje: 'Cliente registrado correctamente.',
      cliente: {
        idUsuario,
        correo: data.correo,
        ci: data.ci,
        contrasenaTemporal
      }
    }, 201);
  } catch (error: any) {
    await connection.rollback();

    if (error?.code === 'ER_DUP_ENTRY') {
      await createAudit({
        tablaNombre: 'Usuario',
        accion: 'REGISTRO_BOLETERIA_FALLIDO_DUPLICADO',
        campo: 'correo_ci',
        valorNuevo: { correo: data.correo, ci: data.ci },
        usuarioA: actor.idUsuario,
        req,
        detalles: 'Intento de registro presencial con correo o CI ya existente.'
      });

      return fail(res, 'El correo o CI ya está registrado.', 409);
    }

    if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
      return fail(res, 'Falta el rol CLIENTE en la tabla Rol. Ejecute el script SQL de roles mínimos.', 500);
    }

    console.error(error);
    return fail(res, 'No se pudo registrar el cliente. Verifique la conexión y estructura de la base de datos.', 500);
  } finally {
    connection.release();
  }
}
