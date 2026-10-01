import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, solve } from '../src/core';
import { buildPdf } from '../src/export/pdf';
import type { PageFormat } from '../src/export/sheets';
import { contentRect, PAGE_SIZES, planSheets } from '../src/export/sheets';
import { buildSvg } from '../src/export/svg';
import { buildParts } from '../src/fishpaper/parts';
import { DEFAULT_FISHPAPER } from '../src/state/config';

const L = solve(DEFAULT_CONFIG);
const parts = buildParts(L, DEFAULT_FISHPAPER);
const meta = { title: '18S2P · 21700 · Wabe links · 0,3 mm', date: '30.09.2026' };

/** Seiteninhalte aus dem unkomprimierten PDF: je Seite ein Content-Stream. */
function pageStreams(pdf: string): string[] {
  const out: string[] = [];
  const re = /stream\r?\n([\s\S]*?)endstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(pdf))) out.push(m[1]);
  return out.filter((s) => s.includes(' re') || s.includes(' l\n') || s.includes('BT'));
}

describe('PDF 1:1', () => {
  for (const format of ['a4', 'a3', 'letter', 'plotter'] as PageFormat[]) {
    it(`${format}: jede Seite hat ein Kontrollquadrat mit exakt 50 mm (141,73 pt)`, () => {
      const plan = planSheets(parts, format, 'tile');
      const doc = buildPdf(plan, meta);
      const n = doc.getNumberOfPages();
      expect(n).toBe(plan.sheets.length);
      const streams = pageStreams(doc.output());
      expect(streams.length).toBe(n);
      for (const s of streams) expect(s).toMatch(/[\d.]+ [\d.]+ 141\.73\d* -141\.73\d* re/);
      // Seitenmaße in pt stimmen mit mm überein
      for (let i = 1; i <= n; i++) {
        const info = doc.getPageInfo(i);
        const box = info.pageContext.mediaBox;
        const wPt = box.topRightX - box.bottomLeftX;
        expect(wPt / (72 / 25.4)).toBeCloseTo(plan.sheets[i - 1].w, 1);
      }
      // Hinweis auf jeder Seite
      for (const s of streams) expect(s).toContain('100 % drucken');
    });
  }

  it('A4: Umwicklung wird gekachelt, Kacheln passen in den Inhaltsbereich', () => {
    const plan = planSheets(parts, 'a4', 'tile');
    const tiles = plan.sheets.filter((s) => s.kind === 'tile');
    expect(tiles.length).toBeGreaterThanOrEqual(4); // 2 Umwicklungen à ≥ 2 Blätter
    const area = contentRect(plan.sheets[0].w, plan.sheets[0].h);
    for (const s of plan.sheets)
      for (const it of s.items) {
        const w = it.rotated ? it.clip.h : it.clip.w;
        const h = it.rotated ? it.clip.w : it.clip.h;
        expect(it.x).toBeGreaterThanOrEqual(area.x - 1e-9);
        expect(it.y).toBeGreaterThanOrEqual(area.y - 1e-9);
        expect(it.x + w).toBeLessThanOrEqual(area.x + area.w + 1e-9);
        expect(it.y + h).toBeLessThanOrEqual(area.y + area.h + 1e-9);
      }
    expect(tiles[1].items[0].caption).toMatch(/Umwicklung Pack A – Blatt 2\/\d, an Marke ◆2 ansetzen/);
  });

  it('A4 geteilt: Umwicklungen werden in Stücke geteilt statt gekachelt', () => {
    const plan = planSheets(parts, 'a4', 'split');
    expect(plan.sheets.every((s) => s.kind === 'nest')).toBe(true);
    const pieces = plan.sheets
      .flatMap((s) => s.items)
      .filter((i) => i.part.id === 'wrap-P0')
      .sort((a, b) => a.clip.x - b.clip.x);
    expect(pieces.length).toBeGreaterThanOrEqual(2);
    const total = pieces.reduce((a, p) => a + p.clip.w, 0) - (pieces.length - 1) * 15;
    expect(total).toBeCloseTo(parts.find((p) => p.id === 'wrap-P0')!.w, 6);
    expect(pieces[1].caption).toMatch(/Stück 2\/\d – 15 mm mit Stück 1 überlappen/);
  });

  it('Hoch-/Querformat wird automatisch gewählt', () => {
    const plan = planSheets(parts, 'a4', 'tile');
    expect(['portrait', 'landscape']).toContain(plan.orientation);
    const s = plan.sheets[0];
    expect([s.w, s.h].sort()).toEqual([PAGE_SIZES.a4.w, PAGE_SIZES.a4.h].sort());
  });

  it('Plotter: eine Seite je Teil in Teilegröße', () => {
    const plan = planSheets(parts, 'plotter', 'tile');
    expect(plan.sheets.length).toBe(parts.reduce((a, p) => a + p.count, 0));
    const wrap = plan.sheets.find((s) => s.items[0].part.id === 'wrap-P0')!;
    expect(wrap.w).toBeCloseTo(parts.find((p) => p.id === 'wrap-P0')!.w + 20, 6);
  });
});

describe('SVG', () => {
  it('in mm, Schnitt und Falz in getrennten Ebenen', () => {
    const svg = buildSvg(buildParts(L, { ...DEFAULT_FISHPAPER, outlineWrap: 'tucked' }), '18S2P');
    expect(svg).toMatch(/<svg[^>]+width="[\d.]+mm" height="[\d.]+mm" viewBox="0 0 [\d.]+ [\d.]+"/);
    expect(svg).toContain('<g id="schnitt"');
    expect(svg).toContain('<g id="falz"');
    const falz = svg.slice(svg.indexOf('<g id="falz"'), svg.indexOf('<g id="schnitt"'));
    expect((falz.match(/<path /g) ?? []).length).toBeGreaterThan(20);
  });
});
