/** Anzeigetexte des Konfigurations-Panels (Plan 06 §5) – rein, mit konkreten Texten. */
import { describe, expect, it } from 'vitest';
import { solve } from '../src/core';
import type { ConfigState, PresetId } from '../src/state/config';
import { DEFAULT_STATE, reducer, toBatteryConfig } from '../src/state/config';
import {
  ROW_IDS,
  ROW_TITLES,
  bridgeSwitch,
  hasShortLayerRows,
  layerCountText,
  layerRowsText,
  resetRowPatch,
  rowBadge,
  rowHasError,
  rowModified,
  rowOfField,
  rowValue,
  terminalTexts,
} from '../src/state/configSummary';

const preset = (id: PresetId) => reducer(DEFAULT_STATE, { type: 'preset', id });
const set = (s: ConfigState, patch: Partial<ConfigState>) => reducer(s, { type: 'set', patch });

describe('Brückenschalter (§5.2)', () => {
  it('natürliche Lage: gleichmäßige Aufteilung', () => {
    expect(bridgeSwitch(DEFAULT_STATE)).toEqual({ value: 'inner', disabled: false, hint: 'gleichmäßig 9 + 9' });
    expect(bridgeSwitch(preset('30S1P'))).toEqual({ value: 'inner', disabled: false, hint: 'gleichmäßig 15 + 15' });
    expect(bridgeSwitch(preset('32S1P'))).toEqual({ value: 'outer', disabled: false, hint: 'gleichmäßig 16 + 16' });
  });

  it('andere Wahl: ungleiche Aufteilung mit Hinweis', () => {
    const s = reducer(preset('32S1P'), { type: 'bridge', pos: 'inner' });
    expect(bridgeSwitch(s)).toEqual({
      value: 'inner',
      disabled: false,
      hint: 'ungleich 17 + 15 – Teilpacks unterschiedlich breit',
    });
  });

  it('inaktiv mit Grund', () => {
    expect(bridgeSwitch(set(DEFAULT_STATE, { series: 19 }))).toEqual({
      value: 'outer',
      disabled: true,
      hint: '19S: ungerade Gruppenzahl, Brücke liegt außen um einen Teilpack',
    });
    expect(bridgeSwitch(set(DEFAULT_STATE, { series: 30, parallel: 1, seriesSplitManual: true, seriesSplit: [14, 16] }))).toEqual(
      { value: 'outer', disabled: true, hint: 'folgt aus der manuellen Aufteilung 14 + 16' },
    );
    expect(bridgeSwitch(set(DEFAULT_STATE, { subPacks: 1 }))).toEqual({
      value: null,
      disabled: true,
      hint: 'ein Teilpack: keine Brücke',
    });
    expect(bridgeSwitch(set(DEFAULT_STATE, { subPacks: 3 }))).toEqual({
      value: null,
      disabled: true,
      hint: 'nur bei 2 Teilpacks wählbar',
    });
    expect(bridgeSwitch(set(DEFAULT_STATE, { series: 2, parallel: 1 })).hint).toBe(
      '2S: zu wenige Gruppen für eine andere Aufteilung',
    );
  });

  // Review Focus 3
  it('Booster macht den Hauptpack ungerade, während „außen“ gewählt ist: inaktiv, kein Fehler', () => {
    const outer = reducer(preset('20S2P-split'), { type: 'bridge', pos: 'outer' });
    expect(outer.seriesSplit).toEqual([10, 8]);
    const s = set(outer, { series: 20, booster: { series: 3, position: 'plus' } });
    expect(s.bridge).toBe('outer');
    expect(s.seriesSplit).toEqual([9, 8]);
    expect(bridgeSwitch(s)).toEqual({
      value: 'outer',
      disabled: true,
      hint: '17S: ungerade Gruppenzahl, Brücke liegt außen um einen Teilpack',
    });
    expect(solve(toBatteryConfig(s)).issues.filter((i) => i.level === 'error')).toEqual([]);
  });
});

