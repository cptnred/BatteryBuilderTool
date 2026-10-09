import { LIMITS } from '../../../core';
import type { ConfigState } from '../../../state/config';
import { boosterInfo, mainSeries } from '../../../state/config';
import { boosterBridgeSwitch, boosterLayersText } from '../../../state/configSummary';
import { LAYER_LIMITS } from '../../../state/derive';
import { Check, Choice, NumberField } from '../../form/Fields';
import type { RowProps } from '../Row';

export function BoosterRow({ state: s, dispatch, onError }: RowProps) {
  const set = (patch: Partial<ConfigState>) => dispatch({ type: 'set', patch });
  const setBooster = (patch: Partial<ConfigState['booster']>) => set({ booster: { ...s.booster, ...patch } });
  const booster = boosterInfo(s);
  const bridge = boosterBridgeSwitch(s);
  const layersText = boosterLayersText(s);
  const mS = mainSeries(s);
  // Haken gesetzt: mit der bisher wirksamen Lagenzahl beginnen, damit sich nichts sprunghaft ändert
  const ownLayers = (on: boolean) => {
    const current = booster?.layers;
    const keep =
      on && current !== undefined && Number.isInteger(current) && current >= LAYER_LIMITS.min && current <= LAYER_LIMITS.max;
    setBooster(keep ? { layersManual: true, layers: current } : { layersManual: on });
  };
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
              onChange={(v) => setBooster({ series: v! })}
            />
          </div>
          <p className="note">
            Hauptpack = {s.series} − {s.booster.series} = {mS}S · gesamt = ({s.seriesSplit.join(' + ')}) + {s.booster.series} ={' '}
            {s.series}S
          </p>
          <div>
            <NumberField
              id="booster.subPacks"
              label="Einzelpacks im Booster"
              integer
              min={LIMITS.subPacks.min}
              max={Math.max(1, Math.min(LIMITS.subPacks.max, s.booster.series))}
              value={s.booster.subPacks}
              onError={onError}
              onChange={(v) => setBooster({ subPacks: v! })}
              hint="hintereinander in einem Gehäuse, Isolierlage dazwischen"
            />
          </div>
          {s.booster.subPacks > 1 && (
            <Choice
              label="Brücke im Booster"
              value={bridge.value}
              disabled={bridge.disabled}
              options={[
                { value: 'inner', label: 'innen' },
                { value: 'outer', label: 'außen' },
              ]}
              onChange={(pos) => dispatch({ type: 'boosterBridge', pos })}
              hint={bridge.hint}
            />
          )}
          <Check label="Lagen im Booster selbst festlegen" checked={s.booster.layersManual} onChange={ownLayers} />
          {s.booster.layersManual && (
            <div>
              <NumberField
                id="booster.layers"
                label="Lagen im Booster"
                integer
                min={LAYER_LIMITS.min}
                max={LAYER_LIMITS.max}
                value={s.booster.layers}
                onError={onError}
                onChange={(v) => setBooster({ layers: v! })}
              />
            </div>
          )}
          {booster?.error ? (
            <p className="field__msg field__msg--error" role="alert" data-testid="booster-error">
              {booster.error}
            </p>
          ) : layersText ? (
            <p className="note" data-testid="booster-rows">
              {layersText}
            </p>
          ) : null}
          <Choice
            label="Booster-Position"
            value={s.booster.position}
            options={[
              { value: 'plus', label: 'am Hauptplus' },
              { value: 'minus', label: 'am Hauptminus' },
            ]}
            onChange={(v) => setBooster({ position: v })}
          />
        </>
      )}
    </>
  );
}
