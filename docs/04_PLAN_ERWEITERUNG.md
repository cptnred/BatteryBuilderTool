# 04 – Plan: Erweiterung Zelldatenbank, Booster, Kleber, Laser-Export

Stand: 2026-09-30. Alle Entscheidungen in diesem Dokument hat der Nutzer ausdrücklich getroffen (Rückfragerunde).
Sie gelten wie **[BESTÄTIGT]**-Regeln: nicht „verbessern“, bei Widersprüchen nachfragen.

Ausgangslage: M1–M7 aus `PROMPT.md` sind fertig (siehe `README.md`). 113 Unit-Tests, 14 Playwright-Tests grün.

---

## 0. Harte Randbedingungen (unverändert)

- `reference/fixtures/*.json` und `src/core` (Verhalten) bleiben unverändert. Alle folgenden Änderungen liegen in
  `src/state`, `src/fishpaper`, `src/export`, `src/view`, `src/ui` bzw. in **neuen** Kern-Modulen (z. B. `src/core/cells.ts`).
- `src/core/types.ts` → `DEFAULT_CONFIG` bleibt die Referenz-Konfiguration (21,4 mm) für Tests/Fixtures.
  Nur der **App-Standard** (`DEFAULT_STATE` in `src/state/config.ts`) wechselt auf die P50B.
- Tests, die sich durch die Entscheidungen ändern (Kleber-Umfang, App-Standardzelle), werden auf die **neuen, konkret
  berechneten Werte** umgestellt. Das hat der Nutzer freigegeben. Fixtures werden **nicht** angepasst.

---

## 1. Zelldatenbank aus den Datenblättern

Quelle: `datasheets/*.pdf` (9 Dateien). Die Werte unten sind aus den PDFs gelesen und vom Nutzer geprüft.
EVE 50PL mit 125 A Dauerentladung ist **ausdrücklich bestätigt** (Datenblatt Abschnitt 3.6).

### 1.1 Regeln
- **Kapazität für Kennzahlen:** typischer bzw. Nennwert. Wo das Datenblatt nur ein Minimum nennt (Reliance RS50, RS60),
  wird das Minimum verwendet und in der UI als „nur Mindestwert angegeben“ gekennzeichnet. Minimum zusätzlich anzeigen.
- **Maße für die Geometrie:** immer der **Maximalwert**. Bei Angaben „Nennwert ± Toleranz“ (EVE) = Nennwert + Toleranz.
  Durchmesser und Länge bleiben in der UI überschreibbar (dann Zelltyp „eigene“).
- **Max. Dauerentladung:** Nennt das Datenblatt zwei Werte (mit/ohne Temperaturabschaltung), werden **beide** mit Bedingung
  angezeigt und beide für den Pack hochgerechnet. Sonst der eine Wert mit seiner Bedingung.
- **Standardzelle:** Molicel INR-21700-P50B für Start und alle vier Presets. Die generischen Zellen „21700“/„18650“
  (21,4 × 70 / 18,5 × 65) **entfallen**. „Eigene Zelle“ bleibt wählbar.
- **Ladeschlussspannung:** 4,2 V bei allen Zellen (Ampace misst Kapazität mit 4,25 V, Standardladung aber 4,20 V).

### 1.2 Werte

