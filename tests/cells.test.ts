import { describe, expect, it } from 'vitest';
import type { CellDatasheet } from '../src/core';
import { CELL_DATASHEETS, cellSpecFromDatasheet, datasheetById, DEFAULT_CONFIG, packMetrics, solve } from '../src/core';
import { DEFAULT_STATE, reducer, toBatteryConfig } from '../src/state/config';
import { dischargeSummary } from '../src/view/metricsText';

const ds = (id: string): CellDatasheet => datasheetById(id)!;

/** Tabelle docs/04_PLAN_ERWEITERUNG.md §1.2 */
const TABLE: {
  id: string;
  format: '21700' | '18650';
  typ: number | null;
  min: number;
  u: number;
  charge: number;
  discharge: [number, string][];
  d: number;
  h: number;
  r: number;
  rKind: string;
}[] = [
  {
    id: 'molicel-p50b',
    format: '21700',
    typ: 5000,
    min: 4850,
    u: 3.6,
    charge: 25,
    discharge: [[60, '80 °C cut-off']],
    d: 21.55,
    h: 70.15,
    r: 6.5,
    rKind: 'AC, 30 % SOC',
  },
  {
    id: 'molicel-p30b',
    format: '18650',
    typ: 3000,
    min: 2900,
    u: 3.6,
    charge: 9,
    discharge: [[30, '80 °C cut-off']],
    d: 18.6,
    h: 65.2,
    r: 8,
    rKind: 'AC, 30 % SOC',
  },
  {
    id: 'bak-50d2',
    format: '21700',
    typ: 5000,
    min: 4950,
    u: 3.6,
    charge: 15,
    discharge: [[60, '80 °C cut-off']],
    d: 21.45,
    h: 70.75,
    r: 5,
    rKind: 'AC 1 kHz',
  },
  {
    id: 'eve-30p',
    format: '18650',
    typ: 3000,
    min: 2900,
    u: 3.6,
    charge: 4,
    discharge: [[30, '75 °C cut-off']],
    d: 18.45,
    h: 65.3,
    r: 18,
    rKind: 'AC 1 kHz',
  },
  {
    id: 'eve-50pl',
    format: '21700',
    typ: 5000,
    min: 4800,
    u: 3.6,
    charge: 10,
    discharge: [[125, '75 °C empfohlen, Tmax 80 °C']],
    d: 21.25,
    h: 70.3,
    r: 7,
    rKind: 'AC 1 kHz',
  },
  {
    id: 'ampace-jp30',
    format: '18650',
    typ: 3000,
    min: 2900,
    u: 3.68,
    charge: 9,
    discharge: [
      [36, 'ohne 80 °C-Abschaltung'],
      [56, 'mit 80 °C-Abschaltung'],
    ],
    d: 18.56,
    h: 65.23,
    r: 5,
    rKind: 'AC 1 kHz',
  },
  {
    id: 'reliance-rs60',
    format: '21700',
    typ: null,
    min: 5850,
    u: 3.6,
    charge: 12,
    discharge: [[50, '80 °C cut-off']],
    d: 21.6,
    h: 70.9,
    r: 5.5,
    rKind: 'AC 1 kHz',
  },
  {
    id: 'reliance-rs50',
    format: '21700',
    typ: null,
    min: 4950,
    u: 3.6,
    charge: 15,
    discharge: [[70, '80 °C cut-off']],
    d: 21.25,
    h: 70.35,
    r: 4,
    rKind: 'AC 1 kHz',
  },
  {
    id: 'tenpower-60xg',
    format: '21700',
    typ: 6000,
    min: 5900,
    u: 3.6,
    charge: 16,
    discharge: [
      [40, 'ohne Temperaturabschaltung'],
      [60, 'mit 75 °C-Abschaltung'],
    ],
    d: 21.5,
    h: 70.5,
    r: 5,
    rKind: 'AC 1 kHz, 30 % SOC',
  },
];

