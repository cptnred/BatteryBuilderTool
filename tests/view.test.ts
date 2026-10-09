/** Zeichenmodelle (rein) und Kennzahlen – mit konkreten Zahlen. */
import { describe, expect, it } from 'vitest';
import type { BatteryConfig, BoosterSpec, SubPack } from '../src/core';
import { DEFAULT_CONFIG, dimensions, nickelBom, nickelTotals, pitches, placeCells, solve, stripPosition } from '../src/core';
import { assumptions } from '../src/view/assumptions';
import { connectionOf } from '../src/view/connections';
import { faceModel, faceTitle, stagger } from '../src/view/faceModel';
import { topModel } from '../src/view/topModel';

const L18 = solve(DEFAULT_CONFIG);
const [A] = L18.packs;

describe('Geometrie mit konkreten Zahlen', () => {
  it('Mittenabstände 21700 / 0,3 mm Wabe', () => {
    const p = pitches(DEFAULT_CONFIG);
    expect(p.px).toBeCloseTo(21.7, 9);
    expect(p.off).toBeCloseTo(10.85, 9);
    expect(p.diag).toBeCloseTo(21.7, 9);
    expect(p.pz).toBeCloseTo(Math.sqrt(21.7 ** 2 - 10.85 ** 2), 9); // 18,7928…
  });

  it('Raster mit Abstandhalter 1,5 mm', () => {
    const p = pitches({
      ...DEFAULT_CONFIG,
      stacking: 'grid',
      spacing: { ...DEFAULT_CONFIG.spacing, mode: 'spacer', gapRow: 1.5, gapLayer: 1.5 },
    });
    expect(p).toMatchObject({ px: 22.9, pz: 22.9, off: 0 });
  });

  it('Zellplatzierung 9 je Lage, 2 Lagen: Breite und Höhe', () => {
    const { cells, width, height } = placeCells(DEFAULT_CONFIG, 9, 2);
    expect(width).toBeCloseTo(8 * 21.7 + 10.85 + 21.4, 9); // 205,85
    expect(height).toBeCloseTo(18.7928 + 21.4, 3); // 40,19
    // Wabe links: Lage 0 steht um off weiter rechts
    expect(cells.find((c) => c.id === 'L0-0')!.x).toBeCloseTo(10.7 + 10.85, 9);
    expect(cells.find((c) => c.id === 'L1-0')!.x).toBeCloseTo(10.7, 9);
  });

  it('Maße: Gesamtlänge = Summe der Längen + Zwischenlage', () => {
    const d = dimensions(L18);
    expect(d.main.length).toBeCloseTo(70.4 + 70.4 + 0.5, 9);
    expect(d.main.width).toBeCloseTo(205.85, 2);
  });

  it('Nickelstreifen-Stückliste 18S2P', () => {
    // je Pack: 1 Start- (2 Zellen), 8 Serien- (4 Zellen), 1 End-Streifen (2 Zellen)
    expect(nickelTotals(L18)).toEqual([
      { cells: 2, count: 4 },
      { cells: 4, count: 16 },
    ]);
    const a = nickelBom(L18).filter((r) => r.pack === 'P0');
    expect(a).toEqual([
      { pack: 'P0', packLabel: 'Pack A (vorne)', face: 'V', cells: 2, count: 1 },
      { pack: 'P0', packLabel: 'Pack A (vorne)', face: 'V', cells: 4, count: 4 },
      { pack: 'P0', packLabel: 'Pack A (vorne)', face: 'H', cells: 2, count: 1 },
      { pack: 'P0', packLabel: 'Pack A (vorne)', face: 'H', cells: 4, count: 4 },
    ]);
  });

  it('Lage eines Streifens im Pack (global)', () => {
    expect(stripPosition(A, A.strips[0].cells)).toBe('rechts'); // B0 rechts
    expect(stripPosition(A, A.strips.at(-1)!.cells)).toBe('links'); // B9 links
  });
});

