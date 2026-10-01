# 02 – Fishpaper-Zuschnitte & PDF-Export (Maßstab 1:1)

Ziel: Aus der aktuellen Konfiguration entstehen **maßstabsgetreue Schnittvorlagen** für Fishpaper.
Man druckt sie aus (oder schickt sie an einen Schneideplotter), legt sie auf und schneidet aus.
Grundlage sind Zelldurchmesser, Zellabstände, Lagen und Teilpacks aus `01_FACHKONZEPT.md`.
Die Umriss-Mathematik ist in `reference/pack-core.ts` (`hullOutline`, `scallopOutline`, `outlineRadius`, `packOutline`) bereits umgesetzt.

---

## 1. Eingaben (Abschnitt „Fishpaper“ in der UI)

| Feld | Standard | Hinweis |
|---|---|---|
| Fishpaper-Stärke | 0,3 mm | Im Modus „nur Fishpaper“ zugleich der Zellspalt |
| Zellabstand-Modus | nur Fishpaper | oder „Abstandhalter“ → Spalt Reihe / Spalt Lage / Halter-Außenrand **manuell** (Pflichtfelder) |
| Umriss Stirnseiten | gerade | „gerade drumherum“ (konvexe Hülle) oder „eingebogen“ (folgt der Zellkontur) |
| Umriss Umwicklung | gerade | wie oben |
| Randzugabe Stirnseite | 0 mm | + = größer (zum Umschlagen), − = kleiner (bleibt innen) |
| Überlappung Umwicklung | 10 mm | Klebe-/Überlappungszone am Streifenende |
| Umschlag Umwicklung | 0 mm | Breitenzugabe je Seite, um auf die Stirnseite umzuschlagen; > 0 → Einschnitte (s. u.) |
| Umwicklung | je Teilpack | oder „gemeinsam um alle Teilpacks“ |
| Zwischenlage | einfach | einfach (1 Blatt zwischen Teilpacks) oder doppelt (je Stirnseite eines) |
| Aussparung Brücke | Randkerbe | keine / Randkerbe / Schlitz, Maße B × H (Standard 12 × 3 mm) |
| Teile auswählen | alle | Checkboxen je Teiltyp und Teilpack, Anzahl änderbar |

## 2. Teile

Für **jeden Teilpack** (und den Booster) werden erzeugt:

1. **Stirnseiten-Abdeckung außen**: vorne am vordersten, hinten am hintersten Teilpack, beim Booster beide Seiten.
   Umriss = Querschnitt des Teilpacks (gerade oder eingebogen) + Randzugabe.
   **Ausrichtung: Ansicht von außen**, also Vorderseite gespiegelt wie in der Stirnseitenansicht.
   Mit Orientierungsmarken „OBEN“ und R/L.
   Die Wabe ist nicht spiegelsymmetrisch (Parallelogramm), deshalb ist die Vorderabdeckung das Spiegelbild der Rückabdeckung.
   Das muss auf dem Teil stehen („Vorderseite – bedruckte Seite außen“).
2. **Zwischenlage** zwischen Teilpack i und i+1 (N−1 Stück, bei „doppelt“ 2 × (N−1)).
   Umriss wie Stirnseite. Bei einer **inneren Brücke** (siehe Fachkonzept §5) kommt an deren Position eine Kerbe oder ein Schlitz hinein.
   Die x-Position ist der Schwerpunkt der Brückenzellen, die Kerbe liegt am nächstgelegenen Rand.
3. **Seitenteile links/rechts**: Rechteck Höhe × Länge des Teilpacks (+ Randzugabe).
4. **Ober-/Unterseite** (optional, Standard aus): Rechteck Breite × Länge.
5. **Umwicklung**: Rechteck
   - Länge = Umfang (gerade/eingebogen) + Überlappung
   - Breite = Teilpacklänge + 2 × Umschlag (bei „gemeinsam“: Summe der Längen + Zwischenlagen + 2 × Umschlag)
   - **Biegemarken**:
     - bei „gerade“ die Bogenbereiche (`Outline.marks` mit kind `bend`, Start/Ende) als dünne, gestrichelte Querlinien mit hellgrauer Fläche;
     - bei „eingebogen“ Falzlinien (kind `fold`) an jeder Stelle, an der das Papier in den Zwischenraum zweier Zellen einknickt.
   - Startpunkt der Abwicklung: unten, rechts. Ein Pfeil zeigt die Wickelrichtung (gegen den Uhrzeigersinn in der Rückansicht).
   - Bei Umschlag > 0: Einschnitte von der Kante bis zur Knicklinie an jeder Falzmarke (eingebogen) bzw. alle 10 mm im Bogenbereich (gerade),
     damit sich der Umschlag an die Rundungen anlegt.

