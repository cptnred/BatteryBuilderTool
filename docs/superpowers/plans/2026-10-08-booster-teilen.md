# Booster in Einzelpacks teilen – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Booster lässt sich in 1–4 Einzelpacks teilen, die hintereinander in einem Gehäuse stehen; die Brücke zwischen 2 Einzelpacks ist innen oder außen wählbar, und der Booster bekommt eine eigene Lagenzahl.

**Architecture:** Die Kettensuche des Solvers wird eine eigene Funktion und läuft zweimal: für den Hauptpack (unverändert) und für den Booster (Start links an Stirnseite 1, Ende an Stirnseite 2 des letzten Einzelpacks). Aufteilung, Lagen und Zellen je Lage des Boosters sind reine Ableitungen in `src/state` und nutzen `bridgeState` des Hauptpacks wieder. Zeichenmodelle und Zuschnitt gehen über alle Packs mit `role === 'booster'` statt über einen.

**Tech Stack:** Vite, React 19, TypeScript strict (`tsc -b` prüft auch `tests/`), Vitest (Umgebung `node`), Playwright, ESLint + Prettier (`printWidth` 130, `singleQuote`, `trailingComma: all`).

**Spec:** `docs/07_PLAN_BOOSTER_TEILEN.md` – vor jeder Aufgabe den genannten Abschnitt lesen. Fachregeln: `docs/01_FACHKONZEPT.md`.

## Global Constraints

- `reference/fixtures/*.json` (12 Dateien) und `reference/pack-core.ts` werden **nicht** geändert. `tests/fixtures.test.ts` und `tests/reference-equivalence.test.ts` werden **nicht** geändert und bleiben grün.
- Ein Booster mit 1 Einzelpack rechnet exakt wie bisher: Schlüssel `BOOST`, Bezeichnung `Booster 2S2P`, Position −1, Richtung `LR`, Start `V`, dieselben Brücken, dieselbe Kette, dieselben Kosten, **wortgleiche** Texte, dieselben Fishpaper-IDs, dieselbe Draufsicht. Einzige Ausnahme: die Warnung zu mehr als 2 Wabenlagen (Spec §3.5).
- `BoosterSpec` bekommt nur optionale Felder. `SubPack` bekommt keine neuen Felder. `Layout.cost` bleibt die Kostensumme des Hauptpacks.
- Speicherformat bleibt Version 2 (`c2=`, `version: 2`, `akku-konfigurator:v2`).
- `src/core`, `src/fishpaper`, `src/view`, `src/export`, `src/state` importieren weder React noch `../ui/*` noch `../state/*` (Lint-Regel). UI-Komponenten rechnen nicht selbst.
- Koordinaten: x = global links→rechts, z = unten→oben, y = vorne→hinten, alles in mm.
- UI-Texte auf Deutsch, Code auf Englisch. Polarität immer mit Symbol (+/−) **und** Farbe.
- **Nicht committen, nicht pushen, nicht deployen**, solange der Nutzer es nicht ausdrücklich sagt (`CLAUDE.md`). Jede Aufgabe endet deshalb mit „Prüfen“ statt mit einem Commit.
- Nach jeder Aufgabe grün: `npm test`, `npm run build`, `npm run lint`. Vor dem Lint die geänderten Dateien mit `npx prettier --write <Dateien>` formatieren.
- Die Sollwerte für den Kern (Aufgabe 2) wurden vorab am bestehenden Solver nachgerechnet, mit einem kleinen Hauptpack als Stellvertreter für den Booster. Weicht ein Testergebnis davon ab, ist die Umsetzung falsch, nicht der Sollwert. Bei Zweifel den Nutzer fragen.
- Fixtures für den geteilten Booster und [BESTÄTIGT]-Vermerke entstehen **erst nach** dem OK des Nutzers zu den zwei Screenshots (Aufgabe 8).

## Review Focus

Eingaben, die die Spec nahelegt, aber nicht ausdrücklich prüft. Jede Zeile hat ihren Test in der genannten Aufgabe.

1. **Booster-S wird kleiner als die Zahl der Einzelpacks** (4S → 1S bei 2 Einzelpacks): Meldung des Kerns, Fehlermarke an der Zeile „Splitpack“, kein Absturz. → Aufgabe 6.
2. **Beliebige geteilte Booster** (1–4 Einzelpacks, 1 oder 2 Lagen, Raster/Wabe, am Plus/Minus, alle Zuschnitt-Optionen): Solver, Ansichten, Zuschnitt und Seitenplan laufen ohne Ausnahme. → Aufgabe 3.
3. **Gespeicherter Stand mit unbrauchbaren Werten** in den neuen Feldern (`subPacks: 9`, `bridge: 'x'`, `layers: 0`, `layersManual: 'yes'`): lädt mit den Standardwerten. → Aufgabe 5.
4. **Ausdrückliche Brückenwahl im Booster, danach 3 Einzelpacks oder ungerade Gruppenzahl:** Schalter inaktiv mit Grund, gleichmäßige Aufteilung, kein Fehler. → Aufgabe 6.
5. **Booster breiter als der Hauptpack, am Hauptminus, geteilt:** In der Draufsicht liegen alle Blöcke, Linien und Fahnen im Bild. → Aufgabe 3.

## Dateien

| Datei | Verantwortung | Aufgabe |
|---|---|---|
| `src/core/types.ts` | optionale Felder in `BoosterSpec` | 1 |
| `src/core/validate.ts` | `boosterSplit`, `boosterPerRowOf`, Prüfungen | 1 |
| `src/core/solver.ts` | `searchChain`, `boosterLabel`, Zusammensetzen von Kette und Brücken | 2 |
| `src/core/stats.ts` | Gesamtmaß des Boosters in `dimensions` | 3 |
| `src/view/connections.ts`, `src/view/assumptions.ts`, `src/view/topModel.ts` | Texte und Draufsicht für mehrere Booster-Packs | 3 |
| `src/fishpaper/parts.ts` | Teile für mehrere Booster-Packs | 4 |
| `src/state/derive.ts` | `fitsLayers` | 5 |
| `src/state/config.ts` | neue Felder, `boosterRows`, `toBatteryConfig`, Action `boosterBridge`, `mergeWithDefaults` | 5 |
| `src/state/configSummary.ts` | `boosterBridgeSwitch`, `boosterLayersText`, Kurzwert, Fehlermarke | 6 |
| `src/ui/config/rows/BoosterRow.tsx`, `src/ui/tabs/WiringTab.tsx`, `src/ui/tabs/BomTab.tsx`, `src/ui/views/TopView.tsx` | Felder der Zeile, Stirnseiten je Einzelpack, Zeile „Booster gesamt“ | 6 |
| `tests/booster-split.test.ts` (neu) | Kern mit konkreten Zahlen | 1, 2 |
| `tests/view.test.ts`, `tests/robustness.test.ts`, `tests/fishpaper.test.ts`, `tests/derive.test.ts`, `tests/state.test.ts`, `tests/config-summary.test.ts`, `tests/e2e/screenshots.spec.ts` | ergänzt | 3–6 |
| `docs/03_UI_UND_AKZEPTANZ.md`, `README.md` | nachgezogen | 7 |
| `reference/fixtures/20S2P_split_18S2P+2x1S2P_21700.json`, `…16S2P+2x2S2P_21700.json` (neu), `docs/01_FACHKONZEPT.md` | erst **nach** Bestätigung | 8 |

---

### Task 1: Kern – Aufteilung und Prüfung

Spec §3.1, §3.5.

**Files:**
- Modify: `src/core/types.ts` (Interface `BoosterSpec`)
- Modify: `src/core/validate.ts`
- Test: `tests/booster-split.test.ts` (neu)

**Interfaces:**
- Consumes: nichts aus früheren Aufgaben.
- Produces:
  - `BoosterSpec.subPacks?: number`, `BoosterSpec.seriesSplit?: number[]`, `BoosterSpec.cellsPerRowSplit?: number[]`
  - `boosterSplit(cfg: BatteryConfig): number[]` – S je Einzelpack; `[]` ohne Booster; bei 1 Einzelpack oder unbrauchbarer Anzahl `[booster.series]`
  - `boosterPerRowOf(cfg: BatteryConfig, pos: number): number`

- [ ] **Step 1: Test schreiben**

Datei `tests/booster-split.test.ts` anlegen:

```ts
/** Geteilter Booster (Plan 07 §3): Aufteilung, Prüfung, Kette, Brücken – mit konkreten Zahlen. */
import { describe, expect, it } from 'vitest';
import type { BatteryConfig, BoosterSpec } from '../src/core';
import { DEFAULT_CONFIG, boosterPerRowOf, boosterSplit, solve } from '../src/core';

/** 20S gesamt; bei einem 4S-Booster braucht der Hauptpack (16S = 8 + 8) cellsPerRow 8 */
const withBooster = (booster: BoosterSpec, patch: Partial<BatteryConfig> = {}): BatteryConfig => ({
  ...DEFAULT_CONFIG,
  series: 20,
  ...patch,
  booster,
});
const errorsOf = (cfg: BatteryConfig) =>
  solve(cfg)
    .issues.filter((i) => i.level === 'error')
    .map((i) => i.msg);

describe('Aufteilung (§3.1)', () => {
  it('gleichmäßig, Rest nach vorne; ohne subPacks ein Einzelpack', () => {
    expect(boosterSplit(DEFAULT_CONFIG)).toEqual([]);
    expect(boosterSplit(withBooster({ series: 2, cellsPerRow: 2, position: 'plus' }))).toEqual([2]);
    expect(boosterSplit(withBooster({ series: 2, cellsPerRow: 1, position: 'plus', subPacks: 2 }))).toEqual([1, 1]);
    expect(boosterSplit(withBooster({ series: 5, cellsPerRow: 1, position: 'plus', subPacks: 3 }))).toEqual([2, 2, 1]);
  });

  it('seriesSplit und cellsPerRowSplit gelten nur bei passender Länge und mehr als einem Einzelpack', () => {
    const c = withBooster({
      series: 4,
      cellsPerRow: 3,
      position: 'plus',
      subPacks: 2,
      seriesSplit: [3, 1],
      cellsPerRowSplit: [3, 1],
    });
    expect(boosterSplit(c)).toEqual([3, 1]);
    expect([boosterPerRowOf(c, 0), boosterPerRowOf(c, 1)]).toEqual([3, 1]);
    const wrongLength = withBooster({
      series: 4,
      cellsPerRow: 2,
      position: 'plus',
      subPacks: 2,
      seriesSplit: [4],
      cellsPerRowSplit: [4],
    });
    expect(boosterSplit(wrongLength)).toEqual([2, 2]);
    expect(boosterPerRowOf(wrongLength, 1)).toBe(2);
    const single = withBooster({ series: 2, cellsPerRow: 2, position: 'plus', seriesSplit: [5], cellsPerRowSplit: [7] });
    expect(boosterSplit(single)).toEqual([2]);
    expect(boosterPerRowOf(single, 0)).toBe(2);
  });

  it('unbrauchbare Anzahl: wie ein Einzelpack, ohne Absturz', () => {
    for (const subPacks of [0, 5, 1.5, NaN, -1, 1e9])
      expect(boosterSplit(withBooster({ series: 2, cellsPerRow: 2, position: 'plus', subPacks })), String(subPacks)).toEqual([2]);
  });
});

describe('Prüfung (§3.5)', () => {
  it('Anzahl der Einzelpacks', () => {
    for (const subPacks of [0, 5, 1.5, NaN])
      expect(errorsOf(withBooster({ series: 2, cellsPerRow: 2, position: 'plus', subPacks })), String(subPacks)).toEqual([
        'Booster: 1–4 Einzelpacks erlaubt.',
      ]);
  });

  it('zu wenige Gruppen für die Einzelpacks', () => {
    expect(errorsOf(withBooster({ series: 1, cellsPerRow: 1, position: 'plus', subPacks: 2 }, { series: 19 }))).toEqual([
      'Booster: zu wenige Seriengruppen für die Anzahl der Einzelpacks.',
    ]);
  });

  it('Aufteilung passt nicht zur Gruppenzahl', () => {
    const b: BoosterSpec = { series: 4, cellsPerRow: 3, position: 'plus', subPacks: 2, seriesSplit: [3, 2], cellsPerRowSplit: [3, 2] };
    expect(errorsOf(withBooster(b, { cellsPerRow: 8 }))).toEqual(['Booster: Aufteilung 3+2 ergibt nicht 4S.']);
  });

  it('Einzelpack ohne Gruppe', () => {
    const b: BoosterSpec = { series: 4, cellsPerRow: 4, position: 'plus', subPacks: 2, seriesSplit: [4, 0] };
    expect(errorsOf(withBooster(b, { cellsPerRow: 8 }))).toEqual(['Booster: jeder Einzelpack braucht mindestens 1 Seriengruppe.']);
  });

  it('Zellzahl passt nicht zu Zellen je Lage', () => {
    expect(errorsOf(withBooster({ series: 4, cellsPerRow: 3, position: 'plus', subPacks: 2 }, { cellsPerRow: 8 }))).toEqual([
      'Booster-Einzelpack 1: 4 Zellen lassen sich nicht in volle Lagen à 3 aufteilen.',
      'Booster-Einzelpack 2: 4 Zellen lassen sich nicht in volle Lagen à 3 aufteilen.',
    ]);
    // ein Einzelpack: die bisherige Meldung, wortgleich
    const old = ['Booster: Zellzahl passt nicht zu Zellen je Lage.'];
    expect(errorsOf(withBooster({ series: 2, cellsPerRow: 3, position: 'plus' }))).toEqual(old);
    expect(errorsOf(withBooster({ series: 2, cellsPerRow: 3, position: 'plus', subPacks: 1 }))).toEqual(old);
  });

  it('Zellen je Lage je Einzelpack: nur ganze Zahlen ≥ 1, 0 = Standard', () => {
    expect(
      errorsOf(withBooster({ series: 2, cellsPerRow: 1, position: 'plus', subPacks: 2, cellsPerRowSplit: [1.5, 1] })),
    ).toContain('Booster: Zellen je Lage je Einzelpack müssen ganze Zahlen ≥ 1 sein (0 = Standard).');
    expect(errorsOf(withBooster({ series: 2, cellsPerRow: 1, position: 'plus', subPacks: 2, cellsPerRowSplit: [0, 1] }))).toEqual([]);
  });

  it('Wabe mit mehr als 2 Lagen nur im Booster: Warnung, genau einmal', () => {
    const warn = 'Wabe mit mehr als 2 Lagen: Verschaltung als Spalten-Serpentine – bitte Schweißplan prüfen.';
    const onlyBooster = solve(withBooster({ series: 3, cellsPerRow: 2, position: 'plus' }, { series: 21 }));
    expect(onlyBooster.issues.filter((i) => i.msg === warn)).toHaveLength(1);
    const both = solve(withBooster({ series: 3, cellsPerRow: 2, position: 'plus' }, { series: 21, cellsPerRow: 6 }));
    expect(both.issues.filter((i) => i.msg === warn)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Test laufen lassen – muss fehlschlagen**

Run: `npx vitest run tests/booster-split.test.ts`
Expected: FAIL. Die Aufteilungs-Tests mit `TypeError: boosterSplit is not a function`, die Prüfungs-Tests mit leeren Fehlerlisten bzw. fehlender Warnung.

- [ ] **Step 3: Typen ergänzen**

In `src/core/types.ts` das Interface `BoosterSpec` ersetzen:

```ts
export interface BoosterSpec {
  /** z. B. 2 bei 18S + 2S */
  series: number;
  /** Zellen je Lage; bei mehreren Einzelpacks der Wert für alle ohne eigenen Eintrag in cellsPerRowSplit */
  cellsPerRow: number;
  /** hängt am Hauptplus- oder am Hauptminus-Ende */
  position: 'plus' | 'minus';
  /** Anzahl Einzelpacks, Stirnseite 1 -> 2 (hintereinander in einem Gehäuse). Fehlt der Wert, gilt 1. */
  subPacks?: number;
  /** optional: S je Einzelpack. Fehlt der Wert oder passt die Länge nicht: gleichmäßig, Rest nach vorne */
  seriesSplit?: number[];
  /** optional: Zellen je Lage je Einzelpack (0 = cellsPerRow) */
  cellsPerRowSplit?: number[];
}
```

- [ ] **Step 4: Aufteilung und Prüfung umsetzen**

In `src/core/validate.ts`:

1. Import erweitern: `import type { BatteryConfig, BoosterSpec, Cell, Issue, Layout } from './types';`

2. Direkt **nach** den drei Zeilen `const isInt …`, `const isPos …`, `const isNonNeg …` einfügen:

```ts
/** Anzahl Einzelpacks des Boosters; eine unbrauchbare Angabe zählt wie 1 (validateInputs meldet sie). */
function boosterCount(b: BoosterSpec): number {
  const k = b.subPacks ?? 1;
  return isInt(k) && k >= LIMITS.subPacks.min && k <= LIMITS.subPacks.max ? k : 1;
}

