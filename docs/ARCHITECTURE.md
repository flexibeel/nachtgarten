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
  data/                   goals.js, gear.js, companions.js, muscles.js, patterns.js,
                          texts/i18n.js (t, Sprache), texts/de.js, texts/en.js,
                          texts/companion.js (+ companion-de.js, companion-en.js: Sätze des Begleiters)
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
5. Alle sichtbaren Texte liegen in `data/texts/` (Deutsch und Englisch), nie im Code der Bildschirme.
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
- **Sprache** (`data/texts/i18n.js`): Deutsch zuerst, Englisch wählbar (`ng2.settings.lang`, im Profil
  unter „Ansicht“, auf „Heute“ unter Einstellungen und im ersten Onboarding-Schritt). Alle sichtbaren
  Texte über `t(key, vars)` bzw. `tList(key)` aus `data/texts/de.js` und `en.js`, Rückfall auf Deutsch.
  Sätze des Begleiters je Sprache in `companion-de.js` / `companion-en.js`. Bildschirme enthalten keine
  festen Texte; Registry-Einträge tragen Text-Schlüssel (`labelKey`, `titleKey`). Ein Sprachwechsel
  zeichnet Shell, aktuelle Ansicht und offene Profil-/Onboarding-Sheets neu. Tests prüfen, dass jeder
  deutsche Schlüssel auf Englisch existiert, die Platzhalter übereinstimmen und keine festen Texte in
  `features/` und `ui/` stehen. Gespeicherte Werte (Ziel-Ids, Geräte-Ids aus v1) bleiben sprachneutral.
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

## Entscheidungen (Stufe 3: Begleiter, Training, Fokus)

- **Begleiter**: Pixel-Tiere aus `ui/companion/` (Elefant „Elli“ vorn, Igel, Fuchs, Otter, Faultier, Eule,
  Keimling). `ui/companion.js` zeichnet Standbilder (`companionFigure`) und bewegte Sprites (`companionSprite`,
  Schleife endet, wenn das Element aus dem Dokument fällt). Neue Profile starten mit Elli, alte behalten ihre Art.
- **Schlicht** (`settings.plain`, ohne Wert gilt `!buddy.on` aus v1): blendet Figur, Sätze und Garten überall aus.
  Abfrage nur über `isPlain(ctx)` (features/companion/companion-state.js). Im Onboarding als Karte „Ohne Begleiter“.
- **CSP**: Stile aus dem Code (Sprite-Farben, Garten, Animationen) kommen als adoptierte Stylesheets
  (`ui/adopt-css.js`), nie als `<style>`-Element.
- **Garten** (`domain/garden.js`): Stufe aus Trainingstagen im Monat (0, 2, 5, 9, 14). Kachel `garden` im Modul
  Training, Vorbeiflug höchstens einmal je App-Start. Kacheln lassen sich im Profil ausblenden (`settings.hiddenTiles`).
- **Übungen** (`features/training/exercises.js`): kuratiert (`data/library.js`), offene Datenbank
  (`data/exercise-db.js`, per `import()` nachgeladen), eigene/übernommene aus dem Speicher, `g_`-Plan-Übungen
  (`data/plan-exercise-map.js`). Deutsche Namen und Anleitungen aus `data/i18n/` (Übersetzungs-Strang).
  Suche, Kategorien und Sortierung rein in `domain/library.js`.
- **Live-Training** (`features/training/live.js`, Logik in `domain/live-session.js`): ein Bildschirm ohne Scrollen
  (geprüft bei 390 × 844 und 375 × 667), feste Aktionsleiste. Pause zeitstempelbasiert in `live.rest`
  (überlebt Neuladen). Abschluss schreibt Eintrag, `lastCard` und +15 Min. Zeitkonto.
- **Planfinder** (`domain/plan-wizard.js`): vier Antworten → `recommendPlans`; Schwerpunkt aus dem Profilziel.
  `adoptTemplate` legt Einheiten und Wochenplan an, eigene Pläne und Aktivitäten bleiben.
- **Teilen** (`features/training/share-sheet.js`): `suggestCards` als Wisch-Leiste; Siegel aus dem Sprite
  (`ui/share/seal.js`). Teilen, Bild in die Zwischenablage und Download über `core/platform.js`
  (`shareImage`, `copyImage`, `saveFile`) – in der nativen App dort austauschbar.
- **Wirklich jetzt?** (`domain/gate.js`, `features/focus/umlenken.js`): `#umlenken?von=instagram` aus einer
  Kurzbefehle-Automation. Entscheidungen in `ng2.gate` (60 Tage), „Trotzdem öffnen“ bucht 5 Min. ab und setzt
  eine Schonfrist (`graceUntil`), in der direkt weitergeleitet wird. Andere Apps öffnet `openExternal`
  (core/platform.js). Das Modul behält die Id `handy` (gespeicherte Einstellungen, v1-Übernahme).

## Entscheidungen (Feinschliff nach Stufe 3)

- **Startgewicht** (`domain/live-session.js`, `defaultWeight`): nach Geräteart (Langhantel 20, SZ 10, Kurzhantel 8,
  Kabel/Maschine 15, Kettlebell 12, Körpergewicht/Band 0), sonst das zuletzt benutzte Gewicht (`lastUsedWeight`).
- **Live-Bühne**: Übungsanimation (ui/anim, `animConfig` aus library-sheet.js) skaliert per Container-Einheiten mit der
  freien Höhe; darunter eine Zeile (Technik-Hinweis, an wenigen Stellen der Begleiter – nie in Schlicht), dann
  „Letztes Mal“ (`lastSessionSummary`) mit Vorschlag-Chip; Satz-Punkte (`setDots`) im Kopf.
