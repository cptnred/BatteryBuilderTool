/**
 * App-Zustand: Formularwerte, Presets, Reducer. Rein (kein React), damit testbar.
 * Der Zustand wird mit toBatteryConfig() in die Fachkonfiguration übersetzt.
 */
import type { BatteryConfig, BoosterSpec, CellDatasheet, CellSpec, Side, SpacingMode, Stacking, TerminalSpec } from '../core';
import {
  DEFAULT_CELL_ID,
  DEFAULT_CONFIG,
  LIMITS,
  cellSpecFromDatasheet,
  datasheetById,
  layerPlan,
  perRowOf,
  seriesSplit,
  subPackLabel,
} from '../core';
import type { FishpaperOptions } from '../fishpaper/types';
import type { BridgeChoice, BridgePos, RowPlan } from './derive';
import { LAYER_LIMITS, autoRows, bridgeState, fitsLayers } from './derive';

export type { FishpaperOptions };

/** ID einer Datenblattzelle (CELL_DATASHEETS) oder 'custom' */
export type CellType = string;

export const CUSTOM_CELL_LABEL = 'eigene Zelle';
export type PageFormat = 'a4' | 'a3' | 'letter' | 'plotter' | 'laser';
export type OversizeMode = 'tile' | 'split';

export interface ExportOptions {
  pageFormat: PageFormat;
  oversize: OversizeMode;
}

/** Booster-Eingaben; Aufteilung und Zellen je Lage werden abgeleitet (Plan 04 §3, Plan 07 §4) */
export interface BoosterInput {
  series: number;
  position: 'plus' | 'minus';
  /** Einzelpacks im Booster, hintereinander in einem Gehäuse (1–4) */
  subPacks: number;
  /** Brückenlage zwischen 2 Einzelpacks: bestimmt die Aufteilung wie im Hauptpack */
  bridge: BridgeChoice;
  /** „Lagen im Booster selbst festlegen“; sonst gilt die Lagenzahl des Teilpacks, an dem der Booster hängt */
  layersManual: boolean;
  /** Lagen je Einzelpack; wirkt nur mit layersManual */
  layers: number;
}

export const DEFAULT_BOOSTER: BoosterInput = {
  series: 2,
  position: 'plus',
  subPacks: 1,
  bridge: 'auto',
  layersManual: false,
  layers: 2,
};

export interface ConfigState {
  cellType: CellType;
  cell: CellSpec;
  series: number;
  parallel: number;
  subPacks: number;
  /** Brückenlage: bestimmt bei 2 Teilpacks die automatische Aufteilung (Plan 06 §4.2) */
  bridge: BridgeChoice;
  seriesSplitManual: boolean;
  /** wirksame Aufteilung vorne -> hinten */
  seriesSplit: number[];
  /** Lagen je Teilpack; daraus folgen die Zellen je Lage (Plan 06 §4.3) */
  layers: number;
  /** „Zellen je Lage manuell“: cellsPerRow gilt für alle Teilpacks statt der Ableitung aus layers */
  cellsPerRowManual: boolean;
  /** wirksame Zellen je Lage des vordersten Teilpacks bzw. der manuelle Wert */
  cellsPerRow: number;
  cellsPerRowSplitManual: boolean;
  /** wirksame Zellen je Lage je Teilpack */
  cellsPerRowSplit: number[];
  /** unvollständige Lage: größere Lage oben oder unten */
  wideLayer: 'top' | 'bottom';
  stacking: Stacking;
  offsetSide: Side;
  spacingMode: SpacingMode;
  paperThickness: number;
  /** Pflichtfelder bei Abstandhalter: null = noch nicht eingegeben */
  gapRow: number | null;
  gapLayer: number | null;
  holderRim: number | null;
  /** Eingabe der Abstände als Spalt (Mantel-zu-Mantel) oder als Mittenabstand */
  spacingInput: 'gap' | 'pitch';
  packGap: number;
  nickelThickness: number;
  mainMinus: TerminalSpec;
  mainPlus: TerminalSpec;
  boosterEnabled: boolean;
  /** Aufteilung und Zellen je Lage des Boosters werden berechnet (Plan 07 §4) */
  booster: BoosterInput;
  /** Draufsicht: ungleich breite Teilpacks bündig */
  topAlign: 'right' | 'left' | 'center';
  fishpaper: FishpaperOptions;
  export: ExportOptions;
}