/** S je Einzelpack des Boosters, Stirnseite 1 -> 2 (Plan 07 §3.1). Ohne Booster leer. */
export function boosterSplit(cfg: BatteryConfig): number[] {
  const b = cfg.booster;
  if (!b) return [];
  const k = boosterCount(b);
  if (k === 1) return [b.series];
  if (b.seriesSplit && b.seriesSplit.length === k) return b.seriesSplit;
  const base = Math.floor(b.series / k);
  const rest = b.series - base * k;
  return Array.from({ length: k }, (_, i) => base + (i < rest ? 1 : 0));
}

/** Zellen je Lage für den Einzelpack des Boosters an Position pos (Stirnseite 1 -> 2). */
export function boosterPerRowOf(cfg: BatteryConfig, pos: number): number {
  const b = cfg.booster!;
  const k = boosterCount(b);
  const o = b.cellsPerRowSplit;
  return k > 1 && o && o.length === k && o[pos] > 0 ? o[pos] : b.cellsPerRow;
}
```

3. In `validateInputs` den Block `if (cfg.booster) { … }` ersetzen:

```ts
  if (cfg.booster) {
    const b = cfg.booster;
    if (!isInt(b.series) || b.series < 1 || b.series >= cfg.series) err('Booster S muss ≥ 1 und kleiner als S gesamt sein.');
    if (!isInt(b.cellsPerRow) || b.cellsPerRow < 1) err('Booster: Zellen je Lage muss eine ganze Zahl ≥ 1 sein.');
    const k = b.subPacks ?? 1;
    if (!isInt(k) || k < LIMITS.subPacks.min || k > LIMITS.subPacks.max)
      err(`Booster: ${LIMITS.subPacks.min}–${LIMITS.subPacks.max} Einzelpacks erlaubt.`);
    if (k > 1 && b.seriesSplit && b.seriesSplit.length === k && b.seriesSplit.some((s) => !isInt(s) || s < 1))
      err('Booster: jeder Einzelpack braucht mindestens 1 Seriengruppe.');
    if (k > 1 && b.cellsPerRowSplit && b.cellsPerRowSplit.some((n) => !Number.isFinite(n) || (n !== 0 && (!isInt(n) || n < 1))))
      err('Booster: Zellen je Lage je Einzelpack müssen ganze Zahlen ≥ 1 sein (0 = Standard).');
  }
```

4. In `validateConfig` die zwei Zeilen

```ts
  if (cfg.booster && layerPlan(cfg, cfg.booster.series * cfg.parallel, cfg.booster.cellsPerRow) === null)
    out.push({ level: 'error', msg: 'Booster: Zellzahl passt nicht zu Zellen je Lage.' });
```

ersetzen durch:

```ts
  const bSplit = boosterSplit(cfg);
  if (cfg.booster && bSplit.length === 1) {
    if (layerPlan(cfg, cfg.booster.series * cfg.parallel, cfg.booster.cellsPerRow) === null)
      out.push({ level: 'error', msg: 'Booster: Zellzahl passt nicht zu Zellen je Lage.' });
  } else if (cfg.booster) {
    const b = cfg.booster;
    if (b.series < bSplit.length)
      out.push({ level: 'error', msg: 'Booster: zu wenige Seriengruppen für die Anzahl der Einzelpacks.' });
    if (bSplit.reduce((a, s) => a + s, 0) !== b.series)
      out.push({ level: 'error', msg: `Booster: Aufteilung ${bSplit.join('+')} ergibt nicht ${b.series}S.` });
    bSplit.forEach((s, i) => {
      const pr = boosterPerRowOf(cfg, i);
      if (layerPlan(cfg, s * cfg.parallel, pr) === null)
        out.push({
          level: 'error',
          msg: `Booster-Einzelpack ${i + 1}: ${s * cfg.parallel} Zellen lassen sich nicht in volle Lagen à ${pr} aufteilen.`,
        });
    });
  }
```

5. In `validateConfig` die Zeilen

```ts
  const layers = Math.max(...split.map((s, i) => Math.ceil((s * cfg.parallel) / perRowOf(cfg, i))));
  if (cfg.stacking === 'honeycomb' && layers > 2)
```

ersetzen durch (der Hauptpack wird getrennt gerechnet, damit ein `NaN` aus dem Booster seine Warnung nicht verschluckt):

```ts
  const layers = Math.max(...split.map((s, i) => Math.ceil((s * cfg.parallel) / perRowOf(cfg, i))));
  const boosterLayers = Math.max(0, ...bSplit.map((s, i) => Math.ceil((s * cfg.parallel) / boosterPerRowOf(cfg, i))));
  if (cfg.stacking === 'honeycomb' && (layers > 2 || boosterLayers > 2))
```

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run tests/booster-split.test.ts`
Expected: PASS, 10 Tests.

- [ ] **Step 6: Prüfen**

Run: `npx prettier --write src/core/types.ts src/core/validate.ts tests/booster-split.test.ts && npm test && npm run build && npm run lint`
Expected: alle Tests grün (darunter `fixtures.test.ts` und `reference-equivalence.test.ts` unverändert), Build und Lint ohne Fehler.

---

### Task 2: Kern – Kette des Boosters im Solver

Spec §3.2, §3.3, §3.4, §3.6.

**Files:**
- Modify: `src/core/solver.ts` (Funktion `solve`, neu `searchChain`, `boosterLabel`)
- Test: `tests/booster-split.test.ts`

**Interfaces:**
- Consumes: `boosterSplit(cfg)`, `boosterPerRowOf(cfg, pos)` aus Aufgabe 1.
- Produces:
  - `boosterLabel(parallel: number, k: number, pos: number, series: number): string`
  - `solve(cfg)` liefert bei `k > 1` Einzelpacks die Packs `BOOST0 … BOOST(k−1)` mit `role: 'booster'`, `position: 0 … k−1`, Bezeichnung `Booster A (1S2P)` …; bei `k = 1` wie bisher `BOOST`, `position: -1`.
  - `Layout.bridges` in Serienreihenfolge; Booster-Brücken haben `kind: 'inner' | 'outer'`.

- [ ] **Step 1: Tests ergänzen**

In `tests/booster-split.test.ts` die Importe ersetzen:

```ts
import type { BatteryConfig, BoosterSpec, SubPack } from '../src/core';
import { DEFAULT_CONFIG, balanceTaps, boosterPerRowOf, boosterSplit, solve } from '../src/core';
```

und am Dateiende anhängen:

```ts
describe('Kette des Boosters (§3.3, §3.6)', () => {
  const pick = (p: SubPack) => ({
    key: p.key,
    label: p.label,
    role: p.role,
    position: p.position,
    series: p.series,
    perRow: p.perRow,
    layers: p.layers,
    dir: p.dir,
    start: `${p.startFace}/${p.startSide}`,
    end: `${p.endFace}/${p.endSide}`,
  });
  const mainOuter = 'Brücke P0→P1 (B8) liegt nicht zwischen den Packs: gerade Gruppenzahl → Kabel/Brücke außen herum (links).';
  const A = solve(withBooster({ series: 2, cellsPerRow: 1, position: 'plus', subPacks: 2 }));

  it('A – 18S2P + 2S2P als 1 + 1: Brücke innen', () => {
    expect(A.issues).toEqual([]);
    expect(A.chain).toEqual(['P0', 'P1', 'BOOST0', 'BOOST1']);
    expect(A.packs.map((p) => p.key)).toEqual(['P0', 'P1', 'BOOST0', 'BOOST1']);
    const [, , a, b] = A.packs;
    expect(pick(a)).toEqual({
      key: 'BOOST0',
      label: 'Booster A (1S2P)',
      role: 'booster',
      position: 0,
      series: 1,
      perRow: 1,
      layers: 2,
      dir: 'LR',
      start: 'V/L',
      end: 'H/R',
    });
    expect(pick(b)).toEqual({
      key: 'BOOST1',
      label: 'Booster B (1S2P)',
      role: 'booster',
      position: 1,
      series: 1,
      perRow: 1,
      layers: 2,
      dir: 'RL',
      start: 'V/R',
      end: 'H/L',
    });
    expect(a.groups).toEqual([{ s: 19, cells: ['L1-0', 'L0-0'], minusFace: 'V' }]);
    expect(b.groups).toEqual([{ s: 20, cells: ['L0-0', 'L1-0'], minusFace: 'V' }]);
    expect(a.width).toBeCloseTo(32.25, 6);
    expect(a.height).toBeCloseTo(40.1928, 3);
    expect(A.bridges).toEqual([
      { from: 'P0', to: 'P1', node: 9, kind: 'inner', fromFace: 'H', toFace: 'V', fromSide: 'L', toSide: 'L' },
      { from: 'P1', to: 'BOOST0', node: 18, kind: 'cable', fromFace: 'H', toFace: 'V', fromSide: 'R', toSide: 'L' },
      { from: 'BOOST0', to: 'BOOST1', node: 19, kind: 'inner', fromFace: 'H', toFace: 'V', fromSide: 'R', toSide: 'R' },
    ]);
  });

  it('B – 16S2P + 4S2P als 2 + 2: Brücke außen, mit Hinweis', () => {
    const L = solve(withBooster({ series: 4, cellsPerRow: 2, position: 'plus', subPacks: 2 }, { cellsPerRow: 8 }));
    const [, , a, b] = L.packs;
    expect(pick(a)).toMatchObject({ key: 'BOOST0', label: 'Booster A (2S2P)', dir: 'LR', start: 'V/L', end: 'V/R' });
    expect(pick(b)).toMatchObject({ key: 'BOOST1', label: 'Booster B (2S2P)', dir: 'RL', start: 'H/R', end: 'H/L' });
    expect(a.groups).toEqual([
      { s: 17, cells: ['L1-0', 'L0-0'], minusFace: 'V' },
      { s: 18, cells: ['L1-1', 'L0-1'], minusFace: 'H' },
    ]);
    expect(b.groups).toEqual([
      { s: 19, cells: ['L0-1', 'L1-1'], minusFace: 'H' },
      { s: 20, cells: ['L0-0', 'L1-0'], minusFace: 'V' },
    ]);
    expect(a.width).toBeCloseTo(53.95, 6);
    expect(L.bridges.slice(1)).toEqual([
      { from: 'P1', to: 'BOOST0', node: 16, kind: 'cable', fromFace: 'H', toFace: 'V', fromSide: 'R', toSide: 'L' },
      { from: 'BOOST0', to: 'BOOST1', node: 18, kind: 'outer', fromFace: 'V', toFace: 'H', fromSide: 'R', toSide: 'R' },
    ]);
    expect(L.issues.map((i) => i.msg)).toEqual([
      mainOuter,
      'Brücke BOOST0→BOOST1 (B18) liegt nicht zwischen den Packs: gerade Gruppenzahl → Kabel/Brücke außen herum (rechts).',
    ]);
    expect(L.cost).toBe(201);
  });

  it('C – 4S als 3 + 1: Brücke innen, ungleich breit', () => {
    const b4: BoosterSpec = { series: 4, cellsPerRow: 3, position: 'plus', subPacks: 2, seriesSplit: [3, 1], cellsPerRowSplit: [3, 1] };
    const L = solve(withBooster(b4, { cellsPerRow: 8 }));
    const [, , a, b] = L.packs;
    expect(pick(a)).toMatchObject({ label: 'Booster A (3S2P)', perRow: 3, dir: 'LR', start: 'V/L', end: 'H/R' });
    expect(pick(b)).toMatchObject({ label: 'Booster B (1S2P)', perRow: 1, dir: 'RL', start: 'V/R', end: 'H/L' });
    expect(a.groups.map((g) => g.s)).toEqual([17, 18, 19]);
    expect(b.groups.map((g) => g.s)).toEqual([20]);
    expect(a.width).toBeCloseTo(75.65, 6);
    expect(b.width).toBeCloseTo(32.25, 6);
    expect(L.bridges.at(-1)).toEqual({
      from: 'BOOST0',
      to: 'BOOST1',
      node: 19,
      kind: 'inner',
      fromFace: 'H',
      toFace: 'V',
      fromSide: 'R',
      toSide: 'R',
    });
    expect(L.issues.map((i) => i.msg)).toEqual([mainOuter]);
  });

  it('D – Booster am Hauptminus: Kette beginnt am Booster, Kabel vom letzten Einzelpack', () => {
    const L = solve(withBooster({ series: 2, cellsPerRow: 1, position: 'minus', subPacks: 2 }));
    expect(L.chain).toEqual(['BOOST0', 'BOOST1', 'P0', 'P1']);
    expect(L.packs.map((p) => p.key)).toEqual(['P0', 'P1', 'BOOST0', 'BOOST1']);
    const [p0, p1, a, b] = L.packs;
    expect(a.groups.map((g) => g.s)).toEqual([1]);
    expect(b.groups.map((g) => g.s)).toEqual([2]);
    expect([p0.groups[0].s, p1.groups.at(-1)!.s]).toEqual([3, 20]);
    expect(L.bridges).toEqual([
      { from: 'BOOST0', to: 'BOOST1', node: 1, kind: 'inner', fromFace: 'H', toFace: 'V', fromSide: 'R', toSide: 'R' },
      { from: 'BOOST1', to: 'P0', node: 2, kind: 'cable', fromFace: 'H', toFace: 'V', fromSide: 'L', toSide: 'R' },
      { from: 'P0', to: 'P1', node: 11, kind: 'inner', fromFace: 'H', toFace: 'V', fromSide: 'L', toSide: 'L' },
    ]);
  });

  it('3 Einzelpacks 2 + 1 + 1: erste Brücke außen, zweite innen', () => {
    const b3: BoosterSpec = { series: 4, cellsPerRow: 2, position: 'plus', subPacks: 3, cellsPerRowSplit: [2, 1, 1] };
    const L = solve(withBooster(b3, { cellsPerRow: 8 }));
    expect(L.packs.slice(2).map((p) => p.label)).toEqual(['Booster A (2S2P)', 'Booster B (1S2P)', 'Booster C (1S2P)']);
    expect(L.bridges.slice(2).map((b) => `${b.from}>${b.to} B${b.node} ${b.kind}`)).toEqual([
      'BOOST0>BOOST1 B18 outer',
      'BOOST1>BOOST2 B19 inner',
    ]);
  });

  it('ein Einzelpack: dasselbe Layout wie ohne das Feld', () => {
    for (const position of ['plus', 'minus'] as const) {
      const base = withBooster({ series: 2, cellsPerRow: 2, position });
      const ref = solve(base);
      const one = solve({ ...base, booster: { ...base.booster!, subPacks: 1 } });
      expect({ ...one, config: null }).toEqual({ ...ref, config: null });
      expect(ref.packs.at(-1)).toMatchObject({ key: 'BOOST', label: 'Booster 2S2P', position: -1, dir: 'LR', startFace: 'V' });
    }
  });

  it('Kosten zählen nur den Hauptpack', () => {
    expect(A.cost).toBe(solve(withBooster({ series: 2, cellsPerRow: 2, position: 'plus' })).cost);
  });

  it('Balancer-Abgriffe laufen durch; der Brückenknoten hat an beiden Einzelpacks eine Nummer', () => {
    const taps = balanceTaps(A);
    const spots = (n: number) => taps[n].spots.map((s) => `${s.pack}/${s.face}/${s.kind}`);
    expect(taps.map((t) => t.node)).toEqual([...Array(21).keys()]);
    expect(spots(18)).toEqual(['P1/H/end', 'BOOST0/V/start']);
    expect(spots(19)).toEqual(['BOOST0/H/end', 'BOOST1/V/start']);
    expect(spots(20)).toEqual(['BOOST1/H/end']);
  });
});
```

- [ ] **Step 2: Tests laufen lassen – müssen fehlschlagen**

