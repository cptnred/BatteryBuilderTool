/** Geteilter Booster (Plan 07 §3): Aufteilung, Prüfung, Kette, Brücken – mit konkreten Zahlen. */
import { describe, expect, it } from 'vitest';
import type { BatteryConfig, BoosterSpec, SubPack } from '../src/core';
import { DEFAULT_CONFIG, balanceTaps, boosterPerRowOf, boosterSplit, solve } from '../src/core';

/** 20S gesamt; bei einem 4S-Booster braucht der Hauptpack (16S = 8 + 8) cellsPerRow 8 */
const withBooster = (booster: BoosterSpec, patch: Partial<BatteryConfig> = {}): BatteryConfig => ({
  ...DEFAULT_CONFIG,
  series: 20,
  ...patch,
  booster,
});
const errorsOf = (cfg: BatteryConfig) =>
  solve(cfg)
    .issues.filter((i) => i.level === 'error')
    .map((i) => i.msg);

describe('Aufteilung (§3.1)', () => {
  it('gleichmäßig, Rest nach vorne; ohne subPacks ein Einzelpack', () => {
    expect(boosterSplit(DEFAULT_CONFIG)).toEqual([]);
    expect(boosterSplit(withBooster({ series: 2, cellsPerRow: 2, position: 'plus' }))).toEqual([2]);
    expect(boosterSplit(withBooster({ series: 2, cellsPerRow: 1, position: 'plus', subPacks: 2 }))).toEqual([1, 1]);
    expect(boosterSplit(withBooster({ series: 5, cellsPerRow: 1, position: 'plus', subPacks: 3 }))).toEqual([2, 2, 1]);
  });

  it('seriesSplit und cellsPerRowSplit gelten nur bei passender Länge und mehr als einem Einzelpack', () => {
    const c = withBooster({
      series: 4,
      cellsPerRow: 3,
      position: 'plus',
      subPacks: 2,
      seriesSplit: [3, 1],
      cellsPerRowSplit: [3, 1],
    });
    expect(boosterSplit(c)).toEqual([3, 1]);
    expect([boosterPerRowOf(c, 0), boosterPerRowOf(c, 1)]).toEqual([3, 1]);
    const wrongLength = withBooster({
      series: 4,
      cellsPerRow: 2,
      position: 'plus',
      subPacks: 2,
      seriesSplit: [4],
      cellsPerRowSplit: [4],
    });
    expect(boosterSplit(wrongLength)).toEqual([2, 2]);
    expect(boosterPerRowOf(wrongLength, 1)).toBe(2);
    const single = withBooster({ series: 2, cellsPerRow: 2, position: 'plus', seriesSplit: [5], cellsPerRowSplit: [7] });
    expect(boosterSplit(single)).toEqual([2]);
    expect(boosterPerRowOf(single, 0)).toBe(2);
  });

  it('unbrauchbare Anzahl: wie ein Einzelpack, ohne Absturz', () => {
    for (const subPacks of [0, 5, 1.5, NaN, -1, 1e9])
      expect(boosterSplit(withBooster({ series: 2, cellsPerRow: 2, position: 'plus', subPacks })), String(subPacks)).toEqual([2]);
  });
});

