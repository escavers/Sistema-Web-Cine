import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { z } from 'zod';
import { fail, ok } from '../utils/response.js';
import { createAudit } from '../services/audit.service.js';
import { sendComprobanteEmailInternal } from './email.controller.js';
import { randomBytes } from 'crypto';

/**
 * Genera un código de acceso aleatorio seguro en formato XXXX-XXXX.
 * Usa el alfabeto sin caracteres ambiguos (0,O,I,1,L) para facilitar la lectura.
 */
function generateAccessCode(): string {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) part1 += CHARS[bytes[i] % CHARS.length];
  for (let i = 4; i < 8; i++) part2 += CHARS[bytes[i] % CHARS.length];
  return `${part1}-${part2}`;
}

const ventaSchema = z.object({
  idCliente: z.number().nullable().optional().default(null),
  idEncargado: z.number().nullable().optional().default(null),
  idFuncion: z.number().min(1, 'Función requerida'),
  tipo: z.enum(['ONLINE', 'PRESENCIAL']).default('ONLINE'),
  formaPago: z.enum(['EFECTIVO', 'QR', 'TARJETA']),
  asientos: z.array(z.string()).min(1, 'Seleccione al menos un asiento'),
  nitCliente: z.string().nullable().optional().default(null),
  razonSocialCliente: z.string().nullable().optional().default(null),
  usuarioA: z.number().nullable().optional().default(null),
});

export async function crearVenta(req: Request, res: Response) {
  const parsed = ventaSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 'Datos inválidos.', 400, { errores: parsed.error.flatten() });
  }

  const data = parsed.data;
  const usuario = req.user;
  if (!usuario) {
    return fail(res, 'Debe iniciar sesión para continuar.', 401);
  }

  if (usuario.idRol.includes('CLIENTE')) {
    data.idCliente = usuario.idUsuario;
    data.usuarioA = usuario.idUsuario;
  }
  if (usuario.idRol.includes('BOLETERIA')) {
    data.idEncargado = usuario.idUsuario;
  }
  if (!data.usuarioA) {
    data.usuarioA = usuario.idUsuario;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [funcionRows] = await connection.query<any[]>(
      'SELECT precioBase FROM Funcion WHERE idFuncion = ? AND estadoA = 1',
      [data.idFuncion]
    );

    if (!funcionRows.length) {
      await connection.rollback();
      return fail(res, 'Función no encontrada o inactiva.', 404);
    }

    const precioBase = parseFloat(funcionRows[0].precioBase);
    const montoTotal = Number((precioBase * data.asientos.length).toFixed(2));

    const codigo = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const [ventaResult] = await connection.query<any>(
      `INSERT INTO Venta (idCliente, idEncargado, idFuncion, idPromocion, fechaCompra, tipo, montoTotal, estadoVenta, metodoPago, estadoPago, codigoTransaccion, fechaPago, estadoA, fechaA, usuarioA)
       VALUES (?, ?, ?, NULL, NOW(), ?, ?, 'COMPLETADA', ?, 'APROBADO', ?, NOW(), 1, NOW(), ?)`,
      [data.idCliente, data.idEncargado, data.idFuncion, data.tipo, montoTotal, data.formaPago, codigo, data.usuarioA]
    );
    const idVenta = ventaResult.insertId as number;

    for (const idAsiento of data.asientos) {
      const codigoAcceso = generateAccessCode();
      await connection.query(
        `INSERT INTO Boleto (idAsiento, idVenta, precioPagado, codigoAcceso, estadoA, fechaA, usuarioA)
         VALUES (?, ?, ?, ?, 1, NOW(), ?)`,
        [idAsiento, idVenta, montoTotal / data.asientos.length, codigoAcceso, data.usuarioA]
      );

      const [seatRows] = await connection.query<any[]>(
        'SELECT estado FROM Asiento WHERE idAsiento = ? FOR UPDATE',
        [idAsiento]
      );

      if (!seatRows.length) {
        await connection.rollback();
        return fail(res, `Asiento no encontrado: ${idAsiento}`, 404);
      }

      if (!seatRows[0].estado) {
        await connection.rollback();
        return fail(res, `Asiento ocupado: ${idAsiento}`, 409);
      }

      await connection.query(
        'UPDATE Asiento SET estado = 0, usuarioA = ? WHERE idAsiento = ?',
        [data.usuarioA, idAsiento]
      );
    }

    let nitToUse = data.nitCliente || null;
    let razonToUse = data.razonSocialCliente || null;
    if ((!nitToUse || !razonToUse) && data.idCliente) {
      const [clienteRows] = await connection.query<any[]>(
        'SELECT nit, razonSocial FROM Usuario WHERE idUsuario = ?',
        [data.idCliente]
      );
      if (clienteRows.length) {
        nitToUse = nitToUse || clienteRows[0].nit;
        razonToUse = razonToUse || clienteRows[0].razonSocial;
      }
    }

    const numeroComprobante = `C-${Date.now()}-${idVenta}`;
    await connection.query(
      `INSERT INTO Comprobante (idVenta, numero, fechaEmision, nitCliente, razonSocialCliente, estadoA, usuarioA)
       VALUES (?, ?, NOW(), ?, ?, 1, ?)`,
      [idVenta, numeroComprobante, nitToUse, razonToUse, data.usuarioA]
    );

    await connection.commit();

    await createAudit({
      tablaNombre: 'Venta',
      registroId: idVenta,
      accion: 'VENTA_CREADA',
      usuarioA: data.usuarioA,
      req,
      detalles: `Venta ${data.tipo} procesada. Monto: Bs. ${montoTotal}. Asientos: ${data.asientos.join(', ')}`
    });

    let emailStatus = { enviado: false, motivo: 'No se envió email' };
    if (usuario.correo) {
      emailStatus = await sendComprobanteEmailInternal(idVenta, usuario.correo);
    }

    return ok(res, {
      mensaje: 'Venta procesada correctamente.',
      idVenta,
      montoTotal,
      numeroComprobante,
      codigoTransaccion: codigo,
      asientos: data.asientos,
      emailEnviado: emailStatus.enviado,
      emailMotivo: emailStatus.motivo,
    }, 201);

  } catch (error) {
    await connection.rollback();
    console.error(error);
    return fail(res, 'No se pudo procesar la venta.', 500);
  } finally {
    connection.release();
  }
}

/**
 * GET /ventas/:id/boletos
 * Retorna los boletos individuales de una venta con su codigoAcceso.
 */
export async function obtenerBoletosPorVenta(req: Request, res: Response) {
  const idVenta = Number(req.params.id);
  if (isNaN(idVenta)) return fail(res, 'ID de venta invalido.', 400);
  const [rows] = await pool.query<any[]>(
    'SELECT idBoleto, idAsiento, codigoAcceso, precioPagado FROM Boleto WHERE idVenta = ? ORDER BY idAsiento',
    [idVenta]
  );
  return ok(res, { boletos: rows });
}
