import { otherFace, pitches } from './geometry';
import type { BatteryConfig, Bridge, Face, Layout, RunDir, Side, Strip, SubPack } from './types';
import { boosterPerRowOf, boosterSplit, checkAdjacency, perRowOf, seriesSplit, validateConfig } from './validate';
import { buildSubPack } from './wiring';

/** Kosten des Solvers (Fachkonzept §5). */
export const COST = {
  minusSide: 1000,
  minusFace: 500,
  plusSide: 990,
  plusFace: 490,
  bridgeEnd: 100,
  bridgeCross: 50,
  startsOnTop: 1,
  /** ab diesen Kosten: Warnung "Anschluss wird per Kabel umgelegt" */
  warnThreshold: 490,
} as const;

export function subPackLabel(N: number, pos: number): string {
  if (N === 1) return 'Hauptpack';
  if (N === 2) return pos === 0 ? 'Pack A (vorne)' : 'Pack B (hinten)';
  return `Pack ${String.fromCharCode(65 + pos)} (Pos. ${pos + 1})`;
}

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

export interface TapSpot {
  pack: string;
  face: Face;
  kind: Strip['kind'];
  cells: string[];
}

export interface BalanceTap {
  node: number;
  label: string;
  spots: TapSpot[];
}

/** Balancer-Liste: B0 … B(S), mit allen Stellen, an denen der Knoten abgreifbar ist */
export function balanceTaps(layout: Layout): BalanceTap[] {
  const map = new Map<number, TapSpot[]>();
  for (const p of layout.packs)
    for (const st of p.strips) {
      if (!map.has(st.node)) map.set(st.node, []);
      map.get(st.node)!.push({ pack: p.key, face: st.face, kind: st.kind, cells: st.cells });
    }
  return [...map.keys()]
    .sort((a, b) => a - b)
    .map((n) => ({
      node: n,
      label: n === 0 ? 'B0 (Hauptminus)' : n === layout.totalS ? `B${n} (Hauptplus)` : `B${n}`,
      spots: map.get(n)!,
    }));
}

/** Rolle eines Streifens für Beschriftung und Farbe. */
export function stripRole(layout: Layout, st: Strip): 'mainMinus' | 'mainPlus' | 'bridge' | 'series' {
  if (st.kind === 'start' && st.node === 0) return 'mainMinus';
  if (st.kind === 'end' && st.node === layout.totalS) return 'mainPlus';
  return st.kind === 'series' ? 'series' : 'bridge';
}