export const DEFAULT_FISHPAPER: FishpaperOptions = {
  outlineFace: 'straight',
  outlineWrap: 'straight',
  faceMargin: 0,
  wrapOverlap: 10,
  wrapFold: 0,
  wrapMode: 'perPack',
  interlayer: 'single',
  bridgeCutout: 'notch',
  cutoutWidth: 12,
  cutoutHeight: 3,
  includeSides: true,
  includeTopBottom: false,
  partOverrides: {},
};

export const DEFAULT_STATE: ConfigState = {
  cellType: DEFAULT_CELL_ID,
  cell: cellSpecFromDatasheet(datasheetById(DEFAULT_CELL_ID)!),
  series: DEFAULT_CONFIG.series,
  parallel: DEFAULT_CONFIG.parallel,
  subPacks: DEFAULT_CONFIG.subPacks,
  bridge: 'auto',
  seriesSplitManual: false,
  seriesSplit: [9, 9],
  layers: 2,
  cellsPerRowManual: false,
  cellsPerRow: DEFAULT_CONFIG.cellsPerRow,
  cellsPerRowSplitManual: false,
  cellsPerRowSplit: [9, 9],
  wideLayer: 'top',
  stacking: DEFAULT_CONFIG.stacking,
  offsetSide: DEFAULT_CONFIG.offsetSide,
  spacingMode: 'fishpaper',
  paperThickness: DEFAULT_CONFIG.spacing.paperThickness,
  gapRow: null,
  gapLayer: null,
  holderRim: null,
  spacingInput: 'gap',
  packGap: DEFAULT_CONFIG.packGap,
  nickelThickness: DEFAULT_CONFIG.nickelThickness,
  mainMinus: { ...DEFAULT_CONFIG.mainMinus },
  mainPlus: { ...DEFAULT_CONFIG.mainPlus },
  boosterEnabled: false,
  booster: DEFAULT_BOOSTER,
  topAlign: 'right',
  fishpaper: DEFAULT_FISHPAPER,
  export: { pageFormat: 'a4', oversize: 'tile' },
};

export type PresetId = '18S2P' | '20S2P' | '20S2P-split' | '30S1P' | '32S1P';

/** Presets bestehen nur aus S, P und ggf. Booster; alles andere wird abgeleitet (Plan 06 §4.5). */
export const PRESETS: { id: PresetId; label: string; patch: Partial<ConfigState> }[] = [
  { id: '18S2P', label: '18S2P', patch: {} },
  { id: '20S2P', label: '20S2P', patch: { series: 20 } },
  {
    id: '20S2P-split',
    label: '20S2P Splitpack (18S2P + 2S2P)',
    patch: { series: 20, boosterEnabled: true, booster: DEFAULT_BOOSTER },
  },
  { id: '30S1P', label: '30S1P', patch: { series: 30, parallel: 1 } },
  { id: '32S1P', label: '32S1P', patch: { series: 32, parallel: 1 } },
];

/** Datenblatt der gewählten Zelle; null bei eigener Zelle. */
export function datasheetOf(s: ConfigState): CellDatasheet | null {
  return datasheetById(s.cellType) ?? null;
}

/** Hauptpack-S = S gesamt − Booster-S */
export function mainSeries(s: ConfigState): number {
  return s.series - (s.boosterEnabled ? s.booster.series : 0);
}

/** Wirksame Aufteilung vorne -> hinten: manuell oder aus der Brückenwahl (Plan 06 §4.2). */
export function effectiveSplit(s: ConfigState): number[] {
  return s.seriesSplitManual ? s.seriesSplit.slice(0, s.subPacks) : bridgeState(mainSeries(s), s.subPacks, s.bridge).split;
}

