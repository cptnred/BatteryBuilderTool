/** Portierung von reference/selftest.ts – vom Nutzer BESTÄTIGTE Regeln. */
import { describe, expect, it } from 'vitest';
import type { SubPack } from '../src/core';
import { DEFAULT_CONFIG, packOutline, solve } from '../src/core';

const base = DEFAULT_CONFIG;
const cellAt = (p: SubPack, id: string) => p.cells.find((c) => c.id === id)!;
const groupOf = (p: SubPack, s: number) => p.groups.find((g) => g.s === s)!;
const rightmost = (p: SubPack, layer: number) => p.cells.filter((c) => c.layer === layer).sort((a, b) => b.x - a.x)[0];
const leftmost = (p: SubPack, layer: number) => p.cells.filter((c) => c.layer === layer).sort((a, b) => a.x - b.x)[0];

describe('bestätigte Regeln', () => {
  it('18S2P Standard: Minus vorne rechts, Plus hinten rechts, Brücke innen links', () => {
    const L = solve(base);
    const [A, B] = L.packs;
    expect(A.cells.length).toBe(18);
    expect(B.cells.length).toBe(18);
    expect(A.perRow).toBe(9);
    expect(A.layers).toBe(2);
    const g1 = groupOf(A, 1);
    expect(g1.minusFace).toBe('V');
    expect(g1.cells[0]).toBe(rightmost(A, 0).id); // Start unten rechts
    expect(cellAt(A, g1.cells[1]).layer).toBe(1); // erste Verbindung schräg nach oben
    // 2P = Zelle unten + schräg darüber liegende Zelle oben
    for (const P of [A, B])
      for (const g of P.groups) {
        const [a, b] = g.cells.map((id) => cellAt(P, id));
        expect(a.layer).not.toBe(b.layer);
      }
    const g18 = groupOf(B, 18);
    expect(g18.minusFace).not.toBe('H');
    expect(g18.cells).toContain(rightmost(B, 0).id);
    expect(B.endSide).toBe('R');
    expect(L.bridges[0].kind).toBe('inner');
    expect(L.bridges[0].fromSide).toBe('L');
    expect(L.bridges[0].node).toBe(9);
    // beide Packs identisch gestapelt (obere Lage nach links versetzt) -> Schrägen gleich
    for (const P of [A, B]) expect(leftmost(P, 1).x).toBeLessThan(leftmost(P, 0).x);
    // Pack B beginnt oben links
    expect(B.startsOnTop).toBe(true);
    expect(cellAt(B, groupOf(B, 10).cells[0]).id).toBe(leftmost(B, 1).id);
  });

  it('32S1P: 16 Zellen je Pack, 8 je Lage, Zickzack immer schräg', () => {
    const L = solve({ ...base, series: 32, parallel: 1, cellsPerRow: 8 });
    const [A, B] = L.packs;
    expect(A.cells.length).toBe(16);
    expect(A.perRow).toBe(8);
    const ordA = A.groups.map((g) => cellAt(A, g.cells[0]));
    for (let i = 1; i < ordA.length; i++) expect(ordA[i].layer).not.toBe(ordA[i - 1].layer);
    expect(ordA[0].id).toBe(rightmost(A, 0).id);
    expect(A.endFace).toBe('V');
    expect(B.startFace).toBe('H');
    expect(L.bridges[0].kind).toBe('outer');
    expect(B.endFace).toBe('H');
    expect(B.endSide).toBe('R');
    expect(cellAt(B, groupOf(B, 17).cells[0]).layer).toBe(1); // Zelle 17 oben links
    expect(cellAt(B, groupOf(B, 32).cells[0]).layer).toBe(0); // Zelle 32 unten rechts
  });

  it('20S2P: 10 je Lage', () => {
    const L = solve({ ...base, series: 20, cellsPerRow: 10 });
    const [A, B] = L.packs;
    expect(A.cells.length).toBe(20);
    expect(B.endFace).toBe('H');
    expect(B.endSide).toBe('R');
    expect(L.bridges[0].node).toBe(10);
  });

  it('20S2P Split = 18S2P + 2S2P Booster am Plus-Ende', () => {
    const L = solve({ ...base, series: 20, booster: { series: 2, cellsPerRow: 2, position: 'plus' } });
    const main = L.packs.filter((p) => p.role === 'main');
    const boost = L.packs.find((p) => p.role === 'booster')!;
    expect(main.length).toBe(2);
    expect(main[0].cells.length + main[1].cells.length).toBe(36);
    expect(boost.cells.length).toBe(4);
    expect(boost.groups.map((g) => g.s)).toEqual([19, 20]);
    expect(L.chain.at(-1)).toBe('BOOST');
    expect(L.bridges.at(-1)!.node).toBe(18);
  });

  it('Umrisse: gerade = Parallelogramm + 2πr, eingebogen > gerade', () => {
    const L = solve(base);
    const s = packOutline(L, L.packs[0], 'straight').perimeter;
    const t = packOutline(L, L.packs[0], 'tucked').perimeter;
    const px = 21.7;
    const pz = Math.sqrt(21.7 ** 2 - 10.85 ** 2);
    const expected = 2 * 8 * px + 2 * Math.hypot(10.85, pz) + 2 * Math.PI * 10.85;
    expect(Math.abs(s - expected)).toBeLessThan(0.05);
    expect(t).toBeGreaterThan(s);
  });
});