Run: `npx vitest run tests/booster-split.test.ts`
Expected: FAIL in „Kette des Boosters“: Es gibt nur einen Pack `BOOST` (z. B. `expected [ 'P0', 'P1', 'BOOST' ] to deeply equal [ 'P0', 'P1', 'BOOST0', 'BOOST1' ]`). „ein Einzelpack“ und „Kosten zählen nur den Hauptpack“ bestehen schon; sie sichern den Umbau ab.

- [ ] **Step 3: Solver umbauen**

In `src/core/solver.ts`:

1. Importe ersetzen:

```ts
import { otherFace, pitches } from './geometry';
import type { BatteryConfig, Bridge, Face, Layout, RunDir, Side, Strip, SubPack } from './types';
import { boosterPerRowOf, boosterSplit, checkAdjacency, perRowOf, seriesSplit, validateConfig } from './validate';
import { buildSubPack } from './wiring';
```

2. Nach `subPackLabel` einfügen:

```ts
/** Bezeichnung eines Einzelpacks des Boosters (Plan 07 §3.2): ungeteilt „Booster 2S2P“, geteilt „Booster A (1S2P)“ … */
export function boosterLabel(parallel: number, k: number, pos: number, series: number): string {
  if (k === 1) return `Booster ${series}S${parallel}P`;
  return `Booster ${String.fromCharCode(65 + pos)} (${series}S${parallel}P)`;
}

/** Ein Teilpack der Kette, bevor Richtung und Startfläche feststehen */
interface ChainPack {
  key: string;
  label: string;
  position: number;
  series: number;
  perRow: number;
}

interface ChainSpec {
  role: 'main' | 'booster';
  /** Teilpacks in Serienreihenfolge */
  packs: ChainPack[];
  /** Anzahl Seriengruppen vor der Kette */
  sStart: number;
  /** Wunsch für den Kettenanfang */
  startSide: Side;
  startFace: Face;
  /** Wunsch für das Kettenende; null = kein Wunsch */
  endSide: Side | null;
  endFace: Face | null;
}

interface ChainResult {
  cost: number;
  /** in Serienreihenfolge */
  packs: SubPack[];
  bridges: Bridge[];
}

/**
 * Probiert für jeden Teilpack der Kette alle Kombinationen aus Serienrichtung (LR/RL) und
 * Startseite (V/H) und nimmt die mit den geringsten "Kosten" (siehe COST).
 * Bei gleichen Kosten gewinnt die zuerst gefundene Variante.
 */
function searchChain(cfg: BatteryConfig, spec: ChainSpec): ChainResult {
  const N = spec.packs.length;
  let best: ChainResult | null = null;
  const combos = Math.pow(4, N);
  for (let m = 0; m < combos; m++) {
    let s = spec.sStart;
    let cost = 0;
    const packs: SubPack[] = [];
    for (let ci = 0; ci < N; ci++) {
      const p = spec.packs[ci];
      const code = (m >> (2 * ci)) & 3;
      const dir: RunDir = code & 1 ? 'LR' : 'RL';
      const startFace: Face = code & 2 ? 'H' : 'V';
      const sp = buildSubPack(cfg, {
        key: p.key,
        role: spec.role,
        position: p.position,
        label: p.label,
        series: p.series,
        perRow: p.perRow,
        dir,
        startFace,
        sStart: s,
      });
      s += p.series;
      packs.push(sp);
      if (sp.startsOnTop) cost += COST.startsOnTop;
    }
    const first = packs[0];
    const last = packs[N - 1];
    if (first.startSide !== spec.startSide) cost += COST.minusSide;
    if (first.startFace !== spec.startFace) cost += COST.minusFace;
    if (spec.endSide !== null && last.endSide !== spec.endSide) cost += COST.plusSide;
    if (spec.endFace !== null && last.endFace !== spec.endFace) cost += COST.plusFace;
    const bridges: Bridge[] = [];
    for (let i = 0; i + 1 < N; i++) {
      const a = packs[i];
      const b = packs[i + 1];
      const toward: Face = b.position > a.position ? 'H' : 'V';
      let kind: Bridge['kind'] = 'inner';
      if (a.endFace !== toward) {
        cost += COST.bridgeEnd;
        kind = 'outer';
      }
      if (b.startFace !== otherFace(toward)) {
        cost += COST.bridgeEnd;
        kind = 'outer';
      }
      if (a.endSide !== b.startSide) cost += COST.bridgeCross;
      bridges.push({
        from: a.key,
        to: b.key,
        node: a.groups[a.groups.length - 1].s,
        kind,
        fromFace: a.endFace,
        toFace: b.startFace,
        fromSide: a.endSide,
        toSide: b.startSide,
      });
    }
    if (!best || cost < best.cost) best = { cost, packs, bridges };
  }
  return best!;
}
```

3. Den Kommentarblock über `solve` und die ganze Funktion `solve` ersetzen:

```ts
/**
 * Löst die Kette des Hauptpacks und – falls vorhanden – die des Boosters (Fachkonzept §5, Plan 07 §3.3).
 * Die Kosten des Layouts sind die des Hauptpacks.
 */
export function solve(cfg: BatteryConfig): Layout {
  const issues = validateConfig(cfg);
  if (issues.some((i) => i.level === 'error'))
    return { config: cfg, pitches: pitches(cfg), packs: [], chain: [], bridges: [], totalS: cfg.series, cost: Infinity, issues };
  const split = seriesSplit(cfg);
  const N = cfg.subPacks;
  const chainPos = cfg.mainMinus.end === 'V' ? [...Array(N).keys()] : [...Array(N).keys()].reverse();
  const b = cfg.booster;
  const boostFirst = !!b && b.position === 'minus';

  const main = searchChain(cfg, {
    role: 'main',
    packs: chainPos.map((pos) => ({
      key: `P${pos}`,
      label: subPackLabel(N, pos),
      position: pos,
      series: split[pos],
      perRow: perRowOf(cfg, pos),
    })),
    sStart: boostFirst ? b.series : 0,
    startSide: cfg.mainMinus.side,
    // vorderster/hinterster Teilpack: Außenfläche
    startFace: cfg.mainMinus.end,
    endSide: cfg.mainPlus.side,
    // Hauptplus gehört auf die Außenfläche des letzten Teilpacks (bei N=1: auf die gewünschte Stirnseite).
    // Wünscht der Nutzer bei N>1 Plus und Minus auf derselben Stirnseite, ist das nur per Kabel möglich
    // -> Warnung aus validateConfig, Plus bleibt außen am letzten Teilpack.
    endFace: N === 1 ? cfg.mainPlus.end : otherFace(cfg.mainMinus.end),
  });

  const packs = [...main.packs].sort((x, y) => x.position - y.position);
  let chain = main.packs.map((p) => p.key);
  let bridges = main.bridges;
  if (b) {
    const bSplit = boosterSplit(cfg);
    const k = bSplit.length;
    // Kette des Boosters: beginnt links an Stirnseite 1, endet an Stirnseite 2 des letzten Einzelpacks (Plan 07 §3.3).
    // Bei k = 1 gewinnt damit immer LR/V – der bisherige feste Aufbau.
    const boost = searchChain(cfg, {
      role: 'booster',
      packs: bSplit.map((s, i) => ({
        key: k === 1 ? 'BOOST' : `BOOST${i}`,
        label: boosterLabel(cfg.parallel, k, i, s),
        position: k === 1 ? -1 : i,
        series: s,
        perRow: boosterPerRowOf(cfg, i),
      })),
      sStart: boostFirst ? 0 : cfg.series - b.series,
      startSide: 'L',
      startFace: 'V',
      endSide: null,
      endFace: k === 1 ? null : 'H',
    });
    packs.push(...boost.packs);
    const keys = boost.packs.map((p) => p.key);
    // Kabel: Ende der vorderen Kette -> Anfang der hinteren
    const [from, to] = boostFirst ? [boost.packs[k - 1], main.packs[0]] : [main.packs[N - 1], boost.packs[0]];
    const cable: Bridge = {
      from: from.key,
      to: to.key,
      node: boostFirst ? b.series : cfg.series - b.series,
      kind: 'cable',
      fromFace: from.endFace,
      toFace: to.startFace,
      fromSide: from.endSide,
      toSide: to.startSide,
    };
    chain = boostFirst ? [...keys, ...chain] : [...chain, ...keys];
    bridges = boostFirst ? [...boost.bridges, cable, ...bridges] : [...bridges, cable, ...boost.bridges];
  }
  if (main.cost >= COST.warnThreshold)
    issues.push({
      level: 'warning',
      msg: 'Gewünschte Lage von Hauptplus/-minus ist mit dieser Aufteilung nicht direkt erreichbar – Anschluss wird per Kabel umgelegt.',
    });
  bridges
    .filter((br) => br.kind === 'outer')
    .forEach((br) =>
      issues.push({
        level: 'info',
        msg: `Brücke ${br.from}→${br.to} (B${br.node}) liegt nicht zwischen den Packs: gerade Gruppenzahl → Kabel/Brücke außen herum (${br.fromSide === 'L' ? 'links' : 'rechts'}).`,
      }),
    );
  const layout: Layout = {
    config: cfg,
    pitches: pitches(cfg),
    packs,
    chain,
    bridges,
    totalS: cfg.series,
    cost: main.cost,
    issues,
  };
  issues.push(...checkAdjacency(layout));
  return layout;
}
```

`balanceTaps`, `TapSpot`, `BalanceTap`, `stripRole` und `COST` bleiben unverändert.

4. In `src/core/types.ts` den Kommentar an `SubPack.key` und `SubPack.position` anpassen:

```ts
  /** 'P0', 'P1', … (Hauptpack, vorne->hinten); Booster: 'BOOST' oder geteilt 'BOOST0', 'BOOST1', … */
  key: string;
  role: 'main' | 'booster';
  /** physische Position vorne->hinten; ungeteilter Booster: -1, Einzelpacks des Boosters: 0 … k−1 (Stirnseite 1 -> 2) */
  position: number;
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run tests/booster-split.test.ts`
Expected: PASS, 18 Tests.

- [ ] **Step 5: Prüfen**

Run: `npx prettier --write src/core/solver.ts src/core/types.ts tests/booster-split.test.ts && npm test && npm run build && npm run lint`
Expected: alles grün. `fixtures.test.ts` (12 Fixtures, darunter 20S2P-Split) und `reference-equivalence.test.ts` laufen unverändert durch – sie belegen, dass der Umbau der Suche den Hauptpack und den ungeteilten Booster nicht verändert hat.

---

### Task 3: Zeichenmodelle – Texte, Draufsicht, Gesamtmaß

Spec §6. Nur die reinen Modelle (`src/view`, `src/core/stats.ts`); die React-Komponenten folgen in Aufgabe 6.

**Files:**
- Modify: `src/view/connections.ts`
- Modify: `src/view/assumptions.ts`
- Modify: `src/view/topModel.ts`
- Modify: `src/core/stats.ts` (`Dimensions`, `dimensions`)
- Test: `tests/view.test.ts`, `tests/robustness.test.ts`

**Interfaces:**
- Consumes: Layout aus Aufgabe 2 (`BOOST0…`, `role`, `position`, Brücken in Serienreihenfolge).
- Produces:
  - `shortName(p)`: `'Booster'` für `BOOST`, sonst die Bezeichnung ohne Klammer (`'Booster A'`, `'Pack A'`).
  - `TopPack.compact: boolean` – schmaler Einzelpack eines geteilten Boosters (Kurzname, keine Zeile „Serienrichtung“).
  - `Dimensions.booster?: { width: number; height: number; length: number }` – nur gesetzt, wenn es einen Booster gibt.

- [ ] **Step 1: Tests schreiben**

In `tests/view.test.ts` die Importzeilen ersetzen:

```ts
import type { SubPack } from '../src/core';
import { DEFAULT_CONFIG, dimensions, nickelBom, nickelTotals, pitches, placeCells, solve, stripPosition } from '../src/core';
import { assumptions } from '../src/view/assumptions';
import { connectionOf } from '../src/view/connections';
import { faceModel, faceTitle, stagger } from '../src/view/faceModel';
import { topModel } from '../src/view/topModel';
```

und am Dateiende anhängen:

```ts
describe('Geteilter Booster (Plan 07 §6)', () => {
  const A = solve({ ...DEFAULT_CONFIG, series: 20, booster: { series: 2, cellsPerRow: 1, position: 'plus', subPacks: 2 } });
  const B = solve({
    ...DEFAULT_CONFIG,
    series: 20,
    cellsPerRow: 8,
    booster: { series: 4, cellsPerRow: 2, position: 'plus', subPacks: 2 },
  });
  const C = solve({
    ...DEFAULT_CONFIG,
    series: 20,
    cellsPerRow: 8,
    booster: { series: 4, cellsPerRow: 3, position: 'plus', subPacks: 2, seriesSplit: [3, 1], cellsPerRowSplit: [3, 1] },
  });
  const [, mainB, a, b] = A.packs;
  const texts = (p: SubPack) => p.strips.map((s) => connectionOf(A, p, s)?.text).filter(Boolean);

  it('Anschlusstexte: Eingang, Brücke, Systemplus', () => {
    expect(texts(a)).toEqual(['EINGANG von Pack B + (B18)', 'BRÜCKE → Booster B (B19)']);
    expect(texts(b)).toEqual(['BRÜCKE ← Booster A (B19)', 'SYSTEM + (B20)']);
    expect(texts(mainB).at(-1)).toBe('HAUPT + → Booster (B18)');
  });

  it('Titel der Stirnseiten', () => {
    expect(faceTitle(a, 'V')).toBe('Booster A (1S2P) – Stirnseite 1 (Blick von außen)');
    expect(faceTitle(b, 'H')).toBe('Booster B (1S2P) – Stirnseite 2 (Blick von außen)');
  });

  it('Annahmen: Brücke im Booster und Gehäuse-Satz', () => {
    expect(assumptions(A)).toContain('Brücke B19 innen zwischen Booster A und Booster B, rechts.');
    expect(assumptions(A)).toContain('Booster: 2 Einzelpacks hintereinander in einem Gehäuse, Isolierlage dazwischen.');
    expect(assumptions(B)).toContain(
      'Brücke B18 außen herum (rechts): gerade Gruppenzahl, Kabel von Booster A-Stirnseite 1 nach Booster B-Stirnseite 2.',
    );
    const single = solve({ ...DEFAULT_CONFIG, series: 20, booster: { series: 2, cellsPerRow: 2, position: 'plus' } });
    expect(assumptions(single).some((t) => t.startsWith('Booster: '))).toBe(false);
  });

  it('Draufsicht: Blöcke hintereinander, Brücke innen, Kabel am Anfang, SYSTEM-Fahne am Ende der Kette', () => {
    const m = topModel(A);
    const [, pb, ta, tb] = m.packs;
    expect([ta.key, tb.key]).toEqual(['BOOST0', 'BOOST1']);
    expect(ta.booster && tb.booster).toBe(true);
    expect(ta.y).toBeGreaterThan(pb.y + pb.l);
    expect(tb.y).toBeGreaterThan(ta.y + ta.l);
    expect(tb.x + tb.w).toBeCloseTo(ta.x + ta.w, 9);
    expect(m.links.filter((l) => l.kind === 'inner').map((l) => l.lines[0])).toEqual(['BRÜCKE B9', 'BRÜCKE B19']);
    const cable = m.links.find((l) => l.kind === 'cable')!;
    expect(cable.lines[0]).toBe('HAUPT + (B18) → Booster −');
    // Kabel an der Vorderkante des ersten Einzelpacks, links (Start V/L)
    expect(cable.points.at(-1)!.y).toBeCloseTo(ta.y, 9);
    expect(cable.points.at(-1)!.x).toBeLessThan(ta.x + ta.w / 2);
    // SYSTEM-Fahne an der Hinterkante des letzten Einzelpacks, links (Ende H/L)
    const sys = m.flags.find((f) => f.text === 'SYSTEM + (B20)')!;
    expect(sys.y1).toBeCloseTo(tb.y + tb.l, 9);
    expect(sys.x).toBeLessThan(tb.x + tb.w / 2);
    expect(m.flags.map((f) => f.text)).toEqual(['HAUPT −', 'SYSTEM + (B20)']);
  });

  it('Draufsicht: Brücke außen im Booster', () => {
    const outer = topModel(B).links.filter((l) => l.kind === 'outer');
    expect(outer.map((l) => l.lines[0])).toEqual(['BRÜCKE B8 (Kabel links außen)', 'BRÜCKE B18 (Kabel rechts außen)']);
  });

  it('Draufsicht: ungleich breite Einzelpacks bündig wie eingestellt; schmaler Block mit Kurzname', () => {
    const right = topModel(C, 'right').packs.slice(2);
    expect(right[0].x + right[0].w).toBeCloseTo(right[1].x + right[1].w, 9);
    const left = topModel(C, 'left').packs.slice(2);
    expect(left[0].x).toBeCloseTo(left[1].x, 9);
    expect(right[0]).toMatchObject({ label: 'Booster A (3S2P)', compact: false });
    expect(right[1]).toMatchObject({ label: 'Booster B', compact: true });
    // Hauptpack und ungeteilter Booster bleiben, wie sie sind
    const single = topModel(solve({ ...DEFAULT_CONFIG, series: 20, booster: { series: 2, cellsPerRow: 2, position: 'plus' } }));
    expect(single.packs.map((p) => [p.label, p.compact])).toEqual([
      ['Pack A (vorne)', false],
      ['Pack B (hinten)', false],
      ['Booster 2S2P', false],
    ]);
  });

  // Review Focus 5
  it('Booster breiter als der Hauptpack, am Hauptminus, geteilt: alles liegt im Bild', () => {
    const L = solve({
      ...DEFAULT_CONFIG,
      series: 12,
      subPacks: 1,
      cellsPerRow: 4,
      booster: { series: 8, cellsPerRow: 8, position: 'minus', subPacks: 2 },
    });
    expect(L.packs.map((p) => p.key)).toEqual(['P0', 'BOOST0', 'BOOST1']);
    for (const align of ['left', 'center', 'right'] as const) {
      const m = topModel(L, align);
      const vb = m.viewBox;
      const inX = (x: number) => x >= vb.x - 1e-9 && x <= vb.x + vb.w + 1e-9;
      const inY = (y: number) => y >= vb.y - 1e-9 && y <= vb.y + vb.h + 1e-9;
      for (const p of m.packs) expect(inX(p.x) && inX(p.x + p.w) && inY(p.y) && inY(p.y + p.l), `${align} ${p.key}`).toBe(true);
      for (const l of m.links) for (const q of l.points) expect(inX(q.x) && inY(q.y), `${align} ${l.lines[0]}`).toBe(true);
      for (const f of m.flags) expect(inX(f.x) && inY(f.y1) && inY(f.y2), `${align} ${f.text}`).toBe(true);
    }
  });

  it('Maße: Booster gesamt = Summe der Längen + Zwischenlage', () => {
    const d = dimensions(A);
    expect(d.booster!.length).toBeCloseTo(70.4 + 70.4 + 0.5, 9);
    expect(d.booster!.width).toBeCloseTo(32.25, 6);
    expect(d.booster!.height).toBeCloseTo(40.1928, 3);
    expect(dimensions(L18).booster).toBeUndefined();
  });
});
```

