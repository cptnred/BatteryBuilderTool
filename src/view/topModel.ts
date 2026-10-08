/**
 * Zeichenmodell der Draufsicht (VORNE oben) – in mm, rein.
 * Bild-x = globales x (links -> rechts), Bild-y = globales y (vorne -> hinten).
 *
 * Senkrechte Aufteilung (fs = Schriftgröße):
 *   -7,2 fs  VORNE / LINKS / RECHTS
 *   -5,0 fs  Breitenmaß
 *   -2,2 fs  Fahnen Hauptminus (Stirnseite vorne)
 *    0       Teilpacks …
 */
import type { Face, Layout, Side, SubPack } from '../core';
import { widestLayerCells } from './layers';

export type TopAlign = 'right' | 'left' | 'center';

export interface TopPack {
  key: string;
  label: string;
  booster: boolean;
  x: number;
  y: number;
  w: number;
  l: number;
  /** Trennlinien der Zellen der größten Lage (x) */
  cellLines: number[];
  arrow: { x1: number; x2: number; y: number };
}

export interface TopFlag {
  text: string;
  role: 'minus' | 'plus';
  x: number;
  /** Stiel von y1 (Packkante) nach y2 */
  y1: number;
  y2: number;
  anchor: 'start' | 'end';
}

export interface TopLink {
  kind: 'inner' | 'outer' | 'cable';
  role: 'bridge' | 'minus' | 'plus';
  points: { x: number; y: number }[];
  /** Zeilen der Beschriftung */
  lines: string[];
  textPos: { x: number; y: number; anchor: 'start' | 'end' | 'middle'; vertical?: boolean };
}

export interface TopDim {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  text: string;
  vertical: boolean;
}

export interface TopModel {
  packs: TopPack[];
  flags: TopFlag[];
  links: TopLink[];
  dims: TopDim[];
  texts: { x: number; y: number; text: string; kind: 'side' | 'end'; anchor: 'start' | 'middle' | 'end' }[];
  viewBox: { x: number; y: number; w: number; h: number };
  fontSize: number;
}

const fmt = (v: number) => v.toFixed(1).replace('.', ',');
const sideWord = (s: Side) => (s === 'L' ? 'links' : 'rechts');

