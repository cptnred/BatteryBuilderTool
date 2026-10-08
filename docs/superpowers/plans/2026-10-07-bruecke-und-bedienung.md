# Brückenlage, unvollständige Lage, 30S1P und einfachere Bedienung – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Brückenlage wird wählbar, 30S1P (15 + 15 mit unvollständiger Lage) wird baubar und bekommt ein Preset, und das Konfigurations-Panel zeigt nur noch wenige Grundwerte plus eine aufklappbare Liste „Aufbau“.

**Architecture:** Der Kern (`src/core`) lernt genau eine neue Sache: eine Wabenlage, die eine Zelle kürzer ist. Alles andere (Aufteilung aus der Brückenwahl, Zellen je Lage aus der Lagenzahl, Übernahme alter Links) sind reine Ableitungen in `src/state`. Anzeigetexte der Panel-Zeilen liegen als reine Funktionen in `src/view`; die React-Komponenten rechnen nicht.

**Tech Stack:** Vite, React 19, TypeScript strict, Vitest (Umgebung `node`), Playwright, ESLint + Prettier (`printWidth` 130, `singleQuote`, `trailingComma: all`).

**Spec:** `docs/06_PLAN_BRUECKE_UND_BEDIENUNG.md` – vor jeder Aufgabe den genannten Abschnitt lesen. Fachregeln: `docs/01_FACHKONZEPT.md`.

## Global Constraints

- `reference/fixtures/*.json` (11 Dateien) und `reference/pack-core.ts` werden **nicht** geändert. `tests/fixtures.test.ts` und `tests/reference-equivalence.test.ts` werden **nicht** geändert und bleiben grün.
- Für Teilpacks mit vollen Lagen rechnet `src/core` exakt wie bisher, mit **wortgleichen** Fehler- und Hinweistexten.
- `SubPack` bekommt keine neuen Felder. `BatteryConfig` bekommt nur optionale Felder.
- `src/core` bleibt frei von React/DOM. UI-Komponenten rechnen nicht selbst.
- Koordinaten: x = global links→rechts, z = unten→oben, y = vorne→hinten, alles in mm.
- UI-Texte auf Deutsch, Code auf Englisch. Polarität immer mit Symbol (+/−) **und** Farbe.
- `localStorage`-Schlüssel mit Präfix `akku-konfigurator:`. Keine absoluten Pfade ab `/` im Frontend.
- **Nicht committen, nicht pushen, nicht deployen**, solange der Nutzer es nicht ausdrücklich sagt (Regel aus `CLAUDE.md`). Jede Aufgabe endet deshalb mit „Prüfen“ statt mit einem Commit.
- Nach jeder Aufgabe grün: `npm test`, `npm run build`, `npm run lint`. Vor dem Lint die geänderten Dateien mit `npx prettier --write <Dateien>` formatieren.
- Die Sollwerte für den Kern in Aufgabe 1 und 2 wurden vorab an einer Wegwerf-Kopie von `reference/pack-core.ts` nachgerechnet. Weicht ein Testergebnis davon ab, ist die Umsetzung falsch, nicht der Sollwert. Bei Zweifel den Nutzer fragen.

## Review Focus

Eingaben, die die Spec nahelegt, aber nicht ausdrücklich prüft. Jede Zeile hat ihren Test in der genannten Aufgabe.

1. **Unvollständige Lage mit Abstandhalter** (Spalt Reihe ≠ Spalt Lage): Zellen bleiben benachbart, keine Warnung, Umriss „eingebogen“ bleibt eine Kontur. → Aufgabe 1.
2. **Umwicklung „gemeinsam“ bei ungleich breiten Teilpacks** (32S1P innen = 17 + 15): Das Teil richtet sich nach dem breiteren Teilpack. → Aufgabe 2.
3. **Booster macht die Hauptpack-Gruppenzahl ungerade**, während eine Brückenwahl gesetzt ist: Schalter wird inaktiv, zeigt den Grund, kein Absturz. → Aufgabe 6.
4. **Alter Link mit unbrauchbaren Werten** (`cellsPerRow: 0`): lädt ohne Ausnahme und zeigt den Fehler des Kerns. → Aufgabe 5.
5. **„Zellen je Lage manuell“ gesetzt, danach S geändert**, sodass der Wert nicht mehr passt: Zeile „Lagen“ trägt die Fehlermarke; „Zurück auf Standard“ behebt es. → Aufgabe 8.

## Dateien

| Datei | Verantwortung | Aufgabe |
|---|---|---|
| `src/core/types.ts` | optionales `BatteryConfig.wideLayer` | 1 |
| `src/core/geometry.ts` | `layerPlan`, `placeCells` mit Zellzahl | 1 |
| `src/core/validate.ts`, `src/core/wiring.ts` | nutzen `layerPlan` bzw. reichen die Zellzahl durch | 1 |
| `src/view/layers.ts` (neu) | Zellzahl je Lage, größte Lage eines Teilpacks | 2 |
| `src/view/topModel.ts`, `src/view/assumptions.ts` | Zelllinien und Annahmen-Text bei unvollständiger Lage | 2 |
| `src/state/derive.ts` (neu) | Aufteilung aus der Brückenwahl, Zellen je Lage aus der Lagenzahl | 3 |
| `src/state/config.ts` | neue Felder, `normalize`, `toBatteryConfig`, Booster, Presets, `migrateV1` | 4, 5 |
| `src/state/url.ts`, `src/state/storage.ts` | Formatversion 2, Übernahme alter Stände | 5 |
| `src/view/configSummary.ts` (neu) | Brückenschalter, Kurzwerte, Marken und Fehler der Zeilen | 6, 8 |
| `src/ui/form/Fields.tsx` | `Choice` deaktivierbar, `Section` mit Marke/Fehler, `NumberField` räumt Fehler auf | 6, 9 |
| `src/ui/App.tsx` | Lagen-Fehler anzeigen, Fehler-IDs ans Panel | 6, 9 |
| `src/ui/config/ConfigPanel.tsx` | erst kleine Ergänzung, dann Rahmen aus Grundwerten + Liste | 6, 9 |
| `src/ui/config/Row.tsx`, `src/ui/config/rows/*.tsx` (neu) | eine Komponente je Zeile | 9 |
| `tests/short-layer.test.ts`, `tests/derive.test.ts`, `tests/config-summary.test.ts` (neu) | Tests mit konkreten Zahlen | 1–8 |
| `tests/state.test.ts`, `tests/e2e/screenshots.spec.ts` | an das neue Modell angepasst | 4–9 |
| `reference/fixtures/30S1P_21700.json` (neu), `docs/01_FACHKONZEPT.md` | erst **nach** Bestätigung durch den Nutzer | 7 |

---

### Task 1: Kern – unvollständige Lage

Spec §3. Ein Teilpack mit `n = 2·m − 1` Zellen (Wabe, `n ≥ 3`) bekommt eine große Lage mit `m` und eine kleine mit `m − 1` Zellen.

**Files:**
- Modify: `src/core/types.ts` (Interface `BatteryConfig`)
- Modify: `src/core/geometry.ts` (`placeCells`, neu `layerPlan`)
- Modify: `src/core/validate.ts:75-84` (zwei Prüfungen in `validateConfig`)
- Modify: `src/core/wiring.ts:45` (Aufruf von `placeCells`)
- Test: `tests/short-layer.test.ts` (neu)

**Interfaces:**
- Consumes: nichts aus früheren Aufgaben.
- Produces:
  - `BatteryConfig.wideLayer?: 'top' | 'bottom'` (fehlt → `'top'`)
  - `type LayerPlan = 'full' | 'short'`
  - `layerPlan(cfg: BatteryConfig, n: number, perRow: number): LayerPlan | null`
  - `placeCells(cfg, perRow, layers, count = perRow * layers)` – vierter Parameter neu, optional

- [ ] **Step 1: Test schreiben**

Datei `tests/short-layer.test.ts` anlegen:

```ts
/** Unvollständige Lage (Plan 06 §3): Gültigkeit, Platzierung, Verschaltung – mit konkreten Zahlen. */
import { describe, expect, it } from 'vitest';
import type { BatteryConfig } from '../src/core';
import { DEFAULT_CONFIG, balanceTaps, layerPlan, packOutline, placeCells, solve } from '../src/core';

const cfg30: BatteryConfig = { ...DEFAULT_CONFIG, series: 30, parallel: 1, cellsPerRow: 8 };
const errorsOf = (cfg: BatteryConfig) =>
  solve(cfg)
    .issues.filter((i) => i.level === 'error')
    .map((i) => i.msg);

describe('Gültigkeit (§3.1)', () => {
  it('layerPlan: volle Lagen, unvollständige Lage, ungültig', () => {
    expect(layerPlan(DEFAULT_CONFIG, 16, 8)).toBe('full');
    expect(layerPlan(DEFAULT_CONFIG, 1, 1)).toBe('full');
    expect(layerPlan(DEFAULT_CONFIG, 15, 8)).toBe('short');
    expect(layerPlan(DEFAULT_CONFIG, 3, 2)).toBe('short');
    expect(layerPlan(DEFAULT_CONFIG, 13, 8)).toBeNull();
    expect(layerPlan(DEFAULT_CONFIG, 14, 8)).toBeNull();
    expect(layerPlan(DEFAULT_CONFIG, 15, NaN)).toBeNull();
    expect(layerPlan({ ...DEFAULT_CONFIG, stacking: 'grid' }, 15, 8)).toBeNull();
  });

  it('Raster und 13 Zellen à 8: Fehlertext wortgleich zu heute, kein Layout', () => {
    expect(errorsOf({ ...cfg30, stacking: 'grid' })).toEqual([
      'Teilpack 1: 15 Zellen lassen sich nicht in volle Lagen à 8 aufteilen.',
      'Teilpack 2: 15 Zellen lassen sich nicht in volle Lagen à 8 aufteilen.',
    ]);
    expect(solve({ ...cfg30, stacking: 'grid' }).packs).toEqual([]);
    expect(errorsOf({ ...DEFAULT_CONFIG, series: 13, parallel: 1, subPacks: 1, cellsPerRow: 8 })).toEqual([
      'Teilpack 1: 13 Zellen lassen sich nicht in volle Lagen à 8 aufteilen.',
    ]);
  });
});

describe('Platzierung (§3.2, §3.4)', () => {
  it('15 Zellen, große Lage oben', () => {
    const { cells, width, height } = placeCells(DEFAULT_CONFIG, 8, 2, 15);
    const top = cells.filter((c) => c.layer === 1);
    const bottom = cells.filter((c) => c.layer === 0);
    expect(top.map((c) => c.id)).toEqual(['L1-0', 'L1-1', 'L1-2', 'L1-3', 'L1-4', 'L1-5', 'L1-6', 'L1-7']);
    expect(bottom.map((c) => c.id)).toEqual(['L0-0', 'L0-1', 'L0-2', 'L0-3', 'L0-4', 'L0-5', 'L0-6']);
    expect(top[0].x).toBeCloseTo(10.7, 9);
    expect(top[7].x).toBeCloseTo(162.6, 9);
    expect(top[0].z).toBeCloseTo(29.4928, 3);
    expect(bottom[0].x).toBeCloseTo(21.55, 9);
    expect(bottom[6].x).toBeCloseTo(151.75, 9);
    expect(bottom[0].z).toBeCloseTo(10.7, 9);
    expect(width).toBeCloseTo(173.3, 9);
    expect(height).toBeCloseTo(40.1928, 3);
  });

  it('große Lage unten', () => {
    const { cells } = placeCells({ ...DEFAULT_CONFIG, wideLayer: 'bottom' }, 8, 2, 15);
    const top = cells.filter((c) => c.layer === 1);
    const bottom = cells.filter((c) => c.layer === 0);
    expect(bottom).toHaveLength(8);
    expect(top).toHaveLength(7);
    expect(bottom[0].x).toBeCloseTo(10.7, 9);
    expect(top[0].x).toBeCloseTo(21.55, 9);
  });

  it('Wabenversatz hat keine Wirkung; volle Lagen bleiben unverändert', () => {
    expect(placeCells({ ...DEFAULT_CONFIG, offsetSide: 'R' }, 8, 2, 15)).toEqual(placeCells(DEFAULT_CONFIG, 8, 2, 15));
    expect(placeCells(DEFAULT_CONFIG, 8, 2, 16)).toEqual(placeCells(DEFAULT_CONFIG, 8, 2));
  });
});

describe('30S1P (§3.4)', () => {
  const L = solve(cfg30);
  const [A, B] = L.packs;

  it('keine Hinweise, Kosten 2 (beide Teilpacks beginnen oben)', () => {
    expect(L.issues).toEqual([]);
    expect(L.cost).toBe(2);
  });

  it('Teilpacks: Richtung, Stirnseiten, 15 Zellen', () => {
    expect(A).toMatchObject({ dir: 'RL', startFace: 'V', endFace: 'H', startSide: 'R', endSide: 'L', perRow: 8, layers: 2 });
    expect(B).toMatchObject({ dir: 'LR', startFace: 'V', endFace: 'H', startSide: 'L', endSide: 'R', perRow: 8, layers: 2 });
    expect(A.startsOnTop).toBe(true);
    expect(B.startsOnTop).toBe(true);
    expect(A.cells).toHaveLength(15);
    expect(B.cells).toHaveLength(15);
    expect(A.width).toBeCloseTo(173.3, 9);
  });

  it('Gruppen und Polarität', () => {
    expect(A.groups[0]).toEqual({ s: 1, cells: ['L1-7'], minusFace: 'V' });
    expect(A.groups[1]).toEqual({ s: 2, cells: ['L0-6'], minusFace: 'H' });
    expect(A.groups[14]).toEqual({ s: 15, cells: ['L1-0'], minusFace: 'V' });
    expect(B.groups[0]).toEqual({ s: 16, cells: ['L1-0'], minusFace: 'V' });
    expect(B.groups[1]).toEqual({ s: 17, cells: ['L0-0'], minusFace: 'H' });
    expect(B.groups[14]).toEqual({ s: 30, cells: ['L1-7'], minusFace: 'V' });
  });

  it('Streifen und Abgriffe', () => {
    expect(A.strips).toHaveLength(16);
    expect(A.strips[0]).toEqual({ face: 'V', node: 0, cells: ['L1-7'], kind: 'start' });
    expect(A.strips[15]).toEqual({ face: 'H', node: 15, cells: ['L1-0'], kind: 'end' });
    expect(B.strips[0]).toEqual({ face: 'V', node: 15, cells: ['L1-0'], kind: 'start' });
    expect(B.strips[15]).toEqual({ face: 'H', node: 30, cells: ['L1-7'], kind: 'end' });
    const taps = balanceTaps(L);
    expect(taps).toHaveLength(31);
    expect(taps[0]).toEqual({ node: 0, label: 'B0 (Hauptminus)', spots: [{ pack: 'P0', face: 'V', kind: 'start', cells: ['L1-7'] }] });
    expect(taps[30]).toEqual({ node: 30, label: 'B30 (Hauptplus)', spots: [{ pack: 'P1', face: 'H', kind: 'end', cells: ['L1-7'] }] });
  });

  it('Brücke B15 innen links, gerade durch', () => {
    expect(L.bridges).toEqual([
      { from: 'P0', to: 'P1', node: 15, kind: 'inner', fromFace: 'H', toFace: 'V', fromSide: 'L', toSide: 'L' },
    ]);
  });

  it('Umriss gerade 393,67 mm, eingebogen 550,80 mm', () => {
    expect(packOutline(L, A, 'straight').perimeter).toBeCloseTo(393.6726, 3);
    expect(packOutline(L, A, 'tucked').perimeter).toBeCloseTo(550.8042, 3);
  });

  it('große Lage unten: Start unten, Kosten 0', () => {
    const Lb = solve({ ...cfg30, wideLayer: 'bottom' });
    expect(Lb.cost).toBe(0);
    expect(Lb.issues).toEqual([]);
    expect(Lb.packs[0].startsOnTop).toBe(false);
    expect(Lb.packs[0].groups[0].cells).toEqual(['L0-7']);
    expect(Lb.packs[0].groups[14].cells).toEqual(['L0-0']);
    expect(Lb.packs[1].groups[14].cells).toEqual(['L0-7']);
  });
});

describe('weitere Fälle', () => {
  it('18S3P à 14: 27 Zellen = 14 + 13, Dreiergruppen zusammenhängend', () => {
    const L = solve({ ...DEFAULT_CONFIG, parallel: 3, cellsPerRow: 14 });
    expect(L.issues).toEqual([]);
    expect(L.packs[0].cells).toHaveLength(27);
    expect(L.packs[0].groups[0].cells).toEqual(['L1-13', 'L0-12', 'L1-12']);
    expect(L.bridges[0].kind).toBe('inner');
  });

  it('31S1P = 16 + 15: volle und unvollständige Lage gemischt', () => {
    const L = solve({ ...DEFAULT_CONFIG, series: 31, parallel: 1, cellsPerRow: 8 });
    expect(L.packs.map((p) => p.cells.length)).toEqual([16, 15]);
    expect(L.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(L.bridges[0]).toMatchObject({ kind: 'outer', fromFace: 'V', toFace: 'V' });
  });

  it('Booster 3S1P = 2 + 1', () => {
    const L = solve({
      ...DEFAULT_CONFIG,
      series: 33,
      parallel: 1,
      cellsPerRow: 8,
      booster: { series: 3, cellsPerRow: 2, position: 'plus' },
    });
    expect(L.issues.filter((i) => i.level === 'error')).toEqual([]);
    const boost = L.packs.find((p) => p.role === 'booster')!;
    expect(boost.cells).toHaveLength(3);
    expect(boost.groups.map((g) => g.s)).toEqual([31, 32, 33]);
  });

  // Review Focus 1
  it('Abstandhalter mit ungleichen Spalten: keine Warnung, eingebogener Umriss bleibt eine Kontur', () => {
    const L = solve({
      ...cfg30,
      spacing: { ...DEFAULT_CONFIG.spacing, mode: 'spacer', gapRow: 1.5, gapLayer: 0.5, holderRim: 1.2 },
    });
    expect(L.issues).toEqual([]);
    expect(L.packs[0].width).toBeCloseTo(7 * 22.9 + 21.4, 9); // 181,7
    const straight = packOutline(L, L.packs[0], 'straight').perimeter;
    const tucked = packOutline(L, L.packs[0], 'tucked').perimeter;
    expect(straight).toBeCloseTo(416.2699, 3);
    expect(tucked).toBeCloseTo(531.0369, 3);
  });
});
```

