import { LIMITS } from '../../core';
import type { ConfigState } from '../../state/config';
import { PRESETS, matchingPreset } from '../../state/config';
import { bridgeSwitch } from '../../state/configSummary';
import { CellSelect, Choice, NumberField } from '../form/Fields';
import type { Dispatch } from '../useAppState';
import { Row } from './Row';
import { BoosterRow } from './rows/BoosterRow';
import { CellRow } from './rows/CellRow';
import { FishpaperRow } from './rows/FishpaperRow';
import { LayersRow } from './rows/LayersRow';
import { PacksRow } from './rows/PacksRow';
import { SpacingRow } from './rows/SpacingRow';
import { StackingRow } from './rows/StackingRow';
import { TerminalsRow } from './rows/TerminalsRow';

interface Props {
  state: ConfigState;
  dispatch: Dispatch;
  onError: (id: string, msg: string | null) => void;
  onReset: () => void;
  /** IDs der Felder mit Eingabefehler (für die Fehlermarke der Zeilen) */
  errorIds: readonly string[];
}

/** Grundwerte oben, darunter die Liste „Aufbau“ mit aufklappbaren Zeilen (Plan 06 §5.1). */
export function ConfigPanel({ state: s, dispatch, onError, onReset, errorIds }: Props) {
  const set = (patch: Partial<ConfigState>) => dispatch({ type: 'set', patch });
  const preset = matchingPreset(s);
  const bridge = bridgeSwitch(s);
  const fields = { state: s, dispatch, onError };
  const row = { state: s, dispatch, errorIds };

  return (
    <div className="config">
      <div className="presets" role="group" aria-label="Schnellwahl">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={'chip' + (preset === p.id ? ' is-on' : '')}
            aria-pressed={preset === p.id}
            onClick={() => dispatch({ type: 'preset', id: p.id })}
          >
            {p.label}
          </button>
        ))}
        <button type="button" className="chip chip--ghost" onClick={onReset}>
          Zurücksetzen
        </button>
      </div>

      <div className="basics">
        <CellSelect value={s.cellType} onChange={(v) => dispatch({ type: 'cellType', cellType: v })} />
        <div className="row2">
          <NumberField
            id="series"
            label="S gesamt"
            integer
            min={LIMITS.series.min}
            max={LIMITS.series.max}
            value={s.series}
            onError={onError}
            onChange={(v) => set({ series: v! })}
          />
          <NumberField
            id="parallel"
            label="P"
            integer
            min={LIMITS.parallel.min}
            max={LIMITS.parallel.max}
            value={s.parallel}
            onError={onError}
            onChange={(v) => set({ parallel: v! })}
          />
        </div>
        <Choice
          label="Brücke"
          value={bridge.value}
          disabled={bridge.disabled}
          options={[
            { value: 'inner', label: 'innen' },
            { value: 'outer', label: 'außen' },
          ]}
          onChange={(pos) => dispatch({ type: 'bridge', pos })}
          hint={bridge.hint}
        />
      </div>

      <h2 className="aufbau">Aufbau</h2>
      <Row id="packs" {...row}>
        <PacksRow {...fields} />
      </Row>
      <Row id="layers" {...row}>
        <LayersRow {...fields} />
      </Row>
      <Row id="stacking" {...row}>
        <StackingRow {...fields} />
      </Row>
      <Row id="terminals" {...row}>
        <TerminalsRow {...fields} />
      </Row>
      <Row id="spacing" {...row}>
        <SpacingRow {...fields} />
      </Row>
      <Row id="cell" {...row}>
        <CellRow {...fields} />
      </Row>
      <Row id="booster" {...row}>
        <BoosterRow {...fields} />
      </Row>
      <Row id="fishpaper" {...row}>
        <FishpaperRow {...fields} />
      </Row>
    </div>
  );
}
