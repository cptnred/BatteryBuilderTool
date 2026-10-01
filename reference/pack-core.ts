/**
 * pack-core.ts – REFERENZ-Implementierung der Fachlogik (ohne Abhängigkeiten).
 *
 * Zweck: Claude Code bekommt hier die bereits mit dem Nutzer abgestimmte Logik
 * (Zellplatzierung, Verschaltung, Plus/Minus-Solver, Balancer-Abgriffe,
 * Fishpaper-Umrisse) als lauffähigen Ausgangspunkt. Die Datei darf in das
 * Projekt übernommen, umbenannt und aufgeteilt werden – das VERHALTEN muss
 * aber erhalten bleiben (siehe reference/fixtures/*.json + Tests).
 *
 * Lauffähig ohne Build mit:  node --experimental-strip-types reference/demo.ts
 * (deshalb nur "erasable" TypeScript: keine enums, keine namespaces.)
 *
 * KOORDINATEN-KONVENTION (siehe docs/01_FACHKONZEPT.md):
 *   x  = global LINKS -> RECHTS (so wie in der Draufsicht mit VORNE oben)
 *   z  = UNTEN -> OBEN (Lage 0 = unterste Lage)
 *   y  = VORNE -> HINTEN (Reihenfolge der Teilpacks, Zellachse liegt in y)
 *   Alle Maße in mm. Querschnittskoordinaten (x,z) eines Teilpacks beginnen
 *   bei 0 am linken bzw. unteren Rand des Teilpacks.
 */

export type Side = 'L' | 'R';
export type Face = 'V' | 'H'; // V = vordere Stirnseite, H = hintere Stirnseite
export type RunDir = 'LR' | 'RL'; // Serienrichtung im Teilpack (global gesehen)
export type Stacking = 'honeycomb' | 'grid'; // Wabe (versetzt) | Raster (Zellen gerade übereinander)

export interface CellSpec {
  id: string;
  label: string;
  diameter: number; // mm, am besten nachgemessen (inkl. Schrumpfschlauch)
  length: number; // mm
  capacityAh: number;
  nominalV: number;
  maxV: number;
}

export const CELL_PRESETS: Record<string, CellSpec> = {
  '21700': { id: '21700', label: '21700', diameter: 21.4, length: 70.0, capacityAh: 4.5, nominalV: 3.6, maxV: 4.2 },
  '18650': { id: '18650', label: '18650', diameter: 18.5, length: 65.0, capacityAh: 3.0, nominalV: 3.6, maxV: 4.2 },
};

export interface SpacingSpec {
  /** 'fishpaper' = Zelle an Zelle, nur Fishpaper dazwischen; 'spacer' = Abstandhalter/Zellhalter */
  mode: 'fishpaper' | 'spacer';
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
  series: number; // z. B. 2 bei 18S + 2S
  cellsPerRow: number;
  position: 'plus' | 'minus'; // hängt am Hauptplus- oder am Hauptminus-Ende
}

export interface TerminalSpec {
  end: Face; // 'V' = vorne (vordere Stirnseite des vordersten Teilpacks), 'H' = hinten
  side: Side;
}

