import type { ConfigState } from '../../../state/config';
import { boosterInfo, mainSeries } from '../../../state/config';
import { Check, Choice, NumberField } from '../../form/Fields';
import type { RowProps } from '../Row';

export function BoosterRow({ state: s, dispatch, onError }: RowProps) {
  const set = (patch: Partial<ConfigState>) => dispatch({ type: 'set', patch });
  const booster = boosterInfo(s);
  const mS = mainSeries(s);
  return (
    <>
      <Check label="Booster (eigenes Gehäuse)" checked={s.boosterEnabled} onChange={(v) => set({ boosterEnabled: v })} />
      {s.boosterEnabled && (
        <>
          <div>
            <NumberField
              id="booster.series"
              label="Booster S"
              integer
              min={1}
              max={Math.max(1, s.series - 1)}
              value={s.booster.series}
              onError={onError}
              onChange={(v) => set({ booster: { ...s.booster, series: v! } })}
            />
          </div>
          <p className="note">
            Hauptpack = {s.series} − {s.booster.series} = {mS}S · gesamt = ({s.seriesSplit.join(' + ')}) + {s.booster.series} ={' '}
            {s.series}S
          </p>
          {booster &&
            (booster.error ? (
              <p className="field__msg field__msg--error" role="alert" data-testid="booster-error">
                {booster.error}
              </p>
            ) : booster.cellsPerRow !== null ? (
              <p className="note" data-testid="booster-rows">
                Booster: {booster.layers} {booster.layers === 1 ? 'Lage' : 'Lagen'} wie {booster.packLabel} →{' '}
                {booster.cellsPerRow} Zellen je Lage
              </p>
            ) : null)}
          <Choice
            label="Booster-Position"
            value={s.booster.position}
            options={[
              { value: 'plus', label: 'am Hauptplus' },
              { value: 'minus', label: 'am Hauptminus' },
            ]}
            onChange={(v) => set({ booster: { ...s.booster, position: v } })}
          />
        </>
      )}
    </>
  );
}
