# 07 – Plan: Booster in Einzelpacks teilen

Stand: 2026-10-08. Die Entscheidungen in §1 hat der Nutzer in einer Rückfragerunde getroffen oder ausdrücklich freigegeben.
Sie gelten wie **[BESTÄTIGT]**-Regeln: nicht „verbessern“, bei Widersprüchen nachfragen.

---

## 0. Ausgangslage

Der Booster ist heute ein einzelner Block. `src/core/solver.ts` baut ihn fest mit Serienrichtung `LR` und
Startfläche `V`, ohne Suche. Er hat den Schlüssel `BOOST`, hängt per Kabel am Hauptpack und bekommt in der
Zustandsschicht dieselbe Lagenzahl wie der Teilpack, an dem er hängt (Plan 04 §3).

Für den Hauptpack gilt seit Plan 06: Die Anschlüsse liegen außen, die Brückenlage folgt aus der Gruppenzahl je
Teilpack. Dieselbe Rechnung trägt für einen geteilten Booster. Am Solver nachgeprüft, mit einem kleinen Hauptpack
als Stellvertreter (Start vorne links, ohne Wunsch für die Seite des Endes):

| Booster | Aufteilung | Ergebnis |
|---|---|---|
| 2S | 1 + 1 | Brücke innen |
| 4S | 2 + 2 | Brücke außen |
| 4S | 3 + 1 | Brücke innen |
| 6S | 3 + 3 | Brücke innen |
| 6S | 4 + 2 | Brücke außen |
| 4S | 2 + 1 + 1 | erste Brücke außen, zweite innen |

---

## 1. Entscheidungen des Nutzers

1. **Die Einzelpacks des Boosters stehen hintereinander**, Stirnseite an Stirnseite in einem Gehäuse, mit einer
   Isolierlage dazwischen – wie die Teilpacks des Hauptpacks.
2. **Die beiden Anschlüsse des Boosters liegen immer außen** (Kabel zum Hauptpack und System-Plus bzw. -Minus).
   Die Brückenlage folgt deshalb aus der Aufteilung und wird wie im Hauptpack über (h+1) + (h−1) gewählt.
   Ein 2S-Booster als 1 + 1 hat die Brücke immer innen.
3. **Höchstens 4 Einzelpacks**, wie im Hauptpack.
4. **Der Booster bekommt eine eigene Lagenzahl.** Standard bleibt die Regel aus Plan 04 §3 (wie der Teilpack, an dem
   er hängt).
5. **Keine manuelle Eingabe „S je Einzelpack“.** Die Aufteilung kommt aus Anzahl und Brückenwahl.
6. **Die Seite der Booster-Anschlüsse ist nicht wählbar.** Die Kette des Boosters beginnt links an Stirnseite 1,
   wie heute.
7. **Abnahme:** Zwei Screenshots prüft der Nutzer, bevor daraus Fixtures und [BESTÄTIGT]-Regeln werden (§8).

---

## 2. Harte Randbedingungen

- `reference/fixtures/*.json` (12 Dateien) und `reference/pack-core.ts` bleiben unverändert.
  `tests/fixtures.test.ts` und `tests/reference-equivalence.test.ts` bleiben unverändert grün.
- **Ein Booster mit 1 Einzelpack rechnet exakt wie bisher:** Schlüssel `BOOST`, Bezeichnung `Booster 2S2P`,
  Position −1, Richtung `LR`, Start `V`, dieselben Gruppen, Streifen, Brücken, dieselbe Kette, dieselben Kosten und
  **wortgleiche** Fehler- und Hinweistexte. Die IDs der Fishpaper-Teile bleiben (`face-V-BOOST`, `side-BOOST`,
  `wrap-BOOST`), ebenso die Draufsicht. Einzige Ausnahme ist die Warnung zu mehr als 2 Wabenlagen (§3.5).
- `BoosterSpec` bekommt nur optionale Felder; fehlt eines, gilt der Standard. `SubPack` bekommt keine neuen Felder.
- `Layout.cost` bleibt die Kostensumme des Hauptpacks. Die Kette des Boosters zählt nicht mit und löst keine
  Kostenwarnung aus.