describe('Zelldatenbank (Plan §1.2)', () => {
  it('enthält genau die 9 Datenblattzellen', () => {
    expect(CELL_DATASHEETS.map((c) => c.id)).toEqual(TABLE.map((t) => t.id));
  });

  for (const t of TABLE)
    it(`${t.id}: alle Tabellenwerte`, () => {
      const c = ds(t.id);
      expect(c.format).toBe(t.format);
      expect(c.capacity.typicalMah).toBe(t.typ);
      expect(c.capacity.minMah).toBe(t.min);
      expect(c.nominalV).toBe(t.u);
      expect(c.maxV).toBe(4.2);
      expect(c.charge.max.value).toBe(t.charge);
      expect(c.discharge.values.map((v) => [v.value, v.condition])).toEqual(t.discharge);
      expect(c.diameter.max).toBe(t.d);
      expect(c.height.max).toBe(t.h);
      expect(c.resistance.value).toBe(t.r);
      expect(c.resistance.kind).toBe(t.rKind);
      expect(c.file).toMatch(/\.pdf$/);
      for (const s of [c.capacity.source, c.charge.source, c.discharge.source, c.diameter.source, c.resistance.source])
        expect(s.file).toBe(c.file);
    });

  it('Ladestrom-Bedingungen und Standardladung', () => {
    expect(ds('molicel-p50b').charge).toMatchObject({ max: { value: 25, condition: '70 °C cut-off' }, standardA: 5 });
    expect(ds('molicel-p30b').charge).toMatchObject({ max: { value: 9, condition: '60 °C cut-off' }, standardA: 3 });
    expect(ds('ampace-jp30').charge.max.condition).toBe('bei 25–60 °C Zelltemperatur');
  });

  it('Innenwiderstand: Art typ./max. laut Datenblatt', () => {
    expect(ds('molicel-p50b').resistance.qualifier).toBe('typ.');
    expect(ds('bak-50d2').resistance.qualifier).toBe('max.');
    expect(ds('ampace-jp30').resistance.qualifier).toBe('max.');
  });

  it('EVE: Geometrie = Nennwert + Toleranz', () => {
    expect(ds('eve-30p').diameter.spec).toBe('18,35 ± 0,10 mm');
    expect(ds('eve-30p').diameter.max).toBeCloseTo(18.35 + 0.1, 9);
    expect(ds('eve-30p').height.max).toBeCloseTo(65.15 + 0.15, 9);
    expect(ds('eve-50pl').diameter.max).toBeCloseTo(21.15 + 0.1, 9);
    expect(ds('eve-50pl').height.max).toBeCloseTo(70.15 + 0.15, 9);
  });

  it('CellSpec: Ø max, Höhe max, typ. Kapazität (sonst Minimum), U nenn, 4,2 V', () => {
    expect(cellSpecFromDatasheet(ds('molicel-p50b'))).toEqual({
      id: 'molicel-p50b',
      label: 'Molicel INR-21700-P50B',
      diameter: 21.55,
      length: 70.15,
      capacityAh: 5,
      nominalV: 3.6,
      maxV: 4.2,
    });
    expect(cellSpecFromDatasheet(ds('reliance-rs50')).capacityAh).toBe(4.95);
    expect(cellSpecFromDatasheet(ds('ampace-jp30')).nominalV).toBe(3.68);
  });
});

