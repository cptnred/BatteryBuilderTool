/**
 * Anzeigetexte des Konfigurations-Panels (Plan 06 §5) – rein, ohne React.
 */
import { layerPlan } from '../core';
import type { ConfigState } from './config';
import { DEFAULT_STATE, boosterInfo, effectiveSplit, mainSeries, rowInfo, toBatteryConfig } from './config';
import type { BridgePos } from './derive';
import { bridgePosOfSplit, bridgeState } from './derive';

export interface BridgeSwitch {
  /** markierte Lage; null, wenn es keine einzelne Brücke gibt */
  value: BridgePos | null;
  disabled: boolean;
  /** Folge der Wahl bzw. Grund, warum der Schalter inaktiv ist */
  hint: string;
}

/** Zustand des Schalters „Brücke innen | außen“ (Plan 06 §5.2). */
export function bridgeSwitch(s: ConfigState): BridgeSwitch {
  if (s.subPacks === 1) return { value: null, disabled: true, hint: 'ein Teilpack: keine Brücke' };
  if (s.subPacks !== 2) return { value: null, disabled: true, hint: 'nur bei 2 Teilpacks wählbar' };
  const mainS = mainSeries(s);
  const split = effectiveSplit(s);
  const text = split.join(' + ');
  const value = bridgePosOfSplit(split);
  if (s.seriesSplitManual) return { value, disabled: true, hint: `folgt aus der manuellen Aufteilung ${text}` };
  const b = bridgeState(mainS, s.subPacks, s.bridge);
  if (!b.selectable)
    return {
      value,
      disabled: true,
      hint:
        mainS % 2 !== 0
          ? `${mainS}S: ungerade Gruppenzahl, Brücke liegt außen um einen Teilpack`
          : `${mainS}S: zu wenige Gruppen für eine andere Aufteilung`,
    };
  return {
    value,
    disabled: false,
    hint: b.uneven ? `ungleich ${text} – Teilpacks unterschiedlich breit` : `gleichmäßig ${text}`,
  };
}

interface LayerPart {
  layers: number;
  /** „9“ bei vollen Lagen, „8 + 7“ bei unvollständiger Lage */
  text: string;
  short: boolean;
}

/** Platzhalter, wenn kein Teilpack Gruppen hat (dann gibt es kein Lagenbild) */
const NO_LAYERS = '–';

/**
 * Lagenbild je Teilpack; null, wenn eine Zellzahl nicht aufgeht. Teilpacks ohne Gruppen bleiben außen vor:
 * das ist ein Fehler der Aufteilung, den der Kern meldet, kein Fehler der Lagen.
 */
function layerParts(s: ConfigState): LayerPart[] | null {
  const info = rowInfo(s);
  if (info.error) return null;
  const cfg = toBatteryConfig(s);
  const split = effectiveSplit(s);
  const out: LayerPart[] = [];
  for (let i = 0; i < split.length; i++) {
    if (split[i] < 1) continue;
    const n = split[i] * s.parallel;
    const m = info.perRow[i];
    const plan = layerPlan(cfg, n, m);
    if (plan === null) return null;
    out.push({ layers: Math.ceil(n / m), text: plan === 'short' ? `${m} + ${m - 1}` : `${m}`, short: plan === 'short' });
  }
  return out;
}

/** Zellen je Lage als Text, z. B. „9 je Lage“, „8 + 7“ oder „9 + 8 / 8 + 7“; null, wenn es nicht aufgeht. */
export function layerRowsText(s: ConfigState): string | null {
  const parts = layerParts(s);
  if (!parts) return null;
  if (!parts.length) return NO_LAYERS;
  const texts = [...new Set(parts.map((p) => p.text))].join(' / ');
  return parts.some((p) => p.short) ? texts : `${texts} je Lage`;
}

/** Lagenzahl(en) der Teilpacks, z. B. „2“ oder „2/4“; null, wenn es nicht aufgeht. */
export function layerCountText(s: ConfigState): string | null {
  const parts = layerParts(s);
  if (!parts) return null;
  return parts.length ? [...new Set(parts.map((p) => p.layers))].join('/') : NO_LAYERS;
}

