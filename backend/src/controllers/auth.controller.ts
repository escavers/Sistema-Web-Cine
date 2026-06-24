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
  ci: z.string().optional().nullable(),
  correo: z.string().email('Ingrese un correo válido.'),
  telefono: z.string().optional().nullable(),
  fechaNacimiento: z.string().optional().nullable(),
  contrasena: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  nit: z.string().optional().nullable(),
  razonSocial: z.string().optional().nullable()
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
        data.ci ?? null,
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