- Das Speicherformat bleibt bei Version 2 (`c2=`, `version: 2`, `akku-konfigurator:v2`). Neue Felder haben
  Standardwerte; jeder bestehende Link zeigt denselben Akku wie vorher.
- `src/core` bleibt frei von React/DOM. UI-Komponenten rechnen nicht selbst; Ableitungen und Anzeigetexte des
  Panels liegen in `src/state`, die Zeichenmodelle in `src/view`.
- Zustandstests, die sich durch die neuen Felder ändern (z. B. der Vergleich des ganzen `booster`-Objekts), werden
  auf die neuen, konkreten Werte umgestellt. Fixtures werden nicht angepasst.

---

## 3. Kern (`src/core`)

### 3.1 Typen

```ts
export interface BoosterSpec {
  series: number;
  cellsPerRow: number;
  position: 'plus' | 'minus';
  /** Anzahl Einzelpacks, Stirnseite 1 -> 2. Fehlt der Wert, gilt 1. */
  subPacks?: number;
  /** S je Einzelpack. Fehlt der Wert oder passt die Länge nicht: gleichmäßig, Rest nach vorne. */
  seriesSplit?: number[];
  /** Zellen je Lage je Einzelpack. Fehlt der Wert oder passt die Länge nicht: cellsPerRow für alle. */
  cellsPerRowSplit?: number[];
}
```

### 3.2 Schlüssel, Bezeichnungen, Reihenfolge

| | 1 Einzelpack | k > 1 Einzelpacks |
|---|---|---|
| Schlüssel | `BOOST` | `BOOST0` … `BOOST(k−1)` |
| Bezeichnung | `Booster 2S2P` | `Booster A (1S2P)`, `Booster B (1S2P)` … |
| Kurzname in Texten | „Booster“ | „Booster A“, „Booster B“ … |
| `position` | −1 | 0 … k−1 (Stirnseite 1 → 2) |
| `role` | `booster` | `booster` |

- `Layout.packs`: Hauptpack vorne → hinten, danach die Einzelpacks des Boosters 0 → k−1.
- `Layout.chain`: Serienreihenfolge aller Schlüssel, z. B. `['P0', 'P1', 'BOOST0', 'BOOST1']`.
- Stirnseite `V` eines Einzelpacks heißt in der Anzeige „Stirnseite 1“, `H` „Stirnseite 2“ (wie heute beim Booster).

### 3.3 Kette des Boosters

Die Einzelpacks laufen immer in der Reihenfolge 0 → k−1 durch, unabhängig von `mainMinus.end`.
Die Suche ist dieselbe wie im Hauptpack (4^k Varianten aus Richtung und Startfläche, erste Variante gewinnt bei
Gleichstand). Die Kosten:

| Abweichung | Kosten |
|---|---|
| Kette beginnt nicht links | 1000 |
| Kette beginnt nicht an Stirnseite 1 des ersten Einzelpacks | 500 |
| Kette endet nicht an Stirnseite 2 des letzten Einzelpacks (nur k > 1) | 490 |
| Brücken-Ende liegt nicht auf der Innenfläche zum Nachbarpack | 100 je Ende |
| Brücke wechselt die Seite | 50 |
| Einzelpack beginnt oben statt unten | 1 |

Für die Seite des Kettenendes gibt es keinen Wunsch. Bei k = 1 gewinnt deshalb immer `LR` / `V` (alle anderen
Varianten kosten mindestens 500) – das heutige Ergebnis.

Gruppennummern: Booster am Hauptplus beginnt bei `S gesamt − S Booster`, am Hauptminus bei 0; der Hauptpack beginnt
dann bei `S Booster`.

### 3.4 Brücken und Kabel

- Brücken zwischen Einzelpacks sind `inner` oder `outer`, mit derselben Regel wie im Hauptpack.
  Eine `outer`-Brücke erzeugt den bestehenden Hinweis mit denselben Worten
  („Brücke BOOST0→BOOST1 (B18) liegt nicht zwischen den Packs: gerade Gruppenzahl → Kabel/Brücke außen herum (rechts).“).
