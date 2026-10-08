/** Kurztext der aktiven Annahmen – rein, aus dem gelösten Layout abgeleitet. */
import type { Layout, SubPack } from '../core';
import { shortName } from './connections';
import { hasShortLayer, layerCounts } from './layers';

const sideWord = (s: 'L' | 'R') => (s === 'L' ? 'links' : 'rechts');
const faceWord = (f: 'V' | 'H') => (f === 'V' ? 'vorne' : 'hinten');

function startDesc(p: SubPack): string {
  return `${shortName(p)} läuft von ${sideWord(p.startSide)} nach ${sideWord(p.endSide)} und beginnt ${p.startsOnTop ? 'oben' : 'unten'} ${sideWord(p.startSide)} (Stirnseite ${faceWord(p.startFace)}).`;
}

function shortDesc(p: SubPack): string {
  const [bottom, top] = layerCounts(p);
  return `${top} oben + ${bottom} unten`;
}

export function assumptions(layout: Layout): string[] {
  const cfg = layout.config;
  const out: string[] = [];
  const main = layout.packs.filter((p) => p.role === 'main');
  const maxLayers = Math.max(...main.map((p) => p.layers));
  const short = main.filter(hasShortLayer);
  const full = main.filter((p) => !hasShortLayer(p));
  out.push(
    'Zellen liegen längs (Pole zeigen nach vorne/hinten). Stirnseiten immer von außen betrachtet, Vorderseite gespiegelt.',
  );
  if (cfg.stacking === 'honeycomb' && full.some((p) => p.layers > 1))
    out.push(`Wabe: ungerade Lagen um ½ Zelle nach ${sideWord(cfg.offsetSide)} versetzt. Alle Teilpacks identisch gestapelt.`);
  else if (cfg.stacking === 'grid') out.push('Raster: Zellen gerade übereinander. Alle Teilpacks identisch gestapelt.');
  if (short.length) {
    const who = full.length ? `${short.map(shortName).join(', ')}: ` : '';
    const descs = [...new Set(short.map(shortDesc))].join(' bzw. ');
    out.push(
      `${who}Unvollständige Lage: ${descs}, kürzere Lage in den Mulden.${full.length ? '' : ' Alle Teilpacks identisch gestapelt.'}`,
    );
  }
  const firstKey = layout.chain.find((k) => k !== 'BOOST');
  const first = main.find((p) => p.key === firstKey);
  if (cfg.stacking === 'honeycomb' && maxLayers <= 2)
    out.push(`Verbindungen immer schräg (Zickzack), beginnend ${first?.startsOnTop ? 'oben' : 'unten'}.`);
  else out.push('Verschaltung als Spalten-Serpentine (Spalte für Spalte).');
  if (cfg.parallel > 1 && cfg.stacking === 'honeycomb' && maxLayers === 2)
    out.push(`${cfg.parallel}P-Gruppe = untere Zelle + schräg darüber liegende Zelle (gleiche Nummer, parallel).`);
  for (const p of main) out.push(startDesc(p));
  for (const br of layout.bridges) {
    const from = layout.packs.find((p) => p.key === br.from)!;
    const to = layout.packs.find((p) => p.key === br.to)!;
    if (br.kind === 'inner')
      out.push(`Brücke B${br.node} innen zwischen ${shortName(from)} und ${shortName(to)}, ${sideWord(br.fromSide)}.`);
    else if (br.kind === 'outer')
      out.push(
        `Brücke B${br.node} außen herum (${sideWord(br.fromSide)}): gerade Gruppenzahl, Kabel von ${shortName(from)}-${faceWord(br.fromFace)} nach ${shortName(to)}-${faceWord(br.toFace)}.`,
      );
    else
      out.push(
        `Booster per Kabel an B${br.node} (${to.role === 'booster' ? 'am Hauptplus' : 'am Hauptminus'}), eigenes Gehäuse.`,
      );
  }
  if (main.length > 1)
    out.push('Zwischen den Teilpacks liegt eine Isolierlage; innere Stirnseiten vor dem Zusammenfügen schweißen.');
  return out;
}