describe('Stirnseitenansicht', () => {
  it('Vorderseite gespiegelt: global rechts erscheint links, R-Marker links', () => {
    const v = faceModel(L18, A, 'V');
    const h = faceModel(L18, A, 'H');
    expect(v.mirrored).toBe(true);
    expect(v.markers).toMatchObject({ left: 'R', right: 'L' });
    expect(h.markers).toMatchObject({ left: 'L', right: 'R' });
    const cv = v.cells.find((c) => c.id === 'L0-8')!; // global ganz rechts unten
    const ch = h.cells.find((c) => c.id === 'L0-8')!;
    expect(cv.cx).toBeCloseTo(A.width - ch.cx, 9);
    expect(cv.cx).toBeLessThan(A.width / 2);
    expect(cv.cy).toBeCloseTo(A.height - 10.7, 9);
  });

  it('Polarität und Gruppe je Zelle (Skizze 18S2P, Pack A vorne)', () => {
    const v = faceModel(L18, A, 'V');
    const byId = new Map(v.cells.map((c) => [c.id, c]));
    expect(byId.get('L0-8')).toMatchObject({ group: 1, polarity: '−' });
    expect(byId.get('L1-7')).toMatchObject({ group: 2, polarity: '+' });
    expect(byId.get('L0-0')).toMatchObject({ group: 9, polarity: '−' });
  });

  it('Bk-Labels und Fahnen: B0 unten links (Blick von vorne), B9-Brücke hinten', () => {
    const v = faceModel(L18, A, 'V');
    expect(v.labels.map((l) => l.text)).toEqual(['B0', 'B2', 'B4', 'B6', 'B8']);
    expect(v.flags).toHaveLength(1);
    expect(v.flags[0]).toMatchObject({ text: 'HAUPT − (B0)', role: 'minus', dir: 'down' });
    const h = faceModel(L18, A, 'H');
    expect(h.flags[0]).toMatchObject({ text: 'BRÜCKE → Pack B (B9)', role: 'bridge', dir: 'down' });
    expect(h.labels.find((l) => l.node === 9)!.role).toBe('bridge');
  });

  it('32S1P: Fahne nach oben ersetzt das Bk-Label (wie Skizze)', () => {
    const L = solve({ ...DEFAULT_CONFIG, series: 32, parallel: 1, cellsPerRow: 8 });
    const v = faceModel(L, L.packs[0], 'V');
    const up = v.flags.find((f) => f.dir === 'up')!;
    expect(up.text).toBe('BRÜCKE → Pack B (B16)');
    expect(v.labels.some((l) => l.node === 16)).toBe(false);
    expect(up.box.y).toBeLessThan(Math.min(...v.labels.map((l) => l.y)));
  });

  it('Staffelung überlappender Beschriftungen', () => {
    expect(
      stagger(
        [
          { x0: 0, x1: 10 },
          { x0: 5, x1: 15 },
          { x0: 20, x1: 30 },
        ],
        1,
      ),
    ).toEqual([0, 1, 0]);
  });
});

describe('Anschlüsse und Booster', () => {
  it('Booster am Plus: Eingang und Systemplus', () => {
    const L = solve({ ...DEFAULT_CONFIG, series: 20, booster: { series: 2, cellsPerRow: 2, position: 'plus' } });
    const boost = L.packs.find((p) => p.role === 'booster')!;
    const texts = boost.strips.map((s) => connectionOf(L, boost, s)?.text).filter(Boolean);
    expect(texts).toEqual(['EINGANG von Pack B + (B18)', 'SYSTEM + (B20)']);
    const top = topModel(L);
    expect(top.links.find((l) => l.kind === 'cable')!.lines[0]).toBe('HAUPT + (B18) → Booster −');
    expect(top.flags.map((f) => f.text)).toEqual(['HAUPT −', 'SYSTEM + (B20)']);
  });

  it('Booster am Minus: Kette beginnt am Booster', () => {
    const L = solve({ ...DEFAULT_CONFIG, series: 20, booster: { series: 2, cellsPerRow: 2, position: 'minus' } });
    expect(L.chain[0]).toBe('BOOST');
    const boost = L.packs.find((p) => p.role === 'booster')!;
    const texts = boost.strips.map((s) => connectionOf(L, boost, s)?.text).filter(Boolean);
    expect(texts).toEqual(['SYSTEM − (B0)', 'AUSGANG → Pack A − (B2)']);
  });
});