- Das Kabel (`cable`) verbindet am Hauptplus den letzten Teilpack der Hauptkette mit dem **ersten** Einzelpack,
  am Hauptminus den **letzten** Einzelpack mit dem ersten Teilpack der Hauptkette. Knoten wie heute.
- `Layout.bridges` steht in Serienreihenfolge: am Hauptplus Hauptbrücken, Kabel, Booster-Brücken; am Hauptminus
  Booster-Brücken, Kabel, Hauptbrücken. Bei k = 1 ist das die heutige Liste.

### 3.5 Prüfung

Bestehende Meldungen bleiben wortgleich. Neu:

| Bedingung | Meldung (Fehler) |
|---|---|
| `subPacks` keine ganze Zahl 1–4 | „Booster: 1–4 Einzelpacks erlaubt.“ |
| `series < subPacks` | „Booster: zu wenige Seriengruppen für die Anzahl der Einzelpacks.“ |
| Summe der Aufteilung ≠ `series` | „Booster: Aufteilung 3+2 ergibt nicht 4S.“ |
| ein Einzelpack mit weniger als 1 Gruppe | „Booster: jeder Einzelpack braucht mindestens 1 Seriengruppe.“ |
| k > 1, Zellzahl passt nicht zu Zellen je Lage | „Booster-Einzelpack i: n Zellen lassen sich nicht in volle Lagen à m aufteilen.“ |
| k > 1, `cellsPerRowSplit` enthält keine ganze Zahl ≥ 1 (0 = Standard) | „Booster: Zellen je Lage je Einzelpack müssen ganze Zahlen ≥ 1 sein (0 = Standard).“ |

Bei k = 1 bleibt für den letzten Fall die heutige Meldung „Booster: Zellzahl passt nicht zu Zellen je Lage.“
Die unvollständige Lage (Plan 06 §3.1) gilt für jeden Einzelpack.

Die Warnung „Wabe mit mehr als 2 Lagen …“ erscheint jetzt auch, wenn nur ein Einzelpack des Boosters mehr als
2 Lagen hat. Sie erscheint weiterhin höchstens einmal.

### 3.6 Prüfzahlen

Mit `DEFAULT_CONFIG` (Ø 21,4 mm, Fishpaper 0,3 mm → px = 21,7), Wabe links, 2 Lagen.

**A – 18S2P + 2S2P als 1 + 1**
`{ ...DEFAULT_CONFIG, series: 20, booster: { series: 2, cellsPerRow: 1, position: 'plus', subPacks: 2 } }`

| | Booster A | Booster B |
|---|---|---|
| Schlüssel, S | `BOOST0`, 1S | `BOOST1`, 1S |
| Richtung, Start → Ende | LR, V/L → H/R | RL, V/R → H/L |
| Gruppe | 19 = `L1-0` + `L0-0`, Minus an V | 20 = `L0-0` + `L1-0`, Minus an V |
| Breite × Höhe | 32,25 × 40,19 mm | 32,25 × 40,19 mm |

Brücke `BOOST0` → `BOOST1`: `inner`, Knoten 19, H/R → V/R. Kabel `P1` → `BOOST0`, Knoten 18.
Kette `P0, P1, BOOST0, BOOST1`. Hauptpack, Kosten und Hinweise wie in der Fixture 20S2P-Split.

**B – 16S2P + 4S2P als 2 + 2**
`{ ...DEFAULT_CONFIG, series: 20, cellsPerRow: 8, booster: { series: 4, cellsPerRow: 2, position: 'plus', subPacks: 2 } }`

| | Booster A | Booster B |
|---|---|---|
| Schlüssel, S | `BOOST0`, 2S | `BOOST1`, 2S |
| Richtung, Start → Ende | LR, V/L → V/R | RL, H/R → H/L |
| Gruppen | 17 = `L1-0` + `L0-0` (Minus V), 18 = `L1-1` + `L0-1` (Minus H) | 19 = `L0-1` + `L1-1` (Minus H), 20 = `L0-0` + `L1-0` (Minus V) |
| Breite | 53,95 mm | 53,95 mm |

