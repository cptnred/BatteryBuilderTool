# 06 – Plan: Brückenlage wählbar, unvollständige Lage, 30S1P, einfachere Bedienung

Stand: 2026-10-07. Die Entscheidungen in §1 hat der Nutzer in einer Rückfragerunde getroffen oder ausdrücklich freigegeben.
Sie gelten wie **[BESTÄTIGT]**-Regeln: nicht „verbessern“, bei Widersprüchen nachfragen.

---

## 0. Ausgangslage

Die Brückenlage ist heute keine Einstellung, sondern eine Folge der Gruppenzahl je Teilpack. Solange Hauptminus und
Hauptplus außen liegen, endet ein Teilpack mit **ungerader** Gruppenzahl auf der Gegenseite (Brücke innen) und mit
**gerader** Gruppenzahl auf derselben Seite (Kabel außen herum). Am Solver nachgeprüft:

| Konfiguration | Aufteilung | Ergebnis heute |
|---|---|---|
| 18S2P | 9 + 9 | Brücke innen |
| 20S2P | 10 + 10 | Brücke außen |
| 20S2P | 9 + 11 (manuell) | Brücke innen |
| 32S1P | 16 + 16 | Brücke außen |
| 30S1P | 15 + 15 | Fehler: 15 Zellen passen nicht in volle Lagen à 8 |
| 30S1P | 14 + 16 (manuell) | Brücke außen |

Drei Schwachstellen folgen daraus:

1. Die Brückenlage lässt sich nicht wählen, nur über die manuelle Aufteilung erzwingen.
2. 30S1P mit 15 + 15 ist nicht baubar, weil der Kern volle Lagen verlangt (`src/core/validate.ts`).
3. Das Panel zeigt rund 30 gleichrangige Felder. Wer nur S ändert (18 → 20), bekommt sofort einen Fehler,
   weil „Zellen je Lage“ nicht mitgeht.

---

## 1. Entscheidungen des Nutzers

1. **Hauptminus und Hauptplus liegen immer außen** (vordere Stirnseite des vordersten bzw. hintere des hintersten
   Teilpacks). Anschlüsse im Spalt zwischen den Teilpacks gibt es nicht.
2. **Bei 2P ist die gleichmäßige Aufteilung mit Brücke außen der Normalfall.** Eine ungleiche Aufteilung macht die
   Teilpacks dort zwei Zellen unterschiedlich breit. Bei 1P darf die Brücke innen liegen (z. B. 30S1P).
3. **Unvollständige Lage:** Ein Teilpack mit ungerader Zellzahl in zwei Wabenlagen hat eine große und eine um eine
   Zelle kürzere Lage (15 = 8 + 7). Die kürzere Lage sitzt in den Mulden der großen.
4. **30S1P-Preset:** beide Teilpacks 8 oben + 7 unten, Hauptminus oben rechts vorne, Hauptplus oben rechts hinten,
   Brücke B15 innen links, gerade durch (oben links nach oben links).
5. **Die größere Lage ist umschaltbar** (oben | unten), für alle Teilpacks gleich. Standard: oben.
   Die Regel „alle Teilpacks identisch gestapelt“ aus dem Fachkonzept bleibt gültig.
6. **Ungleiche Aufteilung:** Der vordere Teilpack bekommt die größere Hälfte (wie die bestehende Regel
   „Rest geht an die vorderen Packs“). Manuell umkehrbar.
7. **Bedienkonzept:** wenige Grundwerte oben, darunter eine Liste „Aufbau“ mit aufklappbaren Zeilen. Kein Modus.

---

## 2. Harte Randbedingungen

- `reference/fixtures/*.json` (11 Dateien) und `reference/pack-core.ts` bleiben unverändert.
  `tests/fixtures.test.ts` und `tests/reference-equivalence.test.ts` bleiben unverändert grün.
- Für Teilpacks mit vollen Lagen rechnet `src/core` exakt wie bisher: gleiche Zellen, Gruppen, Streifen, Brücken,
  Kosten und **wortgleiche** Fehler- und Hinweistexte.
