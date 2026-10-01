/** Anzeige mit Dezimalkomma; Eingabe mit Komma oder Punkt. */
export function fmtNum(v: number, digits = 1): string {
  if (!Number.isFinite(v)) return '–';
  return v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function fmtFixed(v: number, digits = 1): string {
  if (!Number.isFinite(v)) return '–';
  return v.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** "21,4" / "21.4" -> 21.4; leer -> null; Unsinn -> NaN */
export function parseNum(text: string): number | null {
  const t = text.trim().replace(/\s/g, '').replace(',', '.');
  if (t === '') return null;
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return NaN;
  return Number(t);
}

/** Zahl für ein Eingabefeld (Komma, ohne unnötige Nachkommastellen). */
export function toInputText(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '';
  return String(+v.toFixed(4)).replace('.', ',');
}
