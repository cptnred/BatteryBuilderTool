/**
 * Laser-Export (Plan §5): alle aktiven Teile auf EINER Seite in Gesamtgröße, nichts gekachelt.
 * Keine Falzlinien, Biegemarken oder Biegeflächen; kein Kontrollquadrat, Lineal oder Kopfzeile (Nutzerentscheidung).
 * Ebenen nach LightBurn-Standardfarben: Schnitt #000000 (00), Markierung #0000FF (01), Text #FF0000 (02).
 * Jede Kontur ist ein einziger Pfad mit echten Bögen (SVG „A“, PDF kubische Bézier ≤ 90°).
 */
import { mapSegs, pathSegs, segStart2, splitArc } from '../fishpaper/segments';
import type { Part, Seg2 } from '../fishpaper/types';
import type { PageText } from './render';
import { itemTransform } from './render';
import type { Sheet } from './sheets';
import { layoutAllParts } from './svg';

export const LASER_LAYERS = {
  cut: { id: 'schnitt', label: '00 Schnitt', color: '#000000', rgb: [0, 0, 0] },
  mark: { id: 'markierung', label: '01 Markierung', color: '#0000FF', rgb: [0, 0, 255] },
  text: { id: 'text', label: '02 Text', color: '#FF0000', rgb: [255, 0, 0] },
} as const;

export interface LaserPath {
  segs: Seg2[];
  closed: boolean;
}

export interface LaserPrims {
  cut: LaserPath[];
  mark: LaserPath[];
  texts: PageText[];
}

/** Eine Seite mit allen aktiven Teilen (Anzahl berücksichtigt), Regal-Packing wie beim bisherigen SVG. */
export function laserSheet(parts: Part[]): Sheet {
  return { ...layoutAllParts(parts), kind: 'laser' };
}

export function laserPrims(sheet: Sheet): LaserPrims {
  const out: LaserPrims = { cut: [], mark: [], texts: [] };
  for (const it of sheet.items) {
    const T = itemTransform(it);
    const map = (paths: Part['cut']) => paths.map((p) => ({ segs: mapSegs(pathSegs(p), T), closed: p.closed }));
    out.cut.push(...map(it.part.cut));
    out.mark.push(...map(it.part.marks));
    out.texts.push(...it.part.texts.map((t) => ({ ...t, ...T(t), angle: (t.rotate ?? 0) - (it.rotated ? 90 : 0) })));
  }
  return out;
}

const r3 = (v: number) => +v.toFixed(4);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** SVG-Pfad mit echten Bögen: M, L, A, Z. */
export function laserPathD(p: LaserPath): string {
  if (!p.segs.length) return '';
  const s0 = segStart2(p.segs[0]);
  let d = `M${r3(s0.x)} ${r3(s0.y)}`;
  for (const s of p.segs) {
    if (s.kind === 'line') d += `L${r3(s.b.x)} ${r3(s.b.y)}`;
    else
      for (const a of splitArc(s, Math.PI / 2)) {
        const e = { x: a.c.x + a.r * Math.cos(a.a1), y: a.c.y + a.r * Math.sin(a.a1) };
        // y nach unten: wachsender Winkel = Sweep-Flag 1
        d += `A${r3(a.r)} ${r3(a.r)} 0 0 ${a.a1 > a.a0 ? 1 : 0} ${r3(e.x)} ${r3(e.y)}`;
      }
  }
  return d + (p.closed ? 'Z' : '');
}

function laserText(t: PageText): string {
  const anchor = t.anchor === 'middle' ? 'middle' : t.anchor === 'end' ? 'end' : 'start';
  const rot = t.angle ? ` transform="rotate(${-t.angle} ${r3(t.x)} ${r3(t.y)})"` : '';
  return `<text x="${r3(t.x)}" y="${r3(t.y)}" font-size="${r3(t.size)}" text-anchor="${anchor}"${rot}>${esc(t.text)}</text>`;
}

export function buildLaserSvg(parts: Part[], title: string): string {
  const sheet = laserSheet(parts);
  const pr = laserPrims(sheet);
  const layer = (l: (typeof LASER_LAYERS)[keyof typeof LASER_LAYERS], attrs: string, body: string) =>
    `<g id="${l.id}" inkscape:groupmode="layer" inkscape:label="${l.label}" ${attrs}>${body}</g>`;
  const paths = (ps: LaserPath[]) => ps.map((p) => `<path d="${laserPathD(p)}"/>`).join('');
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${r3(sheet.w)}mm" height="${r3(sheet.h)}mm" viewBox="0 0 ${r3(sheet.w)} ${r3(sheet.h)}">`,
    `<title>${esc(title)}</title>`,
    layer(LASER_LAYERS.cut, `fill="none" stroke="${LASER_LAYERS.cut.color}" stroke-width="0.1"`, paths(pr.cut)),
    layer(LASER_LAYERS.mark, `fill="none" stroke="${LASER_LAYERS.mark.color}" stroke-width="0.1"`, paths(pr.mark)),
    layer(
      LASER_LAYERS.text,
      `fill="${LASER_LAYERS.text.color}" stroke="none" font-family="Helvetica, Arial, sans-serif"`,
      pr.texts.map(laserText).join(''),
    ),
    `</svg>`,
  ].join('\n');
}
