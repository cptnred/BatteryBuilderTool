/**
 * Zelldatenbank aus den Datenblättern (datasheets/*.pdf, docs/04_PLAN_ERWEITERUNG.md §1) – rein.
 * Regeln: Kapazität für Kennzahlen = typ./Nennwert (sonst Minimum, gekennzeichnet),
 * Maße für die Geometrie = Maximalwert (Nennwert + Toleranz), Ladeschlussspannung immer 4,2 V.
 */
import type { CellSpec } from './types';

export type CellFormat = '21700' | '18650';

/** Fundstelle im Datenblatt */
export interface DsSource {
  /** Dateiname in public/datasheets/ */
  file: string;
  page: number;
  section?: string;
}

export interface DsCurrent {
  /** A */
  value: number;
  /** z. B. „80 °C cut-off“ */
  condition?: string;
}

export interface DsResistance {
  /** mΩ */
  value: number;
  /** z. B. „AC 1 kHz“ oder „AC, 30 % SOC“ */
  kind: string;
  qualifier?: 'typ.' | 'max.';
}

/** Nutzbare Energie 4,2 V → 3,0 V bei einem Kurvenstrom (aus dem Kurvenbild abgelesen, §6). */
export interface UsableAtCurrent {
  /** Entladestrom der Zelle, A */
  currentA: number;
  /** Kapazität bis 3,0 V, Ah */
  capacityAh: number;
  /** Energie bis 3,0 V, Wh */
  energyWh: number;
}

export interface DsCurves {
  source: DsSource & { figure: string };
  points: UsableAtCurrent[];
}

export interface CellDatasheet {
  id: string;
  /** Anzeigename, z. B. „Molicel INR-21700-P50B“ */
  label: string;
  format: CellFormat;
  file: string;
  capacity: {
    /** typ./Nennwert in mAh, null = nur Minimum angegeben */
    typicalMah: number | null;
    minMah: number;
    note?: string;
    source: DsSource;
  };
  nominalV: number;
  /** Ladeschlussspannung für Kennzahlen (immer 4,2 V) */
  maxV: number;
  charge: { max: DsCurrent; standardA?: number; source: DsSource };
  /** Max. Dauerentladung: ein Wert oder zwei (ohne/mit Temperaturabschaltung) */
  discharge: { values: DsCurrent[]; source: DsSource };
  diameter: { max: number; spec: string; source: DsSource };
  height: { max: number; spec: string; source: DsSource };
  /** Innenwiderstand für den Pack-Wert */
  resistance: DsResistance & { source: DsSource };
  /** weitere Werte nur für die Anzeige */
  extras: { label: string; value: string }[];
  /** null = keine Entladekurve im Datenblatt */
  curves: DsCurves | null;
}

const P50B = 'Datasheet_Molicel_INR21700_P50B.pdf';
const P30B = 'Product-Data-Sheet-of-INR-18650-P30B-80111-1.pdf';
const BAK = 'Datasheet_INR2170-50D2_EN.pdf';
const EVE30P = '11-_EVE_INR18650-30P_SPEC._PBRI-INR1865030P-D06-01-B-2023.8.4.pdf';
const EVE50PL = 'EN_-_datasheet_-_21700-50PL.pdf';
const JP30 = 'Datasheet JP30.pdf';
const RS60 = 'Datasheet_Reliance_INR21700-RS60.pdf';
const RS50 = 'Reliance_INR21700-RS50_Specification_20250525_A1-3_.pdf';
const XG60 = 'TENPOWER_PRODUCT_SPECIFICATION_INR21700-60XG_V0.1_251209_1_1_1_.pdf';

const src = (file: string, page: number, section?: string): DsSource => (section ? { file, page, section } : { file, page });