- `SubPack` bekommt keine neuen Pflichtfelder (der Äquivalenztest vergleicht Packs mit `toEqual`).
- `BatteryConfig` bekommt nur optionale Felder; fehlt eines, gilt der Standard.
- `src/core` bleibt frei von React/DOM. UI-Komponenten rechnen nicht selbst; Ableitungen und die
  Anzeigetexte des Panels liegen in `src/state`, die Zeichenmodelle der Ansichten in `src/view`.
- Zustandstests, die sich durch §1 ändern (z. B. direktes Setzen von `cellsPerRow`), werden auf die neuen, konkret
  berechneten Werte umgestellt. Fixtures werden nicht angepasst.

---

## 3. Kern: unvollständige Lage

### 3.1 Wann sie gilt

Ein Teilpack (oder Booster) mit `n = S_Teilpack × P` Zellen und `m` Zellen je Lage bekommt eine unvollständige Lage,
wenn **alle** Bedingungen gelten:

- Stapelung **Wabe**,
- `n` ist ungerade und `n ≥ 3`,
- `n = 2·m − 1` (also genau zwei Lagen: `m` und `m − 1` Zellen).

In allen anderen Fällen gilt die bisherige Regel: `n` muss durch `m` teilbar sein, sonst der bisherige Fehler
„Teilpack i: n Zellen lassen sich nicht in volle Lagen à m aufteilen.“ Das betrifft insbesondere Raster und 3+ Lagen.

Teilpacks mit vollen und mit unvollständigen Lagen dürfen in einem Akku gemischt vorkommen (z. B. 31S1P = 16 + 15).

### 3.2 Platzierung

```
große Lage:   m Zellen      x = R + i·px              (i = 0 … m−1)
kleine Lage:  m−1 Zellen    x = R + px/2 + i·px       (i = 0 … m−2)
z:            Lage 0 = R,  Lage 1 = R + pz            (px, pz wie Fachkonzept §3)
Breite = (m−1)·px + D        Höhe = pz + D
```

- Neues optionales Feld `BatteryConfig.wideLayer: 'top' | 'bottom'`. Fehlt es, gilt `'top'`:
  die große Lage ist Lage 1, die kleine Lage 0. Bei `'bottom'` umgekehrt.
- Zell-IDs wie bisher `L<lage>-<index>`, Index 0 = ganz links **in der jeweiligen Lage**.
- Der Wabenversatz (`offsetSide`) hat für diesen Teilpack keine Wirkung; die Form ist symmetrisch.
- `SubPack.perRow = m` (Zellen der großen Lage), `SubPack.layers = 2`.

### 3.3 Verschaltung

Unverändert nach Fachkonzept §4: Zellen strikt nach x sortiert, Zickzack, Blöcke zu je P Zellen, Polarität wechselt
je Gruppe. Folge: **Anfang und Ende des Teilpacks liegen beide auf der großen Lage.**
Der Solver und seine Kosten bleiben unverändert.

### 3.4 Prüfzahlen

Mit `DEFAULT_CONFIG` (Ø 21,4 mm, Fishpaper 0,3 mm → px = 21,7; pz = 18,7928), 15 Zellen, `wideLayer` = `'top'`:

- Lage 1 (oben, 8 Zellen): x = 10,7 … 162,6 (Schritt 21,7), z = 29,4928.
- Lage 0 (unten, 7 Zellen): x = 21,55 … 151,75, z = 10,7.
- Breite 173,3 mm, Höhe 40,19 mm.
- Umriss „gerade“: 151,9 + 130,2 + 2 × 21,7 + 2π × 10,85 = **393,67 mm**.

Mit der P50B (Ø 21,55 → px = 21,85) ist der Teilpack **174,5 mm** breit (32S1P: 185,4 mm).

30S1P = `{ ...DEFAULT_CONFIG, series: 30, parallel: 1, cellsPerRow: 8 }`:

| | Pack A (vorne) | Pack B (hinten) |
|---|---|---|
| Richtung, Start → Ende | RL, V → H | LR, V → H |
| erste Gruppe | 1 = `L1-7` (oben rechts), Minus vorne | 16 = `L1-0` (oben links), Minus vorne |
| zweite Gruppe | 2 = `L0-6` | 17 = `L0-0` |
| letzte Gruppe | 15 = `L1-0` (oben links), Plus hinten | 30 = `L1-7` (oben rechts), Plus hinten |

