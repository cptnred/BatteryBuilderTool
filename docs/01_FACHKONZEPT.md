# 01 – Fachkonzept: Akku-Konfiguration & Verschaltung

Dieses Dokument beschreibt die fachlichen Regeln, die mit dem Nutzer bereits **abgestimmt und bestätigt** sind.
Die Referenz-Implementierung dazu liegt in `reference/pack-core.ts`. Die bestätigten Skizzen liegen in
`reference/bestaetigte-skizzen/`. Die ausführbaren Checks stehen in `reference/selftest.ts`.

> **Wichtig:** Alle Regeln mit dem Vermerk **[BESTÄTIGT]** hat der Nutzer ausdrücklich freigegeben.
> Sie dürfen nicht „verbessert“ werden. Wenn etwas unklar ist oder sich widerspricht: nachfragen.

---

## 1. Begriffe

| Begriff | Bedeutung |
|---|---|
| **S / P** | Seriengruppen / parallele Zellen je Gruppe. 18S2P = 18 Gruppen à 2 parallele Zellen = 36 Zellen. |
| **Teilpack** | Physischer Zellblock. Standard: **2 Teilpacks** (vorne + hinten), die über eine **Brücke** verbunden sind. [BESTÄTIGT] |
| **Hauptpack** | Alle Teilpacks zusammen (ohne Booster). |
| **Splitpack / Booster** | Zusätzlicher kleiner Pack in eigenem Gehäuse, z. B. 20S2P = 18S2P (2 × 9S2P) + 2S2P-Booster. Standard: Booster hängt am Hauptplus. |
| **Lage** | Horizontale Zellreihe. Lage 0 = unten. |
| **Zellen je Lage** | Zellen nebeneinander in einer Lage (z. B. 9 bei 18S2P, 8 bei 32S1P). |
| **Wabe** | Lagen um eine halbe Zelle versetzt (Honeycomb). |
| **Raster** | Zellen gerade übereinander („Zellen parallel“). |
| **Stirnseite V / H** | V = vordere Stirnseite (zeigt nach vorne), H = hintere Stirnseite. Dort sitzen die Nickelstreifen. |
| **Knoten B0…BS** | Elektrischer Knoten = Balancer-Abgriff. B0 = Hauptminus, BS = Hauptplus, Bk = Verbindung zwischen Gruppe k und k+1. |

## 2. Koordinaten und Ansichten (Hauptfehlerquelle!)

- **Global**: `x` von **LINKS nach RECHTS**, so wie man es in der **Draufsicht mit VORNE oben** sieht.
  `z` von **UNTEN nach OBEN**, `y` von **VORNE nach HINTEN**.
- Die Zellen liegen **längs in y**. Ihre Pole zeigen also nach vorne (V) oder hinten (H).
- Die Teilpacks liegen **hintereinander in y**: Teilpack 0 ganz vorne, Teilpack N−1 ganz hinten.
  Dazwischen liegt eine Isolierlage (`packGap`).
- **Stirnseitenansichten werden immer von AUSSEN betrachtet:**
  - Vorderseite V (Blick von vorne): **gespiegelt**. Global rechts erscheint im Bild **links**.
  - Rückseite H (Blick von hinten): **nicht gespiegelt**.
  - In jeder Stirnseitenansicht stehen links und rechts große **R/L-Marker** für die echte Seite. [BESTÄTIGT]
- „Versatz nach links/rechts“ bezieht sich immer auf die **globalen** Seiten, nie auf die Bildschirmansicht.

## 3. Zellplatzierung

```
px   = D + Spalt_Reihe                      (Mittenabstand in der Reihe)
Wabe:   off  = px / 2
        diag = D + Spalt_Lage              (Mittenabstand zur Nachbarzelle der nächsten Lage)
        pz   = sqrt(diag² − off²)          (senkrechter Lagenabstand)
Raster: off  = 0, pz = D + Spalt_Lage
Breite  = (n−1)·px + off + D               (n = Zellen je Lage; off nur bei Wabe mit ≥2 Lagen)
Höhe    = (Lagen−1)·pz + D
Länge   = Zelllänge + 2·Nickelstärke
```

- **Modus „nur Fishpaper“:** Spalt_Reihe = Spalt_Lage = Fishpaper-Stärke (Standard **0,3 mm**, „Zelle an Zelle“).
- **Modus „Abstandhalter“:** Die Spalte werden **manuell** eingegeben (Mantel-zu-Mantel).
  Die Eingabe als Mittenabstand soll ebenfalls möglich sein (Umrechnung: Spalt = Mittenabstand − D).
  Zusätzlich gibt es den **Halter-Außenrand** in mm für die Umrisse.
- **Wabenversatz:** `offsetSide = 'L'` bedeutet, dass die ungeraden Lagen (1, 3, …) gegenüber Lage 0 nach **links** versetzt sind.
  Das ist der Standard. [BESTÄTIGT]
