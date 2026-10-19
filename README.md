# Nachtgarten

Persönliche Begleiter-App (PWA): Training mit Live-Logging und Muskelkarte, Umlenken statt Scrollen, Schwangerschaft & Rückbildung, Begleiter Keimi. Läuft komplett im Browser, alle Daten bleiben lokal auf dem Gerät.

## Entwicklung

- Quellcode: `src/app.html` (die komplette App als eine Datei, auch als Claude-Artifact nutzbar).
- `python3 build.py` erzeugt daraus `index.html`, `manifest.webmanifest` und `sw.js` für GitHub Pages.
- Übungsdaten (Fotos + Anleitungen) liegen in `demos/` und werden bei Bedarf geladen.

## Quellen & Lizenzen

- Übungsfotos und Anleitungen: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (gemeinfrei, Unlicense)
- Schriften: Bricolage Grotesque, Onest, JetBrains Mono (SIL Open Font License, siehe `fonts/`)
