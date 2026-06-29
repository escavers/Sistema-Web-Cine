import PDFDocument from 'pdfkit';
import fs from 'fs';

// ── Types ───────────────────────────────────────────────────

export interface PdfDoc {
  doc: any;
  chunks: Uint8Array[];
}

export interface TableColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: (val: any) => string;
}

// ── Constants ───────────────────────────────────────────────

const PAGE_MARGIN = 40;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_WIDTH = PAGE_WIDTH - 2 * PAGE_MARGIN;
const ZEBRA_COLOR = '#f5f5f5';
const HEADER_BG = '#e8e8e8';

// ── Doc Creation ────────────────────────────────────────────

export function createPdfDoc(options?: { size?: any; margin?: number }): PdfDoc {
  const doc = new PDFDocument({
    size: options?.size || 'A4',
    margin: options?.margin || PAGE_MARGIN,
  });
  const chunks: Uint8Array[] = [];
  doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
  return { doc, chunks };
}

// ── Title Block ─────────────────────────────────────────────

export function buildPdfTitle(
  doc: any,
  titulo: string,
  fechaInicio?: string | null,
  fechaFin?: string | null,
) {
  checkPageSpace(doc, 100);

  // Nombre del cine grande en la esquina superior izquierda
  doc.fontSize(24).font('Helvetica-Bold').fillColor('#1a1a1a');
  doc.text('Cine La Paz', PAGE_MARGIN, doc.y, { align: 'left' });
  doc.moveDown(0.3);

  // Título del reporte debajo
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#333333');
  doc.text(titulo, PAGE_MARGIN, doc.y, { align: 'left' });
  doc.moveDown(0.2);

  // Rango de fechas
  const rango = [fechaInicio, fechaFin].filter(Boolean).join(' al ') || 'Sin filtro de fechas';
  doc.fontSize(9).font('Helvetica').fillColor('#666666');
  doc.text(`Rango: ${rango}`, PAGE_MARGIN, doc.y, { align: 'left' });
  doc.moveDown(0.3);

  // Línea separadora
  doc.moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_WIDTH - PAGE_MARGIN, doc.y).stroke();
  doc.moveDown(0.5);
}

// ── Bottom Info (fecha/hora + usuario) ──────────────────────

export function buildPdfBottomInfo(doc: any, usuario?: string) {
  checkPageSpace(doc, 40);

  doc.moveDown(0.5);
  doc.moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_WIDTH - PAGE_MARGIN, doc.y).stroke('#cccccc');
  doc.moveDown(0.3);

  const now = new Date();
  const fechaHora = now.toLocaleString('es-BO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  doc.fontSize(8).font('Helvetica').fillColor('#666666');
  doc.text(
    `Generado: ${fechaHora}${usuario ? ` | Usuario: ${usuario}` : ''}`,
    PAGE_MARGIN,
    doc.y,
    { width: CONTENT_WIDTH, align: 'left' },
  );
  doc.moveDown(0.3);
}

// ── Table Drawing ───────────────────────────────────────────

function textHeight(doc: any, text: string, opts: { width: number }): number {
  return doc.heightOfString(text, { width: opts.width, align: 'left' });
}

function checkPageSpace(doc: any, needed: number) {
  if (doc.y + needed > 780) {
    doc.addPage();
  }
}

