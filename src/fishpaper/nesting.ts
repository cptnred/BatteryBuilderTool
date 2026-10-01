/** Einfaches Regal-Packing (Shelf) mit 90°-Drehung – rein, in mm. */

export interface NestItem {
  id: string;
  w: number;
  h: number;
}

export interface NestPlacement {
  id: string;
  /** Index der Seite */
  bin: number;
  x: number;
  y: number;
  rotated: boolean;
  w: number;
  h: number;
}

/**
 * Packt Rechtecke auf Seiten der Größe binW × binH (Inhaltsbereich), Abstand gap.
 * Jedes Teil wird so gedreht, dass es möglichst flach liegt und passt. Teile, die in keiner Lage passen, werfen.
 */
export function shelfPack(items: NestItem[], binW: number, binH: number, gap = 5): NestPlacement[] {
  const oriented = items.map((it) => {
    const fitsN = it.w <= binW + 1e-9 && it.h <= binH + 1e-9;
    const fitsR = it.h <= binW + 1e-9 && it.w <= binH + 1e-9;
    if (!fitsN && !fitsR) throw new Error(`Teil ${it.id} passt nicht auf die Seite`);
    // flach liegend bevorzugt (kleinere Höhe), sofern es passt
    const rot = fitsR && (!fitsN || it.w < it.h);
    return { id: it.id, w: rot ? it.h : it.w, h: rot ? it.w : it.h, rotated: rot };
  });
  oriented.sort((a, b) => b.h - a.h || b.w - a.w);
  const out: NestPlacement[] = [];
  let bin = 0;
  let shelfY = 0;
  let shelfH = 0;
  let x = 0;
  for (const it of oriented) {
    if (x > 0 && x + it.w > binW + 1e-9) {
      shelfY += shelfH + gap;
      x = 0;
      shelfH = 0;
    }
    if (shelfY + it.h > binH + 1e-9) {
      bin++;
      shelfY = 0;
      x = 0;
      shelfH = 0;
    }
    out.push({ id: it.id, bin, x, y: shelfY, rotated: it.rotated, w: it.w, h: it.h });
    x += it.w + gap;
    shelfH = Math.max(shelfH, it.h);
  }
  return out;
}