- [ ] **Step 2: Test laufen lassen, er muss scheitern**

Run: `npx vitest run tests/short-layer.test.ts`
Expected: FAIL – `layerPlan` wird von `../src/core` nicht exportiert (TypeError „layerPlan is not a function“).

- [ ] **Step 3: Kern umsetzen**

`src/core/types.ts` – im Interface `BatteryConfig` nach `nickelThickness: number;` einfügen:

```ts
  /** Unvollständige Lage (Wabe, 2 Lagen, ungerade Zellzahl): welche Lage die größere ist. Fehlt der Wert, gilt 'top'. */
  wideLayer?: 'top' | 'bottom';
```

`src/core/geometry.ts` – die Funktion `placeCells` (mit ihrem Kommentar) durch diesen Block ersetzen:

```ts
export type LayerPlan = 'full' | 'short';

/**
 * Wie n Zellen bei perRow Zellen je Lage liegen (Plan 06 §3.1):
 *   'full'  = volle Lagen
 *   'short' = Wabe mit genau 2 Lagen, eine davon eine Zelle kürzer (n = 2·perRow − 1, n ≥ 3)
 *   null    = geht nicht auf
 */
export function layerPlan(cfg: BatteryConfig, n: number, perRow: number): LayerPlan | null {
  if (n % perRow === 0) return 'full';
  if (cfg.stacking === 'honeycomb' && n >= 3 && n === 2 * perRow - 1) return 'short';
  return null;
}

/**
 * Zellmittelpunkte eines Teilpacks im Querschnitt (x,z) plus Außenmaße.
 * count nennt die Zellzahl; weicht sie von perRow·layers ab und ist layerPlan 'short',
 * wird nach Plan 06 §3.2 platziert.
 */
export function placeCells(
  cfg: BatteryConfig,
  perRow: number,
  layers: number,
  count: number = perRow * layers,
): { cells: Cell[]; width: number; height: number } {
  if (count !== perRow * layers && layerPlan(cfg, count, perRow) === 'short') return placeShort(cfg, perRow);
  const D = cfg.cell.diameter;
  const R = D / 2;
  const p = pitches(cfg);
  const honey = cfg.stacking === 'honeycomb' && layers > 1;
  const cells: Cell[] = [];
  for (let l = 0; l < layers; l++) {
    const odd = l % 2 === 1;
    // offsetSide 'L': ungerade Lagen nach links versetzt -> gerade Lagen stehen um off weiter rechts
    let shift = 0;
    if (honey) shift = cfg.offsetSide === 'L' ? (odd ? 0 : p.off) : odd ? p.off : 0;
    for (let i = 0; i < perRow; i++) {
      cells.push({ id: `L${l}-${i}`, layer: l, index: i, x: R + shift + i * p.px, z: R + l * p.pz });
    }
  }
  const width = (perRow - 1) * p.px + (honey ? p.off : 0) + D;
  const height = (layers - 1) * p.pz + D;
  return { cells, width, height };
}

/** Große Lage mit m Zellen, kleine Lage mit m − 1 Zellen in den Mulden (Plan 06 §3.2). */
function placeShort(cfg: BatteryConfig, m: number): { cells: Cell[]; width: number; height: number } {
  const D = cfg.cell.diameter;
  const R = D / 2;
  const p = pitches(cfg);
  const wideTop = (cfg.wideLayer ?? 'top') === 'top';
  const cells: Cell[] = [];
  for (let l = 0; l < 2; l++) {
    const wide = (l === 1) === wideTop;
    const n = wide ? m : m - 1;
    for (let i = 0; i < n; i++) {
      cells.push({ id: `L${l}-${i}`, layer: l, index: i, x: R + (wide ? 0 : p.off) + i * p.px, z: R + l * p.pz });
    }
  }
  return { cells, width: (m - 1) * p.px + D, height: p.pz + D };
}
```

`src/core/validate.ts` – Import ergänzen und zwei Bedingungen ersetzen. Die Meldungstexte bleiben unverändert.

```ts
import { adjacency, cellDistance, layerPlan } from './geometry';
```

Aus

```ts
    if ((s * cfg.parallel) % pr !== 0)
```

wird

```ts
    if (layerPlan(cfg, s * cfg.parallel, pr) === null)
```

und aus

```ts
  if (cfg.booster && (cfg.booster.series * cfg.parallel) % cfg.booster.cellsPerRow !== 0)
```

wird

```ts
  if (cfg.booster && layerPlan(cfg, cfg.booster.series * cfg.parallel, cfg.booster.cellsPerRow) === null)
```

`src/core/wiring.ts` – in `buildSubPack` die Zellzahl durchreichen:

```ts
  const { cells, width, height } = placeCells(cfg, o.perRow, layers, nCells);
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run tests/short-layer.test.ts`
Expected: PASS.

Run: `npm test`
Expected: PASS, alle bisherigen 156 Tests plus die neuen. Insbesondere `tests/fixtures.test.ts` und `tests/reference-equivalence.test.ts` unverändert grün.

- [ ] **Step 5: Prüfen**

Run: `npx prettier --write src/core/geometry.ts src/core/validate.ts src/core/wiring.ts src/core/types.ts tests/short-layer.test.ts`
Run: `npm run lint` → ohne Fehler. Run: `npm run build` → ohne Fehler.
Run: `git status --short reference/` → keine Ausgabe (Referenz und Fixtures unberührt).

---

### Task 2: Ansichten und Fishpaper bei unvollständiger Lage

Spec §6. Die Draufsicht nimmt die Zelllinien aus der größten Lage, der Annahmen-Text nennt die unvollständige Lage und den tatsächlichen Start.

**Files:**
- Create: `src/view/layers.ts`
- Modify: `src/view/topModel.ts:22-24` (Kommentar), `src/view/topModel.ts:80-82` (Zelllinien)
- Modify: `src/view/assumptions.ts` (ganze Funktion `assumptions`)
- Test: `tests/short-layer.test.ts` (ergänzen)

**Interfaces:**
- Consumes: `solve`, `SubPack`, `Cell` aus `src/core`; `BatteryConfig.wideLayer` aus Task 1.
- Produces:
  - `layerCounts(p: SubPack): number[]` – Zellzahl je Lage, Lage 0 zuerst
  - `hasShortLayer(p: SubPack): boolean`
  - `widestLayerCells(p: SubPack): Cell[]` – links → rechts

- [ ] **Step 1: Tests ergänzen**

In `tests/short-layer.test.ts` die Importe erweitern:

```ts
import { planSheets } from '../src/export/sheets';
import { buildParts } from '../src/fishpaper/parts';
import { DEFAULT_FISHPAPER } from '../src/state/config';
import { assumptions } from '../src/view/assumptions';
import { faceModel } from '../src/view/faceModel';
import { hasShortLayer, layerCounts, widestLayerCells } from '../src/view/layers';
import { topModel } from '../src/view/topModel';
```

Und am Ende der Datei anhängen:

```ts
describe('Ansichten und Fishpaper (§6)', () => {
  const L = solve(cfg30);
  const [A] = L.packs;
  const L18 = solve(DEFAULT_CONFIG);

  it('Lagen eines Teilpacks', () => {
    expect(layerCounts(A)).toEqual([7, 8]);
    expect(hasShortLayer(A)).toBe(true);
    expect(widestLayerCells(A).map((c) => c.id)).toEqual(['L1-0', 'L1-1', 'L1-2', 'L1-3', 'L1-4', 'L1-5', 'L1-6', 'L1-7']);
    expect(layerCounts(L18.packs[0])).toEqual([9, 9]);
    expect(hasShortLayer(L18.packs[0])).toBe(false);
    expect(widestLayerCells(L18.packs[0])[0].id).toBe('L0-0'); // volle Lagen: Lage 0 wie bisher
  });

  it('Draufsicht: Zelllinien aus der größeren Lage (linke Kante + 7 Trennlinien)', () => {
    const t = topModel(L).packs[0];
    expect(t.cellLines).toHaveLength(8);
    expect(t.cellLines[0]).toBeCloseTo(t.x, 9);
    expect(t.cellLines[1]).toBeCloseTo(t.x + 21.55, 9);
    expect(t.cellLines[7]).toBeCloseTo(t.x + 151.75, 9);
    expect(t.w).toBeCloseTo(173.3, 9);
  });

  it('Annahmen nennen die unvollständige Lage und den Start oben', () => {
    const t = assumptions(L).join('\n');
    expect(t).toContain('Unvollständige Lage: 8 oben + 7 unten, kürzere Lage in den Mulden. Alle Teilpacks identisch gestapelt.');
    expect(t).not.toContain('ungerade Lagen um ½ Zelle');
    expect(t).toContain('Verbindungen immer schräg (Zickzack), beginnend oben.');
    expect(t).toContain('Pack A läuft von rechts nach links und beginnt oben rechts (Stirnseite vorne).');
    expect(t).toContain('Brücke B15 innen zwischen Pack A und Pack B, links.');
  });

  it('Annahmen 18S2P bleiben wie bisher', () => {
    const t = assumptions(L18).join('\n');
    expect(t).toContain('Wabe: ungerade Lagen um ½ Zelle nach links versetzt. Alle Teilpacks identisch gestapelt.');
    expect(t).toContain('Verbindungen immer schräg (Zickzack), beginnend unten.');
    expect(t).not.toContain('Unvollständige Lage');
  });

  it('gemischt (31S1P): Versatz-Satz bleibt, unvollständige Lage wird je Teilpack genannt', () => {
    const t = assumptions(solve({ ...DEFAULT_CONFIG, series: 31, parallel: 1, cellsPerRow: 8 })).join('\n');
    expect(t).toContain('Wabe: ungerade Lagen um ½ Zelle nach links versetzt.');
    expect(t).toContain('Pack B: Unvollständige Lage: 8 oben + 7 unten, kürzere Lage in den Mulden.');
  });

  it('Stirnseite vorne: 15 Zellen, Hauptminus-Fahne nach oben', () => {
    const v = faceModel(L, A, 'V');
    expect(v.cells).toHaveLength(15);
    expect(v.flags.find((f) => f.role === 'minus')).toMatchObject({ text: 'HAUPT − (B0)', dir: 'up' });
  });

  it('Fishpaper: gleiche Teile wie bei 18S2P, Maße aus der Trapezform', () => {
    const parts = buildParts(L, DEFAULT_FISHPAPER);
    expect(parts.map((p) => p.id)).toEqual(['face-V-P0', 'face-H-P1', 'inter-P0-P1', 'side-P0', 'side-P1', 'wrap-P0', 'wrap-P1']);
    const face = parts.find((p) => p.id === 'face-V-P0')!;
    expect(Math.abs(face.w - 173.6)).toBeLessThan(0.2); // 151,9 + 2 × 10,85
    expect(Math.abs(face.h - 40.49)).toBeLessThan(0.2); // 18,79 + 2 × 10,85
    const wrap = parts.find((p) => p.id === 'wrap-P0')!;
    expect(Math.abs(wrap.w - (393.67 + 10))).toBeLessThanOrEqual(0.1);
    expect(wrap.h).toBeCloseTo(70.4, 6);
  });

  // Review Focus 2
  it('Umwicklung „gemeinsam“ bei 17 + 15 richtet sich nach dem breiteren Teilpack', () => {
    const L32 = solve({ ...DEFAULT_CONFIG, series: 32, parallel: 1, cellsPerRow: 9, seriesSplit: [17, 15], cellsPerRowSplit: [9, 8] });
    expect(L32.bridges[0].kind).toBe('inner');
    const wrap = buildParts(L32, { ...DEFAULT_FISHPAPER, wrapMode: 'combined' }).find((p) => p.id === 'wrap-ALL')!;
    expect(Math.abs(wrap.w - (437.07 + 10))).toBeLessThanOrEqual(0.1);
    expect(wrap.h).toBeCloseTo(70.4 + 70.4 + 0.5, 6);
  });

  it('läuft für viele Größen komplett durch (Ansichten, Fishpaper, Seitenplan)', () => {
    let n = 0;
    for (const m of [2, 3, 5, 8, 10])
      for (const parallel of [1, 3])
        for (const wideLayer of ['top', 'bottom'] as const)
          for (const subPacks of [1, 2]) {
            const cells = 2 * m - 1;
            if (cells % parallel !== 0) continue;
            const Lx = solve({ ...DEFAULT_CONFIG, subPacks, series: (cells / parallel) * subPacks, parallel, cellsPerRow: m, wideLayer });
            expect(Lx.packs.map((p) => p.cells.length)).toEqual(Array.from({ length: subPacks }, () => cells));
            assumptions(Lx);
            topModel(Lx);
            for (const p of Lx.packs) for (const f of ['V', 'H'] as const) faceModel(Lx, p, f);
            for (const outlineFace of ['straight', 'tucked'] as const)
              planSheets(buildParts(Lx, { ...DEFAULT_FISHPAPER, outlineFace, outlineWrap: outlineFace, includeTopBottom: true }), 'a4', 'tile');
            n++;
          }
    expect(n).toBe(32);
  });
});
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run tests/short-layer.test.ts`
Expected: FAIL – Modul `../src/view/layers` nicht gefunden.