export interface BatteryConfig {
  cell: CellSpec;
  series: number; // S gesamt (inkl. Booster)
  parallel: number; // P
  subPacks: number; // Anzahl Teilpacks im Hauptpack (vorne ... hinten), Standard 2
  /** optional: S je Teilpack vorne->hinten. Leer = gleichmäßig aufteilen */
  seriesSplit?: number[];
  cellsPerRow: number; // Zellen nebeneinander je Lage (Hauptpack)
  /** optional: Zellen je Lage pro Teilpack (vorne->hinten), z. B. bei ungleicher Aufteilung 14S+18S */
  cellsPerRowSplit?: number[];
  stacking: Stacking;
  /** Wabe: Richtung, in die die UNGERADEN Lagen (1, 3, …) gegenüber Lage 0 versetzt sind – global L/R */
  offsetSide: Side;
  spacing: SpacingSpec;
  booster: BoosterSpec | null;
  mainMinus: TerminalSpec;
  mainPlus: TerminalSpec;
  packGap: number; // mm Isolation (Fishpaper/Platte) zwischen Teilpacks
  nickelThickness: number; // mm je Stirnseite
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

// ---------------------------------------------------------------- Geometrie

export interface Pitches {
  px: number; // Mittenabstand in der Reihe
  pz: number; // senkrechter Lagenabstand (Mitte-Mitte)
  off: number; // horizontaler Versatz ungerader Lagen (0 bei Raster)
  diag: number; // Mittenabstand zur nächsten Zelle in der Nachbarlage
  gapRow: number;
  gapLayer: number;
}

export function pitches(cfg: BatteryConfig): Pitches {
  const D = cfg.cell.diameter;
  const sp = cfg.spacing;
  const gapRow = sp.mode === 'fishpaper' ? sp.paperThickness : sp.gapRow;
  const gapLayer = sp.mode === 'fishpaper' ? sp.paperThickness : sp.gapLayer;
  const px = D + gapRow;
  if (cfg.stacking === 'grid') {
    const pz = D + gapLayer;
    return { px, pz, off: 0, diag: pz, gapRow, gapLayer };
  }
  const off = px / 2;
  const diag = D + gapLayer;
  // Wabe: Nachbar in der nächsten Lage liegt um off versetzt, Abstand = diag
  const pz = Math.sqrt(Math.max(diag * diag - off * off, 0));
  return { px, pz, off, diag, gapRow, gapLayer };
}

export interface Cell {
  id: string; // "L<lage>-<index>"  index 0 = global ganz links
  layer: number;
  index: number;
  x: number;
  z: number;
}

export function placeCells(cfg: BatteryConfig, perRow: number, layers: number): { cells: Cell[]; width: number; height: number } {
  const D = cfg.cell.diameter;
  const R = D / 2;
  const p = pitches(cfg);
  const honey = cfg.stacking === 'honeycomb' && layers > 1;
  const cells: Cell[] = [];
  for (let l = 0; l < layers; l++) {
    const odd = l % 2 === 1;
    // offsetSide 'L': ungerade Lagen nach links versetzt -> gerade Lagen stehen um off weiter rechts
    let shift = 0;
    if (honey) shift = cfg.offsetSide === 'L' ? (odd ? 0 : p.off) : (odd ? p.off : 0);
    for (let i = 0; i < perRow; i++) {
      cells.push({ id: `L${l}-${i}`, layer: l, index: i, x: R + shift + i * p.px, z: R + l * p.pz });
    }
  }
  const width = (perRow - 1) * p.px + (honey ? p.off : 0) + D;
  const height = (layers - 1) * p.pz + D;
  return { cells, width, height };
}

/**
 * Reihenfolge der Zellen entlang der Serienrichtung.
 *  - Wabe mit 1–2 Lagen: strikt nach x sortiert -> Zickzack, jede Verbindung SCHRÄG
 *    (bestätigt: "immer schräg, angefangen von unten nach oben").
 *  - Raster oder Wabe ≥3 Lagen: spaltenweise Serpentine (Spalte 0 unten->oben, Spalte 1 oben->unten …).
 */
export function orderCells(cells: Cell[], dir: RunDir, stacking: Stacking, layers: number): Cell[] {
  const sgn = dir === 'LR' ? 1 : -1;
  if (stacking === 'honeycomb' && layers <= 2) {
    return [...cells].sort((a, b) => sgn * (a.x - b.x));
  }
  const perRow = Math.max(...cells.map((c) => c.index)) + 1;
  const cols: number[] = [];
  for (let i = 0; i < perRow; i++) cols.push(dir === 'LR' ? i : perRow - 1 - i);
  const out: Cell[] = [];
  cols.forEach((col, ci) => {
    const colCells = cells.filter((c) => c.index === col).sort((a, b) => a.layer - b.layer);
    if (ci % 2 === 1) colCells.reverse();
    out.push(...colCells);
  });
  return out;
}

export function otherFace(f: Face): Face {
  return f === 'V' ? 'H' : 'V';
}
export function otherSide(s: Side): Side {
  return s === 'L' ? 'R' : 'L';
}

export interface Group {
  s: number; // globale Seriengruppe, 1-basiert (1 = am Hauptminus)
  cells: string[];
  minusFace: Face; // Stirnseite, auf der die Minuspole dieser Gruppe liegen
}

export interface Strip {
  face: Face;
  node: number; // Balancer-Knoten: B<node>. 0 = Hauptminus, S = Hauptplus
  cells: string[];
  kind: 'start' | 'series' | 'end';
}

export interface SubPack {
  key: string; // 'P0', 'P1', … (Hauptpack, vorne->hinten) oder 'BOOST'
  role: 'main' | 'booster';
  position: number; // physische Position vorne->hinten (Booster: -1)
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
  length: number; // Zelllänge + 2 × Nickel
}

function buildSubPack(
  cfg: BatteryConfig,
  o: { key: string; role: 'main' | 'booster'; position: number; label: string; series: number; perRow: number; dir: RunDir; startFace: Face; sStart: number },
): SubPack {
  const P = cfg.parallel;
  const nCells = o.series * P;
  const layers = Math.ceil(nCells / o.perRow);
  const { cells, width, height } = placeCells(cfg, o.perRow, layers);
  const ordered = orderCells(cells, o.dir, cfg.stacking, layers);
  const groups: Group[] = [];
  for (let j = 0; j < o.series; j++) {
    groups.push({
      s: o.sStart + j + 1,
      cells: ordered.slice(j * P, j * P + P).map((c) => c.id),
      minusFace: j % 2 === 0 ? o.startFace : otherFace(o.startFace),
    });
  }
  const strips: Strip[] = [];
  strips.push({ face: groups[0].minusFace, node: o.sStart, cells: groups[0].cells, kind: 'start' });
  for (let j = 0; j + 1 < groups.length; j++) {
    strips.push({ face: otherFace(groups[j].minusFace), node: groups[j].s, cells: [...groups[j].cells, ...groups[j + 1].cells], kind: 'series' });
  }
  const last = groups[groups.length - 1];
  strips.push({ face: otherFace(last.minusFace), node: last.s, cells: last.cells, kind: 'end' });
  const first = ordered[0];
  return {
    key: o.key,
    role: o.role,
    position: o.position,
    label: o.label,
    perRow: o.perRow,
    layers,
    series: o.series,
    dir: o.dir,
    startFace: o.startFace,
    endFace: otherFace(last.minusFace),
    startSide: o.dir === 'RL' ? 'R' : 'L',
    endSide: o.dir === 'RL' ? 'L' : 'R',
    startsOnTop: first.layer > 0,
    cells,
    groups,
    strips,
    width,
    height,
    length: cfg.cell.length + 2 * cfg.nickelThickness,
  };
}

// ---------------------------------------------------------------- Validierung

export interface Issue {
  level: 'error' | 'warning' | 'info';
  msg: string;
}

export function adjacency(cfg: BatteryConfig): number {
  const p = pitches(cfg);
  return Math.max(p.px, p.diag) + 0.01; // alles bis zu diesem Mittenabstand gilt als "benachbart"
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
      if (Math.hypot(a.x - b.x, a.z - b.z) <= maxD) {
        seen.add(id);
        stack.push(id);
      }
    }
  }
  return seen.size === ids.length;
}

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
    if ((s * cfg.parallel) % pr !== 0)
      out.push({ level: 'error', msg: `Teilpack ${i + 1}: ${s * cfg.parallel} Zellen lassen sich nicht in volle Lagen à ${pr} aufteilen.` });
  });
  if (cfg.booster && (cfg.booster.series * cfg.parallel) % cfg.booster.cellsPerRow !== 0)
    out.push({ level: 'error', msg: 'Booster: Zellzahl passt nicht zu Zellen je Lage.' });
  if (cfg.subPacks > 1 && cfg.mainMinus.end === cfg.mainPlus.end)
    out.push({ level: 'warning', msg: 'Hauptminus und Hauptplus auf derselben Stirnseite: ein Anschluss muss per Kabel geführt werden.' });
  const layers = Math.max(...split.map((s, i) => Math.ceil((s * cfg.parallel) / perRowOf(cfg, i))));
  if (cfg.stacking === 'honeycomb' && layers > 2)
    out.push({ level: 'warning', msg: 'Wabe mit mehr als 2 Lagen: Verschaltung als Spalten-Serpentine – bitte Schweißplan prüfen.' });
  if (cfg.series > 32) out.push({ level: 'info', msg: 'Mehr als 32S wird von gängigen VESC-Controllern nicht unterstützt.' });
  return out;
}

