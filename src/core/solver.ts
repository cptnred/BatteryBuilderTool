import { otherFace, pitches } from './geometry';
import type { BatteryConfig, Bridge, Face, Layout, RunDir, Strip, SubPack } from './types';
import { checkAdjacency, perRowOf, seriesSplit, validateConfig } from './validate';
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

/**
 * Probiert für jeden Teilpack alle Kombinationen aus Serienrichtung (LR/RL) und
 * Startseite (V/H) und nimmt die mit den geringsten "Kosten" (siehe COST).
 * Bei gleichen Kosten gewinnt die zuerst gefundene Variante.
 */
export function solve(cfg: BatteryConfig): Layout {
  const issues = validateConfig(cfg);
  if (issues.some((i) => i.level === 'error'))
    return { config: cfg, pitches: pitches(cfg), packs: [], chain: [], bridges: [], totalS: cfg.series, cost: Infinity, issues };
  const split = seriesSplit(cfg);
  const N = cfg.subPacks;
  const chainPos = cfg.mainMinus.end === 'V' ? [...Array(N).keys()] : [...Array(N).keys()].reverse();
  const bS = cfg.booster ? cfg.booster.series : 0;
  const boostFirst = !!cfg.booster && cfg.booster.position === 'minus';

  let best: { cost: number; packs: SubPack[]; bridges: Bridge[] } | null = null;
  const combos = Math.pow(4, N);
  for (let m = 0; m < combos; m++) {
    let s = boostFirst ? bS : 0;
    const packsByPos: SubPack[] = [];
    let cost = 0;
    for (let ci = 0; ci < N; ci++) {
      const pos = chainPos[ci];
      const code = (m >> (2 * ci)) & 3;
      const dir: RunDir = code & 1 ? 'LR' : 'RL';
      const startFace: Face = code & 2 ? 'H' : 'V';
      const sp = buildSubPack(cfg, {
        key: `P${pos}`,
        role: 'main',
        position: pos,
        label: subPackLabel(N, pos),
        series: split[pos],
        perRow: perRowOf(cfg, pos),
        dir,
        startFace,
        sStart: s,
      });
      s += split[pos];
      packsByPos[pos] = sp;
      if (sp.startsOnTop) cost += COST.startsOnTop;
    }
    const chainPacks = chainPos.map((p) => packsByPos[p]);
    const first = chainPacks[0];
    const last = chainPacks[N - 1];
    const outerFirst: Face = cfg.mainMinus.end; // vorderster/hinterster Teilpack: Außenfläche
    const outerLast: Face = N === 1 ? cfg.mainPlus.end : otherFace(cfg.mainMinus.end);
    if (first.startSide !== cfg.mainMinus.side) cost += COST.minusSide;
    if (first.startFace !== outerFirst) cost += COST.minusFace;
    if (last.endSide !== cfg.mainPlus.side) cost += COST.plusSide;
    // Hauptplus gehört auf die Außenfläche des letzten Teilpacks (bei N=1: auf die gewünschte Stirnseite).
    // Wünscht der Nutzer bei N>1 Plus und Minus auf derselben Stirnseite, ist das nur per Kabel möglich
    // -> Warnung aus validateConfig, Plus bleibt außen am letzten Teilpack.
    if (last.endFace !== outerLast) cost += COST.plusFace;
    const bridges: Bridge[] = [];
    for (let i = 0; i + 1 < N; i++) {
      const a = chainPacks[i];
      const b = chainPacks[i + 1];
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
    if (!best || cost < best.cost) best = { cost, packs: packsByPos, bridges };
  }

  const packs = [...best!.packs];
  const chain = chainPos.map((p) => `P${p}`);
  const bridges = [...best!.bridges];
  if (cfg.booster) {
    const b = cfg.booster;
    const chainPacks = chainPos.map((p) => packs[p]);
    const sStart = boostFirst ? 0 : cfg.series - b.series;
    const boost = buildSubPack(cfg, {
      key: 'BOOST',
      role: 'booster',
      position: -1,
      label: `Booster ${b.series}S${cfg.parallel}P`,
      series: b.series,
      perRow: b.cellsPerRow,
      dir: 'LR',
      startFace: 'V',
      sStart,
    });
    packs.push(boost);
    if (boostFirst) {
      chain.unshift('BOOST');
      const f = chainPacks[0];
      bridges.unshift({
        from: 'BOOST',
        to: f.key,
        node: b.series,
        kind: 'cable',
        fromFace: boost.endFace,
        toFace: f.startFace,
        fromSide: boost.endSide,
        toSide: f.startSide,
      });
    } else {
      chain.push('BOOST');
      const l = chainPacks[chainPacks.length - 1];
      bridges.push({
        from: l.key,
        to: 'BOOST',
        node: cfg.series - b.series,
        kind: 'cable',
        fromFace: l.endFace,
        toFace: boost.startFace,
        fromSide: l.endSide,
        toSide: boost.startSide,
      });
    }
  }
  if (best!.cost >= COST.warnThreshold)
    issues.push({
      level: 'warning',
      msg: 'Gewünschte Lage von Hauptplus/-minus ist mit dieser Aufteilung nicht direkt erreichbar – Anschluss wird per Kabel umgelegt.',
    });
  bridges
    .filter((b) => b.kind === 'outer')
    .forEach((b) =>
      issues.push({
        level: 'info',
        msg: `Brücke ${b.from}→${b.to} (B${b.node}) liegt nicht zwischen den Packs: gerade Gruppenzahl → Kabel/Brücke außen herum (${b.fromSide === 'L' ? 'links' : 'rechts'}).`,
      }),
    );
  const layout: Layout = {
    config: cfg,
    pitches: pitches(cfg),
    packs,
    chain,
    bridges,
    totalS: cfg.series,
    cost: best!.cost,
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
