import type { Layout } from '../../core';
import { dimensions, nickelBom, nickelTotals } from '../../core';
import type { ConfigState } from '../../state/config';
import { fmtFixed, fmtNum } from '../format';
import { CablesCard } from './CablesCard';
import { FishpaperBom } from './FishpaperBom';

const FACE = { V: 'vorne', H: 'hinten' } as const;

export function BomTab({ layout, state }: { layout: Layout; state: ConfigState }) {
  const dim = dimensions(layout);
  const cfg = layout.config;
  const mm = (v: number) => fmtFixed(v, 1);
  const boosterCount = layout.packs.filter((p) => p.role === 'booster').length;

  return (
    <div className="bom">
      <section className="card">
        <h2>Maße (B × H × L, mm)</h2>
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
            {dim.booster && boosterCount > 1 && (
              <tr className="tbl__sum">
                <th scope="row">Booster gesamt (inkl. {fmtNum(cfg.packGap, 2)} mm Zwischenlage)</th>
                <td className="num">{mm(dim.booster.width)}</td>
                <td className="num">{mm(dim.booster.height)}</td>
                <td className="num">{mm(dim.booster.length)}</td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="note">Blanke Zellen inkl. Nickel, ohne Fishpaper-Umwicklung und Schrumpfschlauch.</p>
      </section>

      <CablesCard state={state} />

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
