import { memo, useMemo } from 'react';
import type { Face, Layout, SubPack } from '../../core';
import { faceModel } from '../../view/faceModel';
import { highlightedGroups, highlightedNodes, useHighlight } from '../highlight';

interface Props {
  layout: Layout;
  pack: SubPack;
  face: Face;
}

/** Stirnseitenansicht von außen (V gespiegelt) mit R/L-Markern, Polarität, Gruppen, Streifen und Bk-Labels. */
export const FaceView = memo(function FaceView({ layout, pack, face }: Props) {
  const m = useMemo(() => faceModel(layout, pack, face), [layout, pack, face]);
  const { hl, setHl } = useHighlight();
  const hg = highlightedGroups(hl);
  const hn = highlightedNodes(hl);
  const active = hl !== null;
  const vb = m.viewBox;
  const fs = m.fontSize;
  // gleicher Maßstab für alle Ansichten: ~3,2 px je mm, auf schmalen Bildschirmen skaliert das SVG mit
  const pxPerMm = 3.2;

  return (
    <figure className="view face" data-face={face} data-pack={pack.key}>
      <figcaption>{m.title}</figcaption>
      <svg
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        style={{ width: '100%', maxWidth: vb.w * pxPerMm }}
        role="img"
        aria-label={`${m.title}. ${m.mirrored ? 'Gespiegelt: rechts ist im Bild links.' : ''}`}
        onPointerLeave={() => setHl(null)}
      >
        {m.cells.map((c) => {
          const on = hg.has(c.group);
          return (
            <g
              key={c.id}
              className={'cell' + (on ? ' is-hl' : active ? ' is-dim' : '')}
              onPointerEnter={() => setHl({ kind: 'group', s: c.group })}
              onClick={() => setHl({ kind: 'group', s: c.group })}
            >
              <title>{`Gruppe ${c.group} · ${c.polarity === '+' ? 'Pluspol' : 'Minuspol'} · Zelle ${c.id}`}</title>
              <circle className="cell__body" cx={c.cx} cy={c.cy} r={c.r * 0.97} />
            </g>
          );
        })}
        <g className="strips" pointerEvents="none">
          {m.strips.map((st) => {
            const on = hn.has(st.node);
            return (
              <g key={st.node} className={`strip tone${st.tone}` + (on ? ' is-hl' : '')}>
                {st.segments.map((s, i) => (
                  <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeWidth={m.r * 1.1} strokeLinecap="round" />
                ))}
              </g>
            );
          })}
        </g>
        <g className="strip-dots" pointerEvents="none">
          {m.strips.map((st) =>
            st.dots.map((d, i) => (
              <circle key={`${st.node}-${i}`} className={`strip-dot tone${st.tone}`} cx={d.cx} cy={d.cy} r={m.r * 0.8} />
            )),
          )}
        </g>
        <g pointerEvents="none">
          {m.cells.map((c) => (
            <g key={c.id} className={hg.has(c.group) ? 'is-hl' : active ? 'is-dim' : ''}>
              <circle className="cell__rim" cx={c.cx} cy={c.cy} r={c.r * 0.97} />
              <text
                className={c.polarity === '+' ? 'sym sym--plus' : 'sym sym--minus'}
                x={c.cx}
                y={c.cy + fs.symbol * 0.12}
                fontSize={fs.symbol}
                textAnchor="middle"
              >
                {c.polarity}
              </text>
              <text className="grp" x={c.cx} y={c.cy + c.r * 0.72} fontSize={fs.group} textAnchor="middle">
                {c.group}
              </text>
            </g>
          ))}
        </g>
        <g className="labels">
          {m.labels.map((l) => (
            <text
              key={l.node}
              className={`bk bk--${l.role}` + (hn.has(l.node) ? ' is-hl' : '')}
              x={l.x}
              y={l.y}
              fontSize={fs.label}
              textAnchor="middle"
              onPointerEnter={() => setHl({ kind: 'node', n: l.node })}
              onClick={() => setHl({ kind: 'node', n: l.node })}
            >
              {l.text}
            </text>
          ))}
        </g>
        <g className="flags">
          {m.flags.map((f) => (
            <g
              key={`${f.node}-${f.text}`}
              className={`flag flag--${f.role}` + (hn.has(f.node) ? ' is-hl' : '')}
              onPointerEnter={() => setHl({ kind: 'node', n: f.node })}
              onClick={() => setHl({ kind: 'node', n: f.node })}
            >
              <line x1={f.x} y1={f.y1} x2={f.x} y2={f.y2} strokeWidth={1.4} strokeLinecap="round" />
              <rect x={f.box.x} y={f.box.y} width={f.box.w} height={f.box.h} rx={0.8} />
              <text x={f.x} y={f.box.y + f.box.h / 2 + fs.flag * 0.36} fontSize={fs.flag} textAnchor="middle">
                {f.text}
              </text>
            </g>
          ))}
        </g>
        <g className="markers">
          <text x={m.markers.leftX} y={m.markers.y + fs.marker * 0.36} fontSize={fs.marker} textAnchor="middle">
            {m.markers.left}
          </text>
          <text x={m.markers.rightX} y={m.markers.y + fs.marker * 0.36} fontSize={fs.marker} textAnchor="middle">
            {m.markers.right}
          </text>
          <text className="unten" x={m.markers.leftX} y={m.height + fs.flag} fontSize={fs.flag * 0.8} textAnchor="middle">
            unten
          </text>
        </g>
      </svg>
    </figure>
  );
});
