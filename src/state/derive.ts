/**
 * Ableitungen aus dem Formularzustand (Plan 06 §4): Aufteilung aus der Brückenwahl,
 * Zellen je Lage aus der Lagenzahl. Rein, ohne React.
 */
import type { Stacking } from '../core';

export type BridgeChoice = 'auto' | 'inner' | 'outer';
export type BridgePos = 'inner' | 'outer';

export const LAYER_LIMITS = { min: 1, max: 6 } as const;

/** Gleichmäßige Aufteilung, Rest an die vorderen Packs (wie Fachkonzept §6). */
export function evenSplit(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const rest = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

export interface BridgeState {
  /** Schalter bedienbar? Nur bei 2 Teilpacks und gerader Gruppenzahl ≥ 4 im Hauptpack. */
  selectable: boolean;
  /** Brückenlage bei gleichmäßiger Aufteilung; null, wenn nicht wählbar */
  natural: BridgePos | null;
  /** wirksame Aufteilung vorne -> hinten */
  split: number[];
  /** true = Aufteilung weicht wegen der Brückenwahl von gleichmäßig ab */
  uneven: boolean;
}

/**
 * Hauptminus und Hauptplus liegen immer außen. Dann gilt: ungerade Gruppenzahl je Teilpack -> Brücke innen,
 * gerade -> außen. Die andere Lage braucht die Aufteilung (h+1) + (h−1), größerer Teilpack vorne.
 */
export function bridgeState(mainS: number, subPacks: number, choice: BridgeChoice): BridgeState {
  if (subPacks !== 2 || mainS % 2 !== 0 || mainS < 4)
    return { selectable: false, natural: null, split: evenSplit(mainS, subPacks), uneven: false };
  const h = mainS / 2;
  const natural: BridgePos = h % 2 === 1 ? 'inner' : 'outer';
  if (choice === 'auto' || choice === natural) return { selectable: true, natural, split: [h, h], uneven: false };
  return { selectable: true, natural, split: [h + 1, h - 1], uneven: true };
}

/** Brückenlage, die aus einer Aufteilung in 2 Teilpacks folgt; null bei anderer Teilpackzahl. */
export function bridgePosOfSplit(split: number[]): BridgePos | null {
  if (split.length !== 2) return null;
  return split[0] % 2 === 1 && split[1] % 2 === 1 ? 'inner' : 'outer';
}

export interface RowPlan {
  /** Zellen je Lage je Teilpack (vorne -> hinten); bei unvollständiger Lage die der größeren Lage */
  perRow: number[];
  /** Meldung, wenn eine Zellzahl nicht auf die Lagen passt */
  error: string | null;
}

/** Passen n Zellen bei perRow je Lage genau auf die Lagenzahl? Volle Lagen oder die unvollständige Lage (Plan 06 §3.1). */
export function fitsLayers(n: number, perRow: number, layers: number, stacking: Stacking): boolean {
  return n === perRow * layers || (stacking === 'honeycomb' && layers === 2 && n >= 3 && n === 2 * perRow - 1);
}

/** Zellen je Lage aus der Lagenzahl. Gültig sind volle Lagen oder die unvollständige Lage nach Plan 06 §3.1. */
export function autoRows(split: number[], parallel: number, layers: number, stacking: Stacking): RowPlan {
  // Teilpack ohne Gruppen (s < 1): Fehler der Aufteilung, den der Kern meldet – hier 1 je Lage und keine eigene Meldung
  const perRow = split.map((s) => Math.max(1, Math.ceil((s * parallel) / layers)));
  let error: string | null = null;
  split.forEach((s, i) => {
    if (s < 1) return;
    const n = s * parallel;
    const m = perRow[i];
    const ok = fitsLayers(n, m, layers, stacking);
    if (!ok && error === null) error = `Teilpack ${i + 1}: ${n} Zellen lassen sich nicht auf ${layers} Lagen aufteilen.`;
  });
  return { perRow, error };
}
