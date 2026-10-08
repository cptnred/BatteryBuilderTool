import { LIMITS } from '../../../core';
import type { ConfigState } from '../../../state/config';
import { fmtNum } from '../../format';
import { Choice, NumberField } from '../../form/Fields';
import type { RowProps } from '../Row';

export function SpacingRow({ state: s, dispatch, onError }: RowProps) {
  const set = (patch: Partial<ConfigState>) => dispatch({ type: 'set', patch });
  const D = s.cell.diameter;
  const pitchMode = s.spacingInput === 'pitch';
  // Abstandhalter: Eingabe als Spalt (Mantel-zu-Mantel) oder Mittenabstand
  const toShown = (gap: number | null) => (gap === null ? null : pitchMode ? +(gap + D).toFixed(4) : gap);
  const fromShown = (v: number | null) => (v === null ? null : pitchMode ? +(v - D).toFixed(4) : v);
  const gapValidate = (v: number) =>
    pitchMode && v < D ? `Mittenabstand muss ≥ Zelldurchmesser (${fmtNum(D, 2)} mm) sein.` : null;
  return (
    <>
      <Choice
        label="Modus"
        value={s.spacingMode}
        options={[
          { value: 'fishpaper', label: 'nur Fishpaper' },
          { value: 'spacer', label: 'Abstandhalter' },
        ]}
        onChange={(v) => dispatch({ type: 'spacingMode', mode: v })}
      />
      <NumberField
        id="paperThickness"
        label="Fishpaper-Stärke"
        unit="mm"
        min={0.05}
        max={3}
        value={s.paperThickness}
        onError={onError}
        onChange={(v) => set({ paperThickness: v! })}
        hint={s.spacingMode === 'fishpaper' ? 'zugleich Zellspalt (Zelle an Zelle)' : undefined}
      />
      {s.spacingMode === 'spacer' && (
        <>
          <Choice
            label="Eingabe als"
            value={s.spacingInput}
            options={[
              { value: 'gap', label: 'Spalt' },
              { value: 'pitch', label: 'Mittenabstand' },
            ]}
            onChange={(v) => set({ spacingInput: v })}
          />
          <div className="row2">
            <NumberField
              key={`gr-${s.spacingInput}`}
              id="gapRow"
              label={pitchMode ? 'Mitte Reihe' : 'Spalt Reihe'}
              unit="mm"
              required
              min={pitchMode ? undefined : 0}
              max={pitchMode ? D + 20 : 20}
              validate={gapValidate}
              value={toShown(s.gapRow)}
              onError={onError}
              onChange={(v) => set({ gapRow: fromShown(v) })}
            />
            <NumberField
              key={`gl-${s.spacingInput}`}
              id="gapLayer"
              label={pitchMode ? 'Mitte Lage' : 'Spalt Lage'}
              unit="mm"
              required
              min={pitchMode ? undefined : 0}
              max={pitchMode ? D + 20 : 20}
              validate={gapValidate}
              value={toShown(s.gapLayer)}
              onError={onError}
              onChange={(v) => set({ gapLayer: fromShown(v) })}
            />
          </div>
          <NumberField
            id="holderRim"
            label="Halter-Außenrand"
            unit="mm"
            required
            min={0}
            max={20}
            value={s.holderRim}
            onError={onError}
            onChange={(v) => set({ holderRim: v })}
            hint="Überstand des Halters außen, für die Umrisse"
          />
        </>
      )}
      <div className="row2">
        <NumberField
          id="packGap"
          label="Isolierlage zw. Teilpacks"
          unit="mm"
          min={0}
          max={20}
          value={s.packGap}
          onError={onError}
          onChange={(v) => set({ packGap: v! })}
        />
        <NumberField
          id="nickel"
          label="Nickelstärke"
          unit="mm"
          min={LIMITS.nickelThickness.min}
          max={LIMITS.nickelThickness.max}
          value={s.nickelThickness}
          onError={onError}
          onChange={(v) => set({ nickelThickness: v! })}
        />
      </div>
    </>
  );
}
