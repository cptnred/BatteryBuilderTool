import { memo, useMemo } from 'react';
import type { Prims } from '../../export/render';
import { itemPrims } from '../../export/render';
import { pathD } from '../../export/svg';
import type { Part } from '../../fishpaper/types';

/** Zeichnet Primitive (mm) als SVG-Gruppe. Die erste geschlossene Schnittkontur wird als Papier gefüllt. */
export function PrimsGroup({ pr, paperFill = true }: { pr: Prims; paperFill?: boolean }) {
  return (
    <>
      {paperFill &&
        pr.cut
          .filter((p) => p.closed)
          .slice(0, 1)
          .map((p, i) => <path key={i} className="fp-paper" d={pathD(p)} />)}
      {pr.zones.map((p, i) => (
        <path key={`z${i}`} className="fp-zone" d={pathD(p)} />
      ))}
      {pr.marks.map((p, i) => (
        <path key={`m${i}`} className="fp-mark" d={pathD(p)} />
      ))}
      {pr.fold.map((p, i) => (
        <path key={`f${i}`} className="fp-fold" d={pathD(p)} />
      ))}
      {pr.cut.map((p, i) => (
        <path key={`c${i}`} className="fp-cut" d={pathD(p)} />
      ))}
      {pr.texts.map((t, i) => (
        <text
          key={`t${i}`}
          className="fp-text"
          x={t.x}
          y={t.y}
          fontSize={t.size}
          textAnchor={t.anchor}
          transform={t.angle ? `rotate(${-t.angle} ${t.x} ${t.y})` : undefined}
        >
          {t.text}
        </text>
      ))}
    </>
  );
}

/** Ein Fishpaper-Teil in echten mm. pxPerMm = null -> an Containerbreite anpassen. */
export const PartSvg = memo(function PartSvg({ part, pxPerMm, zoom }: { part: Part; pxPerMm: number | null; zoom: number }) {
  const pr = useMemo(() => itemPrims({ part, clip: { x: 0, y: 0, w: part.w, h: part.h }, x: 0, y: 0, rotated: false }), [part]);
  const pad = 2;
  const style = pxPerMm
    ? { width: `${(part.w + 2 * pad) * pxPerMm}px`, maxWidth: 'none' }
    : { width: `${Math.min(100, zoom * 100)}%` };
  return (
    <svg
      className="part-svg"
      viewBox={`${-pad} ${-pad} ${part.w + 2 * pad} ${part.h + 2 * pad}`}
      style={style}
      role="img"
      aria-label={part.name}
    >
      <PrimsGroup pr={pr} />
    </svg>
  );
});
