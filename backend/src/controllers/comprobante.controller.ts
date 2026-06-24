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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PDFDocument = require('pdfkit');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const QRCode = require('qrcode');

  const qrData = `CINE-${comprobante.numero}-${comprobante.nitCliente || 'CLIENTE'}-${new Date(comprobante.fechaEmision).getTime()}`;
  const qrImage = await QRCode.toDataURL(qrData);

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

  const cantidad = (comprobante.asientos?.split(',') || []).length;
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

  // QR de verificación
  doc.fontSize(11).font('Helvetica-Bold').text('CÓDIGO DE VERIFICACIÓN', { align: 'center', underline: true });
  doc.moveDown(0.3);
  
  const qrX = 240;
  const qrY = doc.y;
  const img = Buffer.from(qrImage.replace('data:image/png;base64,', ''), 'base64');
  doc.image(img, qrX - 40, qrY, { width: 80, height: 80 });
  doc.moveDown(5);

  doc.fontSize(9).font('Helvetica').text(`Código: ${comprobante.numero}`, { align: 'center' });
  doc.moveDown(0.5);

  // Footer
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.3);
  doc.fontSize(9).text('Gracias por comprar en Cine La Paz', { align: 'center' });
  doc.text('Este comprobante valida tu entrada al cine', { align: 'center' });
  doc.end();
}
