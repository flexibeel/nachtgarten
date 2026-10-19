# Ton: Wie Nachtgarten spricht

Nachtgarten ist ein ruhiger Begleiter. Training ist hier etwas, das man **für sich selbst**
tut: für Kraft im Alltag, guten Schlaf, klaren Kopf, gute Laune. Nie für das Aussehen,
nie für andere, nie gegen den eigenen Körper.

## Grundsätze

1. **Wohlbefinden statt Aussehen.** Wir sprechen über Gefühl, Energie, Kraft, Beweglichkeit,
   Ruhe. Nicht über Figur, Gewicht als Ziel, „Problemzonen“ oder „Bikini-Body“.
2. **Freundlich, kurz, auf Augenhöhe.** Du-Form, ganze Sätze, kein Fachjargon. Eine Sache pro Satz.
3. **Kein Druck, keine Schuld.** Pausen und ausgelassene Tage sind normal. Wir loben das
   Wiederkommen, nicht die Serie.
4. **Wenige Tipps.** Lieber ein guter Satz als drei Hinweise. Details nur, wenn jemand sie sucht.
5. **Ehrlich zur Sicherheit.** Bei Schwangerschaft, Rückbildung und Schmerzen klar und ruhig:
   im Zweifel aufhören und ärztlich abklären lassen. Nicht verharmlosen, nicht dramatisieren.
6. **Privat.** Wir sagen sichtbar, dass alles auf dem Gerät bleibt. Kein Vergleich mit anderen.
7. **Schreibweise.** Deutsche Anführungszeichen („…“), Gedankenstrich (–), Zahlen deutsch
   (1,5 kg). Keine Großbuchstaben-Überschriften, keine Ausrufezeichen-Ketten, keine Emojis im Text.

## So ja – so nicht

| So nicht | So ja | Warum |
|---|---|---|
| Abnehmen | Mich leichter & fitter fühlen | Gefühl statt Zahl auf der Waage |
| Muskelaufbau für den Sommer | Kräftiger werden | kein Termin, kein Publikum |
| Problemzonen straffen | Bauch & Rumpf stärken | Funktion statt Makel |
| Kalorien verbrennen | In Bewegung kommen | Bewegung ist kein Ausgleich fürs Essen |
| Danach hast du dir einen Snack verdient. | Danach darfst du richtig durchatmen. | Essen ist keine Belohnung oder Strafe |
| Zurück zur alten Figur nach der Geburt | Schritt für Schritt wieder Kraft im Alltag | Rückbildung heißt heilen, nicht „zurück in Form“ |
| Du hast deine Serie verloren! | Gestern war Pause. Heute zählt wieder. | kein Verlust, kein Schuldgefühl |
| Nur noch 2 Einheiten, gib alles! | Noch 2 Trainingstage bis zu deinem Wochenziel. | sachlich, ohne Druck |
| Zeig allen, was du kannst! | Das war gut heute. | nicht für andere |
| No pain, no gain. | Hör auf deinen Körper. Technik vor Gewicht. | Schmerz ist ein Warnsignal |
| Super!!! 🔥🔥 | Stark gemacht. | ruhig, warm, ohne Lärm |
| WILLKOMMEN | Willkommen | keine Großbuchstaben |
| Deine Daten sind sicher. | Alles bleibt nur auf diesem Gerät. Kein Konto, kein Upload. | konkret statt Werbeversprechen |

## Begleiter

Der Begleiter wächst mit. Standard ist der Keimling „Keimi“, später kommen Tiere dazu (zuerst ein Elefant).
Drei Tonlagen, alle freundlich:

- **Ruhig:** leise, sanft, viel Raum. „Ein Schluck Wasser wär jetzt nicht verkehrt.“
- **Motivierend:** warm und zugewandt. „Kleine Schritte zählen. Jeder einzelne.“
- **Frech:** verspielt, nie verletzend, nie über den Körper. „Ruhetag! Sofa-Training: Fernbedienung heben.“

Er kommentiert nie Gewicht, Figur oder Essen, vergleicht nie mit anderen und macht kein
schlechtes Gewissen. Alle Sätze stehen in `src/data/texts/companion.js`:

- Nie einen festen Namen schreiben: `{name}` ist der Begleiter, `{user}` bzw. `{, user}` die Person.
- Allgemeine Sätze passen zu jeder Art. Was nur zu einer Art passt (Blätter, Gießen, Rüssel …),
  gehört in `SPECIES_LINES` dieser Art.
- Ein Test prüft feste Namen, artspezifische Wörter, offene Platzhalter und verbotene Wörter
  (Figur, Kalorien, Snack …).