/**
 * Zellen je Lage je Teilpack. Im automatischen Fall samt Meldung, wenn die Zellzahl nicht auf die Lagen passt
 * (Plan 06 §4.3); bei manuellen Werten prüft der Kern.
 */
export function rowInfo(s: ConfigState): RowPlan {
  const split = effectiveSplit(s);
  if (s.cellsPerRowSplitManual) return { perRow: s.cellsPerRowSplit.slice(0, s.subPacks), error: null };
  if (s.cellsPerRowManual) return { perRow: split.map(() => s.cellsPerRow), error: null };
  return autoRows(split, s.parallel, s.layers, s.stacking);
}

/** Folgefehler des Kerns, die bei einer Lagen-Fehlermeldung (rowInfo) nichts Neues sagen. */
export const isRowPlanIssue = (msg: string) =>
  msg.includes('volle Lagen à') || msg === 'Zellen je Lage muss eine ganze Zahl ≥ 1 sein.';

const nz = (v: number | null) => (v === null ? NaN : v);

export interface BoosterRows {
  /** wirksame Lagenzahl: eigene (booster.layersManual) oder die des Teilpacks, an dem der Booster hängt */
  layers: number;
  /** Key des Teilpacks, an dem der Booster hängt ('P0' …), und Anzeigename */
  packKey: string;
  packLabel: string;
  /** Zellen je Lage des ersten Einzelpacks; null = geht nicht auf */
  cellsPerRow: number | null;
  /** Zellen je Lage je Einzelpack; null = geht nicht auf */
  perRow: number[] | null;
  /** S je Einzelpack, Stirnseite 1 -> 2 */
  split: number[];
  error: string | null;
}

/**
 * Booster: Aufteilung aus der Brückenwahl, Lagen eigen oder wie der Teilpack, an dem er hängt (Plan 04 §3, Plan 07 §4).
 * Plus-Ende = letzter Teilpack der Kette, Minus-Ende = erster; die Kette läuft ab mainMinus.end.
 */
export function boosterRows(cfg: BatteryConfig, booster: BoosterInput): BoosterRows {
  const n = cfg.subPacks;
  const chain = cfg.mainMinus.end === 'V' ? [...Array(n).keys()] : [...Array(n).keys()].reverse();
  const pos = booster.position === 'plus' ? chain[n - 1] : chain[0];
  const packCells = seriesSplit(cfg)[pos] * cfg.parallel;
  const perRow = perRowOf(cfg, pos);
  const packKey = `P${pos}`;
  const packLabel = subPackLabel(n, pos);
  const split = bridgeState(booster.series, booster.subPacks, booster.bridge).split;
  const none = (layers: number, error: string | null): BoosterRows => ({
    layers,
    packKey,
    packLabel,
    cellsPerRow: null,
    perRow: null,
    split,
    error,
  });
  let layers = booster.layers;
  if (!booster.layersManual) {
    // Teilpack selbst geht nicht auf oder hat keine Zellen -> dessen Fehlermeldung reicht
    if (packCells < 1 || layerPlan(cfg, packCells, perRow) === null) return none(packCells / perRow, null);
    layers = Math.ceil(packCells / perRow);
  }
  const P = cfg.parallel;
  // Einzelpack ohne Gruppen (s < 1): Fehler der Aufteilung, den der Kern meldet – hier 1 je Lage und keine eigene Meldung
  const rows = split.map((s) => Math.max(1, Math.ceil((s * P) / layers)));
  const bad = split.findIndex((s, i) => s >= 1 && !fitsLayers(s * P, rows[i], layers, cfg.stacking));
  if (bad >= 0) {
    const cells = split[bad] * P;
    const what = `${cells} Zellen (${split[bad]}S${P}P) lassen sich nicht auf ${layers} Lagen aufteilen`;
    if (split.length === 1)
      return none(
        layers,
        booster.layersManual
          ? `Booster: ${what}.`
          : `Booster: ${what} (gleiche Lagenzahl wie der Teilpack, an dem der Booster hängt).`,
      );
    return none(layers, `Booster ${String.fromCharCode(65 + bad)}: ${what}.`);
  }
  return { layers, packKey, packLabel, cellsPerRow: rows[0], perRow: rows, split, error: null };
}

