import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { BatteryConfig, Seg } from '../src/core';
import { cellSpecFromDatasheet, datasheetById, DEFAULT_CONFIG, packOutline, solve } from '../src/core';
import { GLUE_BUILDUP, glueOutline, outlineClosed, valleyChord } from '../src/fishpaper/glue';
import { buildParts, partOutline } from '../src/fishpaper/parts';
import {
  arcToBeziers,
  flattenSegs,
  isClosedChain,
  mapSegs,
  notchSegs,
  pathLength2,
  polylineSegs,
  segsArea,
  segsSignedArea,
  splitArc,
} from '../src/fishpaper/segments';
import type { Seg2 } from '../src/fishpaper/types';
import { DEFAULT_FISHPAPER } from '../src/state/config';

type Arc = Extract<Seg, { kind: 'arc' }>;
const P50B = cellSpecFromDatasheet(datasheetById('molicel-p50b')!);

describe('Kleber-Sehne (Plan §4)', () => {
  // zwei Zellen Ø 21,55 mit 0,3 mm Spalt: Mittenabstand 21,85, Umrissradius eingebogen 21,85/2 + 0,05 = 10,975
  const L2 = solve({ ...DEFAULT_CONFIG, cell: P50B, series: 2, parallel: 1, subPacks: 1, cellsPerRow: 2 });
  const core = packOutline(L2, L2.packs[0], 'tucked');
  const r = 10.975;
  const half = 21.85 / 2;
  const depth = Math.sqrt(r * r - half * half); // Talpunkt über der Mittellinie: 1,046422 mm

  it('Talgeometrie zweier Zellen Ø 21,55 mit 0,3 mm Spalt', () => {
    expect(GLUE_BUILDUP).toBe(0.6);
    expect(depth).toBeCloseTo(1.046422, 6);
    const v = valleyChord(core.segs[0] as Arc, core.segs[1] as Arc);
    const cz = (core.segs[0] as Arc).c.z;
    // Talpunkt mittig zwischen den Zellen, Winkelhalbierende senkrecht nach außen (oben)
    expect(v.vertex.x).toBeCloseTo(21.7, 9);
    expect(v.vertex.z - cz).toBeCloseTo(1.046422, 6);
    expect(v.dir.x).toBeCloseTo(0, 12);
    expect(v.dir.z).toBeCloseTo(1, 12);
    // Sehne 0,6 mm über dem Talpunkt, senkrecht zur Winkelhalbierenden, 0,148394 mm breit
    expect(v.from.z - v.vertex.z).toBeCloseTo(0.6, 9);
    expect(v.to.z - v.vertex.z).toBeCloseTo(0.6, 9);
    const chord = Math.hypot(v.from.x - v.to.x, v.from.z - v.to.z);
    expect(chord).toBeCloseTo(2 * (half - Math.sqrt(r * r - (depth + 0.6) ** 2)), 9);
    expect(chord).toBeCloseTo(0.148394, 5);
    // Sehnen-Enden liegen auf den Zellkreisen
    const A = core.segs[0] as Arc;
    expect(Math.hypot(v.from.x - A.c.x, v.from.z - A.c.z)).toBeCloseTo(r, 9);
  });

  it('Umfang zweier Zellen: 133,7239 → 131,6021 mm (zwei Täler)', () => {
    expect(core.perimeter).toBeCloseTo(2 * r * (2 * Math.PI - 2 * Math.acos(half / r)), 9);
    expect(core.perimeter).toBeCloseTo(133.72386, 4);
    const g = glueOutline(core);
    expect(g.segs.map((s) => s.kind)).toEqual(['arc', 'line', 'arc', 'line']);
    expect(outlineClosed(g)).toBe(true);
    // je Tal: zwei Bogenstücke à r·Δφ weg, Sehne dazu
    const phiV = Math.atan2(depth, half);
    const phiC = Math.atan2(depth + 0.6, Math.sqrt(r * r - (depth + 0.6) ** 2));
    const perValley = 2 * r * (phiC - phiV) - 2 * (half - Math.sqrt(r * r - (depth + 0.6) ** 2));
    expect(perValley).toBeCloseTo(1.060898, 5);
    expect(g.perimeter).toBeCloseTo(core.perimeter - 2 * perValley, 9);
    expect(g.perimeter).toBeCloseTo(131.60206, 4);
    // Falzmarke je Tal in der Sehnenmitte, Start (0) in der Mitte der letzten Sehne
    const chordLen = Math.hypot((g.segs[1] as { a: { x: number } }).a.x - (g.segs[1] as { b: { x: number } }).b.x, 0);
    expect(g.marks.map((m) => m.s0)).toEqual([0, expect.any(Number)]);
    expect(g.marks[1].s0).toBeCloseTo(g.perimeter / 2, 9);
    expect(chordLen).toBeCloseTo(0.148394, 5);
  });

  it('neuer Umwicklungsumfang 18S2P P50B eingebogen: 632,755 mm statt 651,851 mm', () => {
    const L = solve({ ...DEFAULT_CONFIG, cell: P50B });
    for (const p of L.packs) {
      expect(packOutline(L, p, 'tucked').perimeter).toBeCloseTo(651.851, 3);
      const g = partOutline(L, p, 'tucked');
      expect(g.perimeter).toBeCloseTo(632.755, 3);
      expect(g.segs.filter((s) => s.kind === 'line').length).toBe(18);
      expect(outlineClosed(g)).toBe(true);
    }
    const w = buildParts(L, { ...DEFAULT_FISHPAPER, outlineWrap: 'tucked', wrapOverlap: 10 }).find((p) => p.id === 'wrap-P0')!;
    expect(w.w).toBeCloseTo(642.755, 3);
    expect(w.fold.length).toBe(17);
  });

  it('Kleber-Umfänge der Fixture-Konfigurationen (Kern-Umriss bleibt unverändert)', () => {
    const soll: Record<string, [string, number][]> = {
      '18S2P_21700': [['P0', 628.1815]],
      '32S1P_21700': [['P0', 565.9932]],
      '20S2P_21700': [['P0', 690.3698]],
      '18S2P_18650': [['P0', 539.8805]],
      '18S2P_21700_Raster_Abstandhalter': [['P0', 613.6179]],
      '20S2P_split_18S2P+2S2P_21700': [
        ['P1', 628.1815],
        ['BOOST', 192.8633],
      ],
    };
    for (const [name, rows] of Object.entries(soll)) {
      const fx = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'reference', 'fixtures', `${name}.json`), 'utf8')) as {
        config: BatteryConfig;
      };
      const L = solve(fx.config);
      for (const [key, P] of rows)
        expect(
          partOutline(
            L,
            L.packs.find((p) => p.key === key)!,
            'tucked',
          ).perimeter,
        ).toBeCloseTo(P, 3);
    }
  });

  it('Stirnseite eingebogen: eine geschlossene Kontur mit Bögen und Sehnen, Fläche exakt', () => {
    const L = solve({ ...DEFAULT_CONFIG, cell: P50B });
    const parts = buildParts(L, { ...DEFAULT_FISHPAPER, outlineFace: 'tucked' });
    for (const p of parts.filter((q) => q.type === 'face' || q.type === 'interlayer')) {
      const segs = p.cut[0].segs!;
      expect(isClosedChain(segs), p.id).toBe(true);
      expect(segs.some((s) => s.kind === 'arc')).toBe(true);
      // exakte Fläche ≈ Polygonfläche einer sehr feinen Polylinie (Fehler ≈ ⅔ · Stichhöhe · Umfang ≈ 0,02 mm²)
      const poly = flattenSegs(segs, true, 0.00005);
      let A = 0;
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        A += a.x * b.y - b.x * a.y;
      }
      expect(Math.abs(p.area - Math.abs(A / 2))).toBeLessThan(0.05);
      // alles im Teil
      for (const q of p.cut[0].pts) {
        expect(q.x).toBeGreaterThanOrEqual(-1e-6);
        expect(q.x).toBeLessThanOrEqual(p.w + 1e-6);
      }
    }
  });
});

