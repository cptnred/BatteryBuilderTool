import { Choice } from '../../form/Fields';
import type { RowProps } from '../Row';

export function StackingRow({ state: s, dispatch }: RowProps) {
  return (
    <>
      <Choice
        label="Stapelung"
        value={s.stacking}
        options={[
          { value: 'honeycomb', label: 'Wabe (versetzt)' },
          { value: 'grid', label: 'Raster' },
        ]}
        onChange={(v) => dispatch({ type: 'set', patch: { stacking: v } })}
      />
      {s.stacking === 'honeycomb' && (
        <Choice
          label="Wabenversatz (obere Lage gegenüber unterer)"
          value={s.offsetSide}
          options={[
            { value: 'L', label: 'nach links' },
            { value: 'R', label: 'nach rechts' },
          ]}
          onChange={(v) => dispatch({ type: 'set', patch: { offsetSide: v } })}
          hint="globale Seite, Draufsicht mit VORNE oben"
        />
      )}
    </>
  );
}