export function perRowOf(cfg: BatteryConfig, pos: number): number {
  const o = cfg.cellsPerRowSplit;
  return o && o.length === cfg.subPacks && o[pos] > 0 ? o[pos] : cfg.cellsPerRow;
}

export function seriesSplit(cfg: BatteryConfig): number[] {
  const mainS = cfg.series - (cfg.booster ? cfg.booster.series : 0);
  if (cfg.seriesSplit && cfg.seriesSplit.length === cfg.subPacks) return cfg.seriesSplit;
  const base = Math.floor(mainS / cfg.subPacks);
  const rest = mainS - base * cfg.subPacks;
  // Rest auf die vorderen Teilpacks verteilen
  return Array.from({ length: cfg.subPacks }, (_, i) => base + (i < rest ? 1 : 0));
}

// ---------------------------------------------------------------- Solver

export interface Bridge {
  from: string; // SubPack.key
  to: string;
  node: number;
  /** 'inner' = direkt zwischen zwei gegenüberliegenden Stirnseiten (kurz)
   *  'outer' = mindestens eine Seite liegt außen -> Kabel/Brücke außen herum */
  kind: 'inner' | 'outer' | 'cable';
  fromFace: Face;
  toFace: Face;
  fromSide: Side;
  toSide: Side;
}

