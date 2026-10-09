/** Kurztext der aktiven Annahmen – rein, aus dem gelösten Layout abgeleitet. */
import type { Layout, SubPack } from '../core';
import { shortName } from './connections';
import { hasShortLayer, layerCounts } from './layers';

const sideWord = (s: 'L' | 'R') => (s === 'L' ? 'links' : 'rechts');
const faceWord = (f: 'V' | 'H') => (f === 'V' ? 'vorne' : 'hinten');
/** Stirnseiten des Boosters heißen 1 und 2 */
const faceOf = (p: SubPack, f: 'V' | 'H') => (p.role === 'booster' ? `Stirnseite ${f === 'V' ? 1 : 2}` : faceWord(f));

function startDesc(p: SubPack): string {
  return `${shortName(p)} läuft von ${sideWord(p.startSide)} nach ${sideWord(p.endSide)} und beginnt ${p.startsOnTop ? 'oben' : 'unten'} ${sideWord(p.startSide)} (Stirnseite ${faceWord(p.startFace)}).`;
}

function shortDesc(p: SubPack): string {
  const [bottom, top] = layerCounts(p);
  return `${top} oben + ${bottom} unten`;
}

/** Art der Verschaltung bei Wabe nach Lagenzahl: 1 Lage, 2 Lagen (Zickzack), ab 3 Lagen (Spalten-Serpentine) */
const wiringClass = (layers: number) => Math.min(layers, 3);

function layersDesc(layers: number): string {
  if (layers > 2) return `${layers} Lagen, Verschaltung als Spalten-Serpentine (Spalte für Spalte)`;
  return layers === 2 ? '2 Lagen, Verbindungen schräg (Zickzack)' : '1 Lage, alle Zellen nebeneinander';
}

/**
 * Booster mit anderer Lagenzahl als der Teilpack, an dem er hängt (eigene Lagenzahl, Plan 07 §4.3):
 * Die Sätze zur Verschaltung beschreiben den Hauptpack; hier steht, was für den Booster gilt.
 */
function boosterLayerLines(layout: Layout): string[] {
  const cable = layout.bridges.find((b) => b.kind === 'cable');
  if (!cable || layout.config.stacking !== 'honeycomb') return [];
  const host = layout.packs.find((p) => p.role === 'main' && (p.key === cable.from || p.key === cable.to));
  if (!host) return [];
  const boost = layout.packs.filter((p) => p.role === 'booster');
  const other = boost.filter((p) => wiringClass(p.layers) !== wiringClass(host.layers));
  if (!other.length) return [];
  if (other.length === boost.length && other.every((p) => p.layers === other[0].layers))
    return [`Booster abweichend: ${layersDesc(other[0].layers)}.`];
  return other.map((p) => `${shortName(p)} abweichend: ${layersDesc(p.layers)}.`);
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
  const byKey = new Map(layout.packs.map((p) => [p.key, p]));
  const first = layout.chain.map((k) => byKey.get(k)!).find((p) => p.role === 'main');
  if (cfg.stacking === 'honeycomb' && maxLayers <= 2)
    out.push(`Verbindungen immer schräg (Zickzack), beginnend ${first?.startsOnTop ? 'oben' : 'unten'}.`);
  else out.push('Verschaltung als Spalten-Serpentine (Spalte für Spalte).');
  if (cfg.parallel > 1 && cfg.stacking === 'honeycomb' && maxLayers === 2)
    out.push(`${cfg.parallel}P-Gruppe = untere Zelle + schräg darüber liegende Zelle (gleiche Nummer, parallel).`);
  out.push(...boosterLayerLines(layout));
  for (const p of main) out.push(startDesc(p));
  for (const br of layout.bridges) {
    const from = layout.packs.find((p) => p.key === br.from)!;
    const to = layout.packs.find((p) => p.key === br.to)!;
    if (br.kind === 'inner')
      out.push(`Brücke B${br.node} innen zwischen ${shortName(from)} und ${shortName(to)}, ${sideWord(br.fromSide)}.`);
    else if (br.kind === 'outer')
      out.push(
        `Brücke B${br.node} außen herum (${sideWord(br.fromSide)}): gerade Gruppenzahl, Kabel von ${shortName(from)}-${faceOf(from, br.fromFace)} nach ${shortName(to)}-${faceOf(to, br.toFace)}.`,
      );
    else
      out.push(
        `Booster per Kabel an B${br.node} (${to.role === 'booster' ? 'am Hauptplus' : 'am Hauptminus'}), eigenes Gehäuse.`,
      );
  }
  const boost = layout.packs.filter((p) => p.role === 'booster');
  if (boost.length > 1) out.push(`Booster: ${boost.length} Einzelpacks hintereinander in einem Gehäuse, Isolierlage dazwischen.`);
  if (main.length > 1)
    out.push('Zwischen den Teilpacks liegt eine Isolierlage; innere Stirnseiten vor dem Zusammenfügen schweißen.');
  return out;
}
