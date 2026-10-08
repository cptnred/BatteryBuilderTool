/** Lagen eines Teilpacks für die Ansichten – rein. Bei unvollständiger Lage (Plan 06 §3) sind die Lagen ungleich groß. */
import type { Cell, SubPack } from '../core';

/** Zellzahl je Lage, Lage 0 (unten) zuerst. */
export function layerCounts(p: SubPack): number[] {
  const out = new Array<number>(p.layers).fill(0);
  for (const c of p.cells) out[c.layer]++;
  return out;
}

/** Hat der Teilpack eine unvollständige Lage? */
export function hasShortLayer(p: SubPack): boolean {
  return p.cells.length < p.perRow * p.layers;
}

/** Zellen der größten Lage, links -> rechts. Bei vollen Lagen ist das Lage 0. */
export function widestLayerCells(p: SubPack): Cell[] {
  const counts = layerCounts(p);
  const layer = counts.indexOf(Math.max(...counts));
  return p.cells.filter((c) => c.layer === layer).sort((a, b) => a.x - b.x);
}
