import { describe, expect, it, vi } from 'vitest';
import { solve } from '../src/core';
import type { ConfigState, PresetId } from '../src/state/config';
import {
  boosterInfo,
  DEFAULT_STATE,
  isBoosterRowIssue,
  isRowPlanIssue,
  matchingPreset,
  mergeWithDefaults,
  reducer,
  rowInfo,
  toBatteryConfig,
} from '../src/state/config';
import { fromJsonFile, loadLocal, saveLocal, toJsonFile } from '../src/state/storage';
import { decodeState, encodeState } from '../src/state/url';
import { DEFAULT_CONFIG } from '../src/core';

/** App-Standard: wie DEFAULT_CONFIG, aber mit der Standardzelle Molicel P50B (Plan §1.1). */
const P50B_CELL = {
  id: 'molicel-p50b',
  label: 'Molicel INR-21700-P50B',
  diameter: 21.55,
  length: 70.15,
  capacityAh: 5,
  nominalV: 3.6,
  maxV: 4.2,
};
const APP_DEFAULT = { ...DEFAULT_CONFIG, cell: P50B_CELL };

describe('Reducer', () => {
  it('Standard ergibt DEFAULT_CONFIG mit P50B', () => {
    expect(toBatteryConfig(DEFAULT_STATE)).toEqual(APP_DEFAULT);
    expect(matchingPreset(DEFAULT_STATE)).toBe('18S2P');
  });

  it('Presets setzen die Fixture-Konfigurationen', () => {
    const s32 = reducer(DEFAULT_STATE, { type: 'preset', id: '32S1P' });
    expect(toBatteryConfig(s32)).toEqual({ ...APP_DEFAULT, series: 32, parallel: 1, cellsPerRow: 8 });
    expect(matchingPreset(s32)).toBe('32S1P');
    const s20 = reducer(DEFAULT_STATE, { type: 'preset', id: '20S2P' });
    expect(toBatteryConfig(s20)).toEqual({ ...APP_DEFAULT, series: 20, cellsPerRow: 10 });
    const split = reducer(DEFAULT_STATE, { type: 'preset', id: '20S2P-split' });
    expect(toBatteryConfig(split)).toEqual({
      ...APP_DEFAULT,
      series: 20,
      booster: { series: 2, cellsPerRow: 2, position: 'plus' },
    });
    expect(split.seriesSplit).toEqual([9, 9]);
    const s30 = reducer(DEFAULT_STATE, { type: 'preset', id: '30S1P' });
    expect(toBatteryConfig(s30)).toEqual({ ...APP_DEFAULT, series: 30, parallel: 1, cellsPerRow: 8 });
    expect(matchingPreset(s30)).toBe('30S1P');
    expect(s30.seriesSplit).toEqual([15, 15]);
  });

  it('Zelle P30B (18650) setzt Maße, Verschaltung bleibt gleich', () => {
    const s = reducer(DEFAULT_STATE, { type: 'cellType', cellType: 'molicel-p30b' });
    expect(s.cell.diameter).toBe(18.6);
    expect(s.cell.length).toBe(65.2);
    expect(s.cell.capacityAh).toBe(3);
    const a = solve(toBatteryConfig(DEFAULT_STATE));
    const b = solve(toBatteryConfig(s));
    expect(b.packs.map((p) => p.groups)).toEqual(a.packs.map((p) => p.groups));
    expect(b.packs[0].width).toBeLessThan(a.packs[0].width);
  });

  it('Abstandhalter: Pflichtfelder leer -> Fehler, kein Layout', () => {
    let s = reducer(DEFAULT_STATE, { type: 'set', patch: { stacking: 'grid' } });
    s = reducer(s, { type: 'spacingMode', mode: 'spacer' });
    expect(s.gapRow).toBeNull();
    const L = solve(toBatteryConfig(s));
    expect(L.packs).toEqual([]);
    expect(L.issues.filter((i) => i.level === 'error').map((i) => i.msg)).toEqual([
      'Abstandhalter: „Spalt Reihe“ ist ein Pflichtfeld (≥ 0 mm).',
      'Abstandhalter: „Spalt Lage“ ist ein Pflichtfeld (≥ 0 mm).',
      'Abstandhalter: „Halter-Außenrand“ ist ein Pflichtfeld (≥ 0 mm).',
    ]);
    s = reducer(s, { type: 'set', patch: { gapRow: 1.5, gapLayer: 1.5, holderRim: 1.2 } });
    expect(solve(toBatteryConfig(s)).packs.length).toBe(2);
  });

  it('Teilpack-Anzahl passt die Aufteilung an', () => {
    const s = reducer(DEFAULT_STATE, { type: 'set', patch: { subPacks: 3, series: 21 } });
    expect(s.seriesSplit).toEqual([7, 7, 7]);
    expect(s.cellsPerRowSplit).toEqual([7, 7, 7]);
    const m = reducer(s, { type: 'set', patch: { seriesSplitManual: true, seriesSplit: [6, 7, 8] } });
    expect(toBatteryConfig(m).seriesSplit).toEqual([6, 7, 8]);
  });

  it('Booster reduziert die Hauptpack-Aufteilung', () => {
    const s = reducer(DEFAULT_STATE, { type: 'set', patch: { series: 20, boosterEnabled: true } });
    expect(s.seriesSplit).toEqual([9, 9]);
  });
});

