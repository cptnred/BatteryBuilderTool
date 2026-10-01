import { describe, expect, it } from 'vitest';
import { solve } from '../src/core';
import type { ConfigState } from '../src/state/config';
import { boosterInfo, DEFAULT_STATE, matchingPreset, mergeWithDefaults, reducer, toBatteryConfig } from '../src/state/config';
import { fromJsonFile, toJsonFile } from '../src/state/storage';
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
    const s = reducer(DEFAULT_STATE, { type: 'set', patch: { subPacks: 3, series: 21, cellsPerRow: 7 } });
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

describe('Booster: gleiche Lagenzahl wie der Teilpack, an dem er hängt (Plan §3)', () => {
  const split = reducer(DEFAULT_STATE, { type: 'preset', id: '20S2P-split' });

  it('Fixture 20S2P Splitpack: 2S2P bei 2 Lagen -> 2 je Lage', () => {
    expect(toBatteryConfig(split).booster).toEqual({ series: 2, cellsPerRow: 2, position: 'plus' });
    expect(boosterInfo(split)).toEqual({ layers: 2, packKey: 'P1', packLabel: 'Pack B (hinten)', cellsPerRow: 2, error: null });
  });

  it('Plus-Ende = letzter, Minus-Ende = erster Teilpack der Kette (Kette ab mainMinus.end)', () => {
    // Hauptpack 10S2P + 8S2P mit 10 bzw. 4 Zellen je Lage: vorne 2 Lagen, hinten 4 Lagen
    const base = reducer(split, {
      type: 'set',
      patch: {
        series: 22,
        booster: { series: 4, position: 'plus' },
        seriesSplitManual: true,
        seriesSplit: [10, 8],
        cellsPerRowSplitManual: true,
        cellsPerRowSplit: [10, 4],
      },
    });
    // Minus vorne: Kette vorne -> hinten, Plus-Ende = hinten (4 Lagen) -> 8 Zellen / 4 = 2 je Lage
    expect(boosterInfo(base)).toMatchObject({ layers: 4, packKey: 'P1', cellsPerRow: 2 });
    const minus = reducer(base, { type: 'set', patch: { booster: { series: 4, position: 'minus' } } });
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
      patch: { series: 20, parallel: 1, cellsPerRow: 3, booster: { series: 2, position: 'plus' } },
    });
    // Hauptpack 18S1P, 9 + 9 Zellen à 3 je Lage -> 3 Lagen; Booster 2S1P = 2 Zellen auf 3 Lagen geht nicht
    expect(boosterInfo(s)!.error).toBe(
      'Booster: 2 Zellen (2S1P) lassen sich nicht auf 3 Lagen aufteilen (gleiche Lagenzahl wie der Teilpack, an dem der Booster hängt).',
    );
    expect(Number.isNaN(toBatteryConfig(s).booster!.cellsPerRow)).toBe(true);
  });

  it('alte Links mit booster.cellsPerRow: Wert wird ignoriert', () => {
    const s = mergeWithDefaults({ series: 20, boosterEnabled: true, booster: { series: 2, cellsPerRow: 4, position: 'plus' } });
    expect(s.booster).toEqual({ series: 2, position: 'plus' });
    expect(toBatteryConfig(s).booster!.cellsPerRow).toBe(2);
  });
});

describe('URL-Hash und JSON', () => {
  const variants: ConfigState[] = [
    DEFAULT_STATE,
    reducer(DEFAULT_STATE, { type: 'preset', id: '20S2P-split' }),
    reducer(reducer(DEFAULT_STATE, { type: 'spacingMode', mode: 'spacer' }), { type: 'set', patch: { gapRow: 1.5 } }),
    reducer(DEFAULT_STATE, { type: 'part', id: 'wrap-P0', enabled: false, count: 2 }),
    reducer(DEFAULT_STATE, { type: 'cellType', cellType: 'custom' }),
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
  });
});
