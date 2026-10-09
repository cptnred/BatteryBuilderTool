/**
 * Fishpaper-Teile aus dem gelösten Layout (docs/02_FISHPAPER_EXPORT.md §2) – rein, in mm.
 * Teilkoordinaten: x nach rechts, y nach unten, Ursprung oben links, Inhalt in [0,w] × [0,h].
 */
import type { Layout, Outline, OutlineMark, SubPack } from '../core';
import { outlinePolyline, packOutline } from '../core';
import type { Rect } from './geom2d';
import { bbox, boxInside, line, rectPath, textBox } from './geom2d';
import { glueOutline } from './glue';
import { coreSegsToPart, mapSegs, notchSegs, reverseSegs, segPath, segsArea } from './segments';
import type { FishpaperOptions, P2, Part, PartText, Path2 } from './types';

export const TEXT_SIZE = 3;

export function packShort(p: SubPack): string {
  return p.key === 'BOOST' ? 'Booster' : p.label.replace(/ \(.*\)$/, '');
}

/** Umriss für Fishpaper-Teile: eingebogen mit Kleber-Sehnen (§4), gerade unverändert. */
export function partOutline(layout: Layout, pack: SubPack, mode: FishpaperOptions['outlineFace'], margin = 0): Outline {
  const o = packOutline(layout, pack, mode, margin);
  return mode === 'tucked' ? glueOutline(o) : o;
}

