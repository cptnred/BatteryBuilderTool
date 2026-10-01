import type { Face, Layout, SubPack } from './types';

export interface PackStats {
  cells: number;
  nominalV: number;
  maxV: number;
  capacityAh: number;
  energyWh: number;
}

/** Kennzahlen (Fachkonzept §8). Rundung wie in der Referenz. */
export function stats(layout: Layout): PackStats {
  const c = layout.config;
  const cells = layout.packs.reduce((a, p) => a + p.cells.length, 0);
  return {
    cells,
    nominalV: +(c.series * c.cell.nominalV).toFixed(1),
    maxV: +(c.series * c.cell.maxV).toFixed(1),
    capacityAh: +(c.parallel * c.cell.capacityAh).toFixed(2),
    energyWh: Math.round(c.series * c.cell.nominalV * c.parallel * c.cell.capacityAh),
  };
}

export interface Dimensions {
  packs: { key: string; label: string; width: number; height: number; length: number }[];
  /** Hauptpack ohne Booster: max. Breite × max. Höhe × (Summe Längen + Zwischenlagen) */
  main: { width: number; height: number; length: number };
}

export function dimensions(layout: Layout): Dimensions {
  const main = layout.packs.filter((p) => p.role === 'main');
  return {
    packs: layout.packs.map((p) => ({ key: p.key, label: p.label, width: p.width, height: p.height, length: p.length })),
    main: {
      width: Math.max(0, ...main.map((p) => p.width)),
      height: Math.max(0, ...main.map((p) => p.height)),
      length: main.reduce((a, p) => a + p.length, 0) + Math.max(0, main.length - 1) * layout.config.packGap,
    },
  };
}

export interface NickelBomRow {
  pack: string;
  packLabel: string;
  face: Face;
  /** Zellen je Streifen */
  cells: number;
  count: number;
}

/** Nickelstreifen-Stückliste: je Teilpack und Stirnseite, gruppiert nach Zellzahl. */
export function nickelBom(layout: Layout): NickelBomRow[] {
  const rows: NickelBomRow[] = [];
  for (const p of layout.packs) {
    for (const face of ['V', 'H'] as const) {
      const counts = new Map<number, number>();
      for (const st of p.strips.filter((s) => s.face === face))
        counts.set(st.cells.length, (counts.get(st.cells.length) ?? 0) + 1);
      [...counts.entries()]
        .sort((a, b) => a[0] - b[0])
        .forEach(([cells, count]) => rows.push({ pack: p.key, packLabel: p.label, face, cells, count }));
    }
  }
  return rows;
}

/** Summe aller Streifen je Zellzahl über den ganzen Akku. */
export function nickelTotals(layout: Layout): { cells: number; count: number }[] {
  const m = new Map<number, number>();
  for (const r of nickelBom(layout)) m.set(r.cells, (m.get(r.cells) ?? 0) + r.count);
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([cells, count]) => ({ cells, count }));
}

/** Lage eines Streifens im Pack, von außen betrachtet unabhängig: globale Seite links/Mitte/rechts. */
export function stripPosition(pack: SubPack, cellIds: string[]): 'links' | 'Mitte' | 'rechts' {
  const byId = new Map(pack.cells.map((c) => [c.id, c]));
  const mx = cellIds.reduce((a, id) => a + byId.get(id)!.x, 0) / cellIds.length;
  const t = mx / pack.width;
  return t < 1 / 3 ? 'links' : t > 2 / 3 ? 'rechts' : 'Mitte';
}
