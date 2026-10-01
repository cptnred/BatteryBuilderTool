/**
 * Seitenplanung für den 1:1-Export: Regal-Packing, Kachelung (Option A) oder Teilen der Streifen (Option B),
 * Plotter-Modus (eine Seite je Teil). Rein, in mm; wird von pdf.ts gezeichnet und im Test geprüft.
 */
import type { Rect } from '../fishpaper/geom2d';
import { shelfPack } from '../fishpaper/nesting';
import { activeParts } from '../fishpaper/parts';
import { laserSheet } from './laser';
import { registrationMarks, splitRanges, tileGrid, TILE_OVERLAP } from '../fishpaper/tiling';
import type { Part } from '../fishpaper/types';

export type PageFormat = 'a4' | 'a3' | 'letter' | 'plotter' | 'laser';
export type OversizeMode = 'tile' | 'split';

export const PAGE_SIZES: Record<Exclude<PageFormat, 'plotter' | 'laser'>, { w: number; h: number; label: string }> = {
  a4: { w: 210, h: 297, label: 'A4' },
  a3: { w: 297, h: 420, label: 'A3' },
  letter: { w: 215.9, h: 279.4, label: 'Letter' },
};

export const MARGIN = 10;
export const HEADER = 9;
/** Fußbereich: Kontrollquadrat 50 mm + Lineal + Hinweis */
export const FOOTER = 58;
export const GAP = 5;
export const CONTROL_SQUARE = 50;
/** Mindestbreite einer Seite, damit Kontrollquadrat und 100-mm-Lineal Platz haben */
export const MIN_PAGE_W = 2 * MARGIN + CONTROL_SQUARE + 6 + 100 + 4;

export interface SheetItem {
  part: Part;
  /** sichtbarer Ausschnitt in Teilkoordinaten */
  clip: Rect;
  /** Seitenposition (oben links) des Ausschnitts nach Drehung */
  x: number;
  y: number;
  /** 90° im Uhrzeigersinn gedreht */
  rotated: boolean;
  /** Zusatzbeschriftung, z. B. Blatt 2/3 */
  caption?: string;
}

export interface Sheet {
  w: number;
  h: number;
  /** laser: eine Seite in Gesamtgröße (Plan §5) */
  kind: 'nest' | 'tile' | 'plotter' | 'laser';
  items: SheetItem[];
}

export interface SheetPlan {
  sheets: Sheet[];
  orientation: 'portrait' | 'landscape' | 'custom';
  /** Hinweise, z. B. welches Teil gekachelt wurde */
  notes: string[];
}

export function contentRect(w: number, h: number): Rect {
  return { x: MARGIN, y: MARGIN + HEADER, w: w - 2 * MARGIN, h: h - 2 * MARGIN - HEADER - FOOTER };
}

/** Größe eines Ausschnitts nach Drehung */
const placedSize = (clip: Rect, rotated: boolean) => (rotated ? { w: clip.h, h: clip.w } : { w: clip.w, h: clip.h });

interface Piece {
  key: string;
  part: Part;
  clip: Rect;
  caption?: string;
}