- **Tabs** (`arrangeTabs` in domain/modules.js): Heute, Training, Fokus, Mama, Ideen, dazu „Profil“ (eigene Seite,
  Shell-Ansicht wie Heute), solange höchstens fünf Tabs.
- **Router** merkt sich die Position im Verlauf (`ngIndex`), daraus Vor/Zurück für die Übergänge (`historyStep`).

## Entscheidungen (Daten dauerhaft sichern)

- **Zweite Kopie** (`core/durable.js`): `localStorage` bleibt der synchrone Speicher; `mirroredAdapter` schreibt
  jede Änderung an `ng2.*` gebündelt nach IndexedDB (`nachtgarten` → `kv`) und zählt `ng2._rev` hoch. Beim Start
  (vor dem Kontext) entscheidet `planRestore` rein: nur eine Seite hat Daten → von dort ergänzen, sonst gewinnt die
  höhere Revision. Beim Verlassen (`pagehide`, versteckt) wird sofort geschrieben. Ohne IndexedDB läuft alles wie vorher.
- **Tagesstände**: einmal am Tag ein Stand in IndexedDB (`snapshots`), die letzten fünf bleiben; „Stand vom …
  wiederherstellen“ in Profil → Deine Daten. „Alles löschen“ löscht auch die Stände.
- **Dauerhaft speichern**: `navigator.storage.persist()` nach Onboarding, erstem Plan und erstem Training
  (`core/platform.js`), Status in Profil → Deine Daten, dazu der ehrliche Hinweis zu iPhone/Safari/Privat-Tabs.
- **Plan als Link** (`domain/plan-code.js`, `features/training/plan-link.js`): `#plan=` + „z“ + base64url(deflate-raw)
  der Kurzform `[1, Name, [[Id, Sätze, Soll, Name?]]]` (Rückfall „j“ ohne Kompression). Beim Lesen begrenzt und geprüft.
- **Erinnerung** „Sicherung machen?“ auf Heute (`backupDue`): mit Daten, nicht in der ersten Woche, höchstens
  monatlich (`settings.backupAt`, `settings.backupNudgeAt`), auch in Schlicht.

## Entscheidungen (Übung zuerst, Varianten, übersichtlicher)

- **„So geht’s“ zuerst** (`showIntro` in domain/live-session.js): Beim ersten Mal einer Übung zeigt das Live-Training
  die große Animation, zwei, drei kurze Hinweise (`cues`) und die Geräte-Wahl; eine Hauptaktion „Los geht’s“. Danach
  die Eintrage-Ansicht mit kleiner Animation (antippen = wieder groß). Einstellung `settings.howTo`
  (`first` | `always` | `never`, unter „Mehr“). Gesehen merkt `exercises.seen`.
- **Varianten** (`data/variants.js`, `domain/variants.js`): kuratierte Gruppen (Beinpresse 45°/horizontal/Hack/Kurzhantel,
  Bankdrücken, Rudern …). Jede Variante hat eine eigene Id (vorhandene Übung oder abgeleitet „press~horizontal“),
  dadurch Verlauf, letztes Gewicht und Vorschlag je Gerät. Gewählte Variante je Gruppe in `exercises.variants`; ein Plan
  startet an der zuletzt gewählten Maschine (`applyVariants`). Kabel: Aufsatz und Rollenhöhe als Chips in „So geht’s“.
- **Weniger Lärm**: Kontextzeile gedämpft, Name groß; Zeit, Anleitung-Einstellung und ausführliche Anleitung unter
  „Mehr“; eine Hauptaktion je Ansicht. Bibliothek: Kategorien als Kacheln mit Pixel-Symbol, dann Liste mit Vorschau
  (Standbild, bewegt sich beim Drücken, erst gebaut, wenn sichtbar).
- **Teilen**: Standard-Zeichen ist der schlichte Mond der Karten; das eigene Tier als Siegel nur über
  „Mit Begleiter-Siegel“ (aus).

## Entscheidungen (Eigener Plan)

- **Editor** (`domain/plan-editor.js`, `features/training/plan-editor.js`, Routen `#editor?id=` und `#einheit?id=&s=`):
  Programm = Einheiten mit geordneten Übungen (Sätze, Wdh.-Bereich, Reserve, Pause) + Woche Mo…So, gespeichert in
  `ng2.programs`. Jede Änderung läuft durch den Reducer `editProgram` und wird sofort mit `syncProgram` in `plans`
  (je Einheit, Id „<programm>-<einheit>“) und `schedule` übertragen – Live-Training, Heute und „Plan als Link“ bleiben
  unverändert. Die Pause je Übung nutzt das Live-Training (`queueFromPlan` übernimmt `rest`).
- **Gesten**: Griff zieht sofort, auf dem Handy auch langes Drücken (380 ms); Haptik-Ticks bei jedem neuen Platz;
  Pfeiltasten am Griff. Wischen nach links (ab 96 px) löscht mit „Rückgängig“ (`restoreItem` an derselben Stelle).
  Antippen öffnet ein Sheet mit Steppern und Geräte-Varianten.
- **Anlegen**: leer oder „Aus Vorlage starten“ (`programFromTemplate`, alle zehn Vorlagen). `src` merkt sich die
  Vorlage-Übung, damit Geräte-Tausch die Hinweise nicht verfälscht.
- **Hinweise** (`programHints`): `validatePlan` live, nur Warnungen (Frequenz, Drücken/Ziehen, Volumen), höchstens drei,
  in Salbei, nie blockierend; unveränderte Vorlagen bleiben still.
- Ein neues Sheet blendet einen offenen Hinweis (Toast) aus.

## Releases

- `main` = live auf GitHub Pages. Entwicklung auf `v2`, Zusammenführung erst nach grünen Tests.