export interface Layout {
  config: BatteryConfig;
  pitches: Pitches;
  packs: SubPack[]; // physisch vorne->hinten, Booster zuletzt
  chain: string[]; // Serienreihenfolge der keys (inkl. Booster)
  bridges: Bridge[];
  totalS: number;
  cost: number;
  issues: Issue[];
}

/**
 * Probiert für jeden Teilpack alle Kombinationen aus Serienrichtung (LR/RL) und
 * Startseite (V/H) und nimmt die mit den geringsten "Kosten":
 *   Hauptminus an falscher Seite +1000 | falsche Stirnseite +500 (Hauptplus: 990 / 490,
 *   damit bei Unmöglichkeit das Minus exakt sitzt und das Plus umgelegt wird)
 *   Brücke nicht zwischen gegenüberliegenden Innenflächen          +100 je Ende
 *   Brücke wechselt die Seite (quer über die Packbreite)           +50
 *   Teilpack beginnt oben statt unten                              +1
 */
export function solve(cfg: BatteryConfig): Layout {
  const issues = validateConfig(cfg);
  if (issues.some((i) => i.level === 'error'))
    return { config: cfg, pitches: pitches(cfg), packs: [], chain: [], bridges: [], totalS: cfg.series, cost: Infinity, issues };
  const P = cfg.parallel;
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
        key: `P${pos}`, role: 'main', position: pos,
        label: N === 1 ? 'Hauptpack' : N === 2 ? (pos === 0 ? 'Pack A (vorne)' : 'Pack B (hinten)') : `Pack ${String.fromCharCode(65 + pos)} (Pos. ${pos + 1})`,
        series: split[pos], perRow: perRowOf(cfg, pos), dir, startFace, sStart: s,
      });
      s += split[pos];
      packsByPos[pos] = sp;
      if (sp.startsOnTop) cost += 1;
    }
    const chainPacks = chainPos.map((p) => packsByPos[p]);
    const first = chainPacks[0];
    const last = chainPacks[N - 1];
    const outerFirst: Face = cfg.mainMinus.end; // vorderster/hinterster Teilpack: Außenfläche
    const outerLast: Face = N === 1 ? cfg.mainPlus.end : otherFace(cfg.mainMinus.end);
    if (first.startSide !== cfg.mainMinus.side) cost += 1000;
    if (first.startFace !== outerFirst) cost += 500;
    if (last.endSide !== cfg.mainPlus.side) cost += 990; // etwas billiger als Minus -> Minus wird bevorzugt exakt gesetzt
    // Hauptplus gehört auf die Außenfläche des letzten Teilpacks (bei N=1: auf die gewünschte Stirnseite).
    // Wünscht der Nutzer bei N>1 Plus und Minus auf derselben Stirnseite, ist das nur per Kabel möglich
    // -> Warnung aus validateConfig, Plus bleibt außen am letzten Teilpack.
    if (last.endFace !== outerLast) cost += 490;
    const bridges: Bridge[] = [];
    for (let i = 0; i + 1 < N; i++) {
      const a = chainPacks[i];
      const b = chainPacks[i + 1];
      const toward: Face = b.position > a.position ? 'H' : 'V';
      let kind: Bridge['kind'] = 'inner';
      if (a.endFace !== toward) { cost += 100; kind = 'outer'; }
      if (b.startFace !== otherFace(toward)) { cost += 100; kind = 'outer'; }
      if (a.endSide !== b.startSide) cost += 50;
      bridges.push({ from: a.key, to: b.key, node: a.groups[a.groups.length - 1].s, kind, fromFace: a.endFace, toFace: b.startFace, fromSide: a.endSide, toSide: b.startSide });
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
    const boost = buildSubPack(cfg, { key: 'BOOST', role: 'booster', position: -1, label: `Booster ${b.series}S${P}P`, series: b.series, perRow: b.cellsPerRow, dir: 'LR', startFace: 'V', sStart });
    packs.push(boost);
    if (boostFirst) {
      chain.unshift('BOOST');
      const f = chainPacks[0];
      bridges.unshift({ from: 'BOOST', to: f.key, node: b.series, kind: 'cable', fromFace: boost.endFace, toFace: f.startFace, fromSide: boost.endSide, toSide: f.startSide });
    } else {
      chain.push('BOOST');
      const l = chainPacks[chainPacks.length - 1];
      bridges.push({ from: l.key, to: 'BOOST', node: cfg.series - b.series, kind: 'cable', fromFace: l.endFace, toFace: boost.startFace, fromSide: l.endSide, toSide: boost.startSide });
    }
  }
  if (best!.cost >= 490) issues.push({ level: 'warning', msg: 'Gewünschte Lage von Hauptplus/-minus ist mit dieser Aufteilung nicht direkt erreichbar – Anschluss wird per Kabel umgelegt.' });
  bridges.filter((b) => b.kind === 'outer').forEach((b) =>
    issues.push({ level: 'info', msg: `Brücke ${b.from}→${b.to} (B${b.node}) liegt nicht zwischen den Packs: gerade Gruppenzahl → Kabel/Brücke außen herum (${b.fromSide === 'L' ? 'links' : 'rechts'}).` }),
  );
  return { config: cfg, pitches: pitches(cfg), packs, chain, bridges, totalS: cfg.series, cost: best!.cost, issues };
}

