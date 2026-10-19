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
index.html                Shell: Kopf (CSP, Manifest, Icons, theme-color je Schema), lädt src/main.js
manifest.webmanifest, sw.js, icons/, fonts/
src/
  main.js                 Start: v1-Daten übernehmen, Design, Registry, Shell, Router, Onboarding
  core/                   store.js, dates.js, events.js, router.js, platform.js, format.js
  domain/                 training.js, progression.js, week.js, pregnancy.js, account.js, buddy.js,
                          companion.js, modules.js, today.js, habits.js, feed.js, ics.js, backup.js, migrate.js
  data/                   goals.js, gear.js, companions.js, mama-safety.js, muscles.js, patterns.js,
                          texts/de.js (Hinweise), texts/companion.js (Sätze des Begleiters)
  ui/                     dom.js, icons.js, sheet.js, toast.js, chips.js, stepper.js, numpad.js, fields.js,
                          card.js, tile.js, ring.js, actionbar.js, theme.js, companion.js,
                          companions/<art>.js (Zeichnung je Begleiter-Art), anim/ (Übungsanimationen)
  features/               context.js, registry.js, modules.js, shell.js, part.js,
                          heute/, onboarding/, profile/, privacy/, settings/, companion/, placeholder/,
                          training/, mama/, habits/, focus/, ideen/   (je Modul: module.js + Kacheln)
  styles/                 tokens.css (Design-Werte hell/dunkel), base.css, components.css, screens.css
tests/
  unit/                   node --test (Domain-Logik, Registry, reine UI-Logik)
  e2e/smoke.py            Playwright (Python) im simulierten Handy, hell und dunkel
scripts/deploy-beta.py    Beta nach main/beta/ kopieren, committen, pushen
docs/                     SPEC.md, ARCHITECTURE.md, DESIGN.md, TONE.md, BACKLOG.md
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

## Entscheidungen (Stufe 2: Shell, Design-System, erste Bildschirme)

- **Module & Registry** (`features/registry.js`, Logik in `domain/modules.js`): Jedes Feature ist ein
  Modul `{id, label, hint, icon, views[], tiles[]}` und meldet sich in `features/modules.js` an.
  Eine Ansicht (`{route, title, mount, tab?, chrome?, aliases?, modules?}`) wird Route und optional Tab,
  eine Kachel (`{id, title, render(ctx) → {el, destroy}, size?, modules?}`) erscheint auf „Heute“.
  `modules` erlaubt geteilte Teile („Sport starten“ und Wochenring gehören zu Training, sind aber
  auch bei Schwangerschaft & Rückbildung sichtbar). Shell, Tab-Leiste, „Heute“, Onboarding und Profil
  fragen nur die Registry: **ein ausgeschaltetes Modul ist überall unsichtbar** (keine Kachel, kein Tab,
  Direktsprung landet auf „Heute“, keine Sätze des Begleiters dazu). Module heute: `train`, `mama`,
  `habits`, `handy`, `ideen`; ein Modul „Aufhören“ (Rauchen, Cannabis) kommt als weiteres Modul dazu.
- **Einstellungen**: `ng2.settings.enabledModules` (null = Standard `train` + `habits`) und
  `ng2.settings.tileOrder` (Kachel-Ids; neue Kacheln reihen sich an ihrer Standard-Position dahinter ein).
  Das letzte Modul lässt sich nicht abschalten. Reihenfolge ändert man im Profil („Heute anordnen“).
  v1-Schwerpunkte (`lab.foci`) werden zu Modulen, plus `habits` (in v1 immer sichtbar).
- **Begleiter**: `profile.companion = {species, name}`; Ton, an/aus und Wachstum bleiben in `ng2.buddy`.
  Arten stehen in `data/companions.js` (Standardname, Stufen-Namen), ihre Zeichnung in
  `ui/companions/<art>.js`; `ui/companion.js` wählt sie über die Art-Id. Texte nutzen nur Platzhalter
  (`{name}` Begleiter, `{user}` Person); artspezifische Sätze liegen getrennt (`SPECIES_LINES`).
  Neue Art = Eintrag in `SPECIES` + Zeichenfunktion in `ART` (+ optional eigene Sätze).
- **Bildschirme** bestehen aus `ui/`-Bausteinen; ein Bildschirmteil ist ein `Part` `{el, destroy}`, der
  über `ctx.watch(bereiche, …)` nur auf die Speicher-Bereiche hört, die er zeigt (`features/part.js`).
- **App-Kontext** (`features/context.js`): Speicher, Ereignisse, Registry, Uhr, Navigation, Design –
  Features greifen auf nichts Globales zu. `ctx.reload()` baut nach Wiederherstellen/Löschen neu auf.
- **Router**: Hash-Routen (`#heute`, `#training`, `#live`, `#mama`, `#umlenken` → `#fokus`, `#feed`,
  `#kurz`, `#ideen`); ohne Hash gilt die Startansicht aus den Einstellungen (nur erreichbare Ziele).
- **Design**: `data-theme` am Wurzelelement (fehlt = System über `prefers-color-scheme`), `theme-color`
  je Schema. Schriften lokal (WOFF, Latein + Deutsch). Keine Inline-Skripte/-Styles (CSP im Kopf).
- **Plattform** (`core/platform.js`): Haptik (nur direkt nach einer Berührung), Wake Lock, Datei
  speichern (Teilen-Menü oder Download), Datei wählen, Zwischenablage, Standalone, Installations-Dialog.
  Alles fällt ohne Unterstützung still weg.
- **Beta**: `scripts/deploy-beta.py` kopiert die lauffähige App nach `main:/beta/` (eigenes Manifest
  „Nachtgarten Beta“, eigener Service Worker mit eigenem Cache-Präfix). v2 speichert unter `ng2.*` und
  liest `lab.*` nur, deshalb können v1 und Beta denselben Ursprung teilen.

## Releases

- `main` = live auf GitHub Pages. Entwicklung auf `v2`, Zusammenführung erst nach grünen Tests.
