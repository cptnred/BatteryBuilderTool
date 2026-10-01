/**
 * Fachliche Typen und Standardwerte.
 *
 * KOORDINATEN-KONVENTION (siehe docs/01_FACHKONZEPT.md):
 *   x  = global LINKS -> RECHTS (so wie in der Draufsicht mit VORNE oben)
 *   z  = UNTEN -> OBEN (Lage 0 = unterste Lage)
 *   y  = VORNE -> HINTEN (Reihenfolge der Teilpacks, Zellachse liegt in y)
 *   Alle Maße in mm. Querschnittskoordinaten (x,z) eines Teilpacks beginnen
 *   bei 0 am linken bzw. unteren Rand des Teilpacks.
 */

export type Side = 'L' | 'R';
/** V = vordere Stirnseite, H = hintere Stirnseite */
export type Face = 'V' | 'H';
/** Serienrichtung im Teilpack (global gesehen) */
export type RunDir = 'LR' | 'RL';
/** Wabe (versetzt) | Raster (Zellen gerade übereinander) */
export type Stacking = 'honeycomb' | 'grid';
export type SpacingMode = 'fishpaper' | 'spacer';

export interface CellSpec {
  id: string;
  label: string;
  /** mm, am besten nachgemessen (inkl. Schrumpfschlauch) */
  diameter: number;
  length: number;
  capacityAh: number;
  nominalV: number;
  maxV: number;
}

export const CELL_PRESETS: Readonly<Record<'21700' | '18650', CellSpec>> = {
  '21700': { id: '21700', label: '21700', diameter: 21.4, length: 70.0, capacityAh: 4.5, nominalV: 3.6, maxV: 4.2 },
  '18650': { id: '18650', label: '18650', diameter: 18.5, length: 65.0, capacityAh: 3.0, nominalV: 3.6, maxV: 4.2 },
};

export interface SpacingSpec {
  /** 'fishpaper' = Zelle an Zelle, nur Fishpaper dazwischen; 'spacer' = Abstandhalter/Zellhalter */
  mode: SpacingMode;
  /** Fishpaper-Stärke (mm). Im Modus 'fishpaper' zugleich der Spalt zwischen den Zellen. */
  paperThickness: number;
  /** nur 'spacer': Luft Mantel-zu-Mantel zwischen Nachbarzellen IN DER REIHE (mm) */
  gapRow: number;
  /** nur 'spacer': Luft Mantel-zu-Mantel zur Nachbarzelle der NÄCHSTEN LAGE (mm).
   *  Wabe: gemessen zur schräg darüber liegenden Zelle; Raster: senkrecht darüber. */
  gapLayer: number;
  /** nur 'spacer': wie weit der Halter außen über die Zellen übersteht (mm) – für Umrisse */
  holderRim: number;
}

export interface BoosterSpec {
  /** z. B. 2 bei 18S + 2S */
  series: number;
  cellsPerRow: number;
  /** hängt am Hauptplus- oder am Hauptminus-Ende */
  position: 'plus' | 'minus';
}

export interface TerminalSpec {
  /** 'V' = vorne (vordere Stirnseite des vordersten Teilpacks), 'H' = hinten */
  end: Face;
  side: Side;
}

export interface BatteryConfig {
  cell: CellSpec;
  /** S gesamt (inkl. Booster) */
  series: number;
  /** P */
  parallel: number;
  /** Anzahl Teilpacks im Hauptpack (vorne ... hinten), Standard 2 */
  subPacks: number;
  /** optional: S je Teilpack vorne->hinten. Leer = gleichmäßig aufteilen */
  seriesSplit?: number[];
  /** Zellen nebeneinander je Lage (Hauptpack) */
  cellsPerRow: number;
  /** optional: Zellen je Lage pro Teilpack (vorne->hinten), z. B. bei ungleicher Aufteilung 14S+18S */
  cellsPerRowSplit?: number[];
  stacking: Stacking;
  /** Wabe: Richtung, in die die UNGERADEN Lagen (1, 3, …) gegenüber Lage 0 versetzt sind – global L/R */
  offsetSide: Side;
  spacing: SpacingSpec;
  booster: BoosterSpec | null;
  mainMinus: TerminalSpec;
  mainPlus: TerminalSpec;
  /** mm Isolation (Fishpaper/Platte) zwischen Teilpacks */
  packGap: number;
  /** mm je Stirnseite */
  nickelThickness: number;
}

