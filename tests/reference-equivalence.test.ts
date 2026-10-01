/**
 * src/core muss sich exakt wie reference/pack-core.ts verhalten – auch jenseits der Fixtures.
 * Einzige gewollte Abweichung: zusätzliche Eingabeprüfungen/Warnungen, die hinten angehängt werden.
 */
import { describe, expect, it } from 'vitest';
import * as ref from '../reference/pack-core.ts';
import type { BatteryConfig, TerminalSpec } from '../src/core';
import { DEFAULT_CONFIG, packOutline, solve } from '../src/core';

function* configs(): Generator<BatteryConfig> {
  const terminals: TerminalSpec[] = (['V', 'H'] as const).flatMap((end) => (['L', 'R'] as const).map((side) => ({ end, side })));
  for (const series of [8, 12, 13, 18, 20, 24, 32])
    for (const parallel of [1, 2, 3])
      for (const subPacks of [1, 2, 3])
        for (const stacking of ['honeycomb', 'grid'] as const)
          for (const offsetSide of ['L', 'R'] as const) {
            const cellsPerRow = (Math.ceil(series / subPacks) * parallel) / 2;
            if (!Number.isInteger(cellsPerRow)) continue;
            for (const mainMinus of terminals)
              for (const mainPlus of terminals)
                yield { ...DEFAULT_CONFIG, series, parallel, subPacks, stacking, offsetSide, cellsPerRow, mainMinus, mainPlus };
          }
}

describe('Äquivalenz zur Referenz', () => {
  it('Packs, Brücken, Kette, Kosten und Umfänge stimmen für viele Konfigurationen', () => {
    let n = 0;
    for (const cfg of configs()) {
      const a = solve(cfg);
      const b = ref.solve(cfg as ref.BatteryConfig);
      expect(a.packs).toEqual(b.packs);
      expect(a.bridges).toEqual(b.bridges);
      expect(a.chain).toEqual(b.chain);
      expect(a.cost).toBe(b.cost);
      expect(a.issues.slice(0, b.issues.length)).toEqual(b.issues);
      if (n % 7 === 0)
        for (let i = 0; i < a.packs.length; i++)
          for (const mode of ['straight', 'tucked'] as const)
            expect(packOutline(a, a.packs[i], mode).perimeter).toBeCloseTo(ref.packOutline(b, b.packs[i], mode).perimeter, 6);
      n++;
    }
    expect(n).toBeGreaterThan(500);
  });
});