describe('Lagen und Brückenwahl (Plan 06 §4)', () => {
  const preset = (id: PresetId) => reducer(DEFAULT_STATE, { type: 'preset', id });
  const set = (s: ConfigState, patch: Partial<ConfigState>) => reducer(s, { type: 'set', patch });
  const errorsOf = (s: ConfigState) =>
    solve(toBatteryConfig(s))
      .issues.filter((i) => i.level === 'error')
      .map((i) => i.msg);

  it('S ändern passt die Zellen je Lage an und ergibt nie einen Fehler', () => {
    for (const [series, perRow] of [
      [18, 9],
      [20, 10],
      [30, 15],
      [32, 16],
    ]) {
      const s = set(DEFAULT_STATE, { series });
      expect(s.cellsPerRow).toBe(perRow);
      expect(errorsOf(s)).toEqual([]);
    }
  });

  it('30S1P: 15 + 15, Brücke innen, 174,5 mm breit mit der P50B', () => {
    const L = solve(toBatteryConfig(preset('30S1P')));
    expect(L.issues).toEqual([]);
    expect(L.bridges[0]).toMatchObject({ kind: 'inner', node: 15 });
    expect(L.packs[0].width).toBeCloseTo(174.5, 9);
  });

  it('Brücke umschalten: andere Lage teilt ungleich auf, größerer Teilpack vorne', () => {
    const s20 = preset('20S2P');
    const inner = reducer(s20, { type: 'bridge', pos: 'inner' });
    expect(inner.bridge).toBe('inner');
    expect(inner.seriesSplit).toEqual([11, 9]);
    expect(toBatteryConfig(inner)).toEqual({
      ...APP_DEFAULT,
      series: 20,
      cellsPerRow: 11,
      seriesSplit: [11, 9],
      cellsPerRowSplit: [11, 9],
    });
    expect(solve(toBatteryConfig(inner)).bridges[0].kind).toBe('inner');
    // Klick auf die natürliche Lage = automatisch
    const back = reducer(inner, { type: 'bridge', pos: 'outer' });
    expect(back.bridge).toBe('auto');
    expect(toBatteryConfig(back)).toEqual(toBatteryConfig(s20));
  });

  it('ausdrückliche Wahl bleibt bestehen, wenn S sich ändert', () => {
    const inner = reducer(preset('20S2P'), { type: 'bridge', pos: 'inner' });
    expect(set(inner, { series: 18 }).seriesSplit).toEqual([9, 9]);
    expect(set(inner, { series: 24 }).seriesSplit).toEqual([13, 11]);
  });

  it('32S1P innen: 17 + 15 mit unvollständigen Lagen 9 + 8 und 8 + 7', () => {
    const s = reducer(preset('32S1P'), { type: 'bridge', pos: 'inner' });
    expect(toBatteryConfig(s)).toEqual({
      ...APP_DEFAULT,
      series: 32,
      parallel: 1,
      cellsPerRow: 9,
      seriesSplit: [17, 15],
      cellsPerRowSplit: [9, 8],
    });
    const L = solve(toBatteryConfig(s));
    expect(L.issues).toEqual([]);
    expect(L.packs.map((p) => p.cells.length)).toEqual([17, 15]);
    expect(L.bridges[0].kind).toBe('inner');
  });

  it('18S2P außen: 10 + 8', () => {
    const s = reducer(DEFAULT_STATE, { type: 'bridge', pos: 'outer' });
    expect(s.seriesSplit).toEqual([10, 8]);
    expect(solve(toBatteryConfig(s)).bridges[0].kind).toBe('outer');
  });

  it('manuelle Aufteilung schlägt die Brückenwahl', () => {
    const inner = reducer(preset('20S2P'), { type: 'bridge', pos: 'inner' });
    const manual = set(inner, { seriesSplitManual: true, seriesSplit: [10, 10] });
    expect(toBatteryConfig(manual).seriesSplit).toEqual([10, 10]);
    expect(manual.cellsPerRowSplit).toEqual([10, 10]);
  });

  it('größere Lage unten', () => {
    const s = set(preset('30S1P'), { wideLayer: 'bottom' });
    expect(toBatteryConfig(s).wideLayer).toBe('bottom');
    const L = solve(toBatteryConfig(s));
    expect(L.cost).toBe(0);
    expect(L.packs[0].startsOnTop).toBe(false);
  });

  it('Zellen je Lage manuell: der Wert gilt, auch wenn er nach einer S-Änderung nicht mehr passt', () => {
    const s = set(DEFAULT_STATE, { cellsPerRowManual: true, cellsPerRow: 6 });
    expect(toBatteryConfig(s)).toEqual({ ...APP_DEFAULT, cellsPerRow: 6 });
    expect(solve(toBatteryConfig(s)).packs[0].layers).toBe(3);
    const s20 = set(s, { series: 20 });
    expect(s20.cellsPerRow).toBe(6);
    expect(errorsOf(s20)[0]).toBe('Teilpack 1: 20 Zellen lassen sich nicht in volle Lagen à 6 aufteilen.');
  });

  it('Lagen gehen nicht auf: eigene Meldung, kein Layout, Kernmeldungen sind nur Folgefehler', () => {
    const grid = set(DEFAULT_STATE, { stacking: 'grid', series: 30, parallel: 1 });
    expect(rowInfo(grid).error).toBe('Teilpack 1: 15 Zellen lassen sich nicht auf 2 Lagen aufteilen.');
    expect(Number.isNaN(toBatteryConfig(grid).cellsPerRow)).toBe(true);
    expect(solve(toBatteryConfig(grid)).packs).toEqual([]);
    expect(errorsOf(grid).every(isRowPlanIssue)).toBe(true);

    expect(rowInfo(set(DEFAULT_STATE, { series: 8, parallel: 1, layers: 3 })).error).toBe(
      'Teilpack 1: 4 Zellen lassen sich nicht auf 3 Lagen aufteilen.',
    );
    expect(rowInfo(set(DEFAULT_STATE, { series: 2, parallel: 1 })).error).toBe(
      'Teilpack 1: 1 Zellen lassen sich nicht auf 2 Lagen aufteilen.',
    );
    expect(rowInfo(DEFAULT_STATE)).toEqual({ perRow: [9, 9], error: null });
  });

  it('Booster mit unvollständiger Lage: 3S1P = 2 + 1', () => {
    const s = set(DEFAULT_STATE, {
      series: 33,
      parallel: 1,
      boosterEnabled: true,
      booster: { ...DEFAULT_STATE.booster, series: 3 },
    });
    expect(boosterInfo(s)).toEqual({
      layers: 2,
      packKey: 'P1',
      packLabel: 'Pack B (hinten)',
      cellsPerRow: 2,
      perRow: [2],
      split: [3],
      error: null,
    });
    const L = solve(toBatteryConfig(s));
    expect(L.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(L.packs.find((p) => p.role === 'booster')!.cells).toHaveLength(3);
  });

  it('kein Layout auch bei 4 Zellen auf 3 Lagen und 1 Zelle auf 2 Lagen', () => {
    // 4 Zellen à 2 wären im Kern 2 volle Lagen – gewählt sind aber 3 Lagen
    const three = set(DEFAULT_STATE, { series: 8, parallel: 1, layers: 3 });
    expect(rowInfo(three).error).toBe('Teilpack 1: 4 Zellen lassen sich nicht auf 3 Lagen aufteilen.');
    expect(solve(toBatteryConfig(three)).packs).toEqual([]);
    const one = set(DEFAULT_STATE, { series: 2, parallel: 1 });
    expect(rowInfo(one).error).toBe('Teilpack 1: 1 Zellen lassen sich nicht auf 2 Lagen aufteilen.');
    expect(solve(toBatteryConfig(one)).packs).toEqual([]);
  });

  it('Hauptpack ohne Gruppen: keine eigene Booster-Meldung, die Meldung zur Aufteilung reicht', () => {
    const auto = set(preset('20S2P-split'), { series: 2 });
    expect(auto.seriesSplit).toEqual([0, 0]);
    expect(boosterInfo(auto)!.error).toBeNull();
    const manual = set(set(preset('20S2P-split'), { cellsPerRowManual: true, cellsPerRow: 9 }), { series: 2 });
    expect(boosterInfo(manual)!.error).toBeNull();
  });
});

describe('Booster: gleiche Lagenzahl wie der Teilpack, an dem er hängt (Plan §3)', () => {
  const split = reducer(DEFAULT_STATE, { type: 'preset', id: '20S2P-split' });

  it('Fixture 20S2P Splitpack: 2S2P bei 2 Lagen -> 2 je Lage', () => {
    expect(toBatteryConfig(split).booster).toEqual({ series: 2, cellsPerRow: 2, position: 'plus' });
    expect(boosterInfo(split)).toEqual({
      layers: 2,
      packKey: 'P1',
      packLabel: 'Pack B (hinten)',
      cellsPerRow: 2,
      perRow: [2],
      split: [2],
      error: null,
    });
  });

  it('Plus-Ende = letzter, Minus-Ende = erster Teilpack der Kette (Kette ab mainMinus.end)', () => {
    // Hauptpack 10S2P + 8S2P mit 10 bzw. 4 Zellen je Lage: vorne 2 Lagen, hinten 4 Lagen
    const base = reducer(split, {
      type: 'set',
      patch: {
        series: 22,
        booster: { ...DEFAULT_STATE.booster, series: 4 },
        seriesSplitManual: true,
        seriesSplit: [10, 8],
        cellsPerRowSplitManual: true,
        cellsPerRowSplit: [10, 4],
      },
    });
    // Minus vorne: Kette vorne -> hinten, Plus-Ende = hinten (4 Lagen) -> 8 Zellen / 4 = 2 je Lage
    expect(boosterInfo(base)).toMatchObject({ layers: 4, packKey: 'P1', cellsPerRow: 2 });
    const minus = reducer(base, { type: 'set', patch: { booster: { ...DEFAULT_STATE.booster, series: 4, position: 'minus' } } });
    expect(boosterInfo(minus)).toMatchObject({ layers: 2, packKey: 'P0', cellsPerRow: 4 });
    // Minus hinten: Kette hinten -> vorne, Plus-Ende = vorne
    const rev = reducer(base, { type: 'set', patch: { mainMinus: { end: 'H', side: 'R' }, mainPlus: { end: 'V', side: 'R' } } });
    expect(boosterInfo(rev)).toMatchObject({ layers: 2, packKey: 'P0', cellsPerRow: 4 });
    expect(toBatteryConfig(rev).booster).toEqual({ series: 4, cellsPerRow: 4, position: 'plus' });
    expect(solve(toBatteryConfig(rev)).issues.filter((i) => i.level === 'error')).toEqual([]);
  });

  it('geht nicht auf -> Fehlermeldung am Booster', () => {
    const s = reducer(split, {
      type: 'set',
      patch: { series: 20, parallel: 1, layers: 3, booster: { ...DEFAULT_STATE.booster, series: 2 } },
    });
    // Hauptpack 18S1P, 9 + 9 Zellen à 3 je Lage -> 3 Lagen; Booster 2S1P = 2 Zellen auf 3 Lagen geht nicht
    expect(boosterInfo(s)!.error).toBe(
      'Booster: 2 Zellen (2S1P) lassen sich nicht auf 3 Lagen aufteilen (gleiche Lagenzahl wie der Teilpack, an dem der Booster hängt).',
    );
    expect(Number.isNaN(toBatteryConfig(s).booster!.cellsPerRow)).toBe(true);
  });

  it('alte Links mit booster.cellsPerRow: Wert wird ignoriert', () => {
    const s = mergeWithDefaults({ series: 20, boosterEnabled: true, booster: { series: 2, cellsPerRow: 4, position: 'plus' } });
    expect(s.booster).toEqual({ series: 2, position: 'plus', subPacks: 1, bridge: 'auto', layersManual: false, layers: 2 });
    expect(toBatteryConfig(s).booster!.cellsPerRow).toBe(2);
  });
});

describe('Geteilter Booster (Plan 07 §4)', () => {
  const set = (s: ConfigState, patch: Partial<ConfigState>) => reducer(s, { type: 'set', patch });
  const boost = (s: ConfigState, patch: Partial<ConfigState['booster']>) => set(s, { booster: { ...s.booster, ...patch } });
  const split = reducer(DEFAULT_STATE, { type: 'preset', id: '20S2P-split' });
  const errorsOf = (s: ConfigState) =>
    solve(toBatteryConfig(s))
      .issues.filter((i) => i.level === 'error')
      .map((i) => i.msg);

  it('Standardwerte; das Preset bleibt unverändert und wird erkannt', () => {
    expect(DEFAULT_STATE.booster).toEqual({
      series: 2,
      position: 'plus',
      subPacks: 1,
      bridge: 'auto',
      layersManual: false,
      layers: 2,
    });
    expect(toBatteryConfig(split).booster).toEqual({ series: 2, cellsPerRow: 2, position: 'plus' });
    expect(matchingPreset(split)).toBe('20S2P-split');
  });

  it('2 Einzelpacks, 2S: 1 + 1, gleiche Lagenzahl wie Pack B', () => {
    const s = boost(split, { subPacks: 2 });
    expect(toBatteryConfig(s).booster).toEqual({ series: 2, cellsPerRow: 1, position: 'plus', subPacks: 2 });
    expect(boosterInfo(s)).toEqual({
      layers: 2,
      packKey: 'P1',
      packLabel: 'Pack B (hinten)',
      cellsPerRow: 1,
      perRow: [1, 1],
      split: [1, 1],
      error: null,
    });
    expect(errorsOf(s)).toEqual([]);
    expect(solve(toBatteryConfig(s)).packs.map((p) => p.key)).toEqual(['P0', 'P1', 'BOOST0', 'BOOST1']);
    expect(matchingPreset(s)).toBeNull();
  });

  it('Brückenwahl im Booster: 4S außen 2 + 2, innen 3 + 1; Klick auf die natürliche Lage = automatisch', () => {
    const s4 = boost(split, { series: 4, subPacks: 2 });
    expect(toBatteryConfig(s4).booster).toEqual({ series: 4, cellsPerRow: 2, position: 'plus', subPacks: 2 });
    const inner = reducer(s4, { type: 'boosterBridge', pos: 'inner' });
    expect(inner.booster.bridge).toBe('inner');
    expect(toBatteryConfig(inner).booster).toEqual({
      series: 4,
      cellsPerRow: 3,
      position: 'plus',
      subPacks: 2,
      seriesSplit: [3, 1],
      cellsPerRowSplit: [3, 1],
    });
    expect(solve(toBatteryConfig(inner)).bridges.at(-1)).toMatchObject({ from: 'BOOST0', to: 'BOOST1', kind: 'inner', node: 19 });
    expect(reducer(inner, { type: 'boosterBridge', pos: 'outer' }).booster.bridge).toBe('auto');
    // 6S: natürlich innen 3 + 3, außen 4 + 2 (Hauptpack 14S = 7 + 7)
    const s6 = boost(split, { series: 6, subPacks: 2 });
    expect(boosterInfo(s6)!.split).toEqual([3, 3]);
    const outer = reducer(s6, { type: 'boosterBridge', pos: 'outer' });
    expect(outer.booster.bridge).toBe('outer');
    expect(boosterInfo(outer)!.split).toEqual([4, 2]);
    expect(solve(toBatteryConfig(outer)).bridges.at(-1)).toMatchObject({ kind: 'outer', node: 18 });
  });

  it('3 Einzelpacks: gleichmäßig, Rest nach vorne; Zellen je Lage je Einzelpack', () => {
    const s = boost(split, { series: 4, subPacks: 3 });
    expect(toBatteryConfig(s).booster).toEqual({
      series: 4,
      cellsPerRow: 2,
      position: 'plus',
      subPacks: 3,
      cellsPerRowSplit: [2, 1, 1],
    });
    expect(errorsOf(s)).toEqual([]);
  });

  it('eigene Lagenzahl', () => {
    const s = boost(split, { layersManual: true, layers: 1 });
    expect(boosterInfo(s)).toMatchObject({ layers: 1, cellsPerRow: 4, perRow: [4], split: [2], error: null });
    expect(toBatteryConfig(s).booster).toEqual({ series: 2, cellsPerRow: 4, position: 'plus' });
    // ohne Haken wirkt booster.layers nicht
    expect(boosterInfo(boost(split, { layers: 1 }))).toMatchObject({ layers: 2, cellsPerRow: 2 });
  });

  it('geht nicht auf: Meldung mit Buchstabe, kein Layout; eigene Lagenzahl behebt es', () => {
    // Hauptpack 18S1P = 9 + 9 (je 5 + 4 Zellen); Booster 2S1P als 1 + 1: je 1 Zelle passt nicht auf 2 Lagen
    const p1 = boost(set(split, { parallel: 1 }), { subPacks: 2 });
    expect(boosterInfo(p1)!.error).toBe('Booster A: 1 Zellen (1S1P) lassen sich nicht auf 2 Lagen aufteilen.');
    expect(Number.isNaN(toBatteryConfig(p1).booster!.cellsPerRow)).toBe(true);
    expect(solve(toBatteryConfig(p1)).packs).toEqual([]);
    const fixed = boost(p1, { layersManual: true, layers: 1 });
    expect(boosterInfo(fixed)).toMatchObject({ layers: 1, perRow: [1, 1], error: null });
    expect(errorsOf(fixed)).toEqual([]);
    // 1 Einzelpack mit eigener Lagenzahl: ohne Buchstabe und ohne den Verweis auf den Teilpack
    const single = boost(set(split, { parallel: 1 }), { layersManual: true, layers: 3 });
    expect(boosterInfo(single)!.error).toBe('Booster: 2 Zellen (2S1P) lassen sich nicht auf 3 Lagen aufteilen.');
  });

  it('Teilpack geht nicht auf (Zellen je Lage manuell): keine Booster-Meldung mit „NaN“', () => {
    const s = set(boost(split, { subPacks: 2 }), { cellsPerRowManual: true, cellsPerRow: 7 });
    expect(boosterInfo(s)).toMatchObject({ perRow: null, error: null });
    expect(errorsOf(s)).toEqual([
      'Teilpack 1: 18 Zellen lassen sich nicht in volle Lagen à 7 aufteilen.',
      'Teilpack 2: 18 Zellen lassen sich nicht in volle Lagen à 7 aufteilen.',
      'Booster: Zellen je Lage muss eine ganze Zahl ≥ 1 sein.',
    ]);
  });

  it('Folgefehler des Kerns zum Booster werden erkannt', () => {
    expect(isBoosterRowIssue('Booster: Zellen je Lage muss eine ganze Zahl ≥ 1 sein.')).toBe(true);
    expect(isBoosterRowIssue('Booster-Einzelpack 1: 1 Zellen lassen sich nicht in volle Lagen à NaN aufteilen.')).toBe(true);
    expect(isBoosterRowIssue('Booster: zu wenige Seriengruppen für die Anzahl der Einzelpacks.')).toBe(false);
  });

  // Review Focus 3
  it('gespeicherter Stand: unbrauchbare Werte fallen auf den Standard, gültige bleiben', () => {
    const bad = mergeWithDefaults({
      boosterEnabled: true,
      booster: { series: 2, position: 'plus', subPacks: 9, bridge: 'x', layersManual: 'yes', layers: 0 },
    });
    expect(bad.booster).toEqual(DEFAULT_STATE.booster);
    const good = mergeWithDefaults({
      series: 20,
      boosterEnabled: true,
      booster: { series: 4, position: 'minus', subPacks: 2, bridge: 'inner', layersManual: true, layers: 1 },
    });
    expect(good.booster).toEqual({ series: 4, position: 'minus', subPacks: 2, bridge: 'inner', layersManual: true, layers: 1 });
    expect(decodeState(encodeState(good))).toEqual(good);
  });

  it('Patch ohne die neuen Felder: Standardwerte', () => {
    const patch = { booster: { series: 3, position: 'minus' } } as unknown as Partial<ConfigState>;
    expect(set(DEFAULT_STATE, patch).booster).toEqual({
      series: 3,
      position: 'minus',
      subPacks: 1,
      bridge: 'auto',
      layersManual: false,
      layers: 2,
    });
  });
});

describe('URL-Hash und JSON', () => {
  const variants: ConfigState[] = [
    DEFAULT_STATE,
    reducer(DEFAULT_STATE, { type: 'preset', id: '20S2P-split' }),
    reducer(reducer(DEFAULT_STATE, { type: 'spacingMode', mode: 'spacer' }), { type: 'set', patch: { gapRow: 1.5 } }),
    reducer(DEFAULT_STATE, { type: 'part', id: 'wrap-P0', enabled: false, count: 2 }),
    reducer(DEFAULT_STATE, { type: 'cellType', cellType: 'custom' }),
    reducer(DEFAULT_STATE, { type: 'preset', id: '30S1P' }),
    reducer(reducer(DEFAULT_STATE, { type: 'preset', id: '20S2P' }), { type: 'bridge', pos: 'inner' }),
  ];

  it('Roundtrip über den Hash', () => {
    for (const s of variants) {
      const h = encodeState(s);
      if (s === DEFAULT_STATE) expect(h).toBe('');
      else expect(decodeState('#' + h)).toEqual(s);
    }
  });

  it('Hash mit Umlauten und kaputter Hash', () => {
    const s = { ...DEFAULT_STATE, cellType: 'custom', cell: { ...DEFAULT_STATE.cell, id: 'custom', label: 'Zelle Ä–Ö' } };
    expect(decodeState(encodeState(s))).toEqual(s);
    expect(decodeState('#c=%%%')).toBeNull();
    expect(decodeState('#foo')).toBeNull();
  });

  it('Roundtrip über JSON-Datei, fremde Datei wird abgelehnt', () => {
    for (const s of variants) expect(fromJsonFile(toJsonFile(s))).toEqual(s);
    expect(() => fromJsonFile('{"a":1}')).toThrow(/keine Akku-Konfigurator/);
    expect(() => fromJsonFile('nope')).toThrow(/kein gültiges JSON/);
  });

  it('alte generische Zelltypen laden als eigene Zelle mit den gespeicherten Maßen (Plan §7)', () => {
    const old = mergeWithDefaults({
      cellType: '18650',
      cell: { id: '18650', label: '18650', diameter: 18.5, length: 65, capacityAh: 3, nominalV: 3.6, maxV: 4.2 },
    });
    expect(old.cellType).toBe('custom');
    expect(old.cell).toEqual({
      id: 'custom',
      label: 'eigene Zelle',
      diameter: 18.5,
      length: 65,
      capacityAh: 3,
      nominalV: 3.6,
      maxV: 4.2,
    });
    // alter Link ohne Zellangabe (damals Standard 21700) -> heutiger Standard P50B (Nutzerentscheidung)
    expect(mergeWithDefaults({ series: 20 }).cellType).toBe('molicel-p50b');
    // Datenblattzelle: Werte kommen immer aus der Datenbank
    const rs = mergeWithDefaults({ cellType: 'reliance-rs60', cell: { diameter: 99 } });
    expect(rs.cell.diameter).toBe(21.6);
    expect(rs.cell.capacityAh).toBe(5.85);
  });

  it('eigene Zelle behält die Maße, Datenblattzelle setzt ihre Werte', () => {
    const s = reducer(DEFAULT_STATE, { type: 'cellType', cellType: 'custom' });
    expect(s.cell).toEqual({ ...P50B_CELL, id: 'custom', label: 'eigene Zelle' });
    const back = reducer(s, { type: 'cellType', cellType: 'eve-50pl' });
    expect(back.cell).toEqual({
      id: 'eve-50pl',
      label: 'EVE INR21700/50PL',
      diameter: 21.25,
      length: 70.3,
      capacityAh: 5,
      nominalV: 3.6,
      maxV: 4.2,
    });
  });

  it('ungültige Enum-Werte fallen auf Standard zurück', () => {
    const s = mergeWithDefaults({ stacking: 'quatsch', mainMinus: { end: 'X', side: 'L' }, series: '18' });
    expect(s.stacking).toBe('honeycomb');
    expect(s.mainMinus).toEqual({ end: 'V', side: 'L' });
    expect(s.series).toBe(18);
    const t = mergeWithDefaults({ bridge: 'quatsch', wideLayer: 'seitlich', layers: 99 });
    expect(t).toMatchObject({ bridge: 'auto', wideLayer: 'top', layers: 2 });
  });
});

describe('Alte Stände im Format 1 (Plan 06 §4.7)', () => {
  const oldHash = (o: unknown) => '#c=' + Buffer.from(JSON.stringify(o)).toString('base64url');
  const errorsOf = (s: ConfigState) =>
    solve(toBatteryConfig(s))
      .issues.filter((i) => i.level === 'error')
      .map((i) => i.msg);

  it('neue Stände: Hash c2=, JSON version 2', () => {
    const s30 = reducer(DEFAULT_STATE, { type: 'preset', id: '30S1P' });
    expect(encodeState(s30)).toMatch(/^c2=/);
    expect(JSON.parse(toJsonFile(s30)).version).toBe(2);
  });

  it('alter 32S1P-Link: automatisch, 2 Lagen, gleicher Akku', () => {
    const s = decodeState(oldHash({ series: 32, parallel: 1, cellsPerRow: 8, seriesSplit: [16, 16], cellsPerRowSplit: [8, 8] }))!;
    expect(s).toMatchObject({ layers: 2, cellsPerRowManual: false, cellsPerRowSplitManual: false, bridge: 'auto' });
    expect(matchingPreset(s)).toBe('32S1P');
    expect(toBatteryConfig(s)).toEqual({ ...APP_DEFAULT, series: 32, parallel: 1, cellsPerRow: 8 });
  });

  it('alter Link mit 3 Lagen (18S3P à 9): automatisch, 3 Lagen', () => {
    const s = decodeState(oldHash({ parallel: 3 }))!;
    expect(s).toMatchObject({ layers: 3, cellsPerRowManual: false, cellsPerRow: 9 });
    expect(toBatteryConfig(s)).toEqual({ ...APP_DEFAULT, parallel: 3 });
  });

  it('alter Link mit Aufteilung 14 + 18 und 7 / 9 je Lage: Aufteilung bleibt manuell, Zellen je Lage automatisch', () => {
    const s = decodeState(
      oldHash({
        series: 32,
        parallel: 1,
        cellsPerRow: 9,
        seriesSplitManual: true,
        seriesSplit: [14, 18],
        cellsPerRowSplitManual: true,
        cellsPerRowSplit: [7, 9],
      }),
    )!;
    expect(s).toMatchObject({ seriesSplitManual: true, seriesSplit: [14, 18], layers: 2, cellsPerRowSplitManual: false });
    expect(solve(toBatteryConfig(s)).packs.map((p) => p.perRow)).toEqual([7, 9]);
  });

  it('alter fehlerhafter Link (20S2P à 9) zeigt weiterhin denselben Fehler', () => {
    const s = decodeState(oldHash({ series: 20 }))!;
    expect(s).toMatchObject({ cellsPerRowManual: true, cellsPerRow: 9 });
    expect(errorsOf(s)).toEqual([
      'Teilpack 1: 20 Zellen lassen sich nicht in volle Lagen à 9 aufteilen.',
      'Teilpack 2: 20 Zellen lassen sich nicht in volle Lagen à 9 aufteilen.',
    ]);
  });

  it('Ausnahme: alter Link 30S1P à 8 zeigt jetzt den Akku mit unvollständiger Lage', () => {
    const s = decodeState(oldHash({ series: 30, parallel: 1, cellsPerRow: 8 }))!;
    expect(s.cellsPerRowManual).toBe(true);
    expect(solve(toBatteryConfig(s)).packs.map((p) => p.cells.length)).toEqual([15, 15]);
  });

  // Review Focus 4
  it('alter Link mit unbrauchbaren Werten lädt ohne Ausnahme und zeigt den Fehler des Kerns', () => {
    const s = decodeState(oldHash({ cellsPerRow: 0 }))!;
    expect(s.cellsPerRowManual).toBe(true);
    expect(errorsOf(s)).toContain('Zellen je Lage muss eine ganze Zahl ≥ 1 sein.');
    expect(decodeState(oldHash('kein Objekt'))).toBeNull();
  });

  it('JSON-Datei version 1 und localStorage v1 werden übernommen; gespeichert wird unter v2', () => {
    const file = JSON.stringify({ format: 'akku-konfigurator', version: 1, config: { series: 32, parallel: 1, cellsPerRow: 8 } });
    expect(matchingPreset(fromJsonFile(file))).toBe('32S1P');

    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    });
    store.set('akku-konfigurator:v1', JSON.stringify({ series: 32, parallel: 1, cellsPerRow: 8 }));
    expect(matchingPreset(loadLocal()!)).toBe('32S1P');
    saveLocal(reducer(DEFAULT_STATE, { type: 'preset', id: '30S1P' }));
    expect(store.has('akku-konfigurator:v2')).toBe(true);
    expect(matchingPreset(loadLocal()!)).toBe('30S1P'); // v2 hat Vorrang vor v1
    vi.unstubAllGlobals();
  });
});