- **Alle Teilpacks werden identisch gestapelt.** Die Schrägen laufen dadurch in vorderem und hinterem Pack in dieselbe Richtung,
  und Vorder- bzw. Rückansichten von Pack A und Pack B sehen in Bezug auf die Zelllagerung gleich aus. [BESTÄTIGT]
- Zellzahl je Teilpack ÷ Zellen je Lage muss aufgehen. Sonst wird ein Fehler angezeigt.
- **Ausnahme – unvollständige Lage:** Bei Wabe mit genau 2 Lagen darf eine Lage eine Zelle kürzer sein
  (n = 2·m − 1, n ≥ 3, z. B. 15 = 8 + 7). Die kürzere Lage sitzt in den Mulden der größeren:
  große Lage x = R + i·px, kleine Lage x = R + px/2 + i·px, Breite = (m−1)·px + D. Der Wabenversatz hat dann
  keine Wirkung. Welche Lage die größere ist, ist wählbar (Standard: oben) und für alle Teilpacks gleich.
  Anfang und Ende des Teilpacks liegen beide auf der größeren Lage. [BESTÄTIGT]

## 4. Verschaltung innerhalb eines Teilpacks

1. **Serienrichtung** eines Teilpacks: `RL` (von rechts nach links) oder `LR`.
2. **Reihenfolge der Zellen** entlang der Serienrichtung:
   - **Wabe mit 1–2 Lagen:** strikt nach x sortiert. Das ergibt einen **Zickzack, bei dem jede Verbindung schräg ist**.
     Der Pack beginnt an der äußersten Zelle. [BESTÄTIGT: „immer schräg, angefangen von unten nach oben“]
   - **Raster, oder Wabe mit ≥3 Lagen:** spaltenweise Serpentine. Spalte 0 läuft unten→oben, Spalte 1 oben→unten und so weiter.
     Bei Wabe mit ≥3 Lagen wird ein Hinweis angezeigt.
3. **Gruppen:** Die Reihenfolge wird in Blöcke zu je P Zellen geteilt.
   - 2P, Wabe, 2 Lagen: Eine Gruppe ist **untere Zelle + schräg darüber liegende obere Zelle**. [BESTÄTIGT]
   - 1P, Wabe: jede Zelle ist eine eigene Gruppe, verbunden im Zickzack unten → oben → unten … [BESTÄTIGT]
4. **Polarität:** Gruppe j (0-basiert im Teilpack) hat ihr **Minus auf `startFace`**, wenn j gerade ist, sonst auf der Gegenseite.
5. **Nickelstreifen:**
   - Start-Streifen: Gruppe 0 auf ihrer Minusseite (Knoten = Pack-Anfang).
   - Serien-Streifen: Gruppe j + Gruppe j+1 auf der Plusseite von j (Knoten = s(j)).
   - End-Streifen: letzte Gruppe auf ihrer Plusseite.
6. **Prüfung:** Jede Gruppe muss zusammenhängend sein, und aufeinanderfolgende Gruppen müssen benachbart sein.
   Benachbart heißt: Mittenabstand ≤ max(px, diag) + 0,01. Bei Verstoß erscheint eine Warnung.

**Bestätigte Folge:** Bei Wabe nach links beginnt Pack A **unten rechts**, und die erste Verbindung geht schräg nach oben.
Pack B läuft von links nach rechts und beginnt deshalb an der äußersten Zelle links. Das ist die **obere** Zelle,
die erste Verbindung geht dort schräg nach unten. Bei 32S1P liegt Zelle 17 oben links und Zelle 32 (Plus) unten rechts. [BESTÄTIGT]

## 5. Lage von Hauptminus / Hauptplus – der Solver

Der Nutzer wählt:
- **Hauptminus**: Stirnseite (vorne/hinten) + Seite (links/rechts). Standard: **vorne rechts**. [BESTÄTIGT]
- **Hauptplus**: Stirnseite + Seite. Standard: **hinten rechts**. [BESTÄTIGT]

„Vorne“ ist die vordere Außenfläche des vordersten Teilpacks, „hinten“ die hintere Außenfläche des hintersten Teilpacks.
Die Kette beginnt am Teilpack auf der Minusseite.

Der Solver probiert für jeden Teilpack alle 4 Kombinationen aus Serienrichtung (LR/RL) und Startfläche (V/H), also 4^N Varianten.
Er wählt die Variante mit den geringsten Kosten:

| Abweichung | Kosten |
|---|---|
| Hauptminus auf falscher Seite / falscher Stirnseite | 1000 / 500 |
| Hauptplus auf falscher Seite / falscher Stirnseite | 990 / 490 (Minus wird bevorzugt exakt gesetzt) |
| Brücken-Ende liegt nicht auf der Innenfläche zum Nachbarpack | 100 je Ende |
| Brücke wechselt die Seite (quer über die Breite) | 50 |
| Teilpack beginnt oben statt unten | 1 |