- [ ] **Step 3: Umsetzen**

Datei `src/view/layers.ts` anlegen:

```ts
/** Lagen eines Teilpacks für die Ansichten – rein. Bei unvollständiger Lage (Plan 06 §3) sind die Lagen ungleich groß. */
import type { Cell, SubPack } from '../core';

/** Zellzahl je Lage, Lage 0 (unten) zuerst. */
export function layerCounts(p: SubPack): number[] {
  const out = new Array<number>(p.layers).fill(0);
  for (const c of p.cells) out[c.layer]++;
  return out;
}

/** Hat der Teilpack eine unvollständige Lage? */
export function hasShortLayer(p: SubPack): boolean {
  return p.cells.length < p.perRow * p.layers;
}

/** Zellen der größten Lage, links -> rechts. Bei vollen Lagen ist das Lage 0. */
export function widestLayerCells(p: SubPack): Cell[] {
  const counts = layerCounts(p);
  const layer = counts.indexOf(Math.max(...counts));
  return p.cells.filter((c) => c.layer === layer).sort((a, b) => a.x - b.x);
}
```

`src/view/topModel.ts` – Import ergänzen:

```ts
import { widestLayerCells } from './layers';
```

Im Interface `TopPack` den Kommentar ändern:

```ts
  /** Trennlinien der Zellen der größten Lage (x) */
  cellLines: number[];
```

In `toTop` diese drei Zeilen

```ts
    const bottom = p.cells.filter((c) => c.layer === 0).sort((a, b) => a.x - b.x);
    const cellLines = bottom.slice(0, -1).map((c) => x + c.x + layout.pitches.px / 2);
    if (bottom.length) cellLines.unshift(x + bottom[0].x - R);
```

ersetzen durch

```ts
    // größte Lage: bei unvollständiger Lage ist das nicht immer Lage 0 (Plan 06 §6)
    const wide = widestLayerCells(p);
    const cellLines = wide.slice(0, -1).map((c) => x + c.x + layout.pitches.px / 2);
    if (wide.length) cellLines.unshift(x + wide[0].x - R);
```

`src/view/assumptions.ts` – Import ergänzen und den Anfang von `assumptions` bis einschließlich der Zeile mit „Spalten-Serpentine“ ersetzen. Der Rest der Funktion (ab `if (cfg.parallel > 1 …`) bleibt unverändert.

```ts
import { hasShortLayer, layerCounts } from './layers';
```

```ts
function shortDesc(p: SubPack): string {
  const [bottom, top] = layerCounts(p);
  return `${top} oben + ${bottom} unten`;
}

export function assumptions(layout: Layout): string[] {
  const cfg = layout.config;
  const out: string[] = [];
  const main = layout.packs.filter((p) => p.role === 'main');
  const maxLayers = Math.max(...main.map((p) => p.layers));
  const short = main.filter(hasShortLayer);
  const full = main.filter((p) => !hasShortLayer(p));
  out.push(
    'Zellen liegen längs (Pole zeigen nach vorne/hinten). Stirnseiten immer von außen betrachtet, Vorderseite gespiegelt.',
  );
  if (cfg.stacking === 'honeycomb' && full.some((p) => p.layers > 1))
    out.push(`Wabe: ungerade Lagen um ½ Zelle nach ${sideWord(cfg.offsetSide)} versetzt. Alle Teilpacks identisch gestapelt.`);
  else if (cfg.stacking === 'grid') out.push('Raster: Zellen gerade übereinander. Alle Teilpacks identisch gestapelt.');
  if (short.length) {
    const who = full.length ? `${short.map(shortName).join(', ')}: ` : '';
    const descs = [...new Set(short.map(shortDesc))].join(' bzw. ');
    out.push(
      `${who}Unvollständige Lage: ${descs}, kürzere Lage in den Mulden.${full.length ? '' : ' Alle Teilpacks identisch gestapelt.'}`,
    );
  }
  const firstKey = layout.chain.find((k) => k !== 'BOOST');
  const first = main.find((p) => p.key === firstKey);
  if (cfg.stacking === 'honeycomb' && maxLayers <= 2)
    out.push(`Verbindungen immer schräg (Zickzack), beginnend ${first?.startsOnTop ? 'oben' : 'unten'}.`);
  else out.push('Verschaltung als Spalten-Serpentine (Spalte für Spalte).');
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run tests/short-layer.test.ts tests/view.test.ts tests/robustness.test.ts`
Expected: PASS.

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Prüfen**

Run: `npx prettier --write src/view/layers.ts src/view/topModel.ts src/view/assumptions.ts tests/short-layer.test.ts`
Run: `npm run lint` und `npm run build` → ohne Fehler.

---

### Task 3: Ableitungen – Aufteilung aus der Brückenwahl, Zellen je Lage aus den Lagen

Spec §4.2 und §4.3. Reines Modul ohne Abhängigkeit zum Formularzustand.

**Files:**
- Create: `src/state/derive.ts`
- Test: `tests/derive.test.ts` (neu)

**Interfaces:**
- Consumes: Typ `Stacking` aus `src/core`.
- Produces:
  - `type BridgeChoice = 'auto' | 'inner' | 'outer'`, `type BridgePos = 'inner' | 'outer'`
  - `LAYER_LIMITS = { min: 1, max: 6 }`
  - `evenSplit(total: number, n: number): number[]` (aus `config.ts` hierher verschoben)
  - `bridgeState(mainS: number, subPacks: number, choice: BridgeChoice): BridgeState` mit `{ selectable: boolean; natural: BridgePos | null; split: number[]; uneven: boolean }`
  - `bridgePosOfSplit(split: number[]): BridgePos | null`
  - `autoRows(split: number[], parallel: number, layers: number, stacking: Stacking): RowPlan` mit `{ perRow: number[]; error: string | null }`

- [ ] **Step 1: Test schreiben**

Datei `tests/derive.test.ts` anlegen:

```ts
/** Ableitungen aus dem Formularzustand (Plan 06 §4.2, §4.3) – mit konkreten Zahlen. */
import { describe, expect, it } from 'vitest';
import { autoRows, bridgePosOfSplit, bridgeState, evenSplit } from '../src/state/derive';

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

  it('Wabe mit 2 Lagen: jede Gruppenzahl von 4S bis 40S geht auf, für 1P bis 4P', () => {
    for (let s = 4; s <= 40; s++)
      for (let p = 1; p <= 4; p++) expect(autoRows(bridgeState(s, 2, 'auto').split, p, 2, 'honeycomb').error, `${s}S${p}P`).toBeNull();
  });
});
```

- [ ] **Step 2: Test laufen lassen, er muss scheitern**

Run: `npx vitest run tests/derive.test.ts`
Expected: FAIL – Modul `../src/state/derive` nicht gefunden.

- [ ] **Step 3: Umsetzen**

Datei `src/state/derive.ts` anlegen:

```ts
/**
 * Ableitungen aus dem Formularzustand (Plan 06 §4): Aufteilung aus der Brückenwahl,
 * Zellen je Lage aus der Lagenzahl. Rein, ohne React.
 */
import type { Stacking } from '../core';

export type BridgeChoice = 'auto' | 'inner' | 'outer';
export type BridgePos = 'inner' | 'outer';

export const LAYER_LIMITS = { min: 1, max: 6 } as const;

/** Gleichmäßige Aufteilung, Rest an die vorderen Packs (wie Fachkonzept §6). */
export function evenSplit(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const rest = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

export interface BridgeState {
  /** Schalter bedienbar? Nur bei 2 Teilpacks und gerader Gruppenzahl ≥ 4 im Hauptpack. */
  selectable: boolean;
  /** Brückenlage bei gleichmäßiger Aufteilung; null, wenn nicht wählbar */
  natural: BridgePos | null;
  /** wirksame Aufteilung vorne -> hinten */
  split: number[];
  /** true = Aufteilung weicht wegen der Brückenwahl von gleichmäßig ab */
  uneven: boolean;
}

/**
 * Hauptminus und Hauptplus liegen immer außen. Dann gilt: ungerade Gruppenzahl je Teilpack -> Brücke innen,
 * gerade -> außen. Die andere Lage braucht die Aufteilung (h+1) + (h−1), größerer Teilpack vorne.
 */
export function bridgeState(mainS: number, subPacks: number, choice: BridgeChoice): BridgeState {
  if (subPacks !== 2 || mainS % 2 !== 0 || mainS < 4)
    return { selectable: false, natural: null, split: evenSplit(mainS, subPacks), uneven: false };
  const h = mainS / 2;
  const natural: BridgePos = h % 2 === 1 ? 'inner' : 'outer';
  if (choice === 'auto' || choice === natural) return { selectable: true, natural, split: [h, h], uneven: false };
  return { selectable: true, natural, split: [h + 1, h - 1], uneven: true };
}

/** Brückenlage, die aus einer Aufteilung in 2 Teilpacks folgt; null bei anderer Teilpackzahl. */
export function bridgePosOfSplit(split: number[]): BridgePos | null {
  if (split.length !== 2) return null;
  return split[0] % 2 === 1 && split[1] % 2 === 1 ? 'inner' : 'outer';
}

export interface RowPlan {
  /** Zellen je Lage je Teilpack (vorne -> hinten); bei unvollständiger Lage die der größeren Lage */
  perRow: number[];
  /** Meldung, wenn eine Zellzahl nicht auf die Lagen passt */
  error: string | null;
}

/** Zellen je Lage aus der Lagenzahl. Gültig sind volle Lagen oder die unvollständige Lage nach Plan 06 §3.1. */
export function autoRows(split: number[], parallel: number, layers: number, stacking: Stacking): RowPlan {
  const perRow = split.map((s) => Math.ceil((s * parallel) / layers));
  let error: string | null = null;
  split.forEach((s, i) => {
    const n = s * parallel;
    const m = perRow[i];
    const ok = n === m * layers || (stacking === 'honeycomb' && layers === 2 && n >= 3 && n === 2 * m - 1);
    if (!ok && error === null) error = `Teilpack ${i + 1}: ${n} Zellen lassen sich nicht auf ${layers} Lagen aufteilen.`;
  });
  return { perRow, error };
}
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run tests/derive.test.ts`
Expected: PASS.

- [ ] **Step 5: Prüfen**

Run: `npx prettier --write src/state/derive.ts tests/derive.test.ts`
Run: `npm run lint` und `npm run build` → ohne Fehler. (`evenSplit` gibt es jetzt doppelt; das räumt Task 4 auf.)

---

### Task 4: Zustand – Lagen, Brückenwahl, Presets

Spec §4.1, §4.4, §4.5, §4.6. `ConfigState` bekommt vier Felder; Aufteilung und Zellen je Lage werden abgeleitet.

**Files:**
- Modify: `src/state/config.ts`
- Modify: `tests/state.test.ts`

**Interfaces:**
- Consumes: `layerPlan` (Task 1); `BridgeChoice`, `BridgePos`, `RowPlan`, `LAYER_LIMITS`, `autoRows`, `bridgeState` (Task 3).
- Produces:
  - `ConfigState.bridge: BridgeChoice`, `.layers: number`, `.cellsPerRowManual: boolean`, `.wideLayer: 'top' | 'bottom'`
  - `PresetId = '18S2P' | '20S2P' | '20S2P-split' | '30S1P' | '32S1P'`
  - `effectiveSplit(s: ConfigState): number[]`
  - `rowInfo(s: ConfigState): RowPlan`
  - `isRowPlanIssue(msg: string): boolean`
  - `Action` zusätzlich `{ type: 'bridge'; pos: BridgePos }`
  - `evenSplit` wird aus `config.ts` entfernt (lebt in `derive.ts`)

- [ ] **Step 1: Tests anpassen und ergänzen**

In `tests/state.test.ts`:

(a) Die beiden bestehenden Importe aus `../src/state/config` ersetzen durch:

```ts
import type { ConfigState, PresetId } from '../src/state/config';
import {
  boosterInfo,
  DEFAULT_STATE,
  isRowPlanIssue,
  matchingPreset,
  mergeWithDefaults,
  reducer,
  rowInfo,
  toBatteryConfig,
} from '../src/state/config';
```

(b) Im Test „Presets setzen die Fixture-Konfigurationen“ vor der schließenden Klammer anhängen:

```ts
    const s30 = reducer(DEFAULT_STATE, { type: 'preset', id: '30S1P' });
    expect(toBatteryConfig(s30)).toEqual({ ...APP_DEFAULT, series: 30, parallel: 1, cellsPerRow: 8 });
    expect(matchingPreset(s30)).toBe('30S1P');
    expect(s30.seriesSplit).toEqual([15, 15]);
```

(c) Im Test „Teilpack-Anzahl passt die Aufteilung an“ wird „Zellen je Lage“ nicht mehr gesetzt, sondern abgeleitet. Die erste Zeile ändern zu:

```ts
    const s = reducer(DEFAULT_STATE, { type: 'set', patch: { subPacks: 3, series: 21 } });
```

(d) Im Test „geht nicht auf -> Fehlermeldung am Booster“ den Patch ändern (3 Lagen statt „3 Zellen je Lage“; Ergebnis bleibt 9 Zellen à 3 = 3 Lagen):

```ts
      patch: { series: 20, parallel: 1, layers: 3, booster: { series: 2, position: 'plus' } },
```

(e) Im `describe('URL-Hash und JSON')` die Liste `variants` um zwei Einträge erweitern:

```ts
    reducer(DEFAULT_STATE, { type: 'preset', id: '30S1P' }),
    reducer(reducer(DEFAULT_STATE, { type: 'preset', id: '20S2P' }), { type: 'bridge', pos: 'inner' }),
```

(f) Im Test „ungültige Enum-Werte fallen auf Standard zurück“ anhängen:

```ts
    const t = mergeWithDefaults({ bridge: 'quatsch', wideLayer: 'seitlich', layers: 99 });
    expect(t).toMatchObject({ bridge: 'auto', wideLayer: 'top', layers: 2 });
```

(g) Nach dem `describe('Reducer')` einen neuen Block einfügen:

