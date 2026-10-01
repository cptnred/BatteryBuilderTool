# Auftrag an Claude Code: Erweiterung Akku-Konfigurator (Runde 2)

Die App aus `PROMPT.md` ist fertig (M1–M7). Jetzt kommt eine Erweiterung: Zelldatenbank aus Datenblättern,
Pack-Kennzahlen, Booster-Lagenzahl, Kleberaufbau im eingebogenen Umriss und ein Laser-Export.

## Lies zuerst

1. `CLAUDE.md` – Projektregeln (gelten weiter, v. a. Fixtures nie anpassen, `src/core` rein).
2. **`docs/04_PLAN_ERWEITERUNG.md` – der vollständige Plan.** Alle Entscheidungen darin hat der Nutzer ausdrücklich getroffen.
3. `README.md` (Aufbau, Annahmen), danach den Code in `src/` und `tests/`.
4. `datasheets/*.pdf` – Quelle der Zellwerte. Text mit `pdftotext -raw` lesen (`-layout` verschiebt Tabellen).

Prüfe den Ausgangszustand, bevor du etwas änderst:
```bash
npm test && npm run build && npm run lint
```

## Regeln für diese Runde

- **Triff keine eigenen Annahmen.** Was im Plan nicht entschieden ist, fragst du beim Nutzer nach (AskUserQuestion),
  bevor du es umsetzt. Das gilt ausdrücklich für die offenen Punkte in §7 des Plans.
- `reference/fixtures/*.json` bleiben unverändert und grün. `src/core` bleibt im Verhalten unverändert;
  Neues kommt in neue Module oder in `src/state`, `src/fishpaper`, `src/export`, `src/view`, `src/ui`.
- Tests, die sich durch die Entscheidungen ändern (Kleber-Umfang, App-Standardzelle P50B), stellst du auf die neuen,
  konkret berechneten Werte um. Das ist freigegeben.
- EVE 50PL: 125 A Dauerentladung ist korrekt und bestätigt.
- Die abgelesenen Entladekurven-Werte (§6) legst du dem Nutzer zur Kontrolle vor, **bevor** du sie einbaust.
- UI-Texte auf Deutsch, Code auf Englisch. Jede Geometriefunktion bekommt einen Test mit konkreten Zahlen.

## Vorgehen

Erstelle eine Todo-Liste aus §8 des Plans und arbeite sie der Reihe nach ab. Nach jedem Schritt:
`npm test`, `npm run build`, `npm run lint`. Am Ende `npm run e2e`, die Screenshots in `docs/screenshots/` selbst ansehen
und den Laser-Export (PDF über pdf.js rendern, SVG öffnen) sichtprüfen.

## Abschluss

Melde kurz: was umgesetzt ist (mit Bezug auf die Abschnitte des Plans), welche Rückfragen du gestellt hast und wie sie
beantwortet wurden, was offen ist.
