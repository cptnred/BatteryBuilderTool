import { adjacency, cellDistance, layerPlan } from './geometry';
import type { BatteryConfig, BoosterSpec, Cell, Issue, Layout } from './types';

export const LIMITS = {
  series: { min: 1, max: 40 },
  parallel: { min: 1, max: 6 },
  subPacks: { min: 1, max: 4 },
  cellsPerRow: { min: 1, max: 60 },
  nickelThickness: { min: 0.1, max: 0.3 },
} as const;

/** Zellen je Lage für Teilpack an Position pos (vorne->hinten). */
export function perRowOf(cfg: BatteryConfig, pos: number): number {
  const o = cfg.cellsPerRowSplit;
  return o && o.length === cfg.subPacks && o[pos] > 0 ? o[pos] : cfg.cellsPerRow;
}

/** S je Teilpack vorne->hinten. Standard gleichmäßig, der Rest geht an die vorderen Packs. */
export function seriesSplit(cfg: BatteryConfig): number[] {
  const mainS = cfg.series - (cfg.booster ? cfg.booster.series : 0);
  if (cfg.seriesSplit && cfg.seriesSplit.length === cfg.subPacks) return cfg.seriesSplit;
  const base = Math.floor(mainS / cfg.subPacks);
  const rest = mainS - base * cfg.subPacks;
  return Array.from({ length: cfg.subPacks }, (_, i) => base + (i < rest ? 1 : 0));
}

const isInt = (v: number) => Number.isInteger(v);
const isPos = (v: number) => Number.isFinite(v) && v > 0;
const isNonNeg = (v: number) => Number.isFinite(v) && v >= 0;

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

/**
 * Zusätzliche Eingabeprüfungen, die die Referenz nicht hatte. Sie greifen nur bei
 * Eingaben, mit denen der Solver sonst abstürzen oder Unsinn rechnen würde.
 */
function validateInputs(cfg: BatteryConfig): Issue[] {
  const out: Issue[] = [];
  const err = (msg: string) => out.push({ level: 'error', msg });
  if (!isPos(cfg.cell.diameter)) err('Zelldurchmesser muss größer als 0 sein.');
  if (!isPos(cfg.cell.length)) err('Zelllänge muss größer als 0 sein.');
  if (!isInt(cfg.series) || !isInt(cfg.parallel)) err('S und P müssen ganze Zahlen sein.');
  if (!isInt(cfg.subPacks) || cfg.subPacks < LIMITS.subPacks.min || cfg.subPacks > LIMITS.subPacks.max)
    err(`Teilpacks: ${LIMITS.subPacks.min}–${LIMITS.subPacks.max} erlaubt.`);
  if (!isInt(cfg.cellsPerRow) || cfg.cellsPerRow < 1) err('Zellen je Lage muss eine ganze Zahl ≥ 1 sein.');
  if (cfg.seriesSplit && cfg.seriesSplit.length === cfg.subPacks && cfg.seriesSplit.some((s) => !isInt(s) || s < 1))
    err('Jeder Teilpack braucht mindestens 1 Seriengruppe.');
  if (cfg.cellsPerRowSplit && cfg.cellsPerRowSplit.some((n) => !Number.isFinite(n) || (n !== 0 && (!isInt(n) || n < 1))))
    err('Zellen je Lage je Teilpack müssen ganze Zahlen ≥ 1 sein (0 = Standard).');
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
  const sp = cfg.spacing;
  if (sp.mode === 'fishpaper' && !isPos(sp.paperThickness)) err('Fishpaper-Stärke muss größer als 0 sein.');
  if (sp.mode === 'spacer') {
    if (!isNonNeg(sp.gapRow)) err('Abstandhalter: „Spalt Reihe“ ist ein Pflichtfeld (≥ 0 mm).');
    if (!isNonNeg(sp.gapLayer)) err('Abstandhalter: „Spalt Lage“ ist ein Pflichtfeld (≥ 0 mm).');
    if (!isNonNeg(sp.holderRim)) err('Abstandhalter: „Halter-Außenrand“ ist ein Pflichtfeld (≥ 0 mm).');
  }
  if (!isNonNeg(cfg.packGap)) err('Isolierlage zwischen Teilpacks muss ≥ 0 mm sein.');
  if (!isNonNeg(cfg.nickelThickness)) err('Nickelstärke muss ≥ 0 mm sein.');
  return out;
}