describe('Draufsicht', () => {
  it('18S2P: Hauptminus vorne rechts, Hauptplus hinten rechts, Brücke innen links', () => {
    const m = topModel(L18);
    const minus = m.flags.find((f) => f.role === 'minus')!;
    const plus = m.flags.find((f) => f.role === 'plus')!;
    const pa = m.packs[0];
    const pb = m.packs[1];
    expect(minus.x).toBeGreaterThan(pa.x + pa.w / 2);
    expect(minus.y1).toBe(pa.y); // Vorderkante
    expect(minus.y2).toBeLessThan(minus.y1); // Fahne nach vorne
    expect(plus.y1).toBeCloseTo(pb.y + pb.l, 9);
    const br = m.links.find((l) => l.kind === 'inner')!;
    expect(Math.min(...br.points.map((p) => p.x))).toBeLessThan(0);
    expect(m.packs.map((p) => p.arrow.x2 < p.arrow.x1)).toEqual([true, false]); // A rechts→links, B links→rechts
  });

  it('32S1P: Brücke als Kabel links außen', () => {
    const L = solve({ ...DEFAULT_CONFIG, series: 32, parallel: 1, cellsPerRow: 8 });
    const br = topModel(L).links.find((l) => l.kind === 'outer')!;
    expect(br.lines[0]).toBe('BRÜCKE B16 (Kabel links außen)');
    expect(Math.min(...br.points.map((p) => p.x))).toBeLessThan(0);
  });

  it('ungleiche Packbreiten werden bündig rechts gezeichnet', () => {
    const L = solve({
      ...DEFAULT_CONFIG,
      series: 32,
      parallel: 1,
      cellsPerRow: 9,
      seriesSplit: [14, 18],
      cellsPerRowSplit: [7, 9],
    });
    const [a, b] = topModel(L, 'right').packs;
    expect(a.x + a.w).toBeCloseTo(b.x + b.w, 9);
    const [c, d] = topModel(L, 'left').packs;
    expect(c.x).toBe(0);
    expect(d.x).toBe(0);
  });
});

describe('Annahmen-Text', () => {
  it('18S2P nennt Wabe links, Start unten rechts und Brücke innen', () => {
    const t = assumptions(L18).join('\n');
    expect(t).toContain('Wabe: ungerade Lagen um ½ Zelle nach links versetzt');
    expect(t).toContain('Pack A läuft von rechts nach links und beginnt unten rechts');
    expect(t).toContain('Pack B läuft von links nach rechts und beginnt oben links');
    expect(t).toContain('Brücke B9 innen zwischen Pack A und Pack B, links.');
  });
});

