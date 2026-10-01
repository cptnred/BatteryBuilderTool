/**
 * Segmentgeometrie der Schnittteile (Plan §5.3) – rein, in mm, Teilkoordinaten (x nach rechts, y nach unten).
 * Bögen: Punkt(t) = c + r·(cos t, sin t), t läuft von a0 nach a1 (vorzeichenbehaftet, |a1 − a0| ≤ 2π).
 */
import type { Seg } from '../core';
import type { P2, Path2, Seg2 } from './types';

const TAU = 2 * Math.PI;

export function segStart2(s: Seg2): P2 {
  return s.kind === 'line' ? s.a : { x: s.c.x + s.r * Math.cos(s.a0), y: s.c.y + s.r * Math.sin(s.a0) };
}

export function segEnd2(s: Seg2): P2 {
  return s.kind === 'line' ? s.b : { x: s.c.x + s.r * Math.cos(s.a1), y: s.c.y + s.r * Math.sin(s.a1) };
}

export function segLength2(s: Seg2): number {
  return s.kind === 'line' ? Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) : s.r * Math.abs(s.a1 - s.a0);
}

export function pointAt(s: Seg2, u: number): P2 {
  if (s.kind === 'line') return { x: s.a.x + u * (s.b.x - s.a.x), y: s.a.y + u * (s.b.y - s.a.y) };
  const t = s.a0 + u * (s.a1 - s.a0);
  return { x: s.c.x + s.r * Math.cos(t), y: s.c.y + s.r * Math.sin(t) };
}

/** Teilstück von u0 bis u1 (0…1 entlang des Segments). */
export function subSeg(s: Seg2, u0: number, u1: number): Seg2 {
  if (s.kind === 'line') return { kind: 'line', a: pointAt(s, u0), b: pointAt(s, u1) };
  const d = s.a1 - s.a0;
  return { ...s, a0: s.a0 + u0 * d, a1: s.a0 + u1 * d };
}

export function reverseSeg(s: Seg2): Seg2 {
  return s.kind === 'line' ? { kind: 'line', a: s.b, b: s.a } : { ...s, a0: s.a1, a1: s.a0 };
}

/** Umlaufsinn umkehren. */
export function reverseSegs(segs: Seg2[]): Seg2[] {
  return segs.map(reverseSeg).reverse();
}

export const pathLength2 = (segs: Seg2[]) => segs.reduce((a, s) => a + segLength2(s), 0);

/**
 * Segmente mit einer Ähnlichkeitsabbildung (Verschieben, Drehen, Spiegeln) abbilden.
 * Spiegelnde Abbildungen (Determinante < 0) kehren die Laufrichtung der Bögen um.
 */
export function mapSegs(segs: Seg2[], T: (q: P2) => P2): Seg2[] {
  const o = T({ x: 0, y: 0 });
  const ex = T({ x: 1, y: 0 });
  const ey = T({ x: 0, y: 1 });
  const det = (ex.x - o.x) * (ey.y - o.y) - (ex.y - o.y) * (ey.x - o.x);
  const scale = Math.sqrt(Math.abs(det));
  return segs.map((s) => {
    if (s.kind === 'line') return { kind: 'line', a: T(s.a), b: T(s.b) };
    const c = T(s.c);
    const p = T(segStart2(s));
    const a0 = Math.atan2(p.y - c.y, p.x - c.x);
    const sweep = (s.a1 - s.a0) * (det < 0 ? -1 : 1);
    return { kind: 'arc', c, r: s.r * scale, a0, a1: a0 + sweep };
  });
}

/** Bogen als Punktfolge; maxSag = max. Sehnenfehler (mm). */
function arcPoints(s: Extract<Seg2, { kind: 'arc' }>, maxSag: number): P2[] {
  const step = 2 * Math.acos(Math.max(-1, 1 - maxSag / s.r));
  const n = Math.max(2, Math.ceil(Math.abs(s.a1 - s.a0) / step));
  return Array.from({ length: n + 1 }, (_, i) => pointAt(s, i / n));
}

/** Segmente als Polylinie (nur für Druck-Kachelung, Vorschau, Punkt-in-Kontur). */
export function flattenSegs(segs: Seg2[], closed: boolean, maxSag = 0.05): P2[] {
  const out: P2[] = [];
  for (const s of segs) {
    const pts = s.kind === 'line' ? [s.a, s.b] : arcPoints(s, maxSag);
    out.push(...pts.slice(0, -1));
  }
  if (!closed && segs.length) out.push(segEnd2(segs[segs.length - 1]));
  return out;
}

