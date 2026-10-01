# Auftrag an Claude Code: Web-Tool „Akku-Konfigurator“ (VESC / Onewheel)

## Ziel

Baue eine **Web-App (rein clientseitig, ohne Backend)**, mit der man Akkupacks aus **21700- oder 18650-Zellen**
konfiguriert, visualisiert und dazu **maßstabsgetreue Fishpaper-Schnittvorlagen als PDF** exportiert.
Die Nutzer bauen Akkus für VESC-Onewheels und ähnliche PEVs. Typisch sind 18S2P, 20S2P, 32S1P und Splitpacks wie 18S2P + 2S2P.
Standardkonfiguration beim Start: **18S2P mit 21700-Zellen**.

Die Fachlogik ist bereits mit dem Nutzer ausgearbeitet und **bestätigt**. In diesem Ordner liegen dazu Spezifikation,
Referenz-Code, Soll-Ergebnisse und bestätigte Skizzen. Deine Aufgabe: daraus eine saubere, getestete, gut bedienbare App bauen.

## 1. Lies zuerst alles (in dieser Reihenfolge)

1. `CLAUDE.md` – Projektregeln
2. `docs/01_FACHKONZEPT.md` – Begriffe, Koordinaten, Verschaltungsregeln, Solver für Plus/Minus, Splitpack
3. `docs/02_FISHPAPER_EXPORT.md` – Fishpaper-Teile, Umrisse, PDF 1:1
4. `docs/03_UI_UND_AKZEPTANZ.md` – Eingaben mit Standardwerten, Ansichten, Definition of Done
5. `reference/pack-core.ts` – **lauffähige Referenz** der gesamten Fachlogik (ohne Abhängigkeiten)
6. `reference/selftest.ts` und `reference/fixtures/*.json` – bestätigte Regeln als Checks und Soll-Ergebnisse
7. `reference/debug-svg.ts` – Referenz für die Darstellungskonventionen (Spiegelung der Vorderansicht, Beschriftungen)
8. `reference/bestaetigte-skizzen/*.png` – vom Nutzer freigegebene Skizzen (18S2P, 32S1P, 20S2P, 20S2P Splitpack). **Sieh sie dir an.**
9. `reference/debug/*.png` – Ausgabe der Referenz für weitere Fälle (Raster, Abstandhalter, 18650, 1 Teilpack, Fehlerfälle)

Prüfe die Referenz vorab selbst:
```bash
node --experimental-strip-types reference/selftest.ts   # muss "Alle bestätigten Regeln erfüllt." ausgeben
node --experimental-strip-types reference/demo.ts       # erzeugt fixtures + debug-SVGs neu
```

Erstelle danach eine **Todo-Liste mit den Meilensteinen unten** und arbeite sie der Reihe nach ab.

## 2. Nicht verhandelbar

- Die mit **[BESTÄTIGT]** markierten Regeln in `docs/01_FACHKONZEPT.md` bleiben exakt so. Das betrifft vor allem:
  - Minus vorne rechts / Plus hinten rechts als Standard.
  - 2 Teilpacks, die über eine Brücke verbunden sind.
  - Verbindungen **immer schräg**, beginnend unten.
  - 2P = untere Zelle + schräg darüber liegende obere Zelle.
  - **Alle Teilpacks identisch gestapelt**, sodass die Schrägen in allen Packs gleich laufen.
  - Stirnseiten werden **von außen** betrachtet; die Vorderseite ist gespiegelt und bekommt R/L-Marker.
- Die Tests gegen `reference/fixtures/*.json` müssen grün sein. Wenn du glaubst, eine Fixture sei falsch: **nicht anpassen, sondern mir Bescheid geben** und begründen.
- Die Fachlogik bleibt **rein** (`src/core`, keine React- oder DOM-Imports) und vollständig unit-getestet.
- Das PDF ist **1:1 maßhaltig** (Vektor, mm). Auf jeder Seite stehen ein Kontrollquadrat und der Hinweis „100 % drucken“.
- UI auf **Deutsch**.

## 3. Tech-Stack (vorgegeben)

- **Vite + React + TypeScript (strict)**, reines CSS mit CSS-Variablen (hell/dunkel), keine schwere UI-Bibliothek.
- Zeichnungen als **SVG-React-Komponenten**, alle Koordinaten in mm mit `viewBox`.
- PDF: **jsPDF** (`unit: 'mm'`) oder `pdf-lib`. Nimm die aktuelle stabile Version und prüfe die API per Doku, nicht aus dem Gedächtnis.
- Tests: **Vitest**. Screenshots/E2E: **Playwright** (Chromium ist im Container meist vorinstalliert; bei Bedarf `executablePath` nutzen).
- ESLint + Prettier. Deploy-fähig als statische Seite (`npm run build` → `dist/`), relative Pfade (`base: './'`).