```ts
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
    const s = set(DEFAULT_STATE, { series: 33, parallel: 1, boosterEnabled: true, booster: { series: 3, position: 'plus' } });
    expect(boosterInfo(s)).toEqual({ layers: 2, packKey: 'P1', packLabel: 'Pack B (hinten)', cellsPerRow: 2, error: null });
    const L = solve(toBatteryConfig(s));
    expect(L.issues.filter((i) => i.level === 'error')).toEqual([]);
    expect(L.packs.find((p) => p.role === 'booster')!.cells).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run tests/state.test.ts`
Expected: FAIL – u. a. `isRowPlanIssue`/`rowInfo` nicht exportiert, Preset `30S1P` unbekannt.

- [ ] **Step 3: `src/state/config.ts` umsetzen**

(a) Importe: `layerPlan` aus dem Kern dazunehmen, Ableitungen importieren.

```ts
import {
  DEFAULT_CELL_ID,
  DEFAULT_CONFIG,
  cellSpecFromDatasheet,
  datasheetById,
  layerPlan,
  perRowOf,
  seriesSplit,
  subPackLabel,
} from '../core';
import type { FishpaperOptions } from '../fishpaper/types';
import type { BridgeChoice, BridgePos, RowPlan } from './derive';
import { LAYER_LIMITS, autoRows, bridgeState } from './derive';
```

(b) In `ConfigState` die Zeilen von `subPacks` bis `cellsPerRowSplit` ersetzen durch:

```ts
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
```

(c) In `DEFAULT_STATE` die Zeilen von `subPacks` bis `cellsPerRowSplit` ersetzen durch:

```ts
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
```

(d) `PresetId` und `PRESETS` ersetzen:

```ts
export type PresetId = '18S2P' | '20S2P' | '20S2P-split' | '30S1P' | '32S1P';

/** Presets bestehen nur aus S, P und ggf. Booster; alles andere wird abgeleitet (Plan 06 §4.5). */
export const PRESETS: { id: PresetId; label: string; patch: Partial<ConfigState> }[] = [
  { id: '18S2P', label: '18S2P', patch: {} },
  { id: '20S2P', label: '20S2P', patch: { series: 20 } },
  {
    id: '20S2P-split',
    label: '20S2P Splitpack (18S2P + 2S2P)',
    patch: { series: 20, boosterEnabled: true, booster: { series: 2, position: 'plus' } },
  },
  { id: '30S1P', label: '30S1P', patch: { series: 30, parallel: 1 } },
  { id: '32S1P', label: '32S1P', patch: { series: 32, parallel: 1 } },
];
```

(e) Die Funktion `evenSplit` samt Kommentar aus `config.ts` **löschen** (sie lebt in `derive.ts`). Direkt nach `mainSeries` einfügen:

```ts
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
```

(f) `boosterRows` ersetzen (Kommentar darüber bleibt):

```ts
export function boosterRows(cfg: BatteryConfig, booster: BoosterInput): BoosterRows {
  const n = cfg.subPacks;
  const chain = cfg.mainMinus.end === 'V' ? [...Array(n).keys()] : [...Array(n).keys()].reverse();
  const pos = booster.position === 'plus' ? chain[n - 1] : chain[0];
  const packCells = seriesSplit(cfg)[pos] * cfg.parallel;
  const perRow = perRowOf(cfg, pos);
  const packKey = `P${pos}`;
  const packLabel = subPackLabel(n, pos);
  // Teilpack selbst geht nicht auf -> dessen Fehlermeldung reicht
  if (layerPlan(cfg, packCells, perRow) === null)
    return { layers: packCells / perRow, packKey, packLabel, cellsPerRow: null, error: null };
  const layers = Math.ceil(packCells / perRow);
  const cells = booster.series * cfg.parallel;
  const cellsPerRow = Math.ceil(cells / layers);
  // gültig: volle Lagen oder unvollständige Lage (Plan 06 §3.1), jeweils mit genau dieser Lagenzahl
  if (layerPlan(cfg, cells, cellsPerRow) === null || Math.ceil(cells / cellsPerRow) !== layers)
    return {
      layers,
      packKey,
      packLabel,
      cellsPerRow: null,
      error: `Booster: ${cells} Zellen (${booster.series}S${cfg.parallel}P) lassen sich nicht auf ${layers} Lagen aufteilen (gleiche Lagenzahl wie der Teilpack, an dem der Booster hängt).`,
    };
  return { layers, packKey, packLabel, cellsPerRow, error: null };
}
```

(g) In `toBatteryConfig` diese zwei Zeilen

```ts
  if (s.seriesSplitManual) cfg.seriesSplit = s.seriesSplit.slice(0, s.subPacks);
  if (s.cellsPerRowSplitManual) cfg.cellsPerRowSplit = s.cellsPerRowSplit.slice(0, s.subPacks);
```

ersetzen durch

```ts
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
```

(h) `Action` um eine Zeile erweitern (nach der `'set'`-Zeile):

```ts
  | { type: 'bridge'; pos: BridgePos }
```

(i) `normalize` ersetzen:

```ts
/** Hält abhängige Felder konsistent: Aufteilung (Plan 06 §4.2) und Zellen je Lage (§4.3). */
function normalize(s: ConfigState): ConfigState {
  const n = s.subPacks;
  let { seriesSplit, cellsPerRow, cellsPerRowSplit } = s;
  if (!s.seriesSplitManual || seriesSplit.length !== n) seriesSplit = bridgeState(mainSeries(s), n, s.bridge).split;
  const auto = autoRows(seriesSplit, s.parallel, s.layers, s.stacking).perRow;
  if (!s.cellsPerRowManual && !s.cellsPerRowSplitManual && auto[0] >= 1) cellsPerRow = auto[0];
  if (!s.cellsPerRowSplitManual || cellsPerRowSplit.length !== n)
    cellsPerRowSplit = s.cellsPerRowManual ? Array.from({ length: n }, () => cellsPerRow) : auto;
  return { ...s, seriesSplit, cellsPerRow, cellsPerRowSplit };
}
```

(j) Im `reducer` nach dem `case 'set'` einfügen:

```ts
    case 'bridge': {
      // Klick auf die natürliche Lage = automatisch, auf die andere = ausdrücklich (Plan 06 §4.2)
      const natural = bridgeState(mainSeries(state), state.subPacks, 'auto').natural;
      return normalize({ ...state, bridge: action.pos === natural ? 'auto' : action.pos });
    }
```

(k) In `mergeWithDefaults` im Objekt `s` nach der Zeile `...loadCell(top.cellType, obj(r.cell, d.cell)),` einfügen:

```ts
    bridge: oneOf(top.bridge, ['auto', 'inner', 'outer'], d.bridge),
    wideLayer: oneOf(top.wideLayer, ['top', 'bottom'], d.wideLayer),
    layers:
      Number.isInteger(top.layers) && top.layers >= LAYER_LIMITS.min && top.layers <= LAYER_LIMITS.max ? top.layers : d.layers,
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run tests/state.test.ts`
Expected: PASS.

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Prüfen**

Run: `npx prettier --write src/state/config.ts tests/state.test.ts`
Run: `npm run lint` und `npm run build` → ohne Fehler.
Hinweis: Das Panel hat noch das alte Feld „Zellen je Lage“; es wirkt im automatischen Fall nicht mehr. Das behebt Task 6.

---

### Task 5: Alte Links und Dateien übernehmen

Spec §4.7. Neue Stände tragen Formatversion 2; alte werden so übernommen, dass derselbe Akku erscheint.

**Files:**
- Modify: `src/state/config.ts` (neu `migrateV1`)
- Modify: `src/state/url.ts`
- Modify: `src/state/storage.ts`
- Modify: `tests/state.test.ts`

**Interfaces:**
- Consumes: `mergeWithDefaults`, `normalize`, `autoRows`, `LAYER_LIMITS` (Task 3, 4).
- Produces:
  - `migrateV1(raw: unknown): ConfigState`
  - Hash-Präfix `c2=` (alt: `c=`), JSON `version: 2` (alt: 1), localStorage-Schlüssel `akku-konfigurator:v2` (alt: `…:v1`)

- [ ] **Step 1: Tests ergänzen**

In `tests/state.test.ts` den Vitest-Import um `vi` erweitern und `loadLocal`, `saveLocal` importieren:

```ts
import { describe, expect, it, vi } from 'vitest';
```

```ts
import { fromJsonFile, loadLocal, saveLocal, toJsonFile } from '../src/state/storage';
```

Am Ende der Datei anhängen:

```ts
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
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run tests/state.test.ts`
Expected: FAIL – `encodeState` liefert `c=…`, `version` ist 1, alte Stände werden nicht übernommen.

- [ ] **Step 3: Umsetzen**

`src/state/config.ts` – am Dateiende anhängen:

```ts
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
```

`src/state/url.ts` – Kopfkommentar, Präfixe und `decodeState` ersetzen:

```ts
/**
 * Zustand im URL-Hash: nur die vom Standard abweichenden Felder, als base64url-JSON.
 * Beispiel: #c2=eyJzZXJpZXMiOjMyfQ   (Formatversion 2; alte Links mit #c= werden übernommen, Plan 06 §4.7)
 */
import type { ConfigState } from './config';
import { DEFAULT_STATE, mergeWithDefaults, migrateV1 } from './config';

const PREFIX = 'c2=';
const PREFIX_V1 = 'c=';
```

```ts
/** Liest einen Hash (mit oder ohne '#'). Liefert null bei fehlendem oder kaputtem Inhalt. */
export function decodeState(hash: string): ConfigState | null {
  const h = hash.replace(/^#/, '');
  try {
    if (h.startsWith(PREFIX)) return mergeWithDefaults(JSON.parse(fromBase64Url(h.slice(PREFIX.length))));
    if (h.startsWith(PREFIX_V1)) return migrateV1(JSON.parse(fromBase64Url(h.slice(PREFIX_V1.length))));
  } catch {
    return null;
  }
  return null;
}
```

`src/state/storage.ts` – Schlüssel, `loadLocal`, `toJsonFile` und das Ende von `fromJsonFile` ersetzen:

```ts
import type { ConfigState } from './config';
import { mergeWithDefaults, migrateV1 } from './config';

const KEY = 'akku-konfigurator:v2';
/** Formatversion 1 (vor Plan 06): wird beim Laden übernommen, nicht mehr geschrieben */
const KEY_V1 = 'akku-konfigurator:v1';
```

```ts
export function loadLocal(): ConfigState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return mergeWithDefaults(JSON.parse(raw));
    const old = localStorage.getItem(KEY_V1);
    return old ? migrateV1(JSON.parse(old)) : null;
  } catch {
    return null;
  }
}
```

```ts
export function toJsonFile(s: ConfigState): string {
  return JSON.stringify({ format: JSON_FORMAT, version: 2, config: s }, null, 2);
}
```

In `fromJsonFile` die Typangabe und die letzte Zeile ändern:

```ts
  const d = data as { format?: unknown; version?: unknown; config?: unknown };
```

```ts
  return d.version === 1 ? migrateV1(d.config) : mergeWithDefaults(d.config);
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run tests/state.test.ts`
Expected: PASS.

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Prüfen**

Run: `npx prettier --write src/state/config.ts src/state/url.ts src/state/storage.ts tests/state.test.ts`
Run: `npm run lint` und `npm run build` → ohne Fehler.

---

### Task 6: Bestehendes Panel bedienbar machen – Lagen, Brückenschalter, größere Lage

Spec §5.2 und §10 Schritt 2. Das Panel behält seine heutige Form; nur der Abschnitt „Pack“ wird ergänzt. Der Umbau zur Liste folgt in Task 9.

**Files:**
- Create: `src/view/configSummary.ts`
- Modify: `src/ui/form/Fields.tsx` (`Choice`)
- Modify: `src/ui/config/ConfigPanel.tsx` (Importe, Abschnitt „Pack“)
- Modify: `src/ui/App.tsx:46-51` (Fehlerlisten)
- Modify: `src/ui/styles.css` (nach dem Block `.seg__opt input:focus-visible + span`)
- Modify: `tests/e2e/screenshots.spec.ts`
- Test: `tests/config-summary.test.ts` (neu)

**Interfaces:**
- Consumes: `layerPlan` (Task 1); `bridgePosOfSplit`, `bridgeState`, `LAYER_LIMITS`, `BridgePos` (Task 3); `effectiveSplit`, `mainSeries`, `rowInfo`, `isRowPlanIssue`, `toBatteryConfig`, Action `bridge` (Task 4).
- Produces:
  - `bridgeSwitch(s: ConfigState): BridgeSwitch` mit `{ value: BridgePos | null; disabled: boolean; hint: string }`
  - `layerRowsText(s: ConfigState): string | null` – z. B. `'9 je Lage'`, `'8 + 7'`; `null` = geht nicht auf
  - `layerCountText(s: ConfigState): string | null` – z. B. `'2'`, `'2/4'`
  - `hasShortLayerRows(s: ConfigState): boolean`
  - `Choice`: `value: T | null`, neues `disabled?: boolean`

- [ ] **Step 1: Test schreiben**

Datei `tests/config-summary.test.ts` anlegen:

```ts
/** Anzeigetexte des Konfigurations-Panels (Plan 06 §5) – rein, mit konkreten Texten. */
import { describe, expect, it } from 'vitest';
import { solve } from '../src/core';
import type { ConfigState, PresetId } from '../src/state/config';
import { DEFAULT_STATE, reducer, toBatteryConfig } from '../src/state/config';
import { bridgeSwitch, hasShortLayerRows, layerCountText, layerRowsText } from '../src/view/configSummary';

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
    expect(
      bridgeSwitch(set(DEFAULT_STATE, { series: 30, parallel: 1, seriesSplitManual: true, seriesSplit: [14, 16] })),
    ).toEqual({ value: 'outer', disabled: true, hint: 'folgt aus der manuellen Aufteilung 14 + 16' });
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
    expect(bridgeSwitch(set(DEFAULT_STATE, { series: 2, parallel: 1 })).hint).toBe('2S: zu wenige Gruppen für eine andere Aufteilung');
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
```

- [ ] **Step 2: Test laufen lassen, er muss scheitern**

Run: `npx vitest run tests/config-summary.test.ts`
Expected: FAIL – Modul `../src/view/configSummary` nicht gefunden.

- [ ] **Step 3: `src/view/configSummary.ts` anlegen**

```ts
/**
 * Anzeigetexte des Konfigurations-Panels (Plan 06 §5) – rein, ohne React.
 */
import { layerPlan } from '../core';
import type { ConfigState } from '../state/config';
import { effectiveSplit, mainSeries, rowInfo, toBatteryConfig } from '../state/config';
import type { BridgePos } from '../state/derive';
import { bridgePosOfSplit, bridgeState } from '../state/derive';

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

/** Lagenbild je Teilpack; null, wenn eine Zellzahl nicht aufgeht. */
function layerParts(s: ConfigState): LayerPart[] | null {
  const info = rowInfo(s);
  if (info.error) return null;
  const cfg = toBatteryConfig(s);
  const split = effectiveSplit(s);
  const out: LayerPart[] = [];
  for (let i = 0; i < split.length; i++) {
    const n = split[i] * s.parallel;
    const m = info.perRow[i];
    const plan = layerPlan(cfg, n, m);
    if (plan === null) return null;
    out.push({ layers: Math.ceil(n / m), text: plan === 'short' ? `${m} + ${m - 1}` : `${m}`, short: plan === 'short' });
  }
  return out.length ? out : null;
}

/** Zellen je Lage als Text, z. B. „9 je Lage“, „8 + 7“ oder „9 + 8 / 8 + 7“; null, wenn es nicht aufgeht. */
export function layerRowsText(s: ConfigState): string | null {
  const parts = layerParts(s);
  if (!parts) return null;
  const texts = [...new Set(parts.map((p) => p.text))].join(' / ');
  return parts.some((p) => p.short) ? texts : `${texts} je Lage`;
}

/** Lagenzahl(en) der Teilpacks, z. B. „2“ oder „2/4“; null, wenn es nicht aufgeht. */
export function layerCountText(s: ConfigState): string | null {
  const parts = layerParts(s);
  return parts ? [...new Set(parts.map((p) => p.layers))].join('/') : null;
}

/** Hat mindestens ein Teilpack eine unvollständige Lage? Dann ist „Größere Lage“ einstellbar. */
export function hasShortLayerRows(s: ConfigState): boolean {
  return layerParts(s)?.some((p) => p.short) ?? false;
}
```

