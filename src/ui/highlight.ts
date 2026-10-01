/** Hover-Hervorhebung von Gruppe bzw. Knoten – übergreifend über alle Ansichten und Tabellen. */
import { createContext, useContext } from 'react';

export type Highlight = { kind: 'group'; s: number } | { kind: 'node'; n: number } | null;

export interface HighlightCtx {
  hl: Highlight;
  setHl: (h: Highlight) => void;
}

export const HighlightContext = createContext<HighlightCtx>({ hl: null, setHl: () => {} });

export const useHighlight = () => useContext(HighlightContext);

/** Gruppen, die hervorgehoben werden: Gruppe s, bzw. bei Knoten Bn die Gruppen n und n+1. */
export function highlightedGroups(hl: Highlight): Set<number> {
  if (!hl) return new Set();
  return hl.kind === 'group' ? new Set([hl.s]) : new Set([hl.n, hl.n + 1]);
}

/** Knoten, die hervorgehoben werden: bei Gruppe s die Knoten s−1 und s. */
export function highlightedNodes(hl: Highlight): Set<number> {
  if (!hl) return new Set();
  return hl.kind === 'node' ? new Set([hl.n]) : new Set([hl.s - 1, hl.s]);
}
