import type { ConfigState } from '../../../state/config';
import { customCell } from '../../../state/config';
import { NumberField } from '../../form/Fields';
import type { RowProps } from '../Row';

export function CellRow({ state: s, dispatch, onError }: RowProps) {
  const custom = s.cellType === 'custom';
  // Maß/Kapazität überschreiben -> eigene Zelle (Datenblattwerte entfallen)
  const setCustom = (patch: Partial<ConfigState['cell']>) =>
    dispatch({ type: 'set', patch: { cell: customCell({ ...s.cell, ...patch }), cellType: 'custom' } });
  return (
    <>
      <div className="row2">
        <NumberField
          id="cell.diameter"
          label="Durchmesser"
          unit="mm"
          min={5}
          max={60}
          value={s.cell.diameter}
          onError={onError}
          onChange={(v) => setCustom({ diameter: v! })}
          hint={custom ? 'mit Schrumpfschlauch nachmessen' : 'Maximalwert lt. Datenblatt'}
        />
        <NumberField
          id="cell.length"
          label="Länge"
          unit="mm"
          min={10}
          max={200}
          value={s.cell.length}
          onError={onError}
          onChange={(v) => setCustom({ length: v! })}
        />
      </div>
      <NumberField
        id="cell.capacity"
        label="Kapazität"
        unit="Ah"
        min={0.1}
        max={20}
        value={s.cell.capacityAh}
        onError={onError}
        onChange={(v) => setCustom({ capacityAh: v! })}
        hint={
          custom
            ? 'eigene Zelle: nur Maße, Kapazität und U nenn'
            : 'Ändern von Maß oder Kapazität schaltet auf „eigene Zelle“ (Datenblattwerte entfallen)'
        }
      />
    </>
  );
}
