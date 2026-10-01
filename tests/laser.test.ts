import { describe, expect, it } from 'vitest';
import { cellSpecFromDatasheet, datasheetById, DEFAULT_CONFIG, solve } from '../src/core';
import { buildLaserSvg, laserPathD, laserPrims, laserSheet } from '../src/export/laser';
import { buildLaserPdf } from '../src/export/pdf';
import { planSheets } from '../src/export/sheets';
import { activeParts, buildParts } from '../src/fishpaper/parts';
import { isClosedChain } from '../src/fishpaper/segments';
import { DEFAULT_FISHPAPER } from '../src/state/config';

const cell = cellSpecFromDatasheet(datasheetById('molicel-p50b')!);
const L = solve({ ...DEFAULT_CONFIG, cell, series: 20, booster: { series: 2, cellsPerRow: 2, position: 'plus' } });
const opts = { ...DEFAULT_FISHPAPER, outlineFace: 'tucked' as const, outlineWrap: 'tucked' as const, wrapFold: 6 };
const parts = buildParts(L, opts);
const meta = { title: '20S2P · P50B', date: '30.09.2026' };

describe('Laser-Export (Plan §5)', () => {
  const sheet = laserSheet(parts);
  const pr = laserPrims(sheet);

  it('eine Seite, alle aktiven Teile mit Anzahl, nichts gekachelt', () => {
    const plan = planSheets(parts, 'laser', 'tile');
    expect(plan.sheets.length).toBe(1);
    expect(plan.sheets[0].kind).toBe('laser');
    const pieces = activeParts(parts).reduce((a, p) => a + p.count, 0);
    expect(sheet.items.length).toBe(pieces);
    // jedes Teil vollständig (Ausschnitt = ganzes Teil), innerhalb der Seite
    for (const it of sheet.items) {
      expect(it.clip).toEqual({ x: 0, y: 0, w: it.part.w, h: it.part.h });
      const w = it.rotated ? it.part.h : it.part.w;
      const h = it.rotated ? it.part.w : it.part.h;
      expect(it.x + w).toBeLessThanOrEqual(sheet.w + 1e-9);
      expect(it.y + h).toBeLessThanOrEqual(sheet.h + 1e-9);
    }
    // Breite wie bisheriges SVG: max(300 mm, größtes Teilmaß) + 2 × 5 mm Rand
    const widest = Math.max(300, ...activeParts(parts).map((p) => Math.max(p.w, p.h)));
    expect(sheet.w).toBeLessThanOrEqual(widest + 10 + 1e-9);
  });

  it('jede Kontur ist ein einziger geschlossener Pfad; Umschlag-Einschnitte als eigene Schnittpfade', () => {
    const closed = pr.cut.filter((p) => p.closed);
    // je Teil-Stück eine Außenkontur (+ Schlitz, falls vorhanden)
    expect(closed.length).toBe(sheet.items.length);
    for (const p of closed) expect(isClosedChain(p.segs)).toBe(true);
    const slits = pr.cut.filter((p) => !p.closed);
    expect(slits.length).toBeGreaterThan(0);
    for (const s of slits) expect(s.segs.length).toBe(1);
  });

  it('SVG: Einheit mm, drei benannte Ebenen mit LightBurn-Farben, echte Bögen, echter Text', () => {
    const svg = buildLaserSvg(parts, 'Test');
    expect(svg).toMatch(/width="[\d.]+mm" height="[\d.]+mm" viewBox="0 0 [\d.]+ [\d.]+"/);
    expect(svg).toContain('inkscape:groupmode="layer" inkscape:label="00 Schnitt" fill="none" stroke="#000000"');
    expect(svg).toContain('inkscape:groupmode="layer" inkscape:label="01 Markierung" fill="none" stroke="#0000FF"');
    expect(svg).toContain('inkscape:groupmode="layer" inkscape:label="02 Text" fill="#FF0000"');
    expect(svg).toMatch(/A10\.975 10\.975 0 0 [01] /);
    expect(svg).toContain('>Stirnseite vorne – Pack A<');
    // keine Falzlinien, Biegeflächen oder Kontrollquadrat
    expect(svg).not.toContain('stroke-dasharray');
    expect(svg).not.toContain('#e8e8e8');
    expect(svg).not.toContain('Kontrollquadrat');
    // jeder Schnitt-Pfad beginnt mit genau einem M
    const cutLayer = svg.split('inkscape:label="00 Schnitt"')[1].split('</g>')[0];
    for (const d of cutLayer.match(/d="[^"]*"/g)!) expect(d.match(/M/g)!.length).toBe(1);
  });

  it('SVG-Pfad: Vollkreis der Anschlussmarke als vier Bögen ≤ 90°', () => {
    const circle = pr.mark.find((p) => p.closed && p.segs.length === 1 && p.segs[0].kind === 'arc')!;
    const d = laserPathD(circle);
    expect(d.match(/A/g)!.length).toBe(4);
    expect(d.endsWith('Z')).toBe(true);
  });

  it('PDF: eine Seite in Gesamtgröße, Bézier-Kurven (c), Farben je Ebene, echter Text, kein Kontrollquadrat', () => {
    const doc = buildLaserPdf(sheet, meta);
    expect(doc.getNumberOfPages()).toBe(1);
    const box = doc.getPageInfo(1).pageContext.mediaBox;
    expect((box.topRightX - box.bottomLeftX) / (72 / 25.4)).toBeCloseTo(sheet.w, 1);
    expect((box.topRightY - box.bottomLeftY) / (72 / 25.4)).toBeCloseTo(sheet.h, 1);
    const out = doc.output();
    const stream = out.match(/stream\r?\n([\s\S]*?)endstream/g)!.find((s) => s.includes(' c\n'))!;
    expect(stream).toMatch(/[\d.-]+ [\d.-]+ [\d.-]+ [\d.-]+ [\d.-]+ [\d.-]+ c\n/);
    // Schwarz schreibt jsPDF als Grauwert „0 G“
    expect(stream).toMatch(/\n0 G\n|0\.? 0\.? 0\.? RG/);
    expect(stream).toMatch(/0\.? 0\.? 1\.? RG/);
    expect(stream).toMatch(/1\.? 0\.? 0\.? rg/);
    // echter Text (Tj-Operator), Gedankenstrich im WinAnsi-Zeichensatz
    expect(stream).toMatch(/\(Stirnseite vorne .{1,3} Pack A\) Tj/);
    expect(stream).not.toMatch(/141\.73\d* -141\.73\d* re/);
    expect(stream).not.toContain('100 % drucken');
    // keine gestrichelten Linien (Falz)
    expect(stream).not.toMatch(/\[[\d. ]+\] [\d.]+ d/);
  });
});
