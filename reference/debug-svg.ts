/**
 * debug-svg.ts – minimaler SVG-Renderer als REFERENZ für die Darstellungskonventionen.
 * Kein UI-Code! Zeigt nur, wie Stirnseiten, Nickelstreifen, Polarität, Abgriffe
 * und Umrisse korrekt (inkl. Spiegelung der Vorderansicht) gezeichnet werden.
 */
import type { Layout, SubPack, Face, Outline } from './pack-core.ts';
import { adjacency, packOutline, outlinePolyline, balanceTaps } from './pack-core.ts';

const C = { plus: '#d7263d', minus: '#1d4ed8', bridge: '#f28c28', ni: ['#8a95a1', '#c4cbd2'], cell: '#f6f1e6', edge: '#2b2b2b', txt: '#222' };

/**
 * Ansicht einer Stirnseite VON AUSSEN.
 *  - Vorderseite 'V' (Blick von vorne): gespiegelt -> global RECHTS erscheint LINKS im Bild.
 *  - Rückseite  'H' (Blick von hinten): nicht gespiegelt.
 */
export function faceSVG(layout: Layout, pack: SubPack, face: Face, ox: number, oy: number, scale: number): string {
  const W = pack.width, H = pack.height;
  const X = (x: number) => ox + scale * (face === 'V' ? W - x : x);
  const Y = (z: number) => oy + scale * (H - z);
  const R = layout.config.cell.diameter / 2;
  const byId = new Map(pack.cells.map((c) => [c.id, c]));
  const adj = adjacency(layout.config);
  const groupOf = new Map<string, (typeof pack.groups)[number]>();
  pack.groups.forEach((g) => g.cells.forEach((id) => groupOf.set(id, g)));
  let s = '';
  const title = `${pack.label} – ${face === 'V' ? 'vordere Stirnseite (Blick von vorne)' : 'hintere Stirnseite (Blick von hinten)'}`;
  s += `<text x="${ox}" y="${oy - 38}" font-size="13" font-weight="bold">${title}</text>`;
  for (const c of pack.cells) s += `<circle cx="${X(c.x)}" cy="${Y(c.z)}" r="${scale * R * 0.97}" fill="${C.cell}"/>`;
  const strips = pack.strips.filter((st) => st.face === face);
  strips.forEach((st, i) => {
    const col = C.ni[i % 2];
    const cs = st.cells.map((id) => byId.get(id)!);
    for (let a = 0; a < cs.length; a++) for (let b = a + 1; b < cs.length; b++) {
      if (Math.hypot(cs[a].x - cs[b].x, cs[a].z - cs[b].z) <= adj)
        s += `<line x1="${X(cs[a].x)}" y1="${Y(cs[a].z)}" x2="${X(cs[b].x)}" y2="${Y(cs[b].z)}" stroke="${col}" stroke-width="${scale * R * 1.1}" stroke-linecap="round"/>`;
    }
    for (const c of cs) s += `<circle cx="${X(c.x)}" cy="${Y(c.z)}" r="${scale * R * 0.8}" fill="${col}"/>`;
  });
  for (const c of pack.cells) {
    const g = groupOf.get(c.id)!;
    const neg = g.minusFace === face;
    s += `<circle cx="${X(c.x)}" cy="${Y(c.z)}" r="${scale * R * 0.97}" fill="none" stroke="${C.edge}"/>`;
    s += `<text x="${X(c.x)}" y="${Y(c.z) + 2}" font-size="${scale * 9}" text-anchor="middle" font-weight="bold" fill="${neg ? C.minus : C.plus}">${neg ? '−' : '+'}</text>`;
    s += `<text x="${X(c.x)}" y="${Y(c.z) + scale * 7}" font-size="${scale * 4.5}" text-anchor="middle" fill="#555">${g.s}</text>`;
  }
  // Abgriffe / Anschlüsse
  let flag = 0;
  for (const st of strips) {
    const cs = st.cells.map((id) => byId.get(id)!);
    const mx = cs.reduce((a, c) => a + X(c.x), 0) / cs.length;
    const isMain = (st.kind === 'start' && st.node === 0) || (st.kind === 'end' && st.node === layout.totalS);
    const isBridge = (st.kind !== 'series') && !isMain;
    const col = isMain ? (st.node === 0 ? C.minus : C.plus) : isBridge ? C.bridge : C.txt;
    s += `<text x="${mx}" y="${oy - 6}" font-size="10" text-anchor="middle" fill="${col}" font-weight="${st.kind === 'series' ? 'normal' : 'bold'}">B${st.node}</text>`;
    if (st.kind !== 'series') {
      const txt = isMain ? (st.node === 0 ? 'HAUPT −' : 'HAUPT +') : 'BRÜCKE';
      const yb = oy + scale * H + 14 + 16 * flag++;
      s += `<line x1="${mx}" y1="${oy + scale * H - 4}" x2="${mx}" y2="${yb - 10}" stroke="${col}" stroke-width="4"/>`;
      s += `<text x="${mx}" y="${yb + 2}" font-size="10" text-anchor="middle" font-weight="bold" fill="${col}">${txt} (B${st.node})</text>`;
    }
  }
  const left = face === 'V' ? 'R' : 'L', right = face === 'V' ? 'L' : 'R';
  s += `<text x="${ox - 18}" y="${oy + (scale * H) / 2 + 6}" font-size="18" font-weight="bold" fill="#888">${left}</text>`;
  s += `<text x="${ox + scale * W + 6}" y="${oy + (scale * H) / 2 + 6}" font-size="18" font-weight="bold" fill="#888">${right}</text>`;
  return s;
}

