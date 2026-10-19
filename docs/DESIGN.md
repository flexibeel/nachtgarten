# Design: „Abendruhe“ (gewählt am 19.10.2026)

Ruhig, warm, persönlich. Keine Neon-Effekte, keine Monospace-Labels, keine Großbuchstaben-Überschriften.
Alle Werte stehen in `src/styles/tokens.css` – nirgends sonst werden Farben, Größen oder Abstände festgelegt.

## Farben

| Rolle | Token | Hell | Dunkel |
|---|---|---|---|
| Hintergrund | `--bg` | #F5F1EE | #232020 |
| Karte | `--card` | #FFFCFA | #2C2828 |
| Kartenrand | `--line` | #EDE5E0 | #3A3433 |
| Text | `--text` | #2E2A28 | #EEE7E3 |
| Text gedämpft | `--muted` | #6F6661 | #ABA19C |
| Altrosa – Fortschritt, erledigt | `--accent` | #B58C83 | #D3A99F |
| Altrosa kräftig – Hauptknopf | `--accent-strong` | #93695F (weiße Schrift) | #D3A99F (dunkle Schrift) |
| Altrosa als Textfarbe | `--accent-ink` | #885E55 | #DEB5AB |
| Salbei – geplant, Ruhe | `--sage` | #9DAA8F | #AFBCA2 |
| Fläche weich | `--soft` | #EAE2DC | #3A3433 |

- **Dunkel ist ein weiches, warmes Grau**, kein Fast-Schwarz (Hintergrund #232020, Karte #2C2828).
- Gedämpfter Text hell auf #6F6661 abgedunkelt, damit er auch auf dem Hintergrund 4,5:1 erreicht.
- Altrosa #B58C83 ist zu hell für Schrift; Knöpfe nutzen `--accent-strong`, Text `--accent-ink`.
- Design-Wahl: System (Standard), Hell, Dunkel – im Profil, auf „Heute“ unter Einstellungen und als
  Schnellschalter (Sonne/Mond) oben auf „Heute“ mit „Rückgängig“.

## Schrift

- Überschriften, Begrüßung, Sätze des Begleiters: **Instrument Serif** (normal, kursiv nur für Ton-Beispiele).
- Text, Zahlen, Bedienung: **Nunito Sans** (variabel 400–800). Ziffern sind von Haus aus tabellarisch;
  `font-variant-numeric: tabular-nums` ist trotzdem gesetzt.
- Schriften liegen als WOFF in `fonts/`, auf Latein + Deutsch reduziert (fontTools), mit OFL-Lizenzen.

## Formen und Bewegung

- Radien: Karte 18 px, Knopf 14 px, Sheet 26 px, „Sport starten“ 24 px. Schatten minimal.
- Ziele mindestens 44 px, wichtige Knöpfe 56 px. Einhändig: Hauptaktionen unten oder groß oben.
- Bewegung kurz (140–380 ms), nur als Antwort auf eine Aktion; `prefers-reduced-motion` schaltet sie ab.
- Seitenwechsel: dezentes Einblenden über View Transitions (wo vorhanden).

## Seitenaufbau „Heute“

Begrüßung (Serif, groß) → Begleiter mit Sprechblase → Kacheln der eingeschalteten Module in
gewählter Reihenfolge (einzige kräftige Fläche: „Sport starten“ in Altrosa) → Einstellungen →
„Deine Daten“ ohne Kartenfläche, mit Datenschutz-Satz.

## Begleiter

Art und Name wählbar (`profile.companion`), Standard ist der Keimling „Keimi“ in Salbei mit
Altrosa-Wangen und -Blüte. Neue Arten (Pixel-Tiere) bekommen eigene `--<art>-*`-Farben.