In `tests/robustness.test.ts` in `describe('Robustheit', …)` nach dem ersten `it(…)` einfügen:

```ts
  // Plan 07, Review Focus 2
  it('300 Zufallskonfigurationen mit geteiltem Booster laufen komplett durch', () => {
    const r = rng(7);
    const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
    for (let n = 0; n < 300; n++) {
      const subPacks = 1 + Math.floor(r() * 4);
      const bS = subPacks + Math.floor(r() * 4);
      const split = Array.from({ length: subPacks }, (_, i) => Math.floor(bS / subPacks) + (i < bS % subPacks ? 1 : 0));
      // 2P: 1 Lage -> 2·S Zellen je Lage, 2 Lagen -> S Zellen je Lage; beides geht immer auf
      const perRow = split.map((s) => pick([s, 2 * s]));
      const cfg: BatteryConfig = {
        ...DEFAULT_CONFIG,
        series: 18 + bS,
        stacking: pick(['honeycomb', 'grid'] as const),
        offsetSide: pick(['L', 'R'] as const),
        booster: { series: bS, cellsPerRow: perRow[0], position: pick(['plus', 'minus'] as const), subPacks, cellsPerRowSplit: perRow },
        mainMinus: { end: pick(['V', 'H'] as const), side: pick(['L', 'R'] as const) },
        mainPlus: { end: pick(['V', 'H'] as const), side: pick(['L', 'R'] as const) },
      };
      const L = solve(cfg);
      expect(L.issues.filter((i) => i.level === 'error'), JSON.stringify(cfg.booster)).toEqual([]);
      expect(L.packs.filter((p) => p.role === 'booster')).toHaveLength(subPacks);
      expect(balanceTaps(L).map((t) => t.node)).toEqual([...Array(cfg.series + 1).keys()]);
      assumptions(L);
      topModel(L, pick(['left', 'right', 'center'] as const));
      for (const p of L.packs) for (const f of ['V', 'H'] as const) faceModel(L, p, f);
      const parts = buildParts(L, {
        ...DEFAULT_FISHPAPER,
        outlineFace: pick(['straight', 'tucked'] as const),
        wrapMode: pick(['perPack', 'combined'] as const),
        bridgeCutout: pick(['none', 'notch', 'slot'] as const),
        includeTopBottom: pick([true, false]),
        wrapFold: pick([0, 5]),
      });
      planSheets(parts, pick(['a4', 'a3', 'plotter'] as const), pick(['tile', 'split'] as const));
    }
  });
```

- [ ] **Step 2: Tests laufen lassen – müssen fehlschlagen**

Run: `npx vitest run tests/view.test.ts tests/robustness.test.ts`
Expected: FAIL. Die Draufsicht-Tests und der Robustheitstest mit `TypeError: Cannot read properties of undefined (reading 'x')` aus `topModel` (die Brücke `BOOST0→BOOST1` findet ihre Blöcke nicht); Anschlusstexte mit `'EINGANG von Pack B + (B18)'` ≠ `'BRÜCKE ← Pack B (B18)'` o. ä.; Annahmen ohne den Gehäuse-Satz; `dimensions(A).booster` ist `undefined`. „Titel der Stirnseiten“ besteht bereits (hält die Bezeichnung fest).

- [ ] **Step 3: `connections.ts` anpassen**

`shortName` ersetzen:

```ts
/** "Pack A (vorne)" -> "Pack A", "Booster 2S2P" -> "Booster", "Booster A (1S2P)" -> "Booster A" */
export function shortName(p: SubPack): string {
  return p.key === 'BOOST' ? 'Booster' : p.label.replace(/ \(.*\)$/, '');
}
```

In `connectionOf` die Zeile `const atPlus = br.to === 'BOOST';` ersetzen durch:

```ts
    const atPlus = byKey.get(br.to)!.role === 'booster';
```

- [ ] **Step 4: `assumptions.ts` anpassen**

1. Nach `const faceWord = …` einfügen:

```ts
/** Stirnseiten des Boosters heißen 1 und 2 */
const faceOf = (p: SubPack, f: 'V' | 'H') => (p.role === 'booster' ? `Stirnseite ${f === 'V' ? 1 : 2}` : faceWord(f));
```

2. Die zwei Zeilen

```ts
  const firstKey = layout.chain.find((k) => k !== 'BOOST');
  const first = main.find((p) => p.key === firstKey);
```

ersetzen durch:

```ts
  const byKey = new Map(layout.packs.map((p) => [p.key, p]));
  const first = layout.chain.map((k) => byKey.get(k)!).find((p) => p.role === 'main');
```

3. Im Brücken-Loop den `outer`-Satz ersetzen:

```ts
      out.push(
        `Brücke B${br.node} außen herum (${sideWord(br.fromSide)}): gerade Gruppenzahl, Kabel von ${shortName(from)}-${faceOf(from, br.fromFace)} nach ${shortName(to)}-${faceOf(to, br.toFace)}.`,
      );
```

4. Direkt nach dem Brücken-Loop (vor `if (main.length > 1)`) einfügen:

```ts
  const boost = layout.packs.filter((p) => p.role === 'booster');
  if (boost.length > 1)
    out.push(`Booster: ${boost.length} Einzelpacks hintereinander in einem Gehäuse, Isolierlage dazwischen.`);
```

- [ ] **Step 5: `stats.ts` anpassen**

`Dimensions` und `dimensions` ersetzen:

```ts
export interface Dimensions {
  packs: { key: string; label: string; width: number; height: number; length: number }[];
  /** Hauptpack ohne Booster: max. Breite × max. Höhe × (Summe Längen + Zwischenlagen) */
  main: { width: number; height: number; length: number };
  /** Booster gesamt, gebildet wie main; fehlt ohne Booster */
  booster?: { width: number; height: number; length: number };
}

export function dimensions(layout: Layout): Dimensions {
  const total = (ps: SubPack[]) => ({
    width: Math.max(0, ...ps.map((p) => p.width)),
    height: Math.max(0, ...ps.map((p) => p.height)),
    length: ps.reduce((a, p) => a + p.length, 0) + Math.max(0, ps.length - 1) * layout.config.packGap,
  });
  const boost = layout.packs.filter((p) => p.role === 'booster');
  const out: Dimensions = {
    packs: layout.packs.map((p) => ({ key: p.key, label: p.label, width: p.width, height: p.height, length: p.length })),
    main: total(layout.packs.filter((p) => p.role === 'main')),
  };
  if (boost.length) out.booster = total(boost);
  return out;
}
```

- [ ] **Step 6: `topModel.ts` anpassen**

1. Import ergänzen: `import { shortName } from './connections';`

2. In `TopPack` nach `booster: boolean;` einfügen:

```ts
  /** schmaler Einzelpack eines geteilten Boosters: Kurzname, keine Zeile „Serienrichtung“ */
  compact: boolean;
```

3. Die Funktion `topModel` vom Kopf bis einschließlich der Zeile `const stem = fs * 2.2;` ersetzen:

```ts
export function topModel(layout: Layout, align: TopAlign = 'right'): TopModel {
  const cfg = layout.config;
  const byPos = (a: SubPack, b: SubPack) => a.position - b.position;
  const main = layout.packs.filter((p) => p.role === 'main').sort(byPos);
  const boost = layout.packs.filter((p) => p.role === 'booster').sort(byPos);
  const maxW = Math.max(...main.map((p) => p.width));
  const fs = Math.max(5, maxW / 22);
  const gapVis = Math.max(cfg.packGap, fs * 0.6);
  // Lage eines Blocks der Breite w in einem Streifen der Breite total
  const alignIn = (total: number, w: number) => (align === 'left' ? 0 : align === 'right' ? total - w : (total - w) / 2);

  const R = cfg.cell.diameter / 2;
  const toTop = (p: SubPack, x: number, y: number): TopPack => {
    // größte Lage: bei unvollständiger Lage ist das nicht immer Lage 0 (Plan 06 §6)
    const wide = widestLayerCells(p);
    const cellLines = wide.slice(0, -1).map((c) => x + c.x + layout.pitches.px / 2);
    if (wide.length) cellLines.unshift(x + wide[0].x - R);
    const a0 = x + p.width * 0.85;
    const a1 = x + p.width * 0.15;
    const ay = y + p.length * 0.62;
    const compact = p.role === 'booster' && boost.length > 1 && p.width < fs * 4.5;
    return {
      key: p.key,
      label: compact ? shortName(p) : p.label,
      booster: p.role === 'booster',
      compact,
      x,
      y,
      w: p.width,
      l: p.length,
      cellLines,
      arrow: p.dir === 'RL' ? { x1: a0, x2: a1, y: ay } : { x1: a1, x2: a0, y: ay },
    };
  };

  const packs: TopPack[] = [];
  let y = 0;
  for (const p of main) {
    packs.push(toTop(p, alignIn(maxW, p.width), y));
    y += p.length + gapVis;
  }
  const mainEnd = y - gapVis;
  const packByKey = new Map(layout.packs.map((p) => [p.key, p]));

  // Booster: gestrichelte Blöcke hinter (am Hauptplus) oder vor (am Hauptminus) dem Hauptpack, als Ganzes rechtsbündig zu ihm
  const cable = layout.bridges.find((b) => b.kind === 'cable');
  const atPlus = !!cable && packByKey.get(cable.to)!.role === 'booster';
  const boostW = Math.max(0, ...boost.map((p) => p.width));
  const boostLen = boost.reduce((a, p) => a + p.length, 0) + Math.max(0, boost.length - 1) * gapVis;
  const boostY = atPlus ? mainEnd + fs * 5 : -fs * 5 - boostLen;
  let by = boostY;
  for (const p of boost) {
    packs.push(toTop(p, maxW - boostW + alignIn(boostW, p.width), by));
    by += p.length + gapVis;
  }
  const byKey = new Map(packs.map((t) => [t.key, t]));

  // Punkt an einer Stirnseite (V = Vorderkante, H = Hinterkante) auf einer Seite (L/R)
  const inset = fs * 0.8;
  const edgePoint = (key: string, face: Face, side: Side) => {
    const t = byKey.get(key)!;
    return { x: side === 'L' ? t.x + inset : t.x + t.w - inset, y: face === 'V' ? t.y : t.y + t.l };
  };

  const flags: TopFlag[] = [];
  const links: TopLink[] = [];
  const mainChain = layout.chain.filter((k) => packByKey.get(k)!.role === 'main');
  const firstMain = packByKey.get(mainChain[0])!;
  const lastMain = packByKey.get(mainChain[mainChain.length - 1])!;
  const stem = fs * 2.2;
```

4. Die zwei Zeilen

```ts
  const boosterAtMinus = !!booster && cfg.booster?.position === 'minus';
  const boosterAtPlus = !!booster && !boosterAtMinus;
```

ersetzen durch:

```ts
  const boosterAtMinus = boost.length > 0 && !atPlus;
  const boosterAtPlus = boost.length > 0 && atPlus;
```

5. Im Abschnitt „Brücken zwischen Teilpacks“ zählt jede Kette ihre Außenkabel selbst. Die Zeile `let outerCount = 0;` ersetzen durch:

```ts
  // gestaffelte Außenkabel: Hauptpack und Booster zählen getrennt, sie liegen nicht nebeneinander
  const outerCount = { main: 0, booster: 0 };
```

Im `else`-Zweig (Brücke außen) die Zeile `outerCount++;` ersetzen durch:

```ts
      const n = ++outerCount[packByKey.get(br.from)!.role];
```

und in demselben Zweig `outerCount` in den drei folgenden Ausdrücken durch `n` ersetzen:

```ts
      const outX = edgeX + (isLeft ? -1 : 1) * fs * (1.4 + 1.6 * (n - 1));
```

```ts
      if (isLeft) leftNeed = Math.max(leftNeed, fs * (2.5 + 1.6 * n));
      else rightNeed = Math.max(rightNeed, fs * (2.5 + 1.6 * n));
```

6. Den Block von `// Booster: separater, gestrichelter Block mit Kabel` bis einschließlich der schließenden Klammer von `if (booster) { … }` ersetzen:

```ts
  // Booster: Kabel zum Hauptpack und SYSTEM-Fahne
  let minY = -fs * 8;
  let maxY = mainEnd + fs * 5.2;
  if (boost.length && cable) {
    const firstB = boost[0];
    const lastB = boost[boost.length - 1];
    const mainPack = atPlus ? lastMain : firstMain;
    const p0 = edgePoint(mainPack.key, atPlus ? mainPack.endFace : mainPack.startFace, atPlus ? mainPack.endSide : mainPack.startSide);
    // Ende der Booster-Kette, an dem das Kabel hängt, und das andere mit der SYSTEM-Fahne
    const start = { key: firstB.key, face: firstB.startFace, side: firstB.startSide };
    const end = { key: lastB.key, face: lastB.endFace, side: lastB.endSide };
    const near = atPlus ? start : end;
    const far = atPlus ? end : start;
    const nearT = byKey.get(near.key)!;
    const farT = byKey.get(far.key)!;
    // Ungeteilter Booster: schematisch wie in der bestätigten Skizze (Kabel links an der nahen Kante, Fahne rechts
    // an der fernen). Geteilt: an der tatsächlichen Seite und Stirnseite (Plan 07 §6).
    const split = boost.length > 1;
    const pc = split ? edgePoint(near.key, near.face, near.side) : { x: nearT.x + fs * 1.2, y: atPlus ? nearT.y : nearT.y + nearT.l };
    const midY = (p0.y + pc.y) / 2;
    const role = atPlus ? 'plus' : 'minus';
    links.push({
      kind: 'cable',
      role,
      points: [
        { x: p0.x, y: p0.y },
        { x: p0.x, y: midY },
        { x: pc.x, y: midY },
        { x: pc.x, y: pc.y },
      ],
      lines: [atPlus ? `HAUPT + (B${cable.node}) → Booster −` : `HAUPT − (B${cable.node}) ← Booster +`],
      textPos: { x: Math.min(p0.x, pc.x) - fs * 0.5, y: midY + fs * 0.3, anchor: 'end' },
    });
    const sysText = atPlus ? `SYSTEM + (B${layout.totalS})` : 'SYSTEM − (B0)';
    if (split) flagAt(edgePoint(far.key, far.face, far.side), far.face, far.side, sysText, role);
    else flagAt({ x: farT.x + farT.w - inset, y: atPlus ? farT.y + farT.l : farT.y }, atPlus ? 'H' : 'V', 'R', sysText, role);
    if (atPlus) maxY = boostY + boostLen + fs * 5.2;
    else minY = boostY - fs * 8;
    leftNeed = Math.max(leftNeed, fs * 13 - (maxW - boostW));
  }
```

