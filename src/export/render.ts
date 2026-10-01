/**
 * Zeichenprimitive einer Seite in Seitenkoordinaten (mm, y nach unten) – rein.
 * PDF, SVG und die Vorschau zeichnen dieselben Primitive.
 */
import type { Rect } from '../fishpaper/geom2d';
import { clipPath, textBox } from '../fishpaper/geom2d';
import type { P2, Path2, PartText } from '../fishpaper/types';
import type { Sheet, SheetItem } from './sheets';

export interface PageText extends PartText {
  /** Drehung auf der Seite, Grad gegen den Uhrzeigersinn */
  angle: number;
}

export interface Prims {
  cut: Path2[];
  fold: Path2[];
  marks: Path2[];
  zones: Path2[];
  texts: PageText[];
}

/** Abbildung Teilkoordinaten -> Seitenkoordinaten (Drehung 90° im Uhrzeigersinn, falls rotated). */
export function itemTransform(it: SheetItem): (q: P2) => P2 {
  const { clip, x, y, rotated } = it;
  return rotated
    ? (q) => ({ x: x + (clip.y + clip.h - q.y), y: y + (q.x - clip.x) })
    : (q) => ({ x: x + q.x - clip.x, y: y + q.y - clip.y });
}

function intersect(a: Rect, b: Rect): Rect | null {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

const insideRect = (r: Rect, c: Rect) =>
  r.x >= c.x - 1e-6 && r.y >= c.y - 1e-6 && r.x + r.w <= c.x + c.w + 1e-6 && r.y + r.h <= c.y + c.h + 1e-6;

export function itemPrims(it: SheetItem): Prims {
  const T = itemTransform(it);
  const map = (paths: Path2[]) =>
    paths.flatMap((p) => clipPath(p, it.clip)).map((p) => ({ closed: p.closed, pts: p.pts.map(T) }));
  const zones: Path2[] = [];
  for (const z of it.part.zones) {
    const xs = z.pts.map((q) => q.x);
    const ys = z.pts.map((q) => q.y);
    const r = intersect(
      { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) },
      it.clip,
    );
    if (r)
      zones.push({
        closed: true,
        pts: [
          { x: r.x, y: r.y },
          { x: r.x + r.w, y: r.y },
          { x: r.x + r.w, y: r.y + r.h },
          { x: r.x, y: r.y + r.h },
        ].map(T),
      });
  }
  const texts: PageText[] = it.part.texts
    .filter((t) => insideRect(textBox(t), it.clip) || (t.rotate && pointIn(t, it.clip)))
    .map((t) => ({ ...t, ...T(t), angle: (t.rotate ?? 0) - (it.rotated ? 90 : 0) }));
  // Teile, die über mehrere Blätter gehen, bekommen eine Beschriftung am oberen Rand des Ausschnitts
  if (it.caption) {
    texts.push({ x: it.x, y: it.y - 1.5, text: it.caption, size: 2.6, anchor: 'start', angle: 0 });
  }
  return { cut: map(it.part.cut), fold: map(it.part.fold), marks: map(it.part.marks), zones, texts };
}

const pointIn = (p: P2, r: Rect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

export function sheetPrims(sheet: Sheet): Prims {
  const out: Prims = { cut: [], fold: [], marks: [], zones: [], texts: [] };
  for (const it of sheet.items) {
    const p = itemPrims(it);
    out.cut.push(...p.cut);
    out.fold.push(...p.fold);
    out.marks.push(...p.marks);
    out.zones.push(...p.zones);
    out.texts.push(...p.texts);
  }
  return out;
}

/** Für den PDF-Standardzeichensatz (WinAnsi) nicht darstellbare Zeichen ersetzen. */
export function pdfSafe(text: string): string {
  return text.replace(/−/g, '-').replace(/→/g, '->').replace(/←/g, '<-').replace(/↑/g, '^');
}
