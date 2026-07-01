import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { z } from 'zod';
import { fail, ok } from '../utils/response.js';
import { createAudit } from '../services/audit.service.js';
import { evaluarPromocionFuncion } from '../services/promotionSchedulerService.js';

const cancelacionSchema = z.object({
  idVenta: z.number().min(1, 'ID de venta requerido'),
});

export async function cancelarVenta(req: Request, res: Response) {
  const parsed = cancelacionSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 'Datos inválidos.', 400, { errores: parsed.error.flatten() });
  }

  const { idVenta } = parsed.data;
  const actor = req.user!;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [ventaRows] = await connection.query<any[]>(
      `SELECT v.idVenta, v.idCliente, v.estadoVenta, MIN(CONCAT(f.fecha, ' ', f.horaInicio)) AS fechaHoraFuncion
       FROM Venta v
       JOIN Funcion f ON v.idFuncion = f.idFuncion
       WHERE v.idVenta = ? AND v.estadoA = 1
       GROUP BY v.idVenta, v.idCliente, v.estadoVenta`,
      [idVenta]
    );

    if (!ventaRows.length) {
      await connection.rollback();
      return fail(res, 'Venta no encontrada.', 404);
    }

    const venta = ventaRows[0];
    if (venta.estadoVenta !== 'COMPLETADA') {
      await connection.rollback();
      return fail(res, 'Solo se pueden cancelar ventas completadas.', 400);
    }

    if (actor.idRol.includes('CLIENTE') && venta.idCliente !== actor.idUsuario) {
      await connection.rollback();
      return fail(res, 'No puede cancelar una venta que no le pertenece.', 403);
    }

    const fechaHoraFuncion = new Date(String(ventaRows[0].fechaHoraFuncion).replace(' ', 'T'));
    const ahora = new Date();
    const diferenciaMs = fechaHoraFuncion.getTime() - ahora.getTime();
    const diferenciaHoras = diferenciaMs / (1000 * 60 * 60);

    if (diferenciaHoras < 24) {
      await connection.rollback();
      return fail(res, 'No es posible cancelar con menos de 24 horas de anticipación a la función.', 400);
    }

    const [boletosRows] = await connection.query<any[]>(
      'SELECT idAsiento FROM Boleto WHERE idVenta = ?',
      [idVenta]
    );

    if (!boletosRows.length) {
      await connection.rollback();
      return fail(res, 'No se encontraron boletos para esta venta.', 404);
    }

    await connection.query(
      `INSERT INTO Cancelacion (idVenta, fechaHora, estado, estadoA, fechaA, usuarioA)
       VALUES (?, NOW(), 'APROBADA', 1, NOW(), ?)`,
      [idVenta, actor.idUsuario]
    );

    await connection.query(
      'UPDATE Boleto SET estadoA = 0, fechaA = NOW(), usuarioA = ? WHERE idVenta = ?',
      [actor.idUsuario, idVenta]
    );

    await connection.query(
      `UPDATE Venta SET estadoVenta = 'CANCELADA', fechaA = NOW(), usuarioA = ? WHERE idVenta = ?`,
      [actor.idUsuario, idVenta]
    );

    await connection.commit();

    try {
      const [funcionRow] = await pool.query<any[]>(
        'SELECT idFuncion FROM Venta WHERE idVenta = ?', [idVenta]
      );
      if (funcionRow.length > 0) {
        await evaluarPromocionFuncion(funcionRow[0].idFuncion, pool);
      }
    } catch (promoErr) {
      console.error('Error al recalcular promoción tras cancelación:', promoErr);
    }

    await createAudit({
      tablaNombre: 'Venta',
      registroId: idVenta,
      accion: 'VENTA_CANCELADA',
      usuarioA: actor.idUsuario,
      req,
      detalles: `Venta cancelada. Asientos liberados: ${boletosRows.map((r: any) => r.idAsiento).join(', ')}`
    });

    return ok(res, {
      mensaje: 'Su solicitud de cancelación ha sido enviada exitosamente. Un administrador se pondrá en contacto contigo para coordinar el reembolso.',
      idVenta,
      asientosLiberados: boletosRows.map((r: any) => r.idAsiento),
    });

  } catch (error) {
    await connection.rollback();
    console.error(error);
    return fail(res, 'No se pudo procesar la cancelación.', 500);
  } finally {
    connection.release();
  }
}
