/**
 * Zeichenmodell einer Stirnseitenansicht – in mm, rein (kein React/DOM).
 *
 * Stirnseiten werden immer VON AUSSEN betrachtet:
 *  - Vorderseite V: gespiegelt -> global RECHTS erscheint im Bild LINKS.
 *  - Rückseite  H: nicht gespiegelt.
 * Bildkoordinaten: x nach rechts, y nach unten; der Teilpack liegt in [0,W] × [0,H].
 */
import type { Face, Layout, Side, SubPack } from '../core';
import { adjacency, cellDistance } from '../core';
import type { ConnRole } from './connections';
import { connectionOf } from './connections';

export interface FaceCell {
  id: string;
  cx: number;
  cy: number;
  r: number;
  layer: number;
  group: number;
  polarity: '+' | '−';
}

export interface FaceStrip {
  node: number;
  kind: 'start' | 'series' | 'end';
  tone: 0 | 1;
  /** Groups whose cells this strip touches */
  groups: number[];
  segments: { x1: number; y1: number; x2: number; y2: number }[];
  dots: { cx: number; cy: number }[];
}

export interface FaceLabel {
  node: number;
  text: string;
  x: number;
  y: number;
  role: ConnRole | 'series';
}

export interface FaceFlag {
  node: number;
  text: string;
  role: ConnRole;
  x: number;
  /** Stiel von y1 (am Streifen) bis y2 (am Etikett) */
  y1: number;
  y2: number;
  dir: 'up' | 'down';
  /** Etikett-Box */
  box: { x: number; y: number; w: number; h: number };
}

export interface FaceModel {
  key: string;
  face: Face;
  mirrored: boolean;
  title: string;
  width: number;
  height: number;
  r: number;
  cells: FaceCell[];
  strips: FaceStrip[];
  labels: FaceLabel[];
  flags: FaceFlag[];
  /** echte Seiten links/rechts im Bild */
  markers: { left: Side; right: Side; y: number; leftX: number; rightX: number };
  viewBox: { x: number; y: number; w: number; h: number };
  fontSize: { label: number; flag: number; marker: number; symbol: number; group: number };
}

/** grobe Textbreite für Kollisionsvermeidung (mm) */
export const textWidth = (text: string, size: number) => text.length * size * 0.56;

/** Greedy-Staffelung: Level je Intervall, sodass sich Intervalle auf gleichem Level nicht überlappen. */
export function stagger(intervals: { x0: number; x1: number }[], gap = 1): number[] {
  const order = intervals.map((iv, i) => ({ ...iv, i })).sort((a, b) => a.x0 - b.x0);
  const levelEnds: number[] = [];
  const out = new Array<number>(intervals.length).fill(0);
  for (const iv of order) {
    let lvl = levelEnds.findIndex((end) => iv.x0 >= end + gap);
    if (lvl < 0) {
      lvl = levelEnds.length;
      levelEnds.push(-Infinity);
    }
    levelEnds[lvl] = iv.x1;
    out[iv.i] = lvl;
  }
  return out;
}

export function faceTitle(pack: SubPack, face: Face): string {
  if (pack.role === 'booster') return `${pack.label} – Stirnseite ${face === 'V' ? '1' : '2'} (Blick von außen)`;
  return `${pack.label} – ${face === 'V' ? 'vordere Stirnseite (Blick von vorne)' : 'hintere Stirnseite (Blick von hinten)'}`;
}