export function topModel(layout: Layout, align: TopAlign = 'right'): TopModel {
  const cfg = layout.config;
  const main = layout.packs.filter((p) => p.role === 'main').sort((a, b) => a.position - b.position);
  const booster = layout.packs.find((p) => p.role === 'booster');
  const maxW = Math.max(...main.map((p) => p.width));
  const fs = Math.max(5, maxW / 22);
  const gapVis = Math.max(cfg.packGap, fs * 0.6);
  const xOf = (w: number) => (align === 'left' ? 0 : align === 'right' ? maxW - w : (maxW - w) / 2);

  const R = cfg.cell.diameter / 2;
  const toTop = (p: SubPack, x: number, y: number): TopPack => {
    // größte Lage: bei unvollständiger Lage ist das nicht immer Lage 0 (Plan 06 §6)
    const wide = widestLayerCells(p);
    const cellLines = wide.slice(0, -1).map((c) => x + c.x + layout.pitches.px / 2);
    if (wide.length) cellLines.unshift(x + wide[0].x - R);
    const a0 = x + p.width * 0.85;
    const a1 = x + p.width * 0.15;
    const ay = y + p.length * 0.62;
    return {
      key: p.key,
      label: p.label,
      booster: p.role === 'booster',
      x,
      y,
      w: p.width,
      l: p.length,
      cellLines,
      arrow: p.dir === 'RL' ? { x1: a0, x2: a1, y: ay } : { x1: a1, x2: a0, y: ay },
    };
  };

  const packs: TopPack[] = [];
  let y = 0;
  for (const p of main) {
    packs.push(toTop(p, xOf(p.width), y));
    y += p.length + gapVis;
  }
  const mainEnd = y - gapVis;
  const byKey = new Map(packs.map((t) => [t.key, t]));
  const packByKey = new Map(layout.packs.map((p) => [p.key, p]));

  // Punkt an einer Stirnseite (V = Vorderkante, H = Hinterkante) auf einer Seite (L/R)
  const inset = fs * 0.8;
  const edgePoint = (key: string, face: Face, side: Side) => {
    const t = byKey.get(key)!;
    return { x: side === 'L' ? t.x + inset : t.x + t.w - inset, y: face === 'V' ? t.y : t.y + t.l };
  };

  const flags: TopFlag[] = [];
  const links: TopLink[] = [];
  const mainChain = layout.chain.filter((k) => k !== 'BOOST');
  const firstMain = packByKey.get(mainChain[0])!;
  const lastMain = packByKey.get(mainChain[mainChain.length - 1])!;
  const stem = fs * 2.2;
  const flagAt = (pt: { x: number; y: number }, face: Face, side: Side, text: string, role: 'minus' | 'plus') =>
    flags.push({
      text,
      role,
      x: pt.x,
      y1: pt.y,
      y2: face === 'V' ? pt.y - stem : pt.y + stem,
      anchor: side === 'L' ? 'start' : 'end',
    });
  const boosterAtMinus = !!booster && cfg.booster?.position === 'minus';
  const boosterAtPlus = !!booster && !boosterAtMinus;
  // Am Booster-Ende übernimmt das Kabel die Beschriftung
  if (!boosterAtMinus)
    flagAt(
      edgePoint(firstMain.key, firstMain.startFace, firstMain.startSide),
      firstMain.startFace,
      firstMain.startSide,
      'HAUPT −',
      'minus',
    );
  if (!boosterAtPlus)
    flagAt(edgePoint(lastMain.key, lastMain.endFace, lastMain.endSide), lastMain.endFace, lastMain.endSide, 'HAUPT +', 'plus');

  // Brücken zwischen Teilpacks
  let outerCount = 0;
  let leftNeed = 0;
  let rightNeed = 0;
  for (const br of layout.bridges.filter((b) => b.kind !== 'cable')) {
    const a = byKey.get(br.from)!;
    const b = byKey.get(br.to)!;
    const pa = edgePoint(br.from, br.fromFace, br.fromSide);
    const pb = edgePoint(br.to, br.toFace, br.toSide);
    const isLeft = br.fromSide === 'L';
    const edgeX = isLeft ? Math.min(a.x, b.x) : Math.max(a.x + a.w, b.x + b.w);
    if (br.kind === 'inner') {
      const out = isLeft ? -fs * 1.2 : fs * 1.2;
      const yMid = (pa.y + pb.y) / 2;
      links.push({
        kind: 'inner',
        role: 'bridge',
        points: [
          { x: pa.x, y: yMid },
          { x: edgeX + out, y: yMid },
        ],
        lines: [`BRÜCKE B${br.node}`, `(innen, ${sideWord(br.fromSide)})`],
        textPos: { x: edgeX + out - (isLeft ? fs * 0.4 : -fs * 0.4), y: yMid - fs * 0.25, anchor: isLeft ? 'end' : 'start' },
      });
      if (isLeft) leftNeed = Math.max(leftNeed, fs * 9);
      else rightNeed = Math.max(rightNeed, fs * 9);
    } else {
      outerCount++;
      const sameSide = br.fromSide === br.toSide;
      const outX = edgeX + (isLeft ? -1 : 1) * fs * (1.4 + 1.6 * (outerCount - 1));
      const dyA = br.fromFace === 'V' ? -fs * 0.7 : fs * 0.7;
      const dyB = br.toFace === 'V' ? -fs * 0.7 : fs * 0.7;
      const points = sameSide
        ? [
            { x: pa.x, y: pa.y },
            { x: pa.x, y: pa.y + dyA },
            { x: outX, y: pa.y + dyA },
            { x: outX, y: pb.y + dyB },
            { x: pb.x, y: pb.y + dyB },
            { x: pb.x, y: pb.y },
          ]
        : [
            { x: pa.x, y: pa.y },
            { x: pa.x, y: pa.y + dyA },
            { x: pb.x, y: pa.y + dyA },
            { x: pb.x, y: pb.y },
          ];
      links.push({
        kind: 'outer',
        role: 'bridge',
        points,
        lines: [`BRÜCKE B${br.node} (Kabel ${sameSide ? `${sideWord(br.fromSide)} außen` : 'quer'})`],
        textPos: {
          x: outX + (isLeft ? -fs * 0.5 : fs * 1.1),
          y: (Math.min(pa.y, pb.y) + Math.max(pa.y, pb.y)) / 2,
          anchor: 'middle',
          vertical: true,
        },
      });
      if (isLeft) leftNeed = Math.max(leftNeed, fs * (2.5 + 1.6 * outerCount));
      else rightNeed = Math.max(rightNeed, fs * (2.5 + 1.6 * outerCount));
    }
  }

  // Booster: separater, gestrichelter Block mit Kabel
  let minY = -fs * 8;
  let maxY = mainEnd + fs * 5.2;
  if (booster) {
    const cable = layout.bridges.find((b) => b.kind === 'cable')!;
    const atPlus = cable.to === 'BOOST';
    const gap = fs * 5;
    const by = atPlus ? mainEnd + gap : -gap - booster.length;
    const t = toTop(booster, maxW - booster.width, by);
    packs.push(t);
    const mainPack = atPlus ? lastMain : firstMain;
    const face = atPlus ? mainPack.endFace : mainPack.startFace;
    const side = atPlus ? mainPack.endSide : mainPack.startSide;
    const p0 = edgePoint(mainPack.key, face, side);
    const bx = t.x + fs * 1.2;
    const boosterEdgeY = atPlus ? by : by + booster.length;
    const midY = (p0.y + boosterEdgeY) / 2;
    const role = atPlus ? 'plus' : 'minus';
    links.push({
      kind: 'cable',
      role,
      points: [
        { x: p0.x, y: p0.y },
        { x: p0.x, y: midY },
        { x: bx, y: midY },
        { x: bx, y: boosterEdgeY },
      ],
      lines: [atPlus ? `HAUPT + (B${cable.node}) → Booster −` : `HAUPT − (B${cable.node}) ← Booster +`],
      textPos: { x: Math.min(p0.x, bx) - fs * 0.5, y: midY + fs * 0.3, anchor: 'end' },
    });
    const sysPt = { x: t.x + t.w - inset, y: atPlus ? by + booster.length : by };
    flagAt(sysPt, atPlus ? 'H' : 'V', 'R', atPlus ? `SYSTEM + (B${layout.totalS})` : 'SYSTEM − (B0)', role);
    if (atPlus) maxY = by + booster.length + fs * 5.2;
    else minY = by - fs * 8;
    leftNeed = Math.max(leftNeed, fs * 13 - (maxW - booster.width));
  }

  const firstY = Math.min(...packs.map((p) => p.y));
  const texts: TopModel['texts'] = [
    { x: maxW / 2, y: firstY - fs * 7.2 + fs, text: 'VORNE', kind: 'end', anchor: 'middle' },
    { x: 0, y: firstY - fs * 7.2 + fs, text: 'LINKS', kind: 'side', anchor: 'start' },
    { x: maxW, y: firstY - fs * 7.2 + fs, text: 'RECHTS', kind: 'side', anchor: 'end' },
    { x: maxW / 2, y: maxY - fs * 0.8, text: 'HINTEN', kind: 'end', anchor: 'middle' },
  ];

  // Maße: Breite oben, Längen rechts
  const dims: TopDim[] = [];
  const dimX = maxW + Math.max(rightNeed, fs * 1.6);
  for (const t of packs.filter((p) => !p.booster))
    dims.push({ x1: dimX, y1: t.y, x2: dimX, y2: t.y + t.l, text: `L ${fmt(t.l)}`, vertical: true });
  if (main.length > 1) {
    const total = main.reduce((a, p) => a + p.length, 0) + (main.length - 1) * cfg.packGap;
    dims.push({ x1: dimX + fs * 2.6, y1: 0, x2: dimX + fs * 2.6, y2: mainEnd, text: `gesamt ${fmt(total)} mm`, vertical: true });
  }
  const widest = packs.filter((p) => !p.booster).reduce((a, p) => (p.w > a.w ? p : a));
  const dimY = firstY - fs * 4.1;
  dims.push({ x1: widest.x, y1: dimY, x2: widest.x + widest.w, y2: dimY, text: `B ${fmt(widest.w)} mm`, vertical: false });

  const minX = -Math.max(leftNeed, fs * 1.5);
  const maxX = dimX + fs * (main.length > 1 ? 4.4 : 2);
  return {
    packs,
    flags,
    links,
    dims,
    texts,
    viewBox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    fontSize: fs,
  };
}
