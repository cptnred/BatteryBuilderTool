/**
 * SVG-Export in mm für Schneideplotter (Cricut, Silhouette, Laser):
 * alle aktiven Teile auf einer Fläche, Schnitt-, Falz- und Markierungslinien in getrennten Ebenen.
 */
import { shelfPack } from '../fishpaper/nesting';
import { activeParts } from '../fishpaper/parts';
import type { Part, Path2 } from '../fishpaper/types';
import type { PageText, Prims } from './render';
import { sheetPrims } from './render';
import type { Sheet } from './sheets';

const r2 = (v: number) => +v.toFixed(3);

export function pathD(p: Path2): string {
  return p.pts.map((q, i) => `${i ? 'L' : 'M'}${r2(q.x)} ${r2(q.y)}`).join('') + (p.closed ? 'Z' : '');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function textEl(t: PageText): string {
  const anchor = t.anchor === 'middle' ? 'middle' : t.anchor === 'end' ? 'end' : 'start';
  const rot = t.angle ? ` transform="rotate(${-t.angle} ${r2(t.x)} ${r2(t.y)})"` : '';
  return `<text x="${r2(t.x)}" y="${r2(t.y)}" font-size="${r2(t.size)}" text-anchor="${anchor}"${rot}>${esc(t.text)}</text>`;
}

/** Alle Teile (mit Anzahl) auf einer Fläche anordnen. Breite ≈ breitestes Teil, mindestens 300 mm. */
export function layoutAllParts(parts: Part[], gap = 5): Sheet {
  const act = activeParts(parts);
  const items = act.flatMap((p) => Array.from({ length: p.count }, (_, c) => ({ id: `${p.id}#${c}`, w: p.w, h: p.h })));
  const binW = Math.max(300, ...act.map((p) => Math.max(p.w, p.h)));
  const placed = shelfPack(items, binW, 1e6, gap);
  const byId = new Map(act.map((p) => [p.id, p]));
  const m = 5;
  const sheet: Sheet = { w: 0, h: 0, kind: 'plotter', items: [] };
  for (const pl of placed) {
    const part = byId.get(pl.id.split('#')[0])!;
    sheet.items.push({ part, clip: { x: 0, y: 0, w: part.w, h: part.h }, x: m + pl.x, y: m + pl.y, rotated: pl.rotated });
  }
  sheet.w = Math.max(...placed.map((p) => p.x + p.w)) + 2 * m;
  sheet.h = Math.max(...placed.map((p) => p.y + p.h)) + 2 * m;
  return sheet;
}

export function primsToSvg(pr: Prims, w: number, h: number, title: string): string {
  const g = (id: string, label: string, attrs: string, body: string) =>
    `<g id="${id}" inkscape:groupmode="layer" inkscape:label="${label}" ${attrs}>${body}</g>`;
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${r2(w)}mm" height="${r2(h)}mm" viewBox="0 0 ${r2(w)} ${r2(h)}">`,
    `<title>${esc(title)}</title>`,
    g('biegebereiche', 'Biegebereiche', 'fill="#e8e8e8" stroke="none"', pr.zones.map((p) => `<path d="${pathD(p)}"/>`).join('')),
    g(
      'markierung',
      'Markierung',
      'fill="none" stroke="#999" stroke-width="0.15"',
      pr.marks.map((p) => `<path d="${pathD(p)}"/>`).join(''),
    ),
    g(
      'falz',
      'Falz',
      'fill="none" stroke="#3c3c3c" stroke-width="0.2" stroke-dasharray="2 1.5"',
      pr.fold.map((p) => `<path d="${pathD(p)}"/>`).join(''),
    ),
    g(
      'schnitt',
      'Schnitt',
      'fill="none" stroke="#000" stroke-width="0.25"',
      pr.cut.map((p) => `<path d="${pathD(p)}"/>`).join(''),
    ),
    g('text', 'Beschriftung', 'fill="#000" font-family="Helvetica, Arial, sans-serif"', pr.texts.map(textEl).join('')),
    `</svg>`,
  ].join('\n');
}

export function buildSvg(parts: Part[], title: string): string {
  const sheet = layoutAllParts(parts);
  return primsToSvg(sheetPrims(sheet), sheet.w, sheet.h, title);
}
