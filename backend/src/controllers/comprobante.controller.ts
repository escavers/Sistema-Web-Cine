import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { fail, ok } from '../utils/response.js';

const comprobanteQuery = `
  SELECT
    c.idComprobante,
    c.numero,
    c.fechaEmision,
    c.nitCliente,
    c.razonSocialCliente,
    v.idVenta,
    v.fechaCompra,
    v.tipo AS canal,
    v.montoTotal,
    v.metodoPago,
    v.codigoTransaccion,
    f.idFuncion,
    f.fecha,
    f.horaInicio,
    f.horaFin,
    f.idSala,
    s.tipo AS salaTipo,
    pel.titulo AS peliculaTitulo,
    pel.posterUrl AS peliculaPoster,
    pel.clasificacionEdad AS peliculaClasificacion,
    GROUP_CONCAT(CONCAT(a.fila, a.columna) ORDER BY a.fila, a.columna SEPARATOR ', ') AS asientos
  FROM Comprobante c
  JOIN Venta v ON c.idVenta = v.idVenta
  JOIN Funcion f ON v.idFuncion = f.idFuncion
  LEFT JOIN Boleto b ON v.idVenta = b.idVenta
  LEFT JOIN Asiento a ON b.idAsiento = a.idAsiento
  LEFT JOIN Sala s ON f.idSala = s.idSala
  LEFT JOIN Pelicula pel ON f.idPelicula = pel.idPelicula
`;

const comprobanteGroupBy = `
  GROUP BY c.idComprobante, c.numero, c.fechaEmision, c.nitCliente, c.razonSocialCliente,
    v.idVenta, v.fechaCompra, v.tipo, v.montoTotal, v.metodoPago, v.codigoTransaccion,
    f.idFuncion, f.fecha, f.horaInicio, f.horaFin, f.idSala, s.tipo, pel.titulo, pel.posterUrl, pel.clasificacionEdad
`;

async function getBoletos(idVenta: number): Promise<{ idBoleto: number; idAsiento: string }[]> {
  const [rows] = await pool.query<any[]>(
    'SELECT b.idBoleto, b.idAsiento FROM Boleto b WHERE b.idVenta = ? ORDER BY b.idAsiento',
    [idVenta]
  );
  return rows;
}

export async function obtenerComprobantePorNumero(req: Request, res: Response) {
  const { numero } = req.params;

  if (!numero) {
    return fail(res, 'Número de comprobante requerido.', 400);
  }

  const [rows] = await pool.query(
    `${comprobanteQuery} WHERE c.numero = ? ${comprobanteGroupBy}`,
    [numero]
  );

  if (!(rows as any[]).length) {
    return fail(res, `Comprobante no encontrado: ${numero}`, 404);
  }

  return ok(res, { comprobante: (rows as any[])[0] });
}

