import type { ReactNode } from 'react';
import { useState } from 'react';
import type { ConfigState } from '../../state/config';
import type { RowId } from '../../state/configSummary';
import {
  ROW_TITLES,
  resetRowPatch,
  rowBadge,
  rowHasError,
  rowModified,
  rowValue,
  terminalTexts,
} from '../../state/configSummary';
import { Section } from '../form/Fields';
import type { Dispatch } from '../useAppState';

/** Props der Feld-Komponenten einer Zeile */
export interface RowProps {
  state: ConfigState;
  dispatch: Dispatch;
  onError: (id: string, msg: string | null) => void;
}

interface Props {
  id: RowId;
  state: ConfigState;
  dispatch: Dispatch;
  /** IDs der Felder mit Eingabefehler */
  errorIds: readonly string[];
  children: ReactNode;
}

/** Kurzwert der Zeile „Anschlüsse“: Polarität mit Symbol und Farbe (gleicher Text wie rowValue) */
function TerminalsValue({ state }: { state: ConfigState }) {
  const t = terminalTexts(state);
  return (
    <>
      <span className="pol-text pol-text--minus">−</span> {t.minus} · <span className="pol-text pol-text--plus">+</span> {t.plus}
    </>
  );
}

/** Eine Zeile der Liste „Aufbau“: Kurzwert, Marke, Fehlermarke und „Zurück auf Standard“ (Plan 06 §5.3–5.5). */
export function Row({ id, state, dispatch, errorIds, children }: Props) {
  // Zurücksetzen baut die Felder neu auf: ungültige Entwürfe und ihre Fehlermeldungen verschwinden mit
  const [generation, setGeneration] = useState(0);
  const reset = () => {
    dispatch({ type: 'set', patch: resetRowPatch(state, id) });
    setGeneration((g) => g + 1);
  };
  return (
    <Section
      title={ROW_TITLES[id]}
      aside={id === 'terminals' ? <TerminalsValue state={state} /> : rowValue(state, id)}
      badge={rowBadge(state, id)}
      error={rowHasError(state, id, errorIds)}
      open={false}
      testId={`row-${id}`}
    >
      <div className="row__fields" key={generation}>
        {children}
      </div>
      {rowModified(state, id) && (
        <button type="button" className="linkbtn" onClick={reset}>
          Zurück auf Standard
        </button>
      )}
    </Section>
  );
}