export function outlineSVG(o: Outline, ox: number, oy: number, scale: number, label: string, H: number): string {
  const pts = outlinePolyline(o, 0.1);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${(ox + scale * p.x).toFixed(2)},${(oy + scale * (H - p.z)).toFixed(2)}`).join('') + 'Z';
  return `<path d="${d}" fill="none" stroke="#000" stroke-width="1"/><text x="${ox}" y="${oy - 6}" font-size="11">${label} – Umfang ${o.perimeter.toFixed(1)} mm</text>`;
}

export function layoutSVG(layout: Layout, title: string): string {
  const scale = 2.2;
  let y = 70;
  let body = `<text x="20" y="32" font-size="20" font-weight="bold">${title}</text>`;
  body += `<text x="20" y="54" font-size="12" fill="#444">Kette: ${layout.chain.join(' → ')} · Brücken: ${layout.bridges.map((b) => `${b.from}→${b.to} B${b.node} [${b.kind}, ${b.fromFace}${b.fromSide}→${b.toFace}${b.toSide}]`).join('; ')} · cost ${layout.cost}</text>`;
  for (const p of layout.packs) {
    y += 60;
    body += faceSVG(layout, p, 'V', 40, y, scale);
    body += faceSVG(layout, p, 'H', 80 + scale * p.width + 60, y, scale);
    y += scale * p.height + 60;
  }
  const main = layout.packs[0];
  y += 40;
  body += outlineSVG(packOutline(layout, main, 'straight'), 40, y, scale, 'Umriss gerade', main.height);
  body += outlineSVG(packOutline(layout, main, 'tucked'), 80 + scale * main.width + 60, y, scale, 'Umriss eingebogen', main.height);
  y += scale * main.height + 40;
  const taps = balanceTaps(layout).map((t) => `${t.label}: ${t.spots.map((s) => `${s.pack}/${s.face}/${s.kind}`).join(', ')}`);
  taps.forEach((t, i) => (body += `<text x="40" y="${y + 14 * i}" font-size="10">${t}</text>`));
  y += 14 * taps.length + 20;
  const w = 160 + 2 * scale * Math.max(...layout.packs.map((p) => p.width)) + 60;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${y}" font-family="DejaVu Sans, Arial"><rect width="100%" height="100%" fill="#fff"/>${body}</svg>`;
}