export const CELL_DATASHEETS: readonly CellDatasheet[] = [
  {
    id: 'molicel-p50b',
    label: 'Molicel INR-21700-P50B',
    format: '21700',
    file: P50B,
    capacity: { typicalMah: 5000, minMah: 4850, source: src(P50B, 1, 'Cell Characteristics') },
    nominalV: 3.6,
    maxV: 4.2,
    charge: { max: { value: 25, condition: '70 °C cut-off' }, standardA: 5, source: src(P50B, 1, 'Cell Characteristics') },
    discharge: { values: [{ value: 60, condition: '80 °C cut-off' }], source: src(P50B, 1, 'Cell Characteristics') },
    diameter: { max: 21.55, spec: '21,55 mm (max.)', source: src(P50B, 1, 'Physical Characteristics') },
    height: { max: 70.15, spec: '70,15 mm (max.)', source: src(P50B, 1, 'Physical Characteristics') },
    resistance: { value: 6.5, kind: 'AC, 30 % SOC', qualifier: 'typ.', source: src(P50B, 1, 'Typical Impedance') },
    extras: [
      { label: 'Innenwiderstand DC (50 % SOC)', value: '12,8 mΩ typ.' },
      { label: 'Gewicht', value: '71 g (max.)' },
      { label: 'Entladeschluss', value: '2,5 V' },
      { label: 'Umgebungstemperatur', value: 'Laden −20 … 60 °C, Entladen −40 … 60 °C' },
    ],
    curves: {
      source: { file: P50B, page: 1, figure: 'Discharge Rate Characteristics (23 °C)' },
      // 50 A und 60 A enden bei ca. 3,2 V (erreichen 3,0 V nicht) und sind daher nicht enthalten (Nutzerentscheidung)
      points: [
        { currentA: 1, capacityAh: 4.383, energyWh: 16.1 },
        { currentA: 2.5, capacityAh: 4.318, energyWh: 15.78 },
        { currentA: 5, capacityAh: 4.253, energyWh: 15.41 },
        { currentA: 10, capacityAh: 4.178, energyWh: 14.92 },
        { currentA: 20, capacityAh: 4.062, energyWh: 14.19 },
        { currentA: 30, capacityAh: 3.883, energyWh: 13.31 },
      ],
    },
  },
  {
    id: 'molicel-p30b',
    label: 'Molicel INR-18650-P30B',
    format: '18650',
    file: P30B,
    capacity: { typicalMah: 3000, minMah: 2900, source: src(P30B, 1, 'Cell Characteristics') },
    nominalV: 3.6,
    maxV: 4.2,
    charge: { max: { value: 9, condition: '60 °C cut-off' }, standardA: 3, source: src(P30B, 1, 'Cell Characteristics') },
    discharge: { values: [{ value: 30, condition: '80 °C cut-off' }], source: src(P30B, 1, 'Cell Characteristics') },
    diameter: { max: 18.6, spec: '18,6 mm (max.)', source: src(P30B, 1, 'Physical Characteristics') },
    height: { max: 65.2, spec: '65,2 mm (max.)', source: src(P30B, 1, 'Physical Characteristics') },
    resistance: { value: 8, kind: 'AC, 30 % SOC', qualifier: 'typ.', source: src(P30B, 1, 'Typical Impedance') },
    extras: [
      { label: 'Innenwiderstand DC (50 % SOC)', value: '17 mΩ typ.' },
      { label: 'Gewicht', value: '47 g (max.)' },
      { label: 'Entladeschluss', value: '2,5 V' },
      { label: 'Temperatur', value: 'Laden 0 … 60 °C, Entladen −40 … 60 °C' },
    ],
    curves: {
      source: { file: P30B, page: 1, figure: 'Discharge Rate Characteristics (oberes Diagramm, 23 °C)' },
      points: [
        { currentA: 0.6, capacityAh: 2.721, energyWh: 10.02 },
        { currentA: 1.5, capacityAh: 2.69, energyWh: 9.86 },
        { currentA: 3, capacityAh: 2.646, energyWh: 9.62 },
        { currentA: 10, capacityAh: 2.594, energyWh: 9.22 },
        { currentA: 20, capacityAh: 2.51, energyWh: 8.71 },
        { currentA: 30, capacityAh: 2.415, energyWh: 8.22 },
      ],
    },
  },
  {
    id: 'bak-50d2',
    label: 'BAK INR2170-50D2',
    format: '21700',
    file: BAK,
    capacity: { typicalMah: 5000, minMah: 4950, source: src(BAK, 6, 'Typical/Rated capacity') },
    nominalV: 3.6,
    maxV: 4.2,
    charge: { max: { value: 15 }, standardA: 2.475, source: src(BAK, 7, 'Maximum charging current (Icm)') },
    discharge: {
      values: [{ value: 60, condition: '80 °C cut-off' }],
      source: src(BAK, 7, 'Maximum discharging current (Idm)'),
    },
    diameter: { max: 21.45, spec: '21,45 mm (max.)', source: src(BAK, 6) },
    height: { max: 70.75, spec: '70,75 mm (max.)', source: src(BAK, 6) },
    resistance: { value: 5, kind: 'AC 1 kHz', qualifier: 'max.', source: src(BAK, 7, 'Internal resistance') },
    extras: [
      { label: 'Gewicht', value: '≤ 69 g' },
      { label: 'Entladeschluss', value: '2,5 V' },
      { label: 'Max. Oberflächentemperatur', value: 'Laden 60 °C, Entladen 80 °C' },
    ],
    curves: null,
  },
  {
    id: 'eve-30p',
    label: 'EVE INR18650/30P',
    format: '18650',
    file: EVE30P,
    capacity: { typicalMah: 3000, minMah: 2900, source: src(EVE30P, 6, '3.1') },
    nominalV: 3.6,
    maxV: 4.2,
    charge: { max: { value: 4 }, standardA: 1.5, source: src(EVE30P, 6, '3.4') },
    discharge: { values: [{ value: 30, condition: '75 °C cut-off' }], source: src(EVE30P, 6, '3.6') },
    diameter: { max: 18.45, spec: '18,35 ± 0,10 mm', source: src(EVE30P, 6, '3.9') },
    height: { max: 65.3, spec: '65,15 ± 0,15 mm', source: src(EVE30P, 6, '3.9') },
    resistance: { value: 18, kind: 'AC 1 kHz', source: src(EVE30P, 8, '7.4') },
    extras: [
      { label: 'Gewicht', value: '48,0 g (max.)' },
      { label: 'Entladeschluss', value: '2,5 V' },
      { label: 'Umgebungstemperatur', value: 'Laden 0 … 45 °C, Entladen −20 … 60 °C' },
    ],
    curves: null,
  },
  {
    id: 'eve-50pl',
    label: 'EVE INR21700/50PL',
    format: '21700',
    file: EVE50PL,
    capacity: { typicalMah: 5000, minMah: 4800, source: src(EVE50PL, 6, '3.1') },
    nominalV: 3.6,
    maxV: 4.2,
    charge: { max: { value: 10 }, standardA: 2.5, source: src(EVE50PL, 6, '3.4') },
    discharge: {
      values: [{ value: 125, condition: '75 °C empfohlen, Tmax 80 °C' }],
      source: src(EVE50PL, 6, '3.6'),
    },
    diameter: { max: 21.25, spec: '21,15 ± 0,10 mm (mit Schlauch)', source: src(EVE50PL, 6, '3.10') },
    height: { max: 70.3, spec: '70,15 ± 0,15 mm (mit Schlauch)', source: src(EVE50PL, 6, '3.10') },
    resistance: { value: 7, kind: 'AC 1 kHz', source: src(EVE50PL, 8, '8.2') },
    extras: [
      { label: 'Pulsentladung', value: '180 A, 2 s' },
      { label: 'Gewicht', value: '72,0 g (max.)' },
      { label: 'Entladeschluss', value: '2,5 V' },
    ],
    curves: null,
  },
  {
    id: 'ampace-jp30',
    label: 'Ampace JP30',
    format: '18650',
    file: JP30,
    capacity: {
      typicalMah: 3000,
      minMah: 2900,
      note: 'Mittelwert; Kapazität gemessen mit 4,25 V Ladeschluss (Standardladung 4,20 V)',
      source: src(JP30, 4, '4.1'),
    },
    nominalV: 3.68,
    maxV: 4.2,
    charge: { max: { value: 9, condition: 'bei 25–60 °C Zelltemperatur' }, standardA: 1.5, source: src(JP30, 7, '5.1.1') },
    discharge: {
      values: [
        { value: 36, condition: 'ohne 80 °C-Abschaltung' },
        { value: 56, condition: 'mit 80 °C-Abschaltung' },
      ],
      source: src(JP30, 5, '4.10'),
    },
    diameter: { max: 18.56, spec: '18,56 mm (max., mit Schlauch)', source: src(JP30, 5, '4.9') },
    height: { max: 65.23, spec: '65,23 mm (max., mit Schlauch)', source: src(JP30, 5, '4.9') },
    resistance: { value: 5, kind: 'AC 1 kHz', qualifier: 'max.', source: src(JP30, 5, '4.7') },
    extras: [
      { label: 'Pulsentladung', value: '140 A, 5 s' },
      { label: 'Gewicht', value: '50,0 g (max.)' },
      { label: 'Temperatur (Oberfläche)', value: 'Laden −10 … 60 °C, Entladen −20 … 80 °C' },
    ],
    curves: null,
  },
  {
    id: 'reliance-rs60',
    label: 'Reliance INR21700-RS60',
    format: '21700',
    file: RS60,
    capacity: { typicalMah: null, minMah: 5850, source: src(RS60, 5, '3.1') },
    nominalV: 3.6,
    maxV: 4.2,
    charge: { max: { value: 12 }, standardA: 3, source: src(RS60, 6, '3.9') },
    discharge: { values: [{ value: 50, condition: '80 °C cut-off' }], source: src(RS60, 6, '3.10') },
    diameter: { max: 21.6, spec: '21,6 mm (max.)', source: src(RS60, 6, '3.12') },
    height: { max: 70.9, spec: '70,9 mm (max.)', source: src(RS60, 6, '3.12') },
    resistance: { value: 5.5, kind: 'AC 1 kHz', source: src(RS60, 5, '3.2') },
    extras: [
      { label: 'Gewicht', value: '73,0 g' },
      { label: 'Entladeschluss', value: '2,5 V' },
    ],
    curves: null,
  },
  {
    id: 'reliance-rs50',
    label: 'Reliance INR21700-RS50',
    format: '21700',
    file: RS50,
    capacity: { typicalMah: null, minMah: 4950, source: src(RS50, 5, '3.1') },
    nominalV: 3.6,
    maxV: 4.2,
    charge: { max: { value: 15 }, standardA: 2.5, source: src(RS50, 6, '3.9') },
    discharge: { values: [{ value: 70, condition: '80 °C cut-off' }], source: src(RS50, 6, '3.10') },
    diameter: { max: 21.25, spec: '21,25 mm (max.)', source: src(RS50, 6, '3.12') },
    height: { max: 70.35, spec: '70,35 mm (max.)', source: src(RS50, 6, '3.12') },
    resistance: { value: 4, kind: 'AC 1 kHz', source: src(RS50, 5, '3.2') },
    extras: [
      { label: 'Gewicht', value: '67,0 g' },
      { label: 'Entladeschluss', value: '2,5 V' },
    ],
    curves: null,
  },
  {
    id: 'tenpower-60xg',
    label: 'Tenpower INR21700-60XG',
    format: '21700',
    file: XG60,
    capacity: { typicalMah: 6000, minMah: 5900, source: src(XG60, 3, '3.1/3.2') },
    nominalV: 3.6,
    maxV: 4.2,
    charge: { max: { value: 16 }, standardA: 3, source: src(XG60, 3, '3.6') },
    discharge: {
      values: [
        { value: 40, condition: 'ohne Temperaturabschaltung' },
        { value: 60, condition: 'mit 75 °C-Abschaltung' },
      ],
      source: src(XG60, 4, '3.7'),
    },
    diameter: { max: 21.5, spec: '21,50 mm (ohne Toleranz)', source: src(XG60, 4, '3.12') },
    height: { max: 70.5, spec: '70,50 mm (ohne Toleranz)', source: src(XG60, 4, '3.12') },
    resistance: { value: 5, kind: 'AC 1 kHz, 30 % SOC', source: src(XG60, 3, '3.3') },
    extras: [
      { label: 'Pulsentladung', value: '160 A, 3 s' },
      { label: 'Gewicht', value: '76,0 g (max.)' },
      { label: 'Entladeschluss', value: '2,5 V' },
    ],
    curves: null,
  },
];

export const DEFAULT_CELL_ID = 'molicel-p50b';

export function datasheetById(id: string): CellDatasheet | undefined {
  return CELL_DATASHEETS.find((c) => c.id === id);
}

/** Kapazität für Kennzahlen: typ./Nennwert, sonst Minimum (mAh). */
export function ratedCapacityMah(ds: CellDatasheet): number {
  return ds.capacity.typicalMah ?? ds.capacity.minMah;
}

/** Geometrie- und Kennzahl-Werte für den Kern: Ø max, Höhe max, typ. Kapazität, U nenn, U max 4,2. */
export function cellSpecFromDatasheet(ds: CellDatasheet): CellSpec {
  return {
    id: ds.id,
    label: ds.label,
    diameter: ds.diameter.max,
    length: ds.height.max,
    capacityAh: ratedCapacityMah(ds) / 1000,
    nominalV: ds.nominalV,
    maxV: ds.maxV,
  };
}
