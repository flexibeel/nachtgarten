# Nachtgarten v2 – Architektur

Ziel: eine sauber aufgebaute, gut wartbare Web-App (PWA), die später ohne Umbau
als native App (Capacitor) verpackt werden kann. Keine Frameworks, keine
Build-Pflicht: moderne Browser-Module (ES Modules), die GitHub Pages direkt ausliefert.

## Schichten

```
UI (features/*, ui/*)        Bildschirme & Bausteine, kennt DOM
   │  ruft auf
Domain (domain/*)            reine Logik, KEIN DOM, voll testbar mit node --test
   │  liest/schreibt über
Core (core/*)                Speicher-Adapter, Datum, Router, Ereignisse, Plattform
```

- **Domain** enthält alle Rechenregeln (Wochen, Sätze, e1RM, Bestleistung, Steigerung,
  Schwangerschaftswoche, Zeitkonto, Keimi-Wachstum, Feed-Wechsel, ICS, Backup).
  Diese Dateien lassen sich unverändert in eine native App oder einen Server übernehmen.
- **Core/store** ist die einzige Stelle, die speichert. Heute `localStorage`,
  später austauschbar (Capacitor Preferences, SQLite, Cloud-Sync).
- **Core/platform** kapselt Geräte-Fähigkeiten: Datei speichern, Teilen, Vibration,
  Wake-Lock, Bluetooth-Puls, Benachrichtigungen, Health, Bildschirmzeit.
  Im Web: Web-API oder freundlicher Hinweis; in der App: native Plugins.

## Ordner

```
index.html                Shell: Kopf, Wurzel-Element, Tab-Leiste, lädt src/main.js
manifest.webmanifest, sw.js, icons/, fonts/, demos/
src/
  main.js                 Start, Migration alter Daten, Router-Setup
  core/                   store.js, dates.js, events.js, router.js, platform.js, format.js
  domain/                 training.js, progression.js, week.js, pregnancy.js, account.js,
                          buddy.js, habits.js, feed.js, ics.js, backup.js, migrate.js
  data/                   exercises.js, patterns.js, mama-plans.js, begin-plans.js, texts/*
  ui/                     sheet.js, toast.js, stepper.js, numpad.js, chips.js, icons.js,
                          actionbar.js, anim/ (Übungsanimationen)
  features/               heute/, training/, live/, library/, mama/, player/,
                          focus/ (Umlenken & Zeitkonto), feed/, profile/, onboarding/
  styles/                 tokens.css (Design-Werte hell/dunkel), base.css, components.css
tests/
  unit/                   node --test (Domain-Logik)
  e2e/                    Playwright (wichtigste Abläufe im simulierten Handy)
docs/                     SPEC.md, ARCHITECTURE.md, DESIGN.md, BACKLOG.md, NATIVE.md
```

## Regeln

1. Domain-Dateien importieren nie aus `ui/` oder `features/`.
2. Nur `core/store.js` greift auf Speicher zu. Alle Schlüssel sind dort dokumentiert.
3. Farben, Schriften, Abstände, Radien kommen ausschließlich aus `styles/tokens.css`.
4. Jede Rechenregel hat Unit-Tests; jeder Hauptablauf einen E2E-Test.
5. Texte für Keimi und Hinweise liegen in `data/texts/`, nicht im Code verstreut.
6. Alte Daten (v1, Schlüssel `lab.*`) werden beim ersten Start von `domain/migrate.js` übernommen.

## Releases

- `main` = live auf GitHub Pages. Entwicklung auf `v2`, Zusammenführung erst nach grünen Tests.