Der Rest der Funktion (Texte, Maße, `viewBox`) bleibt. Die lokale Variable `xOf` und die Variable `booster` gibt es danach nicht mehr; `rg -n "booster\b|xOf" src/view/topModel.ts` darf nur noch `booster: boolean`, `booster: p.role === 'booster'` und `!p.booster` zeigen.

- [ ] **Step 7: Tests laufen lassen**

Run: `npx vitest run tests/view.test.ts tests/robustness.test.ts`
Expected: PASS. Schlägt „alles liegt im Bild“ fehl, ist das ein echter Befund: die Ränder (`leftNeed`, `rightNeed`, `minY`, `maxY`) im Modell korrigieren, nicht den Test.

- [ ] **Step 8: Prüfen**

Run: `npx prettier --write src/view/connections.ts src/view/assumptions.ts src/view/topModel.ts src/core/stats.ts tests/view.test.ts tests/robustness.test.ts && npm test && npm run build && npm run lint`
Expected: alles grün. Der Build meldet in `src/ui/views/TopView.tsx` keinen Fehler (`compact` ist ein zusätzliches Feld).

---

### Task 4: Zuschnitt

Spec §7.

**Files:**
- Modify: `src/fishpaper/parts.ts` (`packShort`, `interlayerParts`, `buildParts`)
- Modify: `src/fishpaper/types.ts:59` (Kommentar an `Part.pack`)
- Test: `tests/fishpaper.test.ts`

**Interfaces:**
- Consumes: Layout aus Aufgabe 2.
- Produces: Teile-IDs `face-V-BOOST0`, `face-H-BOOST(k−1)`, `inter-BOOST0-BOOST1`, `side-BOOSTi`, `topbottom-BOOSTi`, `wrap-BOOSTi`, `wrap-BOOSTALL`.

- [ ] **Step 1: Tests schreiben**

In `tests/fishpaper.test.ts` den Typ-Import erweitern: `import type { BatteryConfig, Layout } from '../src/core';` und nach `describe('Teile 18S2P', …)` einfügen:

```ts
describe('Geteilter Booster (Plan 07 §7)', () => {
  const A = solve({ ...DEFAULT_CONFIG, series: 20, booster: { series: 2, cellsPerRow: 1, position: 'plus', subPacks: 2 } });
  const B = solve({
    ...DEFAULT_CONFIG,
    series: 20,
    cellsPerRow: 8,
    booster: { series: 4, cellsPerRow: 2, position: 'plus', subPacks: 2 },
  });
  const C = solve({
    ...DEFAULT_CONFIG,
    series: 20,
    cellsPerRow: 8,
    booster: { series: 4, cellsPerRow: 3, position: 'plus', subPacks: 2, seriesSplit: [3, 1], cellsPerRowSplit: [3, 1] },
  });

  it('Teileliste: Stirnseiten außen, Zwischenlage, Seitenteile und Umwicklung je Einzelpack', () => {
    const parts = buildParts(A, opts);
    expect(parts.map((p) => p.id)).toEqual([
      'face-V-P0',
      'face-H-P1',
      'face-V-BOOST0',
      'face-H-BOOST1',
      'inter-P0-P1',
      'inter-BOOST0-BOOST1',
      'side-P0',
      'side-P1',
      'side-BOOST0',
      'side-BOOST1',
      'wrap-P0',
      'wrap-P1',
      'wrap-BOOST0',
      'wrap-BOOST1',
    ]);
    const part = (id: string) => parts.find((p) => p.id === id)!;
    expect(part('face-V-BOOST0').name).toBe('Stirnseite vorne – Booster A');
    expect(part('face-H-BOOST1').name).toBe('Stirnseite hinten – Booster B');
    expect(part('inter-BOOST0-BOOST1').name).toBe('Zwischenlage Booster A | Booster B');
    expect(part('side-BOOST1').name).toBe('Seitenteil links/rechts – Booster B');
    expect(part('wrap-BOOST1').name).toBe('Umwicklung Booster B');
    expect(part('inter-BOOST0-BOOST1').count).toBe(1);
  });

  it('Zwischenlage: Brückenausschnitt bei Brücke innen, keiner bei Brücke außen', () => {
    const area = (L: Layout, bridgeCutout: FishpaperOptions['bridgeCutout']) =>
      buildParts(L, { ...opts, bridgeCutout }).find((p) => p.id === 'inter-BOOST0-BOOST1')!.area;
    expect(area(A, 'notch')).toBeLessThan(area(A, 'none') - 1);
    expect(area(A, 'slot')).toBeCloseTo(area(A, 'none') - opts.cutoutWidth * opts.cutoutHeight, 6);
    expect(area(B, 'notch')).toBeCloseTo(area(B, 'none'), 9);
  });

  it('Zwischenlage des Boosters trägt „Blick von Stirnseite 1“', () => {
    // 6S als 3 + 3 in einer Lage: 129,9 mm breit, die Texte passen sicher hinein
    const L = solve({ ...DEFAULT_CONFIG, series: 24, booster: { series: 6, cellsPerRow: 6, position: 'plus', subPacks: 2 } });
    const texts = (id: string) =>
      buildParts(L, opts)
        .find((p) => p.id === id)!
        .texts.map((t) => t.text);
    expect(texts('inter-BOOST0-BOOST1')).toContain('Blick von Stirnseite 1');
    expect(texts('inter-BOOST0-BOOST1')).not.toContain('Blick von vorne');
    expect(texts('inter-P0-P1')).toContain('Blick von vorne');
  });

  it('Umwicklung gesamt: ein Teil über alle Einzelpacks, nach dem breiteren', () => {
    const p = buildParts(C, { ...opts, wrapMode: 'combined', wrapFold: 5 });
    const ids = p.map((x) => x.id);
    expect(ids).toContain('wrap-ALL');
    expect(ids).toContain('wrap-BOOSTALL');
    expect(ids).not.toContain('wrap-BOOST0');
    const w = p.find((x) => x.id === 'wrap-BOOSTALL')!;
    expect(w.name).toBe('Umwicklung Booster gesamt');
    expect(w.h).toBeCloseTo(70.4 * 2 + 0.5 + 10, 6);
    expect(w.w).toBeCloseTo(buildParts(C, opts).find((x) => x.id === 'wrap-BOOST0')!.w, 6);
  });

  it('ein Einzelpack: dieselben Teile wie bisher, auch bei Umwicklung gesamt', () => {
    const L = solve({ ...DEFAULT_CONFIG, series: 20, booster: { series: 2, cellsPerRow: 2, position: 'plus' } });
    const parts = buildParts(L, { ...opts, wrapMode: 'combined' });
    expect(parts.map((p) => p.id)).toEqual([
      'face-V-P0',
      'face-H-P1',
      'face-V-BOOST',
      'face-H-BOOST',
      'inter-P0-P1',
      'side-P0',
      'side-P1',
      'side-BOOST',
      'wrap-ALL',
      'wrap-BOOST',
    ]);
    expect(parts.find((p) => p.id === 'wrap-BOOST')!.name).toBe('Umwicklung Booster');
  });
});
```

- [ ] **Step 2: Tests laufen lassen – müssen fehlschlagen**

Run: `npx vitest run tests/fishpaper.test.ts`
Expected: FAIL in den ersten vier neuen Tests (es gibt nur Teile für den ersten Einzelpack, z. B. fehlt `inter-BOOST0-BOOST1`). „ein Einzelpack“ besteht schon; er sichert den Umbau ab.

- [ ] **Step 3: `parts.ts` anpassen**

1. `packShort` ersetzen:

```ts
export function packShort(p: SubPack): string {
  return p.key === 'BOOST' ? 'Booster' : p.label.replace(/ \(.*\)$/, '');
}
```

2. In `interlayerParts` die Zeile mit `const raw = …` ersetzen:

```ts
  const view = a.role === 'booster' ? 'Blick von Stirnseite 1' : 'Blick von vorne';
  const raw = [...orientationTexts(layout, a, cs, true), ...centerTexts(cs.w, cs.h, [name, view]), ...extraTexts];
```

3. Die Funktion `buildParts` ersetzen:

```ts
/** Alle Teile für das Layout. Deaktivierte Teile bleiben in der Liste (enabled=false). */
export function buildParts(layout: Layout, opts: FishpaperOptions): Part[] {
  const cfg = layout.config;
  const parts: Part[] = [];
  const byPos = (a: SubPack, b: SubPack) => a.position - b.position;
  const main = layout.packs.filter((p) => p.role === 'main').sort(byPos);
  // Einzelpacks des Boosters, Stirnseite 1 -> 2 (Plan 07 §7)
  const boost = layout.packs.filter((p) => p.role === 'booster').sort(byPos);
  const m = opts.faceMargin;

  // 1. Stirnseiten außen
  parts.push(facePart(layout, main[0], 'V', opts));
  parts.push(facePart(layout, main[main.length - 1], 'H', opts));
  if (boost.length) parts.push(facePart(layout, boost[0], 'V', opts), facePart(layout, boost[boost.length - 1], 'H', opts));

  // 2. Zwischenlagen
  for (const group of [main, boost])
    for (let i = 0; i + 1 < group.length; i++) parts.push(...interlayerParts(layout, group[i], group[i + 1], opts));

  // 3./4. Seitenteile, Ober-/Unterseite
  for (const p of [...main, ...boost]) {
    if (opts.includeSides)
      parts.push(
        rectPart(
          `side-${p.key}`,
          'side',
          p.key,
          `Seitenteil links/rechts – ${packShort(p)}`,
          p.length + 2 * m,
          p.height + 2 * m,
          2,
          [`Seite – ${packShort(p)}`],
        ),
      );
    if (opts.includeTopBottom)
      parts.push(
        rectPart(
          `topbottom-${p.key}`,
          'topbottom',
          p.key,
          `Ober-/Unterseite – ${packShort(p)}`,
          p.width + 2 * m,
          p.length + 2 * m,
          2,
          [`Ober-/Unterseite – ${packShort(p)}`],
        ),
      );
  }

  // 5. Umwicklung: je Pack oder gemeinsam über eine Gruppe (nach dem Pack mit dem größten Umfang)
  const wraps = (group: SubPack[], allId: string, allName: string) => {
    if (opts.wrapMode === 'combined' && group.length > 1) {
      const widest = group.reduce((a, p) =>
        partOutline(layout, p, opts.outlineWrap).perimeter > partOutline(layout, a, opts.outlineWrap).perimeter ? p : a,
      );
      const length = group.reduce((a, p) => a + p.length, 0) + (group.length - 1) * cfg.packGap;
      parts.push(wrapPart(`wrap-${allId}`, allId, allName, partOutline(layout, widest, opts.outlineWrap), length, opts));
    } else {
      for (const p of group)
        parts.push(
          wrapPart(`wrap-${p.key}`, p.key, `Umwicklung ${packShort(p)}`, partOutline(layout, p, opts.outlineWrap), p.length, opts),
        );
    }
  };
  wraps(main, 'ALL', 'Umwicklung gesamt');
  wraps(boost, 'BOOSTALL', 'Umwicklung Booster gesamt');

  return parts.map((p) => applyOverride(p, opts));
}
```

4. In `src/fishpaper/types.ts` den Kommentar an `Part.pack` ersetzen:

