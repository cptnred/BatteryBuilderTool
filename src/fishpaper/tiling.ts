/** Kachelung übergroßer Teile und Teilen von Streifen – rein, in mm. */
import type { Rect } from './geom2d';
import { line } from './geom2d';
import type { Part, Path2, PartText } from './types';

export const TILE_OVERLAP = 15;

/** Startpositionen entlang einer Achse: gleichmäßig, letzte Kachel endet bündig, Überlappung ≥ ov. */
export function tileStarts(total: number, tile: number, ov: number): number[] {
  if (total <= tile + 1e-9) return [0];
  if (tile <= ov) throw new Error('Kachel kleiner als Überlappung');
  const n = Math.ceil((total - ov) / (tile - ov) - 1e-9);
  const step = (total - tile) / (n - 1);
  return Array.from({ length: n }, (_, i) => i * step);
}

/** Kachelrechtecke (Teilkoordinaten), zeilenweise von oben links. */
export function tileGrid(w: number, h: number, tw: number, th: number, ov = TILE_OVERLAP): Rect[] {
  const xs = tileStarts(w, tw, ov);
  const ys = tileStarts(h, th, ov);
  const out: Rect[] = [];
  for (const y of ys) for (const x of xs) out.push({ x, y, w: Math.min(tw, w), h: Math.min(th, h) });
  return out;
}

/**
 * Passmarken in den Überlappungen: Passkreuze und Rautennummern (◆k) mitten in jeder Überlappung.
 * Die Marken liegen im Teil, erscheinen also auf beiden benachbarten Blättern.
 */
export function registrationMarks(part: Part, tiles: Rect[]): { marks: Path2[]; texts: PartText[] } {
  const marks: Path2[] = [];
  const texts: PartText[] = [];
  const xs = [...new Set(tiles.map((t) => +t.x.toFixed(6)))].sort((a, b) => a - b);
  const ys = [...new Set(tiles.map((t) => +t.y.toFixed(6)))].sort((a, b) => a - b);
  const tw = tiles[0].w;
  const th = tiles[0].h;
  const cross = (x: number, y: number) => {
    const r = 3;
    marks.push(line(x - r, y, x + r, y), line(x, y - r, x, y + r));
  };
  for (let i = 1; i < xs.length; i++) {
    const xm = (xs[i] + xs[i - 1] + tw) / 2; // Mitte der Überlappung
    const ysMarks = [Math.min(6, part.h / 4), part.h / 2, part.h - Math.min(6, part.h / 4)];
    ysMarks.forEach((y) => cross(xm, y));
    texts.push({ x: xm, y: part.h / 2 - 5, text: `◆${i + 1}`, size: 3.5, anchor: 'middle' });
    marks.push(line(xs[i], 0, xs[i], part.h)); // Beginn der Überlappung
  }
  for (let j = 1; j < ys.length; j++) {
    const ym = (ys[j] + ys[j - 1] + th) / 2;
    [Math.min(6, part.w / 4), part.w / 2, part.w - Math.min(6, part.w / 4)].forEach((x) => cross(x, ym));
    marks.push(line(0, ys[j], part.w, ys[j]));
  }
  return { marks, texts };
}

/**
 * Streifen in n Stücke teilen (Option B): gleich lange Stücke entlang x, jedes mit Überlappungszugabe ov.
 * Ergebnis sind Ausschnitte (Teilkoordinaten).
 */
export function splitRanges(length: number, maxPiece: number, ov = TILE_OVERLAP): { x0: number; x1: number }[] {
  if (length <= maxPiece) return [{ x0: 0, x1: length }];
  const n = Math.ceil((length - ov) / (maxPiece - ov));
  const step = (length - ov) / n;
  return Array.from({ length: n }, (_, i) => ({ x0: i * step, x1: Math.min(length, i * step + step + ov) }));
}
