import { otherFace, placeCells } from './geometry';
import type { BatteryConfig, Cell, Face, Group, RunDir, Stacking, Strip, SubPack } from './types';

/**
 * Reihenfolge der Zellen entlang der Serienrichtung.
 *  - Wabe mit 1–2 Lagen: strikt nach x sortiert -> Zickzack, jede Verbindung SCHRÄG
 *    (bestätigt: "immer schräg, angefangen von unten nach oben").
 *  - Raster oder Wabe ≥3 Lagen: spaltenweise Serpentine (Spalte 0 unten->oben, Spalte 1 oben->unten …).
 */
export function orderCells(cells: Cell[], dir: RunDir, stacking: Stacking, layers: number): Cell[] {
  const sgn = dir === 'LR' ? 1 : -1;
  if (stacking === 'honeycomb' && layers <= 2) {
    return [...cells].sort((a, b) => sgn * (a.x - b.x));
  }
  const perRow = Math.max(...cells.map((c) => c.index)) + 1;
  const cols: number[] = [];
  for (let i = 0; i < perRow; i++) cols.push(dir === 'LR' ? i : perRow - 1 - i);
  const out: Cell[] = [];
  cols.forEach((col, ci) => {
    const colCells = cells.filter((c) => c.index === col).sort((a, b) => a.layer - b.layer);
    if (ci % 2 === 1) colCells.reverse();
    out.push(...colCells);
  });
  return out;
}

export interface SubPackOptions {
  key: string;
  role: 'main' | 'booster';
  position: number;
  label: string;
  series: number;
  perRow: number;
  dir: RunDir;
  startFace: Face;
  /** Anzahl Seriengruppen vor diesem Teilpack in der Kette */
  sStart: number;
}

/** Baut einen Teilpack: Zellen, Gruppen (je P Zellen), Polarität und Nickelstreifen (Fachkonzept §4). */
export function buildSubPack(cfg: BatteryConfig, o: SubPackOptions): SubPack {
  const P = cfg.parallel;
  const nCells = o.series * P;
  const layers = Math.ceil(nCells / o.perRow);
  const { cells, width, height } = placeCells(cfg, o.perRow, layers, nCells);
  const ordered = orderCells(cells, o.dir, cfg.stacking, layers);
  const groups: Group[] = [];
  for (let j = 0; j < o.series; j++) {
    groups.push({
      s: o.sStart + j + 1,
      cells: ordered.slice(j * P, j * P + P).map((c) => c.id),
      minusFace: j % 2 === 0 ? o.startFace : otherFace(o.startFace),
    });
  }
  const strips: Strip[] = [];
  strips.push({ face: groups[0].minusFace, node: o.sStart, cells: groups[0].cells, kind: 'start' });
  for (let j = 0; j + 1 < groups.length; j++) {
    strips.push({
      face: otherFace(groups[j].minusFace),
      node: groups[j].s,
      cells: [...groups[j].cells, ...groups[j + 1].cells],
      kind: 'series',
    });
  }
  const last = groups[groups.length - 1];
  strips.push({ face: otherFace(last.minusFace), node: last.s, cells: last.cells, kind: 'end' });
  const first = ordered[0];
  return {
    key: o.key,
    role: o.role,
    position: o.position,
    label: o.label,
    perRow: o.perRow,
    layers,
    series: o.series,
    dir: o.dir,
    startFace: o.startFace,
    endFace: otherFace(last.minusFace),
    startSide: o.dir === 'RL' ? 'R' : 'L',
    endSide: o.dir === 'RL' ? 'L' : 'R',
    startsOnTop: first.layer > 0,
    cells,
    groups,
    strips,
    width,
    height,
    length: cfg.cell.length + 2 * cfg.nickelThickness,
  };
}