Brücke: `inner`, Knoten 15, von P0 H/L nach P1 V/L. Kosten 2 (beide Teilpacks beginnen oben). Keine Warnung.
Mit `wideLayer: 'bottom'`: Gruppe 1 = `L0-7`, Gruppe 15 = `L0-0`, Kosten 0.

### 3.5 Umsetzung

- `src/core/types.ts`: optionales `wideLayer`.
- `src/core/geometry.ts`: eine Hilfsfunktion `layerPlan` entscheidet „volle Lagen / unvollständige Lage / ungültig“
  (sie liegt hier und nicht in `validate.ts`, weil `validate.ts` bereits `geometry.ts` importiert).
  `placeCells` bekommt die Zellzahl und platziert nach §3.2, wenn §3.1 gilt.
- `src/core/validate.ts`: `validateConfig` nutzt `layerPlan` für Teilpacks und Booster.
- `src/core/wiring.ts`: `buildSubPack` reicht die Zellzahl durch.
- `src/core/solver.ts`: keine Änderung der Logik.

---

## 4. Zustand: Lagen, Brückenwahl, Presets (`src/state`)

### 4.1 Neue Felder in `ConfigState`

| Feld | Standard | Bedeutung |
|---|---|---|
| `layers` | 2 | Lagen je Teilpack (1–6) |
| `cellsPerRowManual` | false | „Zellen je Lage manuell“ (ein Wert für alle Teilpacks) |
| `bridge` | `'auto'` | `'auto' \| 'inner' \| 'outer'` |
| `wideLayer` | `'top'` | größere Lage oben oder unten |

`cellsPerRow`, `cellsPerRowSplit` und `seriesSplit` bleiben im Zustand und tragen immer die **wirksamen** Werte
(so wie `seriesSplit` heute schon), damit die Oberfläche sie anzeigen kann.
Die Schalter `seriesSplitManual` und `cellsPerRowSplitManual` bleiben unverändert.

### 4.2 Aufteilung aus der Brückenwahl

```
mainS = S gesamt − Booster-S
„S je Teilpack manuell“ aktiv                 → manuelle Werte; Schalter inaktiv
Teilpacks ≠ 2  oder  mainS ungerade  oder  mainS < 4
                                              → gleichmäßig, Rest nach vorne; Schalter inaktiv
sonst h = mainS / 2:
  natürlich = innen, wenn h ungerade; außen, wenn h gerade
  bridge = 'auto' oder = natürlich            → h + h
  bridge ≠ natürlich                          → (h + 1) + (h − 1)
```

| Pack | natürlich | andere Wahl |
|---|---|---|
| 18S2P | 9 + 9, innen | außen → 10 + 8 |
| 20S2P | 10 + 10, außen | innen → 11 + 9 |
| 30S1P | 15 + 15, innen | außen → 16 + 14 |
| 32S1P | 16 + 16, außen | innen → 17 + 15 |

Klick auf die natürliche Lage setzt `bridge` auf `'auto'`, Klick auf die andere setzt sie ausdrücklich.
Eine ausdrückliche Wahl bleibt bestehen, wenn S sich ändert.

### 4.3 Zellen je Lage aus den Lagen

```
n_i = S_i × P
automatisch:  m_i = ceil(n_i / Lagen)
gültig, wenn  n_i = m_i × Lagen   oder   §3.1 gilt
```

Bei Wabe mit 2 Lagen ist damit jede Zellzahl ab 2 je Teilpack gültig (gerade → volle Lagen, ungerade → §3.1).

Ungültig (z. B. 4 Zellen bei 3 Lagen, 15 Zellen im Raster bei 2 Lagen): Fehlermeldung an der Zeile „Lagen“
(„Teilpack i: n Zellen lassen sich nicht auf L Lagen aufteilen.“), kein neues Layout; die Ansichten zeigen wie
heute den letzten gültigen Stand. Die Prüfung liegt in `src/state`, weil der Kern nur Zellen je Lage kennt.

Ist „Zellen je Lage manuell“ oder „Zellen je Lage je Teilpack“ aktiv, gelten die eingegebenen Werte; `Lagen` wird
dann nur angezeigt (aus `ceil(n_i / m_i)`), und es gilt die Prüfung des Kerns.

