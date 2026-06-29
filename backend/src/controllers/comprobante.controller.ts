import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { fail, ok } from '../utils/response.js';
import {
  createPdfDoc, buildPdfTitle, buildPdfBottomInfo, drawPdfTable,
  addPageFooters, sendPdf, formatDateEs, formatMoney,
  type TableColumn,
} from '../utils/pdfHelpers.js';

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
    GROUP_CONCAT(CONCAT(a.fila, a.columna) ORDER BY a.fila, a.columna SEPARATOR ', ') AS asientos,
    u.ci AS clienteCi
  FROM Comprobante c
  JOIN Venta v ON c.idVenta = v.idVenta
  JOIN Funcion f ON v.idFuncion = f.idFuncion
  LEFT JOIN Boleto b ON v.idVenta = b.idVenta
  LEFT JOIN Asiento a ON b.idAsiento = a.idAsiento
  LEFT JOIN Sala s ON f.idSala = s.idSala
  LEFT JOIN Pelicula pel ON f.idPelicula = pel.idPelicula
  LEFT JOIN Usuario u ON v.idCliente = u.idUsuario
`;

const comprobanteGroupBy = `
  GROUP BY c.idComprobante, c.numero, c.fechaEmision, c.nitCliente, c.razonSocialCliente,
    v.idVenta, v.fechaCompra, v.tipo, v.montoTotal, v.metodoPago, v.codigoTransaccion,
    f.idFuncion, f.fecha, f.horaInicio, f.horaFin, f.idSala, s.tipo, pel.titulo, pel.posterUrl, pel.clasificacionEdad,
    u.ci
