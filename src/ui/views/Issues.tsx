import type { Issue } from '../../core';

const LEVEL = {
  error: { icon: '✖', label: 'Fehler' },
  warning: { icon: '▲', label: 'Warnung' },
  info: { icon: 'ℹ', label: 'Hinweis' },
} as const;

export function Issues({ issues, extra }: { issues: Issue[]; extra?: Issue[] }) {
  const all = [...(extra ?? []), ...issues];
  return (
    <section className="issues" aria-label="Hinweise und Warnungen" aria-live="polite">
      <h3>Hinweise</h3>
      {all.length === 0 ? (
        <p className="issues__ok">
          <span aria-hidden="true">✔</span> Alles passt: Anschlüsse liegen wie gewünscht.
        </p>
      ) : (
        <ul>
          {all.map((i, k) => (
            <li key={k} className={`issue issue--${i.level}`}>
              <span className="issue__icon" aria-hidden="true">
                {LEVEL[i.level].icon}
              </span>
              <span>
                <span className="sr-only">{LEVEL[i.level].label}: </span>
                {i.msg}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
