/** Unvollständige Lage (Plan 06 §3): Gültigkeit, Platzierung, Verschaltung – mit konkreten Zahlen. */
import { describe, expect, it } from 'vitest';
import type { BatteryConfig } from '../src/core';
import { DEFAULT_CONFIG, balanceTaps, layerPlan, packOutline, placeCells, solve } from '../src/core';
import { planSheets } from '../src/export/sheets';
import { buildParts } from '../src/fishpaper/parts';
import { DEFAULT_FISHPAPER } from '../src/state/config';
import { assumptions } from '../src/view/assumptions';
import { faceModel } from '../src/view/faceModel';
import { hasShortLayer, layerCounts, widestLayerCells } from '../src/view/layers';
import { topModel } from '../src/view/topModel';

const cfg30: BatteryConfig = { ...DEFAULT_CONFIG, series: 30, parallel: 1, cellsPerRow: 8 };
const errorsOf = (cfg: BatteryConfig) =>
  solve(cfg)
    .issues.filter((i) => i.level === 'error')
    .map((i) => i.msg);

describe('Gültigkeit (§3.1)', () => {
  it('layerPlan: volle Lagen, unvollständige Lage, ungültig', () => {
    expect(layerPlan(DEFAULT_CONFIG, 16, 8)).toBe('full');
    expect(layerPlan(DEFAULT_CONFIG, 1, 1)).toBe('full');
    expect(layerPlan(DEFAULT_CONFIG, 15, 8)).toBe('short');
    expect(layerPlan(DEFAULT_CONFIG, 3, 2)).toBe('short');
    expect(layerPlan(DEFAULT_CONFIG, 13, 8)).toBeNull();
    expect(layerPlan(DEFAULT_CONFIG, 14, 8)).toBeNull();
    expect(layerPlan(DEFAULT_CONFIG, 15, NaN)).toBeNull();
    expect(layerPlan({ ...DEFAULT_CONFIG, stacking: 'grid' }, 15, 8)).toBeNull();
  });

  it('Raster und 13 Zellen à 8: Fehlertext wortgleich zu heute, kein Layout', () => {
    expect(errorsOf({ ...cfg30, stacking: 'grid' })).toEqual([
      'Teilpack 1: 15 Zellen lassen sich nicht in volle Lagen à 8 aufteilen.',
      'Teilpack 2: 15 Zellen lassen sich nicht in volle Lagen à 8 aufteilen.',
    ]);
    expect(solve({ ...cfg30, stacking: 'grid' }).packs).toEqual([]);
    expect(errorsOf({ ...DEFAULT_CONFIG, series: 13, parallel: 1, subPacks: 1, cellsPerRow: 8 })).toEqual([
      'Teilpack 1: 13 Zellen lassen sich nicht in volle Lagen à 8 aufteilen.',
    ]);
  });
});

describe('Platzierung (§3.2, §3.4)', () => {
  it('15 Zellen, große Lage oben', () => {
    const { cells, width, height } = placeCells(DEFAULT_CONFIG, 8, 2, 15);
    const top = cells.filter((c) => c.layer === 1);
    const bottom = cells.filter((c) => c.layer === 0);
    expect(top.map((c) => c.id)).toEqual(['L1-0', 'L1-1', 'L1-2', 'L1-3', 'L1-4', 'L1-5', 'L1-6', 'L1-7']);
    expect(bottom.map((c) => c.id)).toEqual(['L0-0', 'L0-1', 'L0-2', 'L0-3', 'L0-4', 'L0-5', 'L0-6']);
    expect(top[0].x).toBeCloseTo(10.7, 9);
    expect(top[7].x).toBeCloseTo(162.6, 9);
    expect(top[0].z).toBeCloseTo(29.4928, 3);
    expect(bottom[0].x).toBeCloseTo(21.55, 9);
    expect(bottom[6].x).toBeCloseTo(151.75, 9);
    expect(bottom[0].z).toBeCloseTo(10.7, 9);
    expect(width).toBeCloseTo(173.3, 9);
    expect(height).toBeCloseTo(40.1928, 3);
  });

  it('große Lage unten', () => {
    const { cells } = placeCells({ ...DEFAULT_CONFIG, wideLayer: 'bottom' }, 8, 2, 15);
    const top = cells.filter((c) => c.layer === 1);
    const bottom = cells.filter((c) => c.layer === 0);
    expect(bottom).toHaveLength(8);
    expect(top).toHaveLength(7);
    expect(bottom[0].x).toBeCloseTo(10.7, 9);
    expect(top[0].x).toBeCloseTo(21.55, 9);
  });

  it('Wabenversatz hat keine Wirkung; volle Lagen bleiben unverändert', () => {
    expect(placeCells({ ...DEFAULT_CONFIG, offsetSide: 'R' }, 8, 2, 15)).toEqual(placeCells(DEFAULT_CONFIG, 8, 2, 15));
    expect(placeCells(DEFAULT_CONFIG, 8, 2, 16)).toEqual(placeCells(DEFAULT_CONFIG, 8, 2));
  });
});

