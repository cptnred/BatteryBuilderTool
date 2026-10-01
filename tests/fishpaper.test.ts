import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { BatteryConfig } from '../src/core';
import { DEFAULT_CONFIG, packOutline, solve } from '../src/core';
import { boxInside, clipPath, pointInPolygon, polygonArea, textBox } from '../src/fishpaper/geom2d';
import { flattenSegs, notchSegs, polylineSegs, segsArea } from '../src/fishpaper/segments';
import { shelfPack } from '../src/fishpaper/nesting';
import { buildParts, partsBom } from '../src/fishpaper/parts';
import { splitRanges, tileGrid, tileStarts } from '../src/fishpaper/tiling';
import type { FishpaperOptions } from '../src/fishpaper/types';
import { DEFAULT_FISHPAPER } from '../src/state/config';

const opts: FishpaperOptions = DEFAULT_FISHPAPER;
const L18 = solve(DEFAULT_CONFIG);
const fixture = (name: string) =>
  JSON.parse(readFileSync(join(import.meta.dirname, '..', 'reference', 'fixtures', `${name}.json`), 'utf8')) as {
    config: BatteryConfig;
    packs: { key: string; outline: { straightPerimeter: number; tuckedPerimeter: number } }[];
  };

describe('Teile 18S2P', () => {
  const parts = buildParts(L18, opts);
  const byId = (id: string) => parts.find((p) => p.id === id)!;

  it('erzeugt Stirnseiten, Zwischenlage, Seitenteile und Umwicklungen', () => {
    expect(parts.map((p) => p.id)).toEqual(['face-V-P0', 'face-H-P1', 'inter-P0-P1', 'side-P0', 'side-P1', 'wrap-P0', 'wrap-P1']);
  });

  it('Umwicklung: Länge = Umfang + Überlappung, Breite = Packlänge (Fixture ±0,1 mm)', () => {
    const w = byId('wrap-P0');
    expect(Math.abs(w.w - (458.8 + 10))).toBeLessThanOrEqual(0.1);
    expect(w.h).toBeCloseTo(70.4, 6);
    // Biegemarken: bei "gerade" 4 Bogenbereiche (Parallelogramm-Ecken)
    expect(w.zones.length).toBe(4);
  });

  it('Umwicklung eingebogen und mit Umschlag: Falzlinien und Einschnitte', () => {
    const p = buildParts(L18, { ...opts, outlineWrap: 'tucked', wrapFold: 8 });
    const w = p.find((x) => x.id === 'wrap-P0')!;
    // Umfang mit Kleber-Sehnen (Plan §4): 628,18 statt 647,27 mm
    expect(Math.abs(w.w - (628.18 + 10))).toBeLessThanOrEqual(0.01);
    expect(w.h).toBeCloseTo(70.4 + 16, 6);
    // 18 Täler -> je eine Falzlinie in der Sehnenmitte, Start bei 0 ohne Linie -> 17 + 2 Umschlaglinien längs
    expect(w.fold.length).toBe(19);
    // Einschnitte je Falz oben und unten, jeweils genau bis zur Knicklinie (8 mm)
    const slits = w.cut.slice(1);
    expect(slits.length % 2).toBe(0);
    for (const s of slits) expect(Math.abs(s.pts[1].y - s.pts[0].y)).toBeCloseTo(8, 6);
  });

  it('Umfänge aller Fixtures stimmen auf ±0,1 mm (Kern-Umriss; Umwicklung gerade ohne Überlappung)', () => {
    for (const name of [
      '18S2P_21700',
      '32S1P_21700',
      '20S2P_21700',
      '18S2P_18650',
      '18S2P_21700_Raster_Abstandhalter',
      '20S2P_split_18S2P+2S2P_21700',
    ]) {
      const fx = fixture(name);
      const L = solve(fx.config);
      const ps = buildParts(L, { ...opts, outlineWrap: 'straight', wrapOverlap: 0 });
      for (const fp of fx.packs) {
        const pack = L.packs.find((p) => p.key === fp.key)!;
        const w = ps.find((p) => p.id === `wrap-${fp.key}`)!;
        expect(Math.abs(w.w - fp.outline.straightPerimeter), `${name} ${fp.key} gerade`).toBeLessThanOrEqual(0.1);
        // eingebogen: Kern-Umriss unverändert = Fixture; die Umwicklung selbst ist mit Kleber-Sehnen kürzer
        const core = packOutline(L, pack, 'tucked').perimeter;
        expect(Math.abs(core - fp.outline.tuckedPerimeter), `${name} ${fp.key} eingebogen`).toBeLessThanOrEqual(0.1);
      }
    }
  });

  it('Spiegeltest: Vorderabdeckung ist das Spiegelbild der Rückabdeckung', () => {
    for (const mode of ['straight', 'tucked'] as const) {
      const p = buildParts(L18, { ...opts, outlineFace: mode });
      const V = p.find((x) => x.id === 'face-V-P0')!;
      const H = p.find((x) => x.id === 'face-H-P1')!;
      expect(V.w).toBeCloseTo(H.w, 9);
      expect(V.h).toBeCloseTo(H.h, 9);
      const mirroredH = H.cut[0].pts.map((q) => ({ x: V.w - q.x, y: q.y }));
      // jeder Punkt der gespiegelten Rückabdeckung liegt auf der Vorderabdeckung
      const key = (q: { x: number; y: number }) => `${q.x.toFixed(6)},${q.y.toFixed(6)}`;
      const vset = new Set(V.cut[0].pts.map(key));
      expect(mirroredH.every((q) => vset.has(key(q)))).toBe(true);
      expect(V.cut[0].pts.length).toBe(H.cut[0].pts.length);
      // Die Wabe ist nicht spiegelsymmetrisch: ohne Spiegelung wären die Teile verschieden
      const hset = new Set(H.cut[0].pts.map(key));
      expect(V.cut[0].pts.every((q) => hset.has(key(q)))).toBe(false);
      // Beschriftung von außen: Vorderseite R links, Rückseite L links
      const firstMarker = (part: typeof V) =>
        part.texts.filter((t) => t.text === 'R' || t.text === 'L').sort((a, b) => a.x - b.x)[0].text;
      expect(firstMarker(V)).toBe('R');
      expect(firstMarker(H)).toBe('L');
      expect(V.texts.some((t) => t.text.includes('Vorderseite – bedruckte Seite außen'))).toBe(true);
    }
  });

  it('alle Texte liegen vollständig im Teil (kreuzen keine Schnittlinie)', () => {
    for (const cfg of [DEFAULT_CONFIG, { ...DEFAULT_CONFIG, series: 13, subPacks: 1, cellsPerRow: 13 }]) {
      for (const mode of ['straight', 'tucked'] as const) {
        const L = solve(cfg);
        for (const p of buildParts(L, { ...opts, outlineFace: mode })) {
          if (p.type !== 'face' && p.type !== 'interlayer') continue;
          for (const t of p.texts) expect(boxInside(textBox(t), p.cut[0].pts), `${p.id} ${mode} "${t.text}"`).toBe(true);
        }
      }
    }
  });

  it('Zwischenlage: Brückenkerbe am nächsten Rand (18S2P: Brücke innen links)', () => {
    const inter = byId('inter-P0-P1');
    const full = buildParts(L18, { ...opts, bridgeCutout: 'none' }).find((p) => p.id === 'inter-P0-P1')!;
    const cutArea = polygonArea(full.cut[0].pts) - polygonArea(inter.cut[0].pts);
    // Kerbe 12 × 3 mm (mindestens, Tiefe ab dem tieferen Kantenpunkt der schrägen Seite),
    // an der linken Packseite = im Blick von vorne rechts
    expect(cutArea).toBeGreaterThan(12 * 3 - 0.5);
    expect(cutArea).toBeLessThan(12 * 8);
    const xs = inter.cut[0].pts.map((q) => q.x);
    const notchX = xs.filter((x) => !full.cut[0].pts.some((q) => Math.abs(q.x - x) < 1e-9));
    expect(Math.min(...notchX)).toBeGreaterThan(inter.w / 2);
    // Schlitz statt Kerbe: Loch als zweiter Schnittpfad
    const slot = buildParts(L18, { ...opts, bridgeCutout: 'slot' }).find((p) => p.id === 'inter-P0-P1')!;
    expect(slot.cut.length).toBe(2);
    expect(polygonArea(slot.cut[1].pts)).toBeCloseTo(36, 6);
    // 32S1P: Brücke außen -> keine Kerbe
    const L32 = solve({ ...DEFAULT_CONFIG, series: 32, parallel: 1, cellsPerRow: 8 });
    const i32 = buildParts(L32, opts).find((p) => p.type === 'interlayer')!;
    expect(i32.cut.length).toBe(1);
  });

  it('Auswahl und Anzahl je Teil, Stückliste in cm²', () => {
    const p = buildParts(L18, {
      ...opts,
      interlayer: 'double',
      partOverrides: { 'side-P0': { enabled: false, count: 2 }, 'wrap-P1': { enabled: true, count: 3 } },
    });
    const bom = partsBom(p);
    expect(bom.rows.find((r) => r.id === 'side-P0')).toBeUndefined();
    expect(bom.rows.find((r) => r.id === 'wrap-P1')!.count).toBe(3);
    expect(bom.rows.find((r) => r.id === 'inter-P0-P1')!.count).toBe(2);
    expect(bom.totalCm2).toBeCloseTo(
      bom.rows.reduce((a, r) => a + r.areaCm2 * r.count, 0),
      9,
    );
  });

  it('Booster bekommt beide Stirnseiten und eine eigene Umwicklung', () => {
    const L = solve({ ...DEFAULT_CONFIG, series: 20, booster: { series: 2, cellsPerRow: 2, position: 'plus' } });
    const ids = buildParts(L, opts).map((p) => p.id);
    expect(ids).toContain('face-V-BOOST');
    expect(ids).toContain('face-H-BOOST');
    expect(ids).toContain('wrap-BOOST');
  });

  it('gemeinsame Umwicklung: Breite = Summe der Längen + Zwischenlagen + 2 × Umschlag', () => {
    const p = buildParts(L18, { ...opts, wrapMode: 'combined', wrapFold: 5 });
    const w = p.find((x) => x.id === 'wrap-ALL')!;
    expect(w.h).toBeCloseTo(70.4 * 2 + 0.5 + 10, 6);
  });
});

