import { memo, useMemo } from 'react';
import type { Layout } from '../../core';
import type { TopAlign } from '../../view/topModel';
import { topModel } from '../../view/topModel';

/** Draufsicht mit VORNE oben: Teilpacks, Serienrichtung, Hauptminus/-plus, Brücke, Booster, Maße. */
export const TopView = memo(function TopView({ layout, align }: { layout: Layout; align: TopAlign }) {
  const m = useMemo(() => topModel(layout, align), [layout, align]);
  const vb = m.viewBox;
  const fs = m.fontSize;
  const pts = (p: { x: number; y: number }[]) => p.map((q) => `${q.x},${q.y}`).join(' ');
  return (
    <figure className="view top">
      <figcaption>Draufsicht (VORNE oben)</figcaption>
      <svg
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        style={{ width: '100%', maxWidth: 620 }}
        role="img"
        aria-label="Draufsicht mit Teilpacks, Serienrichtung und Anschlüssen"
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="arrowhead" />
          </marker>
        </defs>
        {m.texts.map((t) => (
          <text
            key={t.text}
            className={`top-txt top-txt--${t.kind}`}
            x={t.x}
            y={t.y}
            fontSize={t.kind === 'end' ? fs * 1.1 : fs * 0.75}
            textAnchor={t.anchor}
          >
            {t.text}
          </text>
        ))}
        {m.packs.map((p) => (
          <g key={p.key} className={'top-pack' + (p.booster ? ' top-pack--booster' : '')}>
            <rect x={p.x} y={p.y} width={p.w} height={p.l} />
            {p.cellLines.map((x, i) => (
              <line key={i} className="cell-line" x1={x} y1={p.y} x2={x} y2={p.y + p.l} />
            ))}
            <text
              className="top-label"
              x={p.x + p.w / 2}
              y={p.y + p.l * 0.3}
              fontSize={fs * (p.booster ? 0.7 : 0.95)}
              textAnchor="middle"
            >
              {p.label}
            </text>
            <line className="run" x1={p.arrow.x1} y1={p.arrow.y} x2={p.arrow.x2} y2={p.arrow.y} markerEnd="url(#arrow)" />
            {!p.compact && (
              <text className="top-sub" x={p.x + p.w / 2} y={p.arrow.y + fs * 1.4} fontSize={fs * 0.7} textAnchor="middle">
                Serienrichtung
              </text>
            )}
          </g>
        ))}
        {m.links.map((l, i) => (
          <g key={i} className={`link link--${l.role} link--${l.kind}`}>
            <polyline points={pts(l.points)} fill="none" strokeWidth={l.kind === 'inner' ? fs * 0.7 : fs * 0.35} />
            <text
              x={l.textPos.x}
              y={l.textPos.y}
              fontSize={fs * 0.72}
              textAnchor={l.textPos.anchor}
              transform={l.textPos.vertical ? `rotate(-90 ${l.textPos.x} ${l.textPos.y})` : undefined}
            >
              {l.lines.map((line, k) => (
                <tspan key={k} x={l.textPos.x} dy={k === 0 ? 0 : fs * 0.85}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        ))}
        {m.flags.map((f) => (
          <g key={f.text} className={`flag flag--${f.role}`}>
            <line x1={f.x} y1={f.y1} x2={f.x} y2={f.y2} strokeWidth={fs * 0.4} strokeLinecap="round" />
            <text
              x={f.x + (f.anchor === 'start' ? -fs * 0.3 : fs * 0.3)}
              y={f.y2 < f.y1 ? f.y2 - fs * 0.35 : f.y2 + fs * 0.95}
              fontSize={fs * 0.78}
              textAnchor={f.anchor}
            >
              {f.text}
            </text>
          </g>
        ))}
        {m.dims.map((d, i) => (
          <g key={i} className="dim">
            <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} />
            <line
              x1={d.x1 - (d.vertical ? fs * 0.5 : 0)}
              y1={d.y1 - (d.vertical ? 0 : fs * 0.5)}
              x2={d.x1 + (d.vertical ? fs * 0.5 : 0)}
              y2={d.y1 + (d.vertical ? 0 : fs * 0.5)}
            />
            <line
              x1={d.x2 - (d.vertical ? fs * 0.5 : 0)}
              y1={d.y2 - (d.vertical ? 0 : fs * 0.5)}
              x2={d.x2 + (d.vertical ? fs * 0.5 : 0)}
              y2={d.y2 + (d.vertical ? 0 : fs * 0.5)}
            />
            <text
              x={d.vertical ? d.x1 + fs * 0.9 : (d.x1 + d.x2) / 2}
              y={d.vertical ? (d.y1 + d.y2) / 2 : d.y1 - fs * 0.35}
              fontSize={fs * 0.7}
              textAnchor="middle"
              transform={d.vertical ? `rotate(90 ${d.x1 + fs * 0.9} ${(d.y1 + d.y2) / 2})` : undefined}
            >
              {d.text}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
});
