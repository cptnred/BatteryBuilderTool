import type { Layout, SubPack } from './types';

export interface Pt {
  x: number;
  z: number;
}

/** Bögen laufen gegen den Uhrzeigersinn, a1 > a0 (rad). */
export type Seg = { kind: 'line'; a: Pt; b: Pt } | { kind: 'arc'; c: Pt; r: number; a0: number; a1: number };

export type OutlineMode = 'straight' | 'tucked';

export interface OutlineMark {
  /** Position entlang des Umfangs (ab Startpunkt, mm) */
  s0: number;
  s1: number;
  kind: 'bend' | 'fold';
}

export interface Outline {
  segs: Seg[];
  perimeter: number;
  /** Positionen entlang des Umfangs für Biege-/Falzmarken */
  marks: OutlineMark[];
}

const TAU = 2 * Math.PI;

export function segLen(s: Seg): number {
  return s.kind === 'line' ? Math.hypot(s.b.x - s.a.x, s.b.z - s.a.z) : s.r * (s.a1 - s.a0);
}

export function segStart(s: Seg): Pt {
  return s.kind === 'line' ? s.a : { x: s.c.x + s.r * Math.cos(s.a0), z: s.c.z + s.r * Math.sin(s.a0) };
}

export function segEnd(s: Seg): Pt {
  return s.kind === 'line' ? s.b : { x: s.c.x + s.r * Math.cos(s.a1), z: s.c.z + s.r * Math.sin(s.a1) };
}

function convexHull(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.z - b.z);
  if (p.length <= 1) return p;
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
  const lo: Pt[] = [];
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 1e-9) lo.pop();
    lo.push(q);
  }
  const up: Pt[] = [];
  for (const q of [...p].reverse()) {
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 1e-9) up.pop();
    up.push(q);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1)); // CCW
}

/** Startpunkt normieren: Segment, dessen Anfang am weitesten unten (dann rechts) liegt, kommt zuerst */
function rotateToStart(segs: Seg[]): Seg[] {
  let bi = 0;
  segs.forEach((s, i) => {
    const a = segStart(s);
    const b = segStart(segs[bi]);
    if (a.z < b.z - 1e-6 || (Math.abs(a.z - b.z) <= 1e-6 && a.x > b.x)) bi = i;
  });
  return segs.slice(bi).concat(segs.slice(0, bi));
}

/** "Gerade drumherum": konvexe Hülle der Zellen mit Radius r (Tangenten + Bögen) */
export function hullOutline(centers: Pt[], r: number): Outline {
  const h = convexHull(centers);
  let segs: Seg[] = [];
  if (h.length === 1) segs = [{ kind: 'arc', c: h[0], r, a0: 0, a1: TAU }];
  else {
    const n = h.length;
    const normal = (i: number) => {
      const a = h[i];
      const b = h[(i + 1) % n];
      const L = Math.hypot(b.x - a.x, b.z - a.z);
      return { x: (b.z - a.z) / L, z: -(b.x - a.x) / L };
    };
    for (let i = 0; i < n; i++) {
      const nPrev = normal((i - 1 + n) % n);
      const nCur = normal(i);
      const a0 = Math.atan2(nPrev.z, nPrev.x);
      let a1 = Math.atan2(nCur.z, nCur.x);
      while (a1 < a0) a1 += TAU;
      if (a1 - a0 > 1e-9) segs.push({ kind: 'arc', c: h[i], r, a0, a1 });
      const b = h[(i + 1) % n];
      segs.push({
        kind: 'line',
        a: { x: h[i].x + r * nCur.x, z: h[i].z + r * nCur.z },
        b: { x: b.x + r * nCur.x, z: b.z + r * nCur.z },
      });
    }
  }
  segs = rotateToStart(segs);
  return finish(segs, 'bend');
}

