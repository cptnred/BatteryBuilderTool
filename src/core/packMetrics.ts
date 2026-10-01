/**
 * Pack-Kennzahlen aus dem Datenblatt (docs/04_PLAN_ERWEITERUNG.md §2) – rein.
 * Gilt für den Gesamtpack inkl. Booster: S gesamt, P gleich für Haupt- und Booster.
 */
import type { CellDatasheet } from './cells';
import type { BatteryConfig } from './types';

export interface PackCurrent {
  /** A */
  value: number;
  condition?: string;
}

export interface PackDischarge extends PackCurrent {
  /** max. Entladeleistung = Strom × S × U nenn, kW */
  powerKw: number;
}

export interface PackUsableEnergy {
  /** Zellstrom der Kurve, A */
  cellCurrentA: number;
  /** Pack-Strom = Zellstrom × P, A */
  packCurrentA: number;
  /** nutzbare Energie 4,2 V → 3,0 V, Wh (S × P × Zellwert) */
  energyWh: number;
  /** Kapazität bis 3,0 V, Ah (P × Zellwert) */
  capacityAh: number;
}

export interface PackMetrics {
  series: number;
  parallel: number;
  /** Kapazität (typ.) = P × Zellkapazität, Ah */
  capacityAh: number;
  /** Kapazität ist nur ein Mindestwert (Datenblatt nennt keinen typ. Wert) */
  capacityMinOnly: boolean;
  /** P × Mindestkapazität, Ah (null bei eigener Zelle) */
  capacityMinAh: number | null;
  /** Energie = S × U nenn × P × Ah, Wh */
  energyWh: number;
  /** null = eigene Zelle (keine Datenblattwerte) */
  discharge: PackDischarge[] | null;
  charge: PackCurrent | null;
  /** R_Zelle × S / P, mΩ (nur Zellen, ohne Verbinder) */
  resistance: { value: number; kind: string; qualifier?: string } | null;
  /** null = eigene Zelle; [] = keine Kurve im Datenblatt */
  usable: PackUsableEnergy[] | null;
}

export function packMetrics(cfg: BatteryConfig, ds: CellDatasheet | null): PackMetrics {
  const S = cfg.series;
  const P = cfg.parallel;
  const U = cfg.cell.nominalV;
  const capacityAh = P * cfg.cell.capacityAh;
  return {
    series: S,
    parallel: P,
    capacityAh,
    capacityMinOnly: !!ds && ds.capacity.typicalMah === null,
    capacityMinAh: ds ? (P * ds.capacity.minMah) / 1000 : null,
    energyWh: S * U * capacityAh,
    discharge: ds
      ? ds.discharge.values.map((d) => ({
          value: d.value * P,
          condition: d.condition,
          powerKw: (d.value * P * S * U) / 1000,
        }))
      : null,
    charge: ds ? { value: ds.charge.max.value * P, condition: ds.charge.max.condition } : null,
    resistance: ds
      ? { value: (ds.resistance.value * S) / P, kind: ds.resistance.kind, qualifier: ds.resistance.qualifier }
      : null,
    usable: ds
      ? (ds.curves?.points ?? []).map((c) => ({
          cellCurrentA: c.currentA,
          packCurrentA: c.currentA * P,
          energyWh: c.energyWh * S * P,
          capacityAh: c.capacityAh * P,
        }))
      : null,
  };
}