Run: `npx vitest run tests/config-summary.test.ts`
Expected: PASS.

- [ ] **Step 4: `Choice` deaktivierbar machen**

`src/ui/form/Fields.tsx` – `ChoiceProps` und die `fieldset`-Zeile in `Choice` ändern:

```tsx
export interface ChoiceProps<T extends string> {
  label: string;
  /** null = keine Option markiert */
  value: T | null;
  options: { value: T; label: string; title?: string }[];
  onChange: (v: T) => void;
  hint?: ReactNode;
  disabled?: boolean;
}
```

```tsx
    <fieldset className="field choice" disabled={p.disabled}>
```

`src/ui/styles.css` – nach dem Block `.seg__opt input:focus-visible + span { … }` einfügen:

```css
.choice:disabled .seg {
  opacity: 0.55;
}
.choice:disabled .seg__opt,
.choice:disabled .seg__opt input {
  cursor: not-allowed;
}
```

- [ ] **Step 5: Abschnitt „Pack“ im bestehenden Panel ergänzen**

`src/ui/config/ConfigPanel.tsx` – Importe anpassen:

```tsx
import { PRESETS, boosterInfo, customCell, mainSeries, matchingPreset, rowInfo } from '../../state/config';
import { LAYER_LIMITS } from '../../state/derive';
import { bridgeSwitch, hasShortLayerRows, layerCountText, layerRowsText } from '../../view/configSummary';
```

Im Funktionskörper die Zeile `const layersOf = …` **löschen** und nach `const mS = mainSeries(s);` einfügen:

```tsx
  const bridge = bridgeSwitch(s);
  const rows = rowInfo(s);
  const rowsText = layerRowsText(s);
  const layerCount = layerCountText(s);
```

Im Abschnitt „Pack“ direkt **vor** `<NumberField id="subPacks"` einfügen:

```tsx
        <Choice
          label="Brücke"
          value={bridge.value}
          disabled={bridge.disabled}
          options={[
            { value: 'inner', label: 'innen' },
            { value: 'outer', label: 'außen' },
          ]}
          onChange={(pos) => dispatch({ type: 'bridge', pos })}
          hint={bridge.hint}
        />
```

Das ganze `<NumberField id="cellsPerRow" … />` (mit dem `hint`, der `layersOf` benutzt) ersetzen durch:

```tsx
        {!s.cellsPerRowManual && !s.cellsPerRowSplitManual && (
          <NumberField
            id="layers"
            label="Lagen"
            integer
            min={LAYER_LIMITS.min}
            max={LAYER_LIMITS.max}
            value={s.layers}
            onError={onError}
            onChange={(v) => set({ layers: v! })}
            hint={rowsText ? `→ ${rowsText}` : undefined}
          />
        )}
        {rows.error && (
          <p className="field__msg field__msg--error" role="alert" data-testid="layers-error">
            {rows.error}
          </p>
        )}
        {hasShortLayerRows(s) && (
          <Choice
            label="Größere Lage"
            value={s.wideLayer}
            options={[
              { value: 'top', label: 'oben' },
              { value: 'bottom', label: 'unten' },
            ]}
            onChange={(v) => set({ wideLayer: v })}
            hint="bei ungerader Zellzahl je Teilpack; die kürzere Lage sitzt in den Mulden"
          />
        )}
        <Check label="Zellen je Lage manuell" checked={s.cellsPerRowManual} onChange={(v) => set({ cellsPerRowManual: v })} />
        {s.cellsPerRowManual && !s.cellsPerRowSplitManual && (
          <NumberField
            id="cellsPerRow"
            label="Zellen je Lage"
            integer
            min={LIMITS.cellsPerRow.min}
            max={LIMITS.cellsPerRow.max}
            value={s.cellsPerRow}
            onError={onError}
            onChange={(v) => set({ cellsPerRow: v! })}
            hint={layerCount ? `→ ${layerCount} ${layerCount === '1' ? 'Lage' : 'Lagen'} je Teilpack` : 'geht nicht auf'}
          />
        )}
```

Die bestehende Checkbox „Zellen je Lage je Teilpack“ und ihre Felder darunter bleiben unverändert.

- [ ] **Step 6: Lagen-Fehler in der App anzeigen**

`src/ui/App.tsx` – Import erweitern:

```tsx
import { boosterInfo, datasheetOf, isBoosterRowIssue, isRowPlanIssue, rowInfo, toBatteryConfig } from '../state/config';
```

Diese Zeilen

```tsx
  // Booster (§3): eigene Meldung statt der Kern-Folgefehler zu „Zellen je Lage“
  const boosterError = boosterInfo(state)?.error ?? null;
  if (boosterError) fieldIssues.push({ level: 'error', msg: boosterError });
  const layoutErrors = layout.issues.filter((i) => i.level === 'error' && !(boosterError && isBoosterRowIssue(i.msg)));
```

ersetzen durch

```tsx
  // Lagen (Plan 06 §4.3) und Booster (Plan 04 §3): eigene Meldung statt der Kern-Folgefehler zu „Zellen je Lage“
  const rowError = rowInfo(state).error;
  if (rowError) fieldIssues.push({ level: 'error', msg: rowError });
  const boosterError = boosterInfo(state)?.error ?? null;
  if (boosterError) fieldIssues.push({ level: 'error', msg: boosterError });
  const isFollowUp = (msg: string) =>
    (rowError !== null && (isRowPlanIssue(msg) || isBoosterRowIssue(msg))) || (boosterError !== null && isBoosterRowIssue(msg));
  const layoutErrors = layout.issues.filter((i) => i.level === 'error' && !isFollowUp(i.msg));
```

- [ ] **Step 7: e2e anpassen**

`tests/e2e/screenshots.spec.ts`:

Im Kopfkommentar „vier Presets“ durch „fünf Presets“ ersetzen. Die Liste `PRESETS` um einen Eintrag erweitern:

```ts
  { button: '30S1P', file: '30S1P' },
```

Im Test „Ungültige Eingabe wird am Feld markiert, Ansicht ausgegraut“ vor dem `fill('7')` eine Zeile einfügen:

```ts
  await page.getByLabel('Zellen je Lage manuell').check();
```

Im Test „URL-Hash ist teilbar“ `/#c=/` durch `/#c2=/` ersetzen.

Neuen Test anhängen:

```ts
test('30S1P: Brücke innen; „außen“ teilt 16 + 14, „innen“ stellt 15 + 15 wieder her', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: '30S1P', exact: true }).click();
  await expect(page.getByTestId('summary')).toContainText('30S1P');
  await expect(page.getByRole('radio', { name: 'innen' })).toBeChecked();
  await expect(page.getByText('gleichmäßig 15 + 15')).toBeVisible();
  await expect(page.locator('.stale-banner')).toHaveCount(0);
  await page.getByRole('radio', { name: 'außen' }).check();
  await expect(page.getByText('ungleich 16 + 14 – Teilpacks unterschiedlich breit')).toBeVisible();
  await expect(page.getByRole('button', { name: '30S1P', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('radio', { name: 'innen' }).check();
  await expect(page.getByRole('button', { name: '30S1P', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
```

- [ ] **Step 8: Alles laufen lassen**

Run: `npx prettier --write src/view/configSummary.ts src/ui/form/Fields.tsx src/ui/config/ConfigPanel.tsx src/ui/App.tsx src/ui/styles.css tests/config-summary.test.ts tests/e2e/screenshots.spec.ts`
Run: `npm test` → PASS. Run: `npm run lint` und `npm run build` → ohne Fehler.
Run: `npm run e2e`
Expected: alle Playwright-Tests PASS; `docs/screenshots/30S1P.png` ist neu. Fehlt der Browser: einmalig `npx playwright install chromium`.

- [ ] **Step 9: Screenshots ansehen**

`docs/screenshots/30S1P.png` öffnen und gegen Spec §1 Punkt 4 prüfen:
- beide Teilpacks 8 Zellen oben, 7 unten;
- Hauptminus an Pack A, vordere Stirnseite, oben rechts (im gespiegelten Bild links, R-Marker links), Fahne nach oben;
- Hauptplus an Pack B, hintere Stirnseite, oben rechts;
- Draufsicht: „BRÜCKE B15 (innen, links)“ zwischen den Teilpacks, kein Hinweis rechts oben;
- nichts überlappt, keine abgeschnittenen Beschriftungen.

Zusätzlich `docs/screenshots/18S2P.png`, `32S1P.png`, `20S2P.png`, `20S2P_Splitpack.png` ansehen: Die Ansichten rechts müssen aussehen wie vorher; links ist nur der Abschnitt „Pack“ verändert.

---

### Task 7: STOPP – 30S1P vom Nutzer bestätigen lassen, dann Fixture und Fachkonzept

Spec §7. **Diese Aufgabe beginnt mit einer Rückfrage. Ohne ausdrückliches OK des Nutzers werden weder die Fixture noch das Fachkonzept geschrieben.**

**Files:**
- Create: `reference/fixtures/30S1P_21700.json` (erzeugt, nicht von Hand geschrieben)
- Create und wieder löschen: `tests/_fixture-30s1p.test.ts`
- Modify: `docs/01_FACHKONZEPT.md` (§3, §5, §9)

**Interfaces:**
- Consumes: `solve`, `stats`, `balanceTaps`, `packOutline` aus `src/core` mit der unvollständigen Lage (Task 1).
- Produces: die zwölfte Fixture; `tests/fixtures.test.ts` prüft sie automatisch mit.

- [ ] **Step 1: Nutzer fragen und warten**

Dem Nutzer `docs/screenshots/30S1P.png` zeigen und diese Punkte nennen: beide Teilpacks 8 oben + 7 unten, Hauptminus oben rechts vorne, Hauptplus oben rechts hinten, Brücke B15 innen links gerade durch, Packbreite 174,5 mm mit der P50B. Fragen: „Entspricht das deinem 30S1P? Dann lege ich es als bestätigte Fixture ab.“

Antwortet der Nutzer mit Änderungswünschen: **nicht weitermachen**, sondern Spec und Plan mit ihm anpassen.

- [ ] **Step 2: Fixture erzeugen (erst nach dem OK)**

Datei `tests/_fixture-30s1p.test.ts` anlegen. Sie hat dieselbe Struktur wie `reference/demo.ts`, rechnet aber mit `src/core`, weil die Referenz keine unvollständigen Lagen kennt.

```ts
/** Einmalig: schreibt reference/fixtures/30S1P_21700.json aus src/core (Plan 06 §7). Nach dem Lauf löschen. */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import type { BatteryConfig } from '../src/core';
import { DEFAULT_CONFIG, balanceTaps, packOutline, solve, stats } from '../src/core';

it('schreibt die Fixture 30S1P_21700', () => {
  const name = '30S1P_21700';
  const cfg: BatteryConfig = { ...DEFAULT_CONFIG, series: 30, parallel: 1, cellsPerRow: 8 };
  const L = solve(cfg);
  expect(L.packs).toHaveLength(2);
  expect(L.issues).toEqual([]);
  const fx = {
    name,
    config: cfg,
    stats: stats(L),
    chain: L.chain,
    cost: L.cost,
    issues: L.issues,
    bridges: L.bridges,
    packs: L.packs.map((p) => ({
      key: p.key,
      label: p.label,
      dir: p.dir,
      startFace: p.startFace,
      endFace: p.endFace,
      startSide: p.startSide,
      endSide: p.endSide,
      layers: p.layers,
      perRow: p.perRow,
      width: +p.width.toFixed(2),
      height: +p.height.toFixed(2),
      length: +p.length.toFixed(2),
      groups: p.groups.map((g) => ({ s: g.s, minusFace: g.minusFace, cells: g.cells })),
      strips: p.strips.map((s) => ({ node: s.node, face: s.face, kind: s.kind, cells: s.cells })),
      outline: {
        straightPerimeter: +packOutline(L, p, 'straight').perimeter.toFixed(1),
        tuckedPerimeter: +packOutline(L, p, 'tucked').perimeter.toFixed(1),
      },
    })),
    taps: balanceTaps(L).map((t) => ({ node: t.node, label: t.label, spots: t.spots.map((s) => `${s.pack}/${s.face}/${s.kind}`) })),
  };
  writeFileSync(join(import.meta.dirname, '..', 'reference', 'fixtures', `${name}.json`), JSON.stringify(fx, null, 1));
});
```

Run: `npx vitest run tests/_fixture-30s1p.test.ts`
Expected: PASS, `reference/fixtures/30S1P_21700.json` existiert.

Danach `tests/_fixture-30s1p.test.ts` **löschen**.

- [ ] **Step 3: Fixture prüfen**

In `reference/fixtures/30S1P_21700.json` nachsehen: `"cost": 2`, `"issues": []`, `bridges[0].kind` = `"inner"` mit `"node": 15`, erste Gruppe von P0 `{"s": 1, "minusFace": "V", "cells": ["L1-7"]}`, Umfänge `393.7` und `550.8`, Breite `173.3`.

Run: `npm test`
Expected: PASS; `tests/fixtures.test.ts` läuft jetzt über 12 Fixtures.

Run: `git status --short reference/`
Expected: genau eine Zeile `?? reference/fixtures/30S1P_21700.json`.

- [ ] **Step 4: Fachkonzept nachziehen**

`docs/01_FACHKONZEPT.md`, §3 – die Zeile

```
- Zellzahl je Teilpack ÷ Zellen je Lage muss aufgehen. Sonst wird ein Fehler angezeigt (keine halben Lagen in v1).
```

ersetzen durch

```
- Zellzahl je Teilpack ÷ Zellen je Lage muss aufgehen. Sonst wird ein Fehler angezeigt.
- **Ausnahme – unvollständige Lage:** Bei Wabe mit genau 2 Lagen darf eine Lage eine Zelle kürzer sein
  (n = 2·m − 1, n ≥ 3, z. B. 15 = 8 + 7). Die kürzere Lage sitzt in den Mulden der größeren:
  große Lage x = R + i·px, kleine Lage x = R + px/2 + i·px, Breite = (m−1)·px + D. Der Wabenversatz hat dann
  keine Wirkung. Welche Lage die größere ist, ist wählbar (Standard: oben) und für alle Teilpacks gleich.
  Anfang und Ende des Teilpacks liegen beide auf der größeren Lage. [BESTÄTIGT]
```

