# CLAUDE.md – Akku-Konfigurator

Rein clientseitige Web-App (Vite + React + TS strict) zum Konfigurieren, Visualisieren und Fishpaper-Zuschneiden
von Akkupacks aus 21700-/18650-Zellen für VESC-Onewheels. Den vollständigen Auftrag enthält `PROMPT.md`.

## Befehle
- `npm run dev` · `npm run build` · `npm test` (Vitest) · `npm run lint` · `npm run e2e` (Playwright-Screenshots)
- Referenz prüfen: `node --experimental-strip-types reference/selftest.ts`

## Harte Regeln
- Fachregeln stehen in `docs/01_FACHKONZEPT.md`. **[BESTÄTIGT]**-Regeln nie ändern.
- `reference/fixtures/*.json` sind die Soll-Ergebnisse. Fixtures **nie** anpassen, um Tests grün zu bekommen.
  Wenn eine Fixture falsch wirkt, den Nutzer fragen.
- `src/core` bleibt frei von React/DOM und ist vollständig getestet. UI-Komponenten rechnen nicht selbst.
- Koordinaten: x = global links→rechts, z = unten→oben, y = vorne→hinten, alles in mm.
  Die Vorderansicht (Stirnseite V, Blick von außen) wird beim Zeichnen gespiegelt und bekommt immer R/L-Marker.
- Wabenversatz links/rechts ist global gemeint. Alle Teilpacks sind identisch gestapelt.
- PDF-Export ist 1:1 (Vektor, mm) mit Kontrollquadrat 50 mm auf jeder Seite.
- UI-Texte auf Deutsch. Polarität immer mit Symbol (+/−) **und** Farbe.

## Glossar (kurz)
S/P · Teilpack (vorne/hinten) · Brücke · Booster/Splitpack · Lage · Zellen je Lage · Wabe/Raster ·
Stirnseite V/H · Knoten Bk (B0 = Hauptminus, BS = Hauptplus).

## Stil
- Kleine Module, sprechende Namen (Englisch im Code, Deutsch in der UI).
- Jede Geometriefunktion bekommt einen Test mit konkreten Zahlen.
- Nach jedem Meilenstein: Tests, Build und Lint grün; Screenshots ansehen.
