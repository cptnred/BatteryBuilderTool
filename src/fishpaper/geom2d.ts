/** Kleine 2D-Helfer für Schnittteile (mm, y nach unten). */
import type { P2, Path2 } from './types';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function rectPath(x: number, y: number, w: number, h: number): Path2 {
  return {
    closed: true,
    pts: [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
  };
}

export function line(x1: number, y1: number, x2: number, y2: number): Path2 {
  return {
    closed: false,
    pts: [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ],
  };
}

/** Vorzeichenbehaftete Fläche (Shoelace). */
export function signedArea(pts: P2[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export function polygonArea(pts: P2[]): number {
  return Math.abs(signedArea(pts));
}

export function bbox(paths: Path2[]): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of paths)
    for (const q of p.pts) {
      minX = Math.min(minX, q.x);
      minY = Math.min(minY, q.y);
      maxX = Math.max(maxX, q.x);
      maxY = Math.max(maxY, q.y);
    }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function mapPath(p: Path2, f: (q: P2) => P2): Path2 {
  return { closed: p.closed, pts: p.pts.map(f) };
}

export function pathLength(p: Path2): number {
  let L = 0;
  const n = p.closed ? p.pts.length : p.pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = p.pts[i];
    const b = p.pts[(i + 1) % p.pts.length];
    L += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return L;
}

/**
 * Liang-Barsky: Strecke auf Rechteck zuschneiden. null, wenn komplett außerhalb.
 */
export function clipSegment(a: P2, b: P2, r: Rect): [P2, P2] | null {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const checks: [number, number][] = [
    [-dx, a.x - r.x],
    [dx, r.x + r.w - a.x],
    [-dy, a.y - r.y],
    [dy, r.y + r.h - a.y],
  ];
  for (const [p, q] of checks) {
    if (Math.abs(p) < 1e-12) {
      if (q < 0) return null;
    } else {
      const t = q / p;
      if (p < 0) {
        if (t > t1) return null;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return null;
        if (t < t1) t1 = t;
      }
    }
  }
  return [
    { x: a.x + t0 * dx, y: a.y + t0 * dy },
    { x: a.x + t1 * dx, y: a.y + t1 * dy },
  ];
}

/** Pfad auf Rechteck zuschneiden; Ergebnis sind offene Teilzüge. */
export function clipPath(p: Path2, r: Rect): Path2[] {
  const out: Path2[] = [];
  let cur: P2[] = [];
  const n = p.closed ? p.pts.length : p.pts.length - 1;
  const same = (u: P2, v: P2) => Math.abs(u.x - v.x) < 1e-9 && Math.abs(u.y - v.y) < 1e-9;
  for (let i = 0; i < n; i++) {
    const seg = clipSegment(p.pts[i], p.pts[(i + 1) % p.pts.length], r);
    if (!seg) {
      if (cur.length > 1) out.push({ closed: false, pts: cur });
      cur = [];
      continue;
    }
    if (cur.length && same(cur[cur.length - 1], seg[0])) cur.push(seg[1]);
    else {
      if (cur.length > 1) out.push({ closed: false, pts: cur });
      cur = [seg[0], seg[1]];
    }
  }
  if (cur.length > 1) out.push({ closed: false, pts: cur });
  // vollständig innen liegender geschlossener Pfad bleibt geschlossen
  if (
    p.closed &&
    out.length === 1 &&
    out[0].pts.length === p.pts.length + 1 &&
    same(out[0].pts[0], out[0].pts[out[0].pts.length - 1])
  )
    return [{ closed: true, pts: out[0].pts.slice(0, -1) }];
  return out;
}

/** Punkt-in-Polygon (Strahlverfahren). */
export function pointInPolygon(p: P2, pts: P2[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** grobe Textbreite (Helvetica) in mm */
export const textWidthMm = (text: string, size: number) => text.length * size * 0.55;

/** Umrandung eines Textes (ohne Drehung) */
export function textBox(t: { x: number; y: number; text: string; size: number; anchor: 'start' | 'middle' | 'end' }): Rect {
  const w = textWidthMm(t.text, t.size);
  const x = t.anchor === 'start' ? t.x : t.anchor === 'end' ? t.x - w : t.x - w / 2;
  return { x, y: t.y - t.size * 0.8, w, h: t.size };
}

/** Liegt die Textbox vollständig im Polygon (und außerhalb aller Löcher)? */
export function boxInside(r: Rect, outer: P2[], holes: P2[][] = []): boolean {
  const samples: P2[] = [];
  for (let i = 0; i <= 8; i++) {
    const x = r.x + (r.w * i) / 8;
    samples.push({ x, y: r.y }, { x, y: r.y + r.h });
  }
  samples.push({ x: r.x, y: r.y + r.h / 2 }, { x: r.x + r.w, y: r.y + r.h / 2 });
  return samples.every((p) => pointInPolygon(p, outer) && !holes.some((h) => pointInPolygon(p, h)));
}
