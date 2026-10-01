import { useMemo, useRef, useState } from 'react';
import type { Layout } from '../../core';
import { sheetPrims } from '../../export/render';
import type { Sheet } from '../../export/sheets';
import { CONTROL_SQUARE, MARGIN, planSheets } from '../../export/sheets';
import { buildSvg } from '../../export/svg';
import { buildLaserSvg, LASER_LAYERS, laserPathD, laserPrims } from '../../export/laser';
import { activeParts, buildParts } from '../../fishpaper/parts';
import type { ConfigState } from '../../state/config';
import { fromJsonFile, toJsonFile } from '../../state/storage';
import { Choice } from '../form/Fields';
import { fmtNum } from '../format';
import type { Dispatch } from '../useAppState';
import { PrimsGroup } from '../views/PartSvg';

function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Kurzbeschreibung für Kopfzeile und Dateiname */
export function configTitle(layout: Layout): string {
  const c = layout.config;
  const stack = c.stacking === 'honeycomb' ? `Wabe ${c.offsetSide === 'L' ? 'links' : 'rechts'}` : 'Raster';
  const gap = c.spacing.mode === 'fishpaper' ? `${fmtNum(c.spacing.paperThickness, 2)} mm` : 'Abstandhalter';
  return `${c.series}S${c.parallel}P · ${c.cell.label} · ${stack} · ${gap}`;
}

/** Vorschau der Laser-Seite: Ebenen in ihren Farben (Schnitt schwarz, Markierung blau, Text rot). */
function LaserPreview({ sheet }: { sheet: Sheet }) {
  const pr = useMemo(() => laserPrims(sheet), [sheet]);
  return (
    <figure className="sheet sheet--laser" data-testid="laser-preview">
      <svg viewBox={`0 0 ${sheet.w} ${sheet.h}`} role="img" aria-label="Laser-Seite">
        <rect className="sheet__paper" x={0} y={0} width={sheet.w} height={sheet.h} />
        <g fill="none" stroke={LASER_LAYERS.mark.color} strokeWidth={0.25}>
          {pr.mark.map((p, i) => (
            <path key={i} d={laserPathD(p)} />
          ))}
        </g>
        <g fill="none" stroke={LASER_LAYERS.cut.color} strokeWidth={0.3}>
          {pr.cut.map((p, i) => (
            <path key={i} d={laserPathD(p)} />
          ))}
        </g>
        <g fill={LASER_LAYERS.text.color} fontFamily="Helvetica, Arial, sans-serif">
          {pr.texts.map((t, i) => (
            <text
              key={i}
              x={t.x}
              y={t.y}
              fontSize={t.size}
              textAnchor={t.anchor}
              transform={t.angle ? `rotate(${-t.angle} ${t.x} ${t.y})` : undefined}
            >
              {t.text}
            </text>
          ))}
        </g>
      </svg>
      <figcaption>
        Laser · {fmtNum(sheet.w, 1)} × {fmtNum(sheet.h, 1)} mm · Schnitt schwarz, Markierung blau, Text rot
      </figcaption>
    </figure>
  );
}

function SheetPreview({ sheet, index, total }: { sheet: Sheet; index: number; total: number }) {
  const pr = useMemo(() => sheetPrims(sheet), [sheet]);
  return (
    <figure className="sheet">
      <svg viewBox={`0 0 ${sheet.w} ${sheet.h}`} role="img" aria-label={`Seite ${index + 1} von ${total}`}>
        <rect className="sheet__paper" x={0} y={0} width={sheet.w} height={sheet.h} />
        <PrimsGroup pr={pr} />
        <rect
          className="sheet__ctrl"
          x={MARGIN}
          y={sheet.h - MARGIN - CONTROL_SQUARE}
          width={CONTROL_SQUARE}
          height={CONTROL_SQUARE}
        />
      </svg>
      <figcaption>
        Seite {index + 1}/{total}
        {sheet.kind === 'tile' ? ' · Kachel' : ''}
      </figcaption>
    </figure>
  );
}

