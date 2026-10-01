import type { CellDatasheet, CellSpec, DsCurrent, DsSource } from '../../core';
import { fmtNum } from '../format';

export const datasheetUrl = (file: string, page?: number) =>
  `./datasheets/${encodeURIComponent(file)}${page ? `#page=${page}` : ''}`;

const srcText = (s: DsSource) => `S. ${s.page}${s.section ? `, ${s.section}` : ''}`;

const current = (c: DsCurrent) => `${fmtNum(c.value, 2)} A${c.condition ? ` (${c.condition})` : ''}`;

function Row({ label, children, src }: { label: string; children: React.ReactNode; src?: DsSource }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>
        {children}
        {src && <span className="src">Fundstelle: {srcText(src)}</span>}
      </dd>
    </>
  );
}

/** Karte „Zellspecs“: alle Datenblattwerte mit Fundstelle und Link auf das Original-PDF. */
export function CellSpecsCard({ ds, cell }: { ds: CellDatasheet | null; cell: CellSpec }) {
  if (!ds)
    return (
      <section className="card" data-testid="cell-specs">
        <h2>Zellspecs – eigene Zelle</h2>
        <dl className="specs">
          <Row label="Durchmesser">{fmtNum(cell.diameter, 2)} mm</Row>
          <Row label="Länge">{fmtNum(cell.length, 2)} mm</Row>
          <Row label="Kapazität">{fmtNum(cell.capacityAh, 3)} Ah</Row>
          <Row label="Nennspannung">{fmtNum(cell.nominalV, 2)} V</Row>
        </dl>
        <p className="note">Eigene Zelle ohne Datenblatt: Ströme, Innenwiderstand und nutzbare Energie entfallen.</p>
      </section>
    );
  const c = ds.capacity;
  return (
    <section className="card" data-testid="cell-specs">
      <h2>Zellspecs – {ds.label}</h2>
      <dl className="specs">
        <Row label="Kapazität" src={c.source}>
          {c.typicalMah !== null ? (
            <>
              {fmtNum(c.typicalMah, 0)} mAh typ. · min. {fmtNum(c.minMah, 0)} mAh
            </>
          ) : (
            <>
              min. {fmtNum(c.minMah, 0)} mAh <span className="flag">nur Mindestwert angegeben</span>
            </>
          )}
          {c.note && <span className="src">{c.note}</span>}
        </Row>
        <Row label="Nennspannung">{fmtNum(ds.nominalV, 2)} V</Row>
        <Row label="Ladeschluss">{fmtNum(ds.maxV, 2)} V</Row>
        <Row label="Max. Ladestrom" src={ds.charge.source}>
          {current(ds.charge.max)}
          {ds.charge.standardA !== undefined && ` · Standard ${fmtNum(ds.charge.standardA, 3)} A`}
        </Row>
        <Row label="Max. Dauerentladung" src={ds.discharge.source}>
          {ds.discharge.values.map(current).join(' · ')}
        </Row>
        <Row label="Durchmesser" src={ds.diameter.source}>
          {ds.diameter.spec} → Geometrie {fmtNum(ds.diameter.max, 2)} mm
        </Row>
        <Row label="Höhe" src={ds.height.source}>
          {ds.height.spec} → Geometrie {fmtNum(ds.height.max, 2)} mm
        </Row>
        <Row label="Innenwiderstand" src={ds.resistance.source}>
          {fmtNum(ds.resistance.value, 2)} mΩ {ds.resistance.qualifier ?? ''} ({ds.resistance.kind})
        </Row>
        {ds.extras.map((e) => (
          <Row key={e.label} label={e.label}>
            {e.value}
          </Row>
        ))}
        <Row label="Entladekurve" src={ds.curves?.source}>
          {ds.curves ? `${ds.curves.source.figure} – abgelesen, ca. ±3 %` : 'nicht im Datenblatt'}
        </Row>
      </dl>
      <p>
        <a className="btn-link" href={datasheetUrl(ds.file)} target="_blank" rel="noopener noreferrer">
          Original-PDF öffnen
        </a>{' '}
        <span className="note">{ds.file}</span>
      </p>
    </section>
  );
}