describe('Lagenbild', () => {
  it('volle Lagen, unvollständige Lage, gemischt', () => {
    expect(layerRowsText(DEFAULT_STATE)).toBe('9 je Lage');
    expect(layerRowsText(preset('30S1P'))).toBe('8 + 7');
    expect(layerRowsText(reducer(preset('32S1P'), { type: 'bridge', pos: 'inner' }))).toBe('9 + 8 / 8 + 7');
    expect(layerRowsText(reducer(DEFAULT_STATE, { type: 'bridge', pos: 'outer' }))).toBe('10 / 8 je Lage');
    expect(layerRowsText(set(DEFAULT_STATE, { series: 31, parallel: 1 }))).toBe('8 / 8 + 7');
  });

  it('Lagenzahl', () => {
    expect(layerCountText(DEFAULT_STATE)).toBe('2');
    expect(layerCountText(set(DEFAULT_STATE, { parallel: 3, layers: 3 }))).toBe('3');
    expect(layerCountText(set(DEFAULT_STATE, { cellsPerRowManual: true, cellsPerRow: 6 }))).toBe('3');
  });

  it('geht nicht auf', () => {
    const grid = set(DEFAULT_STATE, { stacking: 'grid', series: 30, parallel: 1 });
    expect(layerRowsText(grid)).toBeNull();
    expect(layerCountText(grid)).toBeNull();
    expect(layerRowsText(set(set(DEFAULT_STATE, { cellsPerRowManual: true, cellsPerRow: 9 }), { series: 20 }))).toBeNull();
  });

  it('unvollständige Lage vorhanden?', () => {
    expect(hasShortLayerRows(DEFAULT_STATE)).toBe(false);
    expect(hasShortLayerRows(preset('30S1P'))).toBe(true);
    expect(hasShortLayerRows(set(DEFAULT_STATE, { series: 31, parallel: 1 }))).toBe(true);
  });
});

