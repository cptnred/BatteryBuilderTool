# 03 – UI-Spezifikation & Akzeptanzkriterien

Sprache der Oberfläche: **Deutsch**. Einheiten: mm, V, Ah, Wh. Dezimaltrennzeichen: Komma in der Anzeige, Eingabe mit Komma oder Punkt.

## 1. Layout (Desktop)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Akku-Konfigurator   [18S2P · 21700 · 36 Zellen · 64,8 V / 75,6 V · 583 Wh]   │
├───────────────┬───────────────────────────────────────────────────────────────┤
│ KONFIGURATION │ Tabs: [Verschaltung] [Fishpaper] [Stücklisten] [Export]       │
│ (scrollbar)   │                                                               │
│ Zelle         │  Draufsicht (VORNE oben)         │  Hinweise / Warnungen      │
│ Pack          │  ───────────────────────────────  ─────────────────────────   │
│ Anordnung     │  Pack A – vordere Stirnseite    Pack A – hintere Stirnseite   │
│ Abstände      │  Pack B – vordere Stirnseite    Pack B – hintere Stirnseite   │
│ Anschlüsse    │  Booster (falls aktiv)                                        │
│ Splitpack     │  Legende                                                      │
│ Fishpaper     │                                                               │
└───────────────┴───────────────────────────────────────────────────────────────┘
```
Seit Plan 06 (`docs/06_PLAN_BRUECKE_UND_BEDIENUNG.md` §5) zeigt die Konfiguration oben nur Schnellwahl, Zelle, S, P und
Brücke. Darunter steht die Liste „Aufbau“ (Teilpacks, Lagen, Stapelung, Anschlüsse, Abstände, Zellmaße, Splitpack,
Zuschnitt) mit aufklappbaren Zeilen.

Mobil: Die Konfiguration wird zur ausklappbaren Leiste oben, die Ansichten stehen untereinander, ohne horizontales Scrollen der Seite. Die SVGs skalieren.

## 2. Eingaben (mit Standardwerten = 18S2P / 21700)

| Gruppe | Feld | Standard | Werte / Regeln |
|---|---|---|---|
| Zelle | Zelltyp | 21700 | 21700 / 18650 / benutzerdefiniert |
| | Durchmesser | 21,4 mm (18650: 18,5) | editierbar, Hinweis „mit Schrumpfschlauch nachmessen“ |
| | Länge | 70,0 mm (18650: 65,0) | editierbar |
| | Kapazität | 4,5 Ah (18650: 3,0) | nur für Kennzahlen |
| Pack | S gesamt | 18 | 1–40 |
| | P | 2 | 1–6 |
| | Teilpacks im Hauptpack | 2 | 1–4 („vorne + hinten“ = 2) |
| | S je Teilpack | automatisch 9 + 9 | optional manuell (Summe muss passen) |
| | Brücke | wie gleichmäßige Aufteilung | innen / außen; nur bei 2 Teilpacks und gerader Gruppenzahl; die andere Lage teilt (h+1) + (h−1) auf |
| | Lagen | 2 | 1–6; Zellen je Lage werden berechnet (wird angezeigt); optional „Zellen je Lage manuell“ und je Teilpack |
| | Größere Lage | oben | oben / unten; nur bei unvollständiger Lage (Wabe, 2 Lagen, ungerade Zellzahl) |
| Anordnung | Stapelung | Wabe | Wabe (versetzt) / Raster (Zellen parallel übereinander) |
| | Wabenversatz | nach links | links / rechts (obere Lage gegenüber unterer, globale Seite) – nur bei Wabe |
| Abstände | Modus | nur Fishpaper (0,3 mm) | nur Fishpaper / mit Abstandhalter |
| | Spalt Reihe, Spalt Lage, Halter-Außenrand | – | **Pflichtfelder** bei Abstandhalter; Eingabe als Spalt oder Mittenabstand umschaltbar |
| | Isolierlage zwischen Teilpacks | 0,5 mm | |
| | Nickelstärke | 0,2 mm | 0,1–0,3 |
| Anschlüsse | Hauptminus | vorne, rechts | Stirnseite vorne/hinten × Seite links/rechts |
| | Hauptplus | hinten, rechts | dito |
| Splitpack | Splitpack | nein | ja/nein |
| | Booster S | 2 | ≥ 1, < S gesamt; Anzeige „Hauptpack = S − Booster“ und „gesamt = (vorne + hinten) + Booster“ |
| | Booster Zellen je Lage | 2 | |
| | Booster-Position | am Hauptplus | am Hauptplus / am Hauptminus |
| Fishpaper | siehe `02_FISHPAPER_EXPORT.md` | | |

Schnellwahl-Buttons (Presets): **18S2P**, **20S2P**, **20S2P Splitpack (18S2P + 2S2P)**, **30S1P**, **32S1P** sowie „Zurücksetzen“.

Jede Änderung wird sofort neu berechnet (kein „Berechnen“-Button). Ungültige Eingaben werden am Feld markiert. Die Ansichten zeigen dann den letzten gültigen Stand, ausgegraut, mit Fehlermeldung.

## 3. Ansichten (Tab „Verschaltung“)

- **Draufsicht** (VORNE oben): Teilpacks als Rechtecke mit Zelllinien der größten Lage (bei vollen Lagen die untere) und einem Pfeil für die Serienrichtung.
  Dazu Hauptminus (blau) und Hauptplus (rot) als Fahnen an der richtigen Ecke,
  Brücke (orange): innen = kurzer Balken zwischen den Packs, außen = Kabel um die Seite.
  Der Booster erscheint als gestrichelter Block mit Kabel. Maße stehen an den Kanten (B, L, Gesamtlänge).
  Ungleich breite Teilpacks werden bündig rechts gezeichnet (Option: links / mittig).
- **Stirnseitenansichten**: je Teilpack V und H, **immer von außen betrachtet** (V gespiegelt), mit R/L-Markern.
  - Zellen als Kreise; Pol je Zelle als großes **+ / −** (rot/blau – Symbol und Farbe, nicht nur Farbe).
  - Gruppennummer klein in der Zelle.
  - Nickelstreifen als abgerundete Flächen/Balken zwischen benachbarten Zellen des Streifens,
    abwechselnd dunkel-/hellgrau, damit Nachbarstreifen unterscheidbar sind.
  - Über jedem Streifen steht das Balancer-Label **Bk**.
  - Anschlüsse als Fahnen: Hauptminus/-plus und Brücke. Fahne nach unten, wenn der Streifen eine untere Zelle enthält, sonst nach oben.
    Mehrere Fahnen werden gestaffelt, damit sich Beschriftungen nicht überlappen.
  - **Hover/Tap** auf Zelle, Gruppe oder Bk: Die Gruppe wird in allen Ansichten und in der Tabelle hervorgehoben.
- **Legende** + Kurztext der aktiven Annahmen (Wabe links, Start unten rechts, Brücke innen/außen …).
- Referenz für Aussehen und Inhalt: `reference/bestaetigte-skizzen/*.png` (vom Nutzer freigegeben) und `reference/debug-svg.ts`.

## 4. Tab „Stücklisten“

- Balancer-Tabelle B0…BS: Knoten, Teilpack, Stirnseite, Streifenart, Lage im Pack (links/Mitte/rechts).
- Nickelstreifen-Stückliste: je Stirnseite und Teilpack, gruppiert nach Zellzahl.
- Kennzahlen (Zellen, V nominal/voll, Ah, Wh, Maße je Teilpack, Gesamtmaß).
- Fishpaper-Stückliste (siehe 02).

## 5. Persistenz & Teilen

- Die Konfiguration steckt im **URL-Hash** (kompakt, z. B. base64url-JSON). Links sind dadurch teilbar.
- Die letzte Konfiguration wird zusätzlich in `localStorage` gemerkt (mit try/catch, die App funktioniert auch ohne).
- JSON-Export und -Import der Konfiguration.

## 6. Akzeptanzkriterien (Definition of Done)

1. `npm run dev` startet; die Startseite zeigt **18S2P / 21700 / 2 Teilpacks à 9 je Lage / Wabe links / Minus vorne rechts / Plus hinten rechts**.
   Die Ansichten stimmen inhaltlich mit `reference/bestaetigte-skizzen/Skizze_18S2P.png` überein (Polarität, Gruppennummern, Bk-Labels, Brücke innen links).
2. Die Presets 32S1P, 20S2P und 20S2P-Split reproduzieren die jeweiligen bestätigten Skizzen. 30S1P entspricht der bestätigten Fixture `30S1P_21700`.
3. `npm test` ist grün:
   - `reference/selftest.ts` als Vitest portiert,
   - Fixture-Vergleich für **alle** `reference/fixtures/*.json` (Gruppen, Streifen, Brücken, Kette, Umfänge ±0,1 mm, Fehler/Hinweise),
   - PDF-Maßstabstest und Kacheltest (siehe 02 §6).
4. `npm run build` ohne Fehler und ohne TypeScript-Fehler (strict). `npm run lint` ohne Fehler.
5. Wechsel auf 18650 ändert Maße und Umrisse. Die Verschaltung bleibt gleich.
6. „Raster + Abstandhalter“ verlangt manuelle Abstände. Ohne sie gibt es keinen Export, aber eine klare Meldung.
7. Wabenversatz rechts spiegelt die Zelllagerung. Beide Teilpacks bleiben identisch gestapelt.
8. Ein Hauptplus-/Minus-Wunsch, der nicht erfüllbar ist, erzeugt eine verständliche Warnung und stürzt nie ab.
9. Das PDF ist gedruckt maßhaltig (Kontrollquadrat), die Umwicklung wird gekachelt, die Stirnseiten sind korrekt gespiegelt und beschriftet.
10. Mobil (375 px Breite) ist alles bedienbar, ohne horizontales Scrollen der Seite.
11. Screenshots der fünf Presets (Playwright) liegen unter `docs/screenshots/`. Claude Code hat die vier mit bestätigter Skizze selbst mit den Skizzen verglichen. Für 30S1P gibt es keine Skizze; dort hat der Nutzer den Screenshot `docs/screenshots/30S1P.png` bestätigt.