function planFixed(parts: Part[], pageW: number, pageH: number, oversize: OversizeMode): { sheets: Sheet[]; notes: string[] } {
  const area = contentRect(pageW, pageH);
  const fits = (w: number, h: number) => (w <= area.w + 1e-9 && h <= area.h + 1e-9) || (h <= area.w + 1e-9 && w <= area.h + 1e-9);
  const pieces: Piece[] = [];
  const tileSheets: Sheet[] = [];
  const notes: string[] = [];
  for (const p of activeParts(parts)) {
    for (let c = 0; c < p.count; c++) {
      const copy = p.count > 1 ? ` (Stück ${c + 1}/${p.count})` : '';
      if (fits(p.w, p.h)) {
        pieces.push({ key: `${p.id}#${c}`, part: p, clip: { x: 0, y: 0, w: p.w, h: p.h } });
        continue;
      }
      // Option B: Streifen teilen, wenn die Breite auf die Seite passt
      const maxLen = Math.max(area.w, area.h);
      const across = Math.min(area.w, area.h);
      if (oversize === 'split' && p.splittable && p.h <= across + 1e-9) {
        const ranges = splitRanges(p.w, maxLen, TILE_OVERLAP);
        ranges.forEach((r, i) =>
          pieces.push({
            key: `${p.id}#${c}#${i}`,
            part: p,
            clip: { x: r.x0, y: 0, w: r.x1 - r.x0, h: p.h },
            caption: `Stück ${i + 1}/${ranges.length}${i > 0 ? ` – ${TILE_OVERLAP} mm mit Stück ${i} überlappen` : ''}`,
          }),
        );
        if (c === 0) notes.push(`${p.name}: in ${ranges.length} Stücke geteilt (je ${TILE_OVERLAP} mm Überlappung).`);
        continue;
      }
      // Option A: Kacheln – Lage mit weniger Blättern wählen
      const straight = tileGrid(p.w, p.h, area.w, area.h);
      const turned = tileGrid(p.w, p.h, area.h, area.w);
      const rotated = turned.length < straight.length;
      const tiles = rotated ? turned : straight;
      const reg = registrationMarks(p, tiles);
      const tp: Part = { ...p, marks: [...p.marks, ...reg.marks], texts: [...p.texts, ...reg.texts] };
      tiles.forEach((t, i) => {
        const caption = `${p.name}${copy} – Blatt ${i + 1}/${tiles.length}${i > 0 ? `, an Marke ◆${i + 1} ansetzen` : ''}`;
        tileSheets.push({
          w: pageW,
          h: pageH,
          kind: 'tile',
          items: [{ part: tp, clip: t, x: area.x, y: area.y, rotated, caption }],
        });
      });
      if (c === 0) notes.push(`${p.name}: auf ${tiles.length} Blätter gekachelt (${TILE_OVERLAP} mm Überlappung, Passmarken ◆).`);
    }
  }
  const placed = shelfPack(
    pieces.map((pc) => ({ id: pc.key, w: pc.clip.w, h: pc.clip.h })),
    area.w,
    area.h,
    GAP,
  );
  const byKey = new Map(pieces.map((pc) => [pc.key, pc]));
  const nestSheets: Sheet[] = [];
  for (const pl of placed) {
    while (nestSheets.length <= pl.bin) nestSheets.push({ w: pageW, h: pageH, kind: 'nest', items: [] });
    const pc = byKey.get(pl.id)!;
    nestSheets[pl.bin].items.push({
      part: pc.part,
      clip: pc.clip,
      x: area.x + pl.x,
      y: area.y + pl.y,
      rotated: pl.rotated,
      caption: pc.caption,
    });
  }
  return { sheets: [...nestSheets, ...tileSheets], notes };
}

function planPlotter(parts: Part[]): Sheet[] {
  const sheets: Sheet[] = [];
  for (const p of activeParts(parts))
    for (let c = 0; c < p.count; c++) {
      const w = Math.max(p.w + 2 * MARGIN, MIN_PAGE_W);
      const h = p.h + 2 * MARGIN + HEADER + FOOTER;
      sheets.push({
        w,
        h,
        kind: 'plotter',
        items: [
          {
            part: p,
            clip: { x: 0, y: 0, w: p.w, h: p.h },
            x: MARGIN,
            y: MARGIN + HEADER,
            rotated: false,
            caption: p.count > 1 ? `Stück ${c + 1}/${p.count}` : undefined,
          },
        ],
      });
    }
  return sheets;
}

/** Seitenplan. Hoch-/Querformat wird automatisch gewählt (weniger Blätter, bei Gleichstand Hochformat). */
export function planSheets(parts: Part[], format: PageFormat, oversize: OversizeMode): SheetPlan {
  if (format === 'plotter') return { sheets: planPlotter(parts), orientation: 'custom', notes: [] };
  if (format === 'laser')
    return { sheets: activeParts(parts).length ? [laserSheet(parts)] : [], orientation: 'custom', notes: [] };
  const s = PAGE_SIZES[format];
  const portrait = planFixed(parts, s.w, s.h, oversize);
  const landscape = planFixed(parts, s.h, s.w, oversize);
  const tiles = (x: typeof portrait) => x.sheets.filter((q) => q.kind === 'tile').length;
  const useLandscape =
    landscape.sheets.length < portrait.sheets.length ||
    (landscape.sheets.length === portrait.sheets.length && tiles(landscape) < tiles(portrait));
  const pick = useLandscape ? landscape : portrait;
  return { sheets: pick.sheets, orientation: useLandscape ? 'landscape' : 'portrait', notes: pick.notes };
}

export { placedSize };