/** Kontur aus Segmenten: Punktliste wird aus den Segmenten abgeleitet. */
export function segPath(segs: Seg2[], closed: boolean, pts?: P2[]): Path2 {
  return { closed, segs, pts: pts ?? flattenSegs(segs, closed) };
}

/** Polylinie als Liniensegmente (für Teile ohne Bögen). */
export function polylineSegs(pts: P2[], closed: boolean): Seg2[] {
  const n = closed ? pts.length : pts.length - 1;
  const out: Seg2[] = [];
  for (let i = 0; i < n; i++) out.push({ kind: 'line', a: pts[i], b: pts[(i + 1) % pts.length] });
  return out;
}

/** Segmente eines Pfads (Bögen, falls vorhanden, sonst Polylinie). */
export const pathSegs = (p: Path2): Seg2[] => p.segs ?? polylineSegs(p.pts, p.closed);

/** Vorzeichenbehaftete Fläche einer geschlossenen Segmentkontur (exakt, Bögen analytisch). */
export function segsSignedArea(segs: Seg2[]): number {
  let a = 0;
  for (const s of segs) {
    if (s.kind === 'line') a += s.a.x * s.b.y - s.b.x * s.a.y;
    else {
      const { c, r, a0, a1 } = s;
      a += c.x * r * (Math.sin(a1) - Math.sin(a0)) - c.y * r * (Math.cos(a1) - Math.cos(a0)) + r * r * (a1 - a0);
    }
  }
  return a / 2;
}

export const segsArea = (segs: Seg2[]) => Math.abs(segsSignedArea(segs));

/** Ist die Kontur geschlossen und einteilig (Ende jedes Segments = Anfang des nächsten)? */
export function isClosedChain(segs: Seg2[], tol = 1e-6): boolean {
  return (
    segs.length > 0 &&
    segs.every((s, i) => {
      const e = segEnd2(s);
      const n = segStart2(segs[(i + 1) % segs.length]);
      return Math.hypot(e.x - n.x, e.y - n.y) <= tol;
    })
  );
}

/** Kernsegment (x, z nach oben) in Teilkoordinaten abbilden. */
export function coreSegsToPart(segs: Seg[], toPart: (x: number, z: number) => P2): Seg2[] {
  const asP2: Seg2[] = segs.map((s) =>
    s.kind === 'line'
      ? { kind: 'line', a: { x: s.a.x, y: s.a.z }, b: { x: s.b.x, y: s.b.z } }
      : { kind: 'arc', c: { x: s.c.x, y: s.c.z }, r: s.r, a0: s.a0, a1: s.a1 },
  );
  return mapSegs(asP2, (q) => toPart(q.x, q.y));
}

interface Hit {
  i: number;
  u: number;
  x: number;
  y: number;
}

/** Schnittpunkte der Kontur mit der Senkrechten x = x0. */
export function verticalHits(segs: Seg2[], x0: number): Hit[] {
  const hits: Hit[] = [];
  segs.forEach((s, i) => {
    if (s.kind === 'line') {
      const { a, b } = s;
      if ((a.x - x0) * (b.x - x0) > 0 || a.x === b.x) return;
      const u = (x0 - a.x) / (b.x - a.x);
      if (u < 0 || u >= 1) return;
      hits.push({ i, u, x: x0, y: a.y + u * (b.y - a.y) });
      return;
    }
    const k = (x0 - s.c.x) / s.r;
    if (Math.abs(k) > 1) return;
    const base = Math.acos(k);
    const d = s.a1 - s.a0;
    for (const t of [base, -base]) {
      // t in Laufrichtung ab a0 normieren
      let dt = d >= 0 ? t - s.a0 : s.a0 - t;
      dt = ((dt % TAU) + TAU) % TAU;
      const u = dt / Math.abs(d);
      if (u >= 1 || (t === -base && base === 0)) continue;
      const p = pointAt(s, u);
      hits.push({ i, u, x: x0, y: p.y });
    }
  });
  return hits;
}

/** Position (Weglänge) eines Treffers entlang der Kontur. */
function hitS(segs: Seg2[], h: { i: number; u: number }): number {
  let s = 0;
  for (let k = 0; k < h.i; k++) s += segLength2(segs[k]);
  return s + h.u * segLength2(segs[h.i]);
}

