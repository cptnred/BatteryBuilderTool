/**
 * Beschriftung der Anschlüsse (Hauptminus/-plus, Brücken, Booster-Kabel) – rein, ohne React.
 */
import type { Layout, Strip, SubPack } from '../core';

export type ConnRole = 'minus' | 'plus' | 'bridge';

export interface Connection {
  text: string;
  role: ConnRole;
}

/** "Pack A (vorne)" -> "Pack A", "Booster 2S2P" -> "Booster", "Booster A (1S2P)" -> "Booster A" */
export function shortName(p: SubPack): string {
  return p.key === 'BOOST' ? 'Booster' : p.label.replace(/ \(.*\)$/, '');
}

/** Beschriftung einer Anschlussfahne an einem Start-/End-Streifen. null bei Serienstreifen. */
export function connectionOf(layout: Layout, pack: SubPack, st: Strip): Connection | null {
  if (st.kind === 'series') return null;
  const hasBooster = layout.packs.some((p) => p.role === 'booster');
  const byKey = new Map(layout.packs.map((p) => [p.key, p]));
  const B = `(B${st.node})`;
  if (st.kind === 'start' && st.node === 0)
    return { text: `${hasBooster && pack.role === 'booster' ? 'SYSTEM' : 'HAUPT'} − ${B}`, role: 'minus' };
  if (st.kind === 'end' && st.node === layout.totalS)
    return { text: `${hasBooster && pack.role === 'booster' ? 'SYSTEM' : 'HAUPT'} + ${B}`, role: 'plus' };
  const br = layout.bridges.find((b) => (st.kind === 'end' ? b.from === pack.key : b.to === pack.key) && b.node === st.node);
  if (!br) return { text: `B${st.node}`, role: 'bridge' };
  const other = byKey.get(st.kind === 'end' ? br.to : br.from)!;
  if (br.kind === 'cable') {
    // Booster hängt am Plus-Ende (Kabel vom letzten Hauptpack) oder am Minus-Ende
    const atPlus = byKey.get(br.to)!.role === 'booster';
    const role: ConnRole = atPlus ? 'plus' : 'minus';
    if (pack.role === 'booster')
      return atPlus
        ? { text: `EINGANG von ${shortName(other)} + ${B}`, role }
        : { text: `AUSGANG → ${shortName(other)} − ${B}`, role };
    return atPlus ? { text: `HAUPT + → Booster ${B}`, role } : { text: `HAUPT − ← Booster ${B}`, role };
  }
  return st.kind === 'end'
    ? { text: `BRÜCKE → ${shortName(other)} ${B}`, role: 'bridge' }
    : { text: `BRÜCKE ← ${shortName(other)} ${B}`, role: 'bridge' };
}

/** Farbe eines Bk-Labels: Anschlussfarbe bei Start/End-Streifen, sonst neutral. */
export function labelRole(layout: Layout, pack: SubPack, st: Strip): ConnRole | 'series' {
  return connectionOf(layout, pack, st)?.role ?? 'series';
}
