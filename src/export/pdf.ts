/**
 * PDF-Export 1:1 (jsPDF, unit 'mm', nur Vektoren). Auf jeder Seite: Kopfzeile, Kontrollquadrat 50 mm,
 * 100-mm-Lineal und der Hinweis „100 % drucken“.
 */
import { jsPDF } from 'jspdf';
import { arcToBeziers, segStart2 } from '../fishpaper/segments';
import type { Path2 } from '../fishpaper/types';
import type { LaserPath } from './laser';
import { LASER_LAYERS, laserPrims } from './laser';
import type { PageText } from './render';
import { pdfSafe, sheetPrims } from './render';
import type { Sheet, SheetPlan } from './sheets';
import { CONTROL_SQUARE, MARGIN } from './sheets';

const PT_PER_MM = 72 / 25.4;
const LINE = {
  cut: { width: 0.25, color: 0, dash: [] as number[] },
  fold: { width: 0.2, color: 60, dash: [2, 1.5] },
  mark: { width: 0.15, color: 150, dash: [] as number[] },
};

export interface PdfMeta {
  /** z. B. "18S2P · 21700 · Wabe links · 0,3 mm" */
  title: string;
  /** z. B. "30.09.2026" */
  date: string;
}

function strokePaths(doc: jsPDF, paths: Path2[], style: (typeof LINE)[keyof typeof LINE]) {
  doc.setLineWidth(style.width);
  doc.setDrawColor(style.color);
  doc.setLineDashPattern(style.dash, 0);
  for (const p of paths) {
    if (p.pts.length < 2) continue;
    doc.moveTo(p.pts[0].x, p.pts[0].y);
    for (let i = 1; i < p.pts.length; i++) doc.lineTo(p.pts[i].x, p.pts[i].y);
    if (p.closed) doc.close();
    doc.stroke();
  }
  doc.setLineDashPattern([], 0);
}

function fillPaths(doc: jsPDF, paths: Path2[], grey: number) {
  doc.setFillColor(grey, grey, grey);
  for (const p of paths) {
    doc.moveTo(p.pts[0].x, p.pts[0].y);
    for (let i = 1; i < p.pts.length; i++) doc.lineTo(p.pts[i].x, p.pts[i].y);
    doc.close();
    doc.fill();
  }
}

/** Raute ◆ als Vektor (nicht im Standardzeichensatz). */
function diamond(doc: jsPDF, x: number, yBase: number, size: number) {
  const r = size * 0.38;
  const cy = yBase - size * 0.36;
  doc.setFillColor(0, 0, 0);
  doc.moveTo(x + r, cy - r);
  doc.lineTo(x + 2 * r, cy);
  doc.lineTo(x + r, cy + r);
  doc.lineTo(x, cy);
  doc.close();
  doc.fill();
  return 2 * r + size * 0.12;
}

/** Text mit Anker und Drehung; ◆ wird als Vektor gezeichnet (nur ungedreht). */
export function drawText(
  doc: jsPDF,
  t: Pick<PageText, 'x' | 'y' | 'text' | 'size' | 'anchor' | 'angle'>,
  bold = false,
  rgb: readonly [number, number, number] = [0, 0, 0],
) {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(t.size * PT_PER_MM);
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const text = pdfSafe(t.text);
  const parts = text.split('◆');
  const dW = t.size * 0.88;
  const width = parts.reduce((a, s) => a + doc.getTextWidth(s), 0) + (parts.length - 1) * dW;
  const shift = t.anchor === 'middle' ? width / 2 : t.anchor === 'end' ? width : 0;
  const a = (t.angle * Math.PI) / 180;
  const dir = { x: Math.cos(a), y: -Math.sin(a) };
  let x = t.x - dir.x * shift;
  const y = t.y - dir.y * shift;
  if (t.angle !== 0) {
    doc.text(parts.join(''), x, y, { angle: t.angle });
    return;
  }
  parts.forEach((s, i) => {
    if (i > 0) x += diamond(doc, x, y, t.size);
    if (s) doc.text(s, x, y);
    x += doc.getTextWidth(s);
  });
}