describe('30S1P (§3.4)', () => {
  const L = solve(cfg30);
  const [A, B] = L.packs;

  it('keine Hinweise, Kosten 2 (beide Teilpacks beginnen oben)', () => {
    expect(L.issues).toEqual([]);
    expect(L.cost).toBe(2);
  });

  it('Teilpacks: Richtung, Stirnseiten, 15 Zellen', () => {
    expect(A).toMatchObject({ dir: 'RL', startFace: 'V', endFace: 'H', startSide: 'R', endSide: 'L', perRow: 8, layers: 2 });
    expect(B).toMatchObject({ dir: 'LR', startFace: 'V', endFace: 'H', startSide: 'L', endSide: 'R', perRow: 8, layers: 2 });
    expect(A.startsOnTop).toBe(true);
    expect(B.startsOnTop).toBe(true);
    expect(A.cells).toHaveLength(15);
    expect(B.cells).toHaveLength(15);
    expect(A.width).toBeCloseTo(173.3, 9);
  });

  it('Gruppen und Polarität', () => {
    expect(A.groups[0]).toEqual({ s: 1, cells: ['L1-7'], minusFace: 'V' });
    expect(A.groups[1]).toEqual({ s: 2, cells: ['L0-6'], minusFace: 'H' });
    expect(A.groups[14]).toEqual({ s: 15, cells: ['L1-0'], minusFace: 'V' });
    expect(B.groups[0]).toEqual({ s: 16, cells: ['L1-0'], minusFace: 'V' });
    expect(B.groups[1]).toEqual({ s: 17, cells: ['L0-0'], minusFace: 'H' });
    expect(B.groups[14]).toEqual({ s: 30, cells: ['L1-7'], minusFace: 'V' });
  });

  it('Streifen und Abgriffe', () => {
    expect(A.strips).toHaveLength(16);
    expect(A.strips[0]).toEqual({ face: 'V', node: 0, cells: ['L1-7'], kind: 'start' });
    expect(A.strips[15]).toEqual({ face: 'H', node: 15, cells: ['L1-0'], kind: 'end' });
    expect(B.strips[0]).toEqual({ face: 'V', node: 15, cells: ['L1-0'], kind: 'start' });
    expect(B.strips[15]).toEqual({ face: 'H', node: 30, cells: ['L1-7'], kind: 'end' });
    const taps = balanceTaps(L);
    expect(taps).toHaveLength(31);
    expect(taps[0]).toEqual({
      node: 0,
      label: 'B0 (Hauptminus)',
      spots: [{ pack: 'P0', face: 'V', kind: 'start', cells: ['L1-7'] }],
    });
    expect(taps[30]).toEqual({
      node: 30,
      label: 'B30 (Hauptplus)',
      spots: [{ pack: 'P1', face: 'H', kind: 'end', cells: ['L1-7'] }],
    });
  });

  it('Brücke B15 innen links, gerade durch', () => {
    expect(L.bridges).toEqual([
      { from: 'P0', to: 'P1', node: 15, kind: 'inner', fromFace: 'H', toFace: 'V', fromSide: 'L', toSide: 'L' },
    ]);
  });

  it('Umriss gerade 393,67 mm, eingebogen 550,80 mm', () => {
    expect(packOutline(L, A, 'straight').perimeter).toBeCloseTo(393.6726, 3);
    expect(packOutline(L, A, 'tucked').perimeter).toBeCloseTo(550.8042, 3);
  });

  it('große Lage unten: Start unten, Kosten 0', () => {
    const Lb = solve({ ...cfg30, wideLayer: 'bottom' });
    expect(Lb.cost).toBe(0);
    expect(Lb.issues).toEqual([]);
    expect(Lb.packs[0].startsOnTop).toBe(false);
    expect(Lb.packs[0].groups[0].cells).toEqual(['L0-7']);
    expect(Lb.packs[0].groups[14].cells).toEqual(['L0-0']);
    expect(Lb.packs[1].groups[14].cells).toEqual(['L0-7']);
  });
});

