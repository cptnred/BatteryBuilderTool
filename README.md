# Akku-Konfigurator

Web-App zum Konfigurieren von Akkupacks aus 21700- oder 18650-Zellen für VESC-Onewheels und ähnliche PEVs.
Sie zeigt die Verschaltung (Draufsicht, Stirnseiten, Balancer-Abgriffe) und erzeugt maßstabsgetreue
Fishpaper-Schnittvorlagen als PDF (1:1, Vektor) und SVG. Die App läuft rein im Browser, ohne Backend.

Standard beim Start: **18S2P, Molicel INR-21700-P50B, 2 Teilpacks à 9 Zellen je Lage, Wabe nach links, Minus vorne rechts, Plus hinten rechts.**

## Starten und bauen

Voraussetzung: Node ≥ 22.

```bash
npm install
npm run dev        # Entwicklungsserver, http://localhost:5173
npm run build      # statische Seite nach dist/ (relative Pfade)
npm run preview    # gebaute Seite lokal ansehen
npm test           # Vitest: Fachlogik, Fixtures, Fishpaper, PDF, Zustand
npm run lint       # ESLint + Prettier-Prüfung
npm run e2e        # Playwright: Screenshots nach docs/screenshots/, PDF-Render-Prüfung
node --experimental-strip-types reference/selftest.ts   # Referenz prüfen
```

Für `npm run e2e` einmalig `npx playwright install chromium` ausführen oder eine vorhandene Chromium-Installation
über die Umgebungsvariable `CHROMIUM_PATH` angeben.

## Bedienung

1. **Schnellwahl** oben in der Konfiguration: 18S2P, 20S2P, 20S2P Splitpack (18S2P + 2S2P), 30S1P, 32S1P oder „Zurücksetzen“.
2. **Konfiguration** links (mobil über den Knopf „Konfiguration“ oben). Oben stehen die Grundwerte: Zelle (9 Zellen aus
   Datenblättern, nach Bauform 21700/18650 gruppiert, oder „eigene Zelle“), S, P und **Brücke innen/außen**.
   Darunter die Liste **Aufbau** mit allem, was die App daraus ableitet: Teilpacks, Lagen, Stapelung, Anschlüsse,
   Abstände, Zellmaße, Splitpack, Zuschnitt. Jede Zeile zeigt ihren aktuellen Wert und klappt ihre Felder auf.
   Geänderte Zeilen tragen die Marke „angepasst“ und lassen sich einzeln zurücksetzen; Zeilen mit Fehler klappen
   von selbst auf. Jede Änderung wird sofort neu berechnet. Eingaben mit Komma oder Punkt.
   Ungültige Felder werden rot markiert; die Ansichten zeigen dann den letzten gültigen Stand, ausgegraut, mit der Fehlermeldung.
3. **Verschaltung**: Draufsicht (VORNE oben), alle Stirnseiten immer von außen betrachtet (Vorderseite gespiegelt,
   mit R/L-Markern), Polarität als **+/−** und Farbe, Gruppennummern, Nickelstreifen und Bk-Labels.
   Zeigen oder Tippen auf eine Zelle hebt die Gruppe in allen Ansichten hervor, auf ein Bk-Label den Knoten.
4. **Fishpaper**: alle Teile in echten mm, Auswahl und Anzahl je Teil. Mit „1:1 am Bildschirm“ und
   „Bildschirm kalibrieren“ (Kreditkarte 85,6 mm) lassen sich die Teile in Originalgröße am Bildschirm prüfen.
5. **Stücklisten**: Kennzahlen des Gesamtpacks inkl. Booster (Kapazität, Energie, max. Dauerentladung und -leistung in kW,
   max. Ladestrom, Innenwiderstand, nutzbare Energie 4,2 V → 3,0 V je Kurvenstrom), Karte **Zellspecs** mit allen
   Datenblattwerten, Fundstelle und „Original-PDF öffnen“, Maße, Balancer-Tabelle B0…BS, Nickelstreifen und Fishpaper (cm²).
6. **Export**: PDF (A4, A3, Letter oder Plotter mit einer Seite je Teil), SVG für Schneideplotter,
   **Laser: alle Teile auf einer Seite** (PDF und SVG, siehe unten),
   Link kopieren, JSON exportieren/importieren. Übergroße Teile werden gekachelt (15 mm Überlappung, Passmarken ◆)
   oder wahlweise in Stücke geteilt.