/** Konfigurationsprüfung (Fachkonzept §3–§8). Reihenfolge und Texte der Referenz bleiben erhalten. */
export function validateConfig(cfg: BatteryConfig): Issue[] {
  const out: Issue[] = [];
  const bS = cfg.booster ? cfg.booster.series : 0;
  const mainS = cfg.series - bS;
  if (cfg.series < 1 || cfg.parallel < 1) out.push({ level: 'error', msg: 'S und P müssen ≥ 1 sein.' });
  if (mainS < cfg.subPacks) out.push({ level: 'error', msg: 'Zu wenige Seriengruppen für die Anzahl der Teilpacks.' });
  const split = seriesSplit(cfg);
  if (split.reduce((a, b) => a + b, 0) !== mainS)
    out.push({ level: 'error', msg: `Aufteilung ${split.join('+')} ergibt nicht ${mainS}S (Hauptpack).` });
  split.forEach((s, i) => {
    const pr = perRowOf(cfg, i);
    if (layerPlan(cfg, s * cfg.parallel, pr) === null)
      out.push({
        level: 'error',
        msg: `Teilpack ${i + 1}: ${s * cfg.parallel} Zellen lassen sich nicht in volle Lagen à ${pr} aufteilen.`,
      });
  });
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
      // keine ganze Zahl ≥ 1 (z. B. NaN aus dem Formular): das meldet validateInputs, hier käme nur „à NaN“ dazu
      if (!isInt(pr) || pr < 1) return;
      if (layerPlan(cfg, s * cfg.parallel, pr) === null)
        out.push({
          level: 'error',
          msg: `Booster-Einzelpack ${i + 1}: ${s * cfg.parallel} Zellen lassen sich nicht in volle Lagen à ${pr} aufteilen.`,
        });
    });
  }
  if (cfg.subPacks > 1 && cfg.mainMinus.end === cfg.mainPlus.end)
    out.push({
      level: 'warning',
      msg: 'Hauptminus und Hauptplus auf derselben Stirnseite: ein Anschluss muss per Kabel geführt werden.',
    });
  const layers = Math.max(...split.map((s, i) => Math.ceil((s * cfg.parallel) / perRowOf(cfg, i))));
  const boosterLayers = Math.max(0, ...bSplit.map((s, i) => Math.ceil((s * cfg.parallel) / boosterPerRowOf(cfg, i))));
  if (cfg.stacking === 'honeycomb' && (layers > 2 || boosterLayers > 2))
    out.push({
      level: 'warning',
      msg: 'Wabe mit mehr als 2 Lagen: Verschaltung als Spalten-Serpentine – bitte Schweißplan prüfen.',
    });
  if (cfg.series > 32) out.push({ level: 'info', msg: 'Mehr als 32S wird von gängigen VESC-Controllern nicht unterstützt.' });
  out.push(...validateInputs(cfg));
  return out;
}

function connected(ids: string[], byId: Map<string, Cell>, maxD: number): boolean {
  if (ids.length <= 1) return true;
  const seen = new Set([ids[0]]);
  const stack = [ids[0]];
  while (stack.length) {
    const a = byId.get(stack.pop()!)!;
    for (const id of ids) {
      if (seen.has(id)) continue;
      const b = byId.get(id)!;
      if (cellDistance(a, b) <= maxD) {
        seen.add(id);
        stack.push(id);
      }
    }
  }
  return seen.size === ids.length;
}

/**
 * Fachkonzept §4.6: Jede Gruppe muss zusammenhängend sein, aufeinanderfolgende Gruppen benachbart.
 * Liefert Warnungen (keine Fehler).
 */
export function checkAdjacency(layout: Layout): Issue[] {
  const out: Issue[] = [];
  const maxD = adjacency(layout.config);
  for (const p of layout.packs) {
    const byId = new Map(p.cells.map((c) => [c.id, c]));
    p.groups.forEach((g, j) => {
      if (!connected(g.cells, byId, maxD))
        out.push({ level: 'warning', msg: `${p.label}: Gruppe ${g.s} ist nicht zusammenhängend – Nickelstreifen prüfen.` });
      const next = p.groups[j + 1];
      if (next && !connected([...g.cells, ...next.cells], byId, maxD))
        out.push({ level: 'warning', msg: `${p.label}: Gruppen ${g.s} und ${next.s} liegen nicht nebeneinander.` });
    });
  }
  return out;
}