/** Standardwert laut Nutzer: 18S2P, 21700, 2 Teilpacks à 9 Zellen je Lage, Wabe nach links, Minus vorne rechts, Plus hinten rechts */
export const DEFAULT_CONFIG: BatteryConfig = {
  cell: CELL_PRESETS['21700'],
  series: 18,
  parallel: 2,
  subPacks: 2,
  cellsPerRow: 9,
  stacking: 'honeycomb',
  offsetSide: 'L',
  spacing: { mode: 'fishpaper', paperThickness: 0.3, gapRow: 1.0, gapLayer: 1.0, holderRim: 1.0 },
  booster: null,
  mainMinus: { end: 'V', side: 'R' },
  mainPlus: { end: 'H', side: 'R' },
  packGap: 0.5,
  nickelThickness: 0.2,
};

export interface Pitches {
  /** Mittenabstand in der Reihe */
  px: number;
  /** senkrechter Lagenabstand (Mitte-Mitte) */
  pz: number;
  /** horizontaler Versatz ungerader Lagen (0 bei Raster) */
  off: number;
  /** Mittenabstand zur nächsten Zelle in der Nachbarlage */
  diag: number;
  gapRow: number;
  gapLayer: number;
}

export interface Cell {
  /** "L<lage>-<index>", index 0 = global ganz links */
  id: string;
  layer: number;
  index: number;
  x: number;
  z: number;
}

export interface Group {
  /** globale Seriengruppe, 1-basiert (1 = am Hauptminus) */
  s: number;
  cells: string[];
  /** Stirnseite, auf der die Minuspole dieser Gruppe liegen */
  minusFace: Face;
}

export type StripKind = 'start' | 'series' | 'end';

export interface Strip {
  face: Face;
  /** Balancer-Knoten: B<node>. 0 = Hauptminus, S = Hauptplus */
  node: number;
  cells: string[];
  kind: StripKind;
}

export interface SubPack {
  /** 'P0', 'P1', … (Hauptpack, vorne->hinten) oder 'BOOST' */
  key: string;
  role: 'main' | 'booster';
  /** physische Position vorne->hinten (Booster: -1) */
  position: number;
  label: string;
  perRow: number;
  layers: number;
  series: number;
  dir: RunDir;
  startFace: Face;
  endFace: Face;
  startSide: Side;
  endSide: Side;
  startsOnTop: boolean;
  cells: Cell[];
  groups: Group[];
  strips: Strip[];
  width: number;
  height: number;
  /** Zelllänge + 2 × Nickel */
  length: number;
}

export type IssueLevel = 'error' | 'warning' | 'info';

export interface Issue {
  level: IssueLevel;
  msg: string;
}

export interface Bridge {
  /** SubPack.key */
  from: string;
  to: string;
  node: number;
  /** 'inner' = direkt zwischen zwei gegenüberliegenden Stirnseiten (kurz)
   *  'outer' = mindestens eine Seite liegt außen -> Kabel/Brücke außen herum
   *  'cable' = Kabel zum Booster */
  kind: 'inner' | 'outer' | 'cable';
  fromFace: Face;
  toFace: Face;
  fromSide: Side;
  toSide: Side;
}

export interface Layout {
  config: BatteryConfig;
  pitches: Pitches;
  /** physisch vorne->hinten, Booster zuletzt */
  packs: SubPack[];
  /** Serienreihenfolge der keys (inkl. Booster) */
  chain: string[];
  bridges: Bridge[];
  totalS: number;
  cost: number;
  issues: Issue[];
}