/** Übersetzt den Formularzustand in die Fachkonfiguration. */
export function toBatteryConfig(s: ConfigState): BatteryConfig {
  const cfg: BatteryConfig = {
    cell: { ...s.cell },
    series: s.series,
    parallel: s.parallel,
    subPacks: s.subPacks,
    cellsPerRow: s.cellsPerRow,
    stacking: s.stacking,
    offsetSide: s.offsetSide,
    spacing: {
      mode: s.spacingMode,
      paperThickness: s.paperThickness,
      gapRow: s.spacingMode === 'spacer' ? nz(s.gapRow) : DEFAULT_CONFIG.spacing.gapRow,
      gapLayer: s.spacingMode === 'spacer' ? nz(s.gapLayer) : DEFAULT_CONFIG.spacing.gapLayer,
      holderRim: s.spacingMode === 'spacer' ? nz(s.holderRim) : DEFAULT_CONFIG.spacing.holderRim,
    },
    booster: null,
    mainMinus: { ...s.mainMinus },
    mainPlus: { ...s.mainPlus },
    packGap: s.packGap,
    nickelThickness: s.nickelThickness,
  };
  // Aufteilung und Zellen je Lage nur mitgeben, wenn sie vom Standard des Kerns abweichen (Plan 06 §4.4)
  const bridge = bridgeState(mainSeries(s), s.subPacks, s.bridge);
  if (s.seriesSplitManual) cfg.seriesSplit = s.seriesSplit.slice(0, s.subPacks);
  else if (bridge.uneven) cfg.seriesSplit = bridge.split;
  if (s.cellsPerRowSplitManual) cfg.cellsPerRowSplit = s.cellsPerRowSplit.slice(0, s.subPacks);
  else if (!s.cellsPerRowManual) {
    const rows = rowInfo(s);
    // geht nicht auf -> NaN: der Kern liefert kein Layout, die Meldung kommt aus rowInfo()
    cfg.cellsPerRow = rows.error ? NaN : rows.perRow[0];
    if (!rows.error && rows.perRow.some((m) => m !== rows.perRow[0])) cfg.cellsPerRowSplit = rows.perRow;
  }
  if (s.wideLayer === 'bottom') cfg.wideLayer = 'bottom';
  if (s.boosterEnabled) {
    // Hauptpack-Aufteilung hängt nur von booster.series ab; Aufteilung und Zellen je Lage des Boosters folgen aus boosterRows
    const base = { series: s.booster.series, position: s.booster.position };
    const rows = boosterRows({ ...cfg, booster: { ...base, cellsPerRow: 1 } }, s.booster);
    const b: BoosterSpec = { ...base, cellsPerRow: rows.cellsPerRow ?? NaN };
    // nur mitgeben, was vom Standard des Kerns abweicht (Plan 07 §4.4)
    if (s.booster.subPacks > 1) {
      b.subPacks = s.booster.subPacks;
      if (bridgeState(s.booster.series, s.booster.subPacks, s.booster.bridge).uneven) b.seriesSplit = rows.split;
      if (rows.perRow && rows.perRow.some((m) => m !== rows.perRow![0])) b.cellsPerRowSplit = rows.perRow;
    }
    cfg.booster = b;
  }
  return cfg;
}

/** Booster-Info für die Anzeige am Booster (null = kein Booster). */
export function boosterInfo(s: ConfigState): BoosterRows | null {
  if (!s.boosterEnabled) return null;
  const cfg = toBatteryConfig(s);
  return boosterRows({ ...cfg, booster: { series: s.booster.series, position: s.booster.position, cellsPerRow: 1 } }, s.booster);
}