/** Balancer-Liste: B0 … B(S), mit allen Stellen, an denen der Knoten abgreifbar ist */
export function balanceTaps(layout: Layout): { node: number; label: string; spots: { pack: string; face: Face; kind: Strip['kind']; cells: string[] }[] }[] {
  const map = new Map<number, { pack: string; face: Face; kind: Strip['kind']; cells: string[] }[]>();
  for (const p of layout.packs) for (const st of p.strips) {
    if (!map.has(st.node)) map.set(st.node, []);
    map.get(st.node)!.push({ pack: p.key, face: st.face, kind: st.kind, cells: st.cells });
  }
  return [...map.keys()].sort((a, b) => a - b).map((n) => ({
    node: n,
    label: n === 0 ? 'B0 (Hauptminus)' : n === layout.totalS ? `B${n} (Hauptplus)` : `B${n}`,
    spots: map.get(n)!,
  }));
}

// ---------------------------------------------------------------- Umrisse (Fishpaper)

export interface Pt { x: number; z: number }
export type Seg =
  | { kind: 'line'; a: Pt; b: Pt }
  | { kind: 'arc'; c: Pt; r: number; a0: number; a1: number }; // gegen den Uhrzeigersinn, a1 > a0 (rad)

export interface Outline {
  segs: Seg[];
  perimeter: number;
  /** Positionen entlang des Umfangs (ab Startpunkt, mm) für Biege-/Falzmarken */
  marks: { s0: number; s1: number; kind: 'bend' | 'fold' }[];
}