### 4.4 `toBatteryConfig`

- `cellsPerRow` = Wert des vordersten Teilpacks. `cellsPerRowSplit` nur, wenn die Teilpacks sich unterscheiden oder
  „je Teilpack“ aktiv ist. `seriesSplit` nur, wenn die Aufteilung von „gleichmäßig, Rest nach vorne“ abweicht.
  `wideLayer` nur, wenn `'bottom'`.
- Damit liefern die vier bestehenden Presets **exakt dieselbe** `BatteryConfig` wie heute.

### 4.5 Presets

Alle Presets bestehen nur noch aus S, P und ggf. Booster. Reihenfolge und Beschriftung:

| ID | Beschriftung | Patch |
|---|---|---|
| `18S2P` | 18S2P | – |
| `20S2P` | 20S2P | `series: 20` |
| `20S2P-split` | 20S2P Splitpack (18S2P + 2S2P) | `series: 20`, Booster 2S am Hauptplus |
| `30S1P` | 30S1P | `series: 30, parallel: 1` |
| `32S1P` | 32S1P | `series: 32, parallel: 1` |

### 4.6 Booster

Regel aus Plan 04 §3 bleibt: gleiche Lagenzahl wie der Teilpack, an dem er hängt. Die Zellen je Lage des Boosters
folgen aus §4.3; eine unvollständige Lage nach §3.1 ist auch beim Booster erlaubt (z. B. 3S1P = 2 + 1).
Die bisherige Fehlermeldung am Booster bleibt für alle anderen Fälle.

### 4.7 Alte Links und Dateien

Neue Stände tragen Formatversion 2: Hash-Präfix `c2=`, JSON `version: 2`, localStorage-Schlüssel
`akku-konfigurator:v2`. Stände im alten Format (`c=`, `version: 1`, `akku-konfigurator:v1`) werden so übernommen:

1. Mit den **alten** Standardwerten zusammenführen (`cellsPerRow` 9).
2. `cellsPerRowManual = true`, `bridge = 'auto'`, `wideLayer = 'top'`.
3. Ergibt die automatische Ableitung mit `Lagen = n_0 / cellsPerRow` (falls ganzzahlig) dieselben Werte, wird auf
   automatisch zurückgestellt und diese Lagenzahl gesetzt.

Ergebnis: Jeder alte Link, der heute einen Akku zeigt, zeigt denselben Akku. Links, die heute einen Fehler zeigen,
zeigen weiterhin denselben Fehler. Einzige Ausnahme: Passt die Zellzahl jetzt als unvollständige Lage (§3.1, z. B.
alter Link mit 30S1P à 8), erscheint statt des Fehlers der Akku.

### 4.8 Umsetzung

- Neues reines Modul `src/state/derive.ts`: Aufteilung (§4.2), Zellen je Lage (§4.3), Zustand des Brückenschalters
  (natürlich, wirksam, wählbar, Folge).
- `src/state/config.ts`: neue Felder, `normalize`, `toBatteryConfig`, `boosterRows`, Presets, `matchingPreset`.
- `src/state/url.ts`, `src/state/storage.ts`: Formatversion und Übernahme nach §4.7.

---

## 5. Bedienung (`src/ui`)

### 5.1 Aufbau des Panels

```
┌ KONFIGURATION ─────────────────┐
│ [18S2P] [20S2P] [20S2P Split…] │
│ [30S1P] [32S1P]   Zurücksetzen │
│                                │
│ Zelle  [Molicel P50B        ▾] │
│ S [ 30 ]      P [ 1 ]          │
│ Brücke [ innen ] [ außen ]     │
│   gleichmäßig 15 + 15          │
│                                │
│ AUFBAU                         │
│ ▸ Teilpacks   2 · 15 + 15      │
│ ▸ Lagen       2 · 8 + 7        │
│ ▸ Stapelung   Wabe, links      │
│ ▸ Anschlüsse  − v. r. · + h. r.│
│ ▸ Abstände    Fishpaper 0,3 mm │
│ ▸ Zellmaße    21,55 × 70,15 mm │
│ ▸ Splitpack   aus              │
│ ▸ Zuschnitt   Standard         │
└────────────────────────────────┘
```