**Laser-Export:** eine Seite in Gesamtgröße (Breite wie beim SVG: mindestens 300 mm bzw. größtes Teil), alle aktiven Teile
mit Anzahl, nichts gekachelt. Ebenen nach LightBurn-Farben: 00 Schnitt `#000000` (Konturen, Schlitze, Kerben,
Umschlag-Einschnitte), 01 Markierung `#0000FF` (Anschluss-Kreuze, Überlappungsgrenze, Wickelpfeil), 02 Text `#FF0000`
(echter Text, Helvetica/Arial). Jede Kontur ist ein geschlossener Pfad mit echten Bögen (SVG `A`, PDF Bézier ≤ 90°).
Keine Falzlinien, Biegemarken, Kontrollquadrat, Lineal oder Kopfzeile – das Laser-PDF ist bewusst die Ausnahme von der
Kontrollquadrat-Regel (Nutzerentscheidung). Maßstab 1:1 in mm.

**Drucken:** Das PDF immer in Originalgröße (100 %) drucken, nicht „An Seite anpassen“. Auf jeder Seite das
Kontrollquadrat (50 × 50 mm) nachmessen.

Die Konfiguration steckt im URL-Hash (`#c2=…`, nur Abweichungen vom Standard) und wird zusätzlich im Browser gemerkt.
Links sind dadurch teilbar. Ältere Links (`#c=…`) und JSON-Dateien werden übernommen und zeigen denselben Akku.

## Deploy

`npm run build` erzeugt `dist/` mit relativen Pfaden (`base: './'`). Der Ordner läuft auf jedem statischen Hoster:

- **GitHub Pages**: `dist/` auf den Branch `gh-pages` veröffentlichen (z. B. mit `npx gh-pages -d dist`)
  oder per GitHub Action (`actions/upload-pages-artifact` mit `path: dist`).
- **Netlify**: Build-Befehl `npm run build`, Publish-Verzeichnis `dist`.

Es wird kein Server-Routing gebraucht; der Zustand steckt im Hash.

## Aufbau

```
src/core/        Fachlogik (rein, getestet): Geometrie, Verschaltung, Solver, Prüfung, Umrisse, Kennzahlen
src/view/        Zeichenmodelle der Ansichten in mm (rein): Stirnseiten, Draufsicht, Anschlüsse, Annahmen-Text
src/fishpaper/   Teile-Generator, 2D-Geometrie, Regal-Packing, Kachelung (rein)
src/export/      Seitenplan, Zeichenprimitive, PDF (jsPDF), SVG
src/state/       Zustand, Presets, Reducer, Ableitungen (Brücke, Lagen), Anzeigetexte des Panels, URL-Hash, localStorage, JSON
src/ui/          React-Komponenten (rechnen nicht selbst)
tests/           Vitest; tests/e2e/ Playwright
reference/       Referenz-Implementierung, Fixtures (Soll-Ergebnisse), bestätigte Skizzen
```

`src/core` ist eine 1:1-Übernahme von `reference/pack-core.ts`, in Module aufgeteilt. Ein Test
(`tests/reference-equivalence.test.ts`) vergleicht Packs, Brücken, Kette, Kosten und Umfänge für über 500 Konfigurationen
direkt mit der Referenz. Alle Fixtures in `reference/fixtures/` werden unverändert geprüft.

Einzige Erweiterung gegenüber der Referenz: die unvollständige Lage (`docs/06_PLAN_BRUECKE_UND_BEDIENUNG.md` §3).
Die Referenz kennt sie nicht; die Fixture `30S1P_21700` stammt deshalb aus `src/core` und ist vom Nutzer bestätigt.

## Annahmen

Fachliche Regeln stammen unverändert aus `docs/01_FACHKONZEPT.md`. Die folgenden Punkte hat die Umsetzung selbst entschieden:

**Fachlogik (nur Ergänzungen, keine Änderung bestätigter Regeln)**
- Zusätzliche Eingabeprüfungen (z. B. Teilpack mit 0 Gruppen, Booster-S ≥ S gesamt, leere Pflichtfelder bei Abstandhalter,
  Durchmesser 0). Sie stehen hinter den Meldungen der Referenz und greifen nur bei Eingaben, mit denen die Referenz
  abstürzen würde.
