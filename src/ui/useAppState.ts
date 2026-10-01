import { useCallback, useEffect, useReducer, useState } from 'react';
import type { Action, ConfigState } from '../state/config';
import { DEFAULT_STATE, reducer } from '../state/config';
import { loadLocal, saveLocal } from '../state/storage';
import { decodeState, encodeState } from '../state/url';

/** Start: URL-Hash > localStorage > Standard (18S2P). */
function init(): ConfigState {
  return decodeState(window.location.hash) ?? loadLocal() ?? DEFAULT_STATE;
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  // Zustand in Hash und localStorage spiegeln
  useEffect(() => {
    const h = encodeState(state);
    const url = window.location.pathname + window.location.search + (h ? '#' + h : '');
    if (window.location.hash.replace(/^#/, '') !== h) window.history.replaceState(null, '', url);
    saveLocal(state);
  }, [state]);

  // Links mit anderem Hash (z. B. im selben Tab eingefügt) übernehmen
  useEffect(() => {
    const onHash = () => {
      const s = decodeState(window.location.hash);
      if (s) dispatch({ type: 'load', state: s });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return [state, dispatch] as const;
}

/** Feldfehler (unparsbare/außerhalb liegende Eingaben), damit die Ansichten ausgegraut werden können. */
export function useFieldErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const report = useCallback((id: string, msg: string | null) => {
    setErrors((prev) => {
      if ((prev[id] ?? null) === msg) return prev;
      const next = { ...prev };
      if (msg) next[id] = msg;
      else delete next[id];
      return next;
    });
  }, []);
  const clear = useCallback(() => setErrors({}), []);
  return { errors, report, clear };
}

export type Dispatch = (a: Action) => void;