Brücke `BOOST0` → `BOOST1`: `outer`, Knoten 18, V/R → H/R, mit Hinweis. Kabel `P1` → `BOOST0`, Knoten 16.

**C – 16S2P + 4S2P als 3 + 1** (wie B, dazu `seriesSplit: [3, 1], cellsPerRow: 3, cellsPerRowSplit: [3, 1]` im Booster)

| | Booster A | Booster B |
|---|---|---|
| Richtung, Start → Ende | LR, V/L → H/R | RL, V/R → H/L |
| Gruppen | 17, 18, 19 | 20 |
| Breite | 75,65 mm | 32,25 mm |

Brücke `inner`, Knoten 19, H/R → V/R. Kein Hinweis zur Brücke.

**D – Booster am Hauptminus**, sonst wie A: Kette `BOOST0, BOOST1, P0, P1`; Booster-Gruppen 1 und 2,
Hauptpack ab Gruppe 3; Brücke im Booster Knoten 1; Kabel `BOOST1` → erster Teilpack der Hauptkette, Knoten 2.

### 3.7 Umsetzung

- `src/core/types.ts`: optionale Felder in `BoosterSpec`.
- `src/core/validate.ts`: Hilfsfunktionen für Anzahl, Aufteilung und Zellen je Lage der Einzelpacks; Prüfungen §3.5.
- `src/core/solver.ts`: Die Kettensuche wird eine eigene Funktion und läuft einmal für den Hauptpack (unverändert)
  und einmal für den Booster (§3.3). Zusammensetzen von Packs, Kette und Brücken nach §3.2 und §3.4.
- `src/core/stats.ts`: `dimensions` liefert zusätzlich das Gesamtmaß des Boosters (max. Breite × max. Höhe ×
  Summe der Längen + Zwischenlagen), wenn es einen Booster gibt.
- `src/core/wiring.ts`, `src/core/geometry.ts`: keine Änderung.

---

## 4. Zustand (`src/state`)

### 4.1 Neue Felder in `ConfigState.booster`

| Feld | Standard | Bedeutung |
|---|---|---|
| `subPacks` | 1 | Einzelpacks im Booster (1–4) |
| `bridge` | `'auto'` | `'auto' \| 'inner' \| 'outer'`, wie im Hauptpack |
| `layersManual` | false | „Lagen im Booster selbst festlegen“ |
| `layers` | 2 | Lagen je Einzelpack (1–6); wirkt nur mit `layersManual` |

`series` und `position` bleiben. Fehlen Felder in einem gespeicherten Stand oder in einem Patch, gelten die
Standardwerte.

### 4.2 Aufteilung

`bridgeState(booster.series, booster.subPacks, booster.bridge)` – dieselbe Funktion wie im Hauptpack:

```
Einzelpacks ≠ 2  oder  Booster-S ungerade  oder  Booster-S < 4   → gleichmäßig, Rest nach vorne; Schalter inaktiv
sonst h = Booster-S / 2:
  natürlich = innen, wenn h ungerade; außen, wenn h gerade
  bridge = 'auto' oder = natürlich                               → h + h
  bridge ≠ natürlich                                             → (h + 1) + (h − 1)
```

Klick auf die natürliche Lage setzt `bridge` auf `'auto'`, Klick auf die andere setzt sie ausdrücklich.

### 4.3 Lagen und Zellen je Lage

```
Lagen = booster.layers                                   wenn layersManual
      = Lagenzahl des Teilpacks, an dem der Booster hängt   sonst (wie heute)
je Einzelpack i:  n_i = S_i × P,  m_i = ceil(n_i / Lagen)
gültig, wenn  n_i = m_i × Lagen   oder   die unvollständige Lage gilt (Plan 06 §3.1)
```

Geht es nicht auf, erscheint die Meldung an der Zeile „Splitpack“ und es gibt kein neues Layout:

- 1 Einzelpack, Lagen automatisch: die heutige Meldung, wortgleich.
- sonst: „Booster A: 1 Zellen (1S1P) lassen sich nicht auf 2 Lagen aufteilen.“ (bei 1 Einzelpack ohne Buchstaben).

Folgefehler des Kerns zum Booster werden wie heute ausgeblendet.

### 4.4 `toBatteryConfig`

- `booster.cellsPerRow` = Wert des ersten Einzelpacks (bei Fehler `NaN`, wie heute).
- `booster.subPacks` nur, wenn > 1. `booster.seriesSplit` nur, wenn die Aufteilung von „gleichmäßig, Rest nach vorne“
  abweicht. `booster.cellsPerRowSplit` nur, wenn sich die Einzelpacks unterscheiden.
- Das Preset 20S2P-Split liefert damit **exakt dieselbe** `BatteryConfig` wie heute.

### 4.5 Gespeicherte Stände

`mergeWithDefaults` prüft die neuen Felder (`subPacks` ganze Zahl 1–4, `bridge` einer der drei Werte, `layers`
ganze Zahl 1–6, `layersManual` boolesch) und setzt sonst den Standard. Keine neue Formatversion.

### 4.6 Anzeigetexte (`src/state/configSummary.ts`)

Kurzwert der Zeile „Splitpack“: „aus“, „+ 2S am Hauptplus“ (1 Einzelpack, wie heute),
„+ 4S (2 + 2) am Hauptplus“ (geteilt).

Schalter „Brücke im Booster“:

| Zustand | markiert | Text darunter |
|---|---|---|
| wählbar, natürlich | wirksame Lage | „gleichmäßig 2 + 2“ |
| wählbar, andere Wahl | wirksame Lage | „ungleich 3 + 1 – Einzelpacks unterschiedlich breit“ |
| 2 Einzelpacks, ungerade | außen | „3S: ungerade Gruppenzahl, Brücke liegt außen um einen Einzelpack“ |
| 2 Einzelpacks, 2S | innen | „2S: zu wenige Gruppen für eine andere Aufteilung“ |
| 3 oder 4 Einzelpacks | – | „nur bei 2 Einzelpacks wählbar“ |

Zeile zu den Lagen: bei 1 Einzelpack wie heute („Booster: 2 Lagen wie Pack B (hinten) → 2 Zellen je Lage“);
geteilt mit den Werten je Einzelpack, gleiche zusammengefasst („→ 2 Zellen je Lage“, „→ 3 / 1 Zellen je Lage“,
„→ 1 Zelle je Lage“); mit eigener Lagenzahl ohne den Verweis auf den Teilpack („Booster: 1 Lage → 2 Zellen je Lage“).

---

## 5. Bedienung (`src/ui`)

Zeile „Splitpack“, aufgeklappt:

```
☑ Booster (eigenes Gehäuse)
Booster S                [ 4 ]
  Hauptpack = 20 − 4 = 16S · gesamt = (8 + 8) + 4 = 20S
Einzelpacks im Booster   [ 2 ]
Brücke im Booster        [ innen ] [ außen ]
  gleichmäßig 2 + 2
☐ Lagen im Booster selbst festlegen
  Booster: 2 Lagen wie Pack B (hinten) → 2 Zellen je Lage
Booster-Position         [ am Hauptplus ] [ am Hauptminus ]
```

- „Einzelpacks im Booster“: 1–4, höchstens Booster-S.
- „Brücke im Booster“ erscheint ab 2 Einzelpacks. Es ist derselbe Schalter wie bei den Grundwerten.
- Mit Haken bei „Lagen im Booster selbst festlegen“ erscheint das Feld „Lagen im Booster“ (1–6).
- Marke „angepasst“, „Zurück auf Standard“ und die Fehlermarke der Zeile bleiben wie heute; „Zurück auf Standard“
  setzt auch die neuen Felder zurück.

---

## 6. Ansichten (`src/view`, `src/ui`)

