import type { Layout } from '../../core';
import { packMetrics, stats } from '../../core';
import type { ConfigState } from '../../state/config';
import { datasheetOf } from '../../state/config';
import { fmtFixed, fmtNum } from '../format';

function Kpi({ label, children, sub }: { label: string; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {children}
        {sub && <small>{sub}</small>}
      </dd>
    </div>
  );
}

/** Kennzahlen des Gesamtpacks inkl. Booster (Plan §2). */
export function PackKpis({ layout, state }: { layout: Layout; state: ConfigState }) {
  const st = stats(layout);
  const ds = datasheetOf(state);
  const m = packMetrics(layout.config, ds);
  const none = 'keine Angabe (eigene Zelle)';
  return (
    <>
      <dl className="kpis" data-testid="pack-kpis">
        <Kpi label="Zellen">{st.cells}</Kpi>
        <Kpi label="Spannung nominal">{fmtFixed(st.nominalV, 1)} V</Kpi>
        <Kpi label="Spannung voll">{fmtFixed(st.maxV, 1)} V</Kpi>
        <Kpi
          label={m.capacityMinOnly ? 'Kapazität (min.)' : 'Kapazität (typ.)'}
          sub={
            m.capacityMinOnly
              ? 'nur Mindestwert angegeben'
              : m.capacityMinAh !== null
                ? `min. ${fmtNum(m.capacityMinAh, 2)} Ah`
                : undefined
          }
        >
          {fmtNum(m.capacityAh, 2)} Ah
        </Kpi>
        <Kpi label="Energie">{st.energyWh} Wh</Kpi>
        {m.discharge ? (
          m.discharge.map((d, i) => (
            <Kpi key={i} label="Max. Dauerentladung" sub={d.condition}>
              {fmtNum(d.value, 1)} A
            </Kpi>
          ))
        ) : (
          <Kpi label="Max. Dauerentladung" sub={none}>
            –
          </Kpi>
        )}
        {m.discharge ? (
          m.discharge.map((d, i) => (
            <Kpi key={i} label="Max. Entladeleistung" sub={d.condition}>
              {fmtFixed(d.powerKw, 1)} kW
            </Kpi>
          ))
        ) : (
          <Kpi label="Max. Entladeleistung" sub={none}>
            –
          </Kpi>
        )}
        <Kpi label="Max. Ladestrom" sub={m.charge ? m.charge.condition : none}>
          {m.charge ? `${fmtNum(m.charge.value, 1)} A` : '–'}
        </Kpi>
        <Kpi
          label="Innenwiderstand Pack"
          sub={
            m.resistance
              ? `nur Zellen, ohne Verbinder · ${m.resistance.qualifier ? m.resistance.qualifier + ' ' : ''}${m.resistance.kind}`
              : none
          }
        >
          {m.resistance ? `${fmtNum(m.resistance.value, 1)} mΩ` : '–'}
        </Kpi>
      </dl>
      <h3>Nutzbare Energie 4,2 V → 3,0 V</h3>
      {m.usable === null ? (
        <p className="note">Keine Angabe (eigene Zelle).</p>
      ) : m.usable.length === 0 ? (
        <p className="note">Entladekurve nicht im Datenblatt.</p>
      ) : (
        <>
          <table className="tbl" data-testid="usable-energy">
            <thead>
              <tr>
                <th scope="col" className="num">
                  Zellstrom
                </th>
                <th scope="col" className="num">
                  Pack-Strom
                </th>
                <th scope="col" className="num">
                  Kapazität
                </th>
                <th scope="col" className="num">
                  Energie
                </th>
              </tr>
            </thead>
            <tbody>
              {m.usable.map((u) => (
                <tr key={u.cellCurrentA}>
                  <td className="num">{fmtNum(u.cellCurrentA, 1)} A</td>
                  <td className="num">{fmtNum(u.packCurrentA, 1)} A</td>
                  <td className="num">{fmtNum(u.capacityAh, 2)} Ah</td>
                  <td className="num">{fmtNum(u.energyWh, 0)} Wh</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="note">
            Aus den Entladekurven des Datenblatts abgelesen (ca. ±3 %), Zelltemperatur und Bedingungen laut Datenblatt;
            hochgerechnet mit {m.series}S × {m.parallel}P.
          </p>
        </>
      )}
    </>
  );
}
