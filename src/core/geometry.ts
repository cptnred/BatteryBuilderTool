import type { BatteryConfig, Cell, Face, Pitches, Side } from './types';

/**
 * Mittenabstände laut Fachkonzept §3.
 *   px = D + Spalt_Reihe
 *   Wabe:   off = px/2, diag = D + Spalt_Lage, pz = sqrt(diag² − off²)
 *   Raster: off = 0,    pz = D + Spalt_Lage
 */
export function pitches(cfg: BatteryConfig): Pitches {
  const D = cfg.cell.diameter;
  const sp = cfg.spacing;
  const gapRow = sp.mode === 'fishpaper' ? sp.paperThickness : sp.gapRow;
  const gapLayer = sp.mode === 'fishpaper' ? sp.paperThickness : sp.gapLayer;
  const px = D + gapRow;
  if (cfg.stacking === 'grid') {
    const pz = D + gapLayer;
    return { px, pz, off: 0, diag: pz, gapRow, gapLayer };
  }
  const off = px / 2;
  const diag = D + gapLayer;
  // Wabe: Nachbar in der nächsten Lage liegt um off versetzt, Abstand = diag
  const pz = Math.sqrt(Math.max(diag * diag - off * off, 0));
  return { px, pz, off, diag, gapRow, gapLayer };
}

/** Zellmittelpunkte eines Teilpacks im Querschnitt (x,z) plus Außenmaße. */
export function placeCells(cfg: BatteryConfig, perRow: number, layers: number): { cells: Cell[]; width: number; height: number } {
  const D = cfg.cell.diameter;
  const R = D / 2;
  const p = pitches(cfg);
  const honey = cfg.stacking === 'honeycomb' && layers > 1;
  const cells: Cell[] = [];
  for (let l = 0; l < layers; l++) {
    const odd = l % 2 === 1;
    // offsetSide 'L': ungerade Lagen nach links versetzt -> gerade Lagen stehen um off weiter rechts
    let shift = 0;
    if (honey) shift = cfg.offsetSide === 'L' ? (odd ? 0 : p.off) : odd ? p.off : 0;
    for (let i = 0; i < perRow; i++) {
      cells.push({ id: `L${l}-${i}`, layer: l, index: i, x: R + shift + i * p.px, z: R + l * p.pz });
    }
  }
  const width = (perRow - 1) * p.px + (honey ? p.off : 0) + D;
  const height = (layers - 1) * p.pz + D;
  return { cells, width, height };
}

/** Alles bis zu diesem Mittenabstand gilt als "benachbart" (Fachkonzept §4.6). */
export function adjacency(cfg: BatteryConfig): number {
  const p = pitches(cfg);
  return Math.max(p.px, p.diag) + 0.01;
}

export function otherFace(f: Face): Face {
  return f === 'V' ? 'H' : 'V';
}

export function otherSide(s: Side): Side {
  return s === 'L' ? 'R' : 'L';
}

export function cellDistance(a: Pick<Cell, 'x' | 'z'>, b: Pick<Cell, 'x' | 'z'>): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