/** Hat mindestens ein Teilpack eine unvollständige Lage? Dann ist „Größere Lage“ einstellbar. */
export function hasShortLayerRows(s: ConfigState): boolean {
  return layerParts(s)?.some((p) => p.short) ?? false;
}

export type RowId = 'packs' | 'layers' | 'stacking' | 'terminals' | 'spacing' | 'cell' | 'booster' | 'fishpaper';

/** Zeilen der Liste „Aufbau“ in Anzeigereihenfolge (Plan 06 §5.3). */
export const ROW_IDS: readonly RowId[] = ['packs', 'layers', 'stacking', 'terminals', 'spacing', 'cell', 'booster', 'fishpaper'];

export const ROW_TITLES: Record<RowId, string> = {
  packs: 'Teilpacks',
  layers: 'Lagen',
  stacking: 'Stapelung',
  terminals: 'Anschlüsse',
  spacing: 'Abstände',
  cell: 'Zellmaße',
  booster: 'Splitpack',
  fishpaper: 'Zuschnitt',
};

/** Felder, die „Zurück auf Standard“ je Zeile zurücksetzt. */
const ROW_FIELDS: Record<RowId, readonly (keyof ConfigState)[]> = {
  packs: ['subPacks', 'seriesSplitManual'],
  layers: ['layers', 'cellsPerRowManual', 'cellsPerRowSplitManual', 'wideLayer'],
  stacking: ['stacking', 'offsetSide'],
  terminals: ['mainMinus', 'mainPlus'],
  spacing: ['spacingMode', 'paperThickness', 'gapRow', 'gapLayer', 'holderRim', 'spacingInput', 'packGap', 'nickelThickness'],
  cell: [],
  booster: ['boosterEnabled', 'booster'],
  fishpaper: ['fishpaper'],
};

const fmt = (v: number) => v.toLocaleString('de-DE', { maximumFractionDigits: 2 });
const sideWord = (x: 'L' | 'R') => (x === 'L' ? 'links' : 'rechts');
const endWord = (x: 'V' | 'H') => (x === 'V' ? 'vorne' : 'hinten');
const differs = (s: ConfigState, keys: readonly (keyof ConfigState)[]) =>
  keys.some((k) => JSON.stringify(s[k]) !== JSON.stringify(DEFAULT_STATE[k]));
/** Zuschnitt ohne die Teileauswahl (die gehört zum Fishpaper-Tab, nicht zu dieser Zeile) */
const fishpaperSettings = (s: ConfigState) => JSON.stringify({ ...s.fishpaper, partOverrides: null });

/** Weicht die Zeile vom Standard bzw. vom automatischen Wert ab? Die Brückenwahl zählt nicht dazu (Plan 06 §5.4). */
export function rowModified(s: ConfigState, id: RowId): boolean {
  switch (id) {
    case 'cell':
      return false; // eigene Zelle hat ihre eigene Marke
    case 'booster':
      return s.boosterEnabled;
    case 'spacing':
      return differs(s, ['spacingMode', 'paperThickness', 'packGap', 'nickelThickness']);
    case 'fishpaper':
      return fishpaperSettings(s) !== fishpaperSettings(DEFAULT_STATE);
    default:
      return differs(s, ROW_FIELDS[id]);
  }
}

export function rowBadge(s: ConfigState, id: RowId): string | null {
  if (id === 'cell') return s.cellType === 'custom' ? 'eigene Zelle' : null;
  return rowModified(s, id) ? 'angepasst' : null;
}

/** Lage von Hauptminus und Hauptplus als Text, getrennt, damit die Oberfläche − und + einfärben kann. */
export function terminalTexts(s: ConfigState): { minus: string; plus: string } {
  return {
    minus: `${endWord(s.mainMinus.end)} ${sideWord(s.mainMinus.side)}`,
    plus: `${endWord(s.mainPlus.end)} ${sideWord(s.mainPlus.side)}`,
  };
}