describe('Zeilen der Liste „Aufbau“ (§5.3–5.5)', () => {
  it('Titel in fester Reihenfolge', () => {
    expect(ROW_IDS.map((id) => ROW_TITLES[id])).toEqual([
      'Teilpacks',
      'Lagen',
      'Stapelung',
      'Anschlüsse',
      'Abstände',
      'Zellmaße',
      'Splitpack',
      'Zuschnitt',
    ]);
  });

  it('Kurzwerte und Marken im Standard 18S2P', () => {
    expect(ROW_IDS.map((id) => [id, rowValue(DEFAULT_STATE, id), rowBadge(DEFAULT_STATE, id)])).toEqual([
      ['packs', '2 · 9 + 9', null],
      ['layers', '2 · 9 je Lage', null],
      ['stacking', 'Wabe, Versatz links', null],
      ['terminals', '− vorne rechts · + hinten rechts', null],
      ['spacing', 'Fishpaper 0,3 mm', null],
      ['cell', '21,55 × 70,15 mm · 5 Ah', null],
      ['booster', 'aus', null],
      ['fishpaper', 'Standard', null],
    ]);
  });

  it('30S1P und 32S1P innen', () => {
    expect(rowValue(preset('30S1P'), 'packs')).toBe('2 · 15 + 15');
    expect(rowValue(preset('30S1P'), 'layers')).toBe('2 · 8 + 7');
    const inner = reducer(preset('32S1P'), { type: 'bridge', pos: 'inner' });
    expect(rowValue(inner, 'packs')).toBe('2 · 17 + 15');
    expect(rowValue(inner, 'layers')).toBe('2 · 9 + 8 / 8 + 7');
    // die Brückenwahl zählt nicht als Anpassung einer Zeile
    expect(rowBadge(inner, 'packs')).toBeNull();
    expect(rowBadge(inner, 'layers')).toBeNull();
  });

  it('abweichende Werte tragen „angepasst“', () => {
    expect(rowBadge(set(DEFAULT_STATE, { subPacks: 1 }), 'packs')).toBe('angepasst');
    expect(rowValue(set(DEFAULT_STATE, { subPacks: 1 }), 'packs')).toBe('1 Teilpack');
    expect(rowBadge(set(DEFAULT_STATE, { parallel: 3, layers: 3 }), 'layers')).toBe('angepasst');
    expect(rowValue(set(DEFAULT_STATE, { parallel: 3, layers: 3 }), 'layers')).toBe('3 · 9 je Lage');
    expect(rowValue(set(DEFAULT_STATE, { stacking: 'grid' }), 'stacking')).toBe('Raster');
    expect(rowBadge(set(DEFAULT_STATE, { offsetSide: 'R' }), 'stacking')).toBe('angepasst');
    const rev = set(DEFAULT_STATE, { mainMinus: { end: 'H', side: 'L' } });
    expect(rowValue(rev, 'terminals')).toBe('− hinten links · + hinten rechts');
    expect(rowBadge(rev, 'terminals')).toBe('angepasst');
    expect(rowBadge(set(DEFAULT_STATE, { packGap: 1 }), 'spacing')).toBe('angepasst');
  });

  it('Splitpack, Abstandhalter, eigene Zelle, Zuschnitt', () => {
    const split = preset('20S2P-split');
    expect(rowValue(split, 'booster')).toBe('+ 2S am Hauptplus');
    expect(rowBadge(split, 'booster')).toBe('angepasst');
    const spacer = reducer(DEFAULT_STATE, { type: 'spacingMode', mode: 'spacer' });
    expect(rowValue(spacer, 'spacing')).toBe('Abstandhalter');
    expect(rowBadge(spacer, 'spacing')).toBe('angepasst');
    const custom = reducer(DEFAULT_STATE, { type: 'cellType', cellType: 'custom' });
    expect(rowBadge(custom, 'cell')).toBe('eigene Zelle');
    expect(rowModified(custom, 'cell')).toBe(false);
    const fp = reducer(DEFAULT_STATE, { type: 'fishpaper', patch: { wrapOverlap: 15 } });
    expect(rowValue(fp, 'fishpaper')).toBe('eigene Werte');
    expect(rowBadge(fp, 'fishpaper')).toBe('angepasst');
    // Teile an-/abwählen ist keine Einstellung dieser Zeile
    const part = reducer(DEFAULT_STATE, { type: 'part', id: 'wrap-P0', enabled: false, count: 1 });
    expect(rowBadge(part, 'fishpaper')).toBeNull();
  });

  it('Feldfehler gehören zu einer Zeile; S und P gehören zu den Grundwerten', () => {
    expect(rowOfField('series')).toBeNull();
    expect(rowOfField('parallel')).toBeNull();
    expect(rowOfField('subPacks')).toBe('packs');
    expect(rowOfField('split.1')).toBe('packs');
    expect(rowOfField('layers')).toBe('layers');
    expect(rowOfField('cellsPerRow')).toBe('layers');
    expect(rowOfField('cprSplit.0')).toBe('layers');
    expect(rowOfField('gapRow')).toBe('spacing');
    expect(rowOfField('nickel')).toBe('spacing');
    expect(rowOfField('cell.diameter')).toBe('cell');
    expect(rowOfField('booster.series')).toBe('booster');
    expect(rowOfField('fp.cutW')).toBe('fishpaper');
    expect(rowHasError(DEFAULT_STATE, 'cell', ['cell.diameter'])).toBe(true);
    expect(rowHasError(DEFAULT_STATE, 'cell', ['series'])).toBe(false);
  });

  it('Fehler aus dem Zustand: Summe, Lagen, Pflichtfelder, Booster', () => {
    for (const id of ROW_IDS) expect(rowHasError(DEFAULT_STATE, id, []), id).toBe(false);
    expect(rowHasError(set(DEFAULT_STATE, { seriesSplitManual: true, seriesSplit: [9, 8] }), 'packs', [])).toBe(true);
    const grid = set(DEFAULT_STATE, { stacking: 'grid', series: 30, parallel: 1 });
    expect(rowHasError(grid, 'layers', [])).toBe(true);
    expect(rowValue(grid, 'layers')).toBe('geht nicht auf');
    expect(rowHasError(reducer(DEFAULT_STATE, { type: 'spacingMode', mode: 'spacer' }), 'spacing', [])).toBe(true);
    const booster = set(preset('20S2P-split'), { parallel: 1, layers: 3 });
    expect(rowHasError(booster, 'booster', [])).toBe(true);
  });

  // Review Focus 5
  it('manueller Wert passt nach einer S-Änderung nicht mehr: Fehlermarke, „Zurück auf Standard“ behebt es', () => {
    const s = set(set(DEFAULT_STATE, { cellsPerRowManual: true, cellsPerRow: 9 }), { series: 20 });
    expect(rowValue(s, 'layers')).toBe('geht nicht auf');
    expect(rowHasError(s, 'layers', [])).toBe(true);
    expect(rowBadge(s, 'layers')).toBe('angepasst');
    const fixed = set(s, resetRowPatch(s, 'layers'));
    expect(rowHasError(fixed, 'layers', [])).toBe(false);
    expect(rowValue(fixed, 'layers')).toBe('2 · 10 je Lage');
    expect(rowBadge(fixed, 'layers')).toBeNull();
  });

  it('„Zurück auf Standard“ setzt nur die Felder der Zeile zurück', () => {
    const s = set(DEFAULT_STATE, { series: 30, parallel: 1, wideLayer: 'bottom', offsetSide: 'R' });
    const reset = set(s, resetRowPatch(s, 'layers'));
    expect(reset).toMatchObject({ series: 30, parallel: 1, wideLayer: 'top', offsetSide: 'R' });
    const spacer = set(reducer(DEFAULT_STATE, { type: 'spacingMode', mode: 'spacer' }), { gapRow: 1.5 });
    expect(set(spacer, resetRowPatch(spacer, 'spacing'))).toMatchObject({ spacingMode: 'fishpaper', gapRow: null });
    const fp = reducer(reducer(DEFAULT_STATE, { type: 'fishpaper', patch: { wrapOverlap: 15 } }), {
      type: 'part',
      id: 'wrap-P0',
      enabled: false,
      count: 1,
    });
    const fpReset = set(fp, resetRowPatch(fp, 'fishpaper'));
    expect(fpReset.fishpaper.wrapOverlap).toBe(10);
    expect(fpReset.fishpaper.partOverrides).toEqual({ 'wrap-P0': { enabled: false, count: 1 } });
    expect(resetRowPatch(DEFAULT_STATE, 'cell')).toEqual({});
  });

  it('Teilpack ohne Gruppen ist kein Fehler der Zeile „Lagen“ (das meldet der Kern)', () => {
    const one = set(DEFAULT_STATE, { series: 1 });
    expect(one.seriesSplit).toEqual([1, 0]);
    expect(rowHasError(one, 'layers', [])).toBe(false);
    expect(rowValue(one, 'layers')).toBe('2 · 1 je Lage');
    const empty = set(preset('20S2P-split'), { series: 2 });
    expect(empty.seriesSplit).toEqual([0, 0]);
    expect(rowHasError(empty, 'layers', [])).toBe(false);
    expect(rowValue(empty, 'layers')).toBe('–');
  });

  it('Anschlüsse in zwei Teilen, damit die Oberfläche − und + einfärben kann', () => {
    expect(terminalTexts(DEFAULT_STATE)).toEqual({ minus: 'vorne rechts', plus: 'hinten rechts' });
    expect(terminalTexts(set(DEFAULT_STATE, { mainPlus: { end: 'V', side: 'L' } })).plus).toBe('vorne links');
  });
});