Kosten ≥ 490 bedeuten eine Warnung: „Anschluss nicht direkt erreichbar, wird per Kabel umgelegt“.

**Wichtige Konsequenz (Physik, kein Bug):**
- **Ungerade** Gruppenzahl je Teilpack (18S → 9 je Pack): Pack A endet hinten, und die Brücke liegt **innen** zwischen den Packs (links).
- **Gerade** Gruppenzahl (20S → 10, 32S1P → 16): Pack A endet vorne. Die Brücke muss **außen herum** laufen,
  als Kabel links von A-vorne nach B-hinten. Die UI zeigt dazu einen Hinweis.
- Bei nur einem Teilpack mit gerader Gruppenzahl liegen Plus und Minus zwangsläufig auf derselben Stirnseite. Das führt zu einer Warnung.

**Brückenlage wählen** (2 Teilpacks, gerade Gruppenzahl im Hauptpack):
- Hauptminus und Hauptplus liegen immer außen. [BESTÄTIGT]
- Die Brückenlage folgt deshalb allein aus der Aufteilung: beide Teilpacks ungerade → innen, sonst außen.
- Standard ist die gleichmäßige Aufteilung. Wählt der Nutzer die andere Lage, wird (h+1) + (h−1) aufgeteilt
  (h = halbe Gruppenzahl), der größere Teilpack liegt vorne: 18S → 10 + 8 (außen), 20S → 11 + 9 (innen),
  30S → 16 + 14 (außen), 32S → 17 + 15 (innen).
- Bei 2P ist die gleichmäßige Aufteilung mit Brücke außen der Normalfall, weil ungleiche Teilpacks dort zwei Zellen
  unterschiedlich breit sind. Bei 1P darf die Brücke innen liegen (30S1P = 15 + 15). [BESTÄTIGT]

## 6. Splitpack / Booster

- Eingabe: Splitpack ja/nein, **S des Boosters** (z. B. 2) und Zellen je Lage des Boosters.
  Der Hauptpack hat dann S_gesamt − S_Booster.
- P ist für Hauptpack und Booster gleich.
- Aufteilung auf die Teilpacks: standardmäßig gleichmäßig, der Rest geht an die vorderen Packs.
  Manuell überschreibbar (z. B. 14 + 18), optional mit eigener Zellzahl je Lage pro Teilpack.
- Position des Boosters: am **Plus-Ende** (Standard) oder am Minus-Ende. Er sitzt in einem eigenen Gehäuse und ist per Kabel angebunden.
  In der Draufsicht wird er als separater, gestrichelter Block gezeichnet.
- Das Systemplus bzw. -minus liegt dann am Booster. Die Knoten laufen durch, z. B. B18 → Booster → B20.

## 7. Balancer-Abgriffe

- Knoten Bk mit allen Stellen, an denen er abgreifbar ist (Teilpack, Stirnseite, Streifen).
- Ein Brückenknoten erscheint an beiden Teilpacks und hat trotzdem **nur eine** Nummer.
- In der UI als Tabelle **und** als Beschriftung über den Streifen in den Stirnseitenansichten.

## 8. Kennzahlen

- Zellen gesamt, Spannung nominal (S × 3,6 V) und voll (S × 4,2 V).
- Kapazität = P × Zellkapazität, Energie = S × 3,6 × P × Ah.
- Maße je Teilpack (B × H × L) sowie Gesamtlänge = Summe der Längen + Zwischenlagen.
- Nickelstreifen-Stückliste: Anzahl Streifen je Zellzahl (z. B. 2-Zellen-, 4-Zellen-Streifen) und je Stirnseite.
- Hinweis bei > 32S: wird von gängigen VESC-Controllern nicht unterstützt (Info, kein Fehler).

## 9. Referenz-Ergebnisse (Fixtures)

`reference/fixtures/*.json` enthält pro Beispielkonfiguration:
- Gruppen mit Zell-IDs (`L<lage>-<index>`, Index 0 = global ganz links)
- Streifen, Brücken, Kette, Kosten und Hinweise
- Umrissumfang gerade/eingebogen

Die Tests im Projekt müssen gegen diese Fixtures laufen.
Die Fixtures für **18S2P, 32S1P, 20S2P und 20S2P-Split** entsprechen exakt den vom Nutzer bestätigten Skizzen.

`30S1P_21700.json` stammt aus `src/core`, nicht aus `reference/demo.ts`: Die Referenz kennt keine unvollständigen
Lagen. Der Nutzer hat das Ergebnis am Screenshot `docs/screenshots/30S1P.png` bestätigt (beide Teilpacks 8 oben + 7 unten,
Minus oben rechts vorne, Plus oben rechts hinten, Brücke B15 innen links). [BESTÄTIGT]
