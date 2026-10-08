import type { ConfigState } from '../../../state/config';
import { Check, Choice, NumberField } from '../../form/Fields';
import type { RowProps } from '../Row';

export function FishpaperRow({ state: s, dispatch, onError }: RowProps) {
  const fp = s.fishpaper;
  const setFp = (patch: Partial<ConfigState['fishpaper']>) => dispatch({ type: 'fishpaper', patch });
  return (
    <>
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
    </>
  );
}
