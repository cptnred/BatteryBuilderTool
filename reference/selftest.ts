/**
 * selftest.ts – vom Nutzer BESTÄTIGTE Regeln als ausführbare Checks.
 *   node --experimental-strip-types reference/selftest.ts
 * Claude Code soll diese Checks 1:1 als Vitest-Tests übernehmen (tests/confirmed.test.ts).
 */
import assert from 'node:assert/strict';
import type { BatteryConfig, SubPack } from './pack-core.ts';
import { DEFAULT_CONFIG, solve, packOutline } from './pack-core.ts';

const base = DEFAULT_CONFIG;
const cellAt = (p: SubPack, id: string) => p.cells.find((c) => c.id === id)!;
const groupOf = (p: SubPack, s: number) => p.groups.find((g) => g.s === s)!;
const rightmost = (p: SubPack, layer: number) => p.cells.filter((c) => c.layer === layer).sort((a, b) => b.x - a.x)[0];
const leftmost = (p: SubPack, layer: number) => p.cells.filter((c) => c.layer === layer).sort((a, b) => a.x - b.x)[0];

function check(name: string, cfg: BatteryConfig, fn: (L: ReturnType<typeof solve>) => void) {
  const L = solve(cfg);
  fn(L);
  console.log('✔', name);
}

// 1) 18S2P Standard: 2 Packs à 18 Zellen, 9 je Lage, Minus vorne rechts, Plus hinten rechts, Brücke innen links
check('18S2P Standard', base, (L) => {
  const [A, B] = L.packs;
  assert.equal(A.cells.length, 18); assert.equal(B.cells.length, 18);
  assert.equal(A.perRow, 9); assert.equal(A.layers, 2);
  // Minus: Gruppe 1 sitzt vorne (V), rechts, beginnt mit der UNTEREN Zelle ganz rechts
  const g1 = groupOf(A, 1);
  assert.equal(g1.minusFace, 'V');
  assert.equal(g1.cells[0], rightmost(A, 0).id, 'Start unten rechts');
  assert.equal(cellAt(A, g1.cells[1]).layer, 1, 'erste Verbindung schräg nach oben');
  // 2P = Zelle unten + schräg darüber liegende Zelle oben
  for (const P of [A, B]) for (const g of P.groups) {
    const [a, b] = g.cells.map((id) => cellAt(P, id));
    assert.notEqual(a.layer, b.layer);
  }
  // Plus: Gruppe 18 im hinteren Pack, Pluspol auf Stirnseite H, rechts
  const g18 = groupOf(B, 18);
  assert.notEqual(g18.minusFace, 'H');
  assert.ok(g18.cells.includes(rightmost(B, 0).id));
  assert.equal(B.endSide, 'R');
  // Brücke B9 zwischen A-hinten und B-vorne, links
  assert.equal(L.bridges[0].kind, 'inner');
  assert.equal(L.bridges[0].fromSide, 'L');
  assert.equal(L.bridges[0].node, 9);
  // BESTÄTIGT: beide Packs identisch gestapelt (obere Lage nach links versetzt) -> Schrägen gleich
  for (const P of [A, B]) assert.ok(leftmost(P, 1).x < leftmost(P, 0).x, 'obere Lage nach links versetzt');
  // Folge (bestätigt): Pack B beginnt oben links
  assert.equal(B.startsOnTop, true);
  assert.equal(cellAt(B, groupOf(B, 10).cells[0]).id, leftmost(B, 1).id);
});

// 2) 32S1P: 16 Zellen je Pack, 8 je Lage, Zickzack immer schräg
check('32S1P', { ...base, series: 32, parallel: 1, cellsPerRow: 8 }, (L) => {
  const [A, B] = L.packs;
  assert.equal(A.cells.length, 16); assert.equal(A.perRow, 8);
  const ordA = A.groups.map((g) => cellAt(A, g.cells[0]));
  for (let i = 1; i < ordA.length; i++) assert.notEqual(ordA[i].layer, ordA[i - 1].layer, 'jede Verbindung schräg (Lagenwechsel)');
  assert.equal(ordA[0].id, rightmost(A, 0).id);
  // 16 Gruppen (gerade) -> Pack A endet vorne; Brücke außen links; Pack B startet hinten
  assert.equal(A.endFace, 'V'); assert.equal(B.startFace, 'H');
  assert.equal(L.bridges[0].kind, 'outer');
  // Plus B32 hinten rechts
  assert.equal(B.endFace, 'H'); assert.equal(B.endSide, 'R');
  assert.equal(cellAt(B, groupOf(B, 17).cells[0]).layer, 1, 'Zelle 17 oben links (bestätigt)');
  assert.equal(cellAt(B, groupOf(B, 32).cells[0]).layer, 0, 'Zelle 32 unten rechts (bestätigt)');
});

// 3) 20S2P: 10 je Lage
check('20S2P', { ...base, series: 20, cellsPerRow: 10 }, (L) => {
  const [A, B] = L.packs;
  assert.equal(A.cells.length, 20);
  assert.equal(B.endFace, 'H'); assert.equal(B.endSide, 'R');
  assert.equal(L.bridges[0].node, 10);
});

// 4) 20S2P Splitpack = 18S2P (2 × 9S2P) + 2S2P Booster am Plus-Ende
check('20S2P Split', { ...base, series: 20, booster: { series: 2, cellsPerRow: 2, position: 'plus' } }, (L) => {
  const main = L.packs.filter((p) => p.role === 'main');
  const boost = L.packs.find((p) => p.role === 'booster')!;
  assert.equal(main.length, 2);
  assert.equal(main[0].cells.length + main[1].cells.length, 36);
  assert.equal(boost.cells.length, 4);
  assert.deepEqual(boost.groups.map((g) => g.s), [19, 20]);
  assert.equal(L.chain.at(-1), 'BOOST');
  assert.equal(L.bridges.at(-1)!.node, 18);
});

// 5) Umrisse: eingebogen > gerade, beide > 0
check('Umrisse', base, (L) => {
  const s = packOutline(L, L.packs[0], 'straight').perimeter;
  const t = packOutline(L, L.packs[0], 'tucked').perimeter;
  // gerade: Parallelogramm der Mittelpunkte + 2πr  (r = 10.7 + 0.15)
  const px = 21.7, pz = Math.sqrt(21.7 ** 2 - 10.85 ** 2);
  const expected = 2 * 8 * px + 2 * Math.hypot(10.85, pz) + 2 * Math.PI * 10.85;
  assert.ok(Math.abs(s - expected) < 0.05, `gerade ${s} ≈ ${expected}`);
  assert.ok(t > s);
});

console.log('Alle bestätigten Regeln erfüllt.');