§5 – nach dem Absatz „Wichtige Konsequenz (Physik, kein Bug)“ mit seinen drei Punkten einfügen:

```
**Brückenlage wählen** (2 Teilpacks, gerade Gruppenzahl im Hauptpack):
- Hauptminus und Hauptplus liegen immer außen. [BESTÄTIGT]
- Die Brückenlage folgt deshalb allein aus der Aufteilung: beide Teilpacks ungerade → innen, sonst außen.
- Standard ist die gleichmäßige Aufteilung. Wählt der Nutzer die andere Lage, wird (h+1) + (h−1) aufgeteilt
  (h = halbe Gruppenzahl), der größere Teilpack liegt vorne: 18S → 10 + 8 (außen), 20S → 11 + 9 (innen),
  30S → 16 + 14 (außen), 32S → 17 + 15 (innen).
- Bei 2P ist die gleichmäßige Aufteilung mit Brücke außen der Normalfall, weil ungleiche Teilpacks dort zwei Zellen
  unterschiedlich breit sind. Bei 1P darf die Brücke innen liegen (30S1P = 15 + 15). [BESTÄTIGT]
```

§9 – am Ende anhängen:

```
`30S1P_21700.json` stammt aus `src/core`, nicht aus `reference/demo.ts`: Die Referenz kennt keine unvollständigen
Lagen. Der Nutzer hat das Ergebnis am Screenshot `docs/screenshots/30S1P.png` bestätigt (beide Teilpacks 8 oben + 7 unten,
Minus oben rechts vorne, Plus oben rechts hinten, Brücke B15 innen links). [BESTÄTIGT]
```

- [ ] **Step 5: Prüfen**

Run: `npm test`, `npm run lint`, `npm run build` → alles grün.

---

### Task 8: Kurzwerte, Marken und Fehler der Zeilen

Spec §5.3 bis §5.5. Reine Funktionen; die Komponenten in Task 9 zeigen nur an.

**Files:**
- Modify: `src/view/configSummary.ts` (ergänzen)
- Modify: `tests/config-summary.test.ts` (ergänzen)

**Interfaces:**
- Consumes: `layerRowsText`, `layerCountText` (Task 6); `DEFAULT_STATE`, `boosterInfo`, `mainSeries`, `effectiveSplit` (Task 4).
- Produces:
  - `type RowId = 'packs' | 'layers' | 'stacking' | 'terminals' | 'spacing' | 'cell' | 'booster' | 'fishpaper'`
  - `ROW_IDS: readonly RowId[]`, `ROW_TITLES: Record<RowId, string>`
  - `rowValue(s, id): string`, `rowBadge(s, id): string | null`, `rowModified(s, id): boolean`
  - `resetRowPatch(s, id): Partial<ConfigState>`
  - `rowOfField(fieldId: string): RowId | null`
  - `rowHasError(s, id, fieldErrorIds: readonly string[]): boolean`

- [ ] **Step 1: Tests ergänzen**

In `tests/config-summary.test.ts` den Import aus `../src/view/configSummary` ersetzen:

```ts
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
} from '../src/view/configSummary';
```

Am Ende der Datei anhängen:

```ts
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
});
```

- [ ] **Step 2: Tests laufen lassen, sie müssen scheitern**

Run: `npx vitest run tests/config-summary.test.ts`
Expected: FAIL – `ROW_IDS` und die übrigen neuen Namen sind nicht exportiert.

- [ ] **Step 3: `src/view/configSummary.ts` ergänzen**

Den Import aus `../state/config` ersetzen:

```ts
import { DEFAULT_STATE, boosterInfo, effectiveSplit, mainSeries, rowInfo, toBatteryConfig } from '../state/config';
```

Am Dateiende anhängen:

```ts
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

/** Kurzwert einer zugeklappten Zeile. */
export function rowValue(s: ConfigState, id: RowId): string {
  switch (id) {
    case 'packs':
      return s.subPacks === 1 ? '1 Teilpack' : `${s.subPacks} · ${effectiveSplit(s).join(' + ')}`;
    case 'layers': {
      const count = layerCountText(s);
      const rows = layerRowsText(s);
      return count && rows ? `${count} · ${rows}` : 'geht nicht auf';
    }
    case 'stacking':
      return s.stacking === 'grid' ? 'Raster' : `Wabe, Versatz ${sideWord(s.offsetSide)}`;
    case 'terminals':
      return `− ${endWord(s.mainMinus.end)} ${sideWord(s.mainMinus.side)} · + ${endWord(s.mainPlus.end)} ${sideWord(s.mainPlus.side)}`;
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
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run tests/config-summary.test.ts`
Expected: PASS.

- [ ] **Step 5: Prüfen**

Run: `npx prettier --write src/view/configSummary.ts tests/config-summary.test.ts`
Run: `npm test`, `npm run lint`, `npm run build` → alles grün.

---

### Task 9: Panel-Umbau – Grundwerte oben, Liste „Aufbau“ darunter

Spec §5.1, §5.3 bis §5.6. `ConfigPanel.tsx` wird zum Rahmen; jede Zeile bekommt eine eigene kleine Komponente mit den Feldern, die heute im jeweiligen Abschnitt stehen. Es entfällt keine Einstellung.

**Files:**
- Modify: `src/ui/form/Fields.tsx` (`NumberField`, `Section`)
- Create: `src/ui/config/Row.tsx`
- Create: `src/ui/config/rows/PacksRow.tsx`, `LayersRow.tsx`, `StackingRow.tsx`, `TerminalsRow.tsx`, `SpacingRow.tsx`, `CellRow.tsx`, `BoosterRow.tsx`, `FishpaperRow.tsx`
- Modify: `src/ui/config/ConfigPanel.tsx` (vollständig ersetzen)
- Modify: `src/ui/App.tsx` (Prop `errorIds`)
- Modify: `src/ui/styles.css`
- Modify: `tests/e2e/screenshots.spec.ts`

**Interfaces:**
- Consumes: alles aus `src/view/configSummary.ts` (Task 6, 8); `rowInfo`, `boosterInfo`, `mainSeries`, `customCell`, `PRESETS`, `matchingPreset`; `LAYER_LIMITS`.
- Produces:
  - `Section` mit `badge?: string | null`, `error?: boolean`, `testId?: string`
  - `Row({ id, state, dispatch, errorIds, children })`, `RowProps = { state; dispatch; onError }`
  - `ConfigPanel` mit zusätzlichem Prop `errorIds: readonly string[]`
  - `data-testid="row-<id>"` je Zeile, `data-testid="layers-error"`

- [ ] **Step 1: e2e-Tests zuerst anpassen (sie scheitern bis Step 6)**

`tests/e2e/screenshots.spec.ts`:

Über dem bestehenden Import eine Zeile ergänzen:

```ts
import type { Page } from '@playwright/test';
```

Direkt nach der bestehenden Zeile `const SHOTS = 'docs/screenshots';` den Helfer einfügen:

```ts
/** Zeile der Liste „Aufbau“ aufklappen */
const openRow = (page: Page, id: string) => page.getByTestId(`row-${id}`).locator('summary').click();
```

Im Test „Raster + Abstandhalter verlangt manuelle Abstände, sonst kein Export“ die beiden `check()`-Zeilen ersetzen durch:

```ts
  await openRow(page, 'stacking');
  await page.getByRole('radio', { name: 'Raster' }).check();
  await openRow(page, 'spacing');
  await page.getByRole('radio', { name: 'Abstandhalter' }).check();
```

Im Test „Ungültige Eingabe wird am Feld markiert, Ansicht ausgegraut“ vor `getByLabel('Zellen je Lage manuell')` einfügen:

```ts
  await openRow(page, 'layers');
```

Im Test „Booster: Lagenzahl wie der Teilpack, an dem er hängt“ nach dem Klick auf das Preset einfügen:

```ts
  await openRow(page, 'booster');
```

Drei neue Tests anhängen:

```ts
test('Aufbau-Liste: Zeilen zugeklappt mit Kurzwert, Details klappen auf', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');
  await expect(page.getByTestId('row-packs')).toContainText('2 · 9 + 9');
  await expect(page.getByTestId('row-layers')).toContainText('2 · 9 je Lage');
  await expect(page.getByTestId('row-terminals')).toContainText('− vorne rechts · + hinten rechts');
  await expect(page.getByLabel('Teilpacks im Hauptpack')).toBeHidden();
  await openRow(page, 'packs');
  await expect(page.getByLabel('Teilpacks im Hauptpack')).toBeVisible();
  await page.getByRole('button', { name: '30S1P', exact: true }).click();
  await expect(page.getByTestId('row-layers')).toContainText('2 · 8 + 7');
  await openRow(page, 'layers');
  await expect(page.getByRole('radio', { name: 'oben' })).toBeChecked();
  await page.screenshot({ path: `${SHOTS}/aufbau.png`, fullPage: true });
});

test('„angepasst“ und „Zurück auf Standard“', async ({ page }) => {
  await page.goto('/');
  await openRow(page, 'stacking');
  await page.getByRole('radio', { name: 'nach rechts' }).check();
  await expect(page.getByTestId('row-stacking')).toContainText('angepasst');
  await page.getByTestId('row-stacking').getByRole('button', { name: 'Zurück auf Standard' }).click();
  await expect(page.getByTestId('row-stacking')).not.toContainText('angepasst');
  await expect(page.getByRole('radio', { name: 'nach links' })).toBeChecked();
});

test('Fehler klappt die Zeile von selbst auf', async ({ page }) => {
  await page.goto('/');
  await openRow(page, 'stacking');
  await page.getByRole('radio', { name: 'Raster' }).check();
  await page.getByLabel('S gesamt').fill('30');
  await expect(page.getByTestId('layers-error')).toBeHidden();
  await page.getByLabel('P', { exact: true }).fill('1');
  await expect(page.getByTestId('layers-error')).toBeVisible();
  await expect(page.getByTestId('layers-error')).toContainText('15 Zellen lassen sich nicht auf 2 Lagen aufteilen');
  await expect(page.locator('.stale-banner')).toContainText('15 Zellen lassen sich nicht auf 2 Lagen aufteilen');
  await expect(page.locator('.stale-banner')).not.toContainText('volle Lagen');
});
```

- [ ] **Step 2: `Fields.tsx` – `NumberField` räumt auf, `Section` bekommt Marke und Fehler**

Import ändern:

```tsx
import { useEffect, useId, useRef, useState } from 'react';
```

In `NumberField` direkt nach `const uid = useId();` einfügen:

```tsx
  // Feld verschwindet (z. B. „manuell“ abgewählt, Zeile zurückgesetzt): gemeldeten Fehler zurücknehmen
  const { id, onError } = p;
  useEffect(() => () => onError?.(id, null), [id, onError]);
```

`Section` ersetzen:

```tsx
export function Section(p: {
  title: string;
  children: ReactNode;
  open?: boolean;
  aside?: ReactNode;
  /** kleine Marke neben dem Titel, z. B. „angepasst“ */
  badge?: string | null;
  /** Fehler im Abschnitt: klappt von selbst auf und trägt eine Fehlermarke */
  error?: boolean;
  testId?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (p.error && ref.current) ref.current.open = true;
  }, [p.error]);
  return (
    <details ref={ref} className={'section' + (p.error ? ' section--error' : '')} open={p.open ?? true} data-testid={p.testId}>
      <summary>
        <span>{p.title}</span>
        {p.badge && <span className="section__badge">{p.badge}</span>}
        {p.aside && <span className="section__aside">{p.aside}</span>}
      </summary>
      <div className="section__body">{p.children}</div>
    </details>
  );
}
```

- [ ] **Step 3: `src/ui/config/Row.tsx` anlegen**

```tsx
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { ConfigState } from '../../state/config';
import type { RowId } from '../../view/configSummary';
import { ROW_TITLES, resetRowPatch, rowBadge, rowHasError, rowModified, rowValue } from '../../view/configSummary';
import { Section } from '../form/Fields';
import type { Dispatch } from '../useAppState';

/** Props der Feld-Komponenten einer Zeile */
export interface RowProps {
  state: ConfigState;
  dispatch: Dispatch;
  onError: (id: string, msg: string | null) => void;
}

interface Props {
  id: RowId;
  state: ConfigState;
  dispatch: Dispatch;
  /** IDs der Felder mit Eingabefehler */
  errorIds: readonly string[];
  children: ReactNode;
}

/** Eine Zeile der Liste „Aufbau“: Kurzwert, Marke, Fehlermarke und „Zurück auf Standard“ (Plan 06 §5.3–5.5). */
export function Row({ id, state, dispatch, errorIds, children }: Props) {
  // Zurücksetzen baut die Felder neu auf: ungültige Entwürfe und ihre Fehlermeldungen verschwinden mit
  const [generation, setGeneration] = useState(0);
  const reset = () => {
    dispatch({ type: 'set', patch: resetRowPatch(state, id) });
    setGeneration((g) => g + 1);
  };
  return (
    <Section
      title={ROW_TITLES[id]}
      aside={rowValue(state, id)}
      badge={rowBadge(state, id)}
      error={rowHasError(state, id, errorIds)}
      open={false}
      testId={`row-${id}`}
    >
      <div className="row__fields" key={generation}>
        {children}
      </div>
      {rowModified(state, id) && (
        <button type="button" className="linkbtn" onClick={reset}>
          Zurück auf Standard
        </button>
      )}
    </Section>
  );
}
```

- [ ] **Step 4: Die acht Zeilen-Komponenten anlegen**

Die Felder sind aus dem heutigen `ConfigPanel.tsx` übernommen; Beschriftungen, IDs, Grenzen und Hinweise bleiben gleich.

`src/ui/config/rows/PacksRow.tsx`:

```tsx
import { LIMITS } from '../../../core';
import type { ConfigState } from '../../../state/config';
import { mainSeries } from '../../../state/config';
import { Check, NumberField } from '../../form/Fields';
import type { RowProps } from '../Row';

export function PacksRow({ state: s, dispatch, onError }: RowProps) {
  const set = (patch: Partial<ConfigState>) => dispatch({ type: 'set', patch });
  const mS = mainSeries(s);
  const sum = s.seriesSplit.reduce((a, b) => a + b, 0);
  return (
    <>
      <NumberField
        id="subPacks"
        label="Teilpacks im Hauptpack"
        integer
        min={LIMITS.subPacks.min}
        max={LIMITS.subPacks.max}
        value={s.subPacks}
        onError={onError}
        onChange={(v) => set({ subPacks: v! })}
        hint={s.subPacks === 2 ? 'vorne + hinten, per Brücke verbunden' : undefined}
      />
      <Check
        label="S je Teilpack manuell"
        checked={s.seriesSplitManual}
        onChange={(v) => set({ seriesSplitManual: v })}
        hint={s.seriesSplitManual ? undefined : `automatisch ${s.seriesSplit.join(' + ')} = ${mS}S`}
      />
      {s.seriesSplitManual && (
        <div className="rowN">
          {s.seriesSplit.map((v, i) => (
            <NumberField
              key={i}
              id={`split.${i}`}
              label={`Pack ${String.fromCharCode(65 + i)}`}
              integer
              min={1}
              value={v}
              onError={onError}
              onChange={(n) => set({ seriesSplit: s.seriesSplit.map((x, j) => (j === i ? n! : x)) })}
            />
          ))}
          <div className={'sum' + (sum !== mS ? ' sum--bad' : '')}>
            Summe {sum} / {mS}S
          </div>
        </div>
      )}
    </>
  );
}
```