/** "Eingebogen": Außenkontur der Vereinigung aller Zellkreise (folgt jeder Zelle in die Zwischenräume) */
export function scallopOutline(centers: Pt[], r: number): Outline {
  const arcs: Seg[] = [];
  centers.forEach((c, i) => {
    const cov: [number, number][] = [];
    centers.forEach((o, j) => {
      if (i === j) return;
      const d = Math.hypot(o.x - c.x, o.z - c.z);
      if (d >= 2 * r || d < 1e-9) return;
      const th = Math.atan2(o.z - c.z, o.x - c.x);
      const al = Math.acos(d / (2 * r));
      let s = (th - al) % TAU;
      if (s < 0) s += TAU;
      const e = s + 2 * al;
      if (e > TAU) {
        cov.push([s, TAU]);
        cov.push([0, e - TAU]);
      } else cov.push([s, e]);
    });
    if (!cov.length) {
      arcs.push({ kind: 'arc', c, r, a0: 0, a1: TAU });
      return;
    }
    cov.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const iv of cov) {
      const m = merged[merged.length - 1];
      if (m && iv[0] <= m[1] + 1e-12) m[1] = Math.max(m[1], iv[1]);
      else merged.push([iv[0], iv[1]]);
    }
    for (let k = 0; k < merged.length; k++) {
      const a0 = merged[k][1];
      const a1 = k + 1 < merged.length ? merged[k + 1][0] : merged[0][0] + TAU;
      if (a1 - a0 > 1e-9) arcs.push({ kind: 'arc', c, r, a0, a1 });
    }
  });
  // Bögen zu Schleifen verketten (Endpunkt eines Bogens = Startpunkt des nächsten)
  const used = new Array<boolean>(arcs.length).fill(false);
  const loops: Seg[][] = [];
  for (let i = 0; i < arcs.length; i++) {
    if (used[i]) continue;
    const loop: Seg[] = [];
    let k = i;
    while (k >= 0 && !used[k]) {
      used[k] = true;
      loop.push(arcs[k]);
      const e = segEnd(arcs[k]);
      let bestK = -1;
      let bestD = 1e-3;
      arcs.forEach((a, j) => {
        if (!used[j]) {
          const s = segStart(a);
          const d = Math.hypot(s.x - e.x, s.z - e.z);
          if (d < bestD) {
            bestD = d;
            bestK = j;
          }
        }
      });
      k = bestK;
    }
    loops.push(loop);
  }
  const area = (lp: Seg[]) => {
    const pts = lp.flatMap((s) => samplePts(s, 0.2));
    let A = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      A += p.x * q.z - q.x * p.z;
    }
    return A / 2;
  };
  loops.sort((a, b) => area(b) - area(a));
  return finish(rotateToStart(loops[0]), 'fold');
}

function finish(segs: Seg[], kind: 'bend' | 'fold'): Outline {
  let s = 0;
  const marks: OutlineMark[] = [];
  for (const g of segs) {
    const L = segLen(g);
    if (kind === 'bend' && g.kind === 'arc') marks.push({ s0: s, s1: s + L, kind });
    if (kind === 'fold') marks.push({ s0: s, s1: s, kind });
    s += L;
  }
  return { segs, perimeter: s, marks };
}

/** Segment als Punktfolge (für SVG/PDF). maxSag = max. Sehnenfehler in mm */
export function samplePts(s: Seg, maxSag = 0.05): Pt[] {
  if (s.kind === 'line') return [s.a, s.b];
  const step = 2 * Math.acos(Math.max(-1, 1 - maxSag / s.r));
  const n = Math.max(2, Math.ceil((s.a1 - s.a0) / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = s.a0 + ((s.a1 - s.a0) * i) / n;
    return { x: s.c.x + s.r * Math.cos(a), z: s.c.z + s.r * Math.sin(a) };
  });
}

export function outlinePolyline(o: Outline, maxSag = 0.05): Pt[] {
  return o.segs.flatMap((s) => samplePts(s, maxSag).slice(0, -1));
}

/**
 * Radius für Umrisse:
 *  - Fishpaper-Modus: Zellradius + halbe Papierstärke (neutrale Faser)
 *  - Abstandhalter:   Zellradius + Halter-Außenrand
 *  - "eingebogen" braucht eine zusammenhängende Kontur -> mindestens halber Nachbarabstand + 0,05 mm
 */
export function outlineRadius(layout: Layout, mode: OutlineMode, extra = 0): number {
  const cfg = layout.config;
  const R = cfg.cell.diameter / 2;
  const base = cfg.spacing.mode === 'spacer' ? R + cfg.spacing.holderRim : R + cfg.spacing.paperThickness / 2;
  const contact = Math.max(layout.pitches.px, layout.pitches.diag) / 2 + 0.05;
  return (mode === 'tucked' ? Math.max(base, contact) : base) + extra;
}

export function packOutline(layout: Layout, pack: SubPack, mode: OutlineMode, extra = 0): Outline {
  const pts = pack.cells.map((c) => ({ x: c.x, z: c.z }));
  const r = outlineRadius(layout, mode, extra);
  return mode === 'tucked' ? scallopOutline(pts, r) : hullOutline(pts, r);
}

/** Bounding-Box der Kontur. */
export function outlineBounds(o: Outline): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const pts = outlinePolyline(o, 0.05);
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    maxX: Math.max(...pts.map((p) => p.x)),
    minZ: Math.min(...pts.map((p) => p.z)),
    maxZ: Math.max(...pts.map((p) => p.z)),
  };
}