describe('Geteilter Booster (Plan 07 §6)', () => {
  const A = solve({ ...DEFAULT_CONFIG, series: 20, booster: { series: 2, cellsPerRow: 1, position: 'plus', subPacks: 2 } });
  const B = solve({
    ...DEFAULT_CONFIG,
    series: 20,
    cellsPerRow: 8,
    booster: { series: 4, cellsPerRow: 2, position: 'plus', subPacks: 2 },
  });
  const C = solve({
    ...DEFAULT_CONFIG,
    series: 20,
    cellsPerRow: 8,
    booster: { series: 4, cellsPerRow: 3, position: 'plus', subPacks: 2, seriesSplit: [3, 1], cellsPerRowSplit: [3, 1] },
  });
  const [, mainB, a, b] = A.packs;
  const texts = (p: SubPack) => p.strips.map((s) => connectionOf(A, p, s)?.text).filter(Boolean);

  it('Anschlusstexte: Eingang, Brücke, Systemplus', () => {
    expect(texts(a)).toEqual(['EINGANG von Pack B + (B18)', 'BRÜCKE → Booster B (B19)']);
    expect(texts(b)).toEqual(['BRÜCKE ← Booster A (B19)', 'SYSTEM + (B20)']);
    expect(texts(mainB).at(-1)).toBe('HAUPT + → Booster (B18)');
  });

  it('Titel der Stirnseiten', () => {
    expect(faceTitle(a, 'V')).toBe('Booster A (1S2P) – Stirnseite 1 (Blick von außen)');
    expect(faceTitle(b, 'H')).toBe('Booster B (1S2P) – Stirnseite 2 (Blick von außen)');
  });

  it('Annahmen: Brücke im Booster und Gehäuse-Satz', () => {
    expect(assumptions(A)).toContain('Brücke B19 innen zwischen Booster A und Booster B, rechts.');
    expect(assumptions(A)).toContain('Booster: 2 Einzelpacks hintereinander in einem Gehäuse, Isolierlage dazwischen.');
    expect(assumptions(B)).toContain(
      'Brücke B18 außen herum (rechts): gerade Gruppenzahl, Kabel von Booster A-Stirnseite 1 nach Booster B-Stirnseite 2.',
    );
    const single = solve({ ...DEFAULT_CONFIG, series: 20, booster: { series: 2, cellsPerRow: 2, position: 'plus' } });
    expect(assumptions(single).some((t) => t.startsWith('Booster: '))).toBe(false);
  });

  it('Draufsicht: Blöcke hintereinander, Brücke innen, Kabel am Anfang, SYSTEM-Fahne am Ende der Kette', () => {
    const m = topModel(A);
    const [, pb, ta, tb] = m.packs;
    expect([ta.key, tb.key]).toEqual(['BOOST0', 'BOOST1']);
    expect(ta.booster && tb.booster).toBe(true);
    expect(ta.y).toBeGreaterThan(pb.y + pb.l);
    expect(tb.y).toBeGreaterThan(ta.y + ta.l);
    expect(tb.x + tb.w).toBeCloseTo(ta.x + ta.w, 9);
    expect(m.links.filter((l) => l.kind === 'inner').map((l) => l.lines[0])).toEqual(['BRÜCKE B9', 'BRÜCKE B19']);
    const cable = m.links.find((l) => l.kind === 'cable')!;
    expect(cable.lines[0]).toBe('HAUPT + (B18) → Booster −');
    // Kabel an der Vorderkante des ersten Einzelpacks, links (Start V/L)
    expect(cable.points.at(-1)!.y).toBeCloseTo(ta.y, 9);
    expect(cable.points.at(-1)!.x).toBeLessThan(ta.x + ta.w / 2);
    // SYSTEM-Fahne an der Hinterkante des letzten Einzelpacks, links (Ende H/L)
    const sys = m.flags.find((f) => f.text === 'SYSTEM + (B20)')!;
    expect(sys.y1).toBeCloseTo(tb.y + tb.l, 9);
    expect(sys.x).toBeLessThan(tb.x + tb.w / 2);
    expect(m.flags.map((f) => f.text)).toEqual(['HAUPT −', 'SYSTEM + (B20)']);
  });

  it('Draufsicht: Brücke außen im Booster', () => {
    const outer = topModel(B).links.filter((l) => l.kind === 'outer');
    expect(outer.map((l) => l.lines[0])).toEqual(['BRÜCKE B8 (Kabel links außen)', 'BRÜCKE B18 (Kabel rechts außen)']);
  });

  it('Draufsicht: ungleich breite Einzelpacks bündig wie eingestellt; schmaler Block mit Kurzname', () => {
    const right = topModel(C, 'right').packs.slice(2);
    expect(right[0].x + right[0].w).toBeCloseTo(right[1].x + right[1].w, 9);
    const left = topModel(C, 'left').packs.slice(2);
    expect(left[0].x).toBeCloseTo(left[1].x, 9);
    expect(right[0]).toMatchObject({ label: 'Booster A (3S2P)', compact: false });
    expect(right[1]).toMatchObject({ label: 'Booster B', compact: true });
    // Hauptpack und ungeteilter Booster bleiben, wie sie sind
    const single = topModel(solve({ ...DEFAULT_CONFIG, series: 20, booster: { series: 2, cellsPerRow: 2, position: 'plus' } }));
    expect(single.packs.map((p) => [p.label, p.compact])).toEqual([
      ['Pack A (vorne)', false],
      ['Pack B (hinten)', false],
      ['Booster 2S2P', false],
    ]);
  });

  // Review Focus 5
  it('Booster breiter als der Hauptpack, am Hauptminus, geteilt: alles liegt im Bild', () => {
    const L = solve({
      ...DEFAULT_CONFIG,
      series: 12,
      subPacks: 1,
      cellsPerRow: 4,
      booster: { series: 8, cellsPerRow: 8, position: 'minus', subPacks: 2 },
    });
    expect(L.packs.map((p) => p.key)).toEqual(['P0', 'BOOST0', 'BOOST1']);
    for (const align of ['left', 'center', 'right'] as const) {
      const m = topModel(L, align);
      const vb = m.viewBox;
      const inX = (x: number) => x >= vb.x - 1e-9 && x <= vb.x + vb.w + 1e-9;
      const inY = (y: number) => y >= vb.y - 1e-9 && y <= vb.y + vb.h + 1e-9;
      for (const p of m.packs) expect(inX(p.x) && inX(p.x + p.w) && inY(p.y) && inY(p.y + p.l), `${align} ${p.key}`).toBe(true);
      for (const l of m.links) for (const q of l.points) expect(inX(q.x) && inY(q.y), `${align} ${l.lines[0]}`).toBe(true);
      for (const f of m.flags) expect(inX(f.x) && inY(f.y1) && inY(f.y2), `${align} ${f.text}`).toBe(true);
    }
  });

  it('Maße: Booster gesamt = Summe der Längen + Zwischenlage', () => {
    const d = dimensions(A);
    expect(d.booster!.length).toBeCloseTo(70.4 + 70.4 + 0.5, 9);
    expect(d.booster!.width).toBeCloseTo(32.25, 6);
    expect(d.booster!.height).toBeCloseTo(40.1928, 3);
    expect(dimensions(L18).booster).toBeUndefined();
  });
});