`;

async function getBoletos(idVenta: number): Promise<{ idBoleto: number; idAsiento: string; codigoAcceso: string | null }[]> {
  const [rows] = await pool.query<any[]>(
    'SELECT b.idBoleto, b.idAsiento, b.codigoAcceso FROM Boleto b WHERE b.idVenta = ? ORDER BY b.idAsiento',
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

  // Nota: los boletos individuales con codigoAcceso se cargan via GET /boletos?idVenta=:id
}

// ÔöÇÔöÇ A4 Comprobante PDF ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

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

  // Obtener nombre del usuario autenticado
  let nombreUsuario = 'Desconocido';
  if (req.user) {
    const [userRows] = await pool.query(
      'SELECT nombre1, apellidoP FROM Usuario WHERE idUsuario = ?',
      [req.user.idUsuario]
    );
    if ((userRows as any[]).length) {
      const u = (userRows as any[])[0];
      nombreUsuario = `${u.nombre1} ${u.apellidoP}`.trim();
    }
  }

  const { doc, chunks } = createPdfDoc();
  const PAGE_WIDTH = 595.28;
  const MARGIN = 40;
  const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

  // ─── Encabezado ───
  doc.fontSize(24).font('Helvetica-Bold').fillColor('#1a1a1a');
  doc.text('Cine La Paz', MARGIN, doc.y, { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#333333');
  doc.text('COMPROBANTE DE COMPRA', MARGIN, doc.y, { align: 'left' });
  doc.moveDown(0.2);
  doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).stroke('#cccccc');
  doc.moveDown(0.5);

  // ── Datos del comprobante ──
  doc.fontSize(10).font('Helvetica').fillColor('#333333');
  doc.text(`Comprobante N°: ${comprobante.numero}`);
  doc.text(`Fecha de emision: ${new Date(comprobante.fechaEmision).toLocaleString('es-BO')}`);
  doc.text(`Fecha de compra: ${new Date(comprobante.fechaCompra).toLocaleString('es-BO')}`);
  doc.text(`Canal: ${comprobante.canal === 'ONLINE' ? 'Compra en linea' : 'Venta presencial'}`);
  doc.text(`Metodo de pago: ${comprobante.metodoPago === 'QR' ? 'Codigo QR' : comprobante.metodoPago}`);
  doc.moveDown(0.6);

  // ─── Seccion de pelicula ───
  drawSectionTitle(doc, 'PELICULA', MARGIN, PAGE_WIDTH);
  doc.fontSize(10).font('Helvetica').fillColor('#333333');
  doc.text(`Titulo: ${comprobante.peliculaTitulo}`, MARGIN + 5);
  doc.text(`Sala: ${comprobante.salaTipo} (${comprobante.idSala})`, MARGIN + 5);
  doc.text(`Fecha: ${formatDateEs(comprobante.fecha)}`, MARGIN + 5);
  doc.text(`Hora: ${comprobante.horaInicio} - ${comprobante.horaFin}`, MARGIN + 5);
  doc.text(`Asientos: ${comprobante.asientos}`, MARGIN + 5);
  doc.moveDown(0.6);

  // ─── Seccion de cliente ───
  drawSectionTitle(doc, 'DATOS DEL CLIENTE', MARGIN, PAGE_WIDTH);
  doc.fontSize(10).font('Helvetica').fillColor('#333333');
  doc.text(`Nombre: ${comprobante.razonSocialCliente || 'Consumidor Final'}`, MARGIN + 5);
  doc.text(`CI / NIT: ${comprobante.nitCliente || comprobante.clienteCi || 'N/A'}`, MARGIN + 5);
  doc.moveDown(0.6);

  // ── Resumen de pago (tabla) ──
  drawSectionTitle(doc, 'RESUMEN DE PAGO', MARGIN, PAGE_WIDTH);

  const columns: TableColumn[] = [
    { header: 'Cant.', key: 'cant', width: 50, align: 'center' },
    { header: 'Concepto', key: 'concepto', width: 200 },
    { header: 'P. Unitario', key: 'pu', width: 100, align: 'right' },
    { header: 'Subtotal', key: 'sub', width: 100, align: 'right' },
  ];

  const cantidad = comprobante.asientos ? comprobante.asientos.split(', ').length : 1;
  const precioUnitario = Number(comprobante.montoTotal) / cantidad;

  const tableRows = [[
    String(cantidad),
    'Boletos',
    formatMoney(precioUnitario),
    formatMoney(Number(comprobante.montoTotal)),
  ]];

  drawPdfTable(doc, columns, tableRows, { zebra: false });

  // Total
  doc.moveDown(0.3);
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a1a1a');
  doc.text(`TOTAL: ${formatMoney(Number(comprobante.montoTotal))}`, MARGIN, doc.y, {
    width: CONTENT_WIDTH,
    align: 'right',
  });
  doc.moveDown(1);

  // ─── Footer ───
  buildPdfBottomInfo(doc, nombreUsuario);

  if (doc.y + 40 > 760) doc.addPage();
  doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).stroke('#cccccc');
  doc.moveDown(0.3);
  doc.fontSize(9).font('Helvetica').fillColor('#999999');
  doc.text('Gracias por comprar en Cine La Paz', { align: 'center' });
  doc.text('Los pases de entrada con codigo QR se descargan por separado.', { align: 'center' });

  addPageFooters(doc);
  await sendPdf(res, doc, chunks, comprobante.numero);
}

// ÔöÇÔöÇ Ticket PDF (80mm rollo) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

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

  // Obtener nombre del usuario autenticado
  let nombreUsuario = 'Desconocido';
  if (req.user) {
    const [userRows] = await pool.query(
      'SELECT nombre1, apellidoP FROM Usuario WHERE idUsuario = ?',
      [req.user.idUsuario]
    );
    if ((userRows as any[]).length) {
      const u = (userRows as any[])[0];
      nombreUsuario = `${u.nombre1} ${u.apellidoP}`.trim();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const QRCode = require('qrcode');

  const qrImages = await Promise.all(
    boletos.map((b) => QRCode.toDataURL(b.codigoAcceso || String(b.idBoleto)))
  );

  // 80mm roll width = ~226 points
  const ROLL_WIDTH = 226;
  const TICKET_MARGIN = 10;
  const TICKET_CONTENT = ROLL_WIDTH - 2 * TICKET_MARGIN;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: [ROLL_WIDTH, 800], margin: TICKET_MARGIN });
  const chunks: Uint8Array[] = [];

  doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
  doc.on('end', () => {
    const buffer = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="ticket-${comprobante.numero}.pdf"`);
    res.send(buffer);
  });

  // ─── Header ───
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a1a');
  doc.text('Cine La Paz', TICKET_MARGIN, doc.y, { align: 'left', width: TICKET_CONTENT });
  doc.fontSize(9).font('Helvetica').fillColor('#666666');
  doc.text('Ticket de Venta', { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(8).fillColor('#cccccc');
  doc.text('- '.repeat(20), { align: 'center' });

  // ─── Datos ───
  doc.fontSize(8).font('Helvetica').fillColor('#333333');
  doc.text(`Nro: ${comprobante.numero}`);
  doc.text(`Fecha: ${new Date(comprobante.fechaEmision).toLocaleString('es-BO')}`);
  doc.text(`Cajero: Boletería`);
  doc.fontSize(8).fillColor('#cccccc');
  doc.text('- '.repeat(20), { align: 'center' });
  doc.moveDown(0.3);

  // ─── Película ───
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#333333');
  doc.text('PELÍCULA:', { underline: true });
  doc.font('Helvetica').text(truncateText(doc, comprobante.peliculaTitulo, TICKET_CONTENT - 10), { align: 'center' });
  doc.moveDown(0.2);

  doc.font('Helvetica-Bold').text('FECHA/HORA:', { underline: true });
  doc.font('Helvetica').text(`${comprobante.fecha} / ${comprobante.horaInicio}`, { align: 'center' });
  doc.moveDown(0.2);

  doc.font('Helvetica-Bold').text('SALA:', { underline: true });
  doc.font('Helvetica').text(`${comprobante.idSala} (${comprobante.salaTipo || 'Estándar'})`, { align: 'center' });
  doc.moveDown(0.2);

  doc.font('Helvetica-Bold').text('ASIENTOS:', { underline: true });
  doc.font('Helvetica').text(truncateText(doc, comprobante.asientos, TICKET_CONTENT - 10), { align: 'center' });
  doc.moveDown(0.3);

  doc.fillColor('#cccccc');
  doc.text('- '.repeat(20), { align: 'center' });

  // ─── Cliente ───
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#333333');
  doc.text('CLIENTE:', { underline: true });
  doc.font('Helvetica').text(truncateText(doc, comprobante.razonSocialCliente || 'Consumidor Final', TICKET_CONTENT - 10), { align: 'center' });
  doc.text(`NIT/CI: ${comprobante.nitCliente || 'N/A'}`, { align: 'center' });
  doc.moveDown(0.3);

  doc.fillColor('#cccccc');
  doc.text('- '.repeat(20), { align: 'center' });

  // ─── Total ───
  const cantidad = boletos.length || 1;
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a1a1a');
  doc.text(`TOTAL (${cantidad}x):`, { align: 'center', underline: true });
  doc.fontSize(14).text(formatMoney(Number(comprobante.montoTotal)), { align: 'center' });
  doc.moveDown(0.3);

  doc.fontSize(8).fillColor('#cccccc');
  doc.text('- '.repeat(20), { align: 'center' });
  doc.moveDown(0.3);

  // ─── QR por asiento ───
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#333333');
  doc.text('PASES DE ENTRADA', { align: 'center', underline: true });
  doc.moveDown(0.3);

  const qrSize = 50;
  const qrX = (ROLL_WIDTH - qrSize) / 2;

  for (let i = 0; i < boletos.length; i++) {
    const b = boletos[i];
    const img = Buffer.from(qrImages[i].replace('data:image/png;base64,', ''), 'base64');

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#1a1a1a');
    doc.text(`Asiento: ${b.idAsiento}`, { align: 'center' });

    const seatTextH = doc.heightOfString(`Asiento: ${b.idAsiento}`, { width: TICKET_CONTENT, align: 'center' });

    doc.image(img, qrX, doc.y + 2, { width: qrSize, height: qrSize });
    doc.y += qrSize + 4;

    doc.fontSize(7).font('Helvetica').fillColor('#666666');
    const codigoDisplay = b.codigoAcceso || `#${b.idBoleto}`;
    doc.text(`Cód: ${codigoDisplay}`, { align: 'center' });

    if (i < boletos.length - 1) {
      doc.moveDown(1.5);
      doc.fontSize(6).fillColor('#cccccc');
      doc.text('- - - - - - - - - - - -', { align: 'center' });
      doc.moveDown(1.5);
    }
  }

  doc.moveDown(0.3);
  doc.fontSize(7).font('Helvetica').fillColor('#999999');
  doc.text('Gracias por su preferencia.', { align: 'center' });
  doc.text('Conserve este ticket.', { align: 'center' });

  // Info de generación
  doc.moveDown(0.3);
  doc.fontSize(6).fillColor('#999999');
  const now = new Date();
  const fechaHora = now.toLocaleString('es-BO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  doc.text(`Gen: ${fechaHora}`, { align: 'center' });
  doc.text(`Usu: ${nombreUsuario}`, { align: 'center' });

  doc.end();
}

// ÔöÇÔöÇ Helpers ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

function drawSectionTitle(doc: any, title: string, x: number, pageWidth: number) {
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a1a');
  doc.text(title, x, doc.y, { underline: true });
  doc.moveDown(0.2);
  doc.moveTo(x, doc.y).lineTo(pageWidth - x, doc.y).stroke('#cccccc');
  doc.moveDown(0.3);
}

function truncateText(doc: any, text: string, maxWidth: number): string {
  if (!text) return '—';
  const w = doc.widthOfString(text);
  if (w <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && doc.widthOfString(truncated + '…') > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '…';
}