describe('2D-Geometrie', () => {
  it('Randkerbe in einem Rechteck 100 × 40', () => {
    const sq = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 40 },
      { x: 0, y: 40 },
    ];
    const n = notchSegs(polylineSegs(sq, true), 30, 12, 3, 'top');
    expect(segsArea(n)).toBeCloseTo(4000 - 36, 9);
    expect(pointInPolygon({ x: 30, y: 1 }, flattenSegs(n, true))).toBe(false);
    expect(pointInPolygon({ x: 30, y: 4 }, flattenSegs(n, true))).toBe(true);
    const b = notchSegs(polylineSegs(sq, true), 70, 10, 5, 'bottom');
    expect(segsArea(b)).toBeCloseTo(4000 - 50, 9);
  });

  it('Pfad auf Rechteck zuschneiden', () => {
    const parts = clipPath(
      {
        closed: false,
        pts: [
          { x: -10, y: 5 },
          { x: 50, y: 5 },
        ],
      },
      { x: 0, y: 0, w: 20, h: 10 },
    );
    expect(parts).toEqual([
      {
        closed: false,
        pts: [
          { x: 0, y: 5 },
          { x: 20, y: 5 },
        ],
      },
    ]);
  });
});

describe('Kachelung', () => {
  it('Kacheln decken das Teil lückenlos ab, Überlappung ≥ 15 mm', () => {
    for (const [w, h, tw, th] of [
      [468.8, 70.4, 277, 122],
      [657.3, 86.4, 190, 209],
      [1200, 400, 277, 190],
      [100, 50, 277, 190],
    ]) {
      const tiles = tileGrid(w, h, tw, th, 15);
      // Vereinigung ⊇ Teilrechteck: jedes Rasterpunkt-Sample liegt in mindestens einer Kachel
      for (let x = 0; x <= w; x += w / 97)
        for (let y = 0; y <= h; y += h / 13)
          expect(tiles.some((t) => x >= t.x - 1e-9 && x <= t.x + t.w + 1e-9 && y >= t.y - 1e-9 && y <= t.y + t.h + 1e-9)).toBe(
            true,
          );
      // Ränder exakt abgedeckt
      expect(Math.min(...tiles.map((t) => t.x))).toBe(0);
      expect(Math.max(...tiles.map((t) => t.x + t.w))).toBeCloseTo(w, 9);
      expect(Math.max(...tiles.map((t) => t.y + t.h))).toBeCloseTo(h, 9);
      // Überlappung benachbarter Kacheln ≥ 15 mm, jede Kachel passt aufs Blatt
      const xs = tileStarts(w, tw, 15);
      for (let i = 1; i < xs.length; i++) expect(xs[i - 1] + tw - xs[i]).toBeGreaterThanOrEqual(15 - 1e-9);
      for (const t of tiles) expect(t.w <= tw + 1e-9 && t.h <= th + 1e-9).toBe(true);
    }
  });

  it('Streifen teilen: Stücke passen und überlappen', () => {
    const r = splitRanges(468.8, 277, 15);
    expect(r.length).toBe(2);
    expect(r[0].x0).toBe(0);
    expect(r.at(-1)!.x1).toBeCloseTo(468.8, 9);
    for (const p of r) expect(p.x1 - p.x0).toBeLessThanOrEqual(277);
    for (let i = 1; i < r.length; i++) expect(r[i - 1].x1 - r[i].x0).toBeCloseTo(15, 9);
  });
});

describe('Regal-Packing', () => {
  it('keine Überlappung, alles innerhalb der Seite', () => {
    const items = Array.from({ length: 23 }, (_, i) => ({ id: `t${i}`, w: 20 + ((i * 37) % 150), h: 10 + ((i * 53) % 90) }));
    const pl = shelfPack(items, 190, 209, 5);
    expect(pl.length).toBe(items.length);
    for (const a of pl) {
      expect(a.x + a.w).toBeLessThanOrEqual(190 + 1e-9);
      expect(a.y + a.h).toBeLessThanOrEqual(209 + 1e-9);
      for (const b of pl)
        if (a !== b && a.bin === b.bin) {
          const sep =
            a.x + a.w + 5 <= b.x + 1e-9 ||
            b.x + b.w + 5 <= a.x + 1e-9 ||
            a.y + a.h + 5 <= b.y + 1e-9 ||
            b.y + b.h + 5 <= a.y + 1e-9;
          expect(sep).toBe(true);
        }
    }
  });
});