export function ExportTab({
  layout,
  state,
  dispatch,
  blocked,
}: {
  layout: Layout;
  state: ConfigState;
  dispatch: Dispatch;
  blocked: boolean;
}) {
  const parts = useMemo(() => buildParts(layout, state.fishpaper), [layout, state.fishpaper]);
  const plan = useMemo(() => planSheets(parts, state.export.pageFormat, state.export.oversize), [parts, state.export]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const none = activeParts(parts).length === 0;
  const title = configTitle(layout);
  const cfg = layout.config;
  const today = new Date();

  const laser = state.export.pageFormat === 'laser';

  const exportPdf = async () => {
    setBusy(true);
    try {
      const { buildLaserPdf, buildPdf, pdfFileName } = await import('../../export/pdf');
      const meta = { title, date: today.toLocaleDateString('de-DE') };
      const doc = laser ? buildLaserPdf(plan.sheets[0], meta) : buildPdf(plan, meta);
      doc.save(pdfFileName(cfg.series, cfg.parallel, cfg.cell.label, today, laser));
      setMsg({ kind: 'ok', text: laser ? 'Laser-PDF erstellt (eine Seite).' : `PDF mit ${plan.sheets.length} Seiten erstellt.` });
    } catch (e) {
      setMsg({ kind: 'error', text: `PDF konnte nicht erstellt werden: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  const exportSvg = () => {
    const d = today.toISOString().slice(0, 10);
    const cell = cfg.cell.label.replace(/[^\w-]+/g, '');
    download(
      `fishpaper${laser ? '_laser' : ''}_${cfg.series}S${cfg.parallel}P_${cell}_${d}.svg`,
      laser ? buildLaserSvg(parts, `Fishpaper Laser ${title}`) : buildSvg(parts, `Fishpaper ${title}`),
      'image/svg+xml',
    );
    setMsg({ kind: 'ok', text: laser ? 'Laser-SVG gespeichert.' : 'SVG gespeichert.' });
  };

  const importJson = async (f: File) => {
    try {
      dispatch({ type: 'load', state: fromJsonFile(await f.text()) });
      setMsg({ kind: 'ok', text: `Konfiguration aus „${f.name}“ geladen.` });
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message });
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMsg({ kind: 'ok', text: 'Link kopiert. Er enthält die komplette Konfiguration.' });
    } catch {
      setMsg({ kind: 'error', text: 'Kopieren nicht möglich – bitte die Adresse aus der Adresszeile kopieren.' });
    }
  };

  return (
    <div className="export">
      <section className="card">
        <h2>Fishpaper-Schnittvorlage</h2>
        {blocked ? (
          <p className="blocked" role="alert">
            Export gesperrt: Die Konfiguration enthält Fehler (siehe oben). Bei „Abstandhalter“ müssen Spalt Reihe, Spalt Lage und
            Halter-Außenrand eingetragen sein.
          </p>
        ) : null}
        <div className="export__opts">
          <Choice
            label="Seitenformat"
            value={state.export.pageFormat}
            options={[
              { value: 'a4', label: 'A4' },
              { value: 'a3', label: 'A3' },
              { value: 'letter', label: 'Letter' },
              { value: 'plotter', label: 'Plotter (Seite je Teil)' },
              { value: 'laser', label: 'Laser: alle Teile auf einer Seite' },
            ]}
            onChange={(v) => dispatch({ type: 'export', patch: { pageFormat: v } })}
          />
          {state.export.pageFormat !== 'plotter' && !laser && (
            <Choice
              label="Übergroße Teile"
              value={state.export.oversize}
              options={[
                { value: 'tile', label: 'kacheln' },
                { value: 'split', label: 'Streifen teilen' },
              ]}
              onChange={(v) => dispatch({ type: 'export', patch: { oversize: v } })}
              hint="Kacheln: 15 mm Überlappung mit Passmarken ◆. Teilen: Umwicklung in Stücke mit 15 mm Überlappung."
            />
          )}
        </div>
        {laser ? (
          <p className="note">
            Laser: eine Seite in Gesamtgröße mit allen Teilen (Anzahl berücksichtigt), nichts gekachelt oder geteilt. Ebenen nach
            LightBurn-Farben: 00 Schnitt #000000, 01 Markierung #0000FF, 02 Text #FF0000 (echter Text). Ohne Falzlinien,
            Biegemarken, Kontrollquadrat und Kopfzeile. Maßstab 1:1 in mm.
          </p>
        ) : (
          <p className="note">
            {plan.sheets.length} {plan.sheets.length === 1 ? 'Seite' : 'Seiten'}
            {plan.orientation !== 'custom'
              ? ` · ${plan.orientation === 'landscape' ? 'Querformat' : 'Hochformat'} (automatisch)`
              : ''}{' '}
            · Maßstab 1:1, Vektor. Jede Seite hat ein Kontrollquadrat 50 × 50 mm – in Originalgröße (100 %) drucken und
            nachmessen.
          </p>
        )}
        {plan.notes.length > 0 && (
          <ul className="notes">
            {plan.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
        <div className="actions">
          <button type="button" className="btn btn--primary" disabled={blocked || none || busy} onClick={exportPdf}>
            {busy ? 'PDF wird erstellt …' : laser ? 'Laser-PDF herunterladen' : 'PDF herunterladen'}
          </button>
          <button type="button" className="btn" disabled={blocked || none} onClick={exportSvg}>
            {laser ? 'Laser-SVG herunterladen' : 'SVG für Schneideplotter'}
          </button>
        </div>
        {none && <p className="empty">Keine Fishpaper-Teile ausgewählt. Im Tab „Fishpaper“ mindestens ein Teil anhaken.</p>}
        {!none && (
          <div className="sheets" aria-label="Seitenvorschau">
            {laser
              ? plan.sheets.map((s, i) => <LaserPreview key={i} sheet={s} />)
              : plan.sheets.map((s, i) => <SheetPreview key={i} sheet={s} index={i} total={plan.sheets.length} />)}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Konfiguration teilen und sichern</h2>
        <div className="actions">
          <button type="button" className="btn" onClick={copyLink}>
            Link kopieren
          </button>
          <button
            type="button"
            className="btn"
            onClick={() =>
              download(`akku-konfiguration_${cfg.series}S${cfg.parallel}P.json`, toJsonFile(state), 'application/json')
            }
          >
            JSON exportieren
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            JSON importieren
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importJson(f);
              e.target.value = '';
            }}
          />
        </div>
        <p className="note">Die Konfiguration steckt auch im Link (URL-Hash) und wird im Browser gemerkt.</p>
      </section>
      {msg && (
        <p className={`toast toast--${msg.kind}`} role="status">
          {msg.text}
        </p>
      )}
    </div>
  );
}
