/** localStorage und JSON-Datei: die App funktioniert auch ohne Speicher (try/catch). */
import type { ConfigState } from './config';
import { mergeWithDefaults } from './config';

const KEY = 'akku-konfigurator:v1';

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
    return raw ? mergeWithDefaults(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export const JSON_FORMAT = 'akku-konfigurator';

export function toJsonFile(s: ConfigState): string {
  return JSON.stringify({ format: JSON_FORMAT, version: 1, config: s }, null, 2);
}

/** Wirft eine verständliche Fehlermeldung, wenn die Datei nicht passt. */
export function fromJsonFile(text: string): ConfigState {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  const d = data as { format?: unknown; config?: unknown };
  if (!d || typeof d !== 'object' || d.format !== JSON_FORMAT || !d.config)
    throw new Error('Die Datei ist keine Akku-Konfigurator-Konfiguration.');
  return mergeWithDefaults(d.config);
}