describe('Prüfung (§3.5)', () => {
  it('Anzahl der Einzelpacks', () => {
    for (const subPacks of [0, 5, 1.5, NaN])
      expect(errorsOf(withBooster({ series: 2, cellsPerRow: 2, position: 'plus', subPacks })), String(subPacks)).toEqual([
        'Booster: 1–4 Einzelpacks erlaubt.',
      ]);
  });

  it('zu wenige Gruppen für die Einzelpacks', () => {
    expect(errorsOf(withBooster({ series: 1, cellsPerRow: 1, position: 'plus', subPacks: 2 }, { series: 19 }))).toEqual([
      'Booster: zu wenige Seriengruppen für die Anzahl der Einzelpacks.',
    ]);
  });

  it('Aufteilung passt nicht zur Gruppenzahl', () => {
    const b: BoosterSpec = {
      series: 4,
      cellsPerRow: 3,
      position: 'plus',
      subPacks: 2,
      seriesSplit: [3, 2],
      cellsPerRowSplit: [3, 2],
    };
    expect(errorsOf(withBooster(b, { cellsPerRow: 8 }))).toEqual(['Booster: Aufteilung 3+2 ergibt nicht 4S.']);
  });

  it('Einzelpack ohne Gruppe', () => {
    const b: BoosterSpec = { series: 4, cellsPerRow: 4, position: 'plus', subPacks: 2, seriesSplit: [4, 0] };
    expect(errorsOf(withBooster(b, { cellsPerRow: 8 }))).toEqual([
      'Booster: jeder Einzelpack braucht mindestens 1 Seriengruppe.',
    ]);
  });

  it('Zellzahl passt nicht zu Zellen je Lage', () => {
    expect(errorsOf(withBooster({ series: 4, cellsPerRow: 3, position: 'plus', subPacks: 2 }, { cellsPerRow: 8 }))).toEqual([
      'Booster-Einzelpack 1: 4 Zellen lassen sich nicht in volle Lagen à 3 aufteilen.',
      'Booster-Einzelpack 2: 4 Zellen lassen sich nicht in volle Lagen à 3 aufteilen.',
    ]);
    // ein Einzelpack: die bisherige Meldung, wortgleich
    const old = ['Booster: Zellzahl passt nicht zu Zellen je Lage.'];
    expect(errorsOf(withBooster({ series: 2, cellsPerRow: 3, position: 'plus' }))).toEqual(old);
    expect(errorsOf(withBooster({ series: 2, cellsPerRow: 3, position: 'plus', subPacks: 1 }))).toEqual(old);
  });

  it('Zellen je Lage je Einzelpack: nur ganze Zahlen ≥ 1, 0 = Standard', () => {
    expect(
      errorsOf(withBooster({ series: 2, cellsPerRow: 1, position: 'plus', subPacks: 2, cellsPerRowSplit: [1.5, 1] })),
    ).toContain('Booster: Zellen je Lage je Einzelpack müssen ganze Zahlen ≥ 1 sein (0 = Standard).');
    expect(errorsOf(withBooster({ series: 2, cellsPerRow: 1, position: 'plus', subPacks: 2, cellsPerRowSplit: [0, 1] }))).toEqual(
      [],
    );
  });

  it('Zellen je Lage unbrauchbar (NaN aus dem Formular): nur die Meldung dazu, kein „à NaN“', () => {
    const integer = 'Booster: Zellen je Lage muss eine ganze Zahl ≥ 1 sein.';
    expect(errorsOf(withBooster({ series: 2, cellsPerRow: NaN, position: 'plus', subPacks: 2 }))).toEqual([integer]);
    // ein Einzelpack: die bisherigen zwei Meldungen
    expect(errorsOf(withBooster({ series: 2, cellsPerRow: NaN, position: 'plus' }))).toEqual([
      'Booster: Zellzahl passt nicht zu Zellen je Lage.',
      integer,
    ]);
  });

  it('Wabe mit mehr als 2 Lagen nur im Booster: Warnung, genau einmal', () => {
    const warn = 'Wabe mit mehr als 2 Lagen: Verschaltung als Spalten-Serpentine – bitte Schweißplan prüfen.';
    const onlyBooster = solve(withBooster({ series: 3, cellsPerRow: 2, position: 'plus' }, { series: 21 }));
    expect(onlyBooster.issues.filter((i) => i.msg === warn)).toHaveLength(1);
    const both = solve(withBooster({ series: 3, cellsPerRow: 2, position: 'plus' }, { series: 21, cellsPerRow: 6 }));
    expect(both.issues.filter((i) => i.msg === warn)).toHaveLength(1);
  });
});

