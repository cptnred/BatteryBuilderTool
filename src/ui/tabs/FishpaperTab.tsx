import { useMemo, useState } from 'react';
import type { Layout } from '../../core';
import { buildParts } from '../../fishpaper/parts';
import type { ConfigState } from '../../state/config';
import { fmtFixed, fmtNum } from '../format';
import type { Dispatch } from '../useAppState';
import { PartSvg } from '../views/PartSvg';

const CARD_MM = 85.6;
const CAL_KEY = 'akku-konfigurator:pxPerMm';
const DEFAULT_PX_PER_MM = 96 / 25.4;

function loadCal(): number {
  try {
    const v = Number(localStorage.getItem(CAL_KEY));
    return v > 1 && v < 20 ? v : DEFAULT_PX_PER_MM;
  } catch {
    return DEFAULT_PX_PER_MM;
  }
}

function saveCal(v: number) {
  try {
    localStorage.setItem(CAL_KEY, String(v));
  } catch {
    /* ohne Speicher geht es auch */
  }
}

export function FishpaperTab({ layout, state, dispatch }: { layout: Layout; state: ConfigState; dispatch: Dispatch }) {
  const parts = useMemo(() => buildParts(layout, state.fishpaper), [layout, state.fishpaper]);
  const maxW = Math.max(1, ...parts.filter((p) => p.enabled && p.count > 0).map((p) => p.w));
  const [oneToOne, setOneToOne] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pxPerMm, setPxPerMm] = useState(loadCal);
  const [calOpen, setCalOpen] = useState(false);

  const setCal = (v: number) => {
    setPxPerMm(v);
    saveCal(v);
  };

  return (
    <div className="fp">
      <section className="card fp__list" aria-label="Teile auswählen">
        <h2>Teile</h2>
        <table className="tbl tbl--parts">
          <thead>
            <tr>
              <th scope="col">Teil</th>
              <th scope="col" className="num">
                Anzahl
              </th>
              <th scope="col" className="num">
                mm
              </th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id} className={p.enabled && p.count > 0 ? '' : 'is-off'}>
                <td>
                  <label className="check-inline">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={(e) => dispatch({ type: 'part', id: p.id, enabled: e.target.checked, count: p.count })}
                    />
                    <span>{p.name}</span>
                  </label>
                </td>
                <td className="num">
                  <input
                    className="count"
                    type="number"
                    min={0}
                    max={20}
                    value={p.count}
                    aria-label={`Anzahl ${p.name}`}
                    onChange={(e) => {
                      const n = Math.max(0, Math.min(20, Math.round(Number(e.target.value) || 0)));
                      dispatch({ type: 'part', id: p.id, enabled: p.enabled, count: n });
                    }}
                  />
                </td>
                <td className="num nowrap">
                  {fmtFixed(p.w, 1)} × {fmtFixed(p.h, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="note">
          Umriss Stirnseiten: {state.fishpaper.outlineFace === 'straight' ? 'gerade' : 'eingebogen'} · Umwicklung:{' '}
          {state.fishpaper.outlineWrap === 'straight' ? 'gerade' : 'eingebogen'}. Einstellungen in der Konfiguration unter
          „Fishpaper“.
        </p>
      </section>

      <section className="fp__preview" aria-label="Vorschau in mm">
        <div className="toolbar">
          <label className="check-inline">
            <input type="checkbox" checked={oneToOne} onChange={(e) => setOneToOne(e.target.checked)} />
            <span>1:1 am Bildschirm</span>
          </label>
          {!oneToOne && (
            <label className="range">
              <span>Zoom</span>
              <input type="range" min={0.3} max={1} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
            </label>
          )}
          <button type="button" className="chip chip--small" aria-expanded={calOpen} onClick={() => setCalOpen((o) => !o)}>
            Bildschirm kalibrieren
          </button>
        </div>
        {calOpen && (
          <div className="calib">
            <p>
              Eine Kreditkarte (85,6 mm breit) an den Bildschirm halten und den Regler verschieben, bis der Rahmen genau so breit
              ist wie die Karte.
            </p>
            <div className="calib__card" style={{ width: CARD_MM * pxPerMm, height: 53.98 * pxPerMm }}>
              85,6 mm
            </div>
            <label className="range">
              <span>Maßstab</span>
              <input type="range" min={2} max={8} step={0.005} value={pxPerMm} onChange={(e) => setCal(Number(e.target.value))} />
              <span className="nowrap">{fmtNum(pxPerMm, 3)} px/mm</span>
            </label>
            <button type="button" className="chip chip--small" onClick={() => setCal(DEFAULT_PX_PER_MM)}>
              Standard (96 dpi)
            </button>
          </div>
        )}
        <div className={'fp__parts mat' + (oneToOne ? ' is-1to1' : '')}>
          {parts
            .filter((p) => p.enabled && p.count > 0)
            .map((p) => (
              <figure key={p.id} className="fp__part">
                <figcaption>
                  {p.name}
                  {p.count > 1 ? ` × ${p.count}` : ''} · {fmtFixed(p.w, 1)} × {fmtFixed(p.h, 1)} mm
                </figcaption>
                <PartSvg part={p} pxPerMm={oneToOne ? pxPerMm : null} zoom={(zoom * p.w) / maxW} />
              </figure>
            ))}
          {!parts.some((p) => p.enabled && p.count > 0) && (
            <p className="empty">Keine Teile ausgewählt – links mindestens ein Teil anhaken.</p>
          )}
        </div>
        <ul className="fp__legend">
          <li>
            <span className="ln ln--cut" /> Schnitt
          </li>
          <li>
            <span className="ln ln--fold" /> Falz / Biegung
          </li>
          <li>
            <span className="ln ln--zone" /> Biegebereich
          </li>
          <li>
            <span className="ln ln--mark" /> Markierung (Anschluss, Brücke, Passmarke)
          </li>
        </ul>
      </section>
    </div>
  );
}