describe('weitere Fälle', () => {
  it('18S3P à 14: 27 Zellen = 14 + 13, Dreiergruppen zusammenhängend', () => {
    const L = solve({ ...DEFAULT_CONFIG, parallel: 3, cellsPerRow: 14 });
    expect(L.issues).toEqual([]);
    expect(L.packs[0].cells).toHaveLength(27);
    expect(L.packs[0].groups[0].cells).toEqual(['L1-13', 'L0-12', 'L1-12']);
    expect(L.bridges[0].kind).toBe('inner');
  });

  it('31S1P = 16 + 15: volle und unvollständige Lage gemischt', () => {
    const L = solve({ ...DEFAULT_CONFIG, series: 31, parallel: 1, cellsPerRow: 8 });
    expect(L.packs.map((p) => p.cells.length)).toEqual([16, 15]);
    expect(L.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(L.bridges[0]).toMatchObject({ kind: 'outer', fromFace: 'V', toFace: 'V' });
  });

  it('Booster 3S1P = 2 + 1', () => {
    const L = solve({
      ...DEFAULT_CONFIG,
      series: 33,
      parallel: 1,
      cellsPerRow: 8,
      booster: { series: 3, cellsPerRow: 2, position: 'plus' },
    });
    expect(L.issues.filter((i) => i.level === 'error')).toEqual([]);
    const boost = L.packs.find((p) => p.role === 'booster')!;
    expect(boost.cells).toHaveLength(3);
    expect(boost.groups.map((g) => g.s)).toEqual([31, 32, 33]);
  });

  // Review Focus 1
  it('Abstandhalter mit ungleichen Spalten: keine Warnung, eingebogener Umriss bleibt eine Kontur', () => {
    const L = solve({
      ...cfg30,
      spacing: { ...DEFAULT_CONFIG.spacing, mode: 'spacer', gapRow: 1.5, gapLayer: 0.5, holderRim: 1.2 },
    });
    expect(L.issues).toEqual([]);
    expect(L.packs[0].width).toBeCloseTo(7 * 22.9 + 21.4, 9); // 181,7
    const straight = packOutline(L, L.packs[0], 'straight').perimeter;
    const tucked = packOutline(L, L.packs[0], 'tucked').perimeter;
    expect(straight).toBeCloseTo(416.2699, 3);
    expect(tucked).toBeCloseTo(531.0369, 3);
  });
});

describe('Ansichten und Fishpaper (§6)', () => {
  const L = solve(cfg30);
  const [A] = L.packs;
  const L18 = solve(DEFAULT_CONFIG);

  it('Lagen eines Teilpacks', () => {
    expect(layerCounts(A)).toEqual([7, 8]);
    expect(hasShortLayer(A)).toBe(true);
    expect(widestLayerCells(A).map((c) => c.id)).toEqual(['L1-0', 'L1-1', 'L1-2', 'L1-3', 'L1-4', 'L1-5', 'L1-6', 'L1-7']);
    expect(layerCounts(L18.packs[0])).toEqual([9, 9]);
    expect(hasShortLayer(L18.packs[0])).toBe(false);
    expect(widestLayerCells(L18.packs[0])[0].id).toBe('L0-0'); // volle Lagen: Lage 0 wie bisher
  });

  it('Draufsicht: Zelllinien aus der größeren Lage (linke Kante + 7 Trennlinien)', () => {
    const t = topModel(L).packs[0];
    expect(t.cellLines).toHaveLength(8);
    expect(t.cellLines[0]).toBeCloseTo(t.x, 9);
    expect(t.cellLines[1]).toBeCloseTo(t.x + 21.55, 9);
    expect(t.cellLines[7]).toBeCloseTo(t.x + 151.75, 9);
    expect(t.w).toBeCloseTo(173.3, 9);
  });

  it('Annahmen nennen die unvollständige Lage und den Start oben', () => {
    const t = assumptions(L).join('\n');
    expect(t).toContain('Unvollständige Lage: 8 oben + 7 unten, kürzere Lage in den Mulden. Alle Teilpacks identisch gestapelt.');
    expect(t).not.toContain('ungerade Lagen um ½ Zelle');
    expect(t).toContain('Verbindungen immer schräg (Zickzack), beginnend oben.');
    expect(t).toContain('Pack A läuft von rechts nach links und beginnt oben rechts (Stirnseite vorne).');
    expect(t).toContain('Brücke B15 innen zwischen Pack A und Pack B, links.');
  });

  it('Annahmen 18S2P bleiben wie bisher', () => {
    const t = assumptions(L18).join('\n');
    expect(t).toContain('Wabe: ungerade Lagen um ½ Zelle nach links versetzt. Alle Teilpacks identisch gestapelt.');
    expect(t).toContain('Verbindungen immer schräg (Zickzack), beginnend unten.');
    expect(t).not.toContain('Unvollständige Lage');
  });

  it('gemischt (31S1P): Versatz-Satz bleibt, unvollständige Lage wird je Teilpack genannt', () => {
    const t = assumptions(solve({ ...DEFAULT_CONFIG, series: 31, parallel: 1, cellsPerRow: 8 })).join('\n');
    expect(t).toContain('Wabe: ungerade Lagen um ½ Zelle nach links versetzt.');
    expect(t).toContain('Pack B: Unvollständige Lage: 8 oben + 7 unten, kürzere Lage in den Mulden.');
  });

  it('Stirnseite vorne: 15 Zellen, Hauptminus-Fahne nach oben', () => {
    const v = faceModel(L, A, 'V');
    expect(v.cells).toHaveLength(15);
    expect(v.flags.find((f) => f.role === 'minus')).toMatchObject({ text: 'HAUPT − (B0)', dir: 'up' });
  });

  it('Fishpaper: gleiche Teile wie bei 18S2P, Maße aus der Trapezform', () => {
    const parts = buildParts(L, DEFAULT_FISHPAPER);
    expect(parts.map((p) => p.id)).toEqual(['face-V-P0', 'face-H-P1', 'inter-P0-P1', 'side-P0', 'side-P1', 'wrap-P0', 'wrap-P1']);
    const face = parts.find((p) => p.id === 'face-V-P0')!;
    expect(Math.abs(face.w - 173.6)).toBeLessThan(0.2); // 151,9 + 2 × 10,85
    expect(Math.abs(face.h - 40.49)).toBeLessThan(0.2); // 18,79 + 2 × 10,85
    const wrap = parts.find((p) => p.id === 'wrap-P0')!;
    expect(Math.abs(wrap.w - (393.67 + 10))).toBeLessThanOrEqual(0.1);
    expect(wrap.h).toBeCloseTo(70.4, 6);
  });

  // Review Focus 2
  it('Umwicklung „gemeinsam“ bei 17 + 15 richtet sich nach dem breiteren Teilpack', () => {
    const L32 = solve({
      ...DEFAULT_CONFIG,
      series: 32,
      parallel: 1,
      cellsPerRow: 9,
      seriesSplit: [17, 15],
      cellsPerRowSplit: [9, 8],
    });
    expect(L32.bridges[0].kind).toBe('inner');
    const wrap = buildParts(L32, { ...DEFAULT_FISHPAPER, wrapMode: 'combined' }).find((p) => p.id === 'wrap-ALL')!;
    expect(Math.abs(wrap.w - (437.07 + 10))).toBeLessThanOrEqual(0.1);
    expect(wrap.h).toBeCloseTo(70.4 + 70.4 + 0.5, 6);
  });

  it('läuft für viele Größen komplett durch (Ansichten, Fishpaper, Seitenplan)', () => {
    let n = 0;
    for (const m of [2, 3, 5, 8, 10])
      for (const parallel of [1, 3])
        for (const wideLayer of ['top', 'bottom'] as const)
          for (const subPacks of [1, 2]) {
            const cells = 2 * m - 1;
            if (cells % parallel !== 0) continue;
            const Lx = solve({
              ...DEFAULT_CONFIG,
              subPacks,
              series: (cells / parallel) * subPacks,
              parallel,
              cellsPerRow: m,
              wideLayer,
            });
            expect(Lx.packs.map((p) => p.cells.length)).toEqual(Array.from({ length: subPacks }, () => cells));
            assumptions(Lx);
            topModel(Lx);
            for (const p of Lx.packs) for (const f of ['V', 'H'] as const) faceModel(Lx, p, f);
            for (const outlineFace of ['straight', 'tucked'] as const)
              planSheets(
                buildParts(Lx, { ...DEFAULT_FISHPAPER, outlineFace, outlineWrap: outlineFace, includeTopBottom: true }),
                'a4',
                'tile',
              );
            n++;
          }
    expect(n).toBe(32);
  });
});
