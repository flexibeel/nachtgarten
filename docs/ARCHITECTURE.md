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

## Entscheidungen (Stufe 1: Fundament)

- **Speicher** (`core/store.js`): Adapter mit vier Methoden (`get/set/remove/keys`, nur Strings).
  `localStorageAdapter` für den Browser, `memoryAdapter` für Tests und als Vorlage für native
  Speicher. Darüber typisierte Bereiche (`store.profile.get()`, `.set()`, `.update()`, `.reset()`),
  die JSON lesen/schreiben, bei kaputten Werten auf den Standard zurückfallen und Objekt-Standards
  mit dem Gespeicherten zusammenführen. **Die vollständige Schlüsseltabelle steht oben in
  `src/core/store.js`.** Alle v2-Schlüssel beginnen mit `ng2.`, Schema-Version in `ng2.meta`.
- **Migration** (`domain/migrate.js`): `convertV1` ist rein, `migrateFromV1` schreibt einmalig
  (Merker `ng2.meta.migratedFromV1`) und nur Bereiche, die es in v2 noch nicht gibt. v1-Schlüssel
  (`lab.*`) bleiben unverändert erhalten. Beispiel-Trainings aus v1 entfallen, Beispiel-Personen
  bleiben markiert. Ein Test prüft, dass jeder `lab.*`-Schlüssel aus `src/app.html` zugeordnet ist.
- **Datumslogik** (`core/dates.js`): Tage sind lokale Schlüssel `YYYY-MM-DD`; Rechnen mit Schlüsseln
  über UTC-Kalenderarithmetik, dadurch immun gegen Sommer-/Winterzeit. Alles, was „jetzt“ braucht,
  nimmt ein injizierbares `now`. Wochen beginnen montags (Index 0).
- **Texte**: Domain-Funktionen liefern Text-Schlüssel mit Parametern (z. B. Steigerungsvorschlag,
  Wochenring, Gewohnheit), die deutschen Texte stehen in `src/data/texts/de.js`.
- **Kalender-Datei** (`domain/ics.js`): Termine mit Uhrzeit tragen `TZID=Europe/Berlin` und eine
  mitgelieferte `VTIMEZONE` (statt „schwebender“ Zeit), damit 18:00 auch nach der Zeitumstellung
  18:00 bleibt und alle Kalender gleich rechnen. Ohne Uhrzeit: ganztägige Termine. Pro Wochentag ein
  `RRULE:FREQ=WEEKLY;BYDAY=..`-Termin mit stabiler UID (`ng2-training-mo@nachtgarten`), damit ein
  erneuter Import aktualisiert statt verdoppelt. Gestrichene Tage verschwinden beim Re-Import nicht
  automatisch (Grenze des Formats). CRLF, Faltung bei 75 Oktetten, RFC-5545-Escaping.
- **Timer** (`domain/timer.js`): zeitstempelbasiert mit injizierbarer Uhr; `poll()` liefert
  Ereignisse (Countdown, Seitenwechsel zur Hälfte, Schrittende, fertig) und holt im Hintergrund
  verpasste Schritte nach. Ton/Vibration macht die UI.
- **Sicherung** (`domain/backup.js`): Format v2 `{app, version: 2, schema, created, data}`;
  v1-Sicherungen werden beim Lesen über `convertV1` übersetzt. Einspielen ersetzt nur v2-Daten.
- **Tests**: `npm test` startet `node --test "tests/unit/**/*.test.js"` (Node ≥ 21 erwartet ein
  Datei-Muster statt eines Ordners). Die Tests laufen fest in `Europe/Berlin`
  (`tests/unit/helpers/env.js`), damit Zeitumstellungs-Fälle überall gleich geprüft werden.

## Releases

- `main` = live auf GitHub Pages. Entwicklung auf `v2`, Zusammenführung erst nach grünen Tests.