describe('Kette des Boosters (§3.3, §3.6)', () => {
  const pick = (p: SubPack) => ({
    key: p.key,
    label: p.label,
    role: p.role,
    position: p.position,
    series: p.series,
    perRow: p.perRow,
    layers: p.layers,
    dir: p.dir,
    start: `${p.startFace}/${p.startSide}`,
    end: `${p.endFace}/${p.endSide}`,
  });
  const mainOuter = 'Brücke P0→P1 (B8) liegt nicht zwischen den Packs: gerade Gruppenzahl → Kabel/Brücke außen herum (links).';
  const A = solve(withBooster({ series: 2, cellsPerRow: 1, position: 'plus', subPacks: 2 }));

  it('A – 18S2P + 2S2P als 1 + 1: Brücke innen', () => {
    expect(A.issues).toEqual([]);
    expect(A.chain).toEqual(['P0', 'P1', 'BOOST0', 'BOOST1']);
    expect(A.packs.map((p) => p.key)).toEqual(['P0', 'P1', 'BOOST0', 'BOOST1']);
    const [, , a, b] = A.packs;
    expect(pick(a)).toEqual({
      key: 'BOOST0',
      label: 'Booster A (1S2P)',
      role: 'booster',
      position: 0,
      series: 1,
      perRow: 1,
      layers: 2,
      dir: 'LR',
      start: 'V/L',
      end: 'H/R',
    });
    expect(pick(b)).toEqual({
      key: 'BOOST1',
      label: 'Booster B (1S2P)',
      role: 'booster',
      position: 1,
      series: 1,
      perRow: 1,
      layers: 2,
      dir: 'RL',
      start: 'V/R',
      end: 'H/L',
    });
    expect(a.groups).toEqual([{ s: 19, cells: ['L1-0', 'L0-0'], minusFace: 'V' }]);
    expect(b.groups).toEqual([{ s: 20, cells: ['L0-0', 'L1-0'], minusFace: 'V' }]);
    expect(a.width).toBeCloseTo(32.25, 6);
    expect(a.height).toBeCloseTo(40.1928, 3);
    expect(A.bridges).toEqual([
      { from: 'P0', to: 'P1', node: 9, kind: 'inner', fromFace: 'H', toFace: 'V', fromSide: 'L', toSide: 'L' },
      { from: 'P1', to: 'BOOST0', node: 18, kind: 'cable', fromFace: 'H', toFace: 'V', fromSide: 'R', toSide: 'L' },
      { from: 'BOOST0', to: 'BOOST1', node: 19, kind: 'inner', fromFace: 'H', toFace: 'V', fromSide: 'R', toSide: 'R' },
    ]);
  });

  it('B – 16S2P + 4S2P als 2 + 2: Brücke außen, mit Hinweis', () => {
    const L = solve(withBooster({ series: 4, cellsPerRow: 2, position: 'plus', subPacks: 2 }, { cellsPerRow: 8 }));
    const [, , a, b] = L.packs;
    expect(pick(a)).toMatchObject({ key: 'BOOST0', label: 'Booster A (2S2P)', dir: 'LR', start: 'V/L', end: 'V/R' });
    expect(pick(b)).toMatchObject({ key: 'BOOST1', label: 'Booster B (2S2P)', dir: 'RL', start: 'H/R', end: 'H/L' });
    expect(a.groups).toEqual([
      { s: 17, cells: ['L1-0', 'L0-0'], minusFace: 'V' },
      { s: 18, cells: ['L1-1', 'L0-1'], minusFace: 'H' },
    ]);
    expect(b.groups).toEqual([
      { s: 19, cells: ['L0-1', 'L1-1'], minusFace: 'H' },
      { s: 20, cells: ['L0-0', 'L1-0'], minusFace: 'V' },
    ]);
    expect(a.width).toBeCloseTo(53.95, 6);
    expect(L.bridges.slice(1)).toEqual([
      { from: 'P1', to: 'BOOST0', node: 16, kind: 'cable', fromFace: 'H', toFace: 'V', fromSide: 'R', toSide: 'L' },
      { from: 'BOOST0', to: 'BOOST1', node: 18, kind: 'outer', fromFace: 'V', toFace: 'H', fromSide: 'R', toSide: 'R' },
    ]);
    expect(L.issues.map((i) => i.msg)).toEqual([
      mainOuter,
      'Brücke BOOST0→BOOST1 (B18) liegt nicht zwischen den Packs: gerade Gruppenzahl → Kabel/Brücke außen herum (rechts).',
    ]);
    expect(L.cost).toBe(201);
  });

  it('C – 4S als 3 + 1: Brücke innen, ungleich breit', () => {
    const b4: BoosterSpec = {
      series: 4,
      cellsPerRow: 3,
      position: 'plus',
      subPacks: 2,
      seriesSplit: [3, 1],
      cellsPerRowSplit: [3, 1],
    };
    const L = solve(withBooster(b4, { cellsPerRow: 8 }));
    const [, , a, b] = L.packs;
    expect(pick(a)).toMatchObject({ label: 'Booster A (3S2P)', perRow: 3, dir: 'LR', start: 'V/L', end: 'H/R' });
    expect(pick(b)).toMatchObject({ label: 'Booster B (1S2P)', perRow: 1, dir: 'RL', start: 'V/R', end: 'H/L' });
    expect(a.groups.map((g) => g.s)).toEqual([17, 18, 19]);
    expect(b.groups.map((g) => g.s)).toEqual([20]);
    expect(a.width).toBeCloseTo(75.65, 6);
    expect(b.width).toBeCloseTo(32.25, 6);
    expect(L.bridges.at(-1)).toEqual({
      from: 'BOOST0',
      to: 'BOOST1',
      node: 19,
      kind: 'inner',
      fromFace: 'H',
      toFace: 'V',
      fromSide: 'R',
      toSide: 'R',
    });
    expect(L.issues.map((i) => i.msg)).toEqual([mainOuter]);
  });

  it('D – Booster am Hauptminus: Kette beginnt am Booster, Kabel vom letzten Einzelpack', () => {
    const L = solve(withBooster({ series: 2, cellsPerRow: 1, position: 'minus', subPacks: 2 }));
    expect(L.chain).toEqual(['BOOST0', 'BOOST1', 'P0', 'P1']);
    expect(L.packs.map((p) => p.key)).toEqual(['P0', 'P1', 'BOOST0', 'BOOST1']);
    const [p0, p1, a, b] = L.packs;
    expect(a.groups.map((g) => g.s)).toEqual([1]);
    expect(b.groups.map((g) => g.s)).toEqual([2]);
    expect([p0.groups[0].s, p1.groups.at(-1)!.s]).toEqual([3, 20]);
    expect(L.bridges).toEqual([
      { from: 'BOOST0', to: 'BOOST1', node: 1, kind: 'inner', fromFace: 'H', toFace: 'V', fromSide: 'R', toSide: 'R' },
      { from: 'BOOST1', to: 'P0', node: 2, kind: 'cable', fromFace: 'H', toFace: 'V', fromSide: 'L', toSide: 'R' },
      { from: 'P0', to: 'P1', node: 11, kind: 'inner', fromFace: 'H', toFace: 'V', fromSide: 'L', toSide: 'L' },
    ]);
  });

  it('3 Einzelpacks 2 + 1 + 1: erste Brücke außen, zweite innen', () => {
    const b3: BoosterSpec = { series: 4, cellsPerRow: 2, position: 'plus', subPacks: 3, cellsPerRowSplit: [2, 1, 1] };
    const L = solve(withBooster(b3, { cellsPerRow: 8 }));
    expect(L.packs.slice(2).map((p) => p.label)).toEqual(['Booster A (2S2P)', 'Booster B (1S2P)', 'Booster C (1S2P)']);
    expect(L.bridges.slice(2).map((b) => `${b.from}>${b.to} B${b.node} ${b.kind}`)).toEqual([
      'BOOST0>BOOST1 B18 outer',
      'BOOST1>BOOST2 B19 inner',
    ]);
  });

  it('ein Einzelpack: dasselbe Layout wie ohne das Feld', () => {
    for (const position of ['plus', 'minus'] as const) {
      const base = withBooster({ series: 2, cellsPerRow: 2, position });
      const ref = solve(base);
      const one = solve({ ...base, booster: { ...base.booster!, subPacks: 1 } });
      expect({ ...one, config: null }).toEqual({ ...ref, config: null });
      expect(ref.packs.at(-1)).toMatchObject({ key: 'BOOST', label: 'Booster 2S2P', position: -1, dir: 'LR', startFace: 'V' });
    }
  });

  it('Kosten zählen nur den Hauptpack', () => {
    expect(A.cost).toBe(solve(withBooster({ series: 2, cellsPerRow: 2, position: 'plus' })).cost);
  });

  it('Balancer-Abgriffe laufen durch; der Brückenknoten hat an beiden Einzelpacks eine Nummer', () => {
    const taps = balanceTaps(A);
    const spots = (n: number) => taps[n].spots.map((s) => `${s.pack}/${s.face}/${s.kind}`);
    expect(taps.map((t) => t.node)).toEqual([...Array(21).keys()]);
    expect(spots(18)).toEqual(['P1/H/end', 'BOOST0/V/start']);
    expect(spots(19)).toEqual(['BOOST0/H/end', 'BOOST1/V/start']);
    expect(spots(20)).toEqual(['BOOST1/H/end']);
  });
});
