import { useState } from 'react';
import type { CableEntry } from '../../state/cables';
import { cableKey, defaultCables, loadCables, saveCables } from '../../state/cables';
import type { ConfigState } from '../../state/config';
import { fmtNum } from '../format';

const sumOf = (l: CableEntry[]) => l.reduce((a, e) => a + (e.mm ?? 0), 0);

/** Kabellängen der gerade gewählten Konfiguration: Anzeige als Tabelle, Bearbeiten per Stift, Speichern je Konfiguration. */
export function CablesCard({ state }: { state: ConfigState }) {
  const key = cableKey(state);
  const [saved, setSaved] = useState<CableEntry[]>(() => loadCables(state));
  const [draft, setDraft] = useState<CableEntry[] | null>(null);
  const [loadedKey, setLoadedKey] = useState(key);

  // Konfiguration gewechselt -> deren gespeicherte Längen laden, Bearbeitung verwerfen
  if (loadedKey !== key) {
    setLoadedKey(key);
    setSaved(loadCables(state));
    setDraft(null);
  }

  const editing = draft !== null;
  const update = (i: number, patch: Partial<CableEntry>) =>
    setDraft((l) => l && l.map((e, k) => (k === i ? { ...e, ...patch } : e)));
  const save = () => {
    if (!draft) return;
    const clean = draft.map((e) => ({ ...e, label: e.label.trim() || 'Kabel' }));
    saveCables(state, clean);
    setSaved(clean);
    setDraft(null);
  };

  return (
    <section className="card" data-testid="cables">
      <div className="card__head">
        <h2>Kabellängen – {key}</h2>
        {!editing && (
          <button
            type="button"
            className="btn btn--icon"
            aria-label="Kabellängen bearbeiten"
            title="Bearbeiten"
            onClick={() => setDraft(saved.map((e) => ({ ...e })))}
          >
            <span aria-hidden="true">✎</span> Bearbeiten
          </button>
        )}
      </div>

      {!editing ? (
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">Kabel</th>
              <th scope="col" className="num">
                Länge
              </th>
            </tr>
          </thead>
          <tbody>
            {saved.length === 0 && (
              <tr>
                <td colSpan={2} className="note">
                  Keine Kabel angelegt.
                </td>
              </tr>
            )}
            {saved.map((e, i) => (
              <tr key={i}>
                <th scope="row">{e.label}</th>
                <td className="num">{e.mm === null ? '–' : `${fmtNum(e.mm, 0)} mm`}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="tbl__sum">
              <th scope="row">Summe</th>
              <td className="num">{fmtNum(sumOf(saved), 0)} mm</td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <>
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Kabel</th>
                <th scope="col" className="num">
                  Länge (mm)
                </th>
                <th scope="col">
                  <span className="sr-only">Entfernen</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {draft.map((e, i) => (
                <tr key={i}>
                  <td>
                    <input
                      className="field"
                      type="text"
                      aria-label="Bezeichnung"
                      value={e.label}
                      onChange={(ev) => update(i, { label: ev.target.value })}
                    />
                  </td>
                  <td className="num">
                    <input
                      className="field field--num"
                      type="number"
                      min={0}
                      step={1}
                      inputMode="decimal"
                      aria-label={`Länge ${e.label} in mm`}
                      value={e.mm ?? ''}
                      onChange={(ev) => {
                        const v = ev.target.value === '' ? NaN : Number(ev.target.value);
                        update(i, { mm: Number.isFinite(v) && v >= 0 ? v : null });
                      }}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--danger"
                      aria-label={`${e.label} entfernen`}
                      title="Entfernen"
                      onClick={() => setDraft((l) => l && l.filter((_, k) => k !== i))}
                    >
                      Entfernen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="tbl__sum">
                <th scope="row">Summe</th>
                <td className="num">{fmtNum(sumOf(draft), 0)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
          <p className="actions">
            <button type="button" className="btn btn--primary" onClick={save}>
              Speichern
            </button>
            <button type="button" className="btn" onClick={() => setDraft(null)}>
              Abbrechen
            </button>
            <button type="button" className="btn" onClick={() => setDraft((l) => l && [...l, { label: 'Kabel', mm: null }])}>
              Kabel hinzufügen
            </button>
            <button type="button" className="btn" onClick={() => setDraft(defaultCables(state))}>
              Auf Vorgabe
            </button>
          </p>
        </>
      )}
      <p className="note">Die Längen werden im Browser gespeichert – getrennt je Konfiguration (Zellzahl S/P und Splitpack).</p>
    </section>
  );
}