- Die Nachbarschaftsprüfung aus Fachkonzept §4.6 (Gruppe zusammenhängend, Folgegruppen benachbart) war in der Referenz
  nicht umgesetzt; sie ist ergänzt und erzeugt bei Verstoß eine Warnung. In keiner Fixture schlägt sie an.
- Zahlen außerhalb der Wertebereiche aus `docs/03` (z. B. S > 40) werden schon am Feld abgelehnt.

**Ansichten**
- Zeigt eine Anschlussfahne nach oben (Streifen ohne untere Zelle, z. B. 32S1P B16), entfällt das separate Bk-Label über dem
  Streifen, weil die Fahne den Knoten nennt. So ist es auch in der bestätigten 32S1P-Skizze.
- Booster-Stirnseiten heißen „Stirnseite 1“ (gespiegelt, wie vorne) und „Stirnseite 2“, wie in der Splitpack-Skizze.
- Fahne am Hauptpack-Ende bei Booster: „HAUPT + → Booster (B18)“ statt nur „HAUPT + (B18)“; in der Draufsicht beschriftet
  dann das Kabel den Anschluss.
- Die Isolierlage zwischen den Teilpacks wird in der Draufsicht mindestens so breit gezeichnet, dass sie sichtbar ist;
  die Maße nennen den echten Wert.
- Wer Durchmesser oder Länge ändert, schaltet den Zelltyp automatisch auf „eigene“.
- Beim Wechsel auf „Abstandhalter“ werden Spalt Reihe, Spalt Lage und Halter-Außenrand geleert, weil sie Pflichtfelder sind.
  Im Modus „Mittenabstand“ zeigt das Feld Spalt + Durchmesser.
- Farben: Werkbank-Grau mit Schneidematten-Grün als UI-Akzent; Rot/Blau/Orange nur für Plus/Minus/Brücke.
  Hell/dunkel folgt der Systemeinstellung.

**Fishpaper**
- Zwischenlage: Umriss des vorderen Teilpacks im Blick von vorne (gespiegelt). Die Brückenkerbe liegt am nächstgelegenen
  Rand, auch an den Seiten. Bei 2P liegt der Brückenschwerpunkt auf halber Höhe, daher sitzt die Kerbe dort seitlich.
  Die Kerbtiefe zählt ab dem tieferen der beiden Kantenpunkte, damit sie überall mindestens die eingestellte Tiefe hat.
- Stirnseiten-Abdeckungen: „OBEN“ über einer oberen Zelle nahe der Mitte, R/L in den äußeren unteren Zellen,
  Anschluss-Markierung als dünnes Kreuz im Kreis an der Streifenposition. Texte, die eine Schnittlinie kreuzen würden,
  werden verkleinert oder weggelassen.
- Seitenteile: ein Eintrag „links/rechts“ mit Anzahl 2 je Teilpack, Maße Länge × Höhe + 2 × Randzugabe.
- Gemeinsame Umwicklung: Umfang des größten Teilpacks.
- Umschlag-Einschnitte im geraden Umriss: alle 10 mm in jedem Bogenbereich, beginnend 5 mm nach dessen Anfang;
  die Überlappungszone bleibt ohne Einschnitte.

**Export**
- Seitenaufteilung: 10 mm Rand, 9 mm Kopfzeile, 58 mm Fußbereich für Kontrollquadrat, Lineal und Druckhinweis.
- Hoch-/Querformat: das mit weniger Seiten, bei Gleichstand das mit weniger Kacheln, sonst Hochformat.
- Kacheln: gleichmäßige Schrittweite, letzte Kachel endet bündig, Überlappung ≥ 15 mm; Passkreuze und ◆-Nummer
  mitten in jeder Überlappung, damit sie auf beiden Blättern erscheinen.
- „Streifen teilen“: gleich lange Stücke mit je 15 mm Überlappung. Teile, die sich nicht teilen lassen, werden gekachelt.
- PDF-Schrift: Helvetica (PDF-Standardschrift, keine Einbettung). Zeichen außerhalb des Standardzeichensatzes werden ersetzt
  (− → -, → → ->), die Raute ◆ wird als Vektor gezeichnet.