Umfang und Radius:
- Neutrale Faser: r = Zellradius + Fishpaper-Stärke / 2. Bei Abstandhaltern gilt r = Zellradius + Halter-Außenrand.
- Bei „eingebogen“ ist r mindestens der halbe Nachbarabstand + 0,05 mm, damit die Kontur zusammenhängt.
- Werte für 18S2P / 21700 / 0,3 mm: gerade **458,8 mm**, eingebogen **647,3 mm** je Teilpack. Das dient als Test-Soll, siehe Fixtures.

## 3. Vorschau im Browser

- Eigener Tab „Fishpaper“: alle Teile als SVG **in echten mm** (viewBox in mm), mit Zoom und Option „1:1 am Bildschirm“.
  Die Bildschirm-Kalibrierung erfolgt über eine Kreditkarte mit 85,6 mm, die der Nutzer per Slider abgleicht.
- Stückliste: Teilname, Anzahl, Maße (B × H bzw. Länge × Breite), Fläche; Summe Fishpaper in cm².

## 4. PDF-Export (Kernanforderung)

- Bibliothek: **jsPDF** mit `unit: 'mm'`. Alternativ `pdf-lib`, wenn es sauberer ist. Keine Rasterung: alle Konturen als **Vektorpfade**.
- **Maßstab exakt 1:1.** Auf **jeder Seite** stehen:
  - ein Kontrollquadrat 50 × 50 mm und ein 100-mm-Lineal mit mm-Teilung,
  - der Hinweis „In **Originalgröße / 100 %** drucken – NICHT ‚An Seite anpassen‘. Kontrollquadrat nachmessen.“
- Seitenformat wählbar: A4 (Standard), A3, Letter, sowie **„Plotter: eine Seite je Teil in Teilegröße“**. Hoch- oder Querformat wählt das Programm automatisch.
- Rand: 10 mm. Die Teile werden einfach verschachtelt (Regal-Packing, Drehung um 90° erlaubt), mit 5 mm Abstand.
- **Übergroße Teile** (z. B. die Umwicklung mit ~460 mm):
  - Option A (Standard): **Kacheln** über mehrere Seiten mit 15 mm Überlappung,
    Passkreuzen und Beschriftung „Umwicklung Pack A – Blatt 2/3, an Marke ◆2 ansetzen“.
  - Option B: Streifen **in n Stücke teilen** (jedes mit Überlappungszugabe) und normal platzieren.
- Linienarten: **Schnitt** = durchgezogen schwarz 0,25 mm, **Falz/Biegung** = gestrichelt 0,2 mm, **Markierung** (Brücke, Anschluss) = dünn grau.
  Beschriftung im Teil, 3 mm Schrift, darf keine Schnittlinie kreuzen.
- Kopfzeile je Seite: Konfiguration (z. B. „18S2P · 21700 · Wabe links · 0,3 mm“), Datum, Seite x/y.
- Dateiname: `fishpaper_<S>S<P>P_<zelle>_<datum>.pdf`.

## 5. Weitere Exporte

- **SVG** (Einheit mm, `width="…mm"`), direkt für Schneideplotter (Cricut, Silhouette, Laser). Cut- und Fold-Linien in getrennten Gruppen/Ebenen.
- **DXF** (R12, LWPOLYLINE/LINE, Einheit mm) – Stufe 2, optional.
- Verschaltungsansichten als **PNG/SVG** und als druckbarer „Bauplan“ (Draufsicht, Stirnseiten, Balancer-Tabelle, Streifen-Stückliste) – Stufe 2.

## 6. Tests für diesen Teil

- Die Umfänge für alle Fixtures stimmen auf ±0,1 mm.
- Das PDF enthält auf jeder Seite ein Quadrat, dessen Pfad exakt 50 mm (= 141,73 pt) breit ist. Das wird im Unit-Test über die erzeugten Zeichenbefehle bzw. die Seitenmaße geprüft.
- Die Kachelung deckt das Teil lückenlos ab: Vereinigung der Kachelbereiche ⊇ Teilrechteck, Überlappung ≥ 15 mm.
- Eine gespiegelte Vorderabdeckung ist das Spiegelbild der Rückabdeckung (Test auf Koordinaten).