Alle Zeilen sind beim Start zugeklappt. Mobil bleibt das Verhalten wie heute (ausklappbare Leiste).

### 5.2 Brückenschalter

- Zwei Optionen: **innen** / **außen**. Markiert ist die wirksame Lage.
- Zeile darunter nennt die Folge:
  - natürlich: „gleichmäßig 15 + 15“
  - andere Wahl: „ungleich 17 + 15 – Teilpacks unterschiedlich breit“
  - inaktiv: der Grund, z. B. „19S: ungerade Gruppenzahl, Brücke liegt außen um einen Teilpack“ oder
    „folgt aus der manuellen Aufteilung 14 + 16“.

### 5.3 Zeilen der Liste „Aufbau“

| Zeile | Kurzwert (Beispiel) | Felder |
|---|---|---|
| Teilpacks | „2 · 15 + 15“ | Teilpacks im Hauptpack; S je Teilpack manuell |
| Lagen | „2 · 8 + 7“, „2 · 9 je Lage“ | Lagen; Größere Lage oben/unten (nur wenn ein Teilpack eine unvollständige Lage hat); Zellen je Lage manuell; Zellen je Lage je Teilpack |
| Stapelung | „Wabe, Versatz links“, „Raster“ | Stapelung; Wabenversatz |
| Anschlüsse | „− vorne rechts · + hinten rechts“ | wie heute |
| Abstände | „Fishpaper 0,3 mm“, „Abstandhalter“ | wie heute, inkl. Isolierlage und Nickelstärke |
| Zellmaße | „21,55 × 70,15 mm · 5 Ah“ | Durchmesser, Länge, Kapazität |
| Splitpack | „aus“, „+ 2S am Hauptplus“ | wie heute |
| Zuschnitt | „Standard“ | heutiger Abschnitt „Fishpaper“ |

Jede heutige Einstellung bleibt erreichbar; es entfällt nichts.

### 5.4 „angepasst“ und Zurücksetzen

- Eine Zeile trägt die Marke **angepasst**, wenn eines ihrer Felder vom Standard bzw. vom automatischen Wert abweicht.
- In der aufgeklappten Zeile steht dann „Zurück auf Standard“; das setzt nur die Felder dieser Zeile zurück.
- Die Brückenwahl zählt nicht als Anpassung: „Teilpacks“ zeigt dann nur die ungleiche Aufteilung, ohne Marke.
- „Zellmaße“ trägt bei eigener Zelle die Marke **eigene Zelle** und hat kein „Zurück auf Standard“;
  zurück geht es wie heute über die Zellauswahl.
- „Zurücksetzen“ oben setzt wie heute alles zurück.

### 5.5 Fehler bleiben sichtbar

Eine Zeile mit einem Feldfehler oder fehlendem Pflichtfeld (z. B. Abstandhalter) klappt von selbst auf und trägt
eine Fehlermarke. Kein Fehler darf in einer zugeklappten Zeile verschwinden.

### 5.6 Umsetzung

- `src/ui/config/ConfigPanel.tsx` (heute 521 Zeilen) wird zum Rahmen: Grundwerte + Liste.
- Je Zeile eine kleine Komponente unter `src/ui/config/rows/`.
- Kurzwerte und „angepasst“ je Zeile als reine Funktionen in `src/state/configSummary.ts`, mit Tests
  (nicht in `src/view`: die Lint-Regel des Projekts verbietet Importe von `src/view` nach `src/state`).
- `Section` in `src/ui/form/Fields.tsx` bekommt Marke und gesteuertes Aufklappen.

---

## 6. Ansichten und Fishpaper

- Stirnseitenansichten, Umrisse, Umwicklung, Stirn- und Zwischenlagen entstehen aus den Zellmittelpunkten und
  brauchen keine Sonderregel; sie bekommen Tests für die Trapezform.
- `src/view/topModel.ts`: Zelllinien der Draufsicht aus der **größeren** Lage statt aus Lage 0.
- `src/view/assumptions.ts`: bei unvollständiger Lage „Unvollständige Lage: 8 oben + 7 unten, kürzere Lage in den
  Mulden“ statt des Versatz-Satzes; „beginnend oben/unten“ nach tatsächlichem Start.

