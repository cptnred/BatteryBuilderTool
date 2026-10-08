import { LIMITS } from '../../../core';
import type { ConfigState } from '../../../state/config';
import { mainSeries } from '../../../state/config';
import { Check, NumberField } from '../../form/Fields';
import type { RowProps } from '../Row';

export function PacksRow({ state: s, dispatch, onError }: RowProps) {
  const set = (patch: Partial<ConfigState>) => dispatch({ type: 'set', patch });
  const mS = mainSeries(s);
  const sum = s.seriesSplit.reduce((a, b) => a + b, 0);
  return (
    <>
      <NumberField
        id="subPacks"
        label="Teilpacks im Hauptpack"
        integer
        min={LIMITS.subPacks.min}
        max={LIMITS.subPacks.max}
        value={s.subPacks}
        onError={onError}
        onChange={(v) => set({ subPacks: v! })}
        hint={s.subPacks === 2 ? 'vorne + hinten, per Brücke verbunden' : undefined}
      />
      <Check
        label="S je Teilpack manuell"
        checked={s.seriesSplitManual}
        onChange={(v) => set({ seriesSplitManual: v })}
        hint={s.seriesSplitManual ? undefined : `automatisch ${s.seriesSplit.join(' + ')} = ${mS}S`}
      />
      {s.seriesSplitManual && (
        <div className="rowN">
          {s.seriesSplit.map((v, i) => (
            <NumberField
              key={i}
              id={`split.${i}`}
              label={`Pack ${String.fromCharCode(65 + i)}`}
              integer
              min={1}
              value={v}
              onError={onError}
              onChange={(n) => set({ seriesSplit: s.seriesSplit.map((x, j) => (j === i ? n! : x)) })}
            />
          ))}
          <div className={'sum' + (sum !== mS ? ' sum--bad' : '')}>
            Summe {sum} / {mS}S
          </div>
        </div>
      )}
    </>
  );
}
