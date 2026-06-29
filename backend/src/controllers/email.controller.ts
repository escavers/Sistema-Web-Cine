import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { fail, ok } from '../utils/response.js';
import { env } from '../config/env.js';

async function getComprobanteData(idVenta: number) {
  const [rows] = await pool.query(
    `SELECT
      c.numero,
      c.nitCliente,
      c.razonSocialCliente,
      v.montoTotal,
      v.fechaCompra,
      v.metodoPago,
      f.fecha,
      f.horaInicio,
      f.idSala,
      s.tipo AS salaTipo,
      pel.titulo AS peliculaTitulo,
      GROUP_CONCAT(CONCAT(a.fila, a.columna) ORDER BY a.fila, a.columna SEPARATOR ', ') AS asientos
    FROM Venta v
    LEFT JOIN Comprobante c ON v.idVenta = c.idVenta
    LEFT JOIN Boleto b ON v.idVenta = b.idVenta
    LEFT JOIN Asiento a ON b.idAsiento = a.idAsiento
    JOIN Funcion f ON v.idFuncion = f.idFuncion
    LEFT JOIN Sala s ON f.idSala = s.idSala
    LEFT JOIN Pelicula pel ON f.idPelicula = pel.idPelicula
    WHERE v.idVenta = ?
    GROUP BY v.idVenta, c.numero, c.nitCliente, c.razonSocialCliente, v.montoTotal,
      v.fechaCompra, v.metodoPago, f.fecha, f.horaInicio, f.idSala, s.tipo, pel.titulo`,
    [idVenta]
  );

  return (rows as any[])[0] || null;
}

