import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { ok, fail } from '../utils/response.js';

function parseFecha(v: unknown): string | null {
  if (!v || typeof v !== 'string') return null;
  return v.trim() || null;
}

export async function reporteOcupacion(req: Request, res: Response) {
  try {
    const fi = parseFecha(req.query.fechaInicio);
    const ff = parseFecha(req.query.fechaFin);
    const [rows] = await pool.query('CALL sp_reporte_ocupacion(?, ?)', [fi, ff]);
    return ok(res, { reporte: (rows as any[])[0] });
  } catch (error) {
    console.error(error);
    return fail(res, 'Error al generar reporte de ocupación.', 500);
  }
}

export async function reporteMasVistas(req: Request, res: Response) {
  try {
    const fi = parseFecha(req.query.fechaInicio);
    const ff = parseFecha(req.query.fechaFin);
    const [rows] = await pool.query('CALL sp_reporte_mas_vistas(?, ?)', [fi, ff]);
    return ok(res, { reporte: (rows as any[])[0] });
  } catch (error) {
    console.error(error);
    return fail(res, 'Error al generar reporte de más vistas.', 500);
  }
}

export async function reporteVentas(req: Request, res: Response) {
  try {
    const fi = parseFecha(req.query.fechaInicio);
    const ff = parseFecha(req.query.fechaFin);
    const [rows] = await pool.query('CALL sp_reporte_ventas(?, ?)', [fi, ff]);
    return ok(res, { reporte: (rows as any[])[0] });
  } catch (error) {
    console.error(error);
    return fail(res, 'Error al generar reporte de ventas.', 500);
  }
}

export async function historialCliente(req: Request, res: Response) {
  const idCliente = Number(req.params.idCliente);
  const usuario = req.user;

  if (!usuario) {
    return fail(res, 'Debe iniciar sesión para continuar.', 401);
  }

  if (usuario.idRol.includes('CLIENTE') && usuario.idUsuario !== idCliente) {
    return fail(res, 'No puede acceder al historial de otro cliente.', 403);
  }

  try {
    const [rows] = await pool.query(
      `SELECT
         v.idVenta,
         c.numero,
         p.titulo AS peliculaTitulo,
         f.fecha,
         f.horaInicio,
         s.tipo AS salaTipo,
         GROUP_CONCAT(CONCAT(a.fila, a.columna) ORDER BY a.fila, a.columna SEPARATOR ', ') AS asientos,
         v.montoTotal,
         v.estadoVenta
       FROM Comprobante c
       JOIN Venta v ON c.idVenta = v.idVenta
       JOIN Boleto b ON v.idVenta = b.idVenta
       JOIN Funcion f ON v.idFuncion = f.idFuncion
       JOIN Pelicula p ON f.idPelicula = p.idPelicula
       JOIN Sala s ON f.idSala = s.idSala
       JOIN Asiento a ON b.idAsiento = a.idAsiento
       WHERE v.idCliente = ?
         AND v.estadoA = 1
         AND v.estadoVenta IN ('COMPLETADA', 'CANCELADA')
       GROUP BY c.idComprobante, c.numero, p.titulo, f.fecha, f.horaInicio, s.tipo, v.montoTotal, v.estadoVenta, v.idVenta
       ORDER BY f.fecha DESC, f.horaInicio DESC;`,
      [idCliente]
    );
    return ok(res, { historial: rows as any[] });
  } catch (error) {
    console.error(error);
    return fail(res, 'Error al generar historial del cliente.', 500);
  }
}

function buildPdfTitle(doc: any, titulo: string, fechaInicio?: string | null, fechaFin?: string | null) {
  doc.fontSize(20).font('Helvetica-Bold').text(titulo, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('Cine La Paz', { align: 'center' });
  doc.moveDown(0.3);
  const rango = [fechaInicio, fechaFin].filter(Boolean).join(' al ') || 'Sin filtro de fechas';
  doc.text(`Rango: ${rango}`);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-BO')}`);
  doc.moveTo(40, doc.y + 5).lineTo(555, doc.y + 5).stroke();
  doc.moveDown(0.5);
}

function drawPdfTable(doc: any, headers: string[], rows: any[][]) {
  const colWidth = 515 / headers.length;
  const startX = 40;
  let y = doc.y;

  doc.fontSize(9).font('Helvetica-Bold');
  headers.forEach((h, i) => doc.text(h, startX + i * colWidth, y, { width: colWidth, align: 'left' }));
  y += 18;
  doc.moveTo(startX, y).lineTo(555, y).stroke();
  y += 5;

  doc.font('Helvetica').fontSize(8);
  for (const row of rows) {
    if (y > 760) {
      doc.addPage();
      y = 50;
      doc.font('Helvetica-Bold').fontSize(9);
      headers.forEach((h, i) => doc.text(h, startX + i * colWidth, y, { width: colWidth, align: 'left' }));
      y += 18;
      doc.moveTo(startX, y).lineTo(555, y).stroke();
      y += 5;
      doc.font('Helvetica').fontSize(8);
    }
    row.forEach((cell, i) => doc.text(String(cell ?? '—'), startX + i * colWidth, y, { width: colWidth, align: 'left' }));
    y += 16;
  }
  return y;
}

function sendPdf(res: Response, doc: any, chunks: Uint8Array[], filename: string) {
  return new Promise<void>((resolve) => {
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      res.send(buffer);
      resolve();
    });
    doc.end();
  });
}