/** Kontrollquadrat 50 × 50 mm, 100-mm-Lineal und Druckhinweis im Fußbereich. */
export function drawControls(doc: jsPDF, pageW: number, pageH: number) {
  const sx = MARGIN;
  const sy = pageH - MARGIN - CONTROL_SQUARE;
  doc.setLineDashPattern([], 0);
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(sx, sy, CONTROL_SQUARE, CONTROL_SQUARE); // exakt 50 mm = 141,73 pt
  drawText(
    doc,
    { x: sx + CONTROL_SQUARE / 2, y: sy + CONTROL_SQUARE / 2 - 1, text: 'Kontrollquadrat', size: 3, anchor: 'middle', angle: 0 },
    true,
  );
  drawText(doc, {
    x: sx + CONTROL_SQUARE / 2,
    y: sy + CONTROL_SQUARE / 2 + 4,
    text: '50 × 50 mm',
    size: 3,
    anchor: 'middle',
    angle: 0,
  });
  // Lineal
  const rx = sx + CONTROL_SQUARE + 6;
  const ry = pageH - MARGIN - 6;
  doc.setLineWidth(0.15);
  doc.line(rx, ry, rx + 100, ry);
  for (let i = 0; i <= 100; i++) {
    const len = i % 10 === 0 ? 4 : i % 5 === 0 ? 2.5 : 1.5;
    doc.line(rx + i, ry, rx + i, ry - len);
    if (i % 10 === 0) drawText(doc, { x: rx + i, y: ry + 3.5, text: String(i / 10), size: 2.2, anchor: 'middle', angle: 0 });
  }
  drawText(doc, { x: rx + 101.5, y: ry + 3.5, text: 'cm', size: 2.2, anchor: 'start', angle: 0 });
  const nx = rx;
  const ny = sy + 4;
  const avail = pageW - MARGIN - nx;
  const size = Math.min(3.2, avail / 38);
  drawText(doc, { x: nx, y: ny, text: 'In Originalgröße / 100 % drucken –', size, anchor: 'start', angle: 0 }, true);
  drawText(doc, { x: nx, y: ny + size * 1.4, text: 'NICHT „An Seite anpassen“.', size, anchor: 'start', angle: 0 }, true);
  drawText(doc, { x: nx, y: ny + size * 2.8, text: 'Kontrollquadrat nachmessen.', size, anchor: 'start', angle: 0 });
  // Linienarten
  const ly = ny + size * 4.8;
  const seg = (y: number, st: (typeof LINE)[keyof typeof LINE], label: string) => {
    doc.setLineWidth(st.width);
    doc.setDrawColor(st.color);
    doc.setLineDashPattern(st.dash, 0);
    doc.line(nx, y - 0.8, nx + 10, y - 0.8);
    doc.setLineDashPattern([], 0);
    drawText(doc, { x: nx + 12, y, text: label, size: 2.4, anchor: 'start', angle: 0 });
  };
  seg(ly, LINE.cut, 'Schnitt');
  seg(ly + 3.6, LINE.fold, 'Falz / Biegung');
  seg(ly + 7.2, LINE.mark, 'Markierung');
  doc.setDrawColor(0);
}

function drawHeader(doc: jsPDF, meta: PdfMeta, page: number, pages: number, pageW: number) {
  drawText(
    doc,
    { x: MARGIN, y: MARGIN + 3.5, text: `Fishpaper-Schnittvorlage · ${meta.title}`, size: 3.2, anchor: 'start', angle: 0 },
    true,
  );
  drawText(doc, {
    x: pageW - MARGIN,
    y: MARGIN + 3.5,
    text: `${meta.date} · Seite ${page}/${pages}`,
    size: 3.2,
    anchor: 'end',
    angle: 0,
  });
  doc.setLineWidth(0.1);
  doc.setDrawColor(180);
  doc.line(MARGIN, MARGIN + 5, pageW - MARGIN, MARGIN + 5);
}

function drawSheet(doc: jsPDF, sheet: Sheet) {
  const pr = sheetPrims(sheet);
  fillPaths(doc, pr.zones, 232);
  strokePaths(doc, pr.marks, LINE.mark);
  strokePaths(doc, pr.fold, LINE.fold);
  strokePaths(doc, pr.cut, LINE.cut);
  for (const t of pr.texts) drawText(doc, t);
}

const orient = (w: number, h: number) => (w > h ? 'l' : 'p') as 'l' | 'p';

export function buildPdf(plan: SheetPlan, meta: PdfMeta): jsPDF {
  const first = plan.sheets[0];
  const doc = new jsPDF({ unit: 'mm', format: [first.w, first.h], orientation: orient(first.w, first.h), compress: false });
  doc.setProperties({ title: `Fishpaper ${meta.title}`, creator: 'Akku-Konfigurator' });
  plan.sheets.forEach((s, i) => {
    if (i > 0) doc.addPage([s.w, s.h], orient(s.w, s.h));
    drawHeader(doc, meta, i + 1, plan.sheets.length, s.w);
    drawSheet(doc, s);
    drawControls(doc, s.w, s.h);
  });
  return doc;
}

/** Laser-Pfad: ein zusammenhängender Pfad, Bögen als kubische Bézier (≤ 90° je Stück). */
function strokeLaserPaths(doc: jsPDF, paths: LaserPath[], rgb: readonly [number, number, number]) {
  doc.setLineWidth(0.1);
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.setLineDashPattern([], 0);
  for (const p of paths) {
    if (!p.segs.length) continue;
    const s0 = segStart2(p.segs[0]);
    doc.moveTo(s0.x, s0.y);
    for (const s of p.segs) {
      if (s.kind === 'line') doc.lineTo(s.b.x, s.b.y);
      else for (const [c1, c2, e] of arcToBeziers(s)) doc.curveTo(c1.x, c1.y, c2.x, c2.y, e.x, e.y);
    }
    if (p.closed) doc.close();
    doc.stroke();
  }
}

/**
 * Laser-PDF: eine Seite in Gesamtgröße, 1:1 in mm. Trennung der Ebenen nur über die Farbe
 * (Schnitt schwarz, Markierung blau, Text rot als echter Text in Helvetica).
 */
export function buildLaserPdf(sheet: Sheet, meta: PdfMeta): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: [sheet.w, sheet.h], orientation: orient(sheet.w, sheet.h), compress: false });
  doc.setProperties({ title: `Fishpaper Laser ${meta.title}`, creator: 'Akku-Konfigurator' });
  const pr = laserPrims(sheet);
  strokeLaserPaths(doc, pr.cut, LASER_LAYERS.cut.rgb);
  strokeLaserPaths(doc, pr.mark, LASER_LAYERS.mark.rgb);
  for (const t of pr.texts) drawText(doc, t, false, LASER_LAYERS.text.rgb);
  return doc;
}

export function pdfFileName(series: number, parallel: number, cell: string, date: Date, laser = false): string {
  const d = date.toISOString().slice(0, 10);
  return `fishpaper${laser ? '_laser' : ''}_${series}S${parallel}P_${cell.replace(/[^\w-]+/g, '')}_${d}.pdf`;
}

export { PT_PER_MM };