describe('Nutzbare Energie 4,2 V → 3,0 V aus den Kurvenbildern (Plan §6, vom Nutzer freigegeben)', () => {
  it('P50B: sechs Kurvenströme (50/60 A enden bei 3,2 V und entfallen)', () => {
    const c = ds('molicel-p50b').curves!;
    expect(c.source).toEqual({
      file: 'Datasheet_Molicel_INR21700_P50B.pdf',
      page: 1,
      figure: 'Discharge Rate Characteristics (23 °C)',
    });
    expect(c.points.map((p) => [p.currentA, p.capacityAh, p.energyWh])).toEqual([
      [1, 4.383, 16.1],
      [2.5, 4.318, 15.78],
      [5, 4.253, 15.41],
      [10, 4.178, 14.92],
      [20, 4.062, 14.19],
      [30, 3.883, 13.31],
    ]);
  });

  it('P30B: sechs Kurvenströme', () => {
    expect(ds('molicel-p30b').curves!.points.map((p) => [p.currentA, p.capacityAh, p.energyWh])).toEqual([
      [0.6, 2.721, 10.02],
      [1.5, 2.69, 9.86],
      [3, 2.646, 9.62],
      [10, 2.594, 9.22],
      [20, 2.51, 8.71],
      [30, 2.415, 8.22],
    ]);
  });

  it('alle anderen Zellen: keine Kurve im Datenblatt', () => {
    expect(CELL_DATASHEETS.filter((c) => c.curves).map((c) => c.id)).toEqual(['molicel-p50b', 'molicel-p30b']);
  });

  it('Pack 18S2P P50B: Energie × S × P, Pack-Strom = Zellstrom × P', () => {
    const m = packMetrics(toBatteryConfig(DEFAULT_STATE), ds('molicel-p50b'));
    expect(m.usable![5]).toEqual({ cellCurrentA: 30, packCurrentA: 60, energyWh: 13.31 * 36, capacityAh: 3.883 * 2 });
    expect(m.usable![0].energyWh).toBeCloseTo(579.6, 9);
    expect(packMetrics(DEFAULT_CONFIG, ds('bak-50d2')).usable).toEqual([]);
  });
});

describe('Pack-Kennzahlen (Plan §2)', () => {
  it('18S2P P50B', () => {
    const m = packMetrics(toBatteryConfig(DEFAULT_STATE), ds('molicel-p50b'));
    expect(m.capacityAh).toBe(10);
    expect(m.capacityMinAh).toBe(9.7);
    expect(m.capacityMinOnly).toBe(false);
    expect(m.energyWh).toBeCloseTo(648, 9);
    expect(m.discharge).toHaveLength(1);
    expect(m.discharge![0].value).toBe(120);
    expect(m.discharge![0].powerKw).toBeCloseTo(7.776, 9);
    expect(m.charge).toEqual({ value: 50, condition: '70 °C cut-off' });
    expect(m.resistance).toEqual({ value: 58.5, kind: 'AC, 30 % SOC', qualifier: 'typ.' });
    expect(dischargeSummary(m)).toBe('120 A · 7,8 kW');
  });

  it('20S2P Splitpack mit JP30: S gesamt inkl. Booster, beide Entladewerte', () => {
    let s = reducer(DEFAULT_STATE, { type: 'preset', id: '20S2P-split' });
    s = reducer(s, { type: 'cellType', cellType: 'ampace-jp30' });
    const m = packMetrics(toBatteryConfig(s), ds('ampace-jp30'));
    expect(m.series).toBe(20);
    expect(m.discharge!.map((d) => d.value)).toEqual([72, 112]);
    expect(m.discharge![0].powerKw).toBeCloseTo((72 * 20 * 3.68) / 1000, 9);
    expect(m.discharge![1].powerKw).toBeCloseTo(8.2432, 9);
    expect(m.energyWh).toBeCloseTo(20 * 3.68 * 6, 9);
    expect(m.resistance!.value).toBe(50);
    expect(dischargeSummary(m)).toBe('72–112 A · 5,3–8,2 kW');
  });

  it('Reliance RS60: nur Mindestkapazität', () => {
    const cfg = { ...DEFAULT_CONFIG, cell: cellSpecFromDatasheet(ds('reliance-rs60')) };
    const m = packMetrics(cfg, ds('reliance-rs60'));
    expect(m.capacityMinOnly).toBe(true);
    expect(m.capacityAh).toBeCloseTo(11.7, 9);
    expect(m.resistance!.value).toBeCloseTo(49.5, 9);
  });

  it('eigene Zelle: keine Datenblattwerte', () => {
    const m = packMetrics(DEFAULT_CONFIG, null);
    expect(m.capacityAh).toBe(9);
    expect(m.discharge).toBeNull();
    expect(m.charge).toBeNull();
    expect(m.resistance).toBeNull();
    expect(m.usable).toBeNull();
    expect(dischargeSummary(m)).toBeNull();
  });

  it('Standardzelle P50B löst das Standardlayout fehlerfrei', () => {
    const L = solve(toBatteryConfig(DEFAULT_STATE));
    expect(L.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(L.packs.reduce((a, p) => a + p.cells.length, 0)).toBe(36);
  });
});