/** Kurzwert einer zugeklappten Zeile. */
export function rowValue(s: ConfigState, id: RowId): string {
  switch (id) {
    case 'packs':
      return s.subPacks === 1 ? '1 Teilpack' : `${s.subPacks} · ${effectiveSplit(s).join(' + ')}`;
    case 'layers': {
      const count = layerCountText(s);
      const rows = layerRowsText(s);
      if (!count || !rows) return 'geht nicht auf';
      return rows === NO_LAYERS ? NO_LAYERS : `${count} · ${rows}`;
    }
    case 'stacking':
      return s.stacking === 'grid' ? 'Raster' : `Wabe, Versatz ${sideWord(s.offsetSide)}`;
    case 'terminals': {
      const t = terminalTexts(s);
      return `− ${t.minus} · + ${t.plus}`;
    }
    case 'spacing':
      return s.spacingMode === 'spacer' ? 'Abstandhalter' : `Fishpaper ${fmt(s.paperThickness)} mm`;
    case 'cell':
      return `${fmt(s.cell.diameter)} × ${fmt(s.cell.length)} mm · ${fmt(s.cell.capacityAh)} Ah`;
    case 'booster':
      return s.boosterEnabled ? `+ ${s.booster.series}S am ${s.booster.position === 'plus' ? 'Hauptplus' : 'Hauptminus'}` : 'aus';
    case 'fishpaper':
      return rowModified(s, 'fishpaper') ? 'eigene Werte' : 'Standard';
  }
}

/** Patch für „Zurück auf Standard“: nur die Felder dieser Zeile; die Teileauswahl bleibt erhalten. */
export function resetRowPatch(s: ConfigState, id: RowId): Partial<ConfigState> {
  const patch: Partial<Record<keyof ConfigState, unknown>> = {};
  for (const k of ROW_FIELDS[id]) patch[k] = DEFAULT_STATE[k];
  if (id === 'fishpaper') patch.fishpaper = { ...DEFAULT_STATE.fishpaper, partOverrides: s.fishpaper.partOverrides };
  return patch as Partial<ConfigState>;
}

/** Präfix der Feld-ID (NumberField.id) -> Zeile */
const FIELD_ROWS: readonly (readonly [string, RowId])[] = [
  ['subPacks', 'packs'],
  ['split.', 'packs'],
  ['layers', 'layers'],
  ['cellsPerRow', 'layers'],
  ['cprSplit.', 'layers'],
  ['paperThickness', 'spacing'],
  ['gapRow', 'spacing'],
  ['gapLayer', 'spacing'],
  ['holderRim', 'spacing'],
  ['packGap', 'spacing'],
  ['nickel', 'spacing'],
  ['cell.', 'cell'],
  ['booster.', 'booster'],
  ['fp.', 'fishpaper'],
];

/** Zeile, zu der ein Feldfehler gehört; null bei den Grundwerten (S, P). */
export function rowOfField(fieldId: string): RowId | null {
  return FIELD_ROWS.find(([prefix]) => fieldId.startsWith(prefix))?.[1] ?? null;
}

/** Hat die Zeile einen Fehler? Dann klappt sie auf und trägt eine Fehlermarke (Plan 06 §5.5). */
export function rowHasError(s: ConfigState, id: RowId, fieldErrorIds: readonly string[]): boolean {
  if (fieldErrorIds.some((f) => rowOfField(f) === id)) return true;
  switch (id) {
    case 'packs':
      return s.seriesSplitManual && effectiveSplit(s).reduce((a, b) => a + b, 0) !== mainSeries(s);
    case 'layers':
      return layerRowsText(s) === null;
    case 'spacing':
      return s.spacingMode === 'spacer' && (s.gapRow === null || s.gapLayer === null || s.holderRim === null);
    case 'booster':
      return (boosterInfo(s)?.error ?? null) !== null;
    default:
      return false;
  }
}
