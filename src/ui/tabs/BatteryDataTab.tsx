import type { Layout } from '../../core';
import type { ConfigState } from '../../state/config';
import { datasheetOf } from '../../state/config';
import { CellSpecsCard } from './CellSpecsCard';
import { PackKpis } from './PackKpis';

export function BatteryDataTab({ layout, state }: { layout: Layout; state: ConfigState }) {
  return (
    <div className="bom">
      <section className="card">
        <h2>Kennzahlen</h2>
        <PackKpis layout={layout} state={state} />
      </section>
      <CellSpecsCard ds={datasheetOf(state)} cell={state.cell} />
    </div>
  );
}
