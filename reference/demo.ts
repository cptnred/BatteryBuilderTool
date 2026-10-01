/**
 * demo.ts – erzeugt reference/fixtures/*.json und reference/debug/*.svg
 *   node --experimental-strip-types reference/demo.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BatteryConfig } from './pack-core.ts';
import { DEFAULT_CONFIG, CELL_PRESETS, solve, balanceTaps, packOutline, stats } from './pack-core.ts';
import { layoutSVG } from './debug-svg.ts';

const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(here, 'fixtures'), { recursive: true });
mkdirSync(join(here, 'debug'), { recursive: true });

const base = DEFAULT_CONFIG;
export const CASES: Record<string, BatteryConfig> = {
  '18S2P_21700': base,
  '32S1P_21700': { ...base, series: 32, parallel: 1, cellsPerRow: 8 },
  '20S2P_21700': { ...base, series: 20, cellsPerRow: 10 },
  '20S2P_split_18S2P+2S2P_21700': { ...base, series: 20, booster: { series: 2, cellsPerRow: 2, position: 'plus' } },
  '18S2P_18650': { ...base, cell: CELL_PRESETS['18650'] },
  '18S2P_21700_Wabe_rechts': { ...base, offsetSide: 'R' },
  '18S2P_21700_Raster_Abstandhalter': { ...base, stacking: 'grid', spacing: { ...base.spacing, mode: 'spacer', gapRow: 1.5, gapLayer: 1.5, holderRim: 1.2 } },
  '13S2P_21700_1Pack_Minus_vorne_links': { ...base, series: 13, subPacks: 1, cellsPerRow: 13, mainMinus: { end: 'V', side: 'L' }, mainPlus: { end: 'H', side: 'R' } },
  // absichtlich unmöglich: 1 Pack, gerade Gruppenzahl -> Plus landet auf derselben Stirnseite -> Warnung
  '10S2P_21700_1Pack_unmoeglich': { ...base, series: 10, subPacks: 1, cellsPerRow: 10 },
  '32S1P_21700_Split_14+18_vorne_hinten': { ...base, series: 32, parallel: 1, cellsPerRow: 9, seriesSplit: [14, 18], cellsPerRowSplit: [7, 9] },
  // absichtlich fehlerhaft: 18 Zellen passen nicht in Lagen à 7 -> error, keine Packs
  '18S2P_Fehler_Zellen_je_Lage': { ...base, cellsPerRow: 7 },
};

for (const [name, cfg] of Object.entries(CASES)) {
  const L = solve(cfg);
  if (!L.packs.length) {
    writeFileSync(join(here, 'fixtures', `${name}.json`), JSON.stringify({ name, config: cfg, issues: L.issues }, null, 1));
    console.log(`${name.padEnd(40)} -> ${L.issues.map((i) => i.level + ': ' + i.msg).join(' | ')}`);
    continue;
  }
  const fx = {
    name,
    config: cfg,
    stats: stats(L),
    chain: L.chain,
    cost: L.cost,
    issues: L.issues,
    bridges: L.bridges,
    packs: L.packs.map((p) => ({
      key: p.key, label: p.label, dir: p.dir, startFace: p.startFace, endFace: p.endFace, startSide: p.startSide, endSide: p.endSide,
      layers: p.layers, perRow: p.perRow, width: +p.width.toFixed(2), height: +p.height.toFixed(2), length: +p.length.toFixed(2),
      groups: p.groups.map((g) => ({ s: g.s, minusFace: g.minusFace, cells: g.cells })),
      strips: p.strips.map((s) => ({ node: s.node, face: s.face, kind: s.kind, cells: s.cells })),
      outline: {
        straightPerimeter: +packOutline(L, p, 'straight').perimeter.toFixed(1),
        tuckedPerimeter: +packOutline(L, p, 'tucked').perimeter.toFixed(1),
      },
    })),
    taps: balanceTaps(L).map((t) => ({ node: t.node, label: t.label, spots: t.spots.map((s) => `${s.pack}/${s.face}/${s.kind}`) })),
  };
  writeFileSync(join(here, 'fixtures', `${name}.json`), JSON.stringify(fx, null, 1));
  writeFileSync(join(here, 'debug', `${name}.svg`), layoutSVG(L, name));
  const summary = L.packs.map((p) => `${p.key}:${p.dir}/${p.startFace}->${p.endFace} ${p.startSide}->${p.endSide} ${p.width.toFixed(1)}x${p.height.toFixed(1)} U=${fx.packs.find((q) => q.key === p.key)!.outline.straightPerimeter}/${fx.packs.find((q) => q.key === p.key)!.outline.tuckedPerimeter}`).join(' | ');
  console.log(`${name.padEnd(40)} cost=${L.cost} ${summary}`);
  L.issues.forEach((i) => console.log(`   [${i.level}] ${i.msg}`));
}
