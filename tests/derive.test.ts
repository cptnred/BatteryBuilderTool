/** Ableitungen aus dem Formularzustand (Plan 06 §4.2, §4.3) – mit konkreten Zahlen. */
import { describe, expect, it } from 'vitest';
import { autoRows, bridgePosOfSplit, bridgeState, evenSplit, fitsLayers } from '../src/state/derive';

describe('Aufteilung aus der Brückenwahl (§4.2)', () => {
  it.each([
    [18, 'auto', [9, 9], 'inner', false],
    [18, 'inner', [9, 9], 'inner', false],
    [18, 'outer', [10, 8], 'inner', true],
    [20, 'auto', [10, 10], 'outer', false],
    [20, 'outer', [10, 10], 'outer', false],
    [20, 'inner', [11, 9], 'outer', true],
    [30, 'auto', [15, 15], 'inner', false],
    [30, 'outer', [16, 14], 'inner', true],
    [32, 'auto', [16, 16], 'outer', false],
    [32, 'inner', [17, 15], 'outer', true],
  ] as const)('%iS mit Wahl %s -> %j', (mainS, choice, split, natural, uneven) => {
    expect(bridgeState(mainS, 2, choice)).toEqual({ selectable: true, natural, split, uneven });
  });

  it('nicht wählbar: ungerade Gruppenzahl, nicht 2 Teilpacks, zu wenige Gruppen', () => {
    expect(bridgeState(19, 2, 'inner')).toEqual({ selectable: false, natural: null, split: [10, 9], uneven: false });
    expect(bridgeState(21, 3, 'outer')).toEqual({ selectable: false, natural: null, split: [7, 7, 7], uneven: false });
    expect(bridgeState(13, 1, 'auto')).toEqual({ selectable: false, natural: null, split: [13], uneven: false });
    expect(bridgeState(2, 2, 'outer')).toEqual({ selectable: false, natural: null, split: [1, 1], uneven: false });
  });

  it('gleichmäßig, Rest nach vorne', () => {
    expect(evenSplit(20, 3)).toEqual([7, 7, 6]);
  });

  it('Brückenlage einer Aufteilung: innen nur, wenn beide Teilpacks ungerade sind', () => {
    expect(bridgePosOfSplit([9, 9])).toBe('inner');
    expect(bridgePosOfSplit([15, 17])).toBe('inner');
    expect(bridgePosOfSplit([10, 10])).toBe('outer');
    expect(bridgePosOfSplit([10, 9])).toBe('outer');
    expect(bridgePosOfSplit([14, 16])).toBe('outer');
    expect(bridgePosOfSplit([18])).toBeNull();
    expect(bridgePosOfSplit([7, 7, 7])).toBeNull();
  });
});

describe('Zellen je Lage aus den Lagen (§4.3)', () => {
  it('volle Lagen', () => {
    expect(autoRows([9, 9], 2, 2, 'honeycomb')).toEqual({ perRow: [9, 9], error: null });
    expect(autoRows([9, 9], 3, 3, 'honeycomb')).toEqual({ perRow: [9, 9], error: null });
    expect(autoRows([9, 9], 2, 2, 'grid')).toEqual({ perRow: [9, 9], error: null });
  });

  it('unvollständige Lage bei ungerader Zellzahl', () => {
    expect(autoRows([15, 15], 1, 2, 'honeycomb')).toEqual({ perRow: [8, 8], error: null });
    expect(autoRows([17, 15], 1, 2, 'honeycomb')).toEqual({ perRow: [9, 8], error: null });
  });

  it('ungleiche Teilpacks', () => {
    expect(autoRows([10, 8], 2, 2, 'honeycomb')).toEqual({ perRow: [10, 8], error: null });
  });

  it('geht nicht auf: Meldung nennt den ersten betroffenen Teilpack', () => {
    expect(autoRows([15, 15], 1, 2, 'grid')).toEqual({
      perRow: [8, 8],
      error: 'Teilpack 1: 15 Zellen lassen sich nicht auf 2 Lagen aufteilen.',
    });
    expect(autoRows([16, 15], 1, 2, 'grid').error).toBe('Teilpack 2: 15 Zellen lassen sich nicht auf 2 Lagen aufteilen.');
    expect(autoRows([4, 4], 1, 3, 'honeycomb').error).toBe('Teilpack 1: 4 Zellen lassen sich nicht auf 3 Lagen aufteilen.');
    expect(autoRows([1, 1], 1, 2, 'honeycomb').error).toBe('Teilpack 1: 1 Zellen lassen sich nicht auf 2 Lagen aufteilen.');
  });

  it('Teilpack ohne Gruppen: kein Lagen-Fehler (das meldet der Kern), Zellen je Lage bleiben ≥ 1', () => {
    expect(autoRows([1, 0], 2, 2, 'honeycomb')).toEqual({ perRow: [1, 1], error: null });
    expect(autoRows([0, -1], 2, 2, 'honeycomb')).toEqual({ perRow: [1, 1], error: null });
  });

  it('Wabe mit 2 Lagen: jede Gruppenzahl von 4S bis 40S geht auf, für 1P bis 4P', () => {
    for (let s = 4; s <= 40; s++)
      for (let p = 1; p <= 4; p++)
        expect(autoRows(bridgeState(s, 2, 'auto').split, p, 2, 'honeycomb').error, `${s}S${p}P`).toBeNull();
  });
});

describe('fitsLayers (Plan 07 §4.3)', () => {
  it('volle Lagen oder unvollständige Lage bei Wabe mit 2 Lagen', () => {
    expect(fitsLayers(4, 2, 2, 'honeycomb')).toBe(true);
    expect(fitsLayers(1, 1, 1, 'grid')).toBe(true);
    expect(fitsLayers(3, 2, 2, 'honeycomb')).toBe(true);
    expect(fitsLayers(3, 2, 2, 'grid')).toBe(false);
    expect(fitsLayers(1, 1, 2, 'honeycomb')).toBe(false);
    expect(fitsLayers(2, 1, 3, 'honeycomb')).toBe(false);
  });
});
