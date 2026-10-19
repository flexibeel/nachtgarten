# Nachtgarten

Ein ruhiger, persönlicher Begleiter fürs Handy: Training mit Live-Logging und eigenen Plänen,
„Wirklich jetzt?“ statt endlos scrollen, Gewohnheiten, Schwangerschaft & Rückbildung und ein
kleiner Begleiter, der mitwächst. Nachtgarten ist eine Web-App (PWA): im Browser öffnen und über
„Zum Home-Bildschirm“ wie eine App installieren.

## Links

- **App:** https://flexibeel.github.io/nachtgarten/
- **Klassisch** (die bisherige Version): https://flexibeel.github.io/nachtgarten/klassisch/
- **Beta** (Vorschau auf das, was als Nächstes kommt): https://flexibeel.github.io/nachtgarten/beta/

## Datenschutz

Alles, was du einträgst, bleibt nur auf deinem Gerät (im Speicher deines Browsers).
Es gibt kein Konto, keinen Server und keinen Upload. Daten verlassen das Gerät nur, wenn du selbst
eine Sicherung, eine Kalender-Datei oder ein Bild speicherst oder teilst. Auch die Schriftarten
liegen auf dem Gerät.

Wer schon die bisherige Version genutzt hat: Die neue App übernimmt beim ersten Öffnen deine Daten
(Profil, Pläne, Trainings, Sätze …). Die alten Daten bleiben dabei unverändert erhalten, die
klassische Version zeigt sie weiter an. Neue Einträge in der App erscheinen dort nicht.

## Aufbau dieses Repos (Branch `main`, live über GitHub Pages)

| Ort | Was | Woher |
|---|---|---|
| `index.html`, `sw.js`, `manifest.webmanifest`, `src/`, `fonts/`, `icons/` | die App (v2) | `scripts/deploy-release.py` im Branch `v2` |
| `beta/` | Beta (Vorschau) | `scripts/deploy-beta.py` im Branch `v2` |
| `klassisch/` | klassische Version (v1), mit eigenen Schriften, Icons und Übungsdaten (`klassisch/demos/`) | `python3 build.py` |
| `v1/app.html` | Quelltext der klassischen Version (eine Datei) | von Hand |
| `design/` | Werkzeuge für Icons und Startbilder | |

Die App wird im Branch `v2` entwickelt (Architektur: `docs/ARCHITECTURE.md` dort).
Service Worker und Caches sind getrennt, damit sich die drei Fassungen auf demselben Ursprung
nicht in die Quere kommen: App `ng2-app-…`, Beta `ng2-beta-…`, Klassisch `ngk-…` (Scope `klassisch/`).

## Quellen & Lizenzen

- Übungsfotos und Anleitungen: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (gemeinfrei, Unlicense)
- Schriften: Nunito Sans, Instrument Serif (App) sowie Bricolage Grotesque, Onest, JetBrains Mono (Klassisch), alle SIL Open Font License (siehe `fonts/` und `klassisch/fonts/`)
