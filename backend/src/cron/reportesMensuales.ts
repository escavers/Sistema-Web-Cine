import cron from 'node-cron';
import { pool } from '../config/db.js';
import {
  createPdfDoc, buildPdfTitle, buildPdfBottomInfo, drawPdfTable,
  addPageFooters, sendPdfFile, formatDateEs, formatMoney,
  type TableColumn,
} from '../utils/pdfHelpers.js';
import fs from 'fs';
import path from 'path';

const REPORT_DIR = path.resolve('reportes-mensuales');

function getMesAnterior(): { fechaInicio: string; fechaFin: string; etiqueta: string; nombreArchivo: string } {
  const ahora = new Date();
  const primerDiaMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const ultimoDiaMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0);

  const fi = `${primerDiaMesAnterior.getFullYear()}-${String(primerDiaMesAnterior.getMonth() + 1).padStart(2, '0')}-${String(primerDiaMesAnterior.getDate()).padStart(2, '0')}`;
  const ff = `${ultimoDiaMesAnterior.getFullYear()}-${String(ultimoDiaMesAnterior.getMonth() + 1).padStart(2, '0')}-${String(ultimoDiaMesAnterior.getDate()).padStart(2, '0')}`;

  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const mes = meses[primerDiaMesAnterior.getMonth()];
  const anio = primerDiaMesAnterior.getFullYear();

  return {
    fechaInicio: fi,
    fechaFin: ff,
    etiqueta: `${mes} ${anio}`,
    nombreArchivo: `${anio}-${String(primerDiaMesAnterior.getMonth() + 1).padStart(2, '0')}`,
  };
}

async function generarReporteOcupacion(fi: string, ff: string, nombreArchivo: string) {
  const [rows] = await pool.query('CALL sp_reporte_ocupacion(?, ?, ?, ?)', [fi, ff, null, null]);
  const data = (rows as any[])[0];

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
    formatDateEs(r.fecha), r.idSala, r.salaTipo, r.pelicula,
    r.horaInicio?.substring(0, 5), r.capacidadTotal, r.boletosVendidos,
    r.asientosDisponibles, `${r.ocupacionPorcentaje}%`,
  ]);

  const endY = drawPdfTable(doc, columns, tableRows);

  if (endY + 30 > 760) doc.addPage();
  doc.moveDown(1);
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333');
  doc.text(`Total registros: ${data.length}`, 40);

  buildPdfBottomInfo(doc, 'Sistema Automático');
  addPageFooters(doc);
  await sendPdfFile(doc, chunks, path.join(REPORT_DIR, `reporte-ocupacion-${nombreArchivo}.pdf`));
}

async function generarReporteMasVistas(fi: string, ff: string, nombreArchivo: string) {
  const [rows] = await pool.query('CALL sp_reporte_mas_vistas(?, ?, ?)', [fi, ff, 'DESC']);
  const data = (rows as any[])[0];

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
    i + 1, r.pelicula, r.director, r.totalBoletosVendidos,
    formatMoney(Number(r.ingresoTotal)), `${r.promedioOcupacion}%`,
    r.cantidadFunciones, r.semanasEnCartelera,
  ]);

  const endY = drawPdfTable(doc, columns, tableRows);

  if (endY + 30 > 760) doc.addPage();
  doc.moveDown(1);
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333');
  doc.text(`Total películas: ${data.length}`, 40);

  buildPdfBottomInfo(doc, 'Sistema Automático');
  addPageFooters(doc);
  await sendPdfFile(doc, chunks, path.join(REPORT_DIR, `reporte-mas-vistas-${nombreArchivo}.pdf`));
}

async function generarReporteVentas(fi: string, ff: string, nombreArchivo: string) {
  const [rows] = await pool.query('CALL sp_reporte_ventas(?, ?)', [fi, ff]);
  const data = (rows as any[])[0];

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
    r.idVenta, formatDateEs(r.fechaCompra), r.cliente, r.pelicula,
    r.sala, r.cantidadEntradas, formatMoney(Number(r.montoTotal)),
    r.metodoPago, r.estadoVenta,
  ]);

  const endY = drawPdfTable(doc, columns, tableRows);

  if (endY + 30 > 760) doc.addPage();
  doc.moveDown(1);
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333');
  doc.text(`Total ventas: ${data.length}`, 40);

  buildPdfBottomInfo(doc, 'Sistema Automático');
  addPageFooters(doc);
  await sendPdfFile(doc, chunks, path.join(REPORT_DIR, `reporte-ventas-${nombreArchivo}.pdf`));
}

async function generarReportesMensuales() {
  const { fechaInicio, fechaFin, etiqueta, nombreArchivo } = getMesAnterior();

  console.log(`[Reportes Mensuales] Generando reportes de ${etiqueta} (${fechaInicio} al ${fechaFin})...`);

  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  try {
    await Promise.all([
      generarReporteOcupacion(fechaInicio, fechaFin, nombreArchivo),
      generarReporteMasVistas(fechaInicio, fechaFin, nombreArchivo),
      generarReporteVentas(fechaInicio, fechaFin, nombreArchivo),
    ]);
    console.log(`[Reportes Mensuales] Reportes de ${etiqueta} generados correctamente en ${REPORT_DIR}`);
  } catch (error) {
    console.error(`[Reportes Mensuales] Error al generar reportes de ${etiqueta}:`, error);
  }
}

export function iniciarReportesMensuales() {
  cron.schedule('0 0 1 * *', () => {
    generarReportesMensuales();
  });
  console.log('[Cron] Reportes mensuales programados: día 1 de cada mes a las 00:00');
}
