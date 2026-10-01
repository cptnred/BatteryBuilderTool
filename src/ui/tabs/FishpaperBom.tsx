import { useMemo } from 'react';
import type { Layout } from '../../core';
import { buildParts, partsBom } from '../../fishpaper/parts';
import type { ConfigState } from '../../state/config';
import { fmtFixed, fmtNum } from '../format';

export function FishpaperBom({ layout, state }: { layout: Layout; state: ConfigState }) {
  const bom = useMemo(() => partsBom(buildParts(layout, state.fishpaper)), [layout, state.fishpaper]);
  return (
    <section className="card">
      <h2>Fishpaper</h2>
      {bom.rows.length === 0 ? (
        <p className="empty">Keine Teile ausgewählt. Im Tab „Fishpaper“ Teile anhaken.</p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">Teil</th>
              <th scope="col" className="num">
                Anzahl
              </th>
              <th scope="col" className="num">
                Maße (mm)
              </th>
              <th scope="col" className="num">
                Fläche je Stück
              </th>
            </tr>
          </thead>
          <tbody>
            {bom.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td className="num">{r.count}</td>
                <td className="num">
                  {fmtFixed(r.w, 1)} × {fmtFixed(r.h, 1)}
                </td>
                <td className="num">{fmtNum(r.areaCm2, 1)} cm²</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="tbl__sum">
              <th scope="row" colSpan={3}>
                Summe Fishpaper ({fmtNum(layout.config.spacing.paperThickness, 2)} mm)
              </th>
              <td className="num">{fmtNum(bom.totalCm2, 0)} cm²</td>
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  );
}