describe('Booster mit eigener Lagenzahl: Annahmen (Plan 07 §4.3)', () => {
  const withBooster = (booster: BoosterSpec, patch: Partial<BatteryConfig> = {}) =>
    assumptions(solve({ ...DEFAULT_CONFIG, series: 18 + booster.series, ...patch, booster }));
  const deviating = (lines: string[]) => lines.filter((t) => t.includes('abweichend'));

  it('3 Lagen am 2-lagigen Hauptpack: Spalten-Serpentine', () => {
    const lines = withBooster({ series: 3, cellsPerRow: 2, position: 'plus' });
    expect(lines).toContain('Verbindungen immer schräg (Zickzack), beginnend unten.');
    expect(deviating(lines)).toEqual(['Booster abweichend: 3 Lagen, Verschaltung als Spalten-Serpentine (Spalte für Spalte).']);
  });

  it('1 Lage am 2-lagigen Hauptpack: Zellen nebeneinander; auch geteilt nur ein Satz', () => {
    const one = ['Booster abweichend: 1 Lage, alle Zellen nebeneinander.'];
    expect(deviating(withBooster({ series: 2, cellsPerRow: 4, position: 'plus' }))).toEqual(one);
    expect(deviating(withBooster({ series: 2, cellsPerRow: 2, position: 'minus', subPacks: 2 }))).toEqual(one);
  });

  it('2 Lagen am 1-lagigen Hauptpack: Zickzack', () => {
    const lines = withBooster({ series: 2, cellsPerRow: 2, position: 'plus' }, { cellsPerRow: 18 });
    expect(deviating(lines)).toEqual(['Booster abweichend: 2 Lagen, Verbindungen schräg (Zickzack).']);
  });

  it('gleiche Lagenzahl oder Raster: kein Satz', () => {
    expect(deviating(withBooster({ series: 2, cellsPerRow: 2, position: 'plus' }))).toEqual([]);
    expect(deviating(withBooster({ series: 2, cellsPerRow: 1, position: 'plus', subPacks: 2 }))).toEqual([]);
    expect(deviating(withBooster({ series: 2, cellsPerRow: 4, position: 'plus' }, { stacking: 'grid' }))).toEqual([]);
  });
});