- **Draufsicht:** Die Einzelpacks stehen als gestrichelte Blöcke hintereinander, mit demselben sichtbaren Abstand
  wie die Teilpacks. Der Booster als Ganzes steht wie heute rechtsbündig zum Hauptpack. Ungleich breite Einzelpacks
  stehen untereinander so bündig wie im Hauptpack eingestellt; die Auswahl „Bündig“ erscheint auch dann, wenn nur
  die Einzelpacks des Boosters ungleich breit sind. Brücken im Booster werden wie im Hauptpack gezeichnet
  (innen: kurzer Balken; außen: Kabel um die Seite).
  Bei k > 1 setzt das Kabel am tatsächlichen Anfang (Hauptplus) bzw. Ende (Hauptminus) der Booster-Kette an, die
  SYSTEM-Fahne am anderen Ende, jeweils auf der tatsächlichen Seite. Bei k = 1 bleibt die Zeichnung unverändert.
  Ein schmaler Einzelpack (schmaler als 4,5 Schrifthöhen der Draufsicht) trägt nur den Kurznamen („Booster B“) und
  keine Zeile „Serienrichtung“; der Pfeil bleibt.
- **Stirnseiten:** je Einzelpack eine Zeile mit Stirnseite 1 und 2. Titel z. B.
  „Booster A (1S2P) – Stirnseite 1 (Blick von außen)“.
- **Anschlusstexte:** „EINGANG von Pack B + (B18)“ am ersten, „SYSTEM + (B20)“ am letzten Einzelpack;
  dazwischen „BRÜCKE → Booster B (B19)“ und „BRÜCKE ← Booster A (B19)“.
- **Annahmen:** Die bestehenden Sätze zu Brücken gelten auch für den Booster
  („Brücke B19 innen zwischen Booster A und Booster B, rechts.“). Dazu bei k > 1:
  „Booster: 2 Einzelpacks hintereinander in einem Gehäuse, Isolierlage dazwischen.“
  Die Sätze zur Verschaltung („Verbindungen immer schräg …“, „2P-Gruppe = …“) beschreiben den Hauptpack. Hat der
  Booster bei Wabe eine andere Lagenzahl als der Teilpack, an dem er hängt (1 Lage, 2 Lagen, ab 3 Lagen), kommt
  ein Satz dazu: „Booster abweichend: 3 Lagen, Verschaltung als Spalten-Serpentine (Spalte für Spalte).“,
  „Booster abweichend: 2 Lagen, Verbindungen schräg (Zickzack).“ bzw.
  „Booster abweichend: 1 Lage, alle Zellen nebeneinander.“ (Nachtrag aus der Durchsicht.)
- **Stücklisten:** Maße, Nickelstreifen und Balancer-Abgriffe je Einzelpack; die Knoten laufen durch. Bei k > 1
  zusätzlich die Zeile „Booster gesamt (inkl. 0,5 mm Zwischenlage)“, gebildet wie „Hauptpack gesamt“.

---

## 7. Zuschnitt (`src/fishpaper`)

Für die Einzelpacks des Boosters gelten dieselben Teile wie für die Teilpacks:

| Teil | 1 Einzelpack (wie heute) | k > 1 |
|---|---|---|
| Stirnseiten außen | `face-V-BOOST`, `face-H-BOOST` | `face-V-BOOST0`, `face-H-BOOST(k−1)` |
| Zwischenlagen | – | `inter-BOOST0-BOOST1` …, mit Brückenausschnitt bei Brücke innen |
| Seitenteile, Ober-/Unterseite | `side-BOOST`, `topbottom-BOOST` | je Einzelpack |
| Umwicklung je Pack | `wrap-BOOST` „Umwicklung Booster“ | `wrap-BOOST0` „Umwicklung Booster A“ … |
| Umwicklung gesamt (`wrapMode: 'combined'`) | wie „je Pack“ | `wrap-BOOSTALL` „Umwicklung Booster gesamt“ |

Die Zwischenlage heißt „Zwischenlage Booster A | Booster B“ und trägt „Blick von Stirnseite 1“ statt
„Blick von vorne“. Die Reihenfolge in der Teileliste bleibt; die
Zwischenlagen des Boosters folgen auf die des Hauptpacks. PDF- und Laser-Export brauchen keine Sonderregel.