Vorgeschlagene Struktur:
```
src/core/        types.ts · geometry.ts · wiring.ts · solver.ts · validate.ts · outline.ts · stats.ts · index.ts
src/fishpaper/   parts.ts (Teile aus Layout) · nesting.ts (Regal-Packing) · tiling.ts (Kacheln)
src/export/      pdf.ts · svg.ts · (dxf.ts – Stufe 2)
src/state/       config.ts (Defaults, Presets, Reducer) · url.ts (Hash) · storage.ts
src/ui/          App.tsx · ConfigPanel/ · views/TopView · views/FaceView · views/Legend · tabs/ · fishpaper/Preview
tests/           confirmed.test.ts · fixtures.test.ts · outline.test.ts · pdf.test.ts · tiling.test.ts · e2e/
```

## 4. Meilensteine (jeweils erst prüfen, dann weiter)

**M1 – Gerüst & Kern**
- Projekt aufsetzen (Vite React TS, Vitest, ESLint, Prettier). Skripte: `dev`, `build`, `test`, `lint`, `e2e`.
- `reference/pack-core.ts` nach `src/core/` übernehmen: in Module aufteilen, Typen schärfen, Verhalten unverändert.
- `reference/selftest.ts` → `tests/confirmed.test.ts`. Dazu Fixture-Tests für alle JSON-Dateien.
- ✅ Prüfen: `npm test` grün.

**M2 – Konfiguration & Zustand**
- Alle Eingaben aus `docs/03` §2 mit Standardwerten und Validierung am Feld.
- Presets 18S2P / 32S1P / 20S2P / 20S2P-Split. Zustand im URL-Hash und in localStorage; JSON Import/Export.
- Pflichtfelder bei „Abstandhalter“; Umschalter Spalt ↔ Mittenabstand.
- ✅ Prüfen: Reducer- und URL-Roundtrip-Tests.

**M3 – Visualisierung**
- Draufsicht, Stirnseitenansichten (V gespiegelt, R/L-Marker), Booster-Ansicht, Legende, Hinweis-Panel.
- Hover-Hervorhebung von Gruppe und Knoten, übergreifend über alle Ansichten und Tabellen.
- ✅ Prüfen: Playwright-Screenshots der 4 Presets nach `docs/screenshots/`. **Sieh sie dir selbst an** und vergleiche sie inhaltlich
  mit `reference/bestaetigte-skizzen/`: Polarität je Zelle, Gruppennummern, Bk-Labels, Lage von Hauptminus/-plus und Brücke.
  Weicht etwas ab, zuerst korrigieren.

**M4 – Stücklisten**
- Balancer-Tabelle, Nickelstreifen-Stückliste, Kennzahlen, Maße.

**M5 – Fishpaper**
- Teile-Generator (rein, getestet) nach `docs/02` §2, mit den Umrissen „gerade“ und „eingebogen“,
  Randzugabe, Umwicklung mit Biege-/Falzmarken, Umschlag-Einschnitten, Brückenkerbe, Spiegelung der Vorderabdeckung.
- Vorschau-Tab in echten mm, mit 1:1-Bildschirmkalibrierung (Kreditkarte 85,6 mm) und Fishpaper-Stückliste.
- ✅ Prüfen: Umfänge = Fixtures ±0,1 mm; Spiegeltest.

**M6 – Export**
- PDF 1:1 (A4/A3/Letter/Plotter), Regal-Packing, Kachelung übergroßer Teile mit Überlappung und Passmarken
  oder alternativ Aufteilen der Streifen; Kontrollquadrat und Lineal auf jeder Seite; Kopfzeile.
- SVG-Export in mm, Schnitt- und Falzlinien in getrennten Gruppen.
- ✅ Prüfen: PDF-Maßstabstest, Kacheltest. Das erzeugte PDF zusätzlich rendern (z. B. `pdftoppm`, falls vorhanden,
  oder pdf.js in Playwright) und das Ergebnis ansehen.

**M7 – Feinschliff**
- Mobil-Layout (375 px), Tastaturbedienung, Farben nicht als einziges Unterscheidungsmerkmal, leere und Fehlerzustände.
- README mit Bedienung, Annahmen und Deploy-Hinweis (GitHub Pages / Netlify).
- Stufe 2 (nur wenn alles andere fertig ist): DXF-Export, druckbarer Bauplan.

## 5. Arbeitsweise

- Kleine, nachvollziehbare Schritte. Nach jedem Meilenstein Tests, Build und Lint laufen lassen.
- Geometrie immer in mm und im globalen Koordinatensystem (x links→rechts, z unten→oben).
  Spiegeln passiert **nur beim Zeichnen** der Vorderansicht.
- Keine erfundenen Zelldaten. Die Presets sind generisch und editierbar, mit dem Hinweis „nachmessen“.
- Bei **echten Unklarheiten** in der Fachlogik fragst du nach, statt zu raten. Bei reinen UI-Details entscheidest du selbst
  und notierst die Entscheidung im README unter „Annahmen“.

## 6. Abschluss

Melde am Ende kurz:
- was umgesetzt ist, mit Verweis auf die Akzeptanzkriterien in `docs/03` §6,
- welche Annahmen du getroffen hast,
- was offen ist (Stufe 2),
- wie man die App startet und baut.
