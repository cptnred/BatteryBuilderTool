/** Kurztexte der Pack-Kennzahlen für Kopfzeile und Karten – rein. */
import type { PackMetrics } from '../core';

const de = (v: number, digits: number) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** „120 A · 15,6 kW“ bzw. bei zwei Werten „72–112 A · 9,5–14,8 kW“; null bei eigener Zelle. */
export function dischargeSummary(m: PackMetrics): string | null {
  if (!m.discharge || !m.discharge.length) return null;
  const a = m.discharge.map((d) => d.value);
  const k = m.discharge.map((d) => d.powerKw);
  const range = (xs: number[], digits: number, unit: string) =>
    xs.length > 1 ? `${de(Math.min(...xs), digits)}–${de(Math.max(...xs), digits)} ${unit}` : `${de(xs[0], digits)} ${unit}`;
  return `${range(a, 0, 'A')} · ${range(k, 1, 'kW')}`;
}