```ts
  /** SubPack.key oder 'ALL' bzw. 'BOOSTALL' (gemeinsame Umwicklung von Hauptpack bzw. Booster) */
```

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run tests/fishpaper.test.ts tests/robustness.test.ts tests/laser.test.ts tests/pdf.test.ts tests/segments.test.ts`
Expected: PASS. Schlägt der Brückenausschnitt an der schmalen Zwischenlage fehl (`area(A, 'notch')`), mit superpowers:systematic-debugging die Ursache in `notchSegs` suchen; den Test nicht abschwächen.

- [ ] **Step 5: Prüfen**

Run: `npx prettier --write src/fishpaper/parts.ts src/fishpaper/types.ts tests/fishpaper.test.ts && npm test && npm run build && npm run lint`
Expected: alles grün.

---

### Task 5: Zustand – Felder, Aufteilung, Lagen

Spec §4.1–§4.5.

**Files:**
- Modify: `src/state/derive.ts` (neu `fitsLayers`, `autoRows` nutzt es)
- Modify: `src/state/config.ts`
- Test: `tests/derive.test.ts`, `tests/state.test.ts`, `tests/config-summary.test.ts` (eine Zeile)

**Interfaces:**
- Consumes: `BoosterSpec.subPacks/seriesSplit/cellsPerRowSplit` (Aufgabe 1), `bridgeState` (vorhanden).
- Produces:
  - `fitsLayers(n: number, perRow: number, layers: number, stacking: Stacking): boolean`
  - `interface BoosterInput { series: number; position: 'plus' | 'minus'; subPacks: number; bridge: BridgeChoice; layersManual: boolean; layers: number }`
  - `DEFAULT_BOOSTER: BoosterInput = { series: 2, position: 'plus', subPacks: 1, bridge: 'auto', layersManual: false, layers: 2 }`
  - `BoosterRows` zusätzlich mit `perRow: number[] | null` und `split: number[]`
  - Action `{ type: 'boosterBridge'; pos: BridgePos }`
  - `isBoosterRowIssue` erkennt auch Meldungen, die mit `'Booster-Einzelpack'` beginnen.

- [ ] **Step 1: Tests schreiben**

a) `tests/derive.test.ts`: Import auf `import { autoRows, bridgePosOfSplit, bridgeState, evenSplit, fitsLayers } from '../src/state/derive';` erweitern und am Dateiende anhängen:

```ts
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
```

b) `tests/state.test.ts`: bestehende Stellen an den neuen Typ anpassen (die geprüften Werte bleiben dieselben, dazu kommen die neuen Felder):

- Jedes `booster: { series: N, position: 'plus' }` bzw. `position: 'minus'` in einem `patch` durch `booster: { ...DEFAULT_STATE.booster, series: N }` bzw. `booster: { ...DEFAULT_STATE.booster, series: N, position: 'minus' }` ersetzen. Das sind vier Stellen: in „Booster mit unvollständiger Lage: 3S1P = 2 + 1“ (`series: 3`), in „Plus-Ende = letzter, Minus-Ende = erster Teilpack …“ (`series: 4`, zweimal, einmal mit `position: 'minus'`) und in „geht nicht auf -> Fehlermeldung am Booster“ (`series: 2`).
- In „Booster mit unvollständiger Lage: 3S1P = 2 + 1“ den Sollwert ersetzen durch
  `{ layers: 2, packKey: 'P1', packLabel: 'Pack B (hinten)', cellsPerRow: 2, perRow: [2], split: [3], error: null }`.
- In „Fixture 20S2P Splitpack: 2S2P bei 2 Lagen -> 2 je Lage“ den Sollwert ersetzen durch
  `{ layers: 2, packKey: 'P1', packLabel: 'Pack B (hinten)', cellsPerRow: 2, perRow: [2], split: [2], error: null }`.
- In „alte Links mit booster.cellsPerRow: Wert wird ignoriert“ die Zeile `expect(s.booster).toEqual({ series: 2, position: 'plus' });` ersetzen durch
  `expect(s.booster).toEqual({ series: 2, position: 'plus', subPacks: 1, bridge: 'auto', layersManual: false, layers: 2 });`.

c) `tests/config-summary.test.ts`: in „Booster macht den Hauptpack ungerade …“ `booster: { series: 3, position: 'plus' }` durch `booster: { ...DEFAULT_STATE.booster, series: 3 }` ersetzen.

d) `tests/state.test.ts`: Import um `isBoosterRowIssue` erweitern und vor `describe('URL-Hash und JSON', …)` einfügen:

```ts
describe('Geteilter Booster (Plan 07 §4)', () => {
  const set = (s: ConfigState, patch: Partial<ConfigState>) => reducer(s, { type: 'set', patch });
  const boost = (s: ConfigState, patch: Partial<ConfigState['booster']>) => set(s, { booster: { ...s.booster, ...patch } });
  const split = reducer(DEFAULT_STATE, { type: 'preset', id: '20S2P-split' });
  const errorsOf = (s: ConfigState) =>
    solve(toBatteryConfig(s))
      .issues.filter((i) => i.level === 'error')
      .map((i) => i.msg);

  it('Standardwerte; das Preset bleibt unverändert und wird erkannt', () => {
    expect(DEFAULT_STATE.booster).toEqual({ series: 2, position: 'plus', subPacks: 1, bridge: 'auto', layersManual: false, layers: 2 });
    expect(toBatteryConfig(split).booster).toEqual({ series: 2, cellsPerRow: 2, position: 'plus' });
    expect(matchingPreset(split)).toBe('20S2P-split');
  });

  it('2 Einzelpacks, 2S: 1 + 1, gleiche Lagenzahl wie Pack B', () => {
    const s = boost(split, { subPacks: 2 });
    expect(toBatteryConfig(s).booster).toEqual({ series: 2, cellsPerRow: 1, position: 'plus', subPacks: 2 });
    expect(boosterInfo(s)).toEqual({
      layers: 2,
      packKey: 'P1',
      packLabel: 'Pack B (hinten)',
      cellsPerRow: 1,
      perRow: [1, 1],
      split: [1, 1],
      error: null,
    });
    expect(errorsOf(s)).toEqual([]);
    expect(solve(toBatteryConfig(s)).packs.map((p) => p.key)).toEqual(['P0', 'P1', 'BOOST0', 'BOOST1']);
    expect(matchingPreset(s)).toBeNull();
  });

  it('Brückenwahl im Booster: 4S außen 2 + 2, innen 3 + 1; Klick auf die natürliche Lage = automatisch', () => {
    const s4 = boost(split, { series: 4, subPacks: 2 });
    expect(toBatteryConfig(s4).booster).toEqual({ series: 4, cellsPerRow: 2, position: 'plus', subPacks: 2 });
    const inner = reducer(s4, { type: 'boosterBridge', pos: 'inner' });
    expect(inner.booster.bridge).toBe('inner');
    expect(toBatteryConfig(inner).booster).toEqual({
      series: 4,
      cellsPerRow: 3,
      position: 'plus',
      subPacks: 2,
      seriesSplit: [3, 1],
      cellsPerRowSplit: [3, 1],
    });
    expect(solve(toBatteryConfig(inner)).bridges.at(-1)).toMatchObject({ from: 'BOOST0', to: 'BOOST1', kind: 'inner', node: 19 });
    expect(reducer(inner, { type: 'boosterBridge', pos: 'outer' }).booster.bridge).toBe('auto');
    // 6S: natürlich innen 3 + 3, außen 4 + 2 (Hauptpack 14S = 7 + 7)
    const s6 = boost(split, { series: 6, subPacks: 2 });
    expect(boosterInfo(s6)!.split).toEqual([3, 3]);
    const outer = reducer(s6, { type: 'boosterBridge', pos: 'outer' });
    expect(outer.booster.bridge).toBe('outer');
    expect(boosterInfo(outer)!.split).toEqual([4, 2]);
    expect(solve(toBatteryConfig(outer)).bridges.at(-1)).toMatchObject({ kind: 'outer', node: 18 });
  });

  it('3 Einzelpacks: gleichmäßig, Rest nach vorne; Zellen je Lage je Einzelpack', () => {
    const s = boost(split, { series: 4, subPacks: 3 });
    expect(toBatteryConfig(s).booster).toEqual({
      series: 4,
      cellsPerRow: 2,
      position: 'plus',
      subPacks: 3,
      cellsPerRowSplit: [2, 1, 1],
    });
    expect(errorsOf(s)).toEqual([]);
  });

  it('eigene Lagenzahl', () => {
    const s = boost(split, { layersManual: true, layers: 1 });
    expect(boosterInfo(s)).toMatchObject({ layers: 1, cellsPerRow: 4, perRow: [4], split: [2], error: null });
    expect(toBatteryConfig(s).booster).toEqual({ series: 2, cellsPerRow: 4, position: 'plus' });
    // ohne Haken wirkt booster.layers nicht
    expect(boosterInfo(boost(split, { layers: 1 }))).toMatchObject({ layers: 2, cellsPerRow: 2 });
  });

  it('geht nicht auf: Meldung mit Buchstabe, kein Layout; eigene Lagenzahl behebt es', () => {
    // Hauptpack 18S1P = 9 + 9 (je 5 + 4 Zellen); Booster 2S1P als 1 + 1: je 1 Zelle passt nicht auf 2 Lagen
    const p1 = boost(set(split, { parallel: 1 }), { subPacks: 2 });
    expect(boosterInfo(p1)!.error).toBe('Booster A: 1 Zellen (1S1P) lassen sich nicht auf 2 Lagen aufteilen.');
    expect(Number.isNaN(toBatteryConfig(p1).booster!.cellsPerRow)).toBe(true);
    expect(solve(toBatteryConfig(p1)).packs).toEqual([]);
    const fixed = boost(p1, { layersManual: true, layers: 1 });
    expect(boosterInfo(fixed)).toMatchObject({ layers: 1, perRow: [1, 1], error: null });
    expect(errorsOf(fixed)).toEqual([]);
    // 1 Einzelpack mit eigener Lagenzahl: ohne Buchstabe und ohne den Verweis auf den Teilpack
    const single = boost(set(split, { parallel: 1 }), { layersManual: true, layers: 3 });
    expect(boosterInfo(single)!.error).toBe('Booster: 2 Zellen (2S1P) lassen sich nicht auf 3 Lagen aufteilen.');
  });

  it('Folgefehler des Kerns zum Booster werden erkannt', () => {
    expect(isBoosterRowIssue('Booster: Zellen je Lage muss eine ganze Zahl ≥ 1 sein.')).toBe(true);
    expect(isBoosterRowIssue('Booster-Einzelpack 1: 1 Zellen lassen sich nicht in volle Lagen à NaN aufteilen.')).toBe(true);
    expect(isBoosterRowIssue('Booster: zu wenige Seriengruppen für die Anzahl der Einzelpacks.')).toBe(false);
  });

  // Review Focus 3
  it('gespeicherter Stand: unbrauchbare Werte fallen auf den Standard, gültige bleiben', () => {
    const bad = mergeWithDefaults({
      boosterEnabled: true,
      booster: { series: 2, position: 'plus', subPacks: 9, bridge: 'x', layersManual: 'yes', layers: 0 },
    });
    expect(bad.booster).toEqual(DEFAULT_STATE.booster);
    const good = mergeWithDefaults({
      series: 20,
      boosterEnabled: true,
      booster: { series: 4, position: 'minus', subPacks: 2, bridge: 'inner', layersManual: true, layers: 1 },
    });
    expect(good.booster).toEqual({ series: 4, position: 'minus', subPacks: 2, bridge: 'inner', layersManual: true, layers: 1 });
    expect(decodeState(encodeState(good))).toEqual(good);
  });

  it('Patch ohne die neuen Felder: Standardwerte', () => {
    const patch = { booster: { series: 3, position: 'minus' } } as unknown as Partial<ConfigState>;
    expect(set(DEFAULT_STATE, patch).booster).toEqual({
      series: 3,
      position: 'minus',
      subPacks: 1,
      bridge: 'auto',
      layersManual: false,
      layers: 2,
    });
  });
});
```

- [ ] **Step 2: Tests laufen lassen – müssen fehlschlagen**

Run: `npx vitest run tests/derive.test.ts tests/state.test.ts tests/config-summary.test.ts`
Expected: FAIL. `fitsLayers is not a function`; in `state.test.ts` fehlen `perRow`/`split` in `boosterInfo`, `DEFAULT_STATE.booster` hat nur zwei Felder, die Action `boosterBridge` ändert nichts.

- [ ] **Step 3: `derive.ts` anpassen**

Vor `autoRows` einfügen:

```ts
/** Passen n Zellen bei perRow je Lage genau auf die Lagenzahl? Volle Lagen oder die unvollständige Lage (Plan 06 §3.1). */
export function fitsLayers(n: number, perRow: number, layers: number, stacking: Stacking): boolean {
  return n === perRow * layers || (stacking === 'honeycomb' && layers === 2 && n >= 3 && n === 2 * perRow - 1);
}
```

In `autoRows` die Zeile `const ok = …;` ersetzen durch:

```ts
    const ok = fitsLayers(n, m, layers, stacking);
```

- [ ] **Step 4: `config.ts` anpassen**

1. Importe: `LIMITS` aus `'../core'` ergänzen, `fitsLayers` aus `'./derive'` ergänzen:

```ts
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
```

2. Die zwei Zeilen

```ts
/** Booster-Eingaben ohne Zellen je Lage (Plan §3) */
export type BoosterInput = Omit<BoosterSpec, 'cellsPerRow'>;
```

ersetzen durch:

```ts
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
```

3. Im Interface `ConfigState` den Kommentar an `booster` ersetzen durch `/** Aufteilung und Zellen je Lage des Boosters werden berechnet (Plan 07 §4) */`.

4. In `DEFAULT_STATE` die Zeile `booster: { series: 2, position: 'plus' },` ersetzen durch `booster: DEFAULT_BOOSTER,`.

5. In `PRESETS` den Patch von `20S2P-split` ersetzen durch `patch: { series: 20, boosterEnabled: true, booster: DEFAULT_BOOSTER },`.

6. `BoosterRows` und `boosterRows` ersetzen:

```ts
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
```

7. In `toBatteryConfig` den Block `if (s.boosterEnabled) { … }` ersetzen:

```ts
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
```

8. `boosterInfo` und `isBoosterRowIssue` ersetzen:

```ts
/** Booster-Info für die Anzeige am Booster (null = kein Booster). */
export function boosterInfo(s: ConfigState): BoosterRows | null {
  if (!s.boosterEnabled) return null;
  const cfg = toBatteryConfig(s);
  return boosterRows({ ...cfg, booster: { series: s.booster.series, position: s.booster.position, cellsPerRow: 1 } }, s.booster);
}

/** Folgefehler des Kerns, die bei einer Booster-Fehlermeldung (Plan 04 §3, Plan 07 §4.3) nichts Neues sagen. */
export const isBoosterRowIssue = (msg: string) => msg.startsWith('Booster: Zell') || msg.startsWith('Booster-Einzelpack');
```

9. Im Typ `Action` nach `| { type: 'bridge'; pos: BridgePos }` einfügen:

```ts
  | { type: 'boosterBridge'; pos: BridgePos }
```

10. In `normalize` die letzte Zeile ersetzen (fehlende Booster-Felder aus einem Patch füllen, Reihenfolge der Schlüssel fest):

```ts
  return { ...s, booster: { ...DEFAULT_BOOSTER, ...s.booster }, seriesSplit, cellsPerRow, cellsPerRowSplit };
```

11. Im `reducer` nach dem `case 'bridge': { … }` einfügen:

```ts
    case 'boosterBridge': {
      // wie im Hauptpack: Klick auf die natürliche Lage = automatisch, auf die andere = ausdrücklich
      const b = state.booster;
      const natural = bridgeState(b.series, b.subPacks, 'auto').natural;
      return normalize({ ...state, booster: { ...b, bridge: action.pos === natural ? 'auto' : action.pos } });
    }
```

12. In `mergeWithDefaults` nach der Definition von `oneOf` einfügen:

```ts
  const intIn = (v: unknown, min: number, max: number, d: number) =>
    typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : d;
```

und die Zeile `booster: { ...booster, position: oneOf(booster.position, ['plus', 'minus'], d.booster.position) },` ersetzen durch:

```ts
    booster: {
      ...booster,
      position: oneOf(booster.position, ['plus', 'minus'], d.booster.position),
      subPacks: intIn(booster.subPacks, LIMITS.subPacks.min, LIMITS.subPacks.max, d.booster.subPacks),
      bridge: oneOf(booster.bridge, ['auto', 'inner', 'outer'], d.booster.bridge),
      layers: intIn(booster.layers, LAYER_LIMITS.min, LAYER_LIMITS.max, d.booster.layers),
    },