---

## 8. Abnahme und Fixtures

1. Nach Schritt 3 der Reihenfolge (§11) entstehen zwei Screenshots:
   `docs/screenshots/booster-2x1S2P.png` (Prüfzahlen A) und `docs/screenshots/booster-2x2S2P.png` (Prüfzahlen B).
2. Der Nutzer prüft beide.
3. **Erst nach seinem OK** entstehen `reference/fixtures/20S2P_split_18S2P+2x1S2P_21700.json` und
   `reference/fixtures/20S2P_split_16S2P+2x2S2P_21700.json` aus `src/core` (gleiche Struktur wie die übrigen
   Fixtures), und die Regeln aus §1 werden im Fachkonzept §6 als [BESTÄTIGT] eingetragen.

Die Fixtures kommen nicht aus `reference/demo.ts`, weil die Referenz keinen geteilten Booster kennt.
Das wird im Fachkonzept §9 vermerkt.

---

## 9. Tests

- **Kern:** Prüfzahlen A–D (Schlüssel, Bezeichnungen, Richtung, Flächen, Seiten, Gruppen, Polarität, Brücken, Kabel,
  Kette, Maße). `Layout.cost` gleich wie mit ungeteiltem Booster. Booster mit `subPacks: 1` ergibt dasselbe Layout
  wie ohne das Feld. Jede Meldung aus §3.5. Warnung „mehr als 2 Lagen“ nur durch den Booster. Balancer-Abgriffe
  B0 … B20 lückenlos, Brückenknoten an beiden Einzelpacks mit einer Nummer.
- **Zustand:** jede Zeile der Tabelle in §0 über `booster.bridge`; Lagen automatisch und eigen; beide Fehlertexte
  aus §4.3; `toBatteryConfig` gibt die neuen Felder nur bei Abweichung mit; Preset 20S2P-Split unverändert und
  weiterhin als Preset erkannt; gespeicherter Stand ohne die neuen Felder; ungültige Werte der neuen Felder.
- **Anzeigetexte:** Kurzwert, jede Zeile der Tabelle in §4.6, Text zu den Lagen.
- **Ansichten:** Draufsicht (Lage der Blöcke, Art der Brücke, Kabelenden, Seite der SYSTEM-Fahne), Anschlusstexte,
  Annahmen, Titel der Stirnseiten; bei k = 1 die bestehenden Tests unverändert.
- **Zuschnitt:** Teileliste für A (IDs, Namen, Anzahl), Umwicklung gesamt, Brückenausschnitt in der Zwischenlage;
  bei k = 1 dieselben IDs wie heute.
- **e2e:** Booster einschalten, S = 4, 2 Einzelpacks, Brücke umschalten; eigene Lagenzahl; die zwei Screenshots.

Nach jedem Schritt: `npm test`, `npm run build`, `npm run lint` grün.

---

## 10. Bewusst nicht enthalten

- Manuelle Eingabe „S je Einzelpack“ oder „Zellen je Lage je Einzelpack“.
- Wählbare Seite oder Stirnseite der Booster-Anschlüsse.
- Einzelpacks nebeneinander oder in getrennten Gehäusen.
- Brückenwahl bei 3 oder 4 Einzelpacks und bei ungerader Gruppenzahl im Booster.
- Eigene „Größere Lage“ und eigene Isolierlagen-Stärke für den Booster; es gelten die Werte des Hauptpacks.
- Neue Presets.

---

## 11. Reihenfolge

1. **Kern** (§3) mit Tests.
2. **Zustand und Zeile „Splitpack“** (§4, §5).
3. **Ansichten und Zuschnitt** (§6, §7).
4. **Abnahme** durch den Nutzer, dann Fixtures und Fachkonzept (§8).
5. **Abschluss:** `npm run e2e`, Screenshots ansehen, `docs/01_FACHKONZEPT.md`, `docs/03_UI_UND_AKZEPTANZ.md` und
   `README.md` nachziehen.