export function faceModel(layout: Layout, pack: SubPack, face: Face): FaceModel {
  const W = pack.width;
  const H = pack.height;
  const mirrored = face === 'V';
  const X = (x: number) => (mirrored ? W - x : x);
  const Y = (z: number) => H - z;
  const R = layout.config.cell.diameter / 2;
  const byId = new Map(pack.cells.map((c) => [c.id, c]));
  const groupOf = new Map<string, (typeof pack.groups)[number]>();
  pack.groups.forEach((g) => g.cells.forEach((id) => groupOf.set(id, g)));
  const adj = adjacency(layout.config);

  // Schriftgrößen relativ zum Zelldurchmesser (21700 ≈ Referenz)
  const k = (2 * R) / 21.4;
  const fontSize = { label: 4.2 * k, flag: 3.8 * k, marker: 9 * k, symbol: 1.0 * R, group: 0.42 * R };

  const cells: FaceCell[] = pack.cells.map((c) => {
    const g = groupOf.get(c.id)!;
    return { id: c.id, cx: X(c.x), cy: Y(c.z), r: R, layer: c.layer, group: g.s, polarity: g.minusFace === face ? '−' : '+' };
  });

  const faceStrips = pack.strips.filter((st) => st.face === face);
  const strips: FaceStrip[] = faceStrips.map((st, i) => {
    const cs = st.cells.map((id) => byId.get(id)!);
    const segments: FaceStrip['segments'] = [];
    for (let a = 0; a < cs.length; a++)
      for (let b = a + 1; b < cs.length; b++)
        if (cellDistance(cs[a], cs[b]) <= adj) segments.push({ x1: X(cs[a].x), y1: Y(cs[a].z), x2: X(cs[b].x), y2: Y(cs[b].z) });
    const groups = [...new Set(st.cells.map((id) => groupOf.get(id)!.s))];
    return {
      node: st.node,
      kind: st.kind,
      tone: (i % 2) as 0 | 1,
      groups,
      segments,
      dots: cs.map((c) => ({ cx: X(c.x), cy: Y(c.z) })),
    };
  });

  // Streifen mit Fahne nach oben: kein separates Bk-Label (die Fahne nennt den Knoten, wie in den Skizzen)
  const flagUp = (st: (typeof faceStrips)[number]) =>
    connectionOf(layout, pack, st) !== null && !st.cells.some((id) => byId.get(id)!.layer === 0);
  const labelStrips = faceStrips.filter((st) => !flagUp(st));
  // Bk-Labels über dem Pack, bei Bedarf in mehreren Zeilen gestaffelt
  const labelTexts = labelStrips.map((st) => `B${st.node}`);
  const labelX = labelStrips.map((st) => st.cells.reduce((a, id) => a + X(byId.get(id)!.x), 0) / st.cells.length);
  const labelLevels = stagger(
    labelX.map((x, i) => {
      const w = textWidth(labelTexts[i], fontSize.label);
      return { x0: x - w / 2, x1: x + w / 2 };
    }),
    0.8,
  );
  const labels: FaceLabel[] = labelStrips.map((st, i) => ({
    node: st.node,
    text: labelTexts[i],
    x: labelX[i],
    y: -3 - labelLevels[i] * (fontSize.label + 1.2),
    role: connectionOf(layout, pack, st)?.role ?? 'series',
  }));
  const labelTop = Math.min(0, ...labels.map((l) => l.y - fontSize.label));

  // Anschlussfahnen: nach unten, wenn der Streifen eine untere Zelle enthält, sonst nach oben
  const raw = faceStrips
    .map((st, i) => ({ st, i, conn: connectionOf(layout, pack, st) }))
    .filter((f) => f.conn !== null)
    .map(({ st, i, conn }) => {
      const cs = st.cells.map((id) => byId.get(id)!);
      const dir: 'up' | 'down' = cs.some((c) => c.layer === 0) ? 'down' : 'up';
      const edgeCell =
        dir === 'down' ? cs.filter((c) => c.layer === 0) : cs.filter((c) => c.layer === Math.max(...cs.map((q) => q.layer)));
      const x = edgeCell.reduce((a, c) => a + X(c.x), 0) / edgeCell.length;
      const w = textWidth(conn!.text, fontSize.flag) + 3;
      return { st, i, conn: conn!, dir, x, w };
    });
  const flags: FaceFlag[] = [];
  const boxH = fontSize.flag + 2.4;
  for (const dir of ['up', 'down'] as const) {
    const group = raw.filter((f) => f.dir === dir);
    const lv = stagger(
      group.map((f) => ({ x0: f.x - f.w / 2, x1: f.x + f.w / 2 })),
      1.5,
    );
    group.forEach((f, j) => {
      const step = boxH + 2;
      if (dir === 'down') {
        const y1 = H - 1;
        const boxY = H + 7 + lv[j] * step;
        flags.push({
          node: f.st.node,
          text: f.conn.text,
          role: f.conn.role,
          x: f.x,
          y1,
          y2: boxY,
          dir,
          box: { x: f.x - f.w / 2, y: boxY, w: f.w, h: boxH },
        });
      } else {
        const y1 = 1;
        const boxY = labelTop - 5 - boxH - lv[j] * step;
        flags.push({
          node: f.st.node,
          text: f.conn.text,
          role: f.conn.role,
          x: f.x,
          y1,
          y2: boxY + boxH,
          dir,
          box: { x: f.x - f.w / 2, y: boxY, w: f.w, h: boxH },
        });
      }
    });
  }

  const markerGap = 4 + fontSize.marker * 0.6;
  const markers = {
    left: (mirrored ? 'R' : 'L') as Side,
    right: (mirrored ? 'L' : 'R') as Side,
    y: H / 2,
    leftX: -markerGap,
    rightX: W + markerGap,
  };

  const minX = Math.min(markers.leftX - fontSize.marker * 0.6, ...flags.map((f) => f.box.x)) - 1;
  const maxX = Math.max(markers.rightX + fontSize.marker * 0.6, ...flags.map((f) => f.box.x + f.box.w)) + 1;
  const minY = Math.min(labelTop, ...flags.map((f) => f.box.y)) - 2;
  const maxY = Math.max(H + 5, ...flags.map((f) => f.box.y + f.box.h)) + 2;

  return {
    key: pack.key,
    face,
    mirrored,
    title: faceTitle(pack, face),
    width: W,
    height: H,
    r: R,
    cells,
    strips,
    labels,
    flags,
    markers,
    viewBox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    fontSize,
  };
}