- Die Bildschirm-Kalibrierung wird nur im eigenen Browser gespeichert.

**Zellen, Kennzahlen, Booster, Kleber (Runde 2, docs/04_PLAN_ERWEITERUNG.md; Rückfragen vom Nutzer entschieden)**
- Zellwerte aus `datasheets/*.pdf` (`src/core/cells.ts`); die PDFs liegen in `public/datasheets/` und sind im Build öffentlich.
  Geometrie = Maximalmaß, Kennzahlen = typ. Kapazität (Reliance: nur Minimum, gekennzeichnet), Ladeschluss 4,2 V.
- Pack-Innenwiderstand = R_Zelle × S / P, nur Zellen; bei Molicel der AC-Wert (typ., 30 % SOC), DC nur in der Zellspecs-Karte.
- Maß oder Kapazität ändern schaltet auf „eigene Zelle“; eigene Zellen haben keine Ströme, Ri oder nutzbare Energie.
- Alte Links/JSON mit den entfallenen Typen „21700“/„18650“ laden als eigene Zelle mit den gespeicherten Maßen.
  Alte Links ohne Zellangabe (damals Standard 21700) laden mit der heutigen Standardzelle P50B.
- Nutzbare Energie 4,2 V → 3,0 V: aus den Kurvenbildern digitalisiert (Farbverfolgung, Trapezregel, ca. ±3 %), vom Nutzer
  geprüft. Kurven gibt es nur bei Molicel P50B und P30B; P50B 50 A/60 A enden bei ca. 3,2 V und sind nicht enthalten.
  Alle anderen Datenblätter: „nicht im Datenblatt“.
- Booster: kein Eingabefeld „Zellen je Lage“ mehr; gleiche Lagenzahl wie der Teilpack, an dem er hängt. Alte
  `booster.cellsPerRow` werden ignoriert.
- Eingebogener Umriss: Kleber-Sehne 0,6 mm über jedem Tal (Stirnseiten, Zwischenlagen, Umwicklung), in `src/fishpaper/glue.ts`.
  Der Kern-Umriss bleibt unverändert (Fixture-Umfänge gelten weiter); die Umwicklung wird kürzer (18S2P P50B: 632,8 statt
  651,9 mm). Je Tal eine Falzlinie in der Sehnenmitte.

**Brückenlage, unvollständige Lage, Bedienung (Runde 3, docs/06_PLAN_BRUECKE_UND_BEDIENUNG.md; Rückfragen vom Nutzer entschieden)**
- Hauptminus und Hauptplus liegen immer außen. Die Brückenlage folgt aus der Aufteilung; der Schalter „Brücke“ teilt
  bei der anderen Lage (h+1) + (h−1) auf, größerer Teilpack vorne. Er ist nur bei 2 Teilpacks und gerader Gruppenzahl aktiv.
- Unvollständige Lage nur bei Wabe mit 2 Lagen und genau einer fehlenden Zelle (15 = 8 + 7). Raster und 3+ Lagen
  verlangen volle Lagen.
- Eingegeben werden die Lagen (Standard 2); die Zellen je Lage rechnet die App aus. „Zellen je Lage manuell“ bleibt möglich.
- Alte Links: Zellen je Lage gelten als manuell gesetzt, außer die Ableitung ergibt dasselbe. Ein alter Link, dessen
  Zellzahl jetzt als unvollständige Lage passt, zeigt statt des früheren Fehlers den Akku.
- Fishpaper „Ober-/Unterseite“ bleibt ein Rechteck in Packbreite. Bei unvollständiger Lage ist die Seite mit der
  kürzeren Lage eine Zelle schmaler; das Teil wird dort von Hand gekürzt.
- Annahmen-Text: „beginnend oben/unten“ nennt jetzt den tatsächlichen Start des ersten Teilpacks.

## Offen (Stufe 2)

- DXF-Export (R12, LWPOLYLINE/LINE).
- Druckbarer „Bauplan“ (Draufsicht, Stirnseiten, Balancer-Tabelle, Streifen-Stückliste) und PNG/SVG-Export der Verschaltungsansichten.