function segLen(s: Seg): number {
  return s.kind === 'line' ? Math.hypot(s.b.x - s.a.x, s.b.z - s.a.z) : s.r * (s.a1 - s.a0);
}
function segStart(s: Seg): Pt {
  return s.kind === 'line' ? s.a : { x: s.c.x + s.r * Math.cos(s.a0), z: s.c.z + s.r * Math.sin(s.a0) };
}

function convexHull(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.z - b.z);
  if (p.length <= 1) return p;
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
  const lo: Pt[] = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 1e-9) lo.pop(); lo.push(q); }
  const up: Pt[] = [];
  for (const q of [...p].reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 1e-9) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1)); // CCW
}

/** Startpunkt normieren: Segment, dessen Anfang am weitesten unten (dann rechts) liegt, kommt zuerst */
function rotateToStart(segs: Seg[]): Seg[] {
  let bi = 0;
  segs.forEach((s, i) => {
    const a = segStart(s), b = segStart(segs[bi]);
    if (a.z < b.z - 1e-6 || (Math.abs(a.z - b.z) <= 1e-6 && a.x > b.x)) bi = i;
  });
  return segs.slice(bi).concat(segs.slice(0, bi));
}

/** "Gerade drumherum": konvexe Hülle der Zellen mit Radius r (Tangenten + Bögen) */
export function hullOutline(centers: Pt[], r: number): Outline {
  const h = convexHull(centers);
  let segs: Seg[] = [];
  if (h.length === 1) segs = [{ kind: 'arc', c: h[0], r, a0: 0, a1: 2 * Math.PI }];
  else {
    const n = h.length;
    const normal = (i: number) => {
      const a = h[i], b = h[(i + 1) % n];
      const L = Math.hypot(b.x - a.x, b.z - a.z);
      return { x: (b.z - a.z) / L, z: -(b.x - a.x) / L };
    };
    for (let i = 0; i < n; i++) {
      const nPrev = normal((i - 1 + n) % n), nCur = normal(i);
      let a0 = Math.atan2(nPrev.z, nPrev.x), a1 = Math.atan2(nCur.z, nCur.x);
      while (a1 < a0) a1 += 2 * Math.PI;
      if (a1 - a0 > 1e-9) segs.push({ kind: 'arc', c: h[i], r, a0, a1 });
      const b = h[(i + 1) % n];
      segs.push({ kind: 'line', a: { x: h[i].x + r * nCur.x, z: h[i].z + r * nCur.z }, b: { x: b.x + r * nCur.x, z: b.z + r * nCur.z } });
    }
  }
  segs = rotateToStart(segs);
  return finish(segs, 'bend');
}

/** "Eingebogen": Außenkontur der Vereinigung aller Zellkreise (folgt jeder Zelle in die Zwischenräume) */
export function scallopOutline(centers: Pt[], r: number): Outline {
  const TAU = 2 * Math.PI;
  const arcs: Seg[] = [];
  centers.forEach((c, i) => {
    const cov: [number, number][] = [];
    centers.forEach((o, j) => {
      if (i === j) return;
      const d = Math.hypot(o.x - c.x, o.z - c.z);
      if (d >= 2 * r || d < 1e-9) return;
      const th = Math.atan2(o.z - c.z, o.x - c.x);
      const al = Math.acos(d / (2 * r));
      let s = (th - al) % TAU; if (s < 0) s += TAU;
      const e = s + 2 * al;
      if (e > TAU) { cov.push([s, TAU]); cov.push([0, e - TAU]); } else cov.push([s, e]);
    });
    if (!cov.length) { arcs.push({ kind: 'arc', c, r, a0: 0, a1: TAU }); return; }
    cov.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const iv of cov) {
      const m = merged[merged.length - 1];
      if (m && iv[0] <= m[1] + 1e-12) m[1] = Math.max(m[1], iv[1]); else merged.push([...iv] as [number, number]);
    }
    for (let k = 0; k < merged.length; k++) {
      const a0 = merged[k][1];
      const a1 = k + 1 < merged.length ? merged[k + 1][0] : merged[0][0] + TAU;
      if (a1 - a0 > 1e-9) arcs.push({ kind: 'arc', c, r, a0, a1 });
    }
  });
  // Bögen zu Schleifen verketten (Endpunkt eines Bogens = Startpunkt des nächsten)
  const endPt = (s: Seg) => (s.kind === 'arc' ? { x: s.c.x + s.r * Math.cos(s.a1), z: s.c.z + s.r * Math.sin(s.a1) } : s.b);
  const used = new Array(arcs.length).fill(false);
  const loops: Seg[][] = [];
  for (let i = 0; i < arcs.length; i++) {
    if (used[i]) continue;
    const loop: Seg[] = [];
    let k = i;
    while (k >= 0 && !used[k]) {
      used[k] = true; loop.push(arcs[k]);
      const e = endPt(arcs[k]);
      let bestK = -1, bestD = 1e-3;
      arcs.forEach((a, j) => { if (!used[j]) { const s = segStart(a); const d = Math.hypot(s.x - e.x, s.z - e.z); if (d < bestD) { bestD = d; bestK = j; } } });
      k = bestK;
    }
    loops.push(loop);
  }
  const area = (lp: Seg[]) => {
    const pts = lp.flatMap((s) => samplePts(s, 0.2));
    let A = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; A += p.x * q.z - q.x * p.z; }
    return A / 2;
  };
  loops.sort((a, b) => area(b) - area(a));
  return finish(rotateToStart(loops[0]), 'fold');
}

