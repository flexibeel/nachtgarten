# Handschrift: „Ein Druck aus dem Nachtgarten“

Jede Einheit wird ein kleiner, signierter Druck. Kein Sport-Dashboard, sondern ein Blatt
aus einer Druckwerkstatt: **eine Linie, eine Zahl, ein Siegel.** Die Bilder sollen so ruhig
und eigen aussehen, dass jemand fragt: „Welche App ist das?“ – ohne dass wir es ihm sagen.

## Die fünf Zeichen

1. **Die eine Linie.** Die Route ist ein einziger Pinselstrich: dünn beim Ansetzen und
   Abheben, dazwischen atmet er mit dem Tempo (langsamer = etwas mehr Druck). Nie zwei
   Linien, nie Pfeile, nie Kartenkacheln. Start ist ein offener Ring, das Ziel ein Punkt in Altrosa.
2. **Die Ziffer in der Serife.** Zahlen stehen in *Instrument Serif*, groß und leicht
   eng gesetzt; Einheiten (*km*, */km*, *kg*) kursiv und gedämpft daneben, wie eine
   Bleistiftnotiz. Etiketten („Zeit“, „Tempo“) klein in *Nunito Sans*, normal geschrieben.
3. **Das Zeichen.** Eine schmale Mondsichel in Altrosa neben der Signatur. Wer möchte,
   bekommt stattdessen das Pixel-Siegel des eigenen Begleiters (opt-in).
4. **Die Figur.** Das Mannequin der Übungsanimationen als präzises Piktogramm – athletisch,
   ohne Gesicht. Der Pixel-Garten mit Begleiter lebt nur noch in der Briefmarke.
5. **Papier und Nacht.** Feines Korn, eine kaum sichtbare Vignette. Dunkel heißt
   warmes Grau (#1C1A1A–#2A2626), nie Schwarz. Der Mond steht in der echten Phase
   des Abends.

## Erwachsen: Daten zuerst, die Figur als Piktogramm

Die Karten müssen etwas sein, das ein 30-jähriger Kraftsportler stolz auf Strava oder Instagram
postet: Sportmagazin, Schweizer Raster, ein Druck wie aus der Leica-Werkstatt. Nachtgarten
erkennt man an Details (Mondsichel, Instrument Serif, warmes Grau), nicht an Niedlichkeit.

- **Farbe:** Papier warmes Off-White (#F4F1EC) bzw. warmes Dunkelgrau (#211E1E), Tinte Anthrazit.
  Altrosa nur als kleiner Akzent: Bestwert, die Bahn der Hantel, das Zeichen.
- **Schrift:** Titel und große Zahlen in Instrument Serif; Tabellen, Etiketten und Metadaten in
  Nunito Sans (normal geschrieben, nie in Großbuchstaben). Zahlen in Spalten mit festen
  Ziffernbreiten (`writeNum`), rechtsbündig.
- **Raster:** Satzspiegel 96 px, eine kräftige Linie über der Kennzahlen-Zeile, feine Linien
  zwischen Tabellenzeilen. Spaltenbreiten folgen dem Inhalt, Namen in einer Größe.
- **Die Figur:** ein präzises Piktogramm aus demselben Skelett wie die Übungsanimationen
  (`share/piktogramm.js`): einfarbige Silhouette mit freistehendem Kopf und feinen Fugen,
  Hantelscheiben als Ring mit Nabe; als Symbol in Listen eine feine Kontur. Kein Keimling,
  keine Wangen, kein Gesicht. Optional je Karte über `opts.figure`.

Die Vorlagen:
- **Programmheft** (das Bild zum Posten): Kopf mit Datum, Titel, Ort; Zeile mit Volumen, Sätzen,
  Dauer, Bestwert; Tabelle Übung | Sätze × Wdh. | Gewicht mit Kontur-Symbol je Zeile.
- **Bewegungsstudie:** Serienfotografie der Hauptübung – Belichtungen auf einer Grundlinie, von
  hell nach dunkel, Bildnummern 01–05, die Bahn der Hantel als gepunktete Linie in Altrosa.
- **Plakat / Bestwert:** nur Ziffern, groß.
- **Sammelkarte:** jede Übung eine Karte mit Bildfeld (Start hell, Ende in Tinte) und Zahlen;
  detailliert der Kartensatz.
- **Muskelkarte** (Körperbeet): Silhouetten vorn/hinten, trainierte Partien dunkler, Rangliste.
- **Lauf:** Sticker, Sternbild, Tempo-Welle wie bisher; die Läuferin nur mit `opts.figure`.
- **Briefmarke** mit Pixel-Garten und Begleiter bleibt wählbar, steht aber nie vorn.

## Signatur statt Logo

Unten rechts (oder mittig) steht klein **„nachtgarten“**: kleingeschrieben, kursiv,
gedämpft, wie eine Künstlersignatur am Blattrand. Links daneben das Zeichen: eine schmale
Mondsichel in Altrosa. Das Pixel-Siegel des Begleiters erscheint nur, wenn `opts.companion`
gesetzt ist (opt-in). Das ist alles an Marke. Optional eine Editionsnummer („Nr. 112“).

## So ja – so nicht

| So ja | So nicht |
|---|---|
| höchstens drei Zahlen auf kompakten Karten | Kennzahlen-Raster, Kacheln, Diagramme mit Achsen |
| Altrosa und Salbei als einzige Akzente | Neon, Glow, Verläufe in Bonbonfarben |
| Instrument Serif + Nunito Sans | Monospace, Großbuchstaben-Etiketten, Fettdruck-Lärm |
| durchsichtiger Sticker mit weichem Schatten | Kästen und Balken über dem Foto |
| ein Gedanke je Vorlage (Sternbild, Briefmarke, Programmheft …) | alles auf einmal |
| ruhige Sätze („Der Garten wächst.“) | Ausrufezeichen, Vergleiche, „Zeig allen …“ |
| präzises Piktogramm, Tabellen mit festen Ziffern | Keimling, Wangen, Blüten auf Karten zum Posten |

## Formate und Regeln

- Story 1080 × 1920: Beschriftung nur zwischen 250 px oben und 340 px unten, seitlich ≥ 72 px.
- Feed 1080 × 1350 (4:5): Programmheft mit eigenem Layout, die übrigen Karten verkleinert mittig.
- Sticker eng zugeschnitten (format „kompakt“) zum Kopieren in die Story; Instagram füllt
  Transparenz beim Teilen über das Share-Sheet, daher „Als Sticker kopieren“.
- Zwei Detailgrade: **kompakt** (das Wesentliche) und **detailliert** (alles, gesetzt wie
  ein Programmheft – für Strava: ein Bild statt Abtippen).
- Kompakt höchstens drei Zahlen; Satzspiegel links und rechts 96 px, nur Bildflächen (Filmstreifen,
  Karten) dürfen weiter nach außen.
- Code: `src/ui/share/` – cards.js (Vorlagen, Programmheft, Übersicht), kraftbilder.js
  (Bewegungsstudie, Sammelkarte, Muskelkarte, Symbole), ink.js (Papier, Schrift, Zeichen,
  Signatur, Tabellenziffern), piktogramm.js (Figur), pose.js (Übung → Bewegung), mannequin.js
  (Geräte-Formen; Pixel-Raster für Tests), laeufer.js, geo.js, data.js, seal.js. figur.js wird
  nicht mehr gezeichnet. Tests in `tests/unit/share/`.