/** Folgefehler des Kerns, die bei einer Booster-Fehlermeldung (Plan 04 §3, Plan 07 §4.3) nichts Neues sagen. */
export const isBoosterRowIssue = (msg: string) => msg.startsWith('Booster: Zell') || msg.startsWith('Booster-Einzelpack');

export type Action =
  | { type: 'set'; patch: Partial<ConfigState> }
  | { type: 'bridge'; pos: BridgePos }
  | { type: 'boosterBridge'; pos: BridgePos }
  | { type: 'cellType'; cellType: CellType }
  | { type: 'spacingMode'; mode: SpacingMode }
  | { type: 'fishpaper'; patch: Partial<FishpaperOptions> }
  | { type: 'part'; id: string; enabled: boolean; count: number }
  | { type: 'export'; patch: Partial<ExportOptions> }
  | { type: 'preset'; id: PresetId }
  | { type: 'reset' }
  | { type: 'load'; state: ConfigState };

/** Zelle als „eigene Zelle“ (Datenblattwerte entfallen, Maße/Kapazität/U bleiben). */
export function customCell(cell: CellSpec): CellSpec {
  return { ...cell, id: 'custom', label: CUSTOM_CELL_LABEL };
}

/** Hält abhängige Felder konsistent: Aufteilung (Plan 06 §4.2) und Zellen je Lage (§4.3). */
function normalize(s: ConfigState): ConfigState {
  const n = s.subPacks;
  let { seriesSplit, cellsPerRow, cellsPerRowSplit } = s;
  if (!s.seriesSplitManual || seriesSplit.length !== n) seriesSplit = bridgeState(mainSeries(s), n, s.bridge).split;
  const auto = autoRows(seriesSplit, s.parallel, s.layers, s.stacking).perRow;
  if (!s.cellsPerRowManual && !s.cellsPerRowSplitManual && auto[0] >= 1) cellsPerRow = auto[0];
  if (!s.cellsPerRowSplitManual || cellsPerRowSplit.length !== n)
    cellsPerRowSplit = s.cellsPerRowManual ? Array.from({ length: n }, () => cellsPerRow) : auto;
  return { ...s, booster: { ...DEFAULT_BOOSTER, ...s.booster }, seriesSplit, cellsPerRow, cellsPerRowSplit };
}

export function reducer(state: ConfigState, action: Action): ConfigState {
  switch (action.type) {
    case 'set':
      return normalize({ ...state, ...action.patch });
    case 'bridge': {
      // Klick auf die natürliche Lage = automatisch, auf die andere = ausdrücklich (Plan 06 §4.2)
      const natural = bridgeState(mainSeries(state), state.subPacks, 'auto').natural;
      return normalize({ ...state, bridge: action.pos === natural ? 'auto' : action.pos });
    }
    case 'boosterBridge': {
      // wie im Hauptpack: Klick auf die natürliche Lage = automatisch, auf die andere = ausdrücklich
      const b = state.booster;
      const natural = bridgeState(b.series, b.subPacks, 'auto').natural;
      return normalize({ ...state, booster: { ...b, bridge: action.pos === natural ? 'auto' : action.pos } });
    }
    case 'cellType': {
      const ds = datasheetById(action.cellType);
      if (!ds) return { ...state, cellType: 'custom', cell: customCell(state.cell) };
      return { ...state, cellType: ds.id, cell: cellSpecFromDatasheet(ds) };
    }
    case 'spacingMode':
      // Abstandhalter: Spalte sind Pflichtfelder und müssen manuell eingegeben werden
      if (action.mode === 'spacer') return { ...state, spacingMode: 'spacer', gapRow: null, gapLayer: null, holderRim: null };
      return { ...state, spacingMode: 'fishpaper' };
    case 'fishpaper':
      return { ...state, fishpaper: { ...state.fishpaper, ...action.patch } };
    case 'part':
      return {
        ...state,
        fishpaper: {
          ...state.fishpaper,
          partOverrides: { ...state.fishpaper.partOverrides, [action.id]: { enabled: action.enabled, count: action.count } },
        },
      };
    case 'export':
      return { ...state, export: { ...state.export, ...action.patch } };
    case 'preset': {
      const p = PRESETS.find((x) => x.id === action.id)!;
      return normalize({ ...DEFAULT_STATE, ...p.patch, fishpaper: state.fishpaper, export: state.export });
    }
    case 'reset':
      return DEFAULT_STATE;
    case 'load':
      return normalize(action.state);
  }
}