describe('Segmentgeometrie', () => {
  const circle: Seg2[] = [{ kind: 'arc', c: { x: 10, y: 20 }, r: 5, a0: 0, a1: 2 * Math.PI }];
  const rect = (w: number, h: number): Seg2[] =>
    polylineSegs(
      [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: h },
        { x: 0, y: h },
      ],
      true,
    );

  it('Fläche und Länge: Kreis r = 5, Rechteck 100 × 40', () => {
    expect(segsArea(circle)).toBeCloseTo(Math.PI * 25, 12);
    expect(pathLength2(circle)).toBeCloseTo(10 * Math.PI, 12);
    expect(segsArea(rect(100, 40))).toBeCloseTo(4000, 12);
  });

  it('Spiegeln kehrt den Umlaufsinn um, Fläche bleibt', () => {
    const half: Seg2[] = [
      { kind: 'arc', c: { x: 0, y: 0 }, r: 10, a0: 0, a1: Math.PI },
      { kind: 'line', a: { x: -10, y: 0 }, b: { x: 10, y: 0 } },
    ];
    const m = mapSegs(half, (q) => ({ x: 50 - q.x, y: q.y }));
    expect(segsSignedArea(m)).toBeCloseTo(-segsSignedArea(half), 12);
    expect(segsArea(m)).toBeCloseTo(50 * Math.PI, 12);
    expect(isClosedChain(m)).toBe(true);
    // Bogen läuft gespiegelt von (40, 0) über (50, 10) nach (60, 0)
    const a = m[0] as Extract<Seg2, { kind: 'arc' }>;
    expect(a.c).toEqual({ x: 50, y: 0 });
    expect(a.a1 - a.a0).toBeCloseTo(-Math.PI, 12);
    // Drehung um 90° (wie im Seitenplan): Winkel +90°, Laufrichtung bleibt
    const rot = mapSegs(half, (q) => ({ x: 5 - q.y, y: q.x }));
    expect(segsSignedArea(rot)).toBeCloseTo(segsSignedArea(half), 12);
  });

  it('Randkerbe 12 × 3 in Rechteck 100 × 40 und in Kreis r = 20', () => {
    const n = notchSegs(rect(100, 40), 30, 12, 3, 'top');
    expect(isClosedChain(n)).toBe(true);
    expect(segsArea(n)).toBeCloseTo(4000 - 36, 9);
    const c: Seg2[] = [{ kind: 'arc', c: { x: 0, y: 0 }, r: 20, a0: 0, a1: 2 * Math.PI }];
    const nc = notchSegs(c, 0, 12, 3, 'top');
    expect(isClosedChain(nc)).toBe(true);
    expect(nc.filter((s) => s.kind === 'arc').length).toBeGreaterThanOrEqual(1);
    // Kerbe ab dem tieferen Kantenpunkt (y = −√(400 − 36) = −19,0788) 3 mm tief: Kreissegment + Rechteck 12 × 3
    const yEdge = -Math.sqrt(400 - 36);
    const segment = 400 * Math.asin(6 / 20) - 6 * Math.sqrt(400 - 36); // Kreisabschnitt über der Sehne
    expect(segsArea(nc)).toBeCloseTo(Math.PI * 400 - segment - 12 * 3, 9);
    expect(yEdge).toBeCloseTo(-19.078784, 6);
  });

  it('Bögen als Bézier (≤ 90°) weichen < 0,001 mm vom Kreis ab', () => {
    const arc = { kind: 'arc' as const, c: { x: 3, y: 4 }, r: 10.975, a0: 0.3, a1: 0.3 - 3.5 };
    const bz = arcToBeziers(arc);
    expect(bz.length).toBe(3);
    let p0 = { x: 3 + 10.975 * Math.cos(0.3), y: 4 + 10.975 * Math.sin(0.3) };
    for (const [c1, c2, p3] of bz) {
      for (let t = 0; t <= 1; t += 0.05) {
        const m = 1 - t;
        const x = m ** 3 * p0.x + 3 * m * m * t * c1.x + 3 * m * t * t * c2.x + t ** 3 * p3.x;
        const y = m ** 3 * p0.y + 3 * m * m * t * c1.y + 3 * m * t * t * c2.y + t ** 3 * p3.y;
        expect(Math.abs(Math.hypot(x - 3, y - 4) - 10.975)).toBeLessThan(0.001);
      }
      p0 = p3;
    }
    expect(p0.x).toBeCloseTo(3 + 10.975 * Math.cos(-3.2), 9);
    expect(splitArc({ ...arc, a0: 0, a1: 2 * Math.PI }, Math.PI).length).toBe(2);
  });
});
