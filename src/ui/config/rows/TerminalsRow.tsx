import type { Face, Side } from '../../../core';
import type { ConfigState } from '../../../state/config';
import { Choice } from '../../form/Fields';
import type { RowProps } from '../Row';

const faceOpts: { value: Face; label: string }[] = [
  { value: 'V', label: 'vorne' },
  { value: 'H', label: 'hinten' },
];
const sideOpts: { value: Side; label: string }[] = [
  { value: 'L', label: 'links' },
  { value: 'R', label: 'rechts' },
];

export function TerminalsRow({ state: s, dispatch }: RowProps) {
  const set = (patch: Partial<ConfigState>) => dispatch({ type: 'set', patch });
  return (
    <>
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
    </>
  );
}