export async function sendComprobanteEmailInternal(idVenta: number, email: string) {
  const comprobante = await getComprobanteData(idVenta);

  if (!comprobante) {
    return { enviado: false, motivo: 'Venta no encontrada' };
  }

  const qrUrl = `${env.frontendUrl}/comprobante/${encodeURIComponent(comprobante.numero)}`;
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
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;background:#0a0a0f;padding:0}
        .c{max-width:560px;margin:0 auto;background:#121218;border:1px solid rgba(255,255,255,.08)}
        .h{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:40px 24px 32px;text-align:center;position:relative;overflow:hidden}
        .h::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:repeating-linear-gradient(90deg,rgba(0,0,0,.15) 0,rgba(0,0,0,.15) 8px,transparent 8px,transparent 16px)}
        .h::after{content:'';position:absolute;bottom:-2px;left:0;right:0;height:12px;background:radial-gradient(ellipse at center,rgba(0,0,0,.1) 0,transparent 70%)}
        .h .icon{font-size:36px;line-height:1;margin-bottom:8px}
        .h h1{font-size:26px;color:#0a0a0f;margin:0;font-weight:900;text-transform:uppercase;letter-spacing:3px;text-shadow:0 1px 2px rgba(0,0,0,.1)}
        .h p{font-size:11px;color:#0a0a0f;margin-top:4px;opacity:.6;letter-spacing:2px;font-weight:600}
        .h .num-badge{display:inline-block;margin-top:12px;background:rgba(10,10,15,.12);backdrop-filter:blur(4px);padding:5px 16px;border-radius:50px;font-size:10px;font-weight:800;color:#0a0a0f;letter-spacing:1.5px;border:1px solid rgba(10,10,15,.08)}
        .b{padding:28px 24px}
        .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:20px;margin-bottom:16px}
        .l{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px;font-weight:600}
        .v{font-size:15px;color:#e2e8f0;font-weight:600}
        .sep{border:0;height:1px;background:rgba(255,255,255,.06);margin:12px 0}
        .tot{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2);border-radius:12px;padding:16px 20px;text-align:center;margin-bottom:16px}
        .tot .l{color:#f59e0b;font-size:10px}
        .tot .v{font-size:28px;color:#f59e0b;font-weight:900}
        .qr{text-align:center;margin:16px 0}
        .qr img{border-radius:8px;border:2px solid rgba(255,255,255,.06)}
        .btn{display:inline-block;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:50px;font-weight:800;font-size:13px;letter-spacing:.5px;text-transform:uppercase;box-shadow:0 4px 20px rgba(245,158,11,.3)}
        .f{background:rgba(255,255,255,.02);padding:20px;text-align:center;font-size:11px;color:#94a3b8;letter-spacing:.5px}
        .badge{display:inline-block;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.2);padding:5px 14px;border-radius:50px;font-size:10px;color:#f59e0b;font-weight:700;text-transform:uppercase;letter-spacing:1px}
      </style></head>
      <body>
        <div class="c">
          <div class="h">
            <div class="icon">🎬</div>
            <h1>Cine La Paz</h1>
            <p>Comprobante de Compra</p>
            <div class="num-badge">${comprobante.numero}</div>
          </div>
          <div class="b">
            <div class="card">
              <div class="l">Cliente</div>
              <div class="v">${comprobante.razonSocialCliente || 'Consumidor Final'}</div>
              <hr class="sep">
              <div class="l">CI / NIT</div>
              <div class="v">${comprobante.nitCliente || '—'}</div>
            </div>
            <div class="card">
              <div class="l">Pelicula</div>
              <div class="v">${comprobante.peliculaTitulo}</div>
              <hr class="sep">
              <div class="l">Fecha y Hora</div>
              <div class="v">${comprobante.fecha} • ${comprobante.horaInicio}</div>
              <hr class="sep">
              <div class="l">Sala</div>
              <div class="v">${comprobante.salaTipo || comprobante.idSala}</div>
              <hr class="sep">
              <div class="l">Asientos</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
                ${comprobante.asientos?.split(', ').map((a: string) => `<span style="display:inline-block;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);padding:4px 12px;border-radius:6px;font-size:12px;color:#e2e8f0;font-weight:600">${a}</span>`).join('') || '<span class="v">—</span>'}
              </div>
            </div>
            <div class="card">
              <div class="l">Metodo de Pago</div>
              <div class="v">${comprobante.metodoPago === 'QR' ? 'Codigo QR' : comprobante.metodoPago}</div>
            </div>
            <div class="tot">
              <div class="l">Total pagado</div>
              <div class="v">Bs. ${Number(comprobante.montoTotal).toFixed(2)}</div>
            </div>
            <div class="qr">
              <div class="l" style="margin-bottom:8px">Escanea para verificar tu compra</div>
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}" alt="QR" style="max-width:180px"/>
            </div>
            <div style="text-align:center;margin:20px 0 8px">
              <a href="${process.env.API_URL || ('http://localhost:' + env.port + '/api')}/comprobantes/${encodeURIComponent(comprobante.numero)}/pdf" class="btn">Descargar PDF</a>
            </div>
          </div>
          <div class="f">
            <p style="margin-bottom:2px">Comprobante generado el ${new Date().toLocaleString('es-BO')}</p>
            <p>Cine La Paz &copy; ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body></html>`;

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

  return resultado;
}

export async function enviarComprobanteEmail(req: Request, res: Response) {
  const { idVenta, email } = req.body;

  if (!idVenta || !email) {
    return fail(res, 'idVenta y email son requeridos.', 400);
  }

  try {
    const resultado = await sendComprobanteEmailInternal(idVenta, email);
    const [rows] = await pool.query(
      `SELECT
        c.numero,
        c.nitCliente,
        c.razonSocialCliente,
        v.montoTotal,
        v.fechaCompra,
        v.metodoPago,
        f.fecha,
        f.horaInicio,
        f.idSala,
        s.tipo AS salaTipo,
        pel.titulo AS peliculaTitulo,
        GROUP_CONCAT(CONCAT(a.fila, a.columna) ORDER BY a.fila, a.columna SEPARATOR ', ') AS asientos
      FROM Venta v
      LEFT JOIN Comprobante c ON v.idVenta = c.idVenta
      LEFT JOIN Boleto b ON v.idVenta = b.idVenta
      LEFT JOIN Asiento a ON b.idAsiento = a.idAsiento
      JOIN Funcion f ON v.idFuncion = f.idFuncion
      LEFT JOIN Sala s ON f.idSala = s.idSala
      LEFT JOIN Pelicula pel ON f.idPelicula = pel.idPelicula
      WHERE v.idVenta = ?
      GROUP BY v.idVenta, c.numero, c.nitCliente, c.razonSocialCliente, v.montoTotal,
        v.fechaCompra, v.metodoPago, f.fecha, f.horaInicio, f.idSala, s.tipo, pel.titulo`,
      [idVenta]
    );

    if (!(rows as any[]).length) {
      return fail(res, 'Venta no encontrada.', 404);
    }

    const comprobante = (rows as any[])[0];
    const qrUrl = `${env.frontendUrl}/comprobante/${encodeURIComponent(comprobante.numero)}`;

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
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:'Segoe UI',Arial,sans-serif;background:#0a0a0f;padding:0}
          .c{max-width:560px;margin:0 auto;background:#121218;border:1px solid rgba(255,255,255,.08)}
          .h{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:40px 24px 32px;text-align:center;position:relative;overflow:hidden}
          .h::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:repeating-linear-gradient(90deg,rgba(0,0,0,.15) 0,rgba(0,0,0,.15) 8px,transparent 8px,transparent 16px)}
          .h::after{content:'';position:absolute;bottom:-2px;left:0;right:0;height:12px;background:radial-gradient(ellipse at center,rgba(0,0,0,.1) 0,transparent 70%)}
          .h .icon{font-size:36px;line-height:1;margin-bottom:8px}
          .h h1{font-size:26px;color:#0a0a0f;margin:0;font-weight:900;text-transform:uppercase;letter-spacing:3px;text-shadow:0 1px 2px rgba(0,0,0,.1)}
          .h p{font-size:11px;color:#0a0a0f;margin-top:4px;opacity:.6;letter-spacing:2px;font-weight:600}
          .h .num-badge{display:inline-block;margin-top:12px;background:rgba(10,10,15,.12);backdrop-filter:blur(4px);padding:5px 16px;border-radius:50px;font-size:10px;font-weight:800;color:#0a0a0f;letter-spacing:1.5px;border:1px solid rgba(10,10,15,.08)}
          .b{padding:28px 24px}
          .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:20px;margin-bottom:16px}
          .l{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px;font-weight:600}
          .v{font-size:15px;color:#e2e8f0;font-weight:600}
          .sep{border:0;height:1px;background:rgba(255,255,255,.06);margin:12px 0}
          .tot{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2);border-radius:12px;padding:16px 20px;text-align:center;margin-bottom:16px}
          .tot .l{color:#f59e0b;font-size:10px}
          .tot .v{font-size:28px;color:#f59e0b;font-weight:900}
          .qr-container{text-align:center;margin:16px 0}
          .qr-container img{border-radius:8px;border:2px solid rgba(255,255,255,.06)}
          .f{background:rgba(255,255,255,.02);padding:20px;text-align:center;font-size:11px;color:#94a3b8;letter-spacing:.5px}
          .ticket-card{display:inline-block;margin:8px;border:1px dashed rgba(255,255,255,.12);padding:16px;border-radius:12px;background:rgba(255,255,255,.02)}
          .ticket-card .seat{font-size:18px;color:#e2e8f0;font-weight:800;margin-top:8px}
          .ticket-card .hint{font-size:9px;color:#64748b;margin-top:4px}
        </style></head>
        <body>
          <div class="c">
            <div class="h">
              <div class="icon">🎬</div>
              <h1>Cine La Paz</h1>
              <p>Comprobante de Compra</p>
              <div class="num-badge">${comprobante.numero}</div>
            </div>
            <div class="b">
              <div class="card">
                <div class="l">Cliente</div>
                <div class="v">${comprobante.razonSocialCliente || 'Consumidor Final'}</div>
                <hr class="sep">
                <div class="l">CI / NIT</div>
                <div class="v">${comprobante.nitCliente || '—'}</div>
              </div>
              <div class="card">
                <div class="l">Pelicula</div>
                <div class="v">${comprobante.peliculaTitulo}</div>
                <hr class="sep">
                <div class="l">Fecha y Hora</div>
                <div class="v">${comprobante.fecha} • ${comprobante.horaInicio}</div>
                <hr class="sep">
                <div class="l">Sala</div>
                <div class="v">${comprobante.salaTipo || comprobante.idSala}</div>
                <hr class="sep">
                <div class="l">Asientos</div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
                  ${comprobante.asientos?.split(', ').map((a: string) => `<span style="display:inline-block;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);padding:4px 12px;border-radius:6px;font-size:12px;color:#e2e8f0;font-weight:600">${a}</span>`).join('') || '<span class="v">—</span>'}
                </div>
              </div>
              <div class="card">
                <div class="l">Metodo de Pago</div>
                <div class="v">${comprobante.metodoPago === 'QR' ? 'Codigo QR' : comprobante.metodoPago}</div>
              </div>
              <div class="tot">
                <div class="l">Total pagado</div>
                <div class="v">Bs. ${Number(comprobante.montoTotal).toFixed(2)}</div>
              </div>
              <div class="qr-container">
                <div class="l" style="margin-bottom:12px;font-size:12px;color:#e2e8f0;letter-spacing:1px;font-weight:700">Tus Boletos de Acceso</div>
                ${comprobante.asientos.split(', ').map((asiento: string) => `
                  <div class="ticket-card">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(asiento)}" alt="QR Boleto ${asiento}" style="max-width:140px;display:block;margin:0 auto"/>
                    <div class="seat">${asiento}</div>
                    <div class="hint">Codigo manual: ${asiento}</div>
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="f">
              <p style="margin-bottom:2px">Comprobante generado el ${new Date().toLocaleString('es-BO')}</p>
              <p>Cine La Paz &copy; ${new Date().getFullYear()}</p>
            </div>
          </div>
        </body></html>`;

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: `Comprobante de Compra - ${comprobante.numero}`,
          html,
        });

      } catch (err: any) {
      }
    }
    return ok(res, {
      mensaje: resultado.enviado ? 'Email enviado correctamente' : `No se pudo enviar el email: ${resultado.motivo}`,
      ...resultado,
    });
  } catch (error) {
    console.error(error);
    return fail(res, 'Error al procesar la solicitud.', 500);
  }
}
