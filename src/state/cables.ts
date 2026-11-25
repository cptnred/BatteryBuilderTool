/** Kabellängen je Akkukonfiguration (S/P und Splitpack), in localStorage gespeichert. */
import type { ConfigState } from './config';

const KEY = 'akku-konfigurator:cables:v1';

export interface CableEntry {
  label: string;
  /** Länge in mm; null = noch leer */
  mm: number | null;
}

/** Schlüssel der Konfiguration, z. B. „18S2P“ oder „20S2P+2S-minus“. */
export function cableKey(s: ConfigState): string {
  const base = `${s.series}S${s.parallel}P`;
  return s.boosterEnabled ? `${base}+${s.booster.series}S-${s.booster.position}` : base;
}

export function defaultCables(s: ConfigState): CableEntry[] {
  const list: CableEntry[] = [
    { label: 'Hauptminus (−)', mm: null },
    { label: 'Hauptplus (+)', mm: null },
  ];
  if (s.boosterEnabled) list.push({ label: 'Verbindung Splitpack', mm: null });
  return list;
}

type Store = Record<string, CableEntry[]>;

function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    const data: unknown = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? (data as Store) : {};
  } catch {
    return {};
  }
}

const clean = (v: unknown): CableEntry[] | null =>
  Array.isArray(v)
    ? v
        .filter((e) => e && typeof e.label === 'string')
        .map((e) => ({
          label: String(e.label),
          mm: typeof e.mm === 'number' && Number.isFinite(e.mm) && e.mm >= 0 ? e.mm : null,
        }))
    : null;

export function loadCables(s: ConfigState): CableEntry[] {
  return clean(readStore()[cableKey(s)]) ?? defaultCables(s);
}

export function saveCables(s: ConfigState, list: CableEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readStore(), [cableKey(s)]: list }));
  } catch {
    /* Speicher nicht verfügbar – egal */
  }
}