/** Welches Preset entspricht dem Zustand (für die Markierung der Schnellwahl)? */
export function matchingPreset(s: ConfigState): PresetId | null {
  const cmp = (a: ConfigState) => JSON.stringify({ ...a, fishpaper: null, export: null });
  const cur = cmp(s);
  for (const p of PRESETS) if (cmp(normalize({ ...DEFAULT_STATE, ...p.patch })) === cur) return p.id;
  return null;
}

/**
 * Zelle aus gespeichertem Zustand: Datenblattzelle -> Werte aus der Datenbank;
 * alte generische Typen '21700'/'18650' (entfallen) und unbekannte Typen -> eigene Zelle mit den gespeicherten Maßen.
 */
function loadCell(cellType: string, stored: CellSpec): { cellType: CellType; cell: CellSpec } {
  const ds = datasheetById(cellType);
  if (ds) return { cellType: ds.id, cell: cellSpecFromDatasheet(ds) };
  if (cellType === 'custom') return { cellType, cell: { ...stored, id: 'custom' } };
  return { cellType: 'custom', cell: customCell(stored) };
}

/** Tiefes Zusammenführen eines (evtl. unvollständigen/alten) Zustands mit den Defaults. */
export function mergeWithDefaults(raw: unknown): ConfigState {
  if (!raw || typeof raw !== 'object') throw new Error('Ungültige Konfiguration');
  const r = raw as Partial<ConfigState>;
  const obj = <T extends object>(v: unknown, d: T): T => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return d;
    const out = { ...d } as Record<string, unknown>;
    for (const k of Object.keys(d)) {
      const dv = (d as Record<string, unknown>)[k];
      const vv = (v as Record<string, unknown>)[k];
      if (vv === undefined) continue;
      if (dv === null || typeof vv === typeof dv) out[k] = vv;
    }
    return out as T;
  };
  const numOrNull = (v: unknown) => (typeof v === 'number' ? v : null);
  const numArr = (v: unknown, d: number[]) => (Array.isArray(v) && v.every((x) => typeof x === 'number') ? v : d);
  const oneOf = <T extends string>(v: unknown, allowed: readonly T[], d: T): T => (allowed.includes(v as T) ? (v as T) : d);
  const intIn = (v: unknown, min: number, max: number, d: number) =>
    typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : d;
  const terminal = (v: unknown, dt: TerminalSpec): TerminalSpec => {
    const t = obj(v, dt);
    return { end: oneOf(t.end, ['V', 'H'], dt.end), side: oneOf(t.side, ['L', 'R'], dt.side) };
  };
  const overrides = (v: unknown): FishpaperOptions['partOverrides'] => {
    const out: FishpaperOptions['partOverrides'] = {};
    if (v && typeof v === 'object')
      for (const [k, o] of Object.entries(v as Record<string, unknown>)) {
        const e = o as { enabled?: unknown; count?: unknown };
        if (e && typeof e.enabled === 'boolean' && typeof e.count === 'number') out[k] = { enabled: e.enabled, count: e.count };
      }
    return out;
  };
  const d = DEFAULT_STATE;
  const top = obj(r, d);
  const fp = obj(r.fishpaper, d.fishpaper);
  const df = d.fishpaper;
  const ex = obj(r.export, d.export);
  const booster = obj(r.booster, d.booster);
  const s: ConfigState = {
    ...top,
    ...loadCell(top.cellType, obj(r.cell, d.cell)),
    bridge: oneOf(top.bridge, ['auto', 'inner', 'outer'], d.bridge),
    wideLayer: oneOf(top.wideLayer, ['top', 'bottom'], d.wideLayer),
    layers:
      Number.isInteger(top.layers) && top.layers >= LAYER_LIMITS.min && top.layers <= LAYER_LIMITS.max ? top.layers : d.layers,
    seriesSplit: numArr(r.seriesSplit, d.seriesSplit),
    cellsPerRowSplit: numArr(r.cellsPerRowSplit, d.cellsPerRowSplit),
    stacking: oneOf(top.stacking, ['honeycomb', 'grid'], d.stacking),
    offsetSide: oneOf(top.offsetSide, ['L', 'R'], d.offsetSide),
    spacingMode: oneOf(top.spacingMode, ['fishpaper', 'spacer'], d.spacingMode),
    spacingInput: oneOf(top.spacingInput, ['gap', 'pitch'], d.spacingInput),
    topAlign: oneOf(top.topAlign, ['right', 'left', 'center'], d.topAlign),
    gapRow: numOrNull(r.gapRow),
    gapLayer: numOrNull(r.gapLayer),
    holderRim: numOrNull(r.holderRim),
    mainMinus: terminal(r.mainMinus, d.mainMinus),
    mainPlus: terminal(r.mainPlus, d.mainPlus),
    booster: {
      ...booster,
      position: oneOf(booster.position, ['plus', 'minus'], d.booster.position),
      subPacks: intIn(booster.subPacks, LIMITS.subPacks.min, LIMITS.subPacks.max, d.booster.subPacks),
      bridge: oneOf(booster.bridge, ['auto', 'inner', 'outer'], d.booster.bridge),
      layers: intIn(booster.layers, LAYER_LIMITS.min, LAYER_LIMITS.max, d.booster.layers),
    },
    fishpaper: {
      ...fp,
      outlineFace: oneOf(fp.outlineFace, ['straight', 'tucked'], df.outlineFace),
      outlineWrap: oneOf(fp.outlineWrap, ['straight', 'tucked'], df.outlineWrap),
      wrapMode: oneOf(fp.wrapMode, ['perPack', 'combined'], df.wrapMode),
      interlayer: oneOf(fp.interlayer, ['single', 'double'], df.interlayer),
      bridgeCutout: oneOf(fp.bridgeCutout, ['none', 'notch', 'slot'], df.bridgeCutout),
      partOverrides: overrides(r.fishpaper?.partOverrides),
    },
    export: {
      pageFormat: oneOf(ex.pageFormat, ['a4', 'a3', 'letter', 'plotter', 'laser'], d.export.pageFormat),
      oversize: oneOf(ex.oversize, ['tile', 'split'], d.export.oversize),
    },
  };
  return normalize(s);
}