export function drawPdfTable(
  doc: any,
  columns: TableColumn[],
  rows: any[][],
  options?: { fontSize?: number; zebra?: boolean },
) {
  const fontSize = options?.fontSize ?? 8;
  const useZebra = options?.zebra ?? true;
  const padding = 4;

  // Calcular anchos de columna
  const definedWidths = columns.filter(c => c.width).reduce((sum, c) => sum + (c.width || 0), 0);
  const remaining = CONTENT_WIDTH - definedWidths;
  const autoWidth = remaining / columns.filter(c => !c.width).length;
  let colWidths = columns.map(c => c.width || autoWidth);

  // Safeguard: escalar si los anchos exceden el espacio disponible
  const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);
  if (totalWidth > CONTENT_WIDTH) {
    const scale = CONTENT_WIDTH / totalWidth;
    colWidths = colWidths.map(w => w * scale);
  }

  let y = doc.y;

  // Header
  y = drawTableHeader(doc, columns, colWidths, y);

  // Rows
  doc.font('Helvetica').fontSize(fontSize);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];

    // Calcular altura máxima de esta fila
    let maxRowHeight = 0;
    row.forEach((cell, i) => {
      const h = textHeight(doc, String(cell ?? '—'), { width: colWidths[i] - padding * 2 });
      if (h > maxRowHeight) maxRowHeight = h;
    });
    maxRowHeight = Math.max(maxRowHeight, 14) + padding * 2;

    // Page break si no cabe
    if (y + maxRowHeight > 760) {
      doc.addPage();
      y = 50;
      y = drawTableHeader(doc, columns, colWidths, y);
      doc.font('Helvetica').fontSize(fontSize);
    }

    // Zebra stripe
    if (useZebra && r % 2 === 1) {
      doc.save();
      doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, maxRowHeight).fill(ZEBRA_COLOR);
      doc.restore();
    }

    // Dibujar celdas
    let x = PAGE_MARGIN;
    row.forEach((cell, i) => {
      const text = String(cell ?? '—');
      const align = columns[i]?.align || 'left';
      doc.fillColor('#333333').text(text, x + padding, y + padding, {
        width: colWidths[i] - padding * 2,
        align,
        lineGap: 1,
      });
      x += colWidths[i];
    });

    // Línea inferior sutil
    doc.save();
    doc.strokeColor('#e0e0e0').lineWidth(0.5);
    doc.moveTo(PAGE_MARGIN, y + maxRowHeight).lineTo(PAGE_WIDTH - PAGE_MARGIN, y + maxRowHeight).stroke();
    doc.restore();

    y += maxRowHeight;
  }

  return y;
}

function drawTableHeader(doc: any, columns: TableColumn[], colWidths: number[], y: number): number {
  const headerHeight = 22;

  // Fondo del header
  doc.save();
  doc.rect(PAGE_MARGIN, y, CONTENT_WIDTH, headerHeight).fill(HEADER_BG);
  doc.restore();

  // Texto del header
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#333333');
  let x = PAGE_MARGIN;
  columns.forEach((col, i) => {
    doc.text(col.header, x + 3, y + 4, {
      width: colWidths[i] - 6,
      align: col.align || 'left',
    });
    x += colWidths[i];
  });

  // Línea inferior del header
  doc.save();
  doc.strokeColor('#cccccc').lineWidth(1);
  doc.moveTo(PAGE_MARGIN, y + headerHeight).lineTo(PAGE_WIDTH - PAGE_MARGIN, y + headerHeight).stroke();
  doc.restore();

  return y + headerHeight + 4;
}

// ── Page Footer ─────────────────────────────────────────────

export function addPageFooters(doc: any) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).font('Helvetica').fillColor('#999999');
    doc.text(
      `Página ${i - range.start + 1} de ${range.count}`,
      PAGE_MARGIN,
      doc.page.height - 25,
      { width: CONTENT_WIDTH, align: 'center' },
    );
  }
}

// ── Send PDF ────────────────────────────────────────────────

export function sendPdf(res: any, doc: any, chunks: Uint8Array[], filename: string) {
  return new Promise<void>((resolve, reject) => {
    doc.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        res.send(buffer);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
    doc.end();
  });
}

export function sendPdfFile(doc: any, chunks: Uint8Array[], filePath: string) {
  return new Promise<void>((resolve, reject) => {
    doc.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(filePath, buffer);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
    doc.end();
  });
}

// ── Utility ─────────────────────────────────────────────────

export function formatDateEs(date: string | Date): string {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-BO');
  }
  return new Date(date).toLocaleDateString('es-BO');
}

export function formatMoney(val: number): string {
  return `Bs. ${val.toFixed(2)}`;
}