function finish(segs: Seg[], kind: 'bend' | 'fold'): Outline {
  let s = 0;
  const marks: Outline['marks'] = [];
  for (const g of segs) {
    const L = segLen(g);
    if (kind === 'bend' && g.kind === 'arc') marks.push({ s0: s, s1: s + L, kind });
    if (kind === 'fold') marks.push({ s0: s, s1: s, kind });
    s += L;
  }
  return { segs, perimeter: s, marks };
}

/** Segment als Punktfolge (für SVG/PDF). maxSag = max. Sehnenfehler in mm */
export function samplePts(s: Seg, maxSag = 0.05): Pt[] {
  if (s.kind === 'line') return [s.a, s.b];
  const step = 2 * Math.acos(Math.max(-1, 1 - maxSag / s.r));
  const n = Math.max(2, Math.ceil((s.a1 - s.a0) / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = s.a0 + ((s.a1 - s.a0) * i) / n;
    return { x: s.c.x + s.r * Math.cos(a), z: s.c.z + s.r * Math.sin(a) };
  });
}

export function outlinePolyline(o: Outline, maxSag = 0.05): Pt[] {
  return o.segs.flatMap((s) => samplePts(s, maxSag).slice(0, -1));
}

/**
 * Radius für Umrisse:
 *  - Fishpaper-Modus: Zellradius + halbe Papierstärke (neutrale Faser)
 *  - Abstandhalter:   Zellradius + Halter-Außenrand
 *  - "eingebogen" braucht eine zusammenhängende Kontur -> mindestens halber Nachbarabstand + 0,05 mm
 */
export function outlineRadius(layout: Layout, mode: 'straight' | 'tucked', extra = 0): number {
  const cfg = layout.config;
  const R = cfg.cell.diameter / 2;
  const base = cfg.spacing.mode === 'spacer' ? R + cfg.spacing.holderRim : R + cfg.spacing.paperThickness / 2;
  const contact = Math.max(layout.pitches.px, layout.pitches.diag) / 2 + 0.05;
  return (mode === 'tucked' ? Math.max(base, contact) : base) + extra;
}

export function packOutline(layout: Layout, pack: SubPack, mode: 'straight' | 'tucked', extra = 0): Outline {
  const pts = pack.cells.map((c) => ({ x: c.x, z: c.z }));
  const r = outlineRadius(layout, mode, extra);
  return mode === 'tucked' ? scallopOutline(pts, r) : hullOutline(pts, r);
}

// ---------------------------------------------------------------- Kennzahlen

export function stats(layout: Layout) {
  const c = layout.config;
  const cells = layout.packs.reduce((a, p) => a + p.cells.length, 0);
  return {
    cells,
    nominalV: +(c.series * c.cell.nominalV).toFixed(1),
    maxV: +(c.series * c.cell.maxV).toFixed(1),
    capacityAh: +(c.parallel * c.cell.capacityAh).toFixed(2),
    energyWh: Math.round(c.series * c.cell.nominalV * c.parallel * c.cell.capacityAh),
  };
}