| Zelle (Datei) | Kapazität typ. / min. | U nenn | Max. Ladestrom | Max. Dauerentladung | Ø max | Höhe max | Innenwiderstand (lt. Datenblatt) |
|---|---|---|---|---|---|---|---|
| Molicel INR-21700-P50B (`Datasheet_Molicel_INR21700_P50B.pdf`) | 5000 / 4850 mAh | 3,6 V | 25 A (Standard 5 A), 70 °C cut-off | 60 A (80 °C cut-off) | 21,55 | 70,15 | AC 6,5 mΩ typ. (30 % SOC); DC 12,8 mΩ |
| Molicel INR-18650-P30B (`Product-Data-Sheet-of-INR-18650-P30B-80111-1.pdf`) | 3000 / 2900 | 3,6 | 9 A (Standard 3 A), 60 °C cut-off | 30 A (80 °C cut-off) | 18,6 | 65,2 | AC 8 mΩ typ.; DC 17 mΩ |
| BAK INR2170-50D2 (`Datasheet_INR2170-50D2_EN.pdf`) | 5000 / 4950 | 3,6 | 15 A | 60 A (80 °C cut-off) | 21,45 | 70,75 | ≤ 5 mΩ (AC 1 kHz) |
| EVE INR18650/30P (`11-_EVE_INR18650-30P_SPEC…pdf`) | 3000 / 2900 | 3,6 | 4,0 A | 30 A (75 °C cut-off) | 18,45 (18,35 ± 0,10) | 65,30 (65,15 ± 0,15) | 18 mΩ (AC 1 kHz) |
| EVE INR21700/50PL (`EN_-_datasheet_-_21700-50PL.pdf`) | 5000 / 4800 | 3,6 | 10 A | 125 A (75 °C empfohlen, Tmax 80 °C) – **bestätigt** | 21,25 (21,15 ± 0,10, mit Schlauch) | 70,30 (70,15 ± 0,15) | 7 mΩ (AC 1 kHz) |
| Ampace JP30 (`Datasheet JP30.pdf`) | 3000 (Mittelwert) / 2900 | 3,68 | 9 A (bei 25–60 °C Zelltemperatur) | 36 A ohne / 56 A mit 80 °C-Abschaltung | 18,56 | 65,23 | max. 5 mΩ (AC 1 kHz) |
| Reliance INR21700-RS60 (`Datasheet_Reliance_INR21700-RS60.pdf`) | nur min. 5850 | 3,6 | 12 A | 50 A (80 °C cut-off) | 21,6 | 70,9 | 5,5 mΩ (AC 1 kHz) |
| Reliance INR21700-RS50 (`Reliance_INR21700-RS50_Specification_20250525_A1-3_.pdf`) | nur min. 4950 | 3,6 | 15 A | 70 A (80 °C cut-off) | 21,25 | 70,35 | 4,0 mΩ (AC 1 kHz) |
| Tenpower INR21700-60XG (`TENPOWER_PRODUCT_SPECIFICATION_INR21700-60XG…pdf`) | 6000 / 5900 | 3,6 | 16 A | 40 A ohne / 60 A mit 75 °C-Abschaltung | 21,50 | 70,50 | 5 mΩ (AC 1 kHz, 30 % SOC) |

Hinweise:
- Tenpower 60XG nennt die Maße ohne Toleranz; die Werte werden so übernommen.
- Weitere Angaben (Gewicht, Temperaturbereiche, Pulsstrom) dürfen in der Zellspecs-Karte stehen, fließen aber nicht in Kennzahlen.
- Beim Übertragen jeden Wert noch einmal am PDF prüfen (Text mit `pdftotext -raw` lesen; `-layout` verschiebt Tabellenspalten).

### 1.3 Umsetzung
- Neues reines Modul `src/core/cells.ts` (oder `src/cells/`): Typ `CellDatasheet` mit allen Werten der Tabelle, jeweils
  mit Einheit, Bedingung (z. B. „80 °C cut-off“), Kennzeichen „nur Minimum“, Quelle (Dateiname, Seite/Abschnitt).
  `CellSpec` für die Geometrie wird daraus abgeleitet (Ø max, Höhe max, typ. Kapazität, U nenn, U max 4,2).
- Test: jeder Tabellenwert oben wird konkret geprüft.
- UI: Zellauswahl (nach Bauform gruppiert: 21700 / 18650), Karte **„Zellspecs“** mit allen Werten, Fundstelle und
  Knopf **„Original-PDF öffnen“** (neuer Tab).
- Die 9 PDFs werden nach `public/datasheets/` kopiert und sind damit im Build öffentlich. Das ist vom Nutzer so entschieden.

---

## 2. Pack-Kennzahlen