`src/ui/config/rows/LayersRow.tsx`:

```tsx
import { LIMITS } from '../../../core';
import type { ConfigState } from '../../../state/config';
import { rowInfo } from '../../../state/config';
import { LAYER_LIMITS } from '../../../state/derive';
import { hasShortLayerRows, layerCountText, layerRowsText } from '../../../view/configSummary';
import { Check, Choice, NumberField } from '../../form/Fields';
import type { RowProps } from '../Row';

export function LayersRow({ state: s, dispatch, onError }: RowProps) {
  const set = (patch: Partial<ConfigState>) => dispatch({ type: 'set', patch });
  const rows = rowInfo(s);
  const rowsText = layerRowsText(s);
  const layerCount = layerCountText(s);
  return (
    <>
      {!s.cellsPerRowManual && !s.cellsPerRowSplitManual && (
        <NumberField
          id="layers"
          label="Lagen"
          integer
          min={LAYER_LIMITS.min}
          max={LAYER_LIMITS.max}
          value={s.layers}
          onError={onError}
          onChange={(v) => set({ layers: v! })}
          hint={rowsText ? `→ ${rowsText}` : undefined}
        />
      )}
      {rows.error && (
        <p className="field__msg field__msg--error" role="alert" data-testid="layers-error">
          {rows.error}
        </p>
      )}
      {hasShortLayerRows(s) && (
        <Choice
          label="Größere Lage"
          value={s.wideLayer}
          options={[
            { value: 'top', label: 'oben' },
            { value: 'bottom', label: 'unten' },
          ]}
          onChange={(v) => set({ wideLayer: v })}
          hint="bei ungerader Zellzahl je Teilpack; die kürzere Lage sitzt in den Mulden"
        />
      )}
      <Check label="Zellen je Lage manuell" checked={s.cellsPerRowManual} onChange={(v) => set({ cellsPerRowManual: v })} />
      {s.cellsPerRowManual && !s.cellsPerRowSplitManual && (
        <NumberField
          id="cellsPerRow"
          label="Zellen je Lage"
          integer
          min={LIMITS.cellsPerRow.min}
          max={LIMITS.cellsPerRow.max}
          value={s.cellsPerRow}
          onError={onError}
          onChange={(v) => set({ cellsPerRow: v! })}
          hint={layerCount ? `→ ${layerCount} ${layerCount === '1' ? 'Lage' : 'Lagen'} je Teilpack` : 'geht nicht auf'}
        />
      )}
      <Check
        label="Zellen je Lage je Teilpack"
        checked={s.cellsPerRowSplitManual}
        onChange={(v) => set({ cellsPerRowSplitManual: v })}
      />
      {s.cellsPerRowSplitManual && (
        <div className="rowN">
          {s.cellsPerRowSplit.map((v, i) => (
            <NumberField
              key={i}
              id={`cprSplit.${i}`}
              label={`Pack ${String.fromCharCode(65 + i)}`}
              integer
              min={1}
              value={v}
              onError={onError}
              onChange={(n) => set({ cellsPerRowSplit: s.cellsPerRowSplit.map((x, j) => (j === i ? n! : x)) })}
            />
          ))}
        </div>
      )}
    </>
  );
}
```

`src/ui/config/rows/StackingRow.tsx`:

```tsx
import { Choice } from '../../form/Fields';
import type { RowProps } from '../Row';

export function StackingRow({ state: s, dispatch }: RowProps) {
  return (
    <>
      <Choice
        label="Stapelung"
        value={s.stacking}
        options={[
          { value: 'honeycomb', label: 'Wabe (versetzt)' },
          { value: 'grid', label: 'Raster' },
        ]}
        onChange={(v) => dispatch({ type: 'set', patch: { stacking: v } })}
      />
      {s.stacking === 'honeycomb' && (
        <Choice
          label="Wabenversatz (obere Lage gegenüber unterer)"
          value={s.offsetSide}
          options={[
            { value: 'L', label: 'nach links' },
            { value: 'R', label: 'nach rechts' },
          ]}
          onChange={(v) => dispatch({ type: 'set', patch: { offsetSide: v } })}
          hint="globale Seite, Draufsicht mit VORNE oben"
        />
      )}
    </>
  );
}
```

`src/ui/config/rows/TerminalsRow.tsx`:

```tsx
import type { Face, Side } from '../../../core';
import type { ConfigState } from '../../../state/config';
import { Choice } from '../../form/Fields';
import type { RowProps } from '../Row';

const faceOpts: { value: Face; label: string }[] = [
  { value: 'V', label: 'vorne' },
  { value: 'H', label: 'hinten' },
];
const sideOpts: { value: Side; label: string }[] = [
  { value: 'L', label: 'links' },
  { value: 'R', label: 'rechts' },
];

export function TerminalsRow({ state: s, dispatch }: RowProps) {
  const set = (patch: Partial<ConfigState>) => dispatch({ type: 'set', patch });
  return (
    <>
      <div className="terminal">
        <span className="pol pol--minus" aria-hidden="true">
          −
        </span>
        <div>
          <Choice
            label="Hauptminus – Stirnseite"
            value={s.mainMinus.end}
            options={faceOpts}
            onChange={(v) => set({ mainMinus: { ...s.mainMinus, end: v } })}
          />
          <Choice
            label="Hauptminus – Seite"
            value={s.mainMinus.side}
            options={sideOpts}
            onChange={(v) => set({ mainMinus: { ...s.mainMinus, side: v } })}
          />
        </div>
      </div>
      <div className="terminal">
        <span className="pol pol--plus" aria-hidden="true">
          +
        </span>
        <div>
          <Choice
            label="Hauptplus – Stirnseite"
            value={s.mainPlus.end}
            options={faceOpts}
            onChange={(v) => set({ mainPlus: { ...s.mainPlus, end: v } })}
          />
          <Choice
            label="Hauptplus – Seite"
            value={s.mainPlus.side}
            options={sideOpts}
            onChange={(v) => set({ mainPlus: { ...s.mainPlus, side: v } })}
          />
        </div>
      </div>
    </>
  );
}
```

`src/ui/config/rows/SpacingRow.tsx`:

```tsx
import { LIMITS } from '../../../core';
import type { ConfigState } from '../../../state/config';
import { fmtNum } from '../../format';
import { Choice, NumberField } from '../../form/Fields';
import type { RowProps } from '../Row';

export function SpacingRow({ state: s, dispatch, onError }: RowProps) {
  const set = (patch: Partial<ConfigState>) => dispatch({ type: 'set', patch });
  const D = s.cell.diameter;
  const pitchMode = s.spacingInput === 'pitch';
  // Abstandhalter: Eingabe als Spalt (Mantel-zu-Mantel) oder Mittenabstand
  const toShown = (gap: number | null) => (gap === null ? null : pitchMode ? +(gap + D).toFixed(4) : gap);
  const fromShown = (v: number | null) => (v === null ? null : pitchMode ? +(v - D).toFixed(4) : v);
  const gapValidate = (v: number) =>
    pitchMode && v < D ? `Mittenabstand muss ≥ Zelldurchmesser (${fmtNum(D, 2)} mm) sein.` : null;
  return (
    <>
      <Choice
        label="Modus"
        value={s.spacingMode}
        options={[
          { value: 'fishpaper', label: 'nur Fishpaper' },
          { value: 'spacer', label: 'Abstandhalter' },
        ]}
        onChange={(v) => dispatch({ type: 'spacingMode', mode: v })}
      />
      <NumberField
        id="paperThickness"
        label="Fishpaper-Stärke"
        unit="mm"
        min={0.05}
        max={3}
        value={s.paperThickness}
        onError={onError}
        onChange={(v) => set({ paperThickness: v! })}
        hint={s.spacingMode === 'fishpaper' ? 'zugleich Zellspalt (Zelle an Zelle)' : undefined}
      />
      {s.spacingMode === 'spacer' && (
        <>
          <Choice
            label="Eingabe als"
            value={s.spacingInput}
            options={[
              { value: 'gap', label: 'Spalt' },
              { value: 'pitch', label: 'Mittenabstand' },
            ]}
            onChange={(v) => set({ spacingInput: v })}
          />
          <div className="row2">
            <NumberField
              key={`gr-${s.spacingInput}`}
              id="gapRow"
              label={pitchMode ? 'Mitte Reihe' : 'Spalt Reihe'}
              unit="mm"
              required
              min={pitchMode ? undefined : 0}
              max={pitchMode ? D + 20 : 20}
              validate={gapValidate}
              value={toShown(s.gapRow)}
              onError={onError}
              onChange={(v) => set({ gapRow: fromShown(v) })}
            />
            <NumberField
              key={`gl-${s.spacingInput}`}
              id="gapLayer"
              label={pitchMode ? 'Mitte Lage' : 'Spalt Lage'}
              unit="mm"
              required
              min={pitchMode ? undefined : 0}
              max={pitchMode ? D + 20 : 20}
              validate={gapValidate}
              value={toShown(s.gapLayer)}
              onError={onError}
              onChange={(v) => set({ gapLayer: fromShown(v) })}
            />
          </div>
          <NumberField
            id="holderRim"
            label="Halter-Außenrand"
            unit="mm"
            required
            min={0}
            max={20}
            value={s.holderRim}
            onError={onError}
            onChange={(v) => set({ holderRim: v })}
            hint="Überstand des Halters außen, für die Umrisse"
          />
        </>
      )}
      <div className="row2">
        <NumberField
          id="packGap"
          label="Isolierlage zw. Teilpacks"
          unit="mm"
          min={0}
          max={20}
          value={s.packGap}
          onError={onError}
          onChange={(v) => set({ packGap: v! })}
        />
        <NumberField
          id="nickel"
          label="Nickelstärke"
          unit="mm"
          min={LIMITS.nickelThickness.min}
          max={LIMITS.nickelThickness.max}
          value={s.nickelThickness}
          onError={onError}
          onChange={(v) => set({ nickelThickness: v! })}
        />
      </div>
    </>
  );
}
```

`src/ui/config/rows/CellRow.tsx`:

```tsx
import type { ConfigState } from '../../../state/config';
import { customCell } from '../../../state/config';
import { NumberField } from '../../form/Fields';
import type { RowProps } from '../Row';

export function CellRow({ state: s, dispatch, onError }: RowProps) {
  const custom = s.cellType === 'custom';
  // Maß/Kapazität überschreiben -> eigene Zelle (Datenblattwerte entfallen)
  const setCustom = (patch: Partial<ConfigState['cell']>) =>
    dispatch({ type: 'set', patch: { cell: customCell({ ...s.cell, ...patch }), cellType: 'custom' } });
  return (
    <>
      <div className="row2">
        <NumberField
          id="cell.diameter"
          label="Durchmesser"
          unit="mm"
          min={5}
          max={60}
          value={s.cell.diameter}
          onError={onError}
          onChange={(v) => setCustom({ diameter: v! })}
          hint={custom ? 'mit Schrumpfschlauch nachmessen' : 'Maximalwert lt. Datenblatt'}
        />
        <NumberField
          id="cell.length"
          label="Länge"
          unit="mm"
          min={10}
          max={200}
          value={s.cell.length}
          onError={onError}
          onChange={(v) => setCustom({ length: v! })}
        />
      </div>
      <NumberField
        id="cell.capacity"
        label="Kapazität"
        unit="Ah"
        min={0.1}
        max={20}
        value={s.cell.capacityAh}
        onError={onError}
        onChange={(v) => setCustom({ capacityAh: v! })}
        hint={
          custom
            ? 'eigene Zelle: nur Maße, Kapazität und U nenn'
            : 'Ändern von Maß oder Kapazität schaltet auf „eigene Zelle“ (Datenblattwerte entfallen)'
        }
      />
    </>
  );
}
```

`src/ui/config/rows/BoosterRow.tsx`:

```tsx
import type { ConfigState } from '../../../state/config';
import { boosterInfo, mainSeries } from '../../../state/config';
import { Check, Choice, NumberField } from '../../form/Fields';
import type { RowProps } from '../Row';

export function BoosterRow({ state: s, dispatch, onError }: RowProps) {
  const set = (patch: Partial<ConfigState>) => dispatch({ type: 'set', patch });
  const booster = boosterInfo(s);
  const mS = mainSeries(s);
  return (
    <>
      <Check label="Booster (eigenes Gehäuse)" checked={s.boosterEnabled} onChange={(v) => set({ boosterEnabled: v })} />
      {s.boosterEnabled && (
        <>
          <div>
            <NumberField
              id="booster.series"
              label="Booster S"
              integer
              min={1}
              max={Math.max(1, s.series - 1)}
              value={s.booster.series}
              onError={onError}
              onChange={(v) => set({ booster: { ...s.booster, series: v! } })}
            />
          </div>
          <p className="note">
            Hauptpack = {s.series} − {s.booster.series} = {mS}S · gesamt = ({s.seriesSplit.join(' + ')}) + {s.booster.series} ={' '}
            {s.series}S
          </p>
          {booster &&
            (booster.error ? (
              <p className="field__msg field__msg--error" role="alert" data-testid="booster-error">
                {booster.error}
              </p>
            ) : booster.cellsPerRow !== null ? (
              <p className="note" data-testid="booster-rows">
                Booster: {booster.layers} {booster.layers === 1 ? 'Lage' : 'Lagen'} wie {booster.packLabel} →{' '}
                {booster.cellsPerRow} Zellen je Lage
              </p>
            ) : null)}
          <Choice
            label="Booster-Position"
            value={s.booster.position}
            options={[
              { value: 'plus', label: 'am Hauptplus' },
              { value: 'minus', label: 'am Hauptminus' },
            ]}
            onChange={(v) => set({ booster: { ...s.booster, position: v } })}
          />
        </>
      )}
    </>
  );
}
```

`src/ui/config/rows/FishpaperRow.tsx`:

```tsx
import type { ConfigState } from '../../../state/config';
import { Check, Choice, NumberField } from '../../form/Fields';
import type { RowProps } from '../Row';

export function FishpaperRow({ state: s, dispatch, onError }: RowProps) {
  const fp = s.fishpaper;
  const setFp = (patch: Partial<ConfigState['fishpaper']>) => dispatch({ type: 'fishpaper', patch });
  return (
    <>
      <Choice
        label="Umriss Stirnseiten"
        value={fp.outlineFace}
        options={[
          { value: 'straight', label: 'gerade' },
          { value: 'tucked', label: 'eingebogen' },
        ]}
        onChange={(v) => setFp({ outlineFace: v })}
      />
      <Choice
        label="Umriss Umwicklung"
        value={fp.outlineWrap}
        options={[
          { value: 'straight', label: 'gerade' },
          { value: 'tucked', label: 'eingebogen' },
        ]}
        onChange={(v) => setFp({ outlineWrap: v })}
      />
      <div className="row2">
        <NumberField
          id="fp.faceMargin"
          label="Randzugabe Stirnseite"
          unit="mm"
          min={-5}
          max={20}
          value={fp.faceMargin}
          onError={onError}
          onChange={(v) => setFp({ faceMargin: v! })}
          hint="+ größer · − kleiner"
        />
        <NumberField
          id="fp.overlap"
          label="Überlappung Umwicklung"
          unit="mm"
          min={0}
          max={100}
          value={fp.wrapOverlap}
          onError={onError}
          onChange={(v) => setFp({ wrapOverlap: v! })}
        />
      </div>
      <NumberField
        id="fp.fold"
        label="Umschlag Umwicklung je Seite"
        unit="mm"
        min={0}
        max={30}
        value={fp.wrapFold}
        onError={onError}
        onChange={(v) => setFp({ wrapFold: v! })}
        hint={fp.wrapFold > 0 ? 'mit Einschnitten zum Anlegen an die Rundungen' : 'zum Umschlagen auf die Stirnseite'}
      />
      <Choice
        label="Umwicklung"
        value={fp.wrapMode}
        options={[
          { value: 'perPack', label: 'je Teilpack' },
          { value: 'combined', label: 'gemeinsam' },
        ]}
        onChange={(v) => setFp({ wrapMode: v })}
      />
      <Choice
        label="Zwischenlage"
        value={fp.interlayer}
        options={[
          { value: 'single', label: 'einfach' },
          { value: 'double', label: 'doppelt' },
        ]}
        onChange={(v) => setFp({ interlayer: v })}
      />
      <Choice
        label="Aussparung Brücke"
        value={fp.bridgeCutout}
        options={[
          { value: 'none', label: 'keine' },
          { value: 'notch', label: 'Randkerbe' },
          { value: 'slot', label: 'Schlitz' },
        ]}
        onChange={(v) => setFp({ bridgeCutout: v })}
      />
      {fp.bridgeCutout !== 'none' && (
        <div className="row2">
          <NumberField
            id="fp.cutW"
            label="Breite"
            unit="mm"
            min={1}
            max={80}
            value={fp.cutoutWidth}
            onError={onError}
            onChange={(v) => setFp({ cutoutWidth: v! })}
          />
          <NumberField
            id="fp.cutH"
            label="Höhe"
            unit="mm"
            min={0.5}
            max={30}
            value={fp.cutoutHeight}
            onError={onError}
            onChange={(v) => setFp({ cutoutHeight: v! })}
          />
        </div>
      )}
      <Check label="Seitenteile links/rechts" checked={fp.includeSides} onChange={(v) => setFp({ includeSides: v })} />
      <Check label="Ober-/Unterseite" checked={fp.includeTopBottom} onChange={(v) => setFp({ includeTopBottom: v })} />
    </>
  );
}
```

- [ ] **Step 5: `src/ui/config/ConfigPanel.tsx` vollständig ersetzen**

```tsx
import { LIMITS } from '../../core';
import type { ConfigState } from '../../state/config';
import { PRESETS, matchingPreset } from '../../state/config';
import { bridgeSwitch } from '../../view/configSummary';
import { CellSelect, Choice, NumberField } from '../form/Fields';
import type { Dispatch } from '../useAppState';
import { Row } from './Row';
import { BoosterRow } from './rows/BoosterRow';
import { CellRow } from './rows/CellRow';
import { FishpaperRow } from './rows/FishpaperRow';
import { LayersRow } from './rows/LayersRow';
import { PacksRow } from './rows/PacksRow';
import { SpacingRow } from './rows/SpacingRow';
import { StackingRow } from './rows/StackingRow';
import { TerminalsRow } from './rows/TerminalsRow';

interface Props {
  state: ConfigState;
  dispatch: Dispatch;
  onError: (id: string, msg: string | null) => void;
  onReset: () => void;
  /** IDs der Felder mit Eingabefehler (für die Fehlermarke der Zeilen) */
  errorIds: readonly string[];
}

/** Grundwerte oben, darunter die Liste „Aufbau“ mit aufklappbaren Zeilen (Plan 06 §5.1). */
export function ConfigPanel({ state: s, dispatch, onError, onReset, errorIds }: Props) {
  const set = (patch: Partial<ConfigState>) => dispatch({ type: 'set', patch });
  const preset = matchingPreset(s);
  const bridge = bridgeSwitch(s);
  const fields = { state: s, dispatch, onError };
  const row = { state: s, dispatch, errorIds };

  return (
    <div className="config">
      <div className="presets" role="group" aria-label="Schnellwahl">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={'chip' + (preset === p.id ? ' is-on' : '')}
            aria-pressed={preset === p.id}
            onClick={() => dispatch({ type: 'preset', id: p.id })}
          >
            {p.label}
          </button>
        ))}
        <button type="button" className="chip chip--ghost" onClick={onReset}>
          Zurücksetzen
        </button>
      </div>

      <div className="basics">
        <CellSelect value={s.cellType} onChange={(v) => dispatch({ type: 'cellType', cellType: v })} />
        <div className="row2">
          <NumberField
            id="series"
            label="S gesamt"
            integer
            min={LIMITS.series.min}
            max={LIMITS.series.max}
            value={s.series}
            onError={onError}
            onChange={(v) => set({ series: v! })}
          />
          <NumberField
            id="parallel"
            label="P"
            integer
            min={LIMITS.parallel.min}
            max={LIMITS.parallel.max}
            value={s.parallel}
            onError={onError}
            onChange={(v) => set({ parallel: v! })}
          />
        </div>
        <Choice
          label="Brücke"
          value={bridge.value}
          disabled={bridge.disabled}
          options={[
            { value: 'inner', label: 'innen' },
            { value: 'outer', label: 'außen' },
          ]}
          onChange={(pos) => dispatch({ type: 'bridge', pos })}
          hint={bridge.hint}
        />
      </div>

      <h2 className="aufbau">Aufbau</h2>
      <Row id="packs" {...row}>
        <PacksRow {...fields} />
      </Row>
      <Row id="layers" {...row}>
        <LayersRow {...fields} />
      </Row>
      <Row id="stacking" {...row}>
        <StackingRow {...fields} />
      </Row>
      <Row id="terminals" {...row}>
        <TerminalsRow {...fields} />
      </Row>
      <Row id="spacing" {...row}>
        <SpacingRow {...fields} />
      </Row>
      <Row id="cell" {...row}>
        <CellRow {...fields} />
      </Row>
      <Row id="booster" {...row}>
        <BoosterRow {...fields} />
      </Row>
      <Row id="fishpaper" {...row}>
        <FishpaperRow {...fields} />
      </Row>
    </div>
  );
}
```

`src/ui/App.tsx` – beim `<ConfigPanel …>` einen Prop ergänzen:

```tsx
            errorIds={Object.keys(fieldErrors.errors)}
```

- [ ] **Step 6: Stile ergänzen**

`src/ui/styles.css` – nach dem Block `.section__body { … }` einfügen:

```css
.section__badge {
  font-family: var(--font);
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.05rem 0.45rem;
  margin-right: 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--accent);
  color: var(--accent);
  white-space: nowrap;
}
.section__aside {
  text-align: right;
}
.section--error > summary > span:first-of-type::after {
  content: ' ✖';
  color: var(--error);
}
.row__fields {
  display: grid;
  gap: 0.6rem;
}
.linkbtn {
  justify-self: start;
  font: inherit;
  font-size: 0.85rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  text-decoration: underline;
  cursor: pointer;
}
.basics {
  display: grid;
  gap: 0.6rem;
  padding: 0.6rem 0 0.8rem;
}
.aufbau {
  margin: 0;
  padding: 0.7rem 0 0.2rem;
  border-top: 1px solid var(--line);
  font-family: var(--font-cond);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
```

Die bestehende Regel `.section__aside { color: …; font-weight: …; font-size: … }` bleibt; `text-align: right` kommt wie oben dazu.

- [ ] **Step 7: Alles laufen lassen**

Run: `npx prettier --write src/ui/form/Fields.tsx src/ui/config src/ui/App.tsx src/ui/styles.css tests/e2e/screenshots.spec.ts`
Run: `npm test` → PASS. Run: `npm run lint` und `npm run build` → ohne Fehler.
Run: `npm run e2e`
Expected: alle Playwright-Tests PASS, auch die drei neuen.

- [ ] **Step 8: Screenshots ansehen**

`docs/screenshots/aufbau.png`, `18S2P.png`, `30S1P.png`, `mobil_375.png` und `dunkel.png` öffnen und prüfen:
- oben nur Schnellwahl, Zelle, S, P, Brücke; darunter acht zugeklappte Zeilen mit Kurzwert;
- kein Kurzwert läuft aus der Seitenleiste oder überdeckt den Titel (der längste ist „− vorne rechts · + hinten rechts“; er darf umbrechen);
- Marke „angepasst“ ist lesbar, in hell und dunkel;
- mobil (375 px) kein horizontales Scrollen, Zeilen bedienbar.

Passt etwas nicht, die Stile aus Step 6 nachziehen und Step 7 wiederholen.

---

### Task 10: Abschluss – Doku nachziehen

Spec §10 Schritt 5.

**Files:**
- Modify: `README.md`
- Modify: `docs/03_UI_UND_AKZEPTANZ.md`

**Interfaces:**
- Consumes: den fertigen Stand aus Task 1–9.
- Produces: nichts für spätere Aufgaben.

- [ ] **Step 1: `README.md`**

Unter „Bedienung“ Punkt 1 und 2 ersetzen durch:

```
1. **Schnellwahl** oben in der Konfiguration: 18S2P, 20S2P, 20S2P Splitpack (18S2P + 2S2P), 30S1P, 32S1P oder „Zurücksetzen“.
2. **Konfiguration** links (mobil über den Knopf „Konfiguration“ oben). Oben stehen die Grundwerte: Zelle (9 Zellen aus
   Datenblättern, nach Bauform 21700/18650 gruppiert, oder „eigene Zelle“), S, P und **Brücke innen/außen**.
   Darunter die Liste **Aufbau** mit allem, was die App daraus ableitet: Teilpacks, Lagen, Stapelung, Anschlüsse,
   Abstände, Zellmaße, Splitpack, Zuschnitt. Jede Zeile zeigt ihren aktuellen Wert und klappt ihre Felder auf.
   Geänderte Zeilen tragen die Marke „angepasst“ und lassen sich einzeln zurücksetzen; Zeilen mit Fehler klappen
   von selbst auf. Jede Änderung wird sofort neu berechnet. Eingaben mit Komma oder Punkt.
   Ungültige Felder werden rot markiert; die Ansichten zeigen dann den letzten gültigen Stand, ausgegraut, mit der Fehlermeldung.
```

Den Satz zum URL-Hash ersetzen durch:

```
Die Konfiguration steckt im URL-Hash (`#c2=…`, nur Abweichungen vom Standard) und wird zusätzlich im Browser gemerkt.
Links sind dadurch teilbar. Ältere Links (`#c=…`) und JSON-Dateien werden übernommen und zeigen denselben Akku.
```

Unter „Aufbau“ nach dem Absatz „`src/core` ist eine 1:1-Übernahme …“ anhängen:

```
Einzige Erweiterung gegenüber der Referenz: die unvollständige Lage (`docs/06_PLAN_BRUECKE_UND_BEDIENUNG.md` §3).
Die Referenz kennt sie nicht; die Fixture `30S1P_21700` stammt deshalb aus `src/core` und ist vom Nutzer bestätigt.
```

Unter „Annahmen“ vor „## Offen (Stufe 2)“ einen Block einfügen:

```
**Brückenlage, unvollständige Lage, Bedienung (Runde 3, docs/06_PLAN_BRUECKE_UND_BEDIENUNG.md; Rückfragen vom Nutzer entschieden)**
- Hauptminus und Hauptplus liegen immer außen. Die Brückenlage folgt aus der Aufteilung; der Schalter „Brücke“ teilt
  bei der anderen Lage (h+1) + (h−1) auf, größerer Teilpack vorne. Er ist nur bei 2 Teilpacks und gerader Gruppenzahl aktiv.
- Unvollständige Lage nur bei Wabe mit 2 Lagen und genau einer fehlenden Zelle (15 = 8 + 7). Raster und 3+ Lagen
  verlangen volle Lagen.
- Eingegeben werden die Lagen (Standard 2); die Zellen je Lage rechnet die App aus. „Zellen je Lage manuell“ bleibt möglich.
- Alte Links: Zellen je Lage gelten als manuell gesetzt, außer die Ableitung ergibt dasselbe. Ein alter Link, dessen
  Zellzahl jetzt als unvollständige Lage passt, zeigt statt des früheren Fehlers den Akku.
- Fishpaper „Ober-/Unterseite“ bleibt ein Rechteck in Packbreite. Bei unvollständiger Lage ist die Seite mit der
  kürzeren Lage eine Zelle schmaler; das Teil wird dort von Hand gekürzt.
- Annahmen-Text: „beginnend oben/unten“ nennt jetzt den tatsächlichen Start des ersten Teilpacks.
```

- [ ] **Step 2: `docs/03_UI_UND_AKZEPTANZ.md`**

Direkt nach dem Layout-Kasten in §1 (vor „Mobil: …“) einfügen:

```
Seit Plan 06 (`docs/06_PLAN_BRUECKE_UND_BEDIENUNG.md` §5) zeigt die Konfiguration oben nur Schnellwahl, Zelle, S, P und
Brücke. Darunter steht die Liste „Aufbau“ (Teilpacks, Lagen, Stapelung, Anschlüsse, Abstände, Zellmaße, Splitpack,
Zuschnitt) mit aufklappbaren Zeilen.
```

In der Tabelle in §2 die Zeile

```
| | Zellen je Lage | 9 | optional je Teilpack; Lagen = Zellen / Zellen je Lage (wird angezeigt) |
```

ersetzen durch

```
| | Brücke | wie gleichmäßige Aufteilung | innen / außen; nur bei 2 Teilpacks und gerader Gruppenzahl; die andere Lage teilt (h+1) + (h−1) auf |
| | Lagen | 2 | 1–6; Zellen je Lage werden berechnet (wird angezeigt); optional „Zellen je Lage manuell“ und je Teilpack |
| | Größere Lage | oben | oben / unten; nur bei unvollständiger Lage (Wabe, 2 Lagen, ungerade Zellzahl) |
```

Den Satz „Schnellwahl-Buttons (Presets): …“ ersetzen durch:

```
Schnellwahl-Buttons (Presets): **18S2P**, **20S2P**, **20S2P Splitpack (18S2P + 2S2P)**, **30S1P**, **32S1P** sowie „Zurücksetzen“.
```

In §6 Punkt 2 anhängen: ` 30S1P entspricht der bestätigten Fixture \`30S1P_21700\`.`
In §6 Punkt 11 „vier Presets“ durch „fünf Presets“ ersetzen.

- [ ] **Step 3: Gesamtprüfung**

Run: `npm test` → PASS. Run: `npm run lint` → ohne Fehler. Run: `npm run build` → ohne Fehler. Run: `npm run e2e` → PASS.
Run: `node --experimental-strip-types reference/selftest.ts` → wie vorher (Referenz unberührt).
Run: `git status --short`
Expected: geändert sind nur Dateien aus der Tabelle „Dateien“ oben, `docs/screenshots/*`, `README.md`, `docs/01_FACHKONZEPT.md`, `docs/03_UI_UND_AKZEPTANZ.md`; neu ist unter `reference/` allein `fixtures/30S1P_21700.json`.

Dem Nutzer berichten: was fertig ist, Testzahlen, und dass nichts committet wurde.
