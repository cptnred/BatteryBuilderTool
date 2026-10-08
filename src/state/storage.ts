/** localStorage und JSON-Datei: die App funktioniert auch ohne Speicher (try/catch). */
import type { ConfigState } from './config';
import { mergeWithDefaults, migrateV1 } from './config';

const KEY = 'akku-konfigurator:v2';
/** Formatversion 1 (vor Plan 06): wird beim Laden übernommen, nicht mehr geschrieben */
const KEY_V1 = 'akku-konfigurator:v1';

export function saveLocal(s: ConfigState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* Speicher nicht verfügbar – egal */
  }
}

export function loadLocal(): ConfigState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return mergeWithDefaults(JSON.parse(raw));
    const old = localStorage.getItem(KEY_V1);
    return old ? migrateV1(JSON.parse(old)) : null;
  } catch {
    return null;
  }
}

export const JSON_FORMAT = 'akku-konfigurator';

export function toJsonFile(s: ConfigState): string {
  return JSON.stringify({ format: JSON_FORMAT, version: 2, config: s }, null, 2);
}

/** Wirft eine verständliche Fehlermeldung, wenn die Datei nicht passt. */
export function fromJsonFile(text: string): ConfigState {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  const d = data as { format?: unknown; version?: unknown; config?: unknown };
  if (!d || typeof d !== 'object' || d.format !== JSON_FORMAT || !d.config)
    throw new Error('Die Datei ist keine Akku-Konfigurator-Konfiguration.');
  return d.version === 1 ? migrateV1(d.config) : mergeWithDefaults(d.config);
}