```

(`layersManual` prüft bereits `obj()`: ein Wert mit falschem Typ fällt auf den Standard.)

- [ ] **Step 5: Tests laufen lassen**

Run: `npx vitest run tests/derive.test.ts tests/state.test.ts tests/config-summary.test.ts`
Expected: PASS.

- [ ] **Step 6: Prüfen**

Run: `npx prettier --write src/state/derive.ts src/state/config.ts tests/derive.test.ts tests/state.test.ts tests/config-summary.test.ts && npm test && npm run build && npm run lint`
Expected: alles grün. `tsc -b` prüft auch `tests/`: bleibt dort ein `booster: { series: …, position: … }` ohne die neuen Felder stehen, meldet der Build es – dann nach Step 1 b/c nachziehen. `src/ui/config/rows/BoosterRow.tsx` baut weiter, weil es `{ ...s.booster, … }` übergibt.

---

### Task 6: Anzeigetexte und Oberfläche

Spec §4.6, §5, §6 (React-Teile), §8 Punkt 1.

**Files:**
- Modify: `src/state/configSummary.ts`
- Modify: `src/ui/config/rows/BoosterRow.tsx`
- Modify: `src/ui/tabs/WiringTab.tsx`
- Modify: `src/ui/tabs/BomTab.tsx`
- Modify: `src/ui/views/TopView.tsx`
- Test: `tests/config-summary.test.ts`, `tests/e2e/screenshots.spec.ts`

**Interfaces:**
- Consumes: `BoosterInput`, `boosterInfo`, Action `boosterBridge` (Aufgabe 5); `TopPack.compact`, `Dimensions.booster` (Aufgabe 3); `BridgeSwitch`, `bridgeState`, `bridgePosOfSplit` (vorhanden).
- Produces:
  - `boosterBridgeSwitch(s: ConfigState): BridgeSwitch`
  - `boosterLayersText(s: ConfigState): string | null`
  - Feld-IDs `booster.subPacks`, `booster.layers`; Test-IDs `booster-rows`, `booster-error` (wie bisher).

- [ ] **Step 1: Unit-Tests schreiben**

In `tests/config-summary.test.ts` die Importe aus `'../src/state/configSummary'` um `boosterBridgeSwitch` und `boosterLayersText` erweitern und am Dateiende anhängen:

```ts
describe('Geteilter Booster (Plan 07 §4.6)', () => {
  const split = preset('20S2P-split');
  const boost = (s: ConfigState, patch: Partial<ConfigState['booster']>) => set(s, { booster: { ...s.booster, ...patch } });
  const errorsOf = (s: ConfigState) =>
    solve(toBatteryConfig(s))
      .issues.filter((i) => i.level === 'error')
      .map((i) => i.msg);

  it('Kurzwert der Zeile „Splitpack“', () => {
    expect(rowValue(split, 'booster')).toBe('+ 2S am Hauptplus');
    expect(rowValue(boost(split, { subPacks: 2 }), 'booster')).toBe('+ 2S (1 + 1) am Hauptplus');
    const inner = boost(split, { series: 4, subPacks: 2, bridge: 'inner', position: 'minus' });
    expect(rowValue(inner, 'booster')).toBe('+ 4S (3 + 1) am Hauptminus');
  });

  it('Schalter „Brücke im Booster“: jede Zeile der Tabelle', () => {
    expect(boosterBridgeSwitch(boost(split, { series: 4, subPacks: 2 }))).toEqual({
      value: 'outer',
      disabled: false,
      hint: 'gleichmäßig 2 + 2',
    });
    expect(boosterBridgeSwitch(boost(split, { series: 4, subPacks: 2, bridge: 'inner' }))).toEqual({
      value: 'inner',
      disabled: false,
      hint: 'ungleich 3 + 1 – Einzelpacks unterschiedlich breit',
    });
    expect(boosterBridgeSwitch(boost(split, { series: 6, subPacks: 2 }))).toEqual({
      value: 'inner',
      disabled: false,
      hint: 'gleichmäßig 3 + 3',
    });
    expect(boosterBridgeSwitch(boost(split, { series: 3, subPacks: 2 }))).toEqual({
      value: 'outer',
      disabled: true,
      hint: '3S: ungerade Gruppenzahl, Brücke liegt außen um einen Einzelpack',
    });
    expect(boosterBridgeSwitch(boost(split, { subPacks: 2 }))).toEqual({
      value: 'inner',
      disabled: true,
      hint: '2S: zu wenige Gruppen für eine andere Aufteilung',
    });
    expect(boosterBridgeSwitch(boost(split, { series: 4, subPacks: 3 }))).toEqual({
      value: null,
      disabled: true,
      hint: 'nur bei 2 Einzelpacks wählbar',
    });
  });

  it('Text zu den Lagen', () => {
    expect(boosterLayersText(DEFAULT_STATE)).toBeNull();
    expect(boosterLayersText(split)).toBe('Booster: 2 Lagen wie Pack B (hinten) → 2 Zellen je Lage');
    expect(boosterLayersText(boost(split, { subPacks: 2 }))).toBe('Booster: 2 Lagen wie Pack B (hinten) → 1 Zelle je Lage');
    expect(boosterLayersText(boost(split, { series: 4, subPacks: 2, bridge: 'inner' }))).toBe(
      'Booster: 2 Lagen wie Pack B (hinten) → 3 / 1 Zellen je Lage',
    );
    expect(boosterLayersText(boost(split, { layersManual: true, layers: 1 }))).toBe('Booster: 1 Lage → 4 Zellen je Lage');
    expect(boosterLayersText(boost(set(split, { parallel: 1 }), { subPacks: 2 }))).toBeNull();
  });

  it('„Zurück auf Standard“ setzt auch die neuen Felder zurück; Feld-IDs gehören zur Zeile', () => {
    const s = boost(split, { subPacks: 2, layersManual: true, layers: 1 });
    const back = set(s, resetRowPatch(s, 'booster'));
    expect(back.boosterEnabled).toBe(false);
    expect(back.booster).toEqual(DEFAULT_STATE.booster);
    expect(rowOfField('booster.subPacks')).toBe('booster');
    expect(rowOfField('booster.layers')).toBe('booster');
  });

  // Review Focus 4
  it('ausdrückliche Wahl, danach 3 Einzelpacks oder ungerade Gruppenzahl: inaktiv, gleichmäßig, kein Fehler', () => {
    const inner = reducer(boost(split, { series: 4, subPacks: 2 }), { type: 'boosterBridge', pos: 'inner' });
    const three = boost(inner, { subPacks: 3 });
    expect(three.booster.bridge).toBe('inner');
    expect(boosterBridgeSwitch(three).disabled).toBe(true);
    expect(rowValue(three, 'booster')).toBe('+ 4S (2 + 1 + 1) am Hauptplus');
    expect(errorsOf(three)).toEqual([]);
    const odd = set(boost(inner, { series: 3 }), { series: 21 });
    expect(boosterBridgeSwitch(odd)).toMatchObject({ value: 'outer', disabled: true });
    expect(rowValue(odd, 'booster')).toBe('+ 3S (2 + 1) am Hauptplus');
    expect(errorsOf(odd)).toEqual([]);
  });

  // Review Focus 1
  it('Booster-S kleiner als die Zahl der Einzelpacks: Fehlermarke an der Zeile, Meldung des Kerns', () => {
    const s = set(boost(split, { subPacks: 2, series: 1 }), { series: 19 });
    expect(rowHasError(s, 'booster', [])).toBe(true);
    expect(errorsOf(s)).toEqual(['Booster: zu wenige Seriengruppen für die Anzahl der Einzelpacks.']);
    expect(rowHasError(split, 'booster', [])).toBe(false);
  });
});
```

- [ ] **Step 2: Unit-Tests laufen lassen – müssen fehlschlagen**

Run: `npx vitest run tests/config-summary.test.ts`
Expected: FAIL mit `boosterBridgeSwitch is not a function`, `boosterLayersText is not a function`, Kurzwert `'+ 2S am Hauptplus'` statt `'+ 2S (1 + 1) am Hauptplus'`, `rowHasError(…)` = `false`. „Zurück auf Standard“ besteht schon.

- [ ] **Step 3: `configSummary.ts` anpassen**

1. Nach `bridgeSwitch` einfügen:

```ts
/** Zustand des Schalters „Brücke im Booster“ (Plan 07 §4.6); dieselbe Regel wie im Hauptpack. */
export function boosterBridgeSwitch(s: ConfigState): BridgeSwitch {
  const b = s.booster;
  if (b.subPacks !== 2) return { value: null, disabled: true, hint: 'nur bei 2 Einzelpacks wählbar' };
  const st = bridgeState(b.series, b.subPacks, b.bridge);
  const text = st.split.join(' + ');
  const value = bridgePosOfSplit(st.split);
  if (!st.selectable)
    return {
      value,
      disabled: true,
      hint:
        b.series % 2 !== 0
          ? `${b.series}S: ungerade Gruppenzahl, Brücke liegt außen um einen Einzelpack`
          : `${b.series}S: zu wenige Gruppen für eine andere Aufteilung`,
    };
  return {
    value,
    disabled: false,
    hint: st.uneven ? `ungleich ${text} – Einzelpacks unterschiedlich breit` : `gleichmäßig ${text}`,
  };
}

/**
 * Lagen und Zellen je Lage des Boosters als Text, z. B. „Booster: 2 Lagen wie Pack B (hinten) → 2 Zellen je Lage“.
 * Gleiche Werte der Einzelpacks werden zusammengefasst („3 / 1“). null = kein Booster oder es geht nicht auf.
 */
export function boosterLayersText(s: ConfigState): string | null {
  const info = boosterInfo(s);
  if (!info || info.perRow === null) return null;
  const layers = `${info.layers} ${info.layers === 1 ? 'Lage' : 'Lagen'}`;
  const from = s.booster.layersManual ? '' : ` wie ${info.packLabel}`;
  const rows = [...new Set(info.perRow)].join(' / ');
  return `Booster: ${layers}${from} → ${rows} ${rows === '1' ? 'Zelle' : 'Zellen'} je Lage`;
}
```

2. In `rowValue` den `case 'booster'` ersetzen:

```ts
    case 'booster': {
      if (!s.boosterEnabled) return 'aus';
      const b = s.booster;
      const split = b.subPacks > 1 ? ` (${bridgeState(b.series, b.subPacks, b.bridge).split.join(' + ')})` : '';
      return `+ ${b.series}S${split} am ${b.position === 'plus' ? 'Hauptplus' : 'Hauptminus'}`;
    }
```

3. In `rowHasError` den `case 'booster'` ersetzen:

```ts
    case 'booster':
      // zu wenige Gruppen für die Einzelpacks meldet der Kern; die Zeile trägt trotzdem die Fehlermarke
      return (boosterInfo(s)?.error ?? null) !== null || (s.boosterEnabled && s.booster.subPacks > s.booster.series);
```

- [ ] **Step 4: Unit-Tests laufen lassen**

Run: `npx vitest run tests/config-summary.test.ts`
Expected: PASS.

- [ ] **Step 5: e2e-Tests schreiben**

Die neue Checkbox „Lagen im Booster selbst festlegen“ enthält die Zeichenfolge „Booster s“; `getByLabel('Booster S')` sucht ohne Beachtung der Großschreibung nach Teiltexten und träfe dann zwei Felder. Deshalb im bestehenden Test „Booster: Lagenzahl wie der Teilpack, an dem er hängt“ die Zeile `await page.getByLabel('Booster S').fill('3');` ersetzen durch `await page.getByLabel('Booster S', { exact: true }).fill('3');` (die Prüfungen des Tests bleiben unverändert).

In `tests/e2e/screenshots.spec.ts` nach diesem Test einfügen:

```ts
const SPLIT_PRESET = '20S2P Splitpack (18S2P + 2S2P)';

test('Booster teilen: Einzelpacks, Brücke im Booster, eigene Lagenzahl', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: SPLIT_PRESET, exact: true }).click();
  await openRow(page, 'booster');
  const row = page.getByTestId('row-booster');
  await expect(row.getByRole('radio', { name: 'innen' })).toHaveCount(0);
  await page.getByLabel('Einzelpacks im Booster').fill('2');
  await expect(row.locator('summary')).toContainText('+ 2S (1 + 1) am Hauptplus');
  await expect(row.getByRole('radio', { name: 'innen' })).toBeChecked();
  await expect(row.getByRole('radio', { name: 'außen' })).toBeDisabled();
  await expect(row.getByText('2S: zu wenige Gruppen für eine andere Aufteilung')).toBeVisible();
  await expect(page.getByTestId('booster-rows')).toHaveText('Booster: 2 Lagen wie Pack B (hinten) → 1 Zelle je Lage');
  await expect(page.locator('figure[data-pack="BOOST0"][data-face="V"]')).toBeVisible();
  await expect(page.locator('figure[data-pack="BOOST1"][data-face="H"]')).toBeVisible();
  await expect(page.locator('.stale-banner')).toHaveCount(0);
  // 4S: Brücke wählbar, natürlich außen (2 + 2), innen teilt 3 + 1
  await page.getByLabel('Booster S', { exact: true }).fill('4');
  await expect(row.getByText('gleichmäßig 2 + 2')).toBeVisible();
  await expect(row.getByRole('radio', { name: 'außen' })).toBeChecked();
  await row.getByRole('radio', { name: 'innen' }).check();
  await expect(row.getByText('ungleich 3 + 1 – Einzelpacks unterschiedlich breit')).toBeVisible();
  await expect(row.locator('summary')).toContainText('+ 4S (3 + 1) am Hauptplus');
  await expect(page.locator('.stale-banner')).toHaveCount(0);
  // nur die Einzelpacks des Boosters sind ungleich breit: Auswahl „Bündig“ erscheint
  await expect(page.getByRole('group', { name: 'Ausrichtung ungleich breiter Teilpacks' })).toBeVisible();
  // eigene Lagenzahl
  await page.getByLabel('Lagen im Booster selbst festlegen').check();
  await page.getByLabel('Lagen im Booster', { exact: true }).fill('1');
  await expect(page.getByTestId('booster-rows')).toHaveText('Booster: 1 Lage → 6 / 2 Zellen je Lage');
  await expect(page.locator('.stale-banner')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Stücklisten' }).click();
  await expect(page.getByText('Booster gesamt (inkl. 0,5 mm Zwischenlage)')).toBeVisible();
});

test('Booster teilen: Fehler klappt die Zeile „Splitpack“ auf', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: SPLIT_PRESET, exact: true }).click();
  await openRow(page, 'booster');
  await page.getByLabel('Einzelpacks im Booster').fill('2');
  await page.getByTestId('row-booster').locator('summary').click();
  await expect(page.getByTestId('row-booster')).toHaveJSProperty('open', false);
  // 1P: je Einzelpack 1 Zelle, das passt nicht auf 2 Lagen
  await page.getByLabel('P', { exact: true }).fill('1');
  await expect(page.getByTestId('booster-error')).toBeVisible();
  await expect(page.getByTestId('booster-error')).toHaveText('Booster A: 1 Zellen (1S1P) lassen sich nicht auf 2 Lagen aufteilen.');
  await expect(page.locator('.stale-banner')).toContainText('Booster A: 1 Zellen (1S1P) lassen sich nicht auf 2 Lagen aufteilen.');
  await expect(page.locator('.stale-banner')).not.toContainText('Booster-Einzelpack');
  await expect(page.locator('.stale-banner')).not.toContainText('Booster: Zellen je Lage');
  await page.getByLabel('Lagen im Booster selbst festlegen').check();
  await page.getByLabel('Lagen im Booster', { exact: true }).fill('1');
  await expect(page.locator('.stale-banner')).toHaveCount(0);
  // Booster-S kleiner als die Zahl der Einzelpacks: Meldung des Kerns, Zeile trägt die Fehlermarke
  await page.getByLabel('Booster S', { exact: true }).fill('1');
  await expect(page.locator('.stale-banner')).toContainText('Booster: zu wenige Seriengruppen für die Anzahl der Einzelpacks.');
  await expect(page.getByTestId('row-booster')).toHaveClass(/section--error/);
});

