import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { fail, ok } from '../utils/response.js';
import { env } from '../config/env.js';

export async function enviarComprobanteEmail(req: Request, res: Response) {
  const { idVenta, email } = req.body;

  if (!idVenta || !email) {
    return fail(res, 'idVenta y email son requeridos.', 400);
  }

  try {
    const [rows] = await pool.query(
      `SELECT
        c.numero,
        c.nitCliente,
        c.razonSocialCliente,
        v.montoTotal,
        v.fechaCompra,
        p.metodoPago,
        f.fecha,
        f.horaInicio,
        f.idSala,
        s.tipo AS salaTipo,
        pel.titulo AS peliculaTitulo,
        GROUP_CONCAT(CONCAT(a.fila, a.columna) ORDER BY a.fila, a.columna SEPARATOR ', ') AS asientos
      FROM Venta v
      LEFT JOIN Comprobante c ON v.idVenta = c.idVenta
      LEFT JOIN Pago p ON v.idVenta = p.idVenta
      LEFT JOIN Boleto b ON v.idVenta = b.idVenta
      LEFT JOIN Asiento a ON b.idAsiento = a.idAsiento
      LEFT JOIN Funcion f ON b.idFuncion = f.idFuncion
      LEFT JOIN Sala s ON f.idSala = s.idSala
      LEFT JOIN Pelicula pel ON f.idPelicula = pel.idPelicula
      WHERE v.idVenta = ?
      GROUP BY v.idVenta, c.numero, c.nitCliente, c.razonSocialCliente, v.montoTotal,
        v.fechaCompra, p.metodoPago, f.fecha, f.horaInicio, f.idSala, s.tipo, pel.titulo`,
      [idVenta]
    );

    if (!(rows as any[]).length) {
      return fail(res, 'Venta no encontrada.', 404);
    }

    const comprobante = (rows as any[])[0];
    const qrUrl = `${env.frontendUrl}/comprobante/${encodeURIComponent(comprobante.numero)}`;

    // Intentar enviar email (no falla si no está configurado)
    let resultado = { enviado: false, motivo: 'Email no configurado' };

    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.default.createTransport({
          service: process.env.EMAIL_SERVICE || 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        });

        const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><style>
          body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:20px}
          .c{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.1);overflow:hidden}
          .h{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#0a0a0f;padding:30px;text-align:center}
          .ct{padding:30px}.s{margin-bottom:20px;border-bottom:1px solid #e2e8f0;padding-bottom:20px}
          .l{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px}
          .v{font-size:16px;font-weight:600;color:#1e293b}
          .qr{text-align:center;margin:20px 0}
          .f{background:#f1f5f9;padding:20px;text-align:center;font-size:12px;color:#64748b}
        </style></head>
        <body><div class="c">
          <div class="h"><h2>Cine La Paz - Comprobante</h2><p>${comprobante.numero}</p></div>
          <div class="ct">
            <div class="s"><div class="l">Cliente</div><div class="v">${comprobante.razonSocialCliente || 'Cliente'}</div>
            <div class="l" style="margin-top:10px">NIT/CI</div><div class="v">${comprobante.nitCliente || '—'}</div></div>
            <div class="s"><div class="l">Película</div><div class="v">${comprobante.peliculaTitulo}</div>
            <div class="l" style="margin-top:10px">Fecha y Hora</div><div class="v">${comprobante.fecha} • ${comprobante.horaInicio}</div>
            <div class="l" style="margin-top:10px">Sala</div><div class="v">${comprobante.salaTipo || comprobante.idSala}</div>
            <div class="l" style="margin-top:10px">Asientos</div><div class="v">${comprobante.asientos}</div></div>
            <div class="s"><div class="l">Método de Pago</div><div class="v">${comprobante.metodoPago}</div>
            <div class="l" style="margin-top:10px">Total</div>
            <div style="font-size:24px;font-weight:bold;color:#d97706">Bs. ${Number(comprobante.montoTotal).toFixed(2)}</div></div>
            <div class="qr-container" style="text-align:center;margin:20px 0;">
              <div class="l" style="margin-bottom:15px;font-size:14px;"><strong>Tus Boletos de Acceso:</strong></div>
              ${comprobante.asientos.split(', ').map((asiento: string) => `
                <div style="display:inline-block; margin: 10px; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 8px;">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(asiento)}" alt="QR Boleto ${asiento}" style="max-width:150px; display:block; margin: 0 auto;"/>
                  <div style="margin-top:10px; font-weight:bold; color:#1e293b; font-size:16px;">${asiento}</div>
                  <div style="font-size:10px; color:#94a3b8; margin-top:3px;">Código manual</div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="f"><p>Comprobante generado el ${new Date().toLocaleString('es-BO')}</p><p>Cine La Paz</p></div>
        </div></body></html>`;

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: `Comprobante de Compra - ${comprobante.numero}`,
          html,
        });

        resultado = { enviado: true, motivo: '' };
      } catch (err: any) {
        resultado = { enviado: false, motivo: err.message };
      }
    }

    return ok(res, {
      mensaje: resultado.enviado ? 'Email enviado correctamente' : 'No se pudo enviar el email',
      ...resultado,
    });

  } catch (error) {
    console.error(error);
    return fail(res, 'Error al procesar la solicitud.', 500);
  }
}