/**
 * Stand im alten Format (Formatversion 1, vor Plan 06): „Zellen je Lage“ war eine Eingabe, die Aufteilung immer
 * gleichmäßig. Das Ergebnis zeigt denselben Akku wie vorher. Ergibt die Ableitung aus der Lagenzahl dieselben
 * Werte, wird auf automatisch zurückgestellt (Plan 06 §4.7).
 */
export function migrateV1(raw: unknown): ConfigState {
  if (!raw || typeof raw !== 'object') throw new Error('Ungültige Konfiguration');
  const s = mergeWithDefaults({ ...raw, bridge: 'auto', wideLayer: 'top', layers: 2, cellsPerRowManual: true });
  const rows = s.cellsPerRowSplitManual ? s.cellsPerRowSplit : s.seriesSplit.map(() => s.cellsPerRow);
  const layers = (s.seriesSplit[0] * s.parallel) / rows[0];
  if (!Number.isInteger(layers) || layers < LAYER_LIMITS.min || layers > LAYER_LIMITS.max) return s;
  const auto = autoRows(s.seriesSplit, s.parallel, layers, s.stacking);
  if (auto.error || auto.perRow.join() !== rows.join()) return s;
  return normalize({ ...s, layers, cellsPerRowManual: false, cellsPerRowSplitManual: false });
}