export async function descargarComprobantePdf(req: Request, res: Response) {
  const { numero } = req.params;

  if (!numero) {
    return fail(res, 'Número de comprobante requerido.', 400);
  }

  const [rows] = await pool.query(
    `${comprobanteQuery} WHERE c.numero = ? ${comprobanteGroupBy}`,
    [numero]
  );

  if (!(rows as any[]).length) {
    return fail(res, `Comprobante no encontrado: ${numero}`, 404);
  }

  const comprobante = (rows as any[])[0];
  const boletos = await getBoletos(comprobante.idVenta);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const QRCode = require('qrcode');

  const qrImages = await Promise.all(
    boletos.map((b) => QRCode.toDataURL(String(b.idBoleto)))
  );

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks: Uint8Array[] = [];

  doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
  doc.on('end', () => {
    const buffer = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${comprobante.numero}.pdf"`);
    res.send(buffer);
  });

  // Encabezado
  doc.fontSize(24).font('Helvetica-Bold').text('COMPROBANTE DE COMPRA', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('Cine La Paz', { align: 'center' });
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.5);

  // Número y fecha
  doc.fontSize(11).text(`Comprobante Nº: ${comprobante.numero}`);
  doc.text(`Fecha de emisión: ${new Date(comprobante.fechaEmision).toLocaleString('es-BO')}`);
  doc.text(`Fecha de compra: ${new Date(comprobante.fechaCompra).toLocaleString('es-BO')}`);
  doc.text(`Canal: ${comprobante.canal === 'ONLINE' ? 'Compra en línea' : 'Venta presencial'}`);
  doc.text(`Método de pago: ${comprobante.metodoPago === 'QR' ? 'Código QR' : comprobante.metodoPago}`);
  doc.moveDown(0.8);

  // Sección de película
  doc.fontSize(12).font('Helvetica-Bold').text('PELÍCULA', { underline: true });
  doc.fontSize(11).font('Helvetica');
  doc.text(`Título: ${comprobante.peliculaTitulo}`);
  doc.text(`Sala: ${comprobante.salaTipo} (${comprobante.idSala})`);
  doc.text(`Fecha: ${new Date(comprobante.fecha).toLocaleDateString('es-BO')}`);
  doc.text(`Hora: ${comprobante.horaInicio} - ${comprobante.horaFin}`);
  doc.moveDown(0.3);
  doc.text(`Asientos: ${comprobante.asientos}`);
  doc.moveDown(0.8);

  // Sección de cliente
  doc.fontSize(12).font('Helvetica-Bold').text('DATOS DEL CLIENTE', { underline: true });
  doc.fontSize(11).font('Helvetica');
  doc.text(`Razón social: ${comprobante.razonSocialCliente || 'Consumidor Final'}`);
  doc.text(`NIT/CI: ${comprobante.nitCliente || 'N/A'}`);
  doc.moveDown(0.8);

  // Sección de totales
  doc.fontSize(12).font('Helvetica-Bold').text('RESUMEN DE PAGO', { underline: true });
  const tableTop = doc.y + 5;
  doc.fontSize(10).font('Helvetica');
  doc.text('Cantidad', 60, tableTop);
  doc.text('Concepto', 120, tableTop);
  doc.text('Precio Unitario', 280, tableTop);
  doc.text('Subtotal', 420, tableTop);

  doc.moveTo(40, tableTop + 15).lineTo(555, tableTop + 15).stroke();

  const cantidad = boletos.length || 1;
  const precioUnitario = Number(comprobante.montoTotal) / cantidad;

  doc.text(cantidad.toString(), 60, tableTop + 20);
  doc.text('Boletos', 120, tableTop + 20);
  doc.text(`Bs. ${precioUnitario.toFixed(2)}`, 280, tableTop + 20);
  doc.text(`Bs. ${Number(comprobante.montoTotal).toFixed(2)}`, 420, tableTop + 20);

  doc.moveTo(40, tableTop + 40).lineTo(555, tableTop + 40).stroke();

  doc.fontSize(13).font('Helvetica-Bold');
  doc.text('TOTAL:', 280, tableTop + 50);
  doc.text(`Bs. ${Number(comprobante.montoTotal).toFixed(2)}`, 420, tableTop + 50);
  doc.moveDown(1.5);

  // Pases de entrada con QR por asiento
  doc.fontSize(12).font('Helvetica-Bold').text('PASES DE ENTRADA', { align: 'center', underline: true });
  doc.moveDown(0.3);

  const qrSize = 60;
  const colWidth = 170;
  const cols = 3;
  const startX = 40;
  let x = startX;
  let y = doc.y;

  for (let i = 0; i < boletos.length; i++) {
    const b = boletos[i];
    const img = Buffer.from(qrImages[i].replace('data:image/png;base64,', ''), 'base64');

    if (i > 0 && i % cols === 0) {
      x = startX;
      y += qrSize + 30;
    }

    doc.fontSize(8).font('Helvetica-Bold').text(b.idAsiento, x, y, { width: colWidth, align: 'center' });
    doc.image(img, x + (colWidth - qrSize) / 2, y + 12, { width: qrSize, height: qrSize });
    doc.fontSize(7).font('Helvetica').text(`Boleto #${b.idBoleto}`, x, y + 12 + qrSize + 2, { width: colWidth, align: 'center' });

    x += colWidth;
  }

  doc.y = y + qrSize + 35;

  // Footer
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.3);
  doc.fontSize(9).text('Gracias por comprar en Cine La Paz', { align: 'center' });
  doc.text('Este comprobante valida tu entrada al cine', { align: 'center' });
  doc.end();
}

