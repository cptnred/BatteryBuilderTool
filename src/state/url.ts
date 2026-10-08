/**
 * Zustand im URL-Hash: nur die vom Standard abweichenden Felder, als base64url-JSON.
 * Beispiel: #c2=eyJzZXJpZXMiOjMyfQ   (Formatversion 2; alte Links mit #c= werden übernommen, Plan 06 §4.7)
 */
import type { ConfigState } from './config';
import { DEFAULT_STATE, mergeWithDefaults, migrateV1 } from './config';

const PREFIX = 'c2=';
const PREFIX_V1 = 'c=';

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Nur die Felder, die sich vom Standard unterscheiden (kompakter Link). */
export function diffFromDefault(s: ConfigState): Partial<ConfigState> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(s) as (keyof ConfigState)[]) {
    if (JSON.stringify(s[k]) !== JSON.stringify(DEFAULT_STATE[k])) out[k] = s[k];
  }
  return out as Partial<ConfigState>;
}

export function encodeState(s: ConfigState): string {
  const diff = diffFromDefault(s);
  return Object.keys(diff).length ? PREFIX + toBase64Url(JSON.stringify(diff)) : '';
}

/** Liest einen Hash (mit oder ohne '#'). Liefert null bei fehlendem oder kaputtem Inhalt. */
export function decodeState(hash: string): ConfigState | null {
  const h = hash.replace(/^#/, '');
  try {
    if (h.startsWith(PREFIX)) return mergeWithDefaults(JSON.parse(fromBase64Url(h.slice(PREFIX.length))));
    if (h.startsWith(PREFIX_V1)) return migrateV1(JSON.parse(fromBase64Url(h.slice(PREFIX_V1.length))));
  } catch {
    return null;
  }
  return null;
}
