import { useMemo, useState } from 'react';
import type { Issue, Layout } from '../core';
import { packMetrics, solve, stats } from '../core';
import { boosterInfo, datasheetOf, isBoosterRowIssue, isRowPlanIssue, rowInfo, toBatteryConfig } from '../state/config';
import { dischargeSummary } from '../view/metricsText';
import { ConfigPanel } from './config/ConfigPanel';
import { fmtFixed } from './format';
import type { Highlight } from './highlight';
import { HighlightContext } from './highlight';
import { BomTab } from './tabs/BomTab';
import { ExportTab } from './tabs/ExportTab';
import { FishpaperTab } from './tabs/FishpaperTab';
import { WiringTab } from './tabs/WiringTab';
import type { Action } from '../state/config';
import { useAppState, useFieldErrors } from './useAppState';

const TABS = [
  { id: 'wiring', label: 'Verschaltung' },
  { id: 'fishpaper', label: 'Fishpaper' },
  { id: 'bom', label: 'Stücklisten' },
  { id: 'export', label: 'Export' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function App() {
  const [state, rawDispatch] = useAppState();
  const fieldErrors = useFieldErrors();
  const [tab, setTab] = useState<TabId>('wiring');
  const [hl, setHl] = useState<Highlight>(null);
  const [configOpen, setConfigOpen] = useState(false);

  // Presets/Import/Reset ersetzen alle Felder -> alte Feldfehler verwerfen
  const dispatch = (a: Action) => {
    if (a.type === 'preset' || a.type === 'reset' || a.type === 'load') fieldErrors.clear();
    rawDispatch(a);
  };

  const cfg = useMemo(() => toBatteryConfig(state), [state]);
  const layout = useMemo(() => solve(cfg), [cfg]);

  // letzter gültiger Stand für die ausgegraute Anzeige bei Fehlern
  const [lastValid, setLastValid] = useState<Layout | null>(null);
  if (layout.packs.length && layout !== lastValid) setLastValid(layout);
  const shown = layout.packs.length ? layout : lastValid;

  const fieldIssues: Issue[] = Object.values(fieldErrors.errors).map((msg) => ({ level: 'error', msg }));
  // Lagen (Plan 06 §4.3) und Booster (Plan 04 §3): eigene Meldung statt der Kern-Folgefehler zu „Zellen je Lage“
  const rowError = rowInfo(state).error;
  if (rowError) fieldIssues.push({ level: 'error', msg: rowError });
  const boosterError = boosterInfo(state)?.error ?? null;
  if (boosterError) fieldIssues.push({ level: 'error', msg: boosterError });
  const isFollowUp = (msg: string) =>
    (rowError !== null && (isRowPlanIssue(msg) || isBoosterRowIssue(msg))) || (boosterError !== null && isBoosterRowIssue(msg));
  const layoutErrors = layout.issues.filter((i) => i.level === 'error' && !isFollowUp(i.msg));
  const hasErrors = fieldIssues.length > 0 || layoutErrors.length > 0;
  const st = shown ? stats(shown) : null;

  const discharge = shown ? dischargeSummary(packMetrics(shown.config, datasheetOf(state))) : null;
  const summary = st
    ? `${cfg.series}S${cfg.parallel}P · ${cfg.cell.label} · ${st.cells} Zellen · ${fmtFixed(st.nominalV, 1)} V / ${fmtFixed(st.maxV, 1)} V · ${st.energyWh} Wh${discharge ? ` · ${discharge}` : ''}`
    : 'Konfiguration unvollständig';

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    const next = TABS[(i + d + TABS.length) % TABS.length];
    setTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <HighlightContext.Provider value={{ hl, setHl }}>
      <div className="app">
        <header className="topbar">
          <h1>Akku-Konfigurator</h1>
          <p className="summary" data-testid="summary">
            {summary}
          </p>
          <button
            type="button"
            className="config-toggle"
            aria-expanded={configOpen}
            aria-controls="config"
            onClick={() => setConfigOpen((o) => !o)}
          >
            {configOpen ? 'Konfiguration schließen' : 'Konfiguration'}
          </button>
        </header>
        <aside id="config" className={'sidebar' + (configOpen ? ' is-open' : '')} aria-label="Konfiguration">
          <ConfigPanel
            state={state}
            dispatch={dispatch}
            onError={fieldErrors.report}
            errorIds={Object.keys(fieldErrors.errors)}
            onReset={() => dispatch({ type: 'reset' })}
          />
        </aside>
        <main className="main">
          <div className="tabs" role="tablist" aria-label="Ansichten">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                className="tab"
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <section
            id={`panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            className={'panel' + (hasErrors ? ' is-stale' : '')}
          >
            {hasErrors && (
              <div className="stale-banner" role="alert">
                <strong>Konfiguration ungültig.</strong> Angezeigt wird der letzte gültige Stand (ausgegraut).
                <ul>
                  {[...fieldIssues, ...layoutErrors].map((i, k) => (
                    <li key={k}>{i.msg}</li>
                  ))}
                </ul>
              </div>
            )}
            {!shown ? (
              <p className="empty">Noch kein gültiger Stand. Bitte die markierten Felder in der Konfiguration ausfüllen.</p>
            ) : (
              <div className="panel__content">
                {tab === 'wiring' && (
                  <WiringTab
                    layout={shown}
                    issues={layout.packs.length ? layout.issues.filter((i) => i.level !== 'error') : []}
                    align={state.topAlign}
                    onAlign={(a) => dispatch({ type: 'set', patch: { topAlign: a } })}
                  />
                )}
                {tab === 'fishpaper' && <FishpaperTab layout={shown} state={state} dispatch={dispatch} />}
                {tab === 'bom' && <BomTab layout={shown} state={state} />}
                {tab === 'export' && <ExportTab layout={shown} state={state} dispatch={dispatch} blocked={hasErrors} />}
              </div>
            )}
          </section>
        </main>
      </div>
    </HighlightContext.Provider>
  );
}