/** Querschnittskontur eines Teilpacks als Teil-Kontur, von außen betrachtet (V gespiegelt). */
export function crossSection(
  layout: Layout,
  pack: SubPack,
  mode: FishpaperOptions['outlineFace'],
  margin: number,
  mirrored: boolean,
) {
  const o = partOutline(layout, pack, mode, margin);
  const poly = outlinePolyline(o, 0.05);
  const xs = poly.map((p) => p.x);
  const zs = poly.map((p) => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const maxZ = Math.max(...zs);
  const minZ = Math.min(...zs);
  const toPart = (x: number, z: number): P2 => ({ x: mirrored ? maxX - x : x - minX, y: maxZ - z });
  let pts = poly.map((p) => toPart(p.x, p.z));
  let segs = coreSegsToPart(o.segs, toPart);
  // Umlaufsinn nach dem Spiegeln wiederherstellen
  if (mirrored) {
    pts = pts.reverse();
    segs = reverseSegs(segs);
  }
  return { outline: o, pts, segs, w: maxX - minX, h: maxZ - minZ, toPart };
}

function applyOverride(p: Part, opts: FishpaperOptions): Part {
  const o = opts.partOverrides[p.id];
  return o ? { ...p, enabled: o.enabled, count: Math.max(0, Math.round(o.count)) } : p;
}

/** Textzeilen mittig in das Band zwischen unterer und oberer Zellreihe setzen (kreuzt keine Schnittlinie). */
function centerTexts(w: number, h: number, lines: string[], size = TEXT_SIZE): PartText[] {
  const lh = size * 1.35;
  const y0 = h / 2 - ((lines.length - 1) * lh) / 2 + size * 0.35;
  return lines.map((text, i) => ({ x: w / 2, y: y0 + i * lh, text, size, anchor: 'middle' }));
}

/**
 * Texte dürfen keine Schnittlinie kreuzen: zu große Texte werden verkleinert, sonst weggelassen.
 */
export function fitTexts(texts: PartText[], outer: P2[], holes: P2[][] = []): PartText[] {
  const out: PartText[] = [];
  for (const t of texts) {
    let fitted: PartText | null = null;
    for (const f of [1, 0.8, 0.65]) {
      const c = { ...t, size: t.size * f };
      if (boxInside(textBox(c), outer, holes)) {
        fitted = c;
        break;
      }
    }
    if (fitted) out.push(fitted);
  }
  return out;
}

/** Zellmittelpunkte im Teil (für sichere Textpositionen). */
function cellCenters(pack: SubPack, toPart: (x: number, z: number) => P2) {
  return pack.cells.map((c) => ({ ...toPart(c.x, c.z), layer: c.layer }));
}

/** OBEN über einer oberen Zelle nahe der Mitte, R/L in den äußeren unteren Zellen (liegen sicher im Teil). */
function orientationTexts(layout: Layout, pack: SubPack, cs: ReturnType<typeof crossSection>, mirrored: boolean): PartText[] {
  const R = layout.config.cell.diameter / 2;
  const centers = cellCenters(pack, cs.toPart);
  const bottom = centers.filter((c) => c.layer === 0).sort((a, b) => a.x - b.x);
  const topLayer = Math.max(...centers.map((c) => c.layer));
  const out: PartText[] = [];
  if (topLayer > 0) {
    const top = centers
      .filter((c) => c.layer === topLayer)
      .sort((a, b) => Math.abs(a.x - cs.w / 2) - Math.abs(b.x - cs.w / 2))[0];
    out.push({ x: top.x, y: top.y - R * 0.3, text: 'OBEN', size: TEXT_SIZE, anchor: 'middle' });
  }
  const s = Math.min(TEXT_SIZE * 1.5, R * 0.6);
  out.push({ x: bottom[0].x, y: bottom[0].y + s * 0.4, text: mirrored ? 'R' : 'L', size: s, anchor: 'middle' });
  out.push({
    x: bottom[bottom.length - 1].x,
    y: bottom[bottom.length - 1].y + s * 0.4,
    text: mirrored ? 'L' : 'R',
    size: s,
    anchor: 'middle',
  });
  return out;
}

function facePart(layout: Layout, pack: SubPack, face: 'V' | 'H', opts: FishpaperOptions): Part {
  const mirrored = face === 'V';
  const cs = crossSection(layout, pack, opts.outlineFace, opts.faceMargin, mirrored);
  const booster = pack.role === 'booster';
  const faceName = booster ? `Stirnseite ${face === 'V' ? '1' : '2'}` : face === 'V' ? 'Vorderseite' : 'Rückseite';
  const name = `Stirnseite ${face === 'V' ? 'vorne' : 'hinten'} – ${packShort(pack)}`;
  const texts = orientationTexts(layout, pack, cs, mirrored);
  texts.push(...centerTexts(cs.w, cs.h, [name, `${faceName} – bedruckte Seite außen`]));
  // Anschluss-Markierungen (Hauptminus/-plus, Brücke) an der Streifenposition
  const marks: Path2[] = [];
  for (const st of pack.strips.filter((s) => s.face === face && s.kind !== 'series')) {
    const cells = st.cells.map((id) => pack.cells.find((c) => c.id === id)!);
    const cx = cells.reduce((a, c) => a + c.x, 0) / cells.length;
    const cz = cells.reduce((a, c) => a + c.z, 0) / cells.length;
    const p = cs.toPart(cx, cz);
    const r = 2.5;
    marks.push(line(p.x - r, p.y, p.x + r, p.y), line(p.x, p.y - r, p.x, p.y + r));
    marks.push(segPath([{ kind: 'arc', c: p, r, a0: 0, a1: 2 * Math.PI }], true));
  }
  return {
    id: `face-${face}-${pack.key}`,
    type: 'face',
    pack: pack.key,
    name,
    count: 1,
    enabled: true,
    w: cs.w,
    h: cs.h,
    cut: [segPath(cs.segs, true, cs.pts)],
    fold: [],
    zones: [],
    marks,
    texts: fitTexts(texts, cs.pts),
    area: segsArea(cs.segs),
    splittable: false,
  };
}

function interlayerParts(layout: Layout, a: SubPack, b: SubPack, opts: FishpaperOptions): Part[] {
  // Blick von vorne (wie Vorderseite gespiegelt), Umriss des vorderen Packs
  const cs = crossSection(layout, a, opts.outlineFace, opts.faceMargin, true);
  let segs = cs.segs;
  const cut: Path2[] = [];
  const marks: Path2[] = [];
  const br = layout.bridges.find(
    (x) => x.kind === 'inner' && ((x.from === a.key && x.to === b.key) || (x.from === b.key && x.to === a.key)),
  );
  const extraTexts: PartText[] = [];
  if (br && opts.bridgeCutout !== 'none') {
    const from = layout.packs.find((p) => p.key === br.from)!;
    const st = from.strips.find((s) => s.kind === 'end' && s.node === br.node)!;
    const cells = st.cells.map((id) => from.cells.find((c) => c.id === id)!);
    const cx = cells.reduce((s, c) => s + c.x, 0) / cells.length;
    const cz = cells.reduce((s, c) => s + c.z, 0) / cells.length;
    const p = cs.toPart(cx, cz);
    // Kerbe am nächstgelegenen Rand (oben/unten/links/rechts)
    const dist = { top: p.y, bottom: cs.h - p.y, left: p.x, right: cs.w - p.x };
    const edge = (Object.keys(dist) as (keyof typeof dist)[]).reduce((a, b) => (dist[b] < dist[a] ? b : a));
    const w = opts.cutoutWidth;
    const d = opts.cutoutHeight;
    if (opts.bridgeCutout === 'notch') {
      if (edge === 'top' || edge === 'bottom') segs = notchSegs(segs, p.x, w, d, edge);
      else {
        const T = (q: P2) => ({ x: q.y, y: q.x });
        segs = mapSegs(notchSegs(mapSegs(segs, T), p.y, w, d, edge === 'left' ? 'top' : 'bottom'), T);
      }
    } else if (edge === 'top' || edge === 'bottom') cut.push(rectPath(p.x - w / 2, p.y - d / 2, w, d));
    else cut.push(rectPath(p.x - d / 2, p.y - w / 2, d, w));
    const label = `Brücke B${br.node}`;
    const lw = label.length * TEXT_SIZE * 0.8 * 0.55;
    extraTexts.push({
      x: edge === 'left' ? p.x + d + lw / 2 + 2 : edge === 'right' ? p.x - d - lw / 2 - 2 : p.x,
      y: edge === 'top' ? p.y + d + TEXT_SIZE : edge === 'bottom' ? p.y - d - TEXT_SIZE * 0.5 : p.y + TEXT_SIZE * 0.3,
      text: label,
      size: TEXT_SIZE * 0.8,
      anchor: 'middle',
    });
  }
  const outer = segs === cs.segs ? segPath(segs, true, cs.pts) : segPath(segs, true);
  cut.unshift(outer);
  const base = {
    type: 'interlayer' as const,
    pack: a.key,
    w: cs.w,
    h: cs.h,
    cut,
    fold: [],
    zones: [],
    marks,
    area: segsArea(segs) - (opts.bridgeCutout === 'slot' && br ? opts.cutoutWidth * opts.cutoutHeight : 0),
    splittable: false,
    enabled: true,
  };
  const name = `Zwischenlage ${packShort(a)} | ${packShort(b)}`;
  const view = a.role === 'booster' ? 'Blick von Stirnseite 1' : 'Blick von vorne';
  const raw = [...orientationTexts(layout, a, cs, true), ...centerTexts(cs.w, cs.h, [name, view]), ...extraTexts];
  const texts = fitTexts(
    raw,
    outer.pts,
    cut.slice(1).map((c) => c.pts),
  );
  const id = `inter-${a.key}-${b.key}`;
  return [{ ...base, id, name, count: opts.interlayer === 'double' ? 2 : 1, texts }];
}

function rectPart(
  id: string,
  type: Part['type'],
  pack: string,
  name: string,
  w: number,
  h: number,
  count: number,
  lines: string[],
): Part {
  const r = rectPath(0, 0, w, h);
  return {
    id,
    type,
    pack,
    name,
    count,
    enabled: true,
    w,
    h,
    cut: [r],
    fold: [],
    zones: [],
    marks: [],
    texts: centerTexts(w, h, lines, Math.min(TEXT_SIZE, h / 4)),
    area: w * h,
    splittable: false,
  };
}

/** Einschnitte für den Umschlag: von der Kante bis zur Knicklinie. */
function foldCuts(xs: number[], w: number, fold: number): Path2[] {
  return xs.flatMap((x) => [line(x, 0, x, fold), line(x, w - fold, x, w)]);
}

/** Umwicklung: Rechteck Umfang + Überlappung × Breite (+ Umschlag), mit Biege-/Falzmarken. */
export function wrapPart(
  id: string,
  pack: string,
  name: string,
  outline: Outline,
  packLength: number,
  opts: FishpaperOptions,
): Part {
  const P = outline.perimeter;
  const len = P + opts.wrapOverlap;
  const fold = opts.wrapFold;
  const w = packLength + 2 * fold;
  const cut: Path2[] = [rectPath(0, 0, len, w)];
  const foldLines: Path2[] = [];
  const zones: Path2[] = [];
  const marks: Path2[] = [];
  const slitX: number[] = [];
  const bends = outline.marks.filter((m: OutlineMark) => m.kind === 'bend');
  for (const m of bends) {
    zones.push(rectPath(m.s0, 0, m.s1 - m.s0, w));
    foldLines.push(line(m.s0, 0, m.s0, w), line(m.s1, 0, m.s1, w));
    for (let x = m.s0 + 5; x < m.s1 - 1; x += 10) slitX.push(x);
  }
  for (const m of outline.marks.filter((q) => q.kind === 'fold')) {
    if (m.s0 > 1e-6) foldLines.push(line(m.s0, 0, m.s0, w));
    slitX.push(m.s0);
  }
  if (fold > 0) {
    foldLines.push(line(0, fold, len, fold), line(0, w - fold, len, w - fold));
    // Überlappungszone bleibt ohne Einschnitte
    cut.push(
      ...foldCuts(
        slitX.filter((x) => x > 0.5 && x < P - 0.5),
        w,
        fold,
      ),
    );
  }
  // Überlappung/Klebezone
  marks.push(line(P, 0, P, w));
  const texts: PartText[] = [];
  const ts = Math.min(TEXT_SIZE, (w - 2 * fold) / 6);
  const mid = w / 2;
  texts.push({ x: 4, y: mid - ts * 0.9, text: `${name} – Start unten rechts`, size: ts, anchor: 'start' });
  texts.push({
    x: 4,
    y: mid + ts * 1.1,
    text: `Umfang ${P.toFixed(1).replace('.', ',')} mm · Wickelrichtung gegen den Uhrzeigersinn (Blick von hinten)`,
    size: ts * 0.85,
    anchor: 'start',
  });
  if (opts.wrapOverlap > 0)
    texts.push({
      x: P + opts.wrapOverlap / 2,
      y: mid,
      text: 'Kleben',
      size: Math.min(ts, opts.wrapOverlap / 3.5),
      anchor: 'middle',
      rotate: 90,
    });
  // Pfeil in Wickelrichtung
  const ay = mid + ts * 3;
  const ax0 = 6;
  const ax1 = Math.min(40, P / 3);
  marks.push(line(ax0, ay, ax1, ay), {
    closed: false,
    pts: [
      { x: ax1 - 3, y: ay - 1.5 },
      { x: ax1, y: ay },
      { x: ax1 - 3, y: ay + 1.5 },
    ],
  });
  return {
    id,
    type: 'wrap',
    pack,
    name,
    count: 1,
    enabled: true,
    w: len,
    h: w,
    cut,
    fold: foldLines,
    zones,
    marks,
    texts,
    area: len * w,
    splittable: true,
    overlap: opts.wrapOverlap,
  };
}

/** Alle Teile für das Layout. Deaktivierte Teile bleiben in der Liste (enabled=false). */
export function buildParts(layout: Layout, opts: FishpaperOptions): Part[] {
  const cfg = layout.config;
  const parts: Part[] = [];
  const byPos = (a: SubPack, b: SubPack) => a.position - b.position;
  const main = layout.packs.filter((p) => p.role === 'main').sort(byPos);
  // Einzelpacks des Boosters, Stirnseite 1 -> 2 (Plan 07 §7)
  const boost = layout.packs.filter((p) => p.role === 'booster').sort(byPos);
  const m = opts.faceMargin;

  // 1. Stirnseiten außen
  parts.push(facePart(layout, main[0], 'V', opts));
  parts.push(facePart(layout, main[main.length - 1], 'H', opts));
  if (boost.length) parts.push(facePart(layout, boost[0], 'V', opts), facePart(layout, boost[boost.length - 1], 'H', opts));

  // 2. Zwischenlagen
  for (const group of [main, boost])
    for (let i = 0; i + 1 < group.length; i++) parts.push(...interlayerParts(layout, group[i], group[i + 1], opts));

  // 3./4. Seitenteile, Ober-/Unterseite
  for (const p of [...main, ...boost]) {
    if (opts.includeSides)
      parts.push(
        rectPart(
          `side-${p.key}`,
          'side',
          p.key,
          `Seitenteil links/rechts – ${packShort(p)}`,
          p.length + 2 * m,
          p.height + 2 * m,
          2,
          [`Seite – ${packShort(p)}`],
        ),
      );
    if (opts.includeTopBottom)
      parts.push(
        rectPart(
          `topbottom-${p.key}`,
          'topbottom',
          p.key,
          `Ober-/Unterseite – ${packShort(p)}`,
          p.width + 2 * m,
          p.length + 2 * m,
          2,
          [`Ober-/Unterseite – ${packShort(p)}`],
        ),
      );
  }

  // 5. Umwicklung: je Pack oder gemeinsam über eine Gruppe (nach dem Pack mit dem größten Umfang)
  const wraps = (group: SubPack[], allId: string, allName: string) => {
    if (opts.wrapMode === 'combined' && group.length > 1) {
      const widest = group.reduce((a, p) =>
        partOutline(layout, p, opts.outlineWrap).perimeter > partOutline(layout, a, opts.outlineWrap).perimeter ? p : a,
      );
      const length = group.reduce((a, p) => a + p.length, 0) + (group.length - 1) * cfg.packGap;
      parts.push(wrapPart(`wrap-${allId}`, allId, allName, partOutline(layout, widest, opts.outlineWrap), length, opts));
    } else {
      for (const p of group)
        parts.push(
          wrapPart(
            `wrap-${p.key}`,
            p.key,
            `Umwicklung ${packShort(p)}`,
            partOutline(layout, p, opts.outlineWrap),
            p.length,
            opts,
          ),
        );
    }
  };
  wraps(main, 'ALL', 'Umwicklung gesamt');
  wraps(boost, 'BOOSTALL', 'Umwicklung Booster gesamt');

  return parts.map((p) => applyOverride(p, opts));
}

/** Nur aktive Teile mit Anzahl > 0. */
export function activeParts(parts: Part[]): Part[] {
  return parts.filter((p) => p.enabled && p.count > 0);
}

export interface PartBomRow {
  id: string;
  name: string;
  count: number;
  w: number;
  h: number;
  /** cm² je Stück */
  areaCm2: number;
}

export function partsBom(parts: Part[]): { rows: PartBomRow[]; totalCm2: number } {
  const rows = activeParts(parts).map((p) => ({ id: p.id, name: p.name, count: p.count, w: p.w, h: p.h, areaCm2: p.area / 100 }));
  return { rows, totalCm2: rows.reduce((a, r) => a + r.areaCm2 * r.count, 0) };
}

/** Teil verschieben/drehen (90° im Uhrzeigersinn auf dem Papier) – für Platzierung. */
export function placePart(p: Part, dx: number, dy: number, rotated: boolean): (q: P2) => P2 {
  return rotated ? (q) => ({ x: dx + (p.h - q.y), y: dy + q.x }) : (q) => ({ x: dx + q.x, y: dy + q.y });
}

export function partBounds(p: Part): Rect {
  return bbox(p.cut);
}
