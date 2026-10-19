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

## Signatur statt Logo

Unten rechts (oder mittig) steht klein **„nachtgarten“**: kleingeschrieben, kursiv,
gedämpft, wie eine Künstlersignatur am Blattrand. Links daneben das Siegel. Das ist
alles an Marke. Optional eine Editionsnummer („Nr. 112“) wie bei einer Grafik-Auflage.

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
- Code: `src/ui/share/` (cards.js, geo.js, data.js, figur.js), Tests in `tests/unit/share/`.
