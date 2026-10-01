import type { Layout } from '../../core';
import { balanceTaps, dimensions, nickelBom, nickelTotals, stripPosition } from '../../core';
import type { ConfigState } from '../../state/config';
import { datasheetOf } from '../../state/config';
import { fmtFixed, fmtNum } from '../format';
import { highlightedNodes, useHighlight } from '../highlight';
import { CellSpecsCard } from './CellSpecsCard';
import { FishpaperBom } from './FishpaperBom';
import { PackKpis } from './PackKpis';

const KIND = { start: 'Anfang', series: 'Serie', end: 'Ende' } as const;
const FACE = { V: 'vorne', H: 'hinten' } as const;

export function BomTab({ layout, state }: { layout: Layout; state: ConfigState }) {
  const { hl, setHl } = useHighlight();
  const hn = highlightedNodes(hl);
  const dim = dimensions(layout);
  const cfg = layout.config;
  const packBy = new Map(layout.packs.map((p) => [p.key, p]));
  const taps = balanceTaps(layout);
  const mm = (v: number) => fmtFixed(v, 1);

  return (
    <div className="bom">
      <section className="card">
        <h2>Kennzahlen</h2>
        <PackKpis layout={layout} state={state} />
        <h3>Maße (B × H × L, mm)</h3>
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">Teil</th>
              <th scope="col" className="num">
                Breite
              </th>
              <th scope="col" className="num">
                Höhe
              </th>
              <th scope="col" className="num">
                Länge
              </th>
            </tr>
          </thead>
          <tbody>
            {dim.packs.map((p) => (
              <tr key={p.key}>
                <th scope="row">{p.label}</th>
                <td className="num">{mm(p.width)}</td>
                <td className="num">{mm(p.height)}</td>
                <td className="num">{mm(p.length)}</td>
              </tr>
            ))}
            <tr className="tbl__sum">
              <th scope="row">
                Hauptpack gesamt
                {layout.packs.filter((p) => p.role === 'main').length > 1
                  ? ` (inkl. ${fmtNum(cfg.packGap, 2)} mm Zwischenlage)`
                  : ''}
              </th>
              <td className="num">{mm(dim.main.width)}</td>
              <td className="num">{mm(dim.main.height)}</td>
              <td className="num">{mm(dim.main.length)}</td>
            </tr>
          </tbody>
        </table>
        <p className="note">Blanke Zellen inkl. Nickel, ohne Fishpaper-Umwicklung und Schrumpfschlauch.</p>
      </section>

      <CellSpecsCard ds={datasheetOf(state)} cell={state.cell} />

      <section className="card">
        <h2>Balancer-Abgriffe B0…B{layout.totalS}</h2>
        <div className="tbl-wrap">
          <table className="tbl tbl--taps">
            <thead>
              <tr>
                <th scope="col">Knoten</th>
                <th scope="col">Teilpack</th>
                <th scope="col">Stirnseite</th>
                <th scope="col">Streifen</th>
                <th scope="col">Lage im Pack</th>
              </tr>
            </thead>
            <tbody>
              {taps.map((t) =>
                t.spots.map((s, i) => {
                  const p = packBy.get(s.pack)!;
                  return (
                    <tr
                      key={`${t.node}-${i}`}
                      className={(hn.has(t.node) ? 'is-hl' : '') + (i === 0 ? ' first' : '')}
                      tabIndex={0}
                      onPointerEnter={() => setHl({ kind: 'node', n: t.node })}
                      onPointerLeave={() => setHl(null)}
                      onFocus={() => setHl({ kind: 'node', n: t.node })}
                      onBlur={() => setHl(null)}
                    >
                      {i === 0 ? (
                        <th scope="row" rowSpan={t.spots.length}>
                          {t.label}
                        </th>
                      ) : null}
                      <td>{p.label}</td>
                      <td>{FACE[s.face]}</td>
                      <td>
                        {KIND[s.kind]} · {s.cells.length} Zellen
                      </td>
                      <td>{stripPosition(p, s.cells)}</td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
        <p className="note">Brückenknoten erscheinen an beiden Teilpacks, haben aber nur eine Nummer.</p>
      </section>

      <section className="card">
        <h2>Nickelstreifen</h2>
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">Teilpack</th>
              <th scope="col">Stirnseite</th>
              <th scope="col">Streifen</th>
              <th scope="col" className="num">
                Anzahl
              </th>
            </tr>
          </thead>
          <tbody>
            {nickelBom(layout).map((r, i) => (
              <tr key={i}>
                <td>{r.packLabel}</td>
                <td>{FACE[r.face]}</td>
                <td>{r.cells}-Zellen-Streifen</td>
                <td className="num">{r.count}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {nickelTotals(layout).map((r) => (
              <tr key={r.cells} className="tbl__sum">
                <th scope="row" colSpan={3}>
                  Summe {r.cells}-Zellen-Streifen
                </th>
                <td className="num">{r.count}</td>
              </tr>
            ))}
          </tfoot>
        </table>
        <p className="note">
          Nickelstärke {fmtNum(cfg.nickelThickness, 2)} mm. Brücken und Kabel zum Booster sind nicht enthalten.
        </p>
      </section>

      <FishpaperBom layout={layout} state={state} />
    </div>
  );
}