for (const shot of [
  { file: 'booster-2x1S2P', boosterS: '2', hint: '2S: zu wenige Gruppen für eine andere Aufteilung', summary: '+ 2S (1 + 1) am Hauptplus' },
  { file: 'booster-2x2S2P', boosterS: '4', hint: 'gleichmäßig 2 + 2', summary: '+ 4S (2 + 2) am Hauptplus' },
]) {
  test(`Abnahme ${shot.file}`, async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('/');
    await page.getByRole('button', { name: SPLIT_PRESET, exact: true }).click();
    await openRow(page, 'booster');
    const row = page.getByTestId('row-booster');
    await page.getByLabel('Booster S', { exact: true }).fill(shot.boosterS);
    await page.getByLabel('Einzelpacks im Booster').fill('2');
    await expect(row.getByText(shot.hint)).toBeVisible();
    await expect(row.locator('summary')).toContainText(shot.summary);
    await expect(page.locator('.stale-banner')).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/${shot.file}.png`, fullPage: true });
  });
}
```

- [ ] **Step 6: e2e laufen lassen – muss fehlschlagen**

Vorher sicherstellen, dass kein alter Vorschau-Server auf Port 4173 läuft (Playwright verwendet einen laufenden Server weiter und würde den alten Build testen).

Run: `npx playwright test -g "Booster teilen|Abnahme booster"`
Expected: FAIL in allen vier Tests mit Timeout bei `getByLabel('Einzelpacks im Booster')` (das Feld gibt es noch nicht).

- [ ] **Step 7: `BoosterRow.tsx` ersetzen**

```tsx
import { LIMITS } from '../../../core';
import type { ConfigState } from '../../../state/config';
import { boosterInfo, mainSeries } from '../../../state/config';
import { boosterBridgeSwitch, boosterLayersText } from '../../../state/configSummary';
import { LAYER_LIMITS } from '../../../state/derive';
import { Check, Choice, NumberField } from '../../form/Fields';
import type { RowProps } from '../Row';

export function BoosterRow({ state: s, dispatch, onError }: RowProps) {
  const set = (patch: Partial<ConfigState>) => dispatch({ type: 'set', patch });
  const setBooster = (patch: Partial<ConfigState['booster']>) => set({ booster: { ...s.booster, ...patch } });
  const booster = boosterInfo(s);
  const bridge = boosterBridgeSwitch(s);
  const layersText = boosterLayersText(s);
  const mS = mainSeries(s);
  // Haken gesetzt: mit der bisher wirksamen Lagenzahl beginnen, damit sich nichts sprunghaft ändert
  const ownLayers = (on: boolean) => {
    const current = booster?.layers;
    const keep = on && current !== undefined && Number.isInteger(current) && current >= LAYER_LIMITS.min && current <= LAYER_LIMITS.max;
    setBooster(keep ? { layersManual: true, layers: current } : { layersManual: on });
  };
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
              onChange={(v) => setBooster({ series: v! })}
            />
          </div>
          <p className="note">
            Hauptpack = {s.series} − {s.booster.series} = {mS}S · gesamt = ({s.seriesSplit.join(' + ')}) + {s.booster.series} ={' '}
            {s.series}S
          </p>
          <div>
            <NumberField
              id="booster.subPacks"
              label="Einzelpacks im Booster"
              integer
              min={LIMITS.subPacks.min}
              max={Math.max(1, Math.min(LIMITS.subPacks.max, s.booster.series))}
              value={s.booster.subPacks}
              onError={onError}
              onChange={(v) => setBooster({ subPacks: v! })}
              hint="hintereinander in einem Gehäuse, Isolierlage dazwischen"
            />
          </div>
          {s.booster.subPacks > 1 && (
            <Choice
              label="Brücke im Booster"
              value={bridge.value}
              disabled={bridge.disabled}
              options={[
                { value: 'inner', label: 'innen' },
                { value: 'outer', label: 'außen' },
              ]}
              onChange={(pos) => dispatch({ type: 'boosterBridge', pos })}
              hint={bridge.hint}
            />
          )}
          <Check label="Lagen im Booster selbst festlegen" checked={s.booster.layersManual} onChange={ownLayers} />
          {s.booster.layersManual && (
            <div>
              <NumberField
                id="booster.layers"
                label="Lagen im Booster"
                integer
                min={LAYER_LIMITS.min}
                max={LAYER_LIMITS.max}
                value={s.booster.layers}
                onError={onError}
                onChange={(v) => setBooster({ layers: v! })}
              />
            </div>
          )}
          {booster?.error ? (
            <p className="field__msg field__msg--error" role="alert" data-testid="booster-error">
              {booster.error}
            </p>
          ) : layersText ? (
            <p className="note" data-testid="booster-rows">
              {layersText}
            </p>
          ) : null}
          <Choice
            label="Booster-Position"
            value={s.booster.position}
            options={[
              { value: 'plus', label: 'am Hauptplus' },
              { value: 'minus', label: 'am Hauptminus' },
            ]}
            onChange={(v) => setBooster({ position: v })}
          />
        </>
      )}
    </>
  );
}
```

- [ ] **Step 8: `WiringTab.tsx`, `BomTab.tsx`, `TopView.tsx` anpassen**

`src/ui/tabs/WiringTab.tsx`:

1. Import ersetzen: `import type { Issue, Layout, SubPack } from '../../core';`
2. Die drei Zeilen ab `const main = …` bis `const uneven = …` ersetzen:

```tsx
  const main = layout.packs.filter((p) => p.role === 'main');
  const boosters = layout.packs.filter((p) => p.role === 'booster');
  // ungleich breit: im Hauptpack oder unter den Einzelpacks des Boosters
  const widths = (ps: SubPack[]) => new Set(ps.map((p) => p.width.toFixed(2))).size;
  const uneven = widths(main) > 1 || widths(boosters) > 1;
```

3. Den Block `{booster && ( … )}` ersetzen:

```tsx
        {boosters.map((p) => (
          <div className="faces__row mat faces__row--booster" key={p.key}>
            <FaceView layout={layout} pack={p} face="V" />
            <FaceView layout={layout} pack={p} face="H" />
          </div>
        ))}
```

`src/ui/tabs/BomTab.tsx`: nach `const mm = …` einfügen:

```tsx
  const boosterCount = layout.packs.filter((p) => p.role === 'booster').length;
```

und direkt nach der Zeile `</tr>` der Summenzeile „Hauptpack gesamt“ einfügen:

```tsx
            {dim.booster && boosterCount > 1 && (
              <tr className="tbl__sum">
                <th scope="row">Booster gesamt (inkl. {fmtNum(cfg.packGap, 2)} mm Zwischenlage)</th>
                <td className="num">{mm(dim.booster.width)}</td>
                <td className="num">{mm(dim.booster.height)}</td>
                <td className="num">{mm(dim.booster.length)}</td>
              </tr>
            )}
```

`src/ui/views/TopView.tsx`: das `<text className="top-sub" …>Serienrichtung</text>` in eine Bedingung setzen:

```tsx
            {!p.compact && (
              <text className="top-sub" x={p.x + p.w / 2} y={p.arrow.y + fs * 1.4} fontSize={fs * 0.7} textAnchor="middle">
                Serienrichtung
              </text>
            )}
```

- [ ] **Step 9: e2e laufen lassen**

Run: `npx playwright test -g "Booster|Abnahme booster"`
Expected: PASS, 5 Tests (die vier neuen und der bestehende „Booster: Lagenzahl wie der Teilpack, an dem er hängt“).

- [ ] **Step 10: Screenshots ansehen**

`docs/screenshots/booster-2x1S2P.png` und `docs/screenshots/booster-2x2S2P.png` mit dem Read-Tool öffnen und gegen Spec §3.6 prüfen:

- A: Booster A und B je 2 Zellen übereinander; Gruppe 19 in A, 20 in B; „EINGANG von Pack B + (B18)“ an Stirnseite 1 von A; „BRÜCKE … (B19)“ an Stirnseite 2 von A und Stirnseite 1 von B; „SYSTEM + (B20)“ an Stirnseite 2 von B; in der Draufsicht zwei gestrichelte Blöcke hintereinander mit kurzem Brückenbalken dazwischen.
- B: Gruppen 17/18 in A, 19/20 in B; Brücke B18 als Kabel außen rechts von Stirnseite 1 (A) nach Stirnseite 2 (B); Hinweis zur Brücke in der Liste.
- Polarität überall mit Symbol **und** Farbe; keine überlappenden Beschriftungen, die etwas unlesbar machen.

Überlappt etwas, die Ursache im Zeichenmodell (`src/view/topModel.ts`) beheben, mit einem Test in `tests/view.test.ts`, der die Überlappung in Zahlen fasst.

- [ ] **Step 11: Prüfen**

Run: `npx prettier --write src/state/configSummary.ts src/ui/config/rows/BoosterRow.tsx src/ui/tabs/WiringTab.tsx src/ui/tabs/BomTab.tsx src/ui/views/TopView.tsx tests/config-summary.test.ts tests/e2e/screenshots.spec.ts && npm test && npm run build && npm run lint`
Expected: alles grün.

---

### Task 7: Dokumentation und Gesamtprüfung

Alles, was nicht von der Abnahme abhängt.

**Files:**
- Modify: `docs/03_UI_UND_AKZEPTANZ.md` (Tabelle §2, Zeilen „Splitpack“)
- Modify: `README.md` (CRLF-Datei: Zeilenenden erhalten)

**Interfaces:**
- Consumes: das fertige Verhalten aus Aufgabe 1–6.
- Produces: nichts für spätere Aufgaben.

- [ ] **Step 1: `docs/03_UI_UND_AKZEPTANZ.md` ergänzen**

In der Tabelle in §2 nach der Zeile `| | Booster-Position | am Hauptplus | am Hauptplus / am Hauptminus |` einfügen:

```markdown
| | Einzelpacks im Booster | 1 | 1–4, höchstens Booster S; hintereinander in einem Gehäuse, Isolierlage dazwischen |
| | Brücke im Booster | wie gleichmäßige Aufteilung | innen / außen; nur bei 2 Einzelpacks und gerader Gruppenzahl ab 4; die andere Lage teilt (h+1) + (h−1) auf |
| | Lagen im Booster | wie der Teilpack, an dem er hängt | optional eigene Zahl 1–6 („Lagen im Booster selbst festlegen“) |
```

Im Absatz „Seit Plan 06 …“ unter §1 anhängen:

```markdown
Seit Plan 07 (`docs/07_PLAN_BOOSTER_TEILEN.md`) lässt sich der Booster in der Zeile „Splitpack“ in Einzelpacks teilen.
```

In §3 beim Punkt **Draufsicht** nach dem Satz „Der Booster erscheint als gestrichelter Block mit Kabel.“ einfügen:

```markdown
  Ein geteilter Booster erscheint als gestrichelte Blöcke hintereinander, mit Brücke wie im Hauptpack.
```

- [ ] **Step 2: `README.md` ergänzen**

Unter „Bedienung“ Punkt 2 nach dem Satz, der mit „Darunter die Liste **Aufbau** …“ beginnt und mit „klappt ihre Felder auf.“ endet, einfügen:

```markdown
   In „Splitpack“ lässt sich der Booster in bis zu 4 Einzelpacks teilen, mit eigener Brückenwahl und eigener Lagenzahl.
```

Vor der Überschrift `## Offen (Stufe 2)` einen Block einfügen:

```markdown
**Booster in Einzelpacks (Runde 4, docs/07_PLAN_BOOSTER_TEILEN.md; Rückfragen vom Nutzer entschieden)**
- Die Einzelpacks stehen hintereinander in einem Gehäuse, Stirnseite an Stirnseite, mit Isolierlage dazwischen.
  Sie heißen „Booster A“, „Booster B“ …; ihre Stirnseiten bleiben „Stirnseite 1“ und „Stirnseite 2“.
- Die Anschlüsse des Boosters liegen außen. Die Brückenlage folgt wie im Hauptpack aus der Aufteilung; der Schalter
  „Brücke im Booster“ ist nur bei 2 Einzelpacks und gerader Gruppenzahl ab 4 aktiv (2S als 1 + 1: immer innen).
- Die Kette des Boosters beginnt links an Stirnseite 1; die Seite ist nicht wählbar. Ihre Kosten zählen nicht zu den
  Kosten des Hauptpacks.
- Lagen: Standard wie der Teilpack, an dem der Booster hängt; mit „Lagen im Booster selbst festlegen“ eine eigene Zahl.
- Draufsicht: Beim geteilten Booster sitzen Kabel und SYSTEM-Fahne an der tatsächlichen Seite; beim ungeteilten bleibt
  die Zeichnung der bestätigten Skizze. Schmale Einzelpacks tragen nur den Kurznamen.
- Die Warnung „Wabe mit mehr als 2 Lagen“ erscheint jetzt auch, wenn nur der Booster mehr als 2 Lagen hat.
- Kein neues Speicherformat: Links und Dateien ohne die neuen Felder zeigen denselben Akku wie vorher.
```

Die Datei hat CRLF-Zeilenenden; nach dem Bearbeiten mit `file README.md` prüfen, dass sie weiter „with CRLF line terminators“ meldet und `git diff --stat README.md` nur die neuen Zeilen zeigt.

- [ ] **Step 3: Gesamtprüfung**

Run: `npm test && npm run build && npm run lint && node --experimental-strip-types reference/selftest.ts`
Expected: alles grün; der Selbsttest der Referenz meldet keinen Fehler.

Run: `npx playwright test`
Expected: alle Tests grün (29: die bisherigen 25 und vier neue). Danach `git status --short` ansehen: geändert sind nur Dateien dieses Plans und die neu erzeugten Bilder unter `docs/screenshots/`.

Run: `git diff --stat -- reference`
Expected: keine Ausgabe (Referenz und Fixtures unberührt).

---

### Task 8: Abnahme, Fixtures, Fachkonzept

Spec §8. **Erst nach dem ausdrücklichen OK des Nutzers zu beiden Screenshots.** Ohne OK endet der Plan nach Aufgabe 7; die Regeln stehen dann nur in der Spec.

**Files:**
- Create: `reference/fixtures/20S2P_split_18S2P+2x1S2P_21700.json`
- Create: `reference/fixtures/20S2P_split_16S2P+2x2S2P_21700.json`
- Modify: `docs/01_FACHKONZEPT.md` (§6, §9)
- Modify: `docs/03_UI_UND_AKZEPTANZ.md` (§6 Punkt 11)

**Interfaces:**
- Consumes: `solve`, `stats`, `balanceTaps`, `packOutline` aus `src/core`.
- Produces: zwei Fixtures in der Struktur der übrigen (`name`, `config`, `stats`, `chain`, `cost`, `issues`, `bridges`, `packs`, `taps`).

- [ ] **Step 1: Den Nutzer fragen**

Die beiden Screenshots `docs/screenshots/booster-2x1S2P.png` und `docs/screenshots/booster-2x2S2P.png` nennen und fragen, ob sie stimmen. Auf die Antwort warten. Bei Einwänden: nichts in diesem Task ausführen, den Einwand als neuen Auftrag behandeln.

- [ ] **Step 2: Fixtures erzeugen**

Datei `tests/gen-booster-fixtures.test.ts` anlegen (Wegwerf-Datei, wird in Step 3 wieder gelöscht):

```ts
/** Einmalig: schreibt die zwei Fixtures für den geteilten Booster (gleiche Struktur wie reference/demo.ts). */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import type { BatteryConfig } from '../src/core';
import { DEFAULT_CONFIG, balanceTaps, packOutline, solve, stats } from '../src/core';

const CASES: Record<string, BatteryConfig> = {
  '20S2P_split_18S2P+2x1S2P_21700': {
    ...DEFAULT_CONFIG,
    series: 20,
    booster: { series: 2, cellsPerRow: 1, position: 'plus', subPacks: 2 },
  },
  '20S2P_split_16S2P+2x2S2P_21700': {
    ...DEFAULT_CONFIG,
    series: 20,
    cellsPerRow: 8,
    booster: { series: 4, cellsPerRow: 2, position: 'plus', subPacks: 2 },
  },
};

it('schreibt die Fixtures', () => {
  for (const [name, cfg] of Object.entries(CASES)) {
    const L = solve(cfg);
    expect(L.packs).toHaveLength(4);
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
  }
});
```

Run: `npx vitest run tests/gen-booster-fixtures.test.ts`
Expected: PASS; unter `reference/fixtures/` liegen zwei neue Dateien.

- [ ] **Step 3: Wegwerf-Datei löschen, Fixtures prüfen**

Run: `rm tests/gen-booster-fixtures.test.ts && npm test`
Expected: alle Tests grün; `tests/fixtures.test.ts` läuft jetzt über 14 Fixtures.

Run: `git status --short reference`
Expected: genau zwei neue Dateien (`??`), keine geänderte.

In beiden Dateien nachlesen: `chain` endet auf `"BOOST0", "BOOST1"`; in der ersten ist die letzte Brücke `inner` mit Knoten 19 und `issues` leer, in der zweiten `outer` mit Knoten 18 und der Hinweis zu `BOOST0→BOOST1` steht in `issues`; `cost` ist 1 bzw. 201.

- [ ] **Step 4: Fachkonzept ergänzen**

In `docs/01_FACHKONZEPT.md` am Ende von §6 (nach dem Punkt „Das Systemplus bzw. -minus liegt dann am Booster. …“) anhängen:

```markdown
- **Booster in Einzelpacks:** Der Booster kann aus 1–4 Einzelpacks bestehen. Sie stehen hintereinander in einem Gehäuse,
  Stirnseite an Stirnseite, mit Isolierlage dazwischen – wie die Teilpacks des Hauptpacks. [BESTÄTIGT]
- Die beiden Anschlüsse des Boosters (Kabel zum Hauptpack, System-Plus bzw. -Minus) liegen immer außen. Die Brückenlage
  folgt deshalb wie im Hauptpack aus der Aufteilung: beide Einzelpacks ungerade → innen, sonst außen. Standard ist die
  gleichmäßige Aufteilung; die andere Lage teilt (h+1) + (h−1) auf: 4S → 2 + 2 (außen) oder 3 + 1 (innen),
  6S → 3 + 3 (innen) oder 4 + 2 (außen). Ein 2S-Booster als 1 + 1 hat die Brücke immer innen. [BESTÄTIGT]
- Die Kette des Boosters läuft von Einzelpack A nach hinten und beginnt links an Stirnseite 1. Es gelten die Kosten aus §5,
  ohne Wunsch für die Seite des Kettenendes; sie zählen nicht zu den Kosten des Hauptpacks.
- Lagen des Boosters: Standard wie der Teilpack, an dem er hängt; wahlweise eine eigene Lagenzahl (1–6).
- Bezeichnungen: „Booster A“, „Booster B“ …, Schlüssel `BOOST0`, `BOOST1` …; ein ungeteilter Booster bleibt `BOOST`.
```

Am Ende von §9 anhängen:

```markdown

`20S2P_split_18S2P+2x1S2P_21700.json` und `20S2P_split_16S2P+2x2S2P_21700.json` stammen ebenfalls aus `src/core`: Die
Referenz kennt keinen geteilten Booster. Der Nutzer hat beide Ergebnisse an den Screenshots
`docs/screenshots/booster-2x1S2P.png` (1 + 1, Brücke B19 innen) und `docs/screenshots/booster-2x2S2P.png`
(2 + 2, Brücke B18 außen) bestätigt. [BESTÄTIGT]
```

In `docs/03_UI_UND_AKZEPTANZ.md` §6 an Punkt 11 anhängen:

```markdown
    Für den geteilten Booster hat der Nutzer `docs/screenshots/booster-2x1S2P.png` und `booster-2x2S2P.png` bestätigt.
```

- [ ] **Step 5: Prüfen**

Run: `npm test && npm run build && npm run lint && node --experimental-strip-types reference/selftest.ts`
Expected: alles grün.

Run: `git status --short`
Expected: nur Dateien dieses Plans; `reference/pack-core.ts` und die zwölf alten Fixtures unverändert.
