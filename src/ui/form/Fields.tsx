import type { ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { CELL_DATASHEETS } from '../../core';
import { fmtNum, parseNum, toInputText } from '../format';

export interface NumberFieldProps {
  /** eindeutige ID für die Fehlerliste */
  id: string;
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  onError?: (id: string, msg: string | null) => void;
  unit?: string;
  min?: number;
  max?: number;
  integer?: boolean;
  required?: boolean;
  hint?: ReactNode;
  /** zusätzliche Fachprüfung (liefert Fehlermeldung) */
  validate?: (v: number) => string | null;
  /** Fehler von außen (z. B. Pflichtfeld leer) */
  externalError?: string | null;
}

function check(p: NumberFieldProps, v: number | null): string | null {
  if (v === null) return p.required ? 'Pflichtfeld – bitte ausfüllen.' : 'Bitte eine Zahl eingeben.';
  if (Number.isNaN(v)) return 'Keine gültige Zahl.';
  if (p.integer && !Number.isInteger(v)) return 'Nur ganze Zahlen.';
  if (p.min !== undefined && v < p.min) return `Mindestens ${fmtNum(p.min, 2)}${p.unit ? ' ' + p.unit : ''}.`;
  if (p.max !== undefined && v > p.max) return `Höchstens ${fmtNum(p.max, 2)}${p.unit ? ' ' + p.unit : ''}.`;
  return p.validate ? p.validate(v) : null;
}

/**
 * Zahlenfeld mit Komma/Punkt. Ungültige Eingaben bleiben im Feld stehen und werden markiert;
 * an den Zustand geht nur ein gültiger Wert.
 */
export function NumberField(p: NumberFieldProps) {
  const uid = useId();
  // Feld verschwindet (z. B. „manuell“ abgewählt, Zeile zurückgesetzt): gemeldeten Fehler zurücknehmen
  const { id, onError } = p;
  useEffect(() => () => onError?.(id, null), [id, onError]);
  const [draft, setDraft] = useState<{ text: string; forValue: number | null } | null>(null);
  // Wert von außen geändert (Preset, Import) -> Entwurf verwerfen
  const text = draft && draft.forValue === p.value ? draft.text : toInputText(p.value);
  const localErr = draft && draft.forValue === p.value ? check(p, parseNum(draft.text)) : null;
  const err = localErr ?? (p.value === null && p.required ? (p.externalError ?? 'Pflichtfeld – bitte ausfüllen.') : null);

  const onChange = (t: string) => {
    const v = parseNum(t);
    const e = check(p, v);
    p.onError?.(p.id, e ? `${p.label}: ${e}` : null);
    if (!e) {
      p.onChange(v);
      setDraft({ text: t, forValue: v });
    } else {
      setDraft({ text: t, forValue: p.value });
    }
  };

  return (
    <div className={'field' + (err ? ' field--error' : '')}>
      <label htmlFor={uid}>
        {p.label}
        {p.required && (
          <span className="req" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      <div className="field__input">
        <input
          id={uid}
          inputMode="decimal"
          autoComplete="off"
          value={text}
          aria-invalid={!!err}
          aria-describedby={err || p.hint ? uid + '-msg' : undefined}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (!localErr) setDraft(null);
          }}
        />
        {p.unit && <span className="unit">{p.unit}</span>}
      </div>
      {(err || p.hint) && (
        <div id={uid + '-msg'} className={err ? 'field__msg field__msg--error' : 'field__msg'} role={err ? 'alert' : undefined}>
          {err ?? p.hint}
        </div>
      )}
    </div>
  );
}

export interface ChoiceProps<T extends string> {
  label: string;
  /** null = keine Option markiert */
  value: T | null;
  options: { value: T; label: string; title?: string }[];
  onChange: (v: T) => void;
  hint?: ReactNode;
  disabled?: boolean;
}

/** Segmentierter Umschalter (Radiogruppe, per Tastatur bedienbar). */
export function Choice<T extends string>(p: ChoiceProps<T>) {
  const name = useId();
  return (
    <fieldset className="field choice" disabled={p.disabled}>
      <legend>{p.label}</legend>
      <div className="seg" role="radiogroup">
        {p.options.map((o) => (
          <label key={o.value} className={'seg__opt' + (o.value === p.value ? ' is-on' : '')} title={o.title}>
            <input type="radio" name={name} value={o.value} checked={o.value === p.value} onChange={() => p.onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {p.hint && <div className="field__msg">{p.hint}</div>}
    </fieldset>
  );
}

export function Check(p: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; hint?: ReactNode }) {
  return (
    <div className="field check">
      <label>
        <input type="checkbox" checked={p.checked} onChange={(e) => p.onChange(e.target.checked)} />
        <span>{p.label}</span>
      </label>
      {p.hint && <div className="field__msg">{p.hint}</div>}
    </div>
  );
}

export function Section(p: {
  title: string;
  children: ReactNode;
  open?: boolean;
  aside?: ReactNode;
  /** kleine Marke neben dem Titel, z. B. „angepasst“ */
  badge?: string | null;
  /** Fehler im Abschnitt: klappt von selbst auf und trägt eine Fehlermarke */
  error?: boolean;
  testId?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  // Vom Fehler aufgeklappt: verschwindet der Fehler wieder (z. B. Zwischenstand beim Tippen), klappt der Abschnitt zu –
  // außer der Nutzer hat ihn inzwischen bedient (Klick oder Fokus darin), dann bleibt er offen
  const openedByError = useRef(false);
  const touched = () => {
    openedByError.current = false;
  };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (p.error && !el.open) {
      el.open = true;
      openedByError.current = true;
    } else if (!p.error && openedByError.current) {
      el.open = false;
      openedByError.current = false;
    }
  }, [p.error]);
  return (
    <details
      ref={ref}
      className={'section' + (p.error ? ' section--error' : '')}
      open={p.open ?? true}
      data-testid={p.testId}
      onClick={touched}
      onFocus={touched}
    >
      <summary>
        <span>{p.title}</span>
        {p.badge && <span className="section__badge">{p.badge}</span>}
        {p.aside && <span className="section__aside">{p.aside}</span>}
      </summary>
      <div className="section__body">{p.children}</div>
    </details>
  );
}

/** Zellauswahl, nach Bauform gruppiert; „eigene Zelle“ am Ende. */
export function CellSelect(p: { value: string; onChange: (v: string) => void }) {
  const uid = useId();
  return (
    <div className="field">
      <label htmlFor={uid}>Zelle</label>
      <div className="field__input">
        <select id={uid} value={p.value} onChange={(e) => p.onChange(e.target.value)} data-testid="cell-select">
          {(['21700', '18650'] as const).map((f) => (
            <optgroup key={f} label={f}>
              {CELL_DATASHEETS.filter((c) => c.format === f).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          ))}
          <option value="custom">eigene Zelle</option>
        </select>
      </div>
    </div>
  );
}
