import type { Face, Side } from '../../core';
import { LIMITS } from '../../core';
import type { ConfigState } from '../../state/config';
import { PRESETS, boosterInfo, customCell, mainSeries, matchingPreset } from '../../state/config';
import { fmtNum } from '../format';
import { CellSelect, Check, Choice, NumberField, Section } from '../form/Fields';
import type { Dispatch } from '../useAppState';

interface Props {
  state: ConfigState;
  dispatch: Dispatch;
  onError: (id: string, msg: string | null) => void;
  onReset: () => void;
}

const faceOpts: { value: Face; label: string }[] = [
  { value: 'V', label: 'vorne' },
  { value: 'H', label: 'hinten' },
];
const sideOpts: { value: Side; label: string }[] = [
  { value: 'L', label: 'links' },
  { value: 'R', label: 'rechts' },
];

export function ConfigPanel({ state: s, dispatch, onError, onReset }: Props) {
  const set = (patch: Partial<ConfigState>) => dispatch({ type: 'set', patch });
  const custom = s.cellType === 'custom';
  const booster = boosterInfo(s);
  // Maß/Kapazität überschreiben -> eigene Zelle (Datenblattwerte entfallen)
  const setCustom = (patch: Partial<ConfigState['cell']>) =>
    set({ cell: customCell({ ...s.cell, ...patch }), cellType: 'custom' });
  const fp = s.fishpaper;
  const setFp = (patch: Partial<ConfigState['fishpaper']>) => dispatch({ type: 'fishpaper', patch });
  const preset = matchingPreset(s);
  const mS = mainSeries(s);
  const D = s.cell.diameter;
  const pitchMode = s.spacingInput === 'pitch';
  // Abstandhalter: Eingabe als Spalt (Mantel-zu-Mantel) oder Mittenabstand
  const toShown = (gap: number | null) => (gap === null ? null : pitchMode ? +(gap + D).toFixed(4) : gap);
  const fromShown = (v: number | null) => (v === null ? null : pitchMode ? +(v - D).toFixed(4) : v);
  const gapValidate = (v: number) =>
    pitchMode && v < D ? `Mittenabstand muss ≥ Zelldurchmesser (${fmtNum(D, 2)} mm) sein.` : null;
  const layersOf = (series: number, perRow: number) => (series * s.parallel) / perRow;

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

      <Section title="Zelle" aside={s.cell.label}>
        <CellSelect value={s.cellType} onChange={(v) => dispatch({ type: 'cellType', cellType: v })} />
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
      </Section>

      <Section title="Pack" aside={`${s.series}S${s.parallel}P`}>
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
            <div className={'sum' + (s.seriesSplit.reduce((a, b) => a + b, 0) !== mS ? ' sum--bad' : '')}>
              Summe {s.seriesSplit.reduce((a, b) => a + b, 0)} / {mS}S
            </div>
          </div>
        )}
        <NumberField
          id="cellsPerRow"
          label="Zellen je Lage"
          integer
          min={LIMITS.cellsPerRow.min}
          max={LIMITS.cellsPerRow.max}
          value={s.cellsPerRow}
          onError={onError}
          onChange={(v) => set({ cellsPerRow: v! })}
          hint={(() => {
            const l = layersOf(s.seriesSplit[0] ?? 0, s.cellsPerRow);
            return Number.isInteger(l)
              ? `→ ${l} ${l === 1 ? 'Lage' : 'Lagen'} je Teilpack`
              : `${fmtNum(l, 2)} Lagen – geht nicht auf`;
          })()}
        />
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
      </Section>

      <Section title="Anordnung" aside={s.stacking === 'honeycomb' ? 'Wabe' : 'Raster'}>
        <Choice
          label="Stapelung"
          value={s.stacking}
          options={[
            { value: 'honeycomb', label: 'Wabe (versetzt)' },
            { value: 'grid', label: 'Raster' },
          ]}
          onChange={(v) => set({ stacking: v })}
        />
        {s.stacking === 'honeycomb' && (
          <Choice
            label="Wabenversatz (obere Lage gegenüber unterer)"
            value={s.offsetSide}
            options={[
              { value: 'L', label: 'nach links' },
              { value: 'R', label: 'nach rechts' },
            ]}
            onChange={(v) => set({ offsetSide: v })}
            hint="globale Seite, Draufsicht mit VORNE oben"
          />
        )}
      </Section>

      <Section title="Abstände" aside={s.spacingMode === 'fishpaper' ? `${fmtNum(s.paperThickness, 2)} mm` : 'Abstandhalter'}>
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
      </Section>

      <Section title="Anschlüsse">
        <div className="terminal">
          <span className="pol pol--minus" aria-hidden="true">
            −
          </span>
          <div>
            <Choice
              label="Hauptminus – Stirnseite"
              value={s.mainMinus.end}
              options={faceOpts}
              onChange={(v) => set({ mainMinus: { ...s.mainMinus, end: v } })}
            />
            <Choice
              label="Hauptminus – Seite"
              value={s.mainMinus.side}
              options={sideOpts}
              onChange={(v) => set({ mainMinus: { ...s.mainMinus, side: v } })}
            />
          </div>
        </div>
        <div className="terminal">
          <span className="pol pol--plus" aria-hidden="true">
            +
          </span>
          <div>
            <Choice
              label="Hauptplus – Stirnseite"
              value={s.mainPlus.end}
              options={faceOpts}
              onChange={(v) => set({ mainPlus: { ...s.mainPlus, end: v } })}
            />
            <Choice
              label="Hauptplus – Seite"
              value={s.mainPlus.side}
              options={sideOpts}
              onChange={(v) => set({ mainPlus: { ...s.mainPlus, side: v } })}
            />
          </div>
        </div>
      </Section>

      <Section title="Splitpack" aside={s.boosterEnabled ? `+ ${s.booster.series}S` : 'aus'} open={s.boosterEnabled}>
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
      </Section>

      <Section title="Fishpaper" open={false}>
        <Choice
          label="Umriss Stirnseiten"
          value={fp.outlineFace}
          options={[
            { value: 'straight', label: 'gerade' },
            { value: 'tucked', label: 'eingebogen' },
          ]}
          onChange={(v) => setFp({ outlineFace: v })}
        />
        <Choice
          label="Umriss Umwicklung"
          value={fp.outlineWrap}
          options={[
            { value: 'straight', label: 'gerade' },
            { value: 'tucked', label: 'eingebogen' },
          ]}
          onChange={(v) => setFp({ outlineWrap: v })}
        />
        <div className="row2">
          <NumberField
            id="fp.faceMargin"
            label="Randzugabe Stirnseite"
            unit="mm"
            min={-5}
            max={20}
            value={fp.faceMargin}
            onError={onError}
            onChange={(v) => setFp({ faceMargin: v! })}
            hint="+ größer · − kleiner"
          />
          <NumberField
            id="fp.overlap"
            label="Überlappung Umwicklung"
            unit="mm"
            min={0}
            max={100}
            value={fp.wrapOverlap}
            onError={onError}
            onChange={(v) => setFp({ wrapOverlap: v! })}
          />
        </div>
        <NumberField
          id="fp.fold"
          label="Umschlag Umwicklung je Seite"
          unit="mm"
          min={0}
          max={30}
          value={fp.wrapFold}
          onError={onError}
          onChange={(v) => setFp({ wrapFold: v! })}
          hint={fp.wrapFold > 0 ? 'mit Einschnitten zum Anlegen an die Rundungen' : 'zum Umschlagen auf die Stirnseite'}
        />
        <Choice
          label="Umwicklung"
          value={fp.wrapMode}
          options={[
            { value: 'perPack', label: 'je Teilpack' },
            { value: 'combined', label: 'gemeinsam' },
          ]}
          onChange={(v) => setFp({ wrapMode: v })}
        />
        <Choice
          label="Zwischenlage"
          value={fp.interlayer}
          options={[
            { value: 'single', label: 'einfach' },
            { value: 'double', label: 'doppelt' },
          ]}
          onChange={(v) => setFp({ interlayer: v })}
        />
        <Choice
          label="Aussparung Brücke"
          value={fp.bridgeCutout}
          options={[
            { value: 'none', label: 'keine' },
            { value: 'notch', label: 'Randkerbe' },
            { value: 'slot', label: 'Schlitz' },
          ]}
          onChange={(v) => setFp({ bridgeCutout: v })}
        />
        {fp.bridgeCutout !== 'none' && (
          <div className="row2">
            <NumberField
              id="fp.cutW"
              label="Breite"
              unit="mm"
              min={1}
              max={80}
              value={fp.cutoutWidth}
              onError={onError}
              onChange={(v) => setFp({ cutoutWidth: v! })}
            />
            <NumberField
              id="fp.cutH"
              label="Höhe"
              unit="mm"
              min={0.5}
              max={30}
              value={fp.cutoutHeight}
              onError={onError}
              onChange={(v) => setFp({ cutoutHeight: v! })}
            />
          </div>
        )}
        <Check label="Seitenteile links/rechts" checked={fp.includeSides} onChange={(v) => setFp({ includeSides: v })} />
        <Check label="Ober-/Unterseite" checked={fp.includeTopBottom} onChange={(v) => setFp({ includeTopBottom: v })} />
      </Section>
    </div>
  );
}