---

## 7. 30S1P: Bestätigung und Fixture

1. Nach Schritt 2 der Reihenfolge (§10) entsteht der Screenshot `docs/screenshots/30S1P.png`.
2. Der Nutzer prüft ihn gegen §1 Punkt 4.
3. **Erst nach seinem OK** wird `reference/fixtures/30S1P_21700.json` aus `src/core` erzeugt (gleiche Struktur wie
   die übrigen Fixtures, Konfiguration aus §3.4) und die Regel im Fachkonzept als [BESTÄTIGT] eingetragen.

Diese Fixture kommt nicht aus `reference/demo.ts`, weil die Referenz keine unvollständigen Lagen kennt.
Das wird im Fachkonzept §9 vermerkt.

---

## 8. Tests

- **Geometrie:** Zellpositionen, Breite, Höhe und Umriss aus §3.4; `wideLayer` oben und unten; Wabenversatz ohne Wirkung.
- **Verschaltung:** 30S1P nach der Tabelle in §3.4 (Gruppen, Polarität, Streifen, Brücke, Kosten, keine Warnung).
- **Gültigkeit im Kern:** 15 Zellen à 8 in Wabe gültig; 15 Zellen à 8 im Raster ungültig; 13 Zellen à 8 ungültig;
  Fehlertexte wortgleich zu heute.
- **Gültigkeit im Zustand:** 1 Zelle bei 2 Lagen, 4 Zellen bei 3 Lagen und 15 Zellen im Raster bei 2 Lagen ergeben
  die Meldung aus §4.3 und kein Layout.
- **Aufteilung:** jede Zeile der Tabelle in §4.2, dazu 19S (inaktiv), 3 Teilpacks (inaktiv), manuelle Aufteilung.
- **Presets:** die vier bestehenden liefern dieselbe `BatteryConfig` wie heute; 30S1P liefert die aus §3.4 (mit P50B).
- **S ändern:** 18 → 20 → 30 → 32 bei sonst Standardwerten ergibt nie einen Fehler.
- **Alte Stände:** alter 32S1P-Link → automatisch, 2 Lagen; alter Link mit 3 Lagen → automatisch, 3 Lagen;
  alter fehlerhafter Link (`series: 20` ohne passende Zellen je Lage) → weiterhin derselbe Fehler.
- **Anzeigetexte:** Kurzwerte und „angepasst“ je Zeile.
- **e2e:** fünf Presets mit Screenshot; Panel-Abläufe (Zeile aufklappen, Brücke umschalten, Fehler klappt Zeile auf).

Nach jedem Schritt: `npm test`, `npm run build`, `npm run lint` grün.

---

## 9. Bewusst nicht enthalten

- Unvollständige Lagen bei Raster oder 3+ Lagen.
- Anschlüsse im Spalt zwischen den Teilpacks.
- Unterschiedlich gestapelte Teilpacks (z. B. A groß unten, B groß oben).
- Brückenwahl bei 1, 3 oder 4 Teilpacks und bei ungerader Gruppenzahl im Hauptpack.
- „Ober-/Unterseite“ im Fishpaper bleibt ein Rechteck in Packbreite. Bei unvollständiger Lage ist die Seite mit
  der kürzeren Lage eine Zelle schmaler; das Teil wird dort von Hand gekürzt. Vermerk in den Annahmen (README).

---

## 10. Reihenfolge

1. **Kern:** unvollständige Lage (§3) mit Tests.
2. **Zustand:** Lagen, Brückenwahl, Presets, alte Stände (§4). Im **bestehenden** Panel nur das Nötigste, damit es
   bedienbar ist: Preset 30S1P, Feld „Lagen“, Brückenschalter, „Größere Lage“. Ansichten nach §6.
3. **Bestätigung 30S1P** durch den Nutzer, dann Fixture und Fachkonzept (§7).
4. **Panel-Umbau** nach §5.
5. **Abschluss:** `npm run e2e`, Screenshots ansehen, `docs/01_FACHKONZEPT.md`, `docs/03_UI_UND_AKZEPTANZ.md` und
   `README.md` nachziehen.
