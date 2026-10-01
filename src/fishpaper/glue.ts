/**
 * Kleberaufbau beim eingebogenen Umriss (Plan §4) – rein, in Kernkoordinaten (x, z nach oben).
 * Jedes Tal zwischen zwei Nachbarzellen wird gerade abgeschnitten: eine Sehne liegt GLUE_BUILDUP über dem
 * tiefsten Punkt des Tals (gemessen entlang der Winkelhalbierenden, senkrecht zu ihr); beide Zellbögen
 * enden an der Sehne. Der Kern-Umriss (packOutline/scallopOutline) bleibt unverändert.
 */
import type { Outline, OutlineMark, Pt, Seg } from '../core';
import { segEnd, segLen, segStart } from '../core';

/** fester Kleberaufbau, mm */
export const GLUE_BUILDUP = 0.6;

const TAU = 2 * Math.PI;

type Arc = Extract<Seg, { kind: 'arc' }>;

export interface Valley {
  /** tiefster Punkt des Tals (Schnittpunkt der beiden Zellkreise) */
  vertex: Pt;
  /** Winkelhalbierende, nach außen */
  dir: Pt;
  /** Sehnen-Enden auf dem Bogen davor bzw. danach */
  from: Pt;
  to: Pt;
}

/** Winkel auf dem Kreis (c, r), dessen Punkt auf der Geraden (p − V)·u = t liegt – die beiden Lösungen. */
function chordAngles(a: Arc, V: Pt, u: Pt, t: number): number[] {
  const k = (t - ((a.c.x - V.x) * u.x + (a.c.z - V.z) * u.z)) / a.r;
  if (Math.abs(k) > 1) return [];
  const phi = Math.atan2(u.z, u.x);
  const al = Math.acos(k);
  return [phi + al, phi - al];
}

/** Winkel w in [a0, a0 + 2π) normieren. */
const norm = (w: number, a0: number) => a0 + ((((w - a0) % TAU) + TAU) % TAU);

/** Tal zwischen Bogen A (endet im Tal) und Bogen B (beginnt dort). */
export function valleyChord(A: Arc, B: Arc, t = GLUE_BUILDUP): Valley & { a1: number; b0: number } {
  const V = segEnd(A);
  const M = { x: (A.c.x + B.c.x) / 2, z: (A.c.z + B.c.z) / 2 };
  // nach außen = rechts der Laufrichtung (Umriss läuft gegen den Uhrzeigersinn)
  const run = { x: B.c.x - A.c.x, z: B.c.z - A.c.z };
  const right = { x: run.z, z: -run.x };
  let u = { x: V.x - M.x, z: V.z - M.z };
  let L = Math.hypot(u.x, u.z);
  if (L < 1e-9 || u.x * right.x + u.z * right.z < 0) {
    u = right;
    L = Math.hypot(u.x, u.z);
  }
  u = { x: u.x / L, z: u.z / L };
  // Bogen A: Lösung, die am nächsten vor seinem Ende liegt; Bogen B: am nächsten nach seinem Anfang
  const a1 = Math.max(
    ...chordAngles(A, V, u, t)
      .map((w) => norm(w, A.a0))
      .filter((w) => w <= A.a1 + 1e-9),
  );
  const b0 = Math.min(
    ...chordAngles(B, V, u, t)
      .map((w) => norm(w, B.a0))
      .filter((w) => w <= B.a1 + 1e-9),
  );
  if (!Number.isFinite(a1) || !Number.isFinite(b0) || a1 <= A.a0 || b0 >= B.a1)
    throw new Error('Kleber-Sehne: Tal zu flach oder Bogen zu kurz');
  const at = (a: Arc, w: number): Pt => ({ x: a.c.x + a.r * Math.cos(w), z: a.c.z + a.r * Math.sin(w) });
  return { vertex: V, dir: u, from: at(A, a1), to: at(B, b0), a1, b0 };
}

/**
 * Umriss mit Kleber-Sehnen: Bögen gekürzt, Sehnen als Linien dazwischen.
 * Umfangsposition 0 liegt in der Mitte der Sehne vor dem ersten Bogen; Falzmarken sitzen in der Sehnenmitte.
 */
export function glueOutline(o: Outline, t = GLUE_BUILDUP): Outline {
  const arcs = o.segs;
  const n = arcs.length;
  if (n < 2 || arcs.some((s) => s.kind !== 'arc')) return o;
  const valleys = arcs.map((s, i) => valleyChord(s as Arc, arcs[(i + 1) % n] as Arc, t));
  const segs: Seg[] = [];
  arcs.forEach((s, i) => {
    const a = s as Arc;
    const prev = valleys[(i - 1 + n) % n];
    const next = valleys[i];
    segs.push({ kind: 'arc', c: a.c, r: a.r, a0: prev.b0, a1: next.a1 });
    segs.push({ kind: 'line', a: next.from, b: next.to });
  });
  const lastChord = segLen(segs[segs.length - 1]);
  const perimeter = segs.reduce((a, s) => a + segLen(s), 0);
  const marks: OutlineMark[] = [{ s0: 0, s1: 0, kind: 'fold' }];
  let s = lastChord / 2;
  for (let i = 0; i < segs.length - 1; i++) {
    const L = segLen(segs[i]);
    if (segs[i].kind === 'line') marks.push({ s0: s + L / 2, s1: s + L / 2, kind: 'fold' });
    s += L;
  }
  return { segs, perimeter, marks };
}

/** Prüfhilfe: Ende jedes Segments = Anfang des nächsten. */
export function outlineClosed(o: Outline, tol = 1e-6): boolean {
  return o.segs.every((s, i) => {
    const e = segEnd(s);
    const b = segStart(o.segs[(i + 1) % o.segs.length]);
    return Math.hypot(e.x - b.x, e.z - b.z) <= tol;
  });
}
