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
3. **Das Siegel.** Ein winziger Pixel-Stempel in Altrosa (Keimling, Mond oder Elli),
   das Motiv ausgespart – wie der rote Stempel unter einem japanischen Holzschnitt.
   Die Farbe ist leicht unregelmäßig, mit ein, zwei Fehlstellen.
4. **Der Garten.** Pixel-Motive aus dem Nachtgarten: das Mannequin aus den
   Übungsanimationen (heller runder Kopf, Keimling obendrauf), Elli und Pflanzen.
   Wo trainiert wurde, blüht es; mit jeder Einheit des Monats wächst eine Pflanze.
5. **Papier und Nacht.** Feines Korn, eine kaum sichtbare Vignette. Dunkel heißt
   warmes Grau (#1C1A1A–#2A2626), nie Schwarz. Der Mond steht in der echten Phase
   des Abends.

## Das Mannequin als Held

Auf Kraftkarten ist das Pixel-Mannequin aus den Übungsanimationen die Hauptfigur – dieselbe
Figur (lange Beine, heller runder Kopf, Keimling), dasselbe Skelett und dieselben Geräte,
in den echten Posen der Übungen (Zuordnung über `data/exercise-map.js` und `data/patterns.js`).
Es wird direkt auf Canvas gerastert (`share/mannequin.js`), grob wie die Sprites, in der harten
Abendruhe-Palette. Arbeitende Glieder stehen in Altrosa, trainierte Muskeln tiefer getönt.

- **Bewegungsstudie:** die Hauptübung als Serienfotografie wie bei Muybridge – vier bis sechs
  Felder mit feinem Raster, fast randlos wie ein Filmstreifen. Die frühen Bilder sind Geister
  (ein Ton, nur die arbeitenden Glieder in Altrosa), das letzte steht in voller Farbe;
  darunter kursive Bildnummern, die letzte in Altrosa. Oben rechts „Tafel 113“.
- **Sammelkarte:** jede Übung eine Karte mit doppelter Linie, Nummer in Altrosa, Bogenfenster
  mit der Endpose (die Startpose als Geist dahinter), darunter Sätze × Wdh. und Gewicht.
  Kompakt liegt die Hauptübung vorn, zwei Karten schräg dahinter; detailliert der ganze
  Kartensatz als Quartett-Karten.
- **Körperbeet:** das Mannequin von vorn und hinten auf einem Streifen Gras; getönt, wo
  gearbeitet wurde, Blüten auf den stärksten Muskeln.
- **Programmheft:** neben jeder Übung eine Mini-Pose.
- **Laufkarten:** die Läuferin mitten im Schritt – am Ende des Pinselstrichs, zwischen den
  Koordinaten des Sternbilds und als zweites Siegel neben dem Begleiter.

## Signatur statt Logo

Unten rechts (oder mittig) steht klein **„nachtgarten“**: kleingeschrieben, kursiv,
gedämpft, wie eine Künstlersignatur am Blattrand. Links daneben das Siegel mit dem eigenen
Begleiter (`companion.species` oder `sealRows`); auf Laufkarten steht daneben ein zweites mit
der Läuferin – wie zwei Stempel auf einem Rollbild. Das ist alles an Marke. Optional eine
Editionsnummer („Nr. 112“) wie bei einer Grafik-Auflage.

## So ja – so nicht

| So ja | So nicht |
|---|---|
| höchstens drei Zahlen auf kompakten Karten | Kennzahlen-Raster, Kacheln, Diagramme mit Achsen |
| Altrosa und Salbei als einzige Akzente | Neon, Glow, Verläufe in Bonbonfarben |
| Instrument Serif + Nunito Sans | Monospace, Großbuchstaben-Etiketten, Fettdruck-Lärm |
| durchsichtiger Sticker mit weichem Schatten | Kästen und Balken über dem Foto |
| ein Gedanke je Vorlage (Sternbild, Briefmarke, Programmheft …) | alles auf einmal |
| ruhige Sätze („Der Garten wächst.“) | Ausrufezeichen, Vergleiche, „Zeig allen …“ |
| Mannequin mit Keimling, Muskeln als Blüten | realistische Körper, Figur-Bewertung |

## Formate und Regeln

- Story 1080 × 1920: Beschriftung nur zwischen 250 px oben und 340 px unten, seitlich ≥ 72 px.
- Feed 1080 × 1350 (4:5): Programmheft mit eigenem Layout, die übrigen Karten verkleinert mittig.
- Sticker eng zugeschnitten (format „kompakt“) zum Kopieren in die Story; Instagram füllt
  Transparenz beim Teilen über das Share-Sheet, daher „Als Sticker kopieren“.
- Zwei Detailgrade: **kompakt** (das Wesentliche) und **detailliert** (alles, gesetzt wie
  ein Programmheft – für Strava: ein Bild statt Abtippen).
- Kompakt höchstens drei Zahlen; Satzspiegel links und rechts 96 px, nur Bildflächen (Filmstreifen,
  Karten) dürfen weiter nach außen.
- Code: `src/ui/share/` – cards.js (Vorlagen, Übersicht), kraftbilder.js (Bewegungsstudie,
  Sammelkarte, Körperbeet), ink.js (Papier, Schrift, Siegel, Signatur), mannequin.js (Figur auf
  Canvas), pose.js (Übung → Bewegung), laeufer.js, geo.js, data.js, seal.js; figur.js ist das
  alte Klötzchen-Körperbeet und wird nicht mehr gezeichnet. Tests in `tests/unit/share/`.
