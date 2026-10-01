/** Vergleich gegen die Soll-Ergebnisse in reference/fixtures/*.json (nie anpassen!). */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { BatteryConfig, Bridge, Issue, PackStats } from '../src/core';
import { balanceTaps, packOutline, solve, stats } from '../src/core';

interface FixturePack {
  key: string;
  label: string;
  dir: string;
  startFace: string;
  endFace: string;
  startSide: string;
  endSide: string;
  layers: number;
  perRow: number;
  width: number;
  height: number;
  length: number;
  groups: { s: number; minusFace: string; cells: string[] }[];
  strips: { node: number; face: string; kind: string; cells: string[] }[];
  outline: { straightPerimeter: number; tuckedPerimeter: number };
}
interface Fixture {
  name: string;
  config: BatteryConfig;
  issues: Issue[];
  stats?: PackStats;
  chain?: string[];
  cost?: number;
  bridges?: Bridge[];
  packs?: FixturePack[];
  taps?: { node: number; label: string; spots: string[] }[];
}

const dir = join(import.meta.dirname, '..', 'reference', 'fixtures');
const fixtures: Fixture[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Fixture);

describe('Fixtures', () => {
  it('sind vorhanden', () => expect(fixtures.length).toBeGreaterThanOrEqual(11));

  for (const fx of fixtures) {
    describe(fx.name, () => {
      const L = solve(fx.config);

      it('Hinweise/Fehler', () => expect(L.issues).toEqual(fx.issues));

      const fxPacks = fx.packs;
      if (!fxPacks) {
        it('liefert bei Fehlern keine Packs', () => expect(L.packs).toEqual([]));
        return;
      }

      it('Kennzahlen, Kette, Kosten, Brücken', () => {
        expect(stats(L)).toEqual(fx.stats);
        expect(L.chain).toEqual(fx.chain);
        expect(L.cost).toBe(fx.cost);
        expect(L.bridges).toEqual(fx.bridges);
      });

      it('Teilpacks, Gruppen, Streifen', () => {
        expect(L.packs.length).toBe(fxPacks.length);
        L.packs.forEach((p, i) => {
          const f = fxPacks[i];
          const pick = (o: FixturePack | typeof p) => ({
            key: o.key,
            label: o.label,
            dir: o.dir,
            startFace: o.startFace,
            endFace: o.endFace,
            startSide: o.startSide,
            endSide: o.endSide,
            layers: o.layers,
            perRow: o.perRow,
          });
          expect(pick(p)).toEqual(pick(f));
          expect(p.width).toBeCloseTo(f.width, 2);
          expect(p.height).toBeCloseTo(f.height, 2);
          expect(p.length).toBeCloseTo(f.length, 2);
          expect(p.groups.map((g) => ({ s: g.s, minusFace: g.minusFace, cells: g.cells }))).toEqual(f.groups);
          expect(p.strips.map((s) => ({ node: s.node, face: s.face, kind: s.kind, cells: s.cells }))).toEqual(f.strips);
        });
      });

      it('Umfänge ±0,1 mm', () => {
        L.packs.forEach((p, i) => {
          const f = fxPacks[i].outline;
          expect(Math.abs(packOutline(L, p, 'straight').perimeter - f.straightPerimeter)).toBeLessThanOrEqual(0.1);
          expect(Math.abs(packOutline(L, p, 'tucked').perimeter - f.tuckedPerimeter)).toBeLessThanOrEqual(0.1);
        });
      });

      it('Balancer-Abgriffe', () => {
        const taps = balanceTaps(L).map((t) => ({
          node: t.node,
          label: t.label,
          spots: t.spots.map((s) => `${s.pack}/${s.face}/${s.kind}`),
        }));
        expect(taps).toEqual(fx.taps);
      });
    });
  }
});