export async function descargarComprobanteTicketPdf(req: Request, res: Response) {
  const { numero } = req.params;
  const [rows] = await pool.query(
    `SELECT
      c.numero, c.nitCliente, c.razonSocialCliente, c.fechaEmision,
      v.idVenta, v.montoTotal, v.fechaCompra, v.metodoPago, v.tipo AS canal,
      f.fecha, f.horaInicio, f.idSala, s.tipo AS salaTipo, pel.titulo AS peliculaTitulo,
      GROUP_CONCAT(CONCAT(a.fila, a.columna) ORDER BY a.fila, a.columna SEPARATOR ', ') AS asientos
    FROM Comprobante c
    JOIN Venta v ON c.idVenta = v.idVenta
    JOIN Funcion f ON v.idFuncion = f.idFuncion
    LEFT JOIN Sala s ON f.idSala = s.idSala
    LEFT JOIN Pelicula pel ON f.idPelicula = pel.idPelicula
    LEFT JOIN Boleto b ON v.idVenta = b.idVenta
    LEFT JOIN Asiento a ON b.idAsiento = a.idAsiento
    WHERE c.numero = ?
    GROUP BY c.numero, c.nitCliente, c.razonSocialCliente, c.fechaEmision,
      v.idVenta, v.montoTotal, v.fechaCompra, v.metodoPago, v.tipo, f.fecha, f.horaInicio, f.idSala, s.tipo, pel.titulo`,
    [numero]
  );

  if (!rows || (rows as any[]).length === 0) {
    return fail(res, `Comprobante no encontrado: ${numero}`, 404);
  }

  const comprobante = (rows as any[])[0];
  const boletos = await getBoletos(comprobante.idVenta);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const QRCode = require('qrcode');

  const qrImages = await Promise.all(
    boletos.map((b) => QRCode.toDataURL(String(b.idBoleto)))
  );

  // 80mm roll width is ~226 points. Height is fixed high to fit all, printers cut at end of content.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: [226, 800], margin: 10 });
  const chunks: Uint8Array[] = [];

  doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
  doc.on('end', () => {
    const buffer = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="ticket-${comprobante.numero}.pdf"`);
    res.send(buffer);
  });

  doc.fontSize(14).font('Helvetica-Bold').text('CINE LA PAZ', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('Ticket de Venta', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(9).text('------------------------------------------', { align: 'center' });

  doc.text(`Nro: ${comprobante.numero}`);
  doc.text(`Fecha: ${new Date(comprobante.fechaEmision).toLocaleString('es-BO')}`);
  doc.text(`Cajero: Boleteria`);
  doc.text('------------------------------------------', { align: 'center' });
  doc.moveDown(0.5);

  doc.font('Helvetica-Bold').text('PELICULA:', { underline: true });
  doc.font('Helvetica').text(comprobante.peliculaTitulo, { align: 'center' });
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').text(`FECHA/HORA:`, { underline: true });
  doc.font('Helvetica').text(`${comprobante.fecha} / ${comprobante.horaInicio}`, { align: 'center' });
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').text(`SALA:`, { underline: true });
  doc.font('Helvetica').text(`${comprobante.idSala} (${comprobante.salaTipo || 'Estandar'})`, { align: 'center' });
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').text(`ASIENTOS:`, { underline: true });
  doc.font('Helvetica').text(comprobante.asientos, { align: 'center' });
  doc.moveDown(0.5);
  doc.text('------------------------------------------', { align: 'center' });

  doc.font('Helvetica-Bold').text('CLIENTE:', { underline: true });
  doc.font('Helvetica').text(`${comprobante.razonSocialCliente || 'Consumidor Final'}`, { align: 'center' });
  doc.text(`NIT/CI: ${comprobante.nitCliente || 'N/A'}`, { align: 'center' });
  doc.moveDown(0.5);
  doc.text('------------------------------------------', { align: 'center' });

  const cantidad = boletos.length || 1;
  doc.font('Helvetica-Bold').text(`TOTAL (${cantidad}x):`, { align: 'center', underline: true });
  doc.fontSize(14).text(`Bs. ${Number(comprobante.montoTotal).toFixed(2)}`, { align: 'center' });
  doc.moveDown(0.5);

  doc.fontSize(9).font('Helvetica').text('------------------------------------------', { align: 'center' });
  doc.moveDown(0.3);

  // QR por asiento (vertical en ticket)
  doc.fontSize(9).font('Helvetica-Bold').text('PASES DE ENTRADA', { align: 'center', underline: true });
  doc.moveDown(0.3);

  const qrSize = 50;
  const qrX = (226 - qrSize) / 2;

  for (let i = 0; i < boletos.length; i++) {
    const b = boletos[i];
    const img = Buffer.from(qrImages[i].replace('data:image/png;base64,', ''), 'base64');

    doc.fontSize(8).font('Helvetica-Bold').text(`Asiento: ${b.idAsiento}`, { align: 'center' });
    doc.image(img, qrX, doc.y + 2, { width: qrSize, height: qrSize });
    doc.y += qrSize + 4;
    doc.fontSize(7).font('Helvetica').text(`Boleto #${b.idBoleto}`, { align: 'center' });
    doc.moveDown(0.3);

    if (i < boletos.length - 1) {
      doc.text('· · ·', { align: 'center' });
      doc.moveDown(0.2);
    }
  }

  doc.moveDown(0.3);
  doc.fontSize(8).text('Gracias por su preferencia.', { align: 'center' });
  doc.text('Conserve este ticket.', { align: 'center' });

  doc.end();
}
