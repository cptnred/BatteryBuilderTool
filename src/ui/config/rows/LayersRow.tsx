import { LIMITS } from '../../../core';
import type { ConfigState } from '../../../state/config';
import { rowInfo } from '../../../state/config';
import { LAYER_LIMITS } from '../../../state/derive';
import { hasShortLayerRows, layerCountText, layerRowsText } from '../../../state/configSummary';
import { Check, Choice, NumberField } from '../../form/Fields';
import type { RowProps } from '../Row';

export function LayersRow({ state: s, dispatch, onError }: RowProps) {
  const set = (patch: Partial<ConfigState>) => dispatch({ type: 'set', patch });
  const rows = rowInfo(s);
  const rowsText = layerRowsText(s);
  const layerCount = layerCountText(s);
  return (
    <>
      {!s.cellsPerRowManual && !s.cellsPerRowSplitManual && (
        <NumberField
          id="layers"
          label="Lagen"
          integer
          min={LAYER_LIMITS.min}
          max={LAYER_LIMITS.max}
          value={s.layers}
          onError={onError}
          onChange={(v) => set({ layers: v! })}
          hint={rowsText ? `→ ${rowsText}` : undefined}
        />
      )}
      {rows.error && (
        <p className="field__msg field__msg--error" role="alert" data-testid="layers-error">
          {rows.error}
        </p>
      )}
      {hasShortLayerRows(s) && (
        <Choice
          label="Größere Lage"
          value={s.wideLayer}
          options={[
            { value: 'top', label: 'oben' },
            { value: 'bottom', label: 'unten' },
          ]}
          onChange={(v) => set({ wideLayer: v })}
          hint="bei ungerader Zellzahl je Teilpack; die kürzere Lage sitzt in den Mulden"
        />
      )}
      <Check label="Zellen je Lage manuell" checked={s.cellsPerRowManual} onChange={(v) => set({ cellsPerRowManual: v })} />
      {s.cellsPerRowManual && !s.cellsPerRowSplitManual && (
        <NumberField
          id="cellsPerRow"
          label="Zellen je Lage"
          integer
          min={LIMITS.cellsPerRow.min}
          max={LIMITS.cellsPerRow.max}
          value={s.cellsPerRow}
          onError={onError}
          onChange={(v) => set({ cellsPerRow: v! })}
          hint={layerCount ? `→ ${layerCount} ${layerCount === '1' ? 'Lage' : 'Lagen'} je Teilpack` : 'geht nicht auf'}
        />
      )}
      <Check
        label="Zellen je Lage je Teilpack"
        checked={s.cellsPerRowSplitManual}
        onChange={(v) => set({ cellsPerRowSplitManual: v })}
      />
      {s.cellsPerRowSplitManual && (
        <div className="rowN">
          {s.cellsPerRowSplit.map((v, i) => (
            <NumberField
              key={i}
              id={`cprSplit.${i}`}
              label={`Pack ${String.fromCharCode(65 + i)}`}
              integer
              min={1}
              value={v}
              onError={onError}
              onChange={(n) => set({ cellsPerRowSplit: s.cellsPerRowSplit.map((x, j) => (j === i ? n! : x)) })}
            />
          ))}
        </div>
      )}
    </>
  );
}