Alle für den **Gesamtpack inkl. Booster** (S gesamt, P gleich für Haupt- und Booster):
- Kapazität (typ.) = P × Zellkapazität; Energie = S × U nenn × P × Ah.
- Max. Dauerentladestrom = P × Zellwert (bei JP30/60XG beide Werte mit Bedingung).
- Max. Ladestrom = P × Zellwert.
- **Max. Entladeleistung in kW** = max. Dauerentladestrom (Pack) × S × U nenn.
- **Innenwiderstand Pack** = R_Zelle × S / P (nur Zellen, ohne Verbinder; den Wert aus dem Datenblatt nehmen, die Art
  – AC typ./max. – mit angeben).
- **Nutzbare Energie 4,2 V → 3,0 V** je Kurvenstrom (siehe §6), hochgerechnet mit S × P; zugehöriger Pack-Strom = Zellstrom × P.
- Gewicht wird **nicht** angezeigt.

---

## 3. Booster: gleiche Lagenzahl wie der Hauptpack

- Das Eingabefeld „Booster Zellen je Lage“ **entfällt**.
- Der Booster hat dieselbe Stapelung wie der Hauptpack und **dieselbe Lagenzahl wie der Teilpack, an dem er hängt**
  (Booster am Plus-Ende → letzter Teilpack der Kette; am Minus-Ende → erster Teilpack der Kette).
- Zellen je Lage Booster = Boosterzellen (S_Booster × P) ÷ diese Lagenzahl. Geht das nicht auf → Fehlermeldung am Booster.
- Umsetzung in `toBatteryConfig` (Zustandsschicht), `BoosterSpec.cellsPerRow` wird dort berechnet. `src/core` bleibt
  unverändert. Welcher Teilpack am Plus-/Minus-Ende liegt, folgt aus `mainMinus.end` (Kette vorne→hinten oder umgekehrt),
  seine Lagenzahl aus `seriesSplit` und `perRowOf`.
- Die Fixture `20S2P_split_18S2P+2S2P_21700` bleibt gültig (2S2P bei 2 Lagen → 2 je Lage wie bisher).
- Alte Links/JSON mit `booster.cellsPerRow`: Wert wird ignoriert.

---

## 4. Kleberaufbau 0,6 mm beim Umriss „eingebogen“

- Fester Wert **0,6 mm**, kein Eingabefeld.
- Jedes Tal zwischen zwei Nachbarzellen der eingebogenen Kontur wird **gerade abgeschnitten**: Eine Sehne ersetzt den
  Taleinschnitt; sie liegt **0,6 mm über dem tiefsten Punkt** des Tals (gemessen entlang der Winkelhalbierenden des Tals,
  senkrecht zu ihr), die beiden Zellbögen werden an der Sehne gekürzt.
- Gilt für **alle** eingebogenen Umrisse: Stirnseiten, Zwischenlagen **und** Umwicklung (deren Umfang wird kürzer,
  Falzmarken sitzen dann an den Sehnen-Enden bzw. der Sehne).
- Umsetzung in der Fishpaper-Schicht auf der Segmentgeometrie (§5.3). `packOutline`/`scallopOutline` im Kern bleiben
  unverändert → Fixture-Umfänge bleiben gültig.
- Tests: konkrete Zahlen (z. B. Talgeometrie zweier Zellen Ø 21,55 mit 0,3 mm Spalt; neuer Umwicklungsumfang 18S2P P50B).

---

## 5. Laser-Export

### 5.1 Format
- Neues Seitenformat **„Laser: alle Teile auf einer Seite“** für **PDF und SVG**: eine Seite in Gesamtgröße, alle aktiven
  Teile (mit Anzahl) per Regal-Packing verteilt, **nichts gekachelt oder geteilt**.
- A4/A3/Letter/Plotter mit Kachelung bleiben unverändert für den Papierdruck.

### 5.2 Inhalt und Ebenen
- **Keine** Falzlinien, **keine** Biegemarken, **keine** grauen Biegeflächen im Laser-Export.
- Ebenen (Farben nach LightBurn-Standard):
  - **Schnitt `#000000`** (Ebene 00): Außenkonturen, Schlitze, Brückenkerben, Umschlag-Einschnitte (als eigene Schnittpfade).
  - **Markierung `#0000FF`** (Ebene 01): Anschluss-Kreuze, Überlappungsgrenze der Umwicklung, Wickelrichtungspfeil.
  - **Text `#FF0000`** (Ebene 02): **echter Text** (Helvetica/Arial), kein Umwandeln in Vektoren.
