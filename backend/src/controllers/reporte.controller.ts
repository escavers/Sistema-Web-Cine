import type { Request, Response } from 'express';
import { pool } from '../config/db.js';
import { ok, fail } from '../utils/response.js';
import {
  createPdfDoc, buildPdfTitle, buildPdfBottomInfo, drawPdfTable,
  addPageFooters, sendPdf, formatDateEs, formatMoney,
  type TableColumn,
} from '../utils/pdfHelpers.js';

function parseFecha(v: unknown): string | null {
  if (!v || typeof v !== 'string') return null;
  return v.trim() || null;
}

function parseId(v: unknown): number | null {
  if (!v || v === '' || v === '0') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function parseStr(v: unknown): string | null {
  if (!v || typeof v !== 'string') return null;
  return v.trim() || null;
}

async function getNombreUsuario(idUsuario: number): Promise<string> {
  const [rows] = await pool.query(
    'SELECT nombre1, apellidoP FROM Usuario WHERE idUsuario = ?',
    [idUsuario]
  );
  if ((rows as any[]).length) {
    const u = (rows as any[])[0];
    return `${u.nombre1} ${u.apellidoP}`.trim();
  }
  return 'Desconocido';
}

// ── JSON endpoints ──────────────────────────────────────────

export async function reporteOcupacion(req: Request, res: Response) {
  try {
    const fi = parseFecha(req.query.fechaInicio);
    const ff = parseFecha(req.query.fechaFin);
    const idPel = parseId(req.query.idPelicula);
    const idSala = parseStr(req.query.idSala);
    const [rows] = await pool.query('CALL sp_reporte_ocupacion(?, ?, ?, ?)', [fi, ff, idPel, idSala]);
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
    const orden = req.query.orden === 'ASC' ? 'ASC' : 'DESC';
    const [rows] = await pool.query('CALL sp_reporte_mas_vistas(?, ?, ?)', [fi, ff, orden]);
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
    const [rows] = await pool.query('CALL sp_historial_cliente(?)', [idCliente]);
    return ok(res, { historial: (rows as any[])[0] });
  } catch (error) {
    console.error(error);
    return fail(res, 'Error al generar historial del cliente.', 500);
  }
}

// ── PDF endpoints ───────────────────────────────────────────

export async function reporteOcupacionPdf(req: Request, res: Response) {
  try {
    const fi = parseFecha(req.query.fechaInicio);
    const ff = parseFecha(req.query.fechaFin);
    const idPel = parseId(req.query.idPelicula);
    const idSala = parseStr(req.query.idSala);
    const [rows] = await pool.query('CALL sp_reporte_ocupacion(?, ?, ?, ?)', [fi, ff, idPel, idSala]);
    const data = (rows as any[])[0];

    const nombreUsuario = req.user ? await getNombreUsuario(req.user.idUsuario) : 'Desconocido';

    const { doc, chunks } = createPdfDoc();
    buildPdfTitle(doc, 'REPORTE DE OCUPACIÓN', fi, ff);

    const columns: TableColumn[] = [
      { header: 'Fecha', key: 'fecha', width: 65 },
      { header: 'Sala', key: 'sala', width: 50 },
      { header: 'Tipo', key: 'tipo', width: 55 },
      { header: 'Película', key: 'pelicula', width: 120 },
      { header: 'Hora', key: 'hora', width: 40 },
      { header: 'Cap.', key: 'cap', width: 40, align: 'right' },
      { header: 'Vendidos', key: 'vendidos', width: 50, align: 'right' },
      { header: 'Disp.', key: 'disp', width: 40, align: 'right' },
      { header: '% Ocup.', key: 'ocup', width: 55, align: 'right' },
    ];

    const tableRows = data.map((r: any) => [
      formatDateEs(r.fecha),
      r.idSala,
      r.salaTipo,
      r.pelicula,
      r.horaInicio?.substring(0, 5),
      r.capacidadTotal,
      r.boletosVendidos,
      r.asientosDisponibles,
      `${r.ocupacionPorcentaje}%`,
    ]);

    const endY = drawPdfTable(doc, columns, tableRows);

    if (endY + 30 > 760) doc.addPage();
    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333');
    doc.text(`Total registros: ${data.length}`, 40);

    buildPdfBottomInfo(doc, nombreUsuario);
    addPageFooters(doc);
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
    const orden = req.query.orden === 'ASC' ? 'ASC' : 'DESC';
    const [rows] = await pool.query('CALL sp_reporte_mas_vistas(?, ?, ?)', [fi, ff, orden]);
    const data = (rows as any[])[0];

    const nombreUsuario = req.user ? await getNombreUsuario(req.user.idUsuario) : 'Desconocido';

    const { doc, chunks } = createPdfDoc();
    buildPdfTitle(doc, 'PELÍCULAS MÁS VISTAS', fi, ff);

    const columns: TableColumn[] = [
      { header: '#', key: 'num', width: 25, align: 'center' },
      { header: 'Película', key: 'pelicula', width: 120 },
      { header: 'Director', key: 'director', width: 100 },
      { header: 'Boletos', key: 'boletos', width: 50, align: 'right' },
      { header: 'Ingreso (Bs.)', key: 'ingreso', width: 70, align: 'right' },
      { header: '% Ocup.', key: 'ocup', width: 45, align: 'right' },
      { header: 'Funciones', key: 'funciones', width: 50, align: 'right' },
      { header: 'Semanas', key: 'semanas', width: 55, align: 'right' },
    ];

    const tableRows = data.map((r: any, i: number) => [
      i + 1,
      r.pelicula,
      r.director,
      r.totalBoletosVendidos,
      formatMoney(Number(r.ingresoTotal)),
      `${r.promedioOcupacion}%`,
      r.cantidadFunciones,
      r.semanasEnCartelera,
    ]);

    const endY = drawPdfTable(doc, columns, tableRows);

    if (endY + 30 > 760) doc.addPage();
    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333');
    doc.text(`Total películas: ${data.length}`, 40);

    buildPdfBottomInfo(doc, nombreUsuario);
    addPageFooters(doc);
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

    const nombreUsuario = req.user ? await getNombreUsuario(req.user.idUsuario) : 'Desconocido';

    const { doc, chunks } = createPdfDoc();
    buildPdfTitle(doc, 'REPORTE DE VENTAS', fi, ff);

    const columns: TableColumn[] = [
      { header: 'ID', key: 'id', width: 28, align: 'center' },
      { header: 'Fecha', key: 'fecha', width: 52 },
      { header: 'Cliente', key: 'cliente', width: 85 },
      { header: 'Película', key: 'pelicula', width: 90 },
      { header: 'Sala', key: 'sala', width: 45 },
      { header: 'Entradas', key: 'entradas', width: 42, align: 'right' },
      { header: 'Monto', key: 'monto', width: 60, align: 'right' },
      { header: 'Pago', key: 'pago', width: 48 },
      { header: 'Estado', key: 'estado', width: 65 },
    ];

    const tableRows = data.map((r: any) => [
      r.idVenta,
      formatDateEs(r.fechaCompra),
      r.cliente,
      r.pelicula,
      r.sala,
      r.cantidadEntradas,
      formatMoney(Number(r.montoTotal)),
      r.metodoPago,
      r.estadoVenta,
    ]);

    const endY = drawPdfTable(doc, columns, tableRows);

    if (endY + 30 > 760) doc.addPage();
    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333');
    doc.text(`Total ventas: ${data.length}`, 40);

    buildPdfBottomInfo(doc, nombreUsuario);
    addPageFooters(doc);
    await sendPdf(res, doc, chunks, 'reporte-ventas');
  } catch (error) {
    console.error(error);
    return fail(res, 'Error al generar PDF de ventas.', 500);
  }
}