/** Konturstück vorwärts von Treffer a bis Treffer b. */
function walk(segs: Seg2[], a: { i: number; u: number }, b: { i: number; u: number }): Seg2[] {
  const out: Seg2[] = [];
  const n = segs.length;
  const push = (s: Seg2) => {
    if (segLength2(s) > 1e-9) out.push(s);
  };
  if (a.i === b.i && b.u >= a.u) {
    push(subSeg(segs[a.i], a.u, b.u));
    return out;
  }
  push(subSeg(segs[a.i], a.u, 1));
  for (let k = (a.i + 1) % n; k !== b.i; k = (k + 1) % n) out.push(segs[k]);
  push(subSeg(segs[b.i], 0, b.u));
  return out;
}

/**
 * Randkerbe: schneidet ein Rechteck (Breite w, Tiefe d) von der oberen ('top') oder unteren Kante
 * einer geschlossenen Segmentkontur aus, zentriert bei x = cx. Die Tiefe zählt ab dem tieferen der
 * beiden Kantenpunkte, sodass die Kerbe überall mindestens d tief ist. Ergebnis: ein geschlossener Pfad.
 */
export function notchSegs(segs: Seg2[], cx: number, w: number, d: number, edge: 'top' | 'bottom'): Seg2[] {
  const x1 = cx - w / 2;
  const x2 = cx + w / 2;
  const pick = (hs: Hit[]) => hs.reduce((best, h) => ((edge === 'top' ? h.y < best.y : h.y > best.y) ? h : best));
  const h1s = verticalHits(segs, x1);
  const h2s = verticalHits(segs, x2);
  if (!h1s.length || !h2s.length) return segs;
  const h1 = pick(h1s);
  const h2 = pick(h2s);
  const depthY = edge === 'top' ? Math.max(h1.y, h2.y) + d : Math.min(h1.y, h2.y) - d;
  const P = pathLength2(segs);
  const s1 = hitS(segs, h1);
  const s2 = hitS(segs, h2);
  const fwd12 = (((s2 - s1) % P) + P) % P;
  // die Kante zwischen den Treffern ist der kürzere Weg entlang des Umfangs
  const [a, b] = fwd12 <= P - fwd12 ? [h1, h2] : [h2, h1];
  // neuer Pfad: ab b vorwärts bis a (der lange Weg), dann Kerbe von a nach b
  const out = walk(segs, b, a);
  const pa = { x: a.x, y: a.y };
  const pb = { x: b.x, y: b.y };
  const qa = { x: a.x, y: depthY };
  const qb = { x: b.x, y: depthY };
  out.push({ kind: 'line', a: pa, b: qa }, { kind: 'line', a: qa, b: qb }, { kind: 'line', a: qb, b: pb });
  return out;
}

/**
 * Bogen in kubische Bézierkurven zerlegen, je Stück ≤ 90° (für PDF).
 * Liefert [Kontrollpunkt 1, Kontrollpunkt 2, Endpunkt] je Stück.
 */
export function arcToBeziers(s: Extract<Seg2, { kind: 'arc' }>): [P2, P2, P2][] {
  const d = s.a1 - s.a0;
  const n = Math.max(1, Math.ceil(Math.abs(d) / (Math.PI / 2) - 1e-9));
  const out: [P2, P2, P2][] = [];
  for (let i = 0; i < n; i++) {
    const t0 = s.a0 + (d * i) / n;
    const t1 = s.a0 + (d * (i + 1)) / n;
    const k = (4 / 3) * Math.tan((t1 - t0) / 4);
    const p0 = { x: s.c.x + s.r * Math.cos(t0), y: s.c.y + s.r * Math.sin(t0) };
    const p3 = { x: s.c.x + s.r * Math.cos(t1), y: s.c.y + s.r * Math.sin(t1) };
    out.push([
      { x: p0.x - k * s.r * Math.sin(t0), y: p0.y + k * s.r * Math.cos(t0) },
      { x: p3.x + k * s.r * Math.sin(t1), y: p3.y - k * s.r * Math.cos(t1) },
      p3,
    ]);
  }
  return out;
}

/** Bogen in Stücke ≤ maxSweep zerlegen (SVG: Vollkreise brauchen mindestens zwei A-Befehle). */
export function splitArc(s: Extract<Seg2, { kind: 'arc' }>, maxSweep = Math.PI / 2): Extract<Seg2, { kind: 'arc' }>[] {
  const d = s.a1 - s.a0;
  const n = Math.max(1, Math.ceil(Math.abs(d) / maxSweep - 1e-9));
  return Array.from({ length: n }, (_, i) => ({ ...s, a0: s.a0 + (d * i) / n, a1: s.a0 + (d * (i + 1)) / n }));
}