- SVG: je Ebene eine benannte Gruppe/Ebene (`inkscape:groupmode="layer"`), Einheit mm (`width="…mm"`, `viewBox` in mm).
- PDF: Trennung nur über die Farbe (keine PDF-Ebenen/OCG nötig). 1:1, `unit: 'mm'`.
- Kontrollquadrat/Lineal/Kopfzeile: im Laser-Export nur, wenn sie den Schnitt nicht stören – beim Nutzer nachfragen,
  falls unklar (bisher nicht entschieden).

### 5.3 Durchgehende Linien, echte Bögen
- Jede Kontur ist **ein einziger geschlossener Pfad**; Bögen als **echte Kurven** (SVG `A`-Befehl; PDF kubische Bézier,
  Bögen in Stücke ≤ 90° zerlegt) statt Geradenstücken.
- Dafür wird die Teilgeometrie in `src/fishpaper` von Punktlisten (`Path2`) auf **Segmente** umgestellt
  (`line` | `arc`, analog `Seg` in `src/core/outline.ts`). Betroffen: Spiegelung der Vorderabdeckung (Bogen-Umlaufsinn
  umkehren), Brückenkerbe (Schnitt Senkrechte/Waagerechte mit Linien und Bögen), Kleber-Sehne, Textplatzierung
  (Punkt-in-Kontur), Flächenberechnung.
- Papier-Kachelung darf weiterhin auf eine Polylinie abflachen (nur Druck).
- Tests: Pfad je Kontur geschlossen und einteilig; SVG enthält `A`-Befehle; PDF-Stream enthält `c`-Operatoren; Farben je Ebene.

---

## 6. Nutzbare Energie 4,2 V → 3,0 V aus den Kurvenbildern

- Werte werden **aus den Entladekurven-Bildern abgelesen**, für **alle im Datenblatt gezeigten Ströme**.
- Vorgehen: Kurvenseiten rendern (pdf.js in Playwright, wie `tests/e2e/pdf-render.spec.ts`; `pdftoppm` fehlt), je Kurve die
  Spannung in festen Kapazitätsschritten ablesen bis 3,0 V, Energie = Fläche unter U(Q) (Trapez) von 0 bis Q(3,0 V).
- Hinterlegen je Zelle und Strom: Kapazität bis 3,0 V, Energie bis 3,0 V, Quelle (Datei, Seite, Abbildung), Hinweis
  „abgelesen, ca. ±3 %“.
- Zellen ohne Kurve (z. B. BAK 50D2; für Reliance/Tenpower prüfen): „nicht im Datenblatt“.
- **Die abgelesenen Werte dem Nutzer zur Kontrolle vorlegen, bevor sie eingebaut werden.**

---

## 7. Offen (Nutzer noch nicht beantwortet)

- **Alte Links/JSON mit `cellType: '21700' | '18650'`** (Typen entfallen): Vorschlag „als eigene Zelle mit den
  gespeicherten Maßen laden“ – **vor der Umsetzung bestätigen lassen.**
- Kontrollquadrat/Kopfzeile im Laser-Export (§5.2) – falls es Konflikte gibt, nachfragen.

---

## 8. Reihenfolge (nach jedem Schritt: `npm test`, `npm run build`, `npm run lint`)

1. Zelldatenbank + PDFs in `public/datasheets/` + Zellspecs-Karte; Standard P50B; Test gegen Tabelle §1.2.
2. Pack-Kennzahlen (§2) in Kopfzeile/Stücklisten.
3. Booster-Lagenzahl (§3).
4. Segmentgeometrie in `src/fishpaper` + Kleber-Sehne (§4, §5.3).
5. Laser-Export PDF/SVG (§5).
6. Kurven ablesen, Werte vorlegen, dann einbauen (§6).
7. `npm run e2e`, Screenshots ansehen, README (Bedienung, Annahmen) aktualisieren.