describe('Geteilter Booster am Hauptminus (Plan 07 §3.6 D, §6)', () => {
  const D = solve({ ...DEFAULT_CONFIG, series: 20, booster: { series: 2, cellsPerRow: 1, position: 'minus', subPacks: 2 } });
  const [p0, p1, a, b] = D.packs;
  const texts = (p: SubPack) => p.strips.map((s) => connectionOf(D, p, s)?.text).filter(Boolean);

  it('Anschlusstexte: Systemminus, Brücke, Ausgang', () => {
    expect(texts(a)).toEqual(['SYSTEM − (B0)', 'BRÜCKE → Booster B (B1)']);
    expect(texts(b)).toEqual(['BRÜCKE ← Booster A (B1)', 'AUSGANG → Pack A − (B2)']);
    expect(texts(p0)[0]).toBe('HAUPT − ← Booster (B2)');
    expect(texts(p1).at(-1)).toBe('HAUPT + (B20)');
    expect(assumptions(D)).toContain('Booster per Kabel an B2 (am Hauptminus), eigenes Gehäuse.');
  });

  it('Draufsicht: Booster vor dem Hauptpack, Kabel am Ende der Booster-Kette, SYSTEM-Fahne an ihrem Anfang', () => {
    const m = topModel(D);
    const [pa, , ta, tb] = m.packs;
    expect([ta.key, tb.key]).toEqual(['BOOST0', 'BOOST1']);
    expect(ta.y).toBeLessThan(tb.y);
    expect(tb.y + tb.l).toBeLessThan(pa.y);
    expect(m.links.filter((l) => l.kind === 'inner').map((l) => l.lines[0])).toEqual(['BRÜCKE B1', 'BRÜCKE B11']);
    const cable = m.links.find((l) => l.kind === 'cable')!;
    expect(cable.lines[0]).toBe('HAUPT − (B2) ← Booster +');
    expect(cable.role).toBe('minus');
    // vom Hauptminus (Pack A, Vorderkante rechts) zur Hinterkante des letzten Einzelpacks, links (Ende H/L)
    expect(cable.points[0].y).toBeCloseTo(pa.y, 9);
    expect(cable.points[0].x).toBeGreaterThan(pa.x + pa.w / 2);
    expect(cable.points.at(-1)!.y).toBeCloseTo(tb.y + tb.l, 9);
    expect(cable.points.at(-1)!.x).toBeLessThan(tb.x + tb.w / 2);
    // SYSTEM-Fahne an der Vorderkante des ersten Einzelpacks, links (Start V/L), Stiel nach vorne
    const sys = m.flags.find((f) => f.text === 'SYSTEM − (B0)')!;
    expect(sys).toMatchObject({ role: 'minus', anchor: 'start' });
    expect(sys.y1).toBeCloseTo(ta.y, 9);
    expect(sys.y2).toBeLessThan(sys.y1);
    expect(sys.x).toBeLessThan(ta.x + ta.w / 2);
    expect(m.flags.map((f) => f.text)).toEqual(['HAUPT +', 'SYSTEM − (B0)']);
  });
});