export async function reporteOcupacionPdf(req: Request, res: Response) {
  try {
    const fi = parseFecha(req.query.fechaInicio);
    const ff = parseFecha(req.query.fechaFin);
    const [rows] = await pool.query('CALL sp_reporte_ocupacion(?, ?)', [fi, ff]);
    const data = (rows as any[])[0];

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));

    buildPdfTitle(doc, 'REPORTE DE OCUPACIÓN', fi, ff);

    const headers = ['Fecha', 'Sala', 'Tipo', 'Película', 'Hora', 'Capacidad', 'Vendidos', 'Ocupación %'];
    const tableRows = data.map((r: any) => [
      new Date(r.fecha).toLocaleDateString('es-BO'),
      r.idSala, r.salaTipo, r.pelicula, r.horaInicio?.substring(0, 5),
      r.capacidadTotal, r.boletosVendidos, `${r.ocupacionPorcentaje}%`
    ]);
    const endY = drawPdfTable(doc, headers, tableRows);

    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold').text(`Total registros: ${data.length}`, 40, endY + 10);

    await sendPdf(res, doc, chunks, 'reporte-ocupacion');
  } catch (error) {
    console.error(error);
    return fail(res, 'Error al generar PDF de ocupación.', 500);
  }
}

export async function reporteMasVistasPdf(req: Request, res: Response) {
  try {
    const fi = parseFecha(req.query.fechaInicio);
    const ff = parseFecha(req.query.fechaFin);
    const [rows] = await pool.query('CALL sp_reporte_mas_vistas(?, ?)', [fi, ff]);
    const data = (rows as any[])[0];

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));

    buildPdfTitle(doc, 'PELÍCULAS MÁS VISTAS', fi, ff);

    const headers = ['#', 'Película', 'Director', 'Boletos vendidos', 'Ingreso total (Bs.)'];
    const tableRows = data.map((r: any, i: number) => [
      i + 1, r.pelicula, r.director, r.totalBoletosVendidos, Number(r.ingresoTotal).toFixed(2)
    ]);
    const endY = drawPdfTable(doc, headers, tableRows);

    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold').text(`Total películas: ${data.length}`, 40, endY + 10);

    await sendPdf(res, doc, chunks, 'reporte-mas-vistas');
  } catch (error) {
    console.error(error);
    return fail(res, 'Error al generar PDF de más vistas.', 500);
  }
}

export async function reporteVentasPdf(req: Request, res: Response) {
  try {
    const fi = parseFecha(req.query.fechaInicio);
    const ff = parseFecha(req.query.fechaFin);
    const [rows] = await pool.query('CALL sp_reporte_ventas(?, ?)', [fi, ff]);
    const data = (rows as any[])[0];

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));

    buildPdfTitle(doc, 'REPORTE DE VENTAS', fi, ff);

    const headers = ['Fecha', 'Canal', 'Total ventas', 'Ingreso total (Bs.)', 'Venta promedio (Bs.)'];
    const tableRows = data.map((r: any) => [
      new Date(r.fecha).toLocaleDateString('es-BO'), r.canal,
      r.totalVentas, Number(r.ingresoTotal).toFixed(2), r.ventaPromedio
    ]);
    const endY = drawPdfTable(doc, headers, tableRows);

    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold').text(`Total registros: ${data.length}`, 40, endY + 10);

    await sendPdf(res, doc, chunks, 'reporte-ventas');
  } catch (error) {
    console.error(error);
    return fail(res, 'Error al generar PDF de ventas.', 500);
  }
}
