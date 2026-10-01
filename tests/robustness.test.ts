/** Kein Absturz bei beliebigen (auch unsinnigen) Eingaben – Akzeptanzkriterium 8. */
import { describe, expect, it } from 'vitest';
import type { BatteryConfig } from '../src/core';
import { balanceTaps, DEFAULT_CONFIG, solve } from '../src/core';
import { planSheets } from '../src/export/sheets';
import { buildParts } from '../src/fishpaper/parts';
import { DEFAULT_FISHPAPER } from '../src/state/config';
import { faceModel } from '../src/view/faceModel';
import { topModel } from '../src/view/topModel';
import { assumptions } from '../src/view/assumptions';

function rng(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

describe('Robustheit', () => {
  it('500 Zufallskonfigurationen laufen komplett durch (Solver, Ansichten, Fishpaper, Seitenplan)', () => {
    const r = rng(42);
    const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
    let solved = 0;
    for (let n = 0; n < 500; n++) {
      const series = 1 + Math.floor(r() * 40);
      const parallel = 1 + Math.floor(r() * 4);
      const subPacks = 1 + Math.floor(r() * 4);
      const booster =
        r() < 0.25
          ? { series: 1 + Math.floor(r() * 4), cellsPerRow: 1 + Math.floor(r() * 4), position: pick(['plus', 'minus'] as const) }
          : null;
      const cfg: BatteryConfig = {
        ...DEFAULT_CONFIG,
        series,
        parallel,
        subPacks,
        cellsPerRow: 1 + Math.floor(r() * 20),
        stacking: pick(['honeycomb', 'grid'] as const),
        offsetSide: pick(['L', 'R'] as const),
        booster,
        mainMinus: { end: pick(['V', 'H'] as const), side: pick(['L', 'R'] as const) },
        mainPlus: { end: pick(['V', 'H'] as const), side: pick(['L', 'R'] as const) },
        spacing:
          r() < 0.3
            ? { ...DEFAULT_CONFIG.spacing, mode: 'spacer', gapRow: r() * 3, gapLayer: r() * 3, holderRim: r() * 2 }
            : DEFAULT_CONFIG.spacing,
      };
      const L = solve(cfg);
      if (!L.packs.length) {
        expect(L.issues.some((i) => i.level === 'error')).toBe(true);
        continue;
      }
      solved++;
      balanceTaps(L);
      assumptions(L);
      topModel(L, pick(['left', 'right', 'center'] as const));
      for (const p of L.packs) for (const f of ['V', 'H'] as const) faceModel(L, p, f);
      const parts = buildParts(L, {
        ...DEFAULT_FISHPAPER,
        outlineFace: pick(['straight', 'tucked'] as const),
        wrapFold: pick([0, 5]),
      });
      planSheets(parts, pick(['a4', 'a3', 'plotter'] as const), pick(['tile', 'split'] as const));
    }
    expect(solved).toBeGreaterThan(50);
  });

  it('unerfüllbarer Wunsch: verständliche Warnung, kein Fehler', () => {
    const L = solve({ ...DEFAULT_CONFIG, series: 10, subPacks: 1, cellsPerRow: 10 });
    expect(L.packs.length).toBe(1);
    expect(L.issues.map((i) => i.msg)).toContain(
      'Gewünschte Lage von Hauptplus/-minus ist mit dieser Aufteilung nicht direkt erreichbar – Anschluss wird per Kabel umgelegt.',
    );
  });

  it('kaputte Zahlen liefern Fehlermeldungen statt Ausnahmen', () => {
    const bad: Partial<BatteryConfig>[] = [
      { series: 0 },
      { parallel: 0 },
      { subPacks: 0 },
      { cellsPerRow: 0 },
      { cellsPerRow: NaN },
      { seriesSplit: [0, 18] },
      { seriesSplit: [20, -2] },
      { booster: { series: 18, cellsPerRow: 2, position: 'plus' } },
      { cell: { ...DEFAULT_CONFIG.cell, diameter: 0 } },
      { spacing: { ...DEFAULT_CONFIG.spacing, mode: 'spacer', gapRow: NaN, gapLayer: NaN, holderRim: NaN } },
    ];
    for (const b of bad) {
      const L = solve({ ...DEFAULT_CONFIG, ...b });
      expect(L.packs, JSON.stringify(b)).toEqual([]);
      expect(L.issues.some((i) => i.level === 'error')).toBe(true);
    }
  });
});
