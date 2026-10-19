# Nachtgarten – Spezifikation für den Neubau

Stand: 19.10.2026 · Quelle: `src/app.html` (rund 3.480 Zeilen, in vielen Schichten gepatcht), `build.py`, `demos/`, `testpersonen-berichte.md`.

Dieses Dokument beschreibt das **tatsächlich wirksame Verhalten** der heutigen App. Viele Funktionen werden im Quelltext später neu zugewiesen oder umhüllt (`const _x=x; x=function(){_x(); …}`). Beschrieben ist immer das Ergebnis der ganzen Kette. Wo die heutige App Fehler oder Ungereimtheiten hat, steht das in Abschnitt 7 und ist als „Ist“ markiert. Der Neubau soll das Soll-Verhalten aus den Abschnitten 1–6 umsetzen und mit der Checkliste in Abschnitt 8 geprüft werden.

**Begriffe**

- *Eintrag*: ein Element im Trainingslog `lab.tlog`.
- *Live-Training*: Training mit Gewicht und Wiederholungen pro Satz (Ansicht `v-live`).
- *Plan-Session*: Abhak-Training ohne Gewichte (Ansicht `v-session`).
- *Player*: Timer-Player für Heimpläne (Ansicht `v-player`).
- *Sheet*: von unten einfahrende Karte (Bottom Sheet).
- *Fokus*: die Auswahl „Was ist dir wichtig?“ (`lab.foci`). Nicht zu verwechseln mit „Eine Sache heute“ (`lab.focus`).
- Datumsschlüssel `YYYY-MM-DD` in **lokaler Zeit**. Wochen beginnen am Montag. Wochentagsindex 0 = Montag … 6 = Sonntag.

---

## 1. Überblick & Prinzipien

### 1.1 Was die App ist

„Nachtgarten“ ist eine persönliche Begleiter-App (PWA, eine einzige HTML-Datei, auch als Claude-Artifact nutzbar). Sie hat vier Bereiche, die die Nutzerin oder der Nutzer einzeln ein- und ausblenden kann:

1. **Training**: Wochenplan, Live-Logger mit Muskelkarte, Pläne, Übungsbibliothek mit rund 750 Übungen, Progressionsvorschläge, Wochenrückblick, andere Sportarten, eigene Messwerte.
2. **Weniger Handy**: „Umlenken statt Instagram“ (Atmen, ein Mensch statt Feed, Instagram-Zeitkonto) und ein langsamer Feed (drei Dinge am Tag, dann ist Schluss).
3. **Schwangerschaft & Rückbildung**: Heimpläne nach Leitlinien mit Timer-Player, passend zur SSW bzw. zur Woche nach der Geburt.
4. **Ideen-Labor**: Skizzen für künftige Funktionen.

Dazu kommen ein ruhiger Startbildschirm „Heute“ (Cockpit) und der Begleiter **Keimi**, ein kleiner Keimling, der mit der Aktivität wächst.

### 1.2 Prinzipien (aus Code und Texten abgeleitet)

| Prinzip | Konkrete Umsetzung |
|---|---|
| **Privat, nur lokal** | Alle Daten liegen im `localStorage` unter `lab.*`. Kein Konto, kein Server, kein Upload. Daten verlassen das Gerät nur, wenn die Person selbst ein Bild oder eine Sicherung speichert. Profilangaben sind alle freiwillig. „Alle meine Daten löschen“ mit doppelter Bestätigung. Sicherung und Wiederherstellung als JSON-Datei. |
| **Keine Schuldgefühle** | Keine Streaks, kein Rot, keine Vorwürfe. Texte wie „Ausrutscher sind okay.“, „Kleiner Neustart: Heute reicht auch eine Mini-Version.“, „Kurzversion: zählt voll.“, „Erholung gehört dazu.“, „Verpasste Tage sind kein Drama.“, „Jede Einheit zählt, auch eine kurze.“ Das Zeitkonto heißt im Ruhezustand „Pause“, nicht „gesperrt“. |
| **Jede Person sieht nur, was sie nutzt** | Fokus-Modi (Training, Weniger Handy, Schwangerschaft & Rückbildung, Ideen-Labor) blenden Tabs, Kacheln und Belohnungs-Toasts aus. |
| **Einfach / Profi** | Training hat zwei Ansichten. „Einfach“ (Standard) blendet RIR, e1RM-Verlauf, Scheibenrechner, Volumen pro Muskel, Kabel-Rollenhöhe, Pausendauer, Gewichtsstufe und Wdh.-Bereich aus. RIR wird in „Einfach“ nicht still gespeichert (`null`). |
| **Einhändig bedienbar** | Alle Ziele im Live-Training mindestens 44 px. Nach Übungswahl scrollt „Satz speichern“ in den Daumenbereich (Unterkante ≤ Fensterhöhe − 104 px). Filter und Suche im Übungsbrowser liegen unten. Gewicht und Wdh. per großem Stepper mit Halten-zum-Wiederholen oder per Zifferneingabe. |
| **Zeit ist optional** | Zeitmessung im Live-Training ist standardmäßig **aus** (`lab.timeOn=false`). Ohne Zeit gibt es keine Uhr, keinen Pausentimer und keine Minuten auf der Abschluss-Karte. |
| **Ehrliche Zahlen** | „Sätze“ in Rückblick, Kachel und Ring zählen echte Sätze. Die gewichtete Zählung (Hilfsmuskeln ½) gibt es nur pro Muskel und ist so beschriftet. Prozentvergleiche nur zum gleichen Wochentag der Vorwoche. Zahlen im deutschen Format (Komma). |
| **Fehler sind korrigierbar** | Sätze lassen sich bearbeiten und löschen, mit „Rückgängig“. Bestleistungen und Verlauf werden dabei neu berechnet. Vergessene Trainings werden nach 3 h automatisch beendet. |
| **Sicherheit zuerst (Schwangerschaft)** | Warnzeichen vor dem ersten Start bestätigen, „! Warnzeichen“ im Player, Abfrage vor Phasenwechsel nach der Geburt, Belastungstest nur nach Checkliste, Kaiserschnitt-Hinweise im Timer. |
| **Ruhiges Design** | Dark-first, flache Flächen, Haarlinien, keine Glows. Eukalyptus/Salbei (`--moss`) = trainiert/erledigt, Ocker (`--pollen`) = steht an (geplant, Pause). Zustände über Füllung, Linie und Gewicht. |
| **Haptik und Bewegung** | Kurze Vibrationen (`navigator.vibrate`) bei fast jeder Interaktion. Animationen respektieren `prefers-reduced-motion`. |
| **Deutsch, Du-Form** | Alle Texte auf Deutsch, Du-Form, kurze Sätze. Englisch nur bei Originalanleitungen der Übungsdatenbank (eingeklappt). |
| **Offline** | Als PWA mit Service Worker (siehe 3.21). Übungsfotos werden bei Bedarf geladen und gecacht. |

### 1.3 Technischer Rahmen

- Eine HTML-Datei ohne Framework, Vanilla JS. Schriften: Bricolage Grotesque (Display), Onest (Text), JetBrains Mono (Zahlen). In der Artifact-Fassung von Google Fonts, im Standalone-Build lokal aus `fonts/`.
- `build.py` erzeugt `index.html` (mit Viewport-Meta, Manifest, Theme-Color `#0F1312`, lokalen Fonts, `window.__standalone=true`), `manifest.webmanifest` und `sw.js`.
- Maximale Inhaltsbreite 520 px, seitlicher Rand mindestens 16 px bzw. Safe-Area. Unten 128 px Platz für die schwebende Tab-Leiste.
- Optionale Laufzeit-Fähigkeit im Claude-Artifact: `window.claude.use("downloads")` zum Speichern von Dateien. Ohne sie wird per `<a download>` gespeichert (nur Standalone) oder auf „lange drücken“ verwiesen.

### 1.4 Design-Tokens (verbindlich übernehmen)

| Token | Dunkel (Standard) | Hell |
|---|---|---|
| `--bg` | `#0F1312` | `#F2F2EE` |
| `--bg2` | `#131816` | `#EAEAE5` |
| `--surface` | `#161C1A` | `#FBFBF9` |
| `--s2` | `#1C2321` | `#FFFFFF` |
| `--ink` | `#E5E9E6` | `#161B19` |
| `--muted` | `#98A39E` | `#5A635F` |
| `--line` | `#28302D` | `#DADCD5` |
| `--moss` | `#8CBBA9` | `#3B6B5C` |
| `--glow` | `#7FAE9C` | `#6E9E8D` |
| `--on-moss` | `#0E1A15` | `#FFFFFF` |
| `--moss-soft` | `#1E2B27` | `#E1EAE5` |
| `--pollen` | `#CDAE7A` | `#C29A58` |
| `--pollen-ink` | `#231A0A` | `#2A1C06` |
| `--pollen-soft` | `#2A251C` | `#F2E9D8` |
| `--sky` | `#7F8DA3` | `#8C98AD` |
| `--live` | `#D98C78` | `#B0503C` |
| `--m-off` (Muskel aus) | `#242C29` | `#DCE1DD` |

Keimi-Farben: `--bud-body #8CBBA9 / #9CC3B3`, `--bud-shade #6E9C8A / #78A392`, `--bud-eye #0E1A15 / #13201B`, `--bud-leaf #9FC9A3 / #4F8A6A`, `--bud-stem #7FAE9C / #3B6B5C`, `--bud-cheek #CDAE7A / #C29A58`.

Radius `--r: 18px`. Easing: `--spring cubic-bezier(.34,1.4,.64,1)`, `--snap cubic-bezier(.2,.85,.25,1)`, `--soft cubic-bezier(.45,0,.2,1)`. Hintergrund: sehr feines 28-px-Raster, oben ausblendend, plus ein schwacher radialer Schimmer.

Das Theme wird vor dem ersten Rendern aus `lab.theme` gesetzt (`data-theme` auf `<html>`), damit nichts aufblitzt.

---

## 2. Navigation & Screens

### 2.1 Ansichten (Views)

Immer ist genau eine Ansicht sichtbar. Ansichten sind `<section class="view" id="v-…">`.

| ID | Titel / Zweck | Tab, der aktiv markiert ist | Erreichbar über |
|---|---|---|---|
| `v-heute` | Heute / Cockpit | Heute | Tab „Heute“, App-Start, Profil-Sheet „Mehr zu deinen Daten“, Fokuswechsel |
| `v-training` | „Deine Woche“ | Training | Tab „Training“, Kachel „Training heute“, Plan speichern/löschen, Session/Live beenden, Idee „Trainings-Begleiter“ |
| `v-ideen` | Ideen-Labor „Was dich packt“ | Ideen | Tab „Ideen“ |
| `v-feed` | „Drei Dinge, dann ist Schluss.“ | Feed | Tab „Feed“, Kachel „Feed“, Idee „Langsamer Feed“ |
| `v-gate` | Umlenken „Kurz innehalten, bevor du scrollst.“ | Umlenken | Tab „Umlenken“, Kachel „Umgelenkt“, Idee „Statt Instagram“ |
| `v-plan` | Plan bearbeiten | Training | „Neuer Plan“, Antippen eines Plans |
| `v-session` | Plan-Session „Training läuft“ | Training | „Lieber ohne Gewichte abhaken“, Kurzversion |
| `v-live` | Live-Training | Training | „Jetzt im Studio?“, „Training starten“ (Plan des Tages), Sperrbildschirm „Zurück zum Training“ |
| `v-mama` | Schwangerschaft & Rückbildung | Training | Kachel „Schwangerschaft & Rückbildung“, Kachel „Training heute“ im Fokus nur Mama, Ende/Abbruch des Players |
| `v-player` | Timer-Player | Training (Tab-Leiste ausgeblendet) | Heimplan starten, „Lust auf 10 Minuten ohne Geräte?“, Kurzversion ohne passende Geräte |

Beim Ansichtswechsel: neue Ansicht bekommt eine kurze gestaffelte Einblend-Animation (nur bei echtem Wechsel), Scroll nach oben.

### 2.2 Tab-Leiste

Schwebende Leiste unten (Glas-Effekt, Indikator gleitet mit Federanimation zum aktiven Tab). Reihenfolge:

1. **Heute** (Sonne) → `v-heute`
2. **Training** (Hantel) → `v-training`
3. **Ideen** (Funke) → `v-ideen` · ausgeblendet ohne Fokus „ideen“
4. **Feed** (Ebenen) → `v-feed` · ausgeblendet ohne Fokus „handy“
5. **Umlenken** (Pfeil) → `v-gate` · ausgeblendet ohne Fokus „handy“

Antippen eines nicht aktiven Tabs vibriert 6 ms. Die Tab-Leiste ist im Player komplett ausgeblendet. Für `v-plan`, `v-session`, `v-live`, `v-mama`, `v-player` ist „Training“ markiert.

### 2.3 Was beim Öffnen einer Ansicht passiert (Soll)

Vor jedem Wechsel: vergessenes Live-Training prüfen (siehe 3.9.18). Wurde es automatisch beendet und das Ziel war `live`, geht es stattdessen zu `training`.

| Ziel | Aktion |
|---|---|
| `heute` | Heute neu rendern (Ring, Gewohnheit, Abladen, Feed-/Umlenk-Zähler, Keimi), Trainingskachel, Privatsphäre-Kachel sicherstellen |
| `feed` | Tageswechsel des Feeds prüfen, Feed rendern, ggf. +5 Min. gutschreiben |
| `training` | komplette Trainingsansicht rendern |
| `live` | Live rendern, Uhr jede Sekunde aktualisieren |
| `gate` | Sperr-Schalter-Kachel sicherstellen, Umlenk-Ablauf auf „start“, Personenliste, Zeitkonto-Kachel |
| `mama` | Mama-Ansicht rendern |
| `player` | Player zeichnen, Tab-Leiste aus |
| jeder Wechsel weg vom Player | laufenden Timer pausieren, Wake-Lock freigeben |
| jeder Wechsel | Fokus-Klassen anwenden; beim ersten Wechsel nach dem Onboarding ggf. Fokus-Frage stellen (3.2) |
| Wechsel weg von `gate` | laufende Atem-Timer stoppen |

### 2.4 Overlays, Sheets und schwebende Elemente

| Element | Typ | Auslöser |
|---|---|---|
| Onboarding `.onb` | Vollbild-Dialog (z 60) | App-Start ohne Profil; „Alles neu einrichten“ im Profil |
| Ideen-Skizze `#sheet` | statisches Sheet (Eyebrow „Skizze“) | „Ansehen →“ bei einer Skizzen-Idee |
| Wochenplan-Tag (Pick-Sheet) | wiederverwendetes Sheet | Tag ohne Eintrag im Wochenstreifen; „Plan für heute wählen“; „Ändern“; „Plan für X ändern“ |
| Tag-Details | Sheet | Tag mit Eintrag im Wochenstreifen; „Was ich heute gemacht habe“ |
| Tagesform „Wie fühlst du dich heute?“ | Sheet | Live-Training starten, wenn keines läuft |
| „Kurz vorher messen?“ | Sheet (Warteschlange) | nach Tagesform, wenn Messwerte definiert sind |
| „Deine Werte“ / „Und jetzt, nachher?“ | Sheet (Warteschlange) | nach Trainingsende (Live, Session), wenn Messwerte definiert sind |
| Messwert anlegen/bearbeiten | Sheet | „Hinzufügen“ bzw. Chip in „Eigene Messwerte“ |
| Aktivität eintragen | Sheet (Warteschlange) | „+ Aktivität eintragen“, „Erledigt“ bei Aktivitätstag |
| Gedanke ablegen | Sheet | Wolken-Knopf in der Pausen-Pille |
| Pulsgurt verbinden | Sheet | Puls-Knopf ohne Web-Bluetooth |
| Abschluss-Karte | Sheet | Ende Live/Session; Knopf im Wochenrückblick |
| Wenn-Dann-Anker „Wann machst du es?“ | Sheet | Anker-Zeile in der Gewohnheit |
| „Was ist dir wichtig?“ | Sheet (Warteschlange) | erste Navigation nach Onboarding ohne Fokus; „Was soll die App zeigen?“ |
| Profil „Dein Profil“ | Sheet | Avatar-Knopf oben rechts |
| „Sicherung laden?“ | Sheet | nach Wahl einer gültigen Sicherungsdatei |
| So geht's | Sheet | Vorschaubild antippen; Karte/Zeile 350 ms halten; „So geht's“-Link; Tippen im Browser (Kontext „view“) |
| Übungsbrowser „Übungen“ | fast vollhohes Sheet | Einstiege `#xbLive`, `#xbPick`, `#xbPlan`, `#xbTrain` |
| Übungsverlauf | Sheet (Warteschlange) | „Verlauf“ im Logger, „Verlauf ansehen“ im So-geht's-Sheet, Übung im Tag-Sheet |
| Satz bearbeiten | Sheet | Satz-Chip antippen |
| Zifferneingabe Gewicht / Wdh. | Sheet | Zahl im Logger antippen |
| Mama: „Bevor du startest“, „Vor dem Belastungstest“, Längenwahl, Phasen-Sheet, „Sofort aufhören bei“ | Sheets | siehe 3.13 |
| Pausen-Pille `#rest` | fixiert über der Tab-Leiste (z 35) | Satz gespeichert, nur bei Zeit an |
| Toast `#toast` | fixiert, 2,4 s (mit Aktion 5 s) | überall |
| Keimi-Zuruf `#budToast` | fixiert, 3,6 s | Live-Training |
| Bestleistungs-Banner `.prbanner` | fixiert, 2,6 s | neue Bestleistung |
| Konfetti `canvas.fx` | Vollbild, 1,15 s | Plan-Session komplett abgehakt |

**Sheet-Verhalten (Soll):** schließt per Tipp auf den abgedunkelten Hintergrund, per Escape und per Wischen nach unten (> 90 px, nur wenn der Inhalt oben steht). Dynamische Sheets werden 320 ms nach dem Schließen aus dem DOM entfernt. Nie zwei Sheets übereinander: Folgesheets (Messwerte, Fokus, Aktivität, Verlauf, Plan ändern) gehen in eine **Warteschlange**, die alle 220 ms prüft, ob ein Sheet offen ist, das Onboarding läuft, eine Abschluss-Karte gerade erzeugt wird oder eine kurze Sperrfrist (1,5 s nach Trainingsende) läuft.

**Toast-Verhalten:** zentriert unten über der Tab-Leiste. Ist ein Sheet offen oder ist die Live-Ansicht aktiv, erscheint der Toast **oben** (nie über Sheet-Knöpfen oder „Satz speichern“). Ist die Pausen-Pille sichtbar, rückt er darüber. Toasts mit Aktion (z. B. „Rückgängig“) bleiben 5 s.

### 2.5 Einstiegspunkte im Überblick (was löst was aus)

```
Heute
 ├─ Name (h1) ............ Inline-Bearbeitung
 ├─ Avatar ............... Profil-Sheet ─┬─ „Alles neu einrichten“ → Onboarding (Bearbeiten)
 │                                       └─ „Mehr zu deinen Daten“ → Heute, scrollt zu „Deine Daten“
 ├─ Theme-Schalter ....... hell/dunkel
 ├─ Keimi ................ Antippen = neue Zeile
 ├─ Wochenring ........... (keine Aktion; nur Anzeige) 
 ├─ Motto ................ Inline-Bearbeitung
 ├─ Anker-Zeile .......... Sheet „Wann machst du es?“
 ├─ Training heute ....... Training (oder Mama, wenn nur Fokus Mama)
 ├─ Feed / Umgelenkt ..... Feed / Umlenken
 └─ Deine Daten .......... Sicherung speichern / laden, Was soll die App zeigen?, Alle Daten löschen
Training
 ├─ Ansicht Einfach|Profi
 ├─ Jetzt im Studio? ..... Tagesform → (Messwert vorher) → Live
 ├─ Übungen nachschlagen . Browser (view)
 ├─ Wochenstreifen-Tag ... erledigt: Tag-Details · sonst: Pick-Sheet
 ├─ Heute-Kachel ......... Training starten (Live mit Plan) · Kurzversion · ohne Gewichte abhaken ·
 │                         Plan für heute wählen · 10 Min. ohne Geräte · Erledigt/Ändern (Aktivität) ·
 │                         + Aktivität eintragen · Was ich heute gemacht habe · Tauschen (Beinhinweis)
 ├─ Muskelkarte .......... Muskel antippen = Toast mit Wochenzahl
 ├─ Wochenrückblick ...... Abschluss-Karte
 ├─ Pläne ................ Plan-Editor · Neuer Plan
 ├─ Geräte ............... Chips an/aus
 ├─ Eigene Messwerte ..... anlegen/bearbeiten, Verlauf
 └─ Schwangerschaft ...... Mama-Ansicht
```

---
## 3. Funktionen im Einzelnen

### 3.1 Onboarding & Profil

#### 3.1.1 Onboarding (Erststart)

Erscheint beim Laden, wenn `lab.profile` fehlt. Vollbild, sechs Schritte mit Fortschrittspunkten. Oben in jedem Schritt spricht Keimi in einer Sprechblase (bei Bearbeitung mit aktuellem Wachstum, sonst Stufe 1).

| Schritt | Inhalt | Keimi sagt | Pflicht? |
|---|---|---|---|
| 0 | Eyebrow „Willkommen“ (bzw. „Profil“), h1 „Wie heißt du?“ + Pill „optional“, Feld „Dein Name oder Spitzname“, Zeile „Freiwillig. Bleibt nur auf deinem Handy.“ | „Hi! Ich bin {Keimi}. Ich wohne ab jetzt in deinem Handy. Wie heißt du?“ (Bearbeiten: „Hi {Name}! Hier kannst du alles ändern.“) | nein |
| 1 | Eyebrow „Dein Begleiter“, h1 „Name und Ton“, Feld „Name deines Begleiters“ (max. 16 Zeichen, Platzhalter „Keimi“), drei Ton-Karten (Ruhig / Motivierend / Frech) mit Beispielsatz aus dem Pool `lset3` des Tons, Schalter „Begleiter zeigen – Taucht auf Heute und ab und zu im Training auf. Jederzeit abschaltbar.“ | „Freut mich, {Name}! Wie soll ich heißen, und wie soll ich mit dir reden?“ Bei Tonwahl zeigt die Blase den Beispielsatz. Namensänderung aktualisiert die Blasen-Überschrift live. | nein |
| 2 | Eyebrow „Ziel · optional“, h1 „Was willst du erreichen?“, fünf Ziel-Karten (siehe unten). Erneutes Antippen wählt ab. | „Wofür trainierst du? Kannst du auch später entscheiden.“ | nein |
| 3 | Eyebrow „Optional“, h1 „Alter und Gewicht“, zwei Zahlenfelder (Alter 10–99, Gewicht 30–250 kg), Hinweis „Kannst du leer lassen. Dein Gewicht hilft bei Übungen mit Körpergewicht.“ + Datenschutzzeile | „Ganz freiwillig. Ich verrat's niemandem.“ | nein |
| 4 | Eyebrow „Rhythmus“, h1 „Wie oft pro Woche willst du trainieren?“, Knöpfe 2–6 (Standard 3), Hinweis „Daraus wird ein Vorschlag für deinen Wochenplan. Verpasste Tage sind kein Drama.“ | „Wie oft willst du? Lieber realistisch als perfekt.“ | – |
| 5 | Eyebrow „Geräte“, h1 „Was hast du zur Verfügung?“, Chips aller Geräte (siehe 3.6.1) | „Letzte Frage. Was hast du zum Trainieren da?“ | – |

Ziele (`GOALS`, Name · Untertitel · Standard-Wdh.): Muskelaufbau „Mehr Muskeln, saubere Technik“ 10 · Kraft „Schwerer heben, weniger Wiederholungen“ 5 · Abnehmen „Viel Bewegung, kurze Pausen“ 15 · Fit bleiben „Regelmäßig, ohne Druck“ 12 · Ausdauer „Länger durchhalten“ 15.

Fußleiste: links „Zurück“ (ab Schritt 1) bzw. „Schließen“ (nur im Bearbeiten-Modus auf Schritt 0), rechts der Hauptknopf: „Überspringen“, solange der Schritt leer ist (Name leer, kein Ziel, Alter und Gewicht leer), sonst „Weiter“, im letzten Schritt „Los geht's“. Der Knopftext aktualisiert sich beim Tippen. Erstes Eingabefeld bekommt den Fokus (nicht auf Schritt 1 und 2).

Geräte: Vorauswahl ist **nur „Körpergewicht“** (aus `lab.gear`, Standard `["Körpergewicht"]`). Antippen schaltet um.

**Abschluss („Los geht's“):**

1. `lab.profile = {name, goal, age:Zahl|"", weight:Zahl|"", days}` speichern, `lab.name = name` (leer erlaubt; angezeigt wird dann „du“).
2. `lab.buddy = {name: Begleitername || "Keimi", tone, on}`.
3. Nur beim Erststart: Wochenplan aus dem Rhythmus vorschlagen. Muster (Wochentagsindizes): 2 → [Mo, Do], 3 → [Mo, Mi, Fr], 4 → [Mo, Di, Do, Fr], 5 → [Mo–Fr], 6 → [Mo–Sa]. Die vorhandenen Pläne werden reihum verteilt (`sched[tag] = planIds[i % n]`). Gibt es keine Pläne, bleibt der Plan leer.
4. Geräte speichern, Overlay schließen, Avatar aktualisieren, zu „Heute“ wechseln (bzw. „Training“, wenn das gerade offen war).
5. Toast „Willkommen, {Name}.“ bzw. „Willkommen.“ (Erststart) oder „Profil gespeichert“.
6. Erststart mit Begleiter an: Keimi auf Heute fröhlich, Blase „Yay, wir sind jetzt ein Team, {Name}!“ (Ton frech) bzw. „Schön, dass du da bist, {Name}. Wir wachsen zusammen.“

#### 3.1.2 Profil-Sheet „Dein Profil“

Öffnet über den runden Avatar-Knopf oben rechts auf Heute (Initiale des Namens; ohne Namen und mit Begleiter an zeigt der Knopf Keimi).

Inhalt:
- Kopf: Keimi (fröhlich), „Hi {Name}!“ bzw. „Hi!“, darunter „Ziel: {Ziel}“ bzw. „Kein Ziel gewählt, auch okay.“
- **Du** (optional): Feld Name (speichert bei Änderung/Verlassen in `lab.profile.name` und `lab.name`, aktualisiert Gruß und Avatar), Ziel-Pills (Antippen wählt, erneutes Antippen wählt ab).
- **Begleiter**: Schalter „Begleiter zeigen – Auf Heute und ab und zu im Training.“, Feld Name (leer → „Keimi“), Ton-Segment Ruhig/Motivierend/Frech, darunter ein Beispielsatz aus `lset3` im gewählten Ton. Jede Änderung speichert sofort und rendert Keimi auf Heute neu.
- **Dunkles Design**: Theme-Schalter (3.18).
- **Daten**: „Alles bleibt nur auf deinem Handy. Kein Konto, kein Upload.“, Knöpfe „Mehr zu deinen Daten“ (→ Heute, scrollt zur Kachel „Deine Daten“), „Alles neu einrichten“ (→ Onboarding im Bearbeiten-Modus), „Fertig“.

Alter, Gewicht und Rhythmus sind nur über „Alles neu einrichten“ änderbar. Im Bearbeiten-Modus wird der Wochenplan **nicht** neu vorgeschlagen.

#### 3.1.3 Name im Gruß

`h1` „Moin, {Name}“. Tipp auf den Namen macht ein Inline-Feld daraus (Enter oder Verlassen speichert; leer → „du“). **Soll:** Speichert auch `lab.profile.name`, damit Avatar und Profil übereinstimmen (Ist: nur `lab.name`, siehe 7).

---

### 3.2 Fokus-Modi „Was ist dir wichtig?“

Vier Schwerpunkte (`FOCI`):

| Schlüssel | Titel | Beschreibung |
|---|---|---|
| `train` | Training | Studio, Pläne, Muskelkarte |
| `handy` | Weniger Handy | Umlenken statt Instagram, langsamer Feed |
| `mama` | Schwangerschaft & Rückbildung | Heimpläne passend zur Woche |
| `ideen` | Ideen-Labor | Skizzen für neue Funktionen |

**Speicherung:** `lab.foci` als Array. Fehlt der Schlüssel, gelten **alle vier** als aktiv. Das Sheet schlägt dann aber nur `train` und `handy` vor.

**Sheet:** Titel „Was ist dir wichtig?“, Text „Die App zeigt dann nur das. Du kannst es jederzeit ändern.“, vier umschaltbare Karten, Knopf „Fertig“. Leere Auswahl wird als `["train"]` gespeichert. Danach Klassen anwenden und die aktuelle Ansicht neu zeigen. War man in „Ideen“ und hat Ideen abgewählt, geht es zu Heute.

**Wann gefragt:** einmal pro App-Sitzung beim ersten Ansichtswechsel, wenn `lab.foci` fehlt, ein Profil existiert und kein Onboarding offen ist (600 ms verzögert, über die Sheet-Warteschlange). Direkt nach dem Onboarding passiert das automatisch, weil das Onboarding selbst die Ansicht wechselt. Jederzeit erreichbar über „Was soll die App zeigen?“ in „Deine Daten“.

**Wirkung (Klassen `no-<key>` auf `<html>`):**

| Fehlt | Ausgeblendet / geändert |
|---|---|
| `ideen` | Tab „Ideen“ |
| `handy` | Tabs „Feed“ und „Umlenken“, Kacheln „Feed“ und „Umgelenkt“ auf Heute, Zeitkonto-Kachel. „+N Min. Instagram verdient“-Toasts entfallen (Gutschrift läuft still weiter). **Soll zusätzlich:** Sperr-Hinweis im Live-Training und Sperr-Schalter ausblenden, leere Kachelreihe vermeiden. |
| `mama` | Kachel „Schwangerschaft & Rückbildung“ im Training |
| `train` | Im Training: Live-Knopf, Ansichtsschalter, Wochenplan, Heute-Kachel, Muskelkarte, Volumen, Wochenrückblick, Pläne, Geräte, Messwerte. Die Mama-Kachel rückt nach oben. |
| `train` fehlt und `mama` aktiv | Kachel „Training heute“ auf Heute zeigt den ersten Plan der aktuellen Phase („{Planname}“, „{SSW-Label} · {Min.} Min. zu Hause“) bzw. „Schwangerschaft & Rückbildung / Pläne passend zur Woche“ und führt zur Mama-Ansicht. |

Migration: Ein älteres `lab.focus` als **Array** war früher die Fokus-Liste. Beim Start: Ist `lab.focus` ein Array und `lab.foci` fehlt, wird es nach `lab.foci` kopiert. `lab.focus` wird dann auf `{day:"",text:"",done:false}` zurückgesetzt.

---

### 3.3 Heute / Cockpit (`v-heute`)

Reihenfolge von oben nach unten:

1. **Kopfzeile**: links Eyebrow mit Datum (`toLocaleDateString("de-DE",{weekday:"long",day:"numeric",month:"long"})`, z. B. „Montag, 19. Oktober“) und `h1` „Moin, {Name}“; rechts Theme-Schalter und Avatar-Knopf.
2. **Keimi-Zeile** (wenn Begleiter an): Keimi (72×80 px, antippbar) + Sprechblase mit Überschrift „{Name} · {Stufenname}“ und Text (3.4).
3. **Wochenring** (Kachel, nur Anzeige).
4. **Motto**.
5. **Eine Sache heute**.
6. **Gewohnheit** mit Wenn-Dann-Anker.
7. **Training heute** (Kachel, antippbar).
8. Zweierreihe **Feed** | **Umgelenkt**.
9. **Kurz abladen**.
10. Hinweis „Tipp auf deinen Namen oder den Satz oben, um sie zu ändern. Alles bleibt nur auf diesem Gerät.“
11. **Deine Daten** (Privatsphäre, Sicherung, Fokus, Löschen).

#### 3.3.1 Wochenring

- SVG-Ring (r = 44, Strichstärke 8), Fortschritt animiert von 0 auf den Wert (1,2 s). Bei 0 ist der Bogen unsichtbar.
- Mitte: `{nd}/{total}` und „WOCHE“.
- Rechts: Eyebrow „Training“, Satz, sieben Punkte Mo–So.
- **Zähler `nd`** = Anzahl der Einträge dieser Woche (Mo–So) ohne Beispiel-Einträge. Aktivitäten und Heimpläne zählen mit.
- **Nenner `total`** = Wochenziel = `profile.days`, falls > 0, sonst Anzahl geplanter Tage im Wochenplan, sonst 3.
- Füllung `min(1, nd/total)`.
- Satz: `nd ≥ total` → „Woche geschafft. Stark.“ · `nd > 0` → „Noch {total−nd} Einheit(en) bis zu deinem Ziel.“ · sonst „Die Woche gehört dir.“
- Punkte: gefüllt (moss) = Tag mit Eintrag, Ocker-Ring = Plan oder Aktivität geplant, fett = heute.
- `aria-label`: „Trainingswoche: {nd} von {total} Einheit(en). {Satz}“.

#### 3.3.2 Motto

Ein Satz mit grüner Linie links. Standard „Weniger scrollen, mehr erleben.“ Antippen → Inline-Feld, Enter/Verlassen speichert in `lab.motto`. Leer → „Ein Satz für dich.“

#### 3.3.3 Eine Sache heute

Eyebrow „Eine Sache heute“, rundes Kontrollkästchen + Textfeld („Was soll heute passieren?“). Speicherung `lab.focus = {day, text, done}` bei jeder Eingabe. Ist `day` nicht heute, beginnt der Tag leer. Abgehakt: Text durchgestrichen und gedämpft. Vibration 14 ms beim Abhaken, 6 ms beim Aufheben.

#### 3.3.4 Gewohnheit, Wenn-Dann-Anker, Comeback-Texte

- Kopf: Eyebrow „Gewohnheit“, rechts ein unauffälliges Eingabefeld mit dem Namen (Standard „10 Min. lesen“, leer → „Gewohnheit“), speichert bei Änderung.
- **Anker-Zeile** (Knopf über dem Wochenraster):
  - Mit Anker: kleine Zeile „Dein Plan“, fett „{Anker mit großem Anfangsbuchstaben}: {Gewohnheitsname ohne Punkte am Ende}“, z. B. „Nach dem Aufstehen: 10 Min. lesen“.
  - Ohne Anker: „Tipp für mehr Erfolg“ / „Wann genau? Leg einen festen Moment fest.“
  - Sheet „Wann machst du es?“: Text „Ein fester Moment im Alltag macht aus Vorsätzen Gewohnheiten. Studien zeigen einen deutlichen Effekt solcher Wenn-Dann-Pläne.“, Chips: „nach dem Aufstehen“, „nach dem Zähneputzen“, „nach dem Frühstück“, „nach der Arbeit“, „nach dem Abendessen“, „vor dem Schlafengehen“, dazu ein Freitextfeld („z. B. nach dem ersten Kaffee“, vorbelegt mit einem eigenen Anker) und „Speichern“. Toast „Plan gespeichert“.
- **Wochenraster** Mo–So: Kacheln mit Kürzel. Zukünftige Tage sind deaktiviert. Antippen schaltet den Tag um (`habit.days[key]=true` bzw. löschen), kleine Pop-Animation, Vibration 14/6 ms.
- **Notiz unter dem Raster** (Priorität von oben):
  1. Wurde die Gewohnheit noch nie abgehakt: Basistext (siehe 4).
  2. Heute erledigt, gestern nicht → „Comeback. Genau so geht's.“
  3. Heute, gestern und vorgestern nicht → „Kleiner Neustart: Heute reicht auch eine Mini-Version.“
  4. Heute und gestern nicht → „Gestern war Pause. Heute zählt wieder.“
  5. Sonst Basistext: Anzahl > 0 → „{n} von 7 Tagen diese Woche. Ausrutscher sind okay.“, sonst „Tipp auf heute, wenn du es gemacht hast.“

#### 3.3.5 Kurz abladen (Brain Dump)

Eyebrow „Kurz abladen“, Formular mit Feld „Gedanke, der stört“ und Knopf „Ab“. Neue Einträge werden an `lab.dump` angehängt. Angezeigt werden die **letzten vier**, neueste oben, je als Knopf „{Text} · erledigt ✓“. Antippen entfernt den Eintrag. **Soll:** nur genau diesen Eintrag entfernen (Ist: alle gleichlautenden). Auch aus der Pausen-Pille im Live-Training befüllbar (3.9.14).

#### 3.3.6 Kachel „Training heute“

Eyebrow „Training heute“, großer Titel, Untertitel. Antippen → Training (bzw. Mama, siehe 3.2). Inhalte nach Priorität:

| Zustand | Titel | Untertitel |
|---|---|---|
| nur Fokus Mama (ohne Training) | erster Plan der aktuellen Phase bzw. „Schwangerschaft & Rückbildung“ | „{SSW-Label} · {min} Min. zu Hause“ bzw. „Pläne passend zur Woche“ |
| heute Eintrag vorhanden, letzter ist Aktivität | „{Nomen} eingetragen“ (z. B. „Lauf eingetragen“) | Details „5,5 km · 32 Minuten · Gefühl 6/10“ oder „Schön, dass du dich bewegt hast“ |
| heute Eintrag vorhanden, sonst | „Erledigt“ | „{Bezeichnung} · {Beschreibung}“ (3.6.3) |
| heute Aktivität geplant | Aktivitätsname (z. B. „Laufen“) | „Andere Sportart heute“ |
| heute Plan geplant | Planname | „{n} Übung(en) · ca. {min} Min.“ |
| sonst | „Ruhetag“ | „Erholung gehört dazu“ |

#### 3.3.7 Kacheln Feed und Umgelenkt

- **Feed**: große Zahl = ungelesene Feed-Elemente, darunter „Sache wartet“ / „Sachen warten“ / „du bist durch“. Antippen → Feed. **Soll:** vor dem Zählen den Tageswechsel des Feeds anwenden (Ist: veraltet bis zum ersten Feed-Besuch).
- **Umgelenkt**: große Zahl = `lab.redirects[Montag dieser Woche]`, darunter „mal diese Woche“. Antippen → Umlenken.

#### 3.3.8 Kachel „Deine Daten“

Eyebrow „Deine Daten“ (Häkchen-Symbol). Text:

> Alles, was du einträgst, bleibt nur auf diesem Gerät. Es gibt kein Konto, deine Einträge werden nicht hochgeladen oder geteilt, außer du speicherst selbst ein Bild. Nur die Schriftarten lädt die Seite von Google Fonts. Alle Angaben im Profil sind freiwillig.

**Soll:** Den Satz zu Google Fonts nur zeigen, wenn die Fonts tatsächlich von Google geladen werden (Artifact-Fassung). Im Standalone-Build mit lokalen Fonts: „Auch die Schriftarten liegen auf dem Gerät.“ (Ist: Satz immer da.)

Darunter:
- Zeile „Neues Handy? Mit einer Sicherung nimmst du alles mit.“ und Knöpfe **Sicherung speichern** | **Sicherung laden** (3.17).
- **Alle meine Daten löschen**: erster Tipp ändert den Text zu „Wirklich alles löschen? Nochmal tippen“ (4 s Frist), zweiter Tipp entfernt alle `lab.*`-Schlüssel und lädt neu.
- **Was soll die App zeigen?** → Fokus-Sheet.

---

### 3.4 Begleiter Keimi

#### 3.4.1 Konfiguration

`lab.buddy = {name:"Keimi", tone:"motiv", on:true}` (Standard, wird mit Gespeichertem gemischt). Töne: `ruhig` (Ruhig), `motiv` (Motivierend), `frech` (Frech). Name leer → „Keimi“. Ist `on:false`, verschwindet Keimi überall (Heute-Zeile, Zurufe, Abschluss-Karte, Umlenken, Avatar).

#### 3.4.2 Wachstum (Stufen)

- **Aktive Tage** = Menge der Datumsschlüssel in den letzten 28 Tagen (heute und die 27 Tage davor), an denen mindestens eines gilt: ein Trainingslog-Eintrag (**Soll:** ohne Beispiel-Einträge), ein abgehakter Gewohnheitstag, oder im Zeitkonto `redirects > 0`.
- Stufe nach Anzahl `n`: `n ≥ 16` → 4 (Blüte), `n ≥ 10` → 3 (Knospe), `n ≥ 4` → 2 (Zwei Blätter), sonst 1 (Keimling).
- **Nie mehr als eine Stufe zurück**: `stufe = max(stufe, maxErreicht − 1)`. Steigt die Stufe über `maxErreicht`, wird `lab.buddyMeta.max` aktualisiert.
- Stufennamen: „Keimling“, „Zwei Blätter“, „Knospe“, „Blüte“.

#### 3.4.3 Aussehen (SVG 64×72)

Runder grüner Körper mit Schatten, Glanzpunkt, Wangen, Augen und Mund je nach Stimmung, Bodenschatten. Spross je Stufe: 1 = Stiel mit einem Blatt; 2 = Stiel (Spitze y 20) mit zwei Blättern; 3 = höher (y 14) plus ockerfarbene Knospe; 4 = (y 12) plus fünfblättrige Ockerblüte. Stimmungen: `calm`, `happy`, `cheer` (Arme hoch, hüpft), `tired` (geschlossene Augen, hängender Spross, „z z“), `proud` (Funkel-Sterne). Daueranimationen: Atmen (4,2 s), Wiegen des Sprosses (5,6 s). Bei reduzierter Bewegung keine Animation.

#### 3.4.4 Besuch, „Zurück nach Pause“

`lab.buddyMeta.last` = letzter Besuchstag von Heute. Beim Rendern von Heute: Ist `last` ≠ heute und liegt mindestens 3 Tage zurück, wird `backDay = heute`, `backShown = false` gesetzt. Dann `last = heute`.

#### 3.4.5 Kontext auf Heute (Priorität)

| # | Bedingung | Kontext | Stimmung |
|---|---|---|---|
| 1 | `backDay` = heute und noch nicht gezeigt | `back` mit Aufwach-Sequenz: erst müde „…hm? Oh!“, nach 900 ms (0 ms bei reduzierter Bewegung) fröhlich mit `back`-Satz und Hüpfer. Danach `backShown = true`. | tired → happy |
| 2 | heute neue Bestleistung | `pr` | proud |
| 3 | heute Eintrag im Trainingslog | `trainDone` | proud |
| 4 | Uhrzeit ≥ 22 oder < 5 | `night` | tired |
| 5 | „idle“: in den letzten 4 Tagen (heute bis heute−3) kein aktiver Tag, aber es gab schon Aktivität | `sleepy` | tired |
| 6 | heute ist im Wochenplan etwas eingetragen (Plan **oder** Aktivität) | `trainToday` | cheer (bei Ton ruhig: calm) |
| 7 | Umlenkungen diese Woche > 0, mit 40 % Wahrscheinlichkeit | `redirect` | happy |
| 8 | mit 50 % Wahrscheinlichkeit | `rest` | calm |
| 9 | sonst nach Uhrzeit: < 11 `morning`, ≥ 17 `evening`, sonst `day` | | calm |

**Antippen**: Vibration, Zähler +1. Kontext reihum aus `["tap","tap",<aktueller Kontext>]` (bei `sleepy` → `tap`). Jedes vierte Antippen Stimmung `cheer`, sonst `happy`, mit Hüpfer. Blasentext wechselt mit kurzer Einblendung.

#### 3.4.6 Platzhalter in den Sätzen

- `{, n}` → „, {Name}“ oder leer (wenn kein Name bzw. Name „du“).
- `{n}` → Name oder „du“.
- `{b}` → Begleitername.
- `{r}` → Umlenkungen dieser Woche.

#### 3.4.7 Zurufe im Live-Training (`budSay`)

Kleine Karte (Keimi 44×48 + Name + Satz). In der Live-Ansicht **oben** fixiert, sonst unten über der Tab-Leiste, dabei nie über „Satz speichern“ oder der Pausen-Pille. Verschwindet nach 3,6 s, Antippen schließt sofort.

**Rate-Limit**: normaler Zuruf frühestens 120 s nach dem letzten; erzwungener Zuruf (Bestleistung) frühestens 45 s nach dem letzten.

Auslöser beim Speichern eines Satzes (eine Regel pro Satz, in dieser Reihenfolge):
1. Neue Bestleistung → `lpr` (erzwungen, stolz, nach 2,9 s, damit das Bestleistungs-Banner zuerst steht).
2. Erster Satz des Trainings → `lstart` (fröhlich, nach 0,7 s).
3. Dritter Satz derselben Übung → `lset3` (cheer, nach 0,6 s).
4. Ab 14 Sätzen gesamt, einmal pro Training → `lend` (fröhlich).

Nach Ablauf der Pause (Pausen-Pille zeigt „Los!“, Live-Ansicht aktiv) → `lrest` (cheer). **Soll:** zur tatsächlich eingestellten Pausendauer (Ist: fest nach 90 s, siehe 7).

#### 3.4.8 Weitere Auftritte

- **Abschluss-Karte**: Wurde in den letzten 4 s ein Training beendet, steht unter dem Sheet-Titel Keimi (stolz) mit einem `finish`-Satz.
- **Umlenken**: Nach „{Name} schreiben“ unter dem Nachrichtenvorschlag eine leise Zeile mit Keimi (fröhlich) und einem `gate`-Satz.
- **Avatar-Knopf**: ohne Namen zeigt er Keimi (calm).
- **Onboarding und Profil** (3.1).

---

### 3.5 Training – Übersicht (`v-training`)

Reihenfolge im Fokus Training:

1. Kopf: Eyebrow „Training · Ziel: {Ziel}“ (ohne Ziel: „Training“), `h1` „Deine Woche“.
2. **Ansicht**-Schalter: „Ansicht“ + Segment **Einfach | Profi**.
3. **Live-Knopf** (`#liveCta`).
4. **Übungen nachschlagen** (`#xbTrain`, Browser im Modus „view“).
5. **Wochenplan** (Wochenstreifen).
6. **Heute-Kachel** (`#todayTrain`).
7. **Muskelkarte**.
8. **Sätze pro Muskel** (`#volTile`, nur Profi).
9. **Wochenrückblick** (`#weekReview`) mit Knopf Abschluss-Karte.
10. **Deine Pläne**.
11. **Deine Geräte**.
12. **Eigene Messwerte** (`#metricsTile`).
13. **Schwangerschaft & Rückbildung** (`#mamaTile`, im Fokus Training immer ganz unten).

#### 3.5.1 Live-Knopf

- Kein Live-Training: Hantel-Symbol, „Jetzt im Studio?“ / „Live-Training starten: Muskel antippen, Gerät wählen, Satz speichern.“
- Live-Training läuft: „Training läuft“ / „{n} Satz/Sätze · weiter geht's“ (mit Plan: „{Planname} · {n} Sätze · weiter geht's“), pulsierender Punkt.
- Antippen → Live starten bzw. fortsetzen (3.9.1).

#### 3.5.2 Wochenstreifen (Semantik)

Sieben Kacheln Mo–So der aktuellen Woche. Jede zeigt Wochentagskürzel (2 Buchstaben), Tageszahl und ein Etikett.

| Zustand (Priorität) | Klasse / Optik | Etikett | Antippen |
|---|---|---|---|
| Tag hat Einträge (ohne Beispiele) | `done`: moss gefüllt | Kurzlabel des **letzten** Eintrags des Tages (3.6.3) | Tag-Details-Sheet |
| Aktivität geplant | `planned` + gestrichelter Rand | Aktivitätskürzel („Lauf“, „Rad“, „Schw“, „Ball“, „Yoga“, „Tour“, „Sport“) | Pick-Sheet |
| Plan geplant | `planned`: Ocker-Rand, Ocker-Etikett | Plan-Kürzel (`abbr`, siehe 5.10) | Pick-Sheet |
| sonst | neutral | „–“ | Pick-Sheet |

Heute: dicker Rand in `--ink` plus Punkt unter der Kachel. `aria-label` z. B. „Dienstag (heute): erledigt, Oberkörper. Antippen zeigt, was du gemacht hast.“ bzw. „Mittwoch: Laufen geplant“ bzw. „Donnerstag: Ruhetag“. Antippen vibriert 5 ms.

#### 3.5.3 Pick-Sheet (Tag planen)

Titel = Wochentag (z. B. „Mittwoch“). Hat der Tag schon einen Eintrag: Hinweis „An diesem Tag hast du schon trainiert.“ Liste: alle Pläne („{n} Übung(en) · ca. {min} Min.“) und „Ruhetag / Erholung“, aktuelle Wahl mit Häkchen. Darunter „Andere Sportart an diesem Tag“ mit Chips: Laufen, Radfahren, Schwimmen, Mannschaftssport, Yoga / Mobility, Wandern, Andere Aktivität. Auswahl speichert `lab.sched[i]` (Plan-ID, `act:<typ>` oder Schlüssel löschen), schließt, rendert neu, Toast „{Wochentag}: {Wahl}“. Schließen-Knopf.

#### 3.5.4 Heute-Kachel – Varianten

| Fall | Inhalt |
|---|---|
| **A. Heute schon Einträge** | Eyebrow „Heute erledigt“ (Häkchen), „Stark gemacht.“, je Eintrag eine Zeile (`todayLine`, 3.6.3), Knopf „Was ich heute gemacht habe“ → Tag-Details. Darunter Link „+ Aktivität eintragen“. |
| **B. Plan für heute** (Hero-Optik) | Eyebrow „Heute · {Wochentag}“, Planname, „{n} Übungen · ca. {min} Min. · {Muskeln}“. Ggf. **Beinhinweis** (3.5.5) **über** dem Startknopf. CTA **„Training starten“** → Live-Training mit Plan-Warteschlange (3.9.15); läuft schon ein Live-Training mit diesem Plan: „Training fortsetzen“. Darunter „Wenig Zeit oder Energie? Kurzversion, ca. 15 Min.“ (3.5.6), Link „Lieber ohne Gewichte abhaken“ (→ Plan-Session, 3.10), Link „+ Aktivität eintragen“. |
| **C. Aktivität für heute** | Eyebrow „Heute · {Wochentag}“, Aktivitätsname, „Kein Krafttraining geplant. Trag es ein, wenn du fertig bist.“, Knöpfe „Erledigt“ (→ Aktivität eintragen mit diesem Typ) und „Ändern“ (→ Pick-Sheet). |
| **D. Ruhetag** | Eyebrow „Heute · {Wochentag}“, „Ruhetag.“, „Erholung gehört dazu. Lust hast du trotzdem?“, Knopf „Plan für heute wählen“ (→ Pick-Sheet), Knopf „Lust auf 10 Minuten ohne Geräte?“ (→ Player mit Einsteigerplan b1), Link „+ Aktivität eintragen“. |

#### 3.5.5 Beinhinweis (Plan-Tag)

Bedingungen: heute Plan geplant, heute noch nichts erledigt, der Plan ist „beinlastig“ (mindestens 2 der Muskeln Beine vorn, Beine hinten, Po, Waden) und gestern **oder** morgen ist im Wochenplan eine Bein-Aktivität (Laufen, Radfahren, Mannschaftssport, Wandern).

Hinweiskarte (Funke-Symbol): fett „Gestern {Aktivität}“ bzw. „Morgen {Aktivität}“, Text „Deine Beine brauchen Erholung. Heute lieber {Alternative} oder die Kurzversion.“ Die Alternative ist der erste Plan, der nicht beinlastig ist und Übungen hat, als „„{Name}““; heißt er selbst „Oberkörper…“, wird nicht „Oberkörper („Oberkörper“)“ doppelt geschrieben, sondern nur „„Oberkörper““. Ohne Alternative: „Oberkörper“. Knopf **„Tauschen“** (nur mit Alternative) setzt `sched[heute] = Alternative`, Toast „Heute: {Name}“.

#### 3.5.6 Kurzversion

Knopf „Wenig Zeit oder Energie? Kurzversion, ca. 15 Min.“ (nur Fall B).
- Haben alle der **ersten drei** Übungen des Plans ein Gerät, das die Person besitzt: Plan-Session mit den ersten drei Übungen, je höchstens 2 Sätze, Titel „{Plan} · kurz“, Toast „Kurzversion: zählt voll.“ Der Log-Eintrag bekommt die ID des Originalplans.
- Sonst: Player mit dem Einsteigerplan „10 Minuten ohne Geräte“ (b1).

#### 3.5.7 Muskelkarte

- Zwei Figuren „Vorne“ und „Hinten“ (SVG 120×244, 12 Muskelgruppen, siehe 3.11.1). Muskelfarbe nach gewichteten Sätzen dieser Woche: ≥ 9 → stark (`l3`), ≥ 5 → mittel (`l2`), ≥ 1 → leicht (`l1`), sonst ist der Muskel diese Woche noch eingeplant → Ocker gestrichelt (`plan`), sonst aus.
- „Eingeplant“ = Muskeln aller Pläne an Tagen ab heute, die geplant und noch ohne Eintrag sind.
- Legende: „trainiert“ (dreistufiger Verlauf), „noch geplant“, „offen“.
- Kopfzeile rechts: „{n} Satz/Sätze diese Woche“ (**echte** Sätze, ohne Beispiele) bzw. „Noch nichts diese Woche“.
- Chips der trainierten Muskeln, absteigend, mit gewichteter Zahl („Brust **6,5**“).
- Muskel antippen → Toast „{Muskel}: {x} Sätze diese Woche“ / „noch geplant“ / „diese Woche noch offen“.
- Nach Ende einer Plan-Session: die frisch trainierten Muskeln zeigen erst den alten Stand und blenden ein, sobald die Karte zu 35 % sichtbar ist (pulsierend).
- **Vorschlagszeile**: „relevante“ Muskeln = Muskeln aus Einträgen der letzten 28 Tage (ohne Beispiele) plus Muskeln aller Pläne im Wochenplan. „Offen“ = relevant, nicht Unterarme, diese Woche nicht trainiert, nicht eingeplant, und nicht Beinmuskeln, wenn diese Woche schon eine Bein-Aktivität eingetragen wurde. Bester Plan = Plan (eigener oder im Wochenplan genutzter Beispielplan), der die meisten offenen Muskeln abdeckt.
  - Nichts offen: „Diese Woche ist alles abgedeckt oder eingeplant.“ (bzw. ohne relevante Muskeln: „Sobald du trainierst, siehst du hier, was noch offen ist.“)
  - Sonst: „Noch offen: {Liste}. „{Plan}“ deckt {n} davon ab.“
  - Mit Bein-Aktivität angehängt: „ Deine Beine sind diese Woche schon beim {Aktivität} dran.“ (für Mannschaftssport: „beim Mannschaftssport“).

#### 3.5.8 Sätze pro Muskel (`#volTile`, nur Profi)

Eyebrow „Sätze pro Muskel · gewichtet“, rechts „Ziel 10–20“. Für alle 12 Muskeln eine Zeile: Name, Balken (Breite `min(100, v/24·100) %`, Zielband 10–20 hinterlegt), Wert auf 0,5 gerundet mit Komma. Zustandsklasse: `> 20` hi, `≥ 10` ok, `≥ 6` mid, sonst lo. Hinweis „Hilfsmuskeln zählen halb, wie in der großen Auswertung von Pelland 2024. Über 20 Sätze bringt meist kaum mehr.“

#### 3.5.9 Wochenrückblick – Formeln

Eyebrow „Wochenrückblick“. Drei Kennzahlen:

- **Einheiten**: `{Einträge dieser Woche}/{Wochenziel}` (gleich wie Ring).
- **Sätze**: Summe echter Sätze dieser Woche (`realSets`, 5.5).
- **Bestleistungen**: Anzahl PR-Einträge mit Datum in dieser Woche.

Bei Aktivitäten diese Woche zusätzlich: „{n} Aktivität(en) · {Summe Minuten} Minuten · {Summe km} km“ (Teile nur, wenn > 0; km mit einer Nachkommastelle).

Vergleichssatz:
- Vorwoche ohne Einträge: „Ab nächster Woche siehst du hier den Vergleich zur Vorwoche.“
- Heute Sonntag: „Letzte Woche: {L} Sätze, diese Woche {±p %}.“ (Prozentteil nur, wenn beide > 0)
- Sonst: „Letzte Woche bis {Wochentag}: {Lgleich} Sätze (jetzt {±p %}). Ganze Vorwoche: {L} Sätze.“ `Lgleich` = Sätze der Vorwoche von Montag bis zum gleichen Wochentag.
- Prozent: `round((jetzt − vorher)/vorher · 100)`, Vorzeichen „+“, „−“ (echtes Minuszeichen) oder „±“ bei 0.
- Angehängt, wenn `0 < Einheiten < Ziel`: „ Jede Einheit zählt, auch eine kurze.“

Darunter Knopf „Letzte Abschluss-Karte“ (wenn `lab.lastCard` existiert) bzw. „Abschluss-Karte ansehen (Beispiel)“.

#### 3.5.10 Deine Pläne

Kopf mit Knopf „Neuer Plan“. Je Plan eine Zeile: bis zu drei überlappende Muskel-Symbole (Top-3 nach gewichteten Sätzen), Name, Pill „Beispiel“ bei Beispielplänen, Untertitel „{n} Übung(en) · ca. {min} Min. · {Muskeln}“ (leer: „noch leer“), Pfeil. Antippen → Plan-Editor. Ohne Pläne: „Noch keine Pläne. Leg deinen ersten an.“

Beispielpläne (Standard, `ex:true`):
- „Oberkörper“ (`ok`): Bankdrücken 3×„8–10“, Langhantelrudern 3×„10“, Schulterdrücken 3×„10“, Bizepscurls 2×„12“, Trizepsdrücken am Kabel 2×„12“.
- „Unterkörper“ (`uk`): Kniebeugen 3×„8“, Rumänisches Kreuzheben 3×„10“, Ausfallschritte 2×„12“, Hip Thrust 3×„10“, Wadenheben 3×„15“.
- „Ganzkörper kurz“ (`gk`): Liegestütze 3×„max“, Klimmzüge 3×„5–8“, Goblet Squat 3×„12“, Unterarmstütz 3×„45 s“.

Standard-Wochenplan ohne Onboarding: Mo `ok`, Mi `uk`, Fr `gk`.

#### 3.5.11 Plan-Editor (`v-plan`)

- „← Zurück“ (verwirft ohne Rückfrage), Titel als großes Eingabefeld (neu: „Mein Plan“).
- **Im Plan**: je Übung eine Zeile mit Vorschaubild (öffnet So geht's), Name, „{Muskeln} · {Gerät}“, „×“ zum Entfernen, Stepper Sätze (1–10, „1 Satz“/„n Sätze“), Textfeld Wdh. (frei, z. B. „8–10“, „45 s“, „max“). Leer: „Noch keine Übungen. Wähl unten welche aus.“
- **Übung hinzufügen**: Einstieg „Alle Übungen durchsuchen – Nach Gerät und Muskel, Ausführung ansehen“ (Browser im Modus „plan“, vorgefiltert auf den gewählten Muskel), Muskelfilter-Chips („Alle“ + 12 Muskeln), Liste der kuratierten Übungen, die zu den eigenen Geräten passen, dem Filter entsprechen und noch nicht im Plan sind, je mit „+“. Hinzufügen: `{e, s:3, r:"10"}`, Toast „{Übung} hinzugefügt“. Keine Treffer: „Keine passende Übung mit deinen Geräten. Aktivier im Training-Bereich weitere Geräte.“
- **Plan speichern**: Name leer → „Mein Plan“. Gespeichert wird `{id, name, items}`; das Beispiel-Flag fällt dabei weg. Zurück zu Training, Toast „„{Name}“ gespeichert“.
- **Plan löschen** (nicht bei neuem Plan): erster Tipp „Wirklich löschen?“ (3 s), zweiter löscht den Plan und alle Wochenplan-Tage mit dieser ID. Toast „Plan gelöscht“.
- Neue Plan-ID: `"p" + Date.now()`.
- Zeilen lassen sich 350 ms halten → So geht's.

#### 3.5.12 Andere Aktivitäten im Wochenplan

`ACTS` (Schlüssel, Name, Belastung): run Laufen beine · bike Radfahren beine · swim Schwimmen – · ball Mannschaftssport beine · yoga Yoga / Mobility – · hike Wandern beine · other Andere Aktivität –. Gespeichert als `sched[i] = "act:run"` usw.

#### 3.5.13 Aktivität eintragen (Sheet)

Titel „{Aktivität} eintragen“ (mit vorgewähltem Typ) bzw. „Aktivität eintragen“ (dann zuerst Typ-Chips; vorausgewählt ist die heute geplante Aktivität oder Laufen).

Felder (alle optional): „Dauer (Min.)“ (ganze Zahl 1–1440), „Distanz (km)“ (nur für Laufen, Radfahren, Schwimmen, Wandern, Andere; 0 < km ≤ 1000, Komma erlaubt), „Wie anstrengend war es? 1 = sehr leicht, 10 = maximal“ (Knöpfe 1–10, erneutes Antippen wählt ab), bei definierten Messwerten „Deine Werte“ mit vorher/nachher. Fehlermeldungen: „Dauer bitte in Minuten, zum Beispiel 45.“ / „Distanz bitte in km, zum Beispiel 8 oder 5,5.“

Knöpfe: **Speichern** (mit Details) und **Ohne Details eintragen**. Ergebnis: Eintrag `{date:heute, plan:"act:<typ>", sets:{}, act:true, dur?, km?, rpe?, vals?}`. Toast „{Nomen} eingetragen“ + „ · {km} km“ oder „ · {n} Minuten“. Nach 1,5 s +15 Min. Zeitkonto („{Aktivität} geschafft“, einmal pro Tag gemeinsam mit Training). Mehrere Aktivitäten pro Tag sind möglich.

#### 3.5.14 Deine Geräte

Chips aller Geräte (3.6.1) mit Symbol, umschaltbar, sofort gespeichert. Hinweis „Übungen werden passend zu deinen Geräten vorgeschlagen.“

#### 3.5.15 Eigene Messwerte

Kachel „Eigene Messwerte“ mit „Hinzufügen“.

- Ohne Messwerte: „Zum Beispiel Blutzucker, Ruhepuls oder Körpergewicht. Die App fragt dann vor und nach dem Training kurz danach. Medizinische Entscheidungen bitte immer mit deinem Behandlungsteam.“
- Mit Messwerten: Chips „{Name} {Einheit} · {Bereich}“ (antippen = bearbeiten), Hinweis „Die App fragt beim Start nach dem Wert vorher und am Ende nach dem Wert nachher. Alles optional. Antippen zum Bearbeiten.“, Verlauf (neueste zuerst, 10 Zeilen, „Alle {n} anzeigen“ / „Weniger anzeigen“): Datum (kurz), Uhrzeit, Eintragsbezeichnung, „{Name} {vorher} → {nachher} {Einheit}“. Werte außerhalb des eigenen Bereichs werden markiert (`<mark>` + Screenreader-Text „(außerhalb deines Bereichs)“), dazu „Markiert sind Werte außerhalb des Bereichs, den du selbst festgelegt hast. Das ist keine medizinische Bewertung.“ Ohne Werte: „Noch keine Werte gespeichert.“

**Messwert-Sheet** („Eigener Messwert“ / „Messwert bearbeiten“): Name (Pflicht), Einheit, „Dein Bereich (optional)“ von/bis mit Erklärung „Werte außerhalb werden im Verlauf markiert. Den Bereich legst du selbst fest, zum Beispiel zusammen mit deinem Behandlungsteam.“ Fehler: „Bitte gib dem Messwert einen Namen.“ / „Der Bereich braucht Zahlen, zum Beispiel 70 und 180.“ / „„von“ sollte kleiner sein als „bis“.“ Umbenennen überträgt gespeicherte Werte auf den neuen Namen. „Messwert entfernen“ mit zweitem Tipp („Wirklich entfernen? Nochmal tippen“, 3,5 s); Toast „Entfernt. Gespeicherte Werte bleiben im Verlauf.“ Toasts „„{Name}“ angelegt.“ / „Messwert gespeichert.“

**Abfragen:**
- **Vorher**: nach dem Start eines neuen Live-Trainings (nach der Tagesform), wenn Messwerte definiert, noch keine Werte und noch kein Satz: Sheet „Kurz vorher messen?“, „Optional. Am Ende fragt die App nach dem Wert danach.“, nur Felder „vorher“, „Speichern“ (Toast „Notiert. Viel Spaß beim Training.“) / „Überspringen“. Werte mit Uhrzeit (`tv`) in `live.vals`.
- **Nachher**: nach Ende eines Live-Trainings oder einer Plan-Session (über die Warteschlange, also erst nach der Abschluss-Karte): Titel „Und jetzt, nachher?“ (wenn vorher-Werte existieren) bzw. „Deine Werte“. Mit bekanntem Vorher-Wert nur das Feld „nachher“ und die Zeile „vorher: {Wert} ({hh:mm} Uhr)“, sonst beide Felder. Speichern schreibt `entry.vals[name] = {vor, nach, tv, tn}`.
- **Aktivität**: im Aktivitäts-Sheet beide Felder.

#### 3.5.16 Schwangerschafts-Kachel

Kachel-Knopf: Eyebrow „Schwangerschaft & Rückbildung“, Titel = SSW-/Wochen-Label bzw. „Pläne für Schwangere und nach der Geburt“, Untertitel „{Phasentitel} · fertige Heimpläne mit Timer“ bzw. „Nach Leitlinien, mit Timer für zu Hause“. Mit eingetragenem Termin hervorgehoben (moss-Rand). Antippen → `v-mama`. Im Fokus Training immer am Ende der Ansicht.

#### 3.5.17 Einfach / Profi

Segment speichert `lab.view` (`einfach` Standard / `profi`), setzt die Klasse `simple` auf `<html>`, rendert neu. Toast „Profi-Ansicht: alle Details sichtbar“ bzw. „Einfache Ansicht: nur das Wichtigste“.

In **Einfach** ausgeblendet: RIR-Zeile, e1RM-Sparkline, Scheibenrechner, Kachel „Sätze pro Muskel“, Kabel-Rollenhöhe, Pausendauer-Auswahl, Gewichtsstufe, Wdh.-Bereich, RIR im Satz-Bearbeiten-Sheet und in Satz-Chips. RIR wird in Einfach als `null` gespeichert, und Bestleistungen ignorieren RIR.

---
### 3.6 Trainings-Grundlagen

#### 3.6.1 Geräte

`GEAR` (Reihenfolge in Chips, Onboarding und Training): Körpergewicht, Kurzhanteln, Langhantel, Kabelzug, Maschinen, Klimmzugstange, Bänder, SZ-Stange, Kettlebell, Sonstiges. Eigene Übungen haben das Gerät „Eigenes“ (wird in Browser-Gruppen als „Sonstiges“ geführt). Jedes Gerät hat ein eigenes Linien-Symbol (24×24, Strich 1,7).

#### 3.6.2 Muskelgruppen

`MUS` (Schlüssel → Anzeigename, Kurzlabel für den Wochenstreifen):

| Schlüssel | Name | Kurz | Figur |
|---|---|---|---|
| chest | Brust | Brust | vorne |
| shoulders | Schultern | Schu | vorne + hinten |
| biceps | Bizeps | Bi | vorne |
| triceps | Trizeps | Tri | hinten |
| forearms | Unterarme | UA | vorne + hinten |
| abs | Bauch | Bauch | vorne |
| back | Oberer Rücken | Rück | vorne (Trapez-Ansatz) + hinten |
| lowerback | Unterer Rücken | Rück | hinten |
| glutes | Po | Po | hinten |
| quads | Beine vorn | Bein | vorne |
| hams | Beine hinten | Bein | hinten |
| calves | Waden | Wade | vorne + hinten |

„Hinten“-Muskeln für den automatischen Figurenwechsel: back, triceps, lowerback, glutes, hams. Bein-Muskeln (Beinhinweis): quads, hams, glutes, calves.

#### 3.6.3 Bezeichnung und Beschreibung eines Eintrags

`entryLabel(l)` liefert `{short, long}`:

1. Aktivität (`plan` beginnt mit `act:`): short = Aktivitätskürzel, long = Aktivitätsname.
2. Heimplan (`plan` beginnt mit `mama:`): short = „✓“, long = Planname (bzw. „Heimtraining“).
3. Plan-ID eines vorhandenen Plans: short = `abbr(Planname)`, long = Planname.
4. Sonst (Live ohne Plan): short = Kurzlabel des stärksten Muskels (bzw. „✓“); long = gespeicherter Name (`l.name`, siehe `liveTitle` 5.11), sonst die zwei stärksten Muskeln „Brust & Trizeps“, sonst „Live-Training“ bzw. „Training“.

`entryDesc(l)`: Aktivität → Details „{km} km · {n} Minuten · Gefühl {rpe}/10“ oder „Eingetragen“; Heimplan → „Mit Timer geschafft“; sonst „{n} Satz/Sätze“ plus „ · automatisch beendet“ bei Auto-Ende. Messwerte werden angehängt: „ · Blutzucker 165 → 92“.

`todayLine(l)`: Aktivität → „{Nomen} eingetragen · {Details}“; sonst „{long} · {Beschreibung}“.

Nomen für Aktivitäten: Lauf, Radfahrt, Schwimmen, Mannschaftssport, Yoga, Wanderung, Aktivität.

#### 3.6.4 Tag-Details (Sheet)

Titel „{Wochentag}, {Tag}. {Monat}“ (z. B. „Dienstag, 20. Oktober“). Je Eintrag des Tages (ohne Beispiele) Bezeichnung + Beschreibung. Darunter „Übungen und Sätze“: alle Übungen, für die der Verlauf an diesem Datum Sätze enthält, mit Satz-Chips („42,5 kg × 10“ bzw. „12 Wdh.“); Antippen → Übungsverlauf. Ohne Einträge: „An diesem Tag ist nichts eingetragen.“ Knöpfe „Plan für {Wochentag} ändern“ (→ Pick-Sheet über Warteschlange) und „Schließen“.

#### 3.6.5 Übungsverlauf (Sheet)

Titel = Übungsname, Eyebrow „Verlauf“.
- Ohne Verlauf: „Noch kein Verlauf. Sobald du Sätze speicherst, erscheinen sie hier.“
- Kennzahlen: Anzahl Trainingstage, Anzahl Sätze, Bestwert (bei reiner Körpergewichtsübung „beste Wdh.“, sonst „kg beim Bestwert“, Bestwert = Satz mit höchstem e1RM).
- Diagramm (SVG 320×132) über die letzten 40 Tage: je Tag der beste e1RM-Wert (mit RIR, 5.3) bzw. bei Körpergewicht die meisten Wdh.; Linie, Punkte (letzter größer), Min/Max-Hilfslinien mit Werten, Datum erster/letzter Punkt. Bei weniger als 2 Tagen: „Ab dem zweiten Training siehst du hier eine Kurve.“
- Hinweis: „Geschätztes Maximum (e1RM) pro Training aus deinem besten Satz. Bestwert: {w} × {r}.“ bzw. „Wiederholungen im besten Satz pro Training.“
- Liste nach Datum absteigend, 8 sichtbar, „Ältere anzeigen ({n})“, Satz-Chips (Profi zusätzlich „· RIR x“), „Schließen“.

---

### 3.7 Übungsbibliothek

#### 3.7.1 Kuratierte Übungen (`LIB`, 72 Einträge)

Format `{id, n:Name, m:[Muskeln, erster = Hauptmuskel], g:Gerät, pop?:1, att?:Aufsatz}`. Vollständige Liste:

| ID | Name | Muskeln | Gerät | beliebt |
|---|---|---|---|---|
| bench | Bankdrücken | chest, triceps, shoulders | Langhantel | ✓ |
| dbbench | Kurzhantel-Bankdrücken | chest, triceps | Kurzhanteln | |
| pushup | Liegestütze | chest, triceps, shoulders | Körpergewicht | |
| fly | Butterfly | chest | Maschinen | ✓ |
| cross | Cable Crossover | chest | Kabelzug | |
| pullup | Klimmzüge | back, biceps | Klimmzugstange | |
| latpull | Latzug | back, biceps | Kabelzug | ✓ |
| row1 | Langhantelrudern | back, biceps | Langhantel | |
| dbrow | Einarmiges Rudern | back, biceps | Kurzhanteln | |
| seatrow | Rudern am Gerät | back | Maschinen | ✓ |
| bandrow | Rudern mit Band | back | Bänder | |
| ohp | Schulterdrücken | shoulders, triceps | Kurzhanteln | |
| lat | Seitheben | shoulders | Kurzhanteln | ✓ |
| face | Face Pulls | shoulders, back | Kabelzug | |
| pike | Pike-Liegestütze | shoulders, triceps | Körpergewicht | |
| curl | Bizepscurls | biceps | Kurzhanteln | ✓ |
| hammer | Hammercurls | biceps | Kurzhanteln | |
| bandcurl | Curls mit Band | biceps | Bänder | |
| pushdown | Trizepsdrücken am Kabel | triceps | Kabelzug | ✓ |
| dips | Dips | triceps, chest | Körpergewicht | |
| french | French Press | triceps | Kurzhanteln | |
| plank | Unterarmstütz | abs | Körpergewicht | |
| crunch | Crunches | abs | Körpergewicht | |
| hang | Hängendes Beinheben | abs | Klimmzugstange | |
| squat | Kniebeugen | quads, glutes | Langhantel | ✓ |
| goblet | Goblet Squat | quads, glutes | Kurzhanteln | |
| lunge | Ausfallschritte | quads, glutes | Körpergewicht | |
| press | Beinpresse | quads, glutes | Maschinen | ✓ |
| rdl | Rumänisches Kreuzheben | hams, glutes, lowerback | Langhantel | |
| dead | Kreuzheben | lowerback, hams, glutes, back | Langhantel | |
| legcurl | Beinbeuger | hams | Maschinen | ✓ |
| hyper | Hyperextensions | lowerback, glutes | Körpergewicht | |
| thrust | Hip Thrust | glutes, hams | Langhantel | |
| bridge | Glute Bridge | glutes | Körpergewicht | |
| calf | Wadenheben | calves | Körpergewicht | |
| chestpress | Brustpresse | chest, triceps | Maschinen | ✓ |
| shoulderpress | Schulterpresse | shoulders, triceps | Maschinen | ✓ |
| legext | Beinstrecker | quads | Maschinen | ✓ |
| abductor | Abduktoren | glutes | Maschinen | |
| abmachine | Bauchmaschine | abs | Maschinen | |
| calfmachine | Wadenmaschine | calves | Maschinen | |
| smithsquat | Kniebeugen an der Multipresse | quads, glutes | Maschinen | |
| reversefly | Reverse Butterfly | shoulders, back | Maschinen | |
| backext | Rückenstrecker-Maschine | lowerback | Maschinen | |
| cablecurl | Curls am Kabel | biceps | Kabelzug | |
| k_crosshigh | Kabel-Crossover von oben | chest, shoulders | Kabelzug · Einzelgriff | ✓ |
| k_crosslow | Kabel-Crossover von unten | chest, shoulders | Kabelzug · Einzelgriff | |
| k_flyflat | Kabel-Fliegende auf der Bank | chest | Kabelzug · Einzelgriff | |
| k_cpress | Brustpresse am Kabel | chest, triceps | Kabelzug · Einzelgriff | |
| k_row | Kabelrudern sitzend | back, biceps | Kabelzug · V-Griff | ✓ |
| k_row1 | Einarmiges Kabelrudern | back, biceps | Kabelzug · Einzelgriff | |
| k_straight | Überzüge am Kabel | back | Kabelzug · Seil | ✓ |
| k_latclose | Latzug eng | back, biceps | Kabelzug · V-Griff | |
| k_ropepush | Trizepsdrücken mit Seil | triceps | Kabelzug · Seil | ✓ |
| k_overhead | Trizepsstrecken über Kopf | triceps | Kabelzug · Seil | ✓ |
| k_lat | Seitheben am Kabel | shoulders | Kabelzug · Einzelgriff | ✓ |
| k_front | Frontheben am Kabel | shoulders | Kabelzug · Stange | |
| k_rear | Reverse Fly am Kabel | shoulders, back | Kabelzug · Einzelgriff | |
| k_upright | Aufrechtes Rudern am Kabel | shoulders, back | Kabelzug · Stange | |
| k_shrug | Shrugs am Kabel | back | Kabelzug · Stange | |
| k_hammer | Hammercurls am Seil | biceps, forearms | Kabelzug · Seil | ✓ |
| k_bayes | Bizepscurls hinter dem Körper | biceps | Kabelzug · Einzelgriff | |
| k_crunch | Kabel-Crunch kniend | abs | Kabelzug · Seil | ✓ |
| k_wood | Holzhacker am Kabel | abs | Kabelzug · Einzelgriff | |
| k_pallof | Pallof Press | abs | Kabelzug · Einzelgriff | |
| k_through | Pull Through am Kabel | glutes, hams | Kabelzug · Seil | |
| k_kick | Kickbacks am Kabel | glutes | Kabelzug · Fußschlaufe | ✓ |
| k_abd | Abduktion am Kabel | glutes | Kabelzug · Fußschlaufe | |
| k_add | Adduktion am Kabel | quads | Kabelzug · Fußschlaufe | |
| k_wrist | Unterarmcurls am Kabel | forearms | Kabelzug · Stange | |
| k_dbwrist | Unterarmcurls | forearms | Kurzhanteln | |
| k_farmer | Farmer's Walk | forearms, back | Kurzhanteln | ✓ |

Standard-Favoriten: latpull, chestpress, press.

#### 3.7.2 Offene Datenbank (`EXDB`, 678 Einträge, free-exercise-db, gemeinfrei)

- Kompaktformat pro Eintrag: `[Name, Gerätecode, Muskelcodes, Aufsatz]`.
- Gerätecodes: L Langhantel · Z SZ-Stange · K Kurzhanteln · C Kabelzug · M Maschinen · B Körpergewicht · A Bänder · T Kettlebell · S Sonstiges · P Klimmzugstange. Verteilung: L 170, K 121, S 84, C 81, B 69, M 58, T 56, A 20, P 10, Z 9.
- Muskelcodes (ein Zeichen je Muskel, erstes = Hauptmuskel): c chest · s shoulders · b biceps · t triceps · f forearms · a abs · r back · l lowerback · g glutes · q quads · h hams · w calves.
- Aufsatz (nur bei 35 Kabelübungen): Stange 16, Einzelgriff 9, Seil 8, V-Griff 2.
- ID einer DB-Übung: `"db" + Index`.
- **Deutsche Namen und Hinweise** (`EXDE`, Index → `{de, c:[3 Hinweise]}`, für alle 678 vorhanden). Beim Start wird der englische Name als Suchbegriff an Position 4 gemerkt und durch den deutschen ersetzt. Bereits importierte DB-Übungen mit englischem Namen werden umbenannt.
- **Import**: Wird eine DB-Übung im Live-Training gewählt, zum Plan hinzugefügt oder favorisiert, wird sie als `{id:"dbN", n, g, m, att, db:true}` in `LIB` und `lab.custom` übernommen. Danach verhält sie sich wie eine kuratierte Übung.

#### 3.7.3 Eigene Übungen

Im Auswahl-Panel des Live-Trainings: Feld „Eigenes Gerät hinzufügen“ + „+“. Ergebnis `{id:"c"+Zeitstempel, n, m:[aktueller Muskel], g:"Eigenes"}`, gespeichert in `lab.custom`, automatisch Favorit, sofort ausgewählt, Toast „„{Name}“ angelegt“. Eigene Übungen haben keine Demo und keine Hinweise.

#### 3.7.4 Demos (Fotos Start/Ende) und Chunk-Laden

- `DEMOMAP.cur`: kuratierte ID → DB-Index (z. B. bench → 33, latpull → 665, k_crosshigh → 92). DB-Übungen nutzen direkt ihren Index.
- Dateien `demos/c{k}.json` mit `k = floor(Index / 50)` (c0 … c13). Inhalt: `{ "<Index>": { a:"<webp base64 Start>", b:"<webp base64 Ende>", s:["englische Anleitung", …] } }`.
- Laden bei Bedarf, pro Chunk genau ein Request (laufende Requests werden geteilt), fehlgeschlagene Chunks werden beim nächsten Mal neu versucht. Ergebnis als `data:image/webp;base64,…`.
- Schnittstelle: `exDemo(id) → Promise<{a,b}|null>`, `exInstr(id) → string[]|null` (nur wenn Chunk schon geladen), `exCues(id) → string[]|null` (aus `EXDE`), `exNameDe(index)`.
- Vorschaubilder (`thumbHTML`) zeigen zuerst das Gerätesymbol. Die Demo wird erst geladen, wenn das Bild in Sichtweite kommt (IntersectionObserver, 160 px Vorlauf). Ohne Demo und ohne Hinweise ist das Vorschaubild inaktiv (nicht antippbar, `aria-hidden`).
- Im Artifact (ohne `demos/`-Ordner) schlagen die Requests fehl. Dann bleiben Symbole sichtbar, die deutschen Hinweise funktionieren trotzdem.
- Service Worker cacht `demos/` dauerhaft im Cache `ng-demos`.

---

### 3.8 Übungsbrowser und „So geht's“

#### 3.8.1 Einstiege

| ID | Ort | Titel / Untertitel | Kontext | Vorfilter |
|---|---|---|---|---|
| `#xbLive` | Live, unter den Muskel-Chips | „Alle Übungen“ bzw. „Alle Übungen · {Muskel}“ / „Kabelzug, Kettlebell, Maschinen … mit Ausführung“ | live | gewählter Muskel |
| `#xbPick` | Live-Auswahl-Panel, über „Eigenes Gerät hinzufügen“ | „Alle Übungen für {Muskel}“ / „Nach Gerät filtern, über 700 Übungen“ | live | Muskel |
| `#xbPlan` | Plan-Editor, über dem Muskelfilter | „Alle Übungen durchsuchen“ / „Nach Gerät und Muskel, Ausführung ansehen“ | plan | Muskelfilter |
| `#xbTrain` | Training, unter dem Live-Knopf | „Übungen nachschlagen“ / „So geht's: alle Übungen nach Gerät und Muskel“ | view | – |

Jeder Einstieg zeigt rechts die Gesamtzahl (kuratiert + DB − schon importierte, aktuell rund 750).

#### 3.8.2 Aufbau des Browsers

Fast vollhohes Sheet „Übungen“ mit Schließen-×. Oben Hinweis je Kontext: plan „Tippen fügt hinzu · halten zeigt die Ausführung“, live „Tippen wählt aus · halten zeigt die Ausführung“, view „Tippen zeigt, wie es geht“. Rechts Trefferzahl („1 Übung“ / „1.234 Übungen“, im Plan-Kontext „· {n} hinzugefügt“).

Liste in der Mitte, **Dock unten** (Daumenzone):
1. Zeile 1: „Alle“ (nur wenn ein Filter aktiv ist, setzt alles zurück), Schnellfilter „Favoriten“ (Stern), „Zuletzt benutzt“ (Uhr), Trenner, Geräte-Chips (Kabelzug, Kurzhanteln, Langhantel, SZ-Stange, Kettlebell, Maschinen, Körpergewicht, Klimmzugstange, Bänder, Sonstiges).
2. Zeile 2: Muskel-Chips.
3. Suchfeld „Suchen: Seil, Rudern, rope …“ mit Leeren-Knopf, daneben „Fertig“.

Chips schalten um (gleicher Wert erneut = aus). Suche mit 90 ms Entprellung, Enter schließt die Tastatur.

#### 3.8.3 Filter- und Suchlogik

- **Normalisierung**: Kleinbuchstaben, ß → ss, Akzente entfernen.
- **Suche**: Leerzeichen trennt Wörter, **alle** Wörter müssen im Suchtext vorkommen. Ein Wort trifft auch, wenn seine Übersetzung trifft. Synonyme Deutsch → Englisch (und umgekehrt): seil–rope, kabel/kabelzug–cable, kurzhantel(n)–dumbbell, langhantel–barbell, sz–ez, kniebeuge(n)–squat, rudern–row, drucken–press, bankdrucken–bench, curls–curl, seitheben–lateral, ausfallschritt(e)–lunge, kreuzheben–deadlift, klimmzug/klimmzuge–pull, liegestutz–push-up, waden–calf, trizeps–triceps, bizeps–biceps, schulter–shoulder, brust–chest, fliegende–fly, band/bander–band, bauch–ab, rucken–back, beinpresse–leg press, strecken–extension, heben–raise, griff–grip, stange–bar, eng–close, breit–wide, schrag–incline.
- **Suchtext** kuratiert: Name, Gerät, Aufsatz, Muskelnamen. DB: deutscher Name, englischer Name, Aufsatz, Gerät, Muskelnamen.
- **Gerätefilter**: Gerät gleich (Eigenes zählt als Sonstiges). **Muskelfilter**: kuratiert = Muskel irgendwo in der Liste; DB = Muskelcode irgendwo enthalten.
- **Sortierung kuratiert**: Punktzahl Favorit 4 + beliebt 2 + eigenes Gerät 1, bei Gleichstand Originalreihenfolge. „Zuletzt benutzt“: Übungen des laufenden Trainings (neueste zuerst), dann nach letztem Verlaufsdatum.
- **DB-Treffer** (nicht bei Schnellfiltern): ohne bereits importierte, eigene Geräte zuerst, dann nach Index.
- **Gruppierung**:
  - Mit Suche: „Deine Übungen“ (kuratiert) und „Weitere Übungen“ (DB). Mit Schnellfilter: nur „Favoriten“ bzw. „Zuletzt benutzt“.
  - Ohne Suche und ohne Gerätefilter: nach Gerät in der Reihenfolge der Geräte-Chips.
  - Mit Gerätefilter: nach Hauptmuskel.
  - Gruppenüberschrift mit Symbol und Anzahl, leere Gruppen entfallen.
- **Paging**: 40 Zeilen, dann automatisch +40, sobald „Mehr anzeigen · noch {n}“ in Sicht kommt (240 px Vorlauf), oder per Tipp.
- **Leer**: „Noch keine Favoriten. Tipp bei einer Übung auf den Stern.“ / „Noch nichts trainiert. Dein Verlauf erscheint hier.“ / „Nichts gefunden. Versuch es auf Englisch oder lockere die Filter.“ + „Filter zurücksetzen“.

#### 3.8.4 Zeile und Aktionen

Zeile: Vorschaubild, Name (max. 2 Zeilen), „{Gerät} · {Aufsatz} · {Muskeln}“, Stern (Favorit umschalten, importiert DB-Übungen), im Plan-Kontext Markierung „Im Plan“ (Häkchen).

| Kontext | Tippen auf Zeile |
|---|---|
| live | Browser schließen, Übung importieren, als aktuelle Übung wählen (Muskel wird auf den Hauptmuskel gesetzt, falls der gewählte Muskel nicht passt) |
| plan | hinzufügen (3 Sätze, „10“), Zeile kurz aufblinken, Zähler „· n hinzugefügt“; schon im Plan → nur Blinken + Vibration |
| view | So-geht's-Sheet |

Tipp aufs Vorschaubild öffnet immer So geht's. Schließen per „Fertig“/„×“; im Live-Kontext danach Live neu rendern.

#### 3.8.5 „So geht's“-Sheet

- Eyebrow „So geht's“ (Play-Symbol), Titel Übungsname.
- Große Demo (Start- und Endfoto im Wechsel animiert; bei reduzierter Bewegung statisch mit Segment „Start | Ende“). Ohne Demo: Gerätesymbol + „Für diese Übung gibt es noch keine Vorschau.“
- Chips: Gerät (+ Aufsatz), Muskeln.
- Nummerierte deutsche Hinweise (3 Stück). Ohne Hinweise und ohne Demo-Funktion: „Tipp: Langsam und kontrolliert, volle Bewegung, ohne Schwung.“
- Eingeklappt „Originalanleitung (Englisch)“ (`lang="en"`), wenn der Chunk geladen ist.
- Aktion je Kontext: live und Übung nicht gewählt → „Diese Übung nehmen“ (schließt Browser, wählt aus); plan und nicht im Plan → „Zum Plan hinzufügen“ (Toast „{Name} hinzugefügt“, wenn der Browser nicht offen ist).
- Gibt es Verlauf: „Verlauf ansehen“ (schließt und öffnet den Übungsverlauf über die Warteschlange).
- „Schließen“.

#### 3.8.6 Gesten

- **Halten 350 ms** auf Karten im Auswahl-Panel, Zeilen in Plan-Editor, „Heute geschafft“-Liste und Browser → So geht's (Vibration 12 ms, kurzes „gedrückt“-Feedback). Abbruch bei > 10 px Bewegung oder Scroll. Der Klick danach (900 ms) wird geschluckt. Kontextmenü auf diesen Elementen unterdrückt. Nicht auf Stern, „+“, „×“, Stepper, Eingabefeldern, aktiven Vorschaubildern.
- **Desktop-Hover** (nur Maus mit Hover): nach 400 ms auf einer Übungskarte erscheint eine Mini-Demo („Ausführung“), auf Zeilen spielt das Vorschaubild ab.

---

### 3.9 Live-Training (`v-live`)

#### 3.9.1 Starten und Tagesform

1. Vergessenes Training prüfen (3.9.18).
2. Läuft schon ein Live-Training: direkt zur Live-Ansicht (Muskel- und Übungswahl zurückgesetzt).
3. Sonst Sheet **„Wie fühlst du dich heute?“**: „Eine Frage, dann geht's los. Die Vorschläge passen sich an.“ Drei Karten:
   - „Eher müde“ – „Schlecht geschlafen oder viel Stress. Heute etwas leichter.“ (`low`)
   - „Normal“ – „Wie immer.“ (`ok`)
   - „Richtig fit“ – „Ausgeruht und motiviert. Heute darf es mehr sein.“ (`high`)
   Wahl → `live = {start: jetzt, sets: [], form}` speichern, Live-Ansicht. Schließen ohne Wahl startet nichts.
4. Danach (Warteschlange) ggf. „Kurz vorher messen?“ (3.5.15).

#### 3.9.2 Aufbau der Ansicht (von oben)

1. Kopf: „← Training“ (verlässt die Ansicht, Training läuft weiter), Zeit-Schalter (Stoppuhr, „Zeit aus“/„Zeit an“), Uhr (nur bei Zeit an, `mm:ss` bzw. `h:mm:ss` seit Start, roter Pulspunkt), Puls-Knopf „♥ Puls“.
2. Eyebrow „Live-Training · ohne Zeit“ bzw. „· mit Zeit“, `h1` = Übungsname / Muskelname / „Wo bist du gerade?“.
3. **Plan-Warteschlange** (nur mit Plan, 3.9.15).
4. **Körper-Kachel**: „Muskel antippen“, Segment „Vorne | Hinten“, Figur, Muskel-Chips der Seite, Einstieg „Alle Übungen“.
5. **Auswahl-Panel** (nach Muskelwahl).
6. **Logger** (nach Übungswahl), direkt darunter Pausendauer-Zeile.
7. **Heute geschafft**: Liste der Sätze, Zähler rechts, Sperr-Hinweis.
8. Großer Knopf **„Training beenden“**.

#### 3.9.3 Körperfigur und Muskelwahl

Große Figur (max. 230 px breit). Gewählter Muskel in Ocker mit dunklem Rand; Muskeln, die in diesem Training schon Sätze haben, in mittlerem Grün. Seitenwechsel mit kurzer Dreh-Animation. Muskel antippen (Figur oder Chip) → Muskel wählen, Übung zurücksetzen, Vibration 8 ms, Auswahl-Panel nach oben scrollen.

#### 3.9.4 Auswahl-Panel

- Bei Bein-Muskel ggf. **Beinhinweis live** (3.9.5) ganz oben.
- „Deine Favoriten · {Muskel}“: horizontale Kartenreihe (Snap). Ohne Favoriten: „Noch keine Favoriten für {Muskel}. Tipp beim Gerät auf den Stern.“
- „Gängige Geräte und Übungen“: kuratierte Übungen mit diesem Muskel, nicht favorisiert, mit eigenem Gerät oder „Eigenes“, beliebte zuerst. Leer: „Nichts mit deinen Geräten. Leg unten ein eigenes an.“
- Karte: Vorschaubild, Name, „{Gerät} · zuletzt {w} × {r}“ (letzter Satz vor heute), Stern (Toast „Zu Favoriten hinzugefügt“ / „Aus Favoriten entfernt“). Aktive Übung hervorgehoben. Tippen/Enter/Leertaste wählt die Übung.
- Hinweis (wenn Demos möglich): „Karte gedrückt halten oder Bild antippen: so geht die Übung.“
- Einstieg „Alle Übungen für {Muskel}“.
- Formular „Eigenes Gerät hinzufügen“.

#### 3.9.5 Beinhinweis im Live-Training

Wenn ein Bein-Muskel gewählt ist und der Hinweis in diesem Training noch nicht bestätigt wurde: Gab es gestern eine Bein-Aktivität (eingetragen oder geplant) oder ist morgen eine geplant, erscheint „Gestern {Aktivität}“ / „Morgen {Aktivität}“ – „Deine Beine brauchen vielleicht noch Erholung.“ bzw. „Deine Beine brauchen morgen Kraft.“ + „ Heute lieber etwas leichter, oder Oberkörper.“ Knopf „Okay“ setzt `live.legOk`.

#### 3.9.6 Logger – Aufbau

Von oben:
1. Kopf: großes Vorschaubild (öffnet So geht's), Eyebrow „Satz {n+1} · {Gerät}“ (mit Plan: „Satz {k} von {s} · Soll {r}“ bzw. „Satz {k} · Soll geschafft“), `h2` Name, Stern.
2. Muskel-Chips, Link „So geht's“ (wenn Demo oder Hinweise), Link „Verlauf“ (wenn Sätze aus früheren Trainings existieren).
3. „Letztes Mal: {w} × {r}“ (letzter Satz vor heute).
4. Tagesform-Hinweis (nur bei müde/fit): „Tagesform: eher müde. Vorschlag ist heute etwas leichter.“ / „Tagesform: richtig fit. Probier ruhig etwas mehr.“
5. „Bestleistung: {w} × {r}“ (Satz mit höchstem e1RM im Verlauf).
6. Bei Kabelzug: Aufsatz-Chips und Rollenhöhe (3.9.11).
7. **Vorschlag** (3.9.10) mit „Übernehmen“.
8. **Gewicht-Stepper** „−  {42,5 kg}  +“, Beschriftung „Gewicht“ bzw. bei Körpergewicht „Zusatzgewicht · du wiegst {x} kg“.
9. Scheibenrechner (Langhantel, 3.9.11).
10. Gewichtsstufe „Stufe für + und −“ (Profi).
11. **Wdh.-Stepper** „−  {10}  +“, „Wiederholungen“.
12. Wdh.-Bereich (Profi).
13. RIR-Zeile (Profi).
14. Großer Knopf **„Satz speichern“**.
15. Mit Plan und erfülltem Soll: Knopf „Nächste Übung: {Name} ›“ bzw. „Alles geschafft · Training beenden“ (scrollt zum Beenden-Knopf); „Satz speichern“ wird dann zum Zweitknopf.
16. e1RM-Sparkline (Profi).
17. Satz-Chips dieser Übung heute („1 · 42,5 kg × 10“, Profi „· RIR 2“), antippbar, Hinweis „Satz antippen, um ihn zu ändern oder zu löschen.“

Nach der Übungswahl scrollt die Ansicht so, dass „Satz speichern“ im Daumenbereich liegt.

#### 3.9.7 Vorbelegung von Gewicht und Wdh. (bei Übungswahl)

1. Mit Verlauf: Gewicht und Wdh. des **letzten** Satzes im Verlauf (auch von heute).
2. Ohne Verlauf: Gewicht 0 bei Körpergewicht, sonst 20 kg (**Soll:** Gerätetyp-sinnvoll, z. B. Kabel/Maschine 10 kg, Kurzhantel 5 kg, Langhantel 20 kg; siehe 7). Wdh. = unteres Ende des Wdh.-Bereichs.
3. Tagesform „müde“ und Gewicht > 0: `floor(w·0,9 / 2,5)·2,5`. Tagesform „fit“ und Verlauf vorhanden: `w + 2,5`.
4. Mit Plan-Warteschlange und Übung im Plan: Wdh. = erste Zahl aus dem Soll (z. B. „8–10“ → 8). Soll mit „s“, „sek“ oder „min“ wird ignoriert.

#### 3.9.8 Stepper, Zifferneingabe, Gewichtsstufe

- Stepper: Druck = sofort ein Schritt + 4 ms Vibration; nach 400 ms Halten alle 80 ms ein weiterer Schritt; Loslassen/Verlassen stoppt. Tastatur: Enter/Leertaste = ein Schritt.
- Gewicht: Schritt = Gewichtsstufe der Übung (`lab.step[id]`, Optionen 1 / 1,25 / 2,5 / 5 kg, Standard 2,5), Minimum 0, auf 0,01 gerundet. `aria-label` „Gewicht um 2,5 kg erhöhen“.
- Wdh.: ±1, Bereich 1–100.
- Zahl antippen → Sheet „Gewicht“ (Ziffernfeld, „kg“, Hinweis „Komma geht auch, zum Beispiel 42,5.“, gültig 0–500) bzw. „Wiederholungen“ („Ganze Zahl von 1 bis 100.“). Enter oder „Übernehmen“. Fehler: Feld rot, „Bitte eine Zahl von 0 bis 500 eingeben.“ / „Bitte eine ganze Zahl von 1 bis 100 eingeben.“, 30 ms Vibration.
- Gewichtsstufe ändern: Toast „Stufe {x} kg für {Übung}“.

#### 3.9.9 Wdh.-Bereich und RIR

- **Wdh.-Bereich** pro Übung (`lab.repRange[id]`), Optionen 3–6, 6–10, 8–12, 10–15, 12–20. Standard aus dem Profilziel: Muskelaufbau 8–12, Kraft 3–6, Fit bleiben 10–15, Abnehmen 12–20, Ausdauer 12–20, ohne Ziel 8–12.
- **RIR** („Wie viele hättest du noch geschafft?“): Knöpfe 0, 1, 2, „3+“ (Wert 3). Auswahl bleibt über Sätze und Sitzungen erhalten (`lab.rirLast`, Standard 2). Gespeichert wird RIR nur in Profi; in Einfach `null`.

#### 3.9.10 Vorschlag – doppelte Progression

Grundlage ist die **letzte frühere Sitzung** dieser Übung: alle Verlaufseinträge des letzten Datums vor heute. Ohne frühere Sitzung kein Vorschlag. Formeln in 5.6. Anzeige: Funke-Symbol, „Vorschlag“, Text, Knopf „Übernehmen“ (nur wenn Gewicht oder Wdh. vorgeschlagen werden) setzt die Stepper.

#### 3.9.11 Scheibenrechner, Kabel-Aufsatz und Rollenhöhe

- **Scheiben** (Profi, nur Langhantel, Gewicht > 20 kg): pro Seite `(Gesamt − 20)/2`, gierig mit Scheiben 25, 20, 15, 10, 5, 2,5, 1,25. Anzeige „Pro Seite: 20 + 2,5 kg (20-kg-Stange)“. Bleibt kein Rest-freies Ergebnis, wird trotzdem die gierige Zerlegung gezeigt; ohne Scheibe keine Anzeige.
- **Kabel** (Gerät Kabelzug): „Aufsatz“ mit Chips Stange, Seil, V-Griff, Einzelgriff, Lat-Stange, Fußschlaufe; „Rollenhöhe“ (Profi) hoch / mittel / tief. Standard: Aufsatz der Übung bzw. „Stange“, Höhe „mittel“. Pro Übung gemerkt (`lab.attach[id]={a,h}`) und an jedem gespeicherten Satz als `a`, `h` abgelegt.

#### 3.9.12 Satz speichern und Bestleistung

Beim Tipp auf „Satz speichern“ in dieser Reihenfolge:
1. Bestleistung prüfen, **bevor** der Satz in den Verlauf kommt (5.4).
2. Satz anhängen: `live.sets.push({e, w, r, t:jetzt, rir, a?, h?})`; Verlauf `hist[e].push({date:heute, w, r, rir, lv:live.start})`, Verlauf je Übung auf 500 Einträge begrenzt.
3. Vibration [15,40,15], Live neu rendern, Pause starten (nur bei Zeit an).
4. Bei Bestleistung: `lab.prs.push({date, e, w, r, lv})`, Banner „Neue Bestleistung“ / „{Übung} · {w} × {r}“ (2,6 s), Vibration [20,60,20,60,60].
5. Toast mit Aktion: „Satz {k} gespeichert · {w} × {r}“ + „Rückgängig“ (5 s).
6. Ggf. Keimi-Zuruf (3.4.7), Warteschlange aktualisieren, „Satz speichern“ wieder in den Daumenbereich scrollen.

#### 3.9.13 Sätze bearbeiten, löschen, Rückgängig

- Satz-Chip antippen (im Logger oder in „Heute geschafft“) → Sheet „Satz {k} · {Übung}“: Gewicht (kg, Komma), Wiederholungen, RIR (nur Profi), Fehlerzeile, „Speichern“ / „Satz löschen“.
- Validierung: „Gewicht bitte zwischen 0 und 500 kg.“ / „Wiederholungen bitte als ganze Zahl von 1 bis 100.“
- Speichern: Werte ändern, Verlauf und Bestleistungen dieser Übung für dieses Training **neu berechnen** (5.4), Toast „Satz geändert.“ War es der letzte Satz der aktuellen Übung, übernehmen die Stepper die neuen Werte.
- Löschen: Satz entfernen, neu berechnen, Toast „Satz gelöscht.“ + „Rückgängig“ (stellt an alter Position wieder her, Toast „Satz ist wieder da.“). Rückgängig aus dem Speichern-Toast entfernt den Satz mit Toast „Satz entfernt.“
- Ist das Training schon beendet: „Das Training ist schon beendet.“

#### 3.9.14 Pausentimer und Zeitschalter

- **Zeitschalter** (`lab.timeOn`, Standard aus): Ein → Uhr sichtbar, Toast „Zeit läuft mit. Pause startet nach jedem Satz.“, Vibration [8,30,8]. Aus → Pause sofort beenden, Uhr aus, Toast „Ohne Zeit. Nur du und deine Sätze.“
- **Pausendauer** (`lab.rest`, 60 s / 90 s / 2 min / 3 min, Standard 90 s): Zeile „Pause nach jedem Satz“ unter dem Logger, nur sichtbar bei gewählter Übung **und** Zeit an. **Soll:** auch in Einfach sichtbar, wenn Zeit an ist (Ist: in Einfach ausgeblendet).
- **Pausen-Pille** (nur bei Zeit an): fixiert über der Tab-Leiste, „PAUSE“, `m:ss`, Ocker-Fortschrittsbalken, Wolken-Knopf „Gedanken ablegen“, „Weiter“ (beendet sofort), bei verbundenem Pulsgurt „♥ {bpm}“. Bei 0: Vibration [30,60,30], Anzeige „Los!“, nach 1,5 s ausblenden.
- **Gedanke ablegen**: Sheet mit Feld „Was geht dir durch den Kopf?“ und „Ablegen“, Hinweis „Landet in „Kurz abladen“ auf deinem Heute-Bildschirm.“, Toast „Abgelegt. Weiter geht's.“

#### 3.9.15 Plan-Warteschlange (Live aus einem Plan)

Start über „Training starten“ in der Heute-Kachel (Plan des Tages):
1. Vergessenes Training prüfen.
2. Läuft ein Live-Training: Warteschlange anhängen (wenn noch keine oder eine andere), zur Live-Ansicht, erste offene Übung wählen.
3. Sonst Tagesform-Sheet; nach der Wahl (Warteschlange) dasselbe.

`live.queue = {plan, name, items:[{e,s,r}], i}` (nur Übungen, die existieren). Kachel unter dem Titel:
- „Plan · {Name}“, rechts „{erledigt} von {gesamt} Sätzen“ (pro Übung höchstens Soll gezählt).
- Fett „Übung {i} von {n} · Satz {k} von {s}“ bzw. „· geschafft“.
- Fortschrittsbalken.
- Horizontale Liste: Nummer bzw. Häkchen, Name, „{d}/{s} · Soll {r}“. Antippen wählt die Übung.
- Knopf „Nächste Übung: {Name}“ (Hauptknopf, wenn aktuelle Übung fertig, sonst Zweitknopf). Nächste = zyklisch ab der aktuellen die erste mit offenen Sätzen. Sind alle fertig: „Alles aus dem Plan geschafft. Stark. Unten kannst du das Training beenden.“
- „Andere Übung? Einfach unten einen Muskel antippen.“

Übung aus der Warteschlange wählen: `queue.i` setzen, Muskel = Hauptmuskel, Figur automatisch auf „Hinten“ bei Hinten-Muskeln. Der Log-Eintrag bekommt am Ende die Plan-ID.

#### 3.9.16 „Heute geschafft“

Gruppiert nach Übung: Kopfzeile (Gerätesymbol, Name, ›; antippen wählt die Übung), Satz-Chips „{w} × {r}“ (antippbar). Hinweis „Satz antippen, um ihn zu ändern oder zu löschen.“ Leer: „Tipp einen Muskel an, wähl dein Gerät und speichere deinen ersten Satz.“ Zähler „{n} Satz/Sätze“. Darunter (wenn Sperre an): „Instagram ist gesperrt, solange dein Training läuft.“

#### 3.9.17 Training beenden

- **Ohne Satz**: erster Tipp „Ohne Satz beenden?“ (3 s), zweiter verwirft das Training ohne Eintrag, zurück zu Training.
- **Mit Sätzen**:
  1. Eintrag `{date: Datum des letzten Satzes, plan: Plan-ID der Warteschlange oder "live", sets: gewichtete Muskelsätze, live:true, n: Anzahl Sätze, exs: Übungs-IDs, name: liveTitle, vals?}`.
  2. `live = null`, Pause beenden, Vibration [20,50,20,50,40], zu Training.
  3. Toast „Stark. {n} Satz/Sätze in {m} Min.“ (Zeit an) bzw. „Stark. {n} Satz/Sätze.“
  4. Nach 450 ms Abschluss-Karte (3.12) mit Keimi.
  5. Nach 1,2 s +15 Min. Zeitkonto „Training geschafft“ (einmal pro Tag).
  6. Danach (Warteschlange, frühestens 1,5 s später und nach Schließen der Karte) Messwerte nachher.

#### 3.9.18 Vergessenes Training automatisch beenden

Läuft ein Live-Training und die letzte Aktivität (Start bzw. letzter Satz) ist mindestens **3 Stunden** her:
- Mit Sätzen: Eintrag wie beim Beenden, Datum = Tag der letzten Aktivität, zusätzlich `auto:true`; Log nach Datum sortieren.
- `live = null`, Pause aus.
- Toast nach 350 ms: „Dein Training {wann} war noch offen. Gespeichert mit {n} Sätzen.“ bzw. „Ein leeres Training {wann} habe ich geschlossen.“ `wann`: „von vorhin“ (heute), „von gestern“, „vom {Wochentag}“ (< 7 Tage), sonst „vom {Datum kurz}“.
- Keine Abschluss-Karte, kein Zeitkonto-Guthaben.
- Geprüft beim App-Start, bei jedem Ansichtswechsel, beim Umlenken-Start, beim Start eines Live-Trainings und wenn die App wieder sichtbar wird (dann ggf. von Live zu Training wechseln).

#### 3.9.19 Pulsgurt (Bluetooth)

- Knopf „♥ Puls“ im Kopf. Ohne Web-Bluetooth: Sheet „Pulsgurt verbinden“: „Brustgurte wie Polar H10 oder Garmin HRM senden den Puls über einen Bluetooth-Standard. Den kann eine Webseite aber nur in Chrome auf Android lesen, und nur, wenn die App eine eigene Adresse hat.“ / „Auf dem iPhone geht es erst als echte App. Der Code dafür ist schon drin.“ / „Verstanden“.
- Mit Web-Bluetooth: Gerätewahl mit Filter `heart_rate`, Charakteristik `heart_rate_measurement`, Benachrichtigungen. Wert: Flag-Bit 0 → 16 bit (LE) ab Byte 1, sonst 8 bit. Toast „{Gerät} verbunden“. Abbruch der Wahl ohne Meldung, Fehler: „Verbindung hat nicht geklappt. Gurt angelegt und Bluetooth an?“. Trennung: „Pulsgurt getrennt“.
- Verbunden: Knopf zeigt den Puls, Antippen → Toast „Puls: {bpm}“. Alle 5 s wird der Wert in `live.hr` gespeichert (max. 2000 Werte). Abschluss-Karte zeigt „♥ Ø {avg} · max {max}“.

#### 3.9.20 Instagram-Sperre während des Trainings

`lab.lockTrain` (Standard an). Schalter-Kachel im Umlenken-Tab: „Beim Training sperren – Solange ein Live-Training läuft, kommst du nicht auf Instagram.“ Wirkung siehe 3.15.4.

---

### 3.10 Plan-Session (Abhak-Fallback, `v-session`)

Einstieg: „Lieber ohne Gewichte abhaken“ und Kurzversion. Ein Plan ohne Übungen: Toast „Der Plan hat noch keine Übungen.“

- „← Abbrechen“ (verwirft ohne Rückfrage), Eyebrow „Training läuft“, `h1` Planname.
- Zeile „{x} von {y} Sätzen“ und „{p} %“, Fortschrittsbalken.
- Je Übung: Gerätesymbol, Name, „{Sätze} × {Soll} · {Gerät}“, Häkchen bei fertiger Übung, Reihe von Satz-Knöpfen 1…s. Tipp auf Knopf k: ist der Stand genau k, wird er k−1, sonst k (also bis k füllen). Animationen: neu gefüllte Knöpfe poppen gestaffelt (45 ms), zurückgenommener Knopf schrumpft kurz, Übung fertig → Zeile pulsiert. Vibration: alles fertig [18,40,18,40,30], Übung fertig [12,35,16], mehr 10 ms, weniger 5 ms.
- Alles fertig: Balken mit Rand, Konfetti (64 Teilchen in moss/pollen/sky, 1,15 s, nicht bei reduzierter Bewegung), Knopf „Fertig, speichern“ (sonst „Training beenden“).
- **Beenden**: ohne Haken Toast „Hak mindestens einen Satz ab.“ Sonst Eintrag `{date:heute, plan:Plan-ID, sets:gewichtete Muskelsätze aus abgehakten Sätzen, n: abgehakte Sätze, name: Planname}`, Muskelkarten-Animation vorbereiten, zu Training, Toast „Gespeichert: {n} Satz/Sätze“, Abschluss-Karte (ohne Gewichte), +15 Min., Messwerte nachher.
- Plan-Sessions schreiben **keinen** Übungsverlauf und damit keine Daten für Vorschläge oder Bestleistungen.

---

### 3.11 Körperfiguren

#### 3.11.1 Formen

Zwei SVG-Figuren mit `viewBox 0 0 120 244`: Silhouette, Kopf, Hände, Füße, Knie (neutral) und Muskelflächen als Pfade mit Muskelschlüssel. Vorne: back (Trapez), shoulders, chest, biceps, forearms, abs (8 Felder + 2 seitlich), quads (6 Teile), calves. Hinten: back (6 Teile), shoulders, triceps, forearms, lowerback, glutes, hams, calves (4 Teile). Jede Fläche hat `<title>` mit dem deutschen Namen. Die Pfaddaten werden 1:1 übernommen (Zeilen 1491–1554 im Ist-Code) und auch für die Abschluss-Karte (Canvas, `Path2D`) genutzt.

#### 3.11.2 Klassen

`m` Grundzustand (`--m-off`), `l1` 34 % glow, `l2` 64 % glow, `l3` voll glow, `plan` Ocker 16 % gestrichelt, `sel` Ocker mit dunklem Rand (Live), `pulse` Einblenden.

---

### 3.12 Abschluss-Karte (teilbares Bild)

#### 3.12.1 Daten

| Feld | Live | Plan-Session | Beispiel |
|---|---|---|---|
| title | `liveTitle` (z. B. „Brust & Trizeps“, Planname bei Warteschlange) | Planname | „Oberkörper“ |
| date | heute | heute | heute |
| mins | Minuten seit Start, nur bei Zeit an, sonst `null` | Minuten seit Session-Start, nur bei Zeit an | 52 |
| sets | Anzahl Sätze | abgehakte Sätze | 16 |
| reps | Summe Wdh. | `null` | 154 |
| vol | Summe `w·r`, gerundet | `null` | 5380 |
| mus | gewichtete Muskelsätze | gewichtete Muskelsätze | {chest 6, triceps 6, shoulders 5, back 6, biceps 6} |
| items | je Übung `{n, g, sets:[{w,r}], pr}` | je Übung mit Haken `{sets:[{w:null,r:Soll}]}` | 6 Übungen, Bankdrücken mit PR |
| hr | `{avg,max}` oder fehlt | – | – |
| sample | – | – | true |

`pr` = es gibt heute eine Bestleistung für diese Übung. Die zuletzt gezeigte Karte wird in `lab.lastCard` gespeichert.

#### 3.12.2 Layout (Canvas 1080 × 1350, immer dunkle Farben)

Farben: bg `#0F1312`, Karte `#161C1A`, Linie `#28302D`, Text `#E5E9E6`, gedämpft `#98A39E`, Akzent `#8CBBA9`, Akzent 2 `#CDAE7A`, aus `#242C29`. Hintergrund mit radialem Akzentschimmer oben links (16 %).

1. Kopf (x 72): „{NAME}  ·  {WOCHENTAG, TAG. MONAT JAHR}“ in Großbuchstaben, Mono 28 px, y 110. Titel Display 84 px fett, y 205, auf Breite 936 px gekürzt mit „…“. „BEISPIEL“ in Ocker bei Beispielkarte (y 248). Puls rechtsbündig „♥ Ø 128  ·  max 171“ (y 248).
2. Vier Kennzahl-Kacheln (y 280, Höhe 140, Radius 28, Abstand 16): Minuten (oder Anzahl Übungen, wenn keine Minuten), Sätze, „Wiederh.“ (oder „–“), „kg bewegt“ (oder „–“, Tausenderpunkt). Zahl Mono 56 px (44 px bei mehr als 5 Zeichen). Singular/Plural („Minute/Minuten“, „Satz/Sätze“, „Übung/Übungen“).
3. Körperkarte (y 452, Höhe 430, Radius 32): Figuren vorne/hinten mit Faktor 1,55, Muskelfüllung `rgba(140,187,169, 0,35 + 0,65·v/max)`, untrainiert `#242C29`, Beschriftung „VORNE“/„HINTEN“. Rechts „MUSKELN“ mit bis zu 7 Muskeln absteigend und Wert „{x,5} S“ in Akzentfarbe.
4. „ÜBUNGEN“ ab y 920: bis zu 6 Übungen (bei mehr als 6: 5 + „+ {n} weitere Übungen“), Abstand 50 px. Name 32 px, auf 470 px gekürzt. „★ BEST“ in Ocker hinter dem Namen bei PR. Rechtsbündig Sätze „60×10  65×8“ (eine Nachkommastelle, Komma) oder „{n} Sätze“, wenn keine Gewichte.
5. Fuß: Linie bei H−92, links „Nachtgarten“ (Akzent, Display 30 px), rechts „Training, ehrlich festgehalten“.

#### 3.12.3 Sheet

Titel „Stark gemacht“ bzw. „Abschluss-Karte (Beispiel)“. Bild (Alt-Text „Abschluss-Karte: {Titel}, {n} Sätze“), ggf. Keimi mit `finish`-Satz, Knöpfe „Bild speichern“ (Häkchen) und „Schließen“, Hinweis „Das Bild passt für Strava, Instagram oder WhatsApp.“

Speichern: über die Downloads-Fähigkeit des Hosts (`training-{Datum}.png`, Toast „Bild gespeichert“; „declined“ still ignorieren, „rate_limited“ → „Einen Moment, dann nochmal.“), im Standalone per Download-Link (Toast „Datei gespeichert“). Ist beides nicht möglich, Knopf ausblenden und Hinweis „Zum Sichern lange auf das Bild drücken.“ bzw. nach Fehler „Speichern geht hier nicht. Lange auf das Bild drücken, um es zu sichern.“

---
### 3.13 Schwangerschaft & Rückbildung (`v-mama`, `v-player`)

Fachliche Grundlage (Quellenzeile in der Ansicht): „Quellen: Kanadische Leitlinie 2019 (Mottola u. a.), WHO 2020, ACOG 2020, UK Chief Medical Officers 2019, Netzwerk Gesund ins Leben, Goom/Donnelly/Brockwell 2019, IOC-Expertengruppe 2016.“ Die Inhalte (`MAMA`) werden **wörtlich** aus dem Ist-Code übernommen (Zeile 2327) und als eigene JSON-Datei gepflegt.

#### 3.13.1 Inhaltsstruktur `MAMA`

```
{
  disclaimer: string,
  contraindications_absolute: string[12],
  contraindications_relative: string[13],
  stop_signs: string[14],
  principles: string[17],
  phases: [{
    id, title, weeks:[von,bis], focus, notes: string[],
    csection_notes?: string[],            // pp0, pp1, pp2
    return_to_running_criteria?: string[], // nur pp2
    plans: [{ id, name, minutes, level, equipment: string[],
      blocks: [{ name, items: [{ ex, mode:"time"|"reps", work:Sek|null, rest:Sek, sets, reps:n|null, cue, avoid_if? }] }] }]
  }]
}
```

Phasen und Pläne:

| Phase | Titel | Wochen | Pläne (Minuten, Niveau, Ausrüstung) |
|---|---|---|---|
| t1 | 1. Trimester (SSW 1–13) | 1–13 | t1a „Ganzkörper-Kraft zu Hause“ (33, mittel; Matte, leichte Kurzhanteln, Widerstandsband, Stuhl) · t1b „Mobilität, Atmung & Beckenboden“ (24, leicht; Matte, Kissen) |
| t2 | 2. Trimester (SSW 14–27) | 14–27 | t2a „Kraft mit Babybauch“ (33, mittel) · t2b „Beweglich & entspannt“ (24, leicht; + Gymnastikball optional) |
| t3 | 3. Trimester (SSW 28–40) | 28–40 | t3a „Alltagskraft sanft“ (26, leicht; Stuhl, leichte Kurzhanteln, Widerstandsband, Miniband optional) · t3b „Geburtsvorbereitung: Mobilität & Loslassen“ (22, leicht) |
| pp0 | Wochenbett (0–6 Wochen nach Geburt) | 0–6 | pp0a „Sanfter Neustart“ (27, leicht; Matte oder Bett, Kissen) |
| pp1 | Rückbildung (6–12 Wochen) | 6–12 | pp1a „Kraft-Basics nach der Geburt“ (25, leicht) · pp1b „Beckenboden & Rumpf-Aufbau“ (23, leicht; enthält „Narbenmobilisation (nur nach Kaiserschnitt, verheilt)“ und eine Wdh.-Übung „Beckenboden beim Husten (Knack-Technik)“ 2×5) |
| pp2 | Zurück ins Training (ab 12 Wochen) | 12–52 | pp2a „Ganzkörper-Kraft Aufbau“ (29, mittel) · pp2b „Laufvorbereitung & Belastungstest“ (26, mittel; Wdh.-Übungen und Impact-Block „(nur wenn symptomfrei)“) |

Blöcke mit „Zirkel“ oder „Runden“ im Namen: t1a, t2a, pp1a, pp2a („Hauptteil (Zirkel, 3 Runden)“ bzw. „(Zirkel, 2–3 Runden)“), t3a („Hauptteil (2–3 Runden nach Tagesform)“).

#### 3.13.2 Zustand und Berechnung

`lab.mama = {mode:"preg"|"post", date:"YYYY-MM-DD", cs:boolean}`.

- **Schwanger** (`date` = errechneter Geburtstermin): `tage = heute − ET` (ganze Tage, beide Daten 12:00 Uhr), `ga = 280 + tage`. `ga < 0` → kein Zustand. `w = floor(ga/7)`, `r = ga mod 7`, Label „SSW {w}+{r}“. Phase: `w ≤ 13` t1, `w ≤ 27` t2, sonst t3.
- **Nach der Geburt** (`date` = Geburtsdatum): `tage = heute − Geburt`, `< 0` → kein Zustand. `w = floor(tage/7)`, Label „{w} Woche(n) nach der Geburt“ (1 → „Woche“). Phase roh: `w < 6` pp0, `w < 12` pp1, sonst pp2.
- **Schranken nach der Geburt**: Rohphase pp1 oder pp2 und `lab.ppCheck6` nicht gesetzt → wirksame Phase pp0, `needs = pp1`. Rohphase pp2 und `lab.ppCheck12` nicht gesetzt → wirksame Phase pp1, `needs = pp2`.

#### 3.13.3 Aufbau der Mama-Ansicht

Kopf: „← Training“, Eyebrow „Schwangerschaft & Rückbildung“, `h1` = Label bzw. „Training für dich und dein Baby“.

**Ohne Zustand** (kein Datum): Setup-Kachel, Sicherheits-Kachel (aufgeklappt), „Fertige Pläne für zu Hause“, alle Phasen als aufklappbare Kacheln (erste offen), Quellen.

**Mit Zustand** (von oben):
1. Ggf. „Training fortsetzen“ (wenn der Player pausiert im Speicher ist): „{Plan} · Schritt {i} von {n}“.
2. Ggf. **Termin überschritten** (schwanger und `w ≥ 40`): Eyebrow Label, „Ist dein Baby schon da?“, „Ja, Baby ist da“ (→ `mama = {mode:"post", date:"", cs:false}`, Datumsfeld fokussieren) / „Noch nicht“ (blendet bis zum nächsten Rendern aus).
3. Ggf. **Abfrage vor dem nächsten Schritt** (`needs`): Eyebrow „Bereit für den nächsten Schritt?“, Phasentitel, Checkliste, Hinweis „Im Zweifel mit Hebamme, Ärztin oder Beckenboden-Physiotherapie sprechen.“ (+ „ Nach Kaiserschnitt lieber etwas länger warten.“), „Trifft alles zu“ (setzt `ppCheck6` bzw. `ppCheck12`) / „Noch nicht“ (Toast „Alles gut. Die bisherigen Pläne passen weiter.“).
   - Checkliste pp1: „Die Nachsorge-Untersuchung war unauffällig“, „Der Wochenfluss ist abgeklungen“, „Keine Schmerzen, kein Druck- oder Schweregefühl im Becken“.
   - Checkliste pp2: „Keine Inkontinenz, kein Druckgefühl im Becken“, „Kein deutliches Vorwölben in der Bauchmitte bei Belastung“, „Die Rückbildungsübungen fühlen sich leicht an“.
   - Bei Kaiserschnitt zusätzlich: „Die Kaiserschnittnarbe ist gut verheilt“.
4. Ggf. **Neu für dich** (Phasenwechsel): wenn `lab.mamaSeen` gesetzt ist und von der wirksamen Phase abweicht: „Neu für dich“, Phasentitel, „{Fokus} Deine Pläne haben sich angepasst.“, „Alles klar“ (setzt `mamaSeen`). Beim allerersten Zustand wird `mamaSeen` still gesetzt.
5. **Diese Woche**: Tipp = `notes[w mod Anzahl]` der aktuellen Phase.
6. „Deine Pläne jetzt“ + Kachel der aktuellen Phase (Pill „Jetzt“, aufgeklappt): Plan-Knöpfe „{Name}“ / „{min} Min. · {Niveau} · {Ausrüstung}“ / Pill „Start“ bzw. „✓ Start“ (wenn schon einmal geschafft), „Hinweise zu dieser Phase“ (eingeklappt; Phasen-Hinweise, bei Kaiserschnitt zusätzlich „**Kaiserschnitt:** …“-Punkte, in pp2 „Wann wieder laufen?“ mit Kriterien).
7. Sicherheits-Kachel „Bitte zuerst lesen / Sicherheit & Warnzeichen“: Disclaimer, „Sofort aufhören und abklären bei“ (Liste), eingeklappt „Wann nicht trainieren (absolute Gegenanzeigen)“, „Nur nach Rücksprache (relative Gegenanzeigen)“, „Grundregeln“. Mit Zustand eingeklappt (die Bestätigung beim ersten Start stellt sicher, dass sie gelesen wird).
8. Setup-Kachel „Deine Situation“: Segment „Schwanger | Nach der Geburt“, Datumsfeld „Errechneter Geburtstermin“ bzw. „Geburtsdatum“, bei „Nach der Geburt“ Schalter „Kaiserschnitt – zeigt passende Hinweise“, „Bleibt nur auf diesem Gerät.“ **Moduswechsel leert das Datum** (Datum bleibt nur, wenn der Modus gleich bleibt).
9. „Andere Phasen ansehen“ (eingeklappt): je Phase „{Titel}“ / „{n} Pläne“ → Sheet mit Fokus, Plänen („Ansehen“ startet den Player) und Hinweisen.
10. Quellen.

#### 3.13.4 Start eines Heimplans (Ablauf)

1. **Sicherheitsbestätigung** (nur Mama-Pläne, einmalig, `lab.mamaSafetyOk`): Sheet „Bevor du startest“ mit Disclaimer, „Sofort aufhören und abklären bei“ + Liste, Knopf „Gelesen, los geht's“.
2. **Belastungstest-Check** (nur pp2b): Sheet „Vor dem Belastungstest“: „Der Test zeigt, ob dein Körper bereit fürs Laufen ist. Bitte nur starten, wenn alles zutrifft. Bei Urinverlust, Druck- oder Schweregefühl sofort abbrechen.“ + Laufkriterien, „Trifft alles zu, starten“ / „Noch nicht“.
3. **Längenwahl** (wenn eine Übung mehr als einen Satz hat): Sheet mit Planname, „Wie viel Zeit hast du heute?“, „Komplett – ca. {min} Minuten“ / „Kurz – ca. {max(5, round(min·0,45))} Minuten, jede Übung einmal“.
4. Player mit den gebauten Schritten öffnen.

#### 3.13.5 Schritte bauen (Zirkel, Kurzversion, Kaiserschnitt)

- Übungen mit „Narbenmobilisation“ im Namen nur, wenn `mama.cs` gesetzt ist.
- Sätze je Übung: Kurz = 1, sonst `sets`.
- **Zirkel-Block** (Name enthält „Zirkel“ oder „Runden“ und mehr als eine Übung): Rundenzahl R = größte Satzzahl. Für Runde 1…R jede Übung, deren Satzzahl ≥ Runde ist: Arbeitsschritt (Blocklabel „{Blockname ohne Klammer} · Runde {r} von {R}“), danach Pause, wenn die Übung eine Pause hat und es eine nächste Übung gibt (nächste in der Runde oder erste der nächsten Runde). Pause zeigt „Gleich: {nächste Übung}“.
- **Normaler Block**: pro Übung alle Sätze hintereinander, Pause nach jedem Satz außer nach dem letzten Satz der letzten Übung des Blocks. Pausenlabel „Gleich: {Übung} (Satz {s+1})“ bzw. „Gleich: {nächste Übung}“. Blocklabel „{Blockname} · Satz {s} von {n}“ (bei mehr als einem Satz).
- Zwischen Blöcken keine Pause.

#### 3.13.6 Timer-Player (`v-player`)

- Tab-Leiste ausgeblendet. Kopf: „← Beenden“, „! Warnzeichen“ (Sheet „Sofort aufhören bei“ mit Warnzeichen), rechts „{i+1} / {n}“. Fortschrittsbalken `i/n`.
- Mitte: Blocklabel, `h1` Übung bzw. „Pause“, Hinweistext (Arbeit: `cue`; Pause: „Gleich: …“), Ring (r 52) mit Restzeit `m:ss` und Phase „Los“/„Pause“; bei Wdh.-Übung „{reps}×“ / „Wiederholungen“.
- Warnzeile: „Achtung: {avoid_if}“; sonst nach der Geburt mit Kaiserschnitt bei Mama-Plänen: „Kaiserschnitt: nur schmerzfrei, kein Zug an der Narbe.“
- **Seitenwechsel**: Enthält der Hinweis „Seite wechseln“ oder „Seite in der Hälfte“ und ist es eine Zeit-Übung, wird der Zusatz „pro Satz Seite wechseln“ aus dem Hinweis entfernt und „ Seitenwechsel kommt in der Hälfte.“ angehängt. Bei Restzeit = `floor(Dauer/2)`: Ton 740 Hz 200 ms, Vibration [20,40,20], Toast „Seite wechseln“.
- Knöpfe: „‹“ (vorheriger Schritt), Hauptknopf, „›“ (nächster Schritt). Unten „Danach: {nächste Arbeitsübung}“ bzw. „Letzte Übung“.
- **Hauptknopf**: Zeit-Schritt → „Start“/„Pause“ (Start: Ton 520 Hz, Intervall 1 s, Wake-Lock). Wdh.-Schritt → „Fertig“: weiter; ist der neue Schritt zeitgesteuert, läuft er sofort, und der Knopf zeigt sofort „Pause“.
- **Ticken**: jede Sekunde −1; bei 3, 2, 1 Ton 660 Hz; bei 0 Ton 880 Hz 300 ms, Vibration [30,60,30], automatisch weiter. Ein Wdh.-Schritt hält den Lauf an.
- **Beenden**: Nach Schritt 1 fragt „← Beenden“ zuerst „Wirklich beenden?“ (3 s). Dann Timer stoppen, Wake-Lock frei, zurück. **Soll:** zurück dorthin, wo der Plan gestartet wurde (Mama-Ansicht bzw. Training).
- **Verlassen ohne Beenden** (z. B. per Zurück-Geste): Lauf pausieren; in der Mama-Ansicht erscheint „Training fortsetzen“.
- **Ende**: Log-Eintrag `{date:heute, plan:"mama:"+PlanID, sets:{}, act:true}`, zwei Töne (880 Hz, dann 1180 Hz), Vibration [20,50,20,50,40], zurück zur Mama-Ansicht (Mama-Plan) bzw. zu Training (Einsteigerplan), Toast „Geschafft: {Plan}“, +15 Min. Zeitkonto.

---

### 3.14 Einsteigerpläne (`BEGIN`)

Nutzen denselben Player, ohne Sicherheitsbestätigung.

- **b1 „10 Minuten ohne Geräte“** (10 Min., leicht, Ausrüstung „nichts“): Aufwärmen „Marschieren auf der Stelle“ 60 s · „Hauptteil (Zirkel, 2 Runden)“: Kniebeugen 40/20, Liegestütz an der Wand oder auf den Knien 40/20, Ausfallschritt rückwärts im Wechsel 40/20, Beckenheben 40/20, Unterarmstütz auf den Knien 30/20, je 2 Runden · Abschluss „Lockern und dehnen“ 60 s.
- **b2 „Rücken & Beweglichkeit (8 Min.)“** (Matte): Katze-Kuh 45/15, Brustwirbelsäulen-Rotation im Vierfüßler 60/15 (Seite in der Hälfte), Hüftbeuger-Dehnung im Halbkniestand 60/15 (Seite in der Hälfte), Bird-Dog 45/15 ×2, Kindhaltung 60. **Ist: nirgends erreichbar.** **Soll:** auf Ruhetagen und im Fokus „Weniger Handy“ als zweite Option anbieten.

Einstiege b1: „Lust auf 10 Minuten ohne Geräte?“ (Ruhetag), Kurzversion ohne passende Geräte.

---

### 3.15 Umlenken / Gate (`v-gate`)

Kopf: Eyebrow „Statt Instagram: echte Menschen“, `h1` „Kurz innehalten, bevor du scrollst.“ Darunter das „Telefon“ (simulierter Bildschirm), die Zeitkonto-Kachel, die Sperr-Schalter-Kachel, „Deine Menschen“ und ein Erklärtext.

#### 3.15.1 Ablauf (Schritte im Telefon)

| Schritt | Inhalt | Weiter |
|---|---|---|
| **start** | (a) Live-Training läuft und Sperre an → Sperrbildschirm (3.15.4). (b) Freigabe läuft → „Freigabe läuft noch {n} Min.“ (3.15.3). (c) sonst: App-Symbol „IG“, „Simuliert: Du tippst auf Instagram.“, Knopf „Instagram öffnen“ | → breath |
| **breath** | Versuch zählen (`tries+1`). Eyebrow „Einen Moment“, Atemkreis „Einatmen“ (wächst 2,8 s), dann „Ausatmen“ (2,6 s) | → person (automatisch) |
| **person** | Ohne Personen: „Wer fehlt dir?“, „Trag unten ein paar Menschen ein, dann erscheinen sie hier.“, Zeit-Knopf. Mit Personen: Avatar (Initiale), Frage + Satz (3.15.2), Knöpfe „{Name} schreiben“, „Jemand anderes“ (nächste Person der sortierten Liste, reihum), Zeit-Knopf | schreiben → msg · Zeit-Knopf → open |
| **msg** | Umlenkung zählen (3.15.5), `last = heute`. Eyebrow „Vorschlag zum Kopieren“, Sprechblase mit Eröffnungssatz, „Text kopieren“ (→ „Kopiert“; ohne Zwischenablage-Zugriff Text markieren → „Markiert, jetzt kopieren“), „Demo neu starten“, Hinweis „Bei {Name} steht jetzt „heute“. Einfach in WhatsApp einfügen.“, Keimi-Zeile | → start |
| **open** | Zeitkonto (3.15.3) | |

**Zeit-Knopf** (auf „person“): Guthaben > 0 → „Zeit aus dem Konto nehmen ({n} Min.)“, sonst „Konto leer: lieber kurz rausgehen?“.

Eröffnungssätze (zufällig): „Hey {n}, musste gerade an dich denken. Wie geht's dir?“ · „{n}! Lange nichts gehört. Hast du diese Woche mal Zeit für einen Kaffee?“ · „Hey {n}, wie läuft's bei dir gerade so?“

#### 3.15.2 Fragen auf dem Personen-Schritt

Auswahl: `(Personenindex + aktuelle Minute) mod 5`.
1. „Was {n} wohl gerade erlebt?“ / „Vielleicht wartet da eine bessere Geschichte als im Feed.“
2. „Wer würde sich heute über ein Lebenszeichen freuen?“ / „Vielleicht {n}.“
3. „Was suchst du gerade eigentlich?“ / „Manchmal ist es einfach ein Mensch. {n} zum Beispiel.“
4. „Ein Satz an {n} dauert kürzer als ein Reel.“ / „Und bleibt länger hängen.“
5. „Woran denkt {n} wohl gerade?“ / „Du könntest es einfach fragen.“

Seit ≥ 14 Tagen kein Kontakt: angehängt „ Ihr hattet länger keinen Kontakt.“

#### 3.15.3 Instagram-Zeitkonto

- **Grundzeit** 15 Min. pro Tag. **Guthaben** = `max(0, 15 + verdient − genutzt)` (heute).
- **Verdienen**:
  - Live-Training oder Plan-Session mit mindestens einem Satz beendet, Heimplan geschafft oder Aktivität eingetragen: **+15** „Training geschafft“ bzw. „{Aktivität} geschafft“, **einmal pro Tag** (Schlüssel `training`).
  - Jemandem schreiben (Schritt msg): **+5** „Kontakt statt Scrollen“, höchstens **3-mal pro Tag** (Schlüssel `kontakt0` … `kontakt2`).
  - Feed komplett gelesen, wobei der letzte Lesevorgang heute war: **+5** „Feed bewusst gelesen“, einmal pro Tag (Schlüssel `feed`).
  - Toast „+{n} Min. Instagram verdient: {Grund}“, Vibration [10,40,10]. Ohne Fokus „handy“ still (nur Gutschrift).
- **Zeit nehmen** (Schritt open): Guthaben 0 → Symbol Wolke, „Dein Konto ist für heute leer.“, „Verdien dir Zeit: Training +15 Min., jemandem schreiben +5 Min., Feed durchlesen +5 Min.“, „Zurück“ (→ person). Sonst Eyebrow „Zeitkonto“, „{n} Min. verfügbar“, „Wie viel nimmst du dir?“, Knöpfe für 5/10/15 Min., soweit ≤ Guthaben (gibt es keinen, ein Knopf mit dem Rest), erster als Hauptknopf, „Doch nicht“ (→ person).
- **Freigabe**: Wahl von m Min. → `genutzt += m`, `lab.igUnlock = {until: jetzt + m·60 000}`. Bildschirm „{m} Minuten. Viel Spaß.“ / „Danach fragt dich die App wieder. Noch {n} Min. auf dem Konto.“, Link „Zu Instagram“ (`https://www.instagram.com/`, neuer Tab), „Demo neu starten“.
- **Freigabe läuft** (start): „Freigabe läuft noch {n} Min.“ (aufgerundet), „Danach fragt dich die App wieder.“, Link „Weiter zu Instagram“, „Freigabe beenden“ (Restminuten abgerundet zurück aufs Konto, Freigabe löschen).
- **Kachel „Instagram-Zeitkonto“**: rechts „Freigabe: noch {n} Min.“ oder „Pause“. Groß das Guthaben „Min. übrig heute“, daneben „Grundzeit 15“, „Verdient +x“, „Genutzt −y“. Verdienst-Chips (aktiv, wenn heute schon verdient): „Training +15“, „Jemandem schreiben +5“, „Feed durchgelesen +5“. „Dein Verlauf · 7 Tage“: Säulen für die letzten 7 Tage (heute rechts), Höhe `Versuche / max(3, größter Wert)`, darüber die Umlenkungen als zweite Füllung, Zahl und Wochentagskürzel. Legende „Versuche“ / „stattdessen umgelenkt“. Zeile „Heute {t}× versucht, {r}× umgelenkt, {u} Min. genutzt.“
- `lab.igHist` behält die letzten 30 Tage.

#### 3.15.4 Sperre während des Trainings

Läuft ein Live-Training und ist `lab.lockTrain` an, zeigt **start** immer (auch bei laufender Freigabe): Hantel-Symbol, „Du bist gerade beim Training.“, „Instagram wartet, bis du fertig bist. Seit {m} Min. dabei, {n} Satz/Sätze geschafft.“, Knopf „Zurück zum Training“ (→ Live).

#### 3.15.5 Umlenkungen zählen

Bei „{Name} schreiben“: `lab.redirects[Montag dieser Woche] += 1`, `igHist[heute].redirects += 1`, ggf. +5 Min.

#### 3.15.6 Deine Menschen

- Kopf „Deine Menschen“, rechts „{n} Person(en)“ bzw. „Noch niemand“.
- Liste sortiert nach „seit“ absteigend (wer am längsten nichts gehört hat, steht oben). Zeile: Name, Pill „Beispiel“ bei Beispielpersonen, „heute“ / „gestern“ / „seit {d} Tagen“ (< 14) / „seit {round(d/7)} Wochen“, Knöpfe „Kontakt gehabt“ (setzt heute) und „×“ (entfernt; **Soll:** mit Rückgängig-Toast).
- „Name hinzufügen“ + „Hinzufügen“: neue Person mit `last = vor 30 Tagen`.
- Beispielpersonen: Tim (vor 42 Tagen), Lena (19), Oma (11).
- Erklärtext unten: „So würde es auf dem iPhone laufen – Eine Kurzbefehle-Automation öffnet diese Seite, sobald du Instagram startest. Wer am längsten nichts von dir gehört hat, steht oben.“ **Soll:** Den veralteten Satz „Wählst du „Trotzdem Instagram“, hast du 10 Minuten Ruhe …“ durch „Willst du trotzdem, nimmst du dir Zeit aus deinem Konto.“ ersetzen.

---

### 3.16 Langsamer Feed (`v-feed`)

- Eyebrow „Langsamer Feed · heute“, `h1` „Drei Dinge, dann ist Schluss.“, Fortschrittsstriche (einer pro Element, gefüllt = gelesen).
- Element: Quelle („Artikel · 8 Min.“, „Eigene Notiz“, „Podcast · 34 Min.“, „Gespeichert“), Pill (Tag „Beispiel“/„Gespeichert“), Titel, Knöpfe „Gelesen“ und „Auf morgen“. Gelesene Elemente: gedämpft, „Gelesen“.
- **Gelesen**: `read = true`, `lab.feedReadDay = heute`.
- **Auf morgen**: Element in die Warteschlange (`lab.queue`) und aus dem Feed entfernen.
- **Alle gelesen** (oder Feed leer): „Du bist durch.“ / „Kein Weiterscrollen. Morgen gibt es wieder drei Dinge.“ und „Demo zurücksetzen“ (stellt die drei Beispiele wieder her). **Soll:** „Demo zurücksetzen“ nur zeigen, solange nur Beispielinhalte existieren.
- **Für morgen speichern**: Feld „Link oder Gedanke einfügen“ + „Speichern“ → Warteschlange `{t, s:"Gespeichert"}`. Zeile darunter: „{n} Sache(n) wartet/warten auf morgen.“ bzw. „Was du hier speicherst, landet in der Auswahl von morgen.“
- **Tageswechsel** (`lab.feedDay`): beim ersten Öffnen eines neuen Tages bleiben ungelesene Elemente stehen, gelesene fallen weg, und aus der Warteschlange werden so viele Elemente nachgefüllt, dass es höchstens 3 sind (`tag:"Gespeichert"`). Beim allerersten Öffnen wird nur das Datum gesetzt.
- **Verdienen**: siehe 3.15.3 (nur, wenn heute tatsächlich etwas als gelesen markiert wurde).

---

### 3.17 Sicherung & Wiederherstellung

- **Speichern**: JSON `{app:"nachtgarten", version:1, created:ISO-Zeit, data:{ "<lab.-Schlüssel>": "<roher String aus localStorage>" }}`, Dateiname `nachtgarten-sicherung-{YYYY-MM-DD}.json`. Über die Downloads-Fähigkeit des Hosts (Toast „Sicherung gespeichert“), sonst Download-Link (Toast „Datei gespeichert“; Fehler „Speichern hat nicht geklappt.“).
- **Laden**: Dateiauswahl (`.json`). Nicht lesbar: „Die Datei ist keine gültige Sicherung.“ Falsches Format (`app` ≠ „nachtgarten“ oder kein `data`): „Die Datei ist keine Nachtgarten-Sicherung.“ Sonst Sheet „Sicherung laden?“: „Sicherung vom {Datum} mit {n} Einträgen. Deine aktuellen Daten auf diesem Gerät werden dabei ersetzt.“, „Ja, laden“ (alle `lab.*` löschen, Schlüssel aus der Datei schreiben, nur `lab.*`, neu laden; Fehler: „Laden hat nicht geklappt.“) / „Abbrechen“.

---

### 3.18 Hell / Dunkel

Schalter (role switch, 58×32, Knopf mit Mond bzw. Sonne, `aria-checked` = dunkel) oben rechts auf Heute und im Profil-Sheet. Umschalten setzt `data-theme` und speichert `lab.theme` als **rohen** String „light“/„dark“ (nicht JSON). Standard dunkel. Alle Schalter-Instanzen werden synchron aktualisiert.

---

### 3.19 Ideen-Labor (`v-ideen`)

Eyebrow „Ideen-Labor“, `h1` „Was dich packt“, rechts Pill „{n} Favorit(en)“. Text „Tipp eine Idee an, um sie auszuprobieren. Mit ♥ merkst du dir, was dich packt.“

| ID | Titel | Text | Art |
|---|---|---|---|
| feed | Langsamer Feed | Speichern statt scrollen. Einmal am Tag eine kleine Auswahl, dann ist der Feed zu Ende. | live → Feed |
| gate | Statt Instagram: echte Menschen | Du öffnest Instagram, und die App zeigt dir, wem du lange nicht geschrieben hast. | live → Umlenken |
| training | Trainings-Begleiter | Eigene Pläne, Wochenplan, Sätze abhaken und eine Muskelkarte, die zeigt, was du trainiert hast. | live → Training |
| cockpit | Persönliches Cockpit | Ein ruhiger Startbildschirm mit dem, was heute wirklich zählt. | live → Heute |
| paar | Paar-Cockpit | Zwei Kalender übereinander, gemeinsame freie Zeit auf einen Blick, Aufgaben fair verteilt. | Skizze: „Wer arbeitet wann, wer hat frei“, „Termine und Vorbereitung fürs Baby an einem Ort“, „Sichtbar, wer was übernommen hat“ |
| diss | Doktorarbeit nach Energie | Tagesform angeben, passende Aufgabe bekommen. Fortschritt in kleinen Schritten. | Skizze: „Wenig Energie: Quellen sortieren, Literatur lesen“, „Viel Energie: Schreiben“, „Fortschritt als kleine Etappen statt Seitenzahl“ |
| ritual | Feierabend-Ritual | Ein kurzer Ablauf zum Abschalten: Kopf leeren, Übergang ins Private. | Skizze: „Drei Gedanken abladen, die dich noch beschäftigen“, „Eine kurze Atem- oder Bewegungsrunde“, „Ein Satz: Was war heute gut?“ |
| runde | Tiefgang-Runde | Ein kleiner Freundeskreis teilt pro Woche je eine Sache, die wirklich zählte. | Skizze: „Keine Likes, keine Reichweite“, „Ein Beitrag pro Person und Woche“, „Sonntags als kleiner Brief zusammengefasst“ |
| dump | Braindump-Sortierer | Alles reinschreiben, sortiert wird in heute, irgendwann und loslassen. | Skizze: „Ein Eingabefeld, sonst nichts“, „Drei Stapel: Heute, Irgendwann, Loslassen“, „Abends kurzer Blick auf „Heute““ |

Karte: Symbol, Titel, Herz-Knopf (Favorit, Pop-Animation, Vibration 12/5 ms), Text, Pill „Zum Ausprobieren“ bzw. „Skizze“, Link „Ausprobieren →“ bzw. „Ansehen →“. Skizzen öffnen das Sheet mit Eyebrow „Skizze“, Titel, Text, Liste und „Schließen“. Favoriten in `lab.likes` (Standard feed, gate).

---

### 3.20 Datenschutz-Texte (Fundorte)

| Ort | Text |
|---|---|
| Onboarding Schritte 0 und 3 | „Freiwillig. Bleibt nur auf deinem Handy.“ |
| Heute, Fußnote | „Tipp auf deinen Namen oder den Satz oben, um sie zu ändern. Alles bleibt nur auf diesem Gerät.“ |
| Heute, „Deine Daten“ | siehe 3.3.8 |
| Profil-Sheet | „Alles bleibt nur auf deinem Handy. Kein Konto, kein Upload.“ |
| Mama-Setup | „Bleibt nur auf diesem Gerät.“ |
| Messwerte | „Medizinische Entscheidungen bitte immer mit deinem Behandlungsteam.“ / „Das ist keine medizinische Bewertung.“ |
| Sicherung | „Neues Handy? Mit einer Sicherung nimmst du alles mit.“ |

---

### 3.21 PWA und Build

- `build.py`: entfernt Google-Fonts-Links, bindet `fonts/*.woff` per `@font-face` ein, setzt Titel „Nachtgarten“, Viewport-Meta (`viewport-fit=cover`), `theme-color #0F1312`, `color-scheme dark light`, Apple-Web-App-Metas, Manifest, Icons, `window.__standalone = true`, registriert `sw.js`.
- Manifest: name/short_name „Nachtgarten“, Beschreibung „Dein persönlicher Begleiter für Training, Fokus und Alltag.“, `lang de`, `display standalone`, `orientation portrait`, Hintergrund und Theme `#0F1312`, Icons 192, 512, maskable 512.
- Service Worker: versionierter Cache `ng-{sha1[:10]}` für die App-Hülle (Seite, Manifest, Fonts, Icons); `demos/` cache-first in `ng-demos` (bleibt über Versionen); Navigation network-first mit Fallback auf die gecachte `index.html`; sonst cache-first. Alte Caches außer `ng-demos` werden beim Aktivieren gelöscht.
- Lizenzen: Übungsfotos und Anleitungen aus free-exercise-db (Unlicense), Schriften unter SIL OFL.

---
## 4. Datenmodell

### 4.1 Allgemeines

- Alle Schlüssel liegen im `localStorage` mit Präfix `lab.`. Lesen/Schreiben über einen Wrapper, der JSON (de)serialisiert und alle Fehler schluckt (privater Modus, voller Speicher). Ein leerer String gilt als „nicht vorhanden“.
- Ausnahme: `lab.theme` ist ein roher String.
- Wipe und Sicherung arbeiten über **alle** `lab.*`-Schlüssel.
- **Soll für den Neubau:** ein zentrales Schema mit Versionsnummer (`lab.schema`), Migrationen beim Start, Datums-Helfer, die bei jedem Aufruf das aktuelle Datum liefern (nicht einmal beim Laden), und ein Speicher-Modul, das nur über definierte Funktionen geändert wird.

### 4.2 Schlüssel

| Schlüssel | Form | Standard | Schreibt | Liest | Hinweise |
|---|---|---|---|---|---|
| `lab.theme` | `"light"\|"dark"` (roh) | dark | Theme-Schalter | Kopf-Skript | vor dem Rendern gelesen |
| `lab.name` | string | Ist: `"Felix"`; **Soll:** `""` | Gruß-Bearbeitung, Onboarding, Profil | Gruß, Keimi, Karte, Avatar | leer → Anzeige „du“ |
| `lab.profile` | `{name, goal:""\|Ziel, age:number\|"", weight:number\|"", days:2..6}` \| null | null | Onboarding, Profil | Ziel (Wdh.-Bereich, Eyebrow), Wochenziel, Körpergewicht im Logger, Avatar | Existenz steuert Onboarding |
| `lab.buddy` | `{name, tone:"ruhig"\|"motiv"\|"frech", on:boolean}` | `{name:"Keimi",tone:"motiv",on:true}` | Onboarding, Profil | Keimi | wird mit Standard gemischt |
| `lab.buddyMeta` | `{max:1..4, last:Datum, backDay:Datum, backShown:boolean}` | `{}` | Keimi | Keimi | |
| `lab.foci` | `("train"\|"handy"\|"mama"\|"ideen")[]` | fehlt = alle | Fokus-Sheet | überall | nie leer gespeichert |
| `lab.focus` | `{day:Datum, text:string, done:boolean}` | `{day:"",text:"",done:false}` | Eine Sache heute | Heute | **Migration:** Array → nach `lab.foci` kopieren, dann zurücksetzen |
| `lab.motto` | string | „Weniger scrollen, mehr erleben.“ | Motto | Heute | |
| `lab.habit` | `{name:string, days:{[Datum]:true}, anchor?:string}` | `{name:"10 Min. lesen",days:{}}` | Gewohnheit, Anker | Heute, Keimi | |
| `lab.dump` | `string[]` | `[]` | Abladen, Gedanke im Training | Heute | **Soll:** Objekte `{id,t,created}` statt Strings |
| `lab.likes` | `string[]` (Ideen-IDs) | `["feed","gate"]` | Ideen | Ideen | |
| `lab.feed` | `[{t, s, tag, read:boolean}]` | 3 Beispiele | Feed | Feed, Heute | |
| `lab.queue` | `[{t, s}]` | `[]` | Feed | Feed | |
| `lab.feedDay` | Datum | null | Feed-Tageswechsel | Feed | |
| `lab.feedReadDay` | Datum | null | „Gelesen“ | Feed-Gutschrift | |
| `lab.people` | `[{name, last:Datum, ex?:true}]` | Tim, Lena, Oma (Beispiele) | Umlenken | Umlenken | |
| `lab.redirects` | `{[MontagDatum]: number}` | `{}` | „schreiben“ | Heute, Keimi | |
| `lab.igHist` | `{[Datum]: {tries, redirects, used, earned, why:string[]}}` | `{}` | Umlenken, Gutschriften | Zeitkonto, Keimi | nur die letzten 30 Tage |
| `lab.igUnlock` | `{until:ms}` \| null | null | Zeitkonto | Umlenken | |
| `lab.lockTrain` | boolean | true | Sperr-Schalter | Umlenken, Live | |
| `lab.gear` | `string[]` | `["Körpergewicht"]` | Onboarding, Geräte-Chips | Vorschläge, Kurzversion, Browser | |
| `lab.plans` | `[{id, name, ex?:true, items:[{e:ÜbungsID, s:1..10, r:string}]}]` | 3 Beispielpläne | Plan-Editor | Training, Live-Warteschlange | |
| `lab.sched` | `{["0".."6"]: PlanID \| "act:<typ>"}` | `{0:"ok",2:"uk",4:"gk"}` | Pick-Sheet, Onboarding, Tauschen, Plan löschen | Training, Ring, Keimi | eine Sache pro Wochentag |
| `lab.tlog` | `Entry[]` (4.3) | ggf. ein Beispiel-Eintrag | Live, Session, Player, Aktivität, Auto-Ende, Messwerte | fast alles | Beispiel wird gelöscht, sobald ein echter Eintrag existiert |
| `lab.live` | `Live` \| null (4.4) | null | Live | Live, Umlenken, Training | |
| `lab.hist` | `{[ÜbungsID]: [{date, w, r, rir?:0..3\|null, lv?:liveStart}]}` | `{}` | Satz speichern/bearbeiten/löschen | Vorbelegung, Vorschlag, PR, Verlauf, Tag-Details, „zuletzt“ | max. 500 pro Übung |
| `lab.prs` | `[{date, e, w, r, lv?}]` | `[]` | Satz speichern, Neuberechnung | Rückblick, Keimi, Karte | |
| `lab.favs` | `string[]` | `["latpull","chestpress","press"]` | Sterne | Live, Browser | |
| `lab.custom` | `[{id:"c…"\|"db…", n, m:string[], g, att?, db?:true}]` | `[]` | eigene Übung, DB-Import | LIB beim Start | |
| `lab.attach` | `{[ÜbungsID]: {a:Aufsatz, h:"hoch"\|"mittel"\|"tief"}}` | `{}` | Kabel-Optionen | Logger | |
| `lab.step` | `{[ÜbungsID]: 1\|1.25\|2.5\|5}` | `{}` | Gewichtsstufe | Stepper, Vorschlag | |
| `lab.repRange` | `{[ÜbungsID]: [lo, hi]}` | `{}` | Wdh.-Bereich | Vorbelegung, Vorschlag | |
| `lab.rirLast` | 0..3 | 2 | RIR-Wahl | Logger | |
| `lab.rest` | 60\|90\|120\|180 | 90 | Pausendauer | Pause | |
| `lab.timeOn` | boolean | false | Zeitschalter | Live, Karte, Toast | |
| `lab.view` | `"einfach"\|"profi"` | einfach | Ansichtsschalter | Training, Logger, PR | |
| `lab.metrics` | `[{name, unit, lo?:number, hi?:number}]` | `[]` | Messwert-Sheet | Abfragen, Verlauf | |
| `lab.lastCard` | Karten-Objekt (3.12.1) | null | Abschluss-Karte | Rückblick-Knopf | |
| `lab.mama` | `{mode:"preg"\|"post", date:Datum\|"", cs:boolean}` \| null | null | Mama-Setup, „Baby ist da“ | Mama, Kachel, Player | |
| `lab.mamaSeen` | Phasen-ID | null | Mama | „Neu für dich“ | |
| `lab.mamaSafetyOk` | boolean | false | „Gelesen, los geht's“ | Player-Start | |
| `lab.ppCheck6` | boolean | false | Abfrage pp1 | Phasenschranke | |
| `lab.ppCheck12` | boolean | false | Abfrage pp2 | Phasenschranke | |

### 4.3 Eintrag im Trainingslog (`Entry`)

```
{
  date: "YYYY-MM-DD",            // bei Live: Tag des letzten Satzes
  plan: PlanID | "live" | "act:<typ>" | "mama:<PlanID>",
  sets: { [Muskel]: number },    // gewichtete Sätze (Hauptmuskel 1, weitere 0,5); {} bei Aktivität/Heimplan
  ex?: true,                     // Beispiel-Eintrag
  live?: true,
  act?: true,                    // Aktivität oder Heimplan
  n?: number,                    // echte Satzanzahl (Live, Session)
  exs?: ÜbungsID[],              // Live
  name?: string,                 // Live: liveTitle; Session: Planname
  auto?: true,                   // automatisch beendet
  vals?: { [Messwertname]: { vor:string|null, nach:string|null, tv:"hh:mm"|null, tn:"hh:mm"|null } },
  dur?: number, km?: number, rpe?: 1..10   // Aktivität
}
```

Beispiel-Eintrag beim allerersten Start (nur, wenn der Montag dieser Woche vor heute liegt): `{date: Montag, plan:"ok", sets: gewichtete Sätze des Oberkörper-Plans, ex:true}`. **Soll:** Beispiel-Einträge zählen nirgends mit (auch nicht in Muskelkarte und Keimi-Wachstum) und werden sichtbar als Beispiel markiert.

### 4.4 Laufendes Live-Training (`Live`)

```
{
  start: ms,
  sets: [{ e, w, r, t:ms, rir?:0..3|null, a?:Aufsatz, h?:Höhe }],
  form?: "low"|"ok"|"high",
  hr?: number[],                 // alle 5 s, max. 2000
  queue?: { plan, name, items:[{e,s,r}], i },
  vals?: { [Messwert]: {vor, nach, tv, tn} },
  legOk?: 1,                     // Beinhinweis bestätigt
  _budEnd?: 1                    // Keimi-„lend“ schon gesagt
}
```

Migration beim Start: Läuft ein Live-Training aus einer älteren Version, werden die letzten Verlaufseinträge je Übung (so viele wie Sätze im Training) mit `lv = live.start` markiert.

### 4.5 Zustände im Speicher (nicht persistiert)

| Name | Inhalt |
|---|---|
| `curTab` | aktuelle Ansicht |
| Live-UI | `liveSide` ("front"/"back"), `liveMuscle`, `liveEx`, `lw` (Gewicht), `lr` (Wdh.), `rirSel`, Uhr- und Pausen-Intervalle |
| `sess` | Plan-Session `{plan:{id,name,items}, done:number[]}` und Startzeit; `hit` für Animationen |
| `edit` | Kopie des Plans im Editor (`isNew`), `mfilter` |
| `pl` | Player `{plan, steps:[{block, it, set, kind:"work"\|"rest", fixed?, sets?, nextLabel?}], i, left, run, short}`, Intervall, AudioContext, Wake-Lock |
| `xb` | offener Übungsbrowser `{el, ctx, added, close, paint}` und Filterzustand `{q, g, mus, quick, shown}` |
| Puls | Gerät, aktueller Wert, Zeit der letzten Speicherung |
| Keimi | letzte Zurufzeit, Tap-Zähler, PR-Zähler vor dem Speichern, Zeitpunkt des letzten Trainingsendes |
| Sheets | Warteschlange, Sperrfrist, Zähler laufender Kartenerzeugung |
| Umlenken | Personenindex `pick`, Atem-Timer |
| Muskelkarte | Animationsdaten nach Session |
| Demos | Chunk-Cache, laufende Requests, Ergebniscache je Übung, Lazy-Observer |
| Gesten | Halte-Timer, Hover-Element |
| Fokus | „in dieser Sitzung schon gefragt“ |

---

## 5. Rechenregeln

### 5.1 Datum und Woche

- `dkey(d)` = lokales `YYYY-MM-DD`.
- `todayIdx = (getDay() + 6) mod 7` (Mo 0 … So 6).
- `monday()` = heute 00:00 minus `todayIdx` Tage. `weekDates()` = 7 Schlüssel ab Montag. Vorwoche analog ab Montag − 7.
- `weekKey` = `dkey(monday())` (Schlüssel für `lab.redirects`).
- „seit“ (Menschen): `round((heute − last) / 1 Tag)`, mindestens 0.
- **Soll:** Alle Werte bei jeder Verwendung neu berechnen. Wechselt das Datum, während die App offen ist (Sichtbarkeitswechsel oder Minutentakt), Heute neu rendern (Ist: einmal beim Laden berechnet, siehe 7).

### 5.2 Gewichtete Sätze

- Pro Satz: Hauptmuskel (erster in `m`) +1, jeder weitere Muskel +0,5.
- Plan (Soll oder abgehakt): `Σ Sätze × (1 bzw. 0,5)`.
- Live: über alle Sätze (Filter „RIR ≤ 4“ ist wirkungslos und entfällt).
- `weekSets()` = Summe der `sets` aller Einträge dieser Woche (**Soll:** ohne Beispiele).

### 5.3 e1RM

- Für Bestleistung und „Bestleistung:“-Zeile (Epley ohne RIR): `e1rm(w, r) = w > 0 ? w · (1 + r/30) : r`.
- Für Verlauf, Diagramm und Sparkline (mit RIR): `e1(w, r, rir) = w > 0 ? w · (1 + (r + rir)/30) : r + rir` (`rir` null → 0).
- Sparkline: pro Datum der Höchstwert, die letzten 10 Daten, ab 2 Punkten; angezeigter Wert = letzter Punkt auf 0,5 kg gerundet.

### 5.4 Bestleistung (PR)

- Beim Speichern: Gibt es für die Übung **schon** Verlaufseinträge, ist der Satz eine Bestleistung, wenn `e1rm(w, r) > max(e1rm aller Verlaufseinträge) + 0,01`. Der erste Satz einer Übung ist nie eine Bestleistung.
- RIR: In Einfach wird RIR ignoriert. In Profi zählt ein Satz mit RIR > 3 nicht (praktisch nie, da max. „3+“). **Soll:** Regel beibehalten, aber „3+“ als `3` speichern und die Bedingung explizit dokumentieren.
- **Neuberechnung** (nach Bearbeiten/Löschen): Verlauf der Übung = alle Einträge anderer Trainings + Sätze dieses Trainings in Reihenfolge. PR-Einträge dieser Übung aus diesem Training (gleiches `lv` oder ohne `lv` an einem Tag dieses Trainings) löschen. Dann sequentiell: Lauf-Liste = Einträge anderer Trainings; für jeden Satz dieses Trainings: wenn Lauf-Liste nicht leer und RIR null oder ≤ 3 und `e1rm > max(Lauf-Liste) + 0,01` → PR; Satz an die Lauf-Liste anhängen.

### 5.5 Echte Sätze (`realSets`)

`l.n` falls vorhanden; sonst Aktivität/Heimplan → 0; sonst `round(Σ sets)` (Altdaten). Wochen- und Vorwochen-Summen ohne Beispiel-Einträge.

### 5.6 Vorschlag (doppelte Progression)

Eingaben: letzte frühere Sitzung `ls` (alle Verlaufseinträge des letzten Datums vor heute), `[lo, hi]` = Wdh.-Bereich der Übung, `st` = Gewichtsstufe.

```
w     = max(ls.w)
atW   = Sätze in ls mit Gewicht w
maxR  = max(atW.r)
allTop = |atW| ≥ min(2, |ls|)  UND  jeder Satz in atW: r ≥ hi UND (rir == null ODER rir ≥ 1)
```

| Fall | Text | Übernehmen |
|---|---|---|
| Körpergewicht und w = 0, allTop | „Letztes Mal alle Sätze mit {hi} oder mehr Wdh. Heute mit Zusatzgewicht oder einer schwereren Variante.“ | – |
| Körpergewicht und w = 0, sonst | „Ziel heute: +1 Wiederholung (Bereich {lo}–{hi}).“ | r = min(hi, maxR+1) |
| allTop, w > 0, `st/w > 0,12`, maxR ≥ hi+3 | „Schon {maxR} Wdh. mit {w kg}. Zeit für die nächste Stufe: +{st} kg, dafür wieder ab {lo} Wdh.“ | w+st, r = lo |
| allTop, w > 0, `st/w > 0,12`, sonst | „Oben angekommen ({hi} Wdh.). +{st} kg wären {round(st/w·100)} % mehr. Lieber erst +1 Wdh. mit {w kg}, oder eine kleinere Stufe wählen, falls dein Gerät eine hat.“ | w, r = maxR+1 |
| allTop, sonst | „Oben angekommen ({hi} Wdh.). Heute +{st} kg, dafür ab {lo} Wdh.“ | round2(w+st), r = lo |
| nicht allTop, w > 0, maxR < lo−1, w−st > 0 | „Unter deinem Bereich ({lo}–{hi} Wdh.). Heute etwas leichter.“ | round2(w−st), r = lo |
| sonst | „Gleiches Gewicht, Ziel: +1 Wdh. (Bereich {lo}–{hi}).“ | w, r = min(hi, maxR+1) |

### 5.7 Instagram-Konto

- `balance = max(0, 15 + earned − used)` für heute.
- `unlockLeft = max(0, ceil((until − jetzt) / 60 000))`.
- Freigabe beenden: `used = max(0, used − floor((until − jetzt)/60 000))`.
- Auswahl: `[5,10,15]` gefiltert auf `≤ balance`, leer → `[balance]`.
- 7-Tage-Säulen: `max = max(3, größte Versuchszahl)`, Höhe Versuche `tries/max`, Höhe Umlenkungen `min(redirects, tries)/max`.

### 5.8 Keimi-Wachstum

Siehe 3.4.2. `aktiveTage` über 28 Tage; Schwellen 4 / 10 / 16; `stufe = max(berechnet, maxErreicht − 1)`. Idle = kein aktiver Tag in den letzten 4 Tagen bei vorhandener Historie. „Zurück“ = Abstand zum letzten Heute-Besuch ≥ 3 Tage.

### 5.9 Schwangerschaft

- SSW: `ga = 280 + (heute − ET)`, `SSW = floor(ga/7) + (ga mod 7)`. Phase t1 ≤ 13, t2 ≤ 27, sonst t3. Überfällig-Frage ab `w ≥ 40`.
- Nach der Geburt: `w = floor((heute − Geburt)/7)`, pp0 < 6, pp1 < 12, pp2 sonst; Schranken über `ppCheck6`/`ppCheck12`.
- Wochentipp: `notes[w mod notes.length]`.
- Kurzversion Minuten: `max(5, round(minutes · 0,45))`.
- Seitenwechsel bei `left == floor(Dauer/2)`.

### 5.10 Kürzel, Dauer, Titel

- **Plan-Kürzel** `abbr(name)`: getrimmt; leer → „–“; Länge ≤ 4 → unverändert; endet das erste Wort (länger als die Endung) auf „körper“, „rücken“, „beine“, „arme“, „brust“, „schulter“ oder „tag“ → erster Buchstabe + erster Buchstabe der Endung, groß (Oberkörper → „OK“, Ganzkörper → „GK“, Unterkörper → „UK“); mehrere Wörter → Anfangsbuchstaben der ersten zwei, groß; sonst die ersten 3 Zeichen. **Soll:** im Wochenstreifen ausgeschriebene Kurzwörter bevorzugen, wenn Platz ist (Personas verstanden „OK/UK“ nicht).
- **Plan-Dauer** `planMins = max(10, round(Σ Sätze · 2,5 / 5) · 5)`.
- **Live-Titel** `liveTitle`: mit Warteschlange deren Planname. Sonst Sätze pro Hauptmuskel zählen, Muskeln mit ≥ 34 % des Maximums (höchstens 3); Beine vorn + Beine hinten → „Beine“; die ersten zwei mit „ & “ verbinden; ohne Sätze „Live-Training“.

### 5.11 Ring, Rückblick, Ziel

- Wochenziel `weekGoal = profile.days > 0 ? profile.days : (Anzahl Wochenplan-Tage || 3)`.
- Ring und Rückblick: Zähler = Anzahl Einträge dieser Woche ohne Beispiele. Gleiche Zahl auf Heute und in Training.
- Vergleich siehe 3.5.9.

### 5.12 Volumen-Ampel

`v = round(gewichtete Sätze · 2)/2`; `> 20` hi, `≥ 10` ok, `≥ 6` mid, sonst lo; Balkenbreite `min(100, v/24 · 100) %`.

### 5.13 Muskelkarte

`≥ 9` l3, `≥ 5` l2, `≥ 1` l1, sonst eingeplant → plan.

### 5.14 Abschluss-Karte

Füllung pro Muskel `0,35 + 0,65 · v / max(v)`; Volumen `Σ w·r`; Wdh. `Σ r`; Minuten `max(1, round((jetzt − start)/60 000))`.

### 5.15 Zahlenformat

- `fmtKg(w)` = Zahl mit bis zu 2 Nachkommastellen, deutsches Format, „ kg“ (42,5 kg).
- `fmtN(v, d)` = gerundet auf `d` Stellen (Standard 1), deutsches Format.
- Eingaben akzeptieren Komma oder Punkt, Leerzeichen werden entfernt, nur Zahlen gültig.
- Singular/Plural immer korrekt: Satz/Sätze, Übung/Übungen, Minute/Minuten, Einheit/Einheiten, Woche/Wochen, Person/Personen, Favorit/Favoriten, Training/Trainings, Aktivität/Aktivitäten, Bestleistung/Bestleistungen, „Sache wartet/Sachen warten“.

---

## 6. Texte

### 6.1 Tonregeln

1. Du-Form, kurze Hauptsätze, keine Ausrufezeichen-Kaskaden (Ausnahme: Keimi-Töne „Motivierend“ und „Frech“).
2. Kein Druck, keine Schuld: nie „verpasst“, „versagt“, „Streak verloren“. Pausen und Ruhetage werden positiv benannt („Erholung gehört dazu.“).
3. Ehrlich bei Zahlen und Medizin: Evidenz einordnen („Evidenz schwach“), Verantwortung bei Behandlungsteam und Hebamme lassen, keine medizinische Bewertung behaupten.
4. Freiwilligkeit betonen („optional“, „Kannst du leer lassen“, „Alles optional.“).
5. Keine Fachkürzel ohne Erklärung: RIR immer mit „Wie viele hättest du noch geschafft?“, e1RM mit „Geschätztes Maximum“.
6. Typografie: deutsche Anführungszeichen „…“, Gedankenstrich –, echtes Minus − in Prozentangaben, × für „mal“, Dezimalkomma.
7. Bestätigungen nur bei Zerstörendem, als zweiter Tipp innerhalb von 3–4 s („Wirklich …? Nochmal tippen“).

### 6.2 Wichtige Texte je Bereich

**Heute**
- „Moin, {Name}“ · Motto „Weniger scrollen, mehr erleben.“ · „Eine Sache heute“ / „Was soll heute passieren?“ · „Gewohnheit“ · „Training heute“ · „Feed“ / „warten heute“ · „Umgelenkt“ / „mal diese Woche“ · „Kurz abladen“ / „Gedanke, der stört“ / „Ab“ / „erledigt ✓“.
- Ring: „Woche geschafft. Stark.“ · „Noch {n} Einheiten bis zu deinem Ziel.“ · „Die Woche gehört dir.“
- Gewohnheit: „Comeback. Genau so geht's.“ · „Kleiner Neustart: Heute reicht auch eine Mini-Version.“ · „Gestern war Pause. Heute zählt wieder.“ · „{n} von 7 Tagen diese Woche. Ausrutscher sind okay.“ · „Tipp auf heute, wenn du es gemacht hast.“

**Training**
- „Deine Woche“ · „Wochenplan“ / „Tag antippen“ · „Muskelkarte“ · „Deine Pläne“ / „Neuer Plan“ · „Deine Geräte“ · „Eigene Messwerte“.
- Heute-Kachel: „Heute erledigt“ / „Stark gemacht.“ · „Ruhetag.“ / „Erholung gehört dazu. Lust hast du trotzdem?“ · „Training starten“ · „Training fortsetzen“ · „Wenig Zeit oder Energie? Kurzversion, ca. 15 Min.“ · „Lieber ohne Gewichte abhaken“ · „+ Aktivität eintragen“ · „Lust auf 10 Minuten ohne Geräte?“ · „Kein Krafttraining geplant. Trag es ein, wenn du fertig bist.“
- Toasts: „„{Name}“ gespeichert“ · „Plan gelöscht“ · „{Übung} hinzugefügt“ · „Der Plan hat noch keine Übungen.“ · „Kurzversion: zählt voll.“ · „Gespeichert: {n} Sätze“ · „Hak mindestens einen Satz ab.“

**Live**
- „Wo bist du gerade?“ · „Muskel antippen“ · „Vorne“ / „Hinten“ · „Deine Favoriten · {Muskel}“ · „Gängige Geräte und Übungen“ · „Eigenes Gerät hinzufügen“ · „Letztes Mal: …“ · „Bestleistung: …“ · „Satz speichern“ · „Heute geschafft“ · „Training beenden“ / „Ohne Satz beenden?“.
- Toasts: „Satz {k} gespeichert · {w} × {r}“ + „Rückgängig“ · „Satz geändert.“ · „Satz gelöscht.“ · „Satz ist wieder da.“ · „Stark. {n} Sätze.“ · „Zeit läuft mit. Pause startet nach jedem Satz.“ · „Ohne Zeit. Nur du und deine Sätze.“ · „Abgelegt. Weiter geht's.“

**Umlenken**
- „Kurz innehalten, bevor du scrollst.“ · „Einen Moment“ / „Einatmen“ / „Ausatmen“ · „{Name} schreiben“ · „Jemand anderes“ · „Zeit aus dem Konto nehmen ({n} Min.)“ · „Konto leer: lieber kurz rausgehen?“ · „Dein Konto ist für heute leer.“ · „{m} Minuten. Viel Spaß.“ · „Freigabe läuft noch {n} Min.“ · „Du bist gerade beim Training.“ · „Kontakt gehabt“.

**Feed**
- „Drei Dinge, dann ist Schluss.“ · „Gelesen“ · „Auf morgen“ · „Du bist durch.“ / „Kein Weiterscrollen. Morgen gibt es wieder drei Dinge.“ · „Für morgen speichern“.

**Schwangerschaft**
- „Training für dich und dein Baby“ · „Deine Situation“ · „Schwanger“ / „Nach der Geburt“ · „Errechneter Geburtstermin“ / „Geburtsdatum“ · „Kaiserschnitt“ · „Bitte zuerst lesen“ / „Sicherheit & Warnzeichen“ · „Sofort aufhören und abklären bei“ · „Deine Pläne jetzt“ · „Jetzt“ · „Diese Woche“ · „Neu für dich“ · „Bereit für den nächsten Schritt?“ · „Ist dein Baby schon da?“ · „Bevor du startest“ / „Gelesen, los geht's“ · „Vor dem Belastungstest“ · „Wie viel Zeit hast du heute?“ · „! Warnzeichen“ · „Seite wechseln“ · „Geschafft: {Plan}“.

### 6.3 Keimi-Sätze nach Kontext und Ton (vollständig übernehmen)

| Kontext | Ruhig | Motivierend | Frech |
|---|---|---|---|
| morning | „Guten Morgen{, n}. Ganz in Ruhe ankommen.“ · „Neuer Tag. Eine Sache reicht schon.“ | „Guten Morgen{, n}! Heute wird gut.“ · „Aufgewacht! Ich hab schon Sonne getankt.“ | „Moin{, n}! Augen auf, Kaffee rein, los.“ · „Morgen! Ich bin schon wach. Ich bin ne Pflanze, ich muss.“ |
| day | „Schön, dass du kurz reinschaust.“ · „Ein Schluck Wasser wär jetzt nicht verkehrt.“ | „Na, wie läuft's? Du machst das gut.“ · „Kleine Schritte zählen. Jeder einzelne.“ | „Na? Ich hab Durst. Du bestimmt auch.“ · „Ey, schön dich zu sehen.“ |
| evening | „Schöner Abend{, n}. Was war heute gut?“ · „Langsam runterfahren. Du hast genug getan.“ | „Guten Abend{, n}! Schön, dass du da bist.“ · „Der Tag war deiner. Gönn dir was.“ | „Abend{, n}! Füße hoch, du Legende.“ · „Feierabend? Feierabend.“ |
| night | „Es ist spät. Ich mach schon mal die Blätter zu.“ · „Schlaf gut. Morgen wachsen wir weiter.“ | „Gähn. Schlaf ist auch Training, ehrlich.“ · „Ab ins Bett, morgen sind wir wieder fit.“ | „Psst. Handy weg, ab ins Bett. Ich schlaf schon.“ · „Zzz. Sag morgen Bescheid, wenn's was gibt.“ |
| trainToday | „Heute steht Training an. Wann es passt, entscheidest du.“ · „Training heute. Auch eine kurze Runde zählt.“ | „Heute ist Trainingstag! Ich freu mich schon.“ · „Training steht an. Wir zwei schaffen das.“ | „Heute ist Training! Ich mach schon mal Dehnübungen. Mit meinem Blatt.“ · „Trainingstag! Hantel wartet, ich auch.“ |
| trainDone | „Training erledigt. Ich bin ein Stück gewachsen.“ · „Das war gut heute. Jetzt darfst du ausruhen.“ | „Training geschafft! Ich bin richtig gewachsen.“ · „Stark heute! Ich zeig dir gleich meine neuen Blätter.“ | „Training erledigt?! Guck mal, wie ich wachse!“ · „Läuft bei dir. Und bei mir, ich hab ein neues Blatt.“ |
| rest | „Ruhetag. Muskeln wachsen in der Pause.“ · „Heute nichts geplant. Genieß es.“ | „Ruhetag! Erholung macht dich stärker.“ · „Heute nur chillen. Auch das ist Fortschritt.“ | „Ruhetag! Sofa-Training: Fernbedienung heben.“ · „Heute frei. Chillen ist auch ne Sportart.“ |
| back | „Schön, dass du da bist.“ · „Da bist du ja. Ich hab mich gefreut.“ | „Schön, dass du da bist! Ich hab dich vermisst.“ · „Da bist du ja! Wir machen einfach weiter.“ | „Ha! Da bist du ja wieder. Schön!“ · „Ey, du bist da! Ich wusste es.“ |
| sleepy | „Ich hab ein bisschen gedöst. Eine kleine Runde, wenn dir danach ist?“ | „Ich hab ein bisschen geschlafen. Lust, mich mit einer kleinen Runde zu wecken?“ | „Ich hab gepennt. Weck mich mit einer kleinen Runde, wenn du Lust hast.“ |
| pr | „Neue Bestleistung heute. Ganz still stolz auf dich.“ | „Neue Bestleistung heute! Ich hüpf vor Freude.“ | „Neue Bestleistung?! Wer bist du und was hast du mit {n} gemacht?“ |
| redirect | „Diese Woche {r}× umgelenkt. Das ist echte Pflege.“ | „{r}× umgelenkt diese Woche. Richtig stark!“ | „{r}× umgelenkt! Instagram heult, ich feier dich.“ |
| tap | „Hallo. Ich bin {b}.“ · „Ich wachse mit, wenn du dranbleibst. Ganz ohne Druck.“ · „Einmal tief durchatmen. Schon besser.“ · „Pausen gehören dazu. Wirklich.“ | „Hi, ich bin {b}!“ · „Wir wachsen zusammen. Schritt für Schritt.“ · „Du bist besser drauf, als du denkst.“ · „Tipp mich ruhig öfter an. Ich mag das.“ | „Hey! Nicht kitzeln. Okay, doch.“ · „Ich bin {b}. Klein, grün, motiviert.“ · „Noch einmal tippen und ich wachse. War gelogen. Aber fast.“ · „Du bist echt nice, weißt du das?“ |
| lstart | „Schön, dass du trainierst. Ich bin dabei.“ | „Los geht's! Ich feuer dich an.“ | „Los, los! Ich schrei dich an. Liebevoll.“ |
| lset3 | „Einen noch, ganz ruhig. Du packst das.“ · „Dritter Satz. Technik vor Gewicht.“ | „Einen noch! Du packst das.“ · „Dritter Satz! Volle Konzentration.“ | „Ey, einen Satz noch, pushen, pushen!“ · „Dritter Satz! Zeig dem Gewicht, wer hier Chef ist.“ |
| lpr | „Sauber. Neue Bestleistung.“ | „Sauber! Neue Bestleistung!“ | „Uiii, neue Bestleistung! Krass.“ |
| lend | „Du bist schon lange dabei. Hör auf deinen Körper.“ | „Fast geschafft. Gleich darfst du stolz sein.“ | „Gleich fertig! Danach gibt's Snacks. Für dich, nicht für mich.“ |
| lrest | „Kurz durchatmen, dann weiter.“ | „Pause vorbei. Kurz durchatmen, dann weiter!“ | „Pause rum! Hoch mit dir.“ |
| finish | „Gut gemacht. Ich bin stolz auf dich.“ · „Fertig. Jetzt in Ruhe erholen.“ | „Stark gemacht! Ich bin stolz auf dich.“ · „Geschafft! Ich bin ein Stück gewachsen.“ | „Boom! Stark gemacht. Ich bin so stolz.“ · „Fertig! Du Maschine.“ |
| gate | „Schön, dass du schreibst. Das bleibt länger als ein Reel.“ | „Gute Wahl! Ein Mensch statt ein Feed.“ | „Ey, Mensch schreiben statt scrollen. Respekt.“ |

Fehlt ein Kontext im Ton, wird `tap` genutzt. Satz zufällig aus dem Pool.

---
## 7. Bekannte Schwächen & offene Punkte

### 7.1 Architektur (Ist)

1. **Wrapper-Ketten statt klarer Module.** Zentrale Funktionen werden mehrfach umhüllt: `renderTraining` 11×, `renderLogger` 6×, `show` 5×, `gate` 4×, `startRest` 5×, der Klick auf „Training beenden“ 6×, „Satz speichern“ wird nach jedem Rendern neu eingewickelt. Reihenfolge-Abhängigkeiten sind kaum nachvollziehbar. **Neubau:** ein Zustandsspeicher, Ereignisse (`setSaved`, `trainingFinished`, `activityLogged` …) mit Abonnenten (Zeitkonto, Keimi, Karte, Messwerte), eine Render-Funktion pro Komponente.
2. **Datum einmal beim Laden berechnet** (`todayKey`, `weekKey`). Bleibt die PWA über Mitternacht offen, landen Einträge, Gewohnheit, „Eine Sache heute“ und Zeitkonto auf dem Vortag.
3. **Komplettes Neu-Rendern** der Trainingsansicht bei jeder Kleinigkeit (DOM per `innerHTML`), Elemente werden per `after()`/`before()` nachträglich eingeschoben. Die DOM-Reihenfolge hängt davon ab, welcher Wrapper zuerst lief.
4. **Lesefunktionen mit Nebenwirkung**: `igDay()` schreibt bei jedem Lesen in den Speicher; `budStage()` schreibt `buddyMeta`.
5. **Toter Code**: DB-Suche im Live-Panel und Plan-Editor (`dbBlock`/`fillDb`) ist per `return` abgeschaltet; alte `logAct`, `buildSteps`, erster `isPR`-Filter, `goalReps` (praktisch überdeckt), Gate-Schritt „open“ der Basisversion („10 Minuten Ruhe“), statisches Session-Konfetti-Keyframe `ready`.
6. Kein `<meta viewport>` in `src/app.html` (nur im Build). Als Artifact hängt die mobile Darstellung vom Host ab.

### 7.2 Fehler und Ungereimtheiten im heutigen Verhalten

| # | Problem | Soll |
|---|---|---|
| F1 | Standardname „Felix“ und Seitentitel „Felix' Ideen-Labor“ fest im Code | leer bzw. „Nachtgarten“ |
| F2 | Namensänderung über den Gruß aktualisiert `lab.profile.name` nicht; Avatar und Profil zeigen den alten Namen | beide Schlüssel synchron |
| F3 | Beispiel-Eintrag zählt in Muskelkarte (`weekSets`), Muskel-Toast und Keimi-Wachstum; Wochenstreifen zeigt am Beispiel-Montag ein neutrales „OK“ | Beispiele nirgends zählen, klar als Beispiel kennzeichnen |
| F4 | Neue Übung ohne Verlauf startet bei 20 kg (Kabel, Maschine, Kurzhantel) | sinnvolle Startwerte je Gerät oder leeres Feld mit Ziffernblock |
| F5 | Tagesform „müde/fit“ rechnet fest mit 2,5 kg statt der Gewichtsstufe der Übung | Stufe der Übung verwenden |
| F6 | Keimi `lrest` feuert fest nach 90 s; bei 60/120/180 s nie | an Pausenende koppeln |
| F7 | Pausendauer-Auswahl ist in Einfach ausgeblendet, obwohl Zeit an sein kann | sichtbar, wenn Zeit an |
| F8 | Kurzversion setzt keine Session-Startzeit → falsche Minuten auf der Karte (bei Zeit an) | Startzeit immer setzen |
| F9 | Heute-Kachel „Feed“ zählt vor dem Tageswechsel des Feeds (veraltet) | Tageswechsel vor jeder Anzeige |
| F10 | Leerer Feed zeigt „Du bist durch.“ und „Demo zurücksetzen“ dauerhaft | eigener Leerzustand, Demo-Knopf nur bei Beispielen |
| F11 | Kachel „Training heute“ führt nach Fokuswechsel weiter zur Mama-Ansicht, bis neu geladen wird | Ziel bei jedem Rendern bestimmen |
| F12 | Tab-Indikator bewegt sich bei Mama/Player nicht auf „Training“ | Indikator nachziehen |
| F13 | „← Beenden“ im Player führt immer zur Mama-Ansicht, auch beim Einsteigerplan | zum Ausgangsort |
| F14 | Einsteigerplan b2 ist nicht erreichbar | anbieten |
| F15 | „Kurz abladen“ entfernt alle Einträge mit gleichem Text | per ID |
| F16 | Personen und Messwert-Chips: Entfernen ohne Rückgängig (Personen) | Rückgängig-Toast |
| F17 | Erklärtext im Umlenken nennt noch „Trotzdem Instagram … 10 Minuten Ruhe“ | an Zeitkonto anpassen |
| F18 | Datenschutztext nennt Google Fonts auch im Standalone-Build mit lokalen Fonts | je Fassung |
| F19 | Ohne Fokus „handy“: leere Zweierreihe auf Heute, Sperr-Hinweis im Live und Sperre bleiben aktiv | ausblenden, Sperre aus |
| F20 | Ohne Fokus „train“: Mama-Kachel rutscht per `order:-1` über die Überschrift; „Übungen nachschlagen“ bleibt sichtbar; Heute-Ring bleibt trainingslastig | sauberer Aufbau je Fokus |
| F21 | Freigabe beenden schreibt die Restminuten auf den **heutigen** Tag, auch wenn die Freigabe gestern begann | auf den Tag der Freigabe |
| F22 | +5 Min. für „{Name} schreiben“ ohne tatsächliches Schreiben (leicht auszutricksen; Persona D) | erst nach „Text kopieren“ oder mit Rückfrage „Geschrieben?“ |
| F23 | RIR-Filter (`≤ 3`, `≤ 4`) sind wirkungslos, da „3+“ als 3 gespeichert wird | bewusst entscheiden und dokumentieren |
| F24 | Plan-Sessions schreiben keinen Übungsverlauf → keine Vorschläge, keine Bestleistungen | optional Soll-Wdh. ohne Gewicht protokollieren |
| F25 | Puls wird nur auf der Karte gezeigt, nicht im Log-Eintrag gespeichert | `hr:{avg,max}` im Eintrag |
| F26 | Scheibenrechner verschweigt Reste (z. B. 21 kg zeigt nichts) | Rest anzeigen |
| F27 | Sicherheits-Kachel ist zu, sobald `lab.mama` existiert, auch ohne Datum | nur mit Zustand zuklappen |
| F28 | „Noch nicht“ bei „Ist dein Baby schon da?“ erscheint bei jedem Rendern erneut | pro Tag merken |
| F29 | Onboarding ändert Geräte im Speicher sofort, auch wenn im Bearbeiten-Modus „Schließen“ gewählt wird | erst beim Abschluss übernehmen |
| F30 | Fokus-Frage erscheint erst beim ersten Tab-Wechsel, nicht als Teil des Onboardings | als Onboarding-Schritt (Persona D: „erster Eindruck Fitness-App“) |

### 7.3 Offene Punkte aus den Testpersonen-Berichten (noch zutreffend)

- **Felix (Studio):** Deload-Erkennung fehlt; Vorschlag bleibt oft „+1 Wdh.“; Wochenstreifen-Kürzel „OK/UK“ unverständlich; nur eine Sache pro Wochentag planbar (Lauf morgens, Kraft abends).
- **Jonas (Läufer, Typ-1-Diabetes):** Pace wird nicht berechnet; kein Import (GPX/CSV/Health); keine Hypo-Notiz während des Trainings; kein Export der Messwerte für das Diabetes-Team (nur Gesamtsicherung); keine km-Wochensumme im Verlauf, nur im Rückblick; Laufen zählt nicht für die Muskelkarte.
- **Lena (Schwangerschaft):** Warnzeichen ohne „plötzliche Schwellungen an Gesicht oder Händen“ (Präeklampsie); „2–3 Runden nach Tagesform“ lässt sich im Timer nicht wählen (immer 3 bzw. Kurz = 1); keine 5-Minuten-Version „nur Beckenboden“; „15× … je Seite“ bei Wdh.-Übungen nicht eindeutig; Kaiserschnitt ändert die Pläne nicht, nur Hinweise.
- **Mo (weniger Handy):** Onboarding fragt nur Training ab; Feed hat nach Tag 1 keine neuen Inhalte; Kurzversion ist eine Abhakliste ohne Anleitung (Plan-Session ohne Vorschaubilder); keine Rückmeldung im Vergleich („6× umgelenkt statt gescrollt, letzte Woche 4×“).

### 7.4 Bereits gelöst (nicht zurückbauen)

Satz bearbeiten/löschen mit Rückgängig, Zifferneingabe, Gewichtsstufe pro Übung, Live aus Plan, Auto-Ende nach 3 h, ehrliche Wochenzahlen mit Wochenziel, Tag-Details und Übungsverlauf, Verlauf bis 500, Messwerte vorher/nachher mit Uhrzeit und Bereich, keine gestapelten Sheets, Aktivitäts-Details und Gutschrift, Beinhinweis live, Fokus-Modi, Mama-Schranken und Belastungstest-Check, echte Zirkel, Seitenwechsel-Signal, Player-Schutz, „Baby da?“, Datum leeren beim Moduswechsel, „1 Woche“, Geräte-Vorauswahl nur Körpergewicht, Feed-Tageswechsel, Konto-Status „Pause“, „Kontakt gehabt“, Sicherung, Toast oben bei offenem Sheet.

---

## 8. Akzeptanzkriterien

Jeder Punkt ist im Browser (Handyformat 400×860) mit vorgespulter Uhr prüfbar.

**Start, Onboarding, Profil**
1. Ohne `lab.profile` erscheint das Onboarding mit 6 Schritten und Fortschrittspunkten.
2. Alle Schritte lassen sich mit „Überspringen“ ohne Eingabe durchlaufen; danach ist der Gruß „Moin, du“ und der Toast „Willkommen.“
3. Mit Name „Mo“ lautet der Toast „Willkommen, Mo.“ und Keimi sagt „Schön, dass du da bist, Mo. Wir wachsen zusammen.“ (Ton motiv).
4. In den Geräten ist beim Erststart nur „Körpergewicht“ gewählt.
5. Rhythmus 4 erzeugt den Wochenplan Mo, Di, Do, Fr mit den Plänen reihum.
6. Im Bearbeiten-Modus („Alles neu einrichten“) wird der Wochenplan nicht verändert.
7. Ton-Auswahl im Schritt 1 zeigt in der Sprechblase einen Beispielsatz des Tons.
8. Begleiter aus im Onboarding → auf Heute keine Keimi-Zeile, im Live keine Zurufe.
9. Profil-Sheet: Namensänderung aktualisiert Gruß, Avatar-Initiale und `lab.profile.name`.
10. Avatar ohne Namen und mit Begleiter an zeigt Keimi.

**Fokus**
11. Erster Ansichtswechsel nach dem Onboarding öffnet „Was ist dir wichtig?“ mit Training und Weniger Handy vorausgewählt.
12. Leere Auswahl wird als nur „Training“ gespeichert.
13. Ohne „handy“ sind die Tabs Feed und Umlenken sowie die Kacheln Feed/Umgelenkt ausgeblendet; Gutschriften kommen ohne Toast.
14. Ohne „ideen“ ist der Tab Ideen weg; war man darin, landet man auf Heute.
15. Nur „mama“: Training zeigt die Mama-Kachel, keine Studio-Elemente; Kachel „Training heute“ zeigt den ersten Plan der Phase und führt zur Mama-Ansicht.
16. Ein altes `lab.focus` als Array wird nach `lab.foci` übernommen.

**Heute**
17. Datum im Kopf auf Deutsch („Montag, 19. Oktober“).
18. Motto leer speichern → „Ein Satz für dich.“
19. „Eine Sache heute“ ist am nächsten Tag leer.
20. Gewohnheit: zukünftige Tage sind nicht antippbar.
21. Gewohnheit heute erledigt, gestern nicht → „Comeback. Genau so geht's.“
22. Drei Tage nicht erledigt (bei vorhandener Historie) → „Kleiner Neustart: Heute reicht auch eine Mini-Version.“
23. Anker „vor dem Schlafengehen“ mit Gewohnheit „Beckenboden 5 Min.“ ergibt „Vor dem Schlafengehen: Beckenboden 5 Min“ ohne doppelten Punkt.
24. Abladen zeigt höchstens 4 Einträge, neueste oben; Antippen entfernt genau einen.
25. Ring: Wochenziel 4, drei Einträge → „3/4“ und „Noch 1 Einheit bis zu deinem Ziel.“
26. Ring und Wochenrückblick zeigen dieselbe Zahl und denselben Nenner.
27. Eine Aktivität zählt im Ring mit.
28. „Alle meine Daten löschen“ braucht zwei Tipps innerhalb von 4 s und entfernt alle `lab.*`-Schlüssel.
29. Wechsel über Mitternacht bei offener App: nach Sichtbarkeitswechsel zeigt Heute den neuen Tag.

**Keimi**
30. 4 aktive Tage in 28 Tagen → Stufe „Zwei Blätter“; 10 → „Knospe“; 16 → „Blüte“.
31. Nach Rückgang der aktiven Tage fällt die Stufe höchstens eine Stufe unter das erreichte Maximum.
32. Nach 3 Tagen ohne Besuch: zuerst „…hm? Oh!“, dann ein `back`-Satz.
33. Um 23 Uhr ohne Training: `night`-Satz, müde Stimmung.
34. Heute Training erledigt → `trainDone`-Satz, stolz.
35. Antippen wechselt den Satz; jedes vierte Antippen jubelt.
36. Zurufe im Live höchstens alle 120 s, Bestleistungs-Zuruf frühestens 45 s nach dem letzten.
37. Erster Satz eines Trainings → `lstart`; dritter Satz einer Übung → `lset3`.
38. Zuruf überdeckt nie „Satz speichern“ oder die Pausen-Pille.

**Training-Übersicht**
39. Wochenstreifen: Tag mit Live-Training „Brust & Trizeps“ zeigt grün „Brust“ und öffnet beim Antippen die Tag-Details.
40. Tag ohne Eintrag öffnet das Pick-Sheet; Wahl „Laufen“ zeigt das Kürzel „Lauf“ und gestrichelten Rand.
41. Pick-Sheet „Ruhetag“ entfernt den Eintrag im Wochenplan; Toast „{Tag}: Ruhetag“.
42. Plan-Tag: „Training starten“ öffnet Tagesform, danach Live mit Plan-Warteschlange und erster Übung gewählt.
43. „Lieber ohne Gewichte abhaken“ öffnet die Plan-Session.
44. Kurzversion mit passenden Geräten: Session mit 3 Übungen à max. 2 Sätzen, Toast „Kurzversion: zählt voll.“
45. Kurzversion ohne passende Geräte startet den Player „10 Minuten ohne Geräte“.
46. Ruhetag zeigt „Lust auf 10 Minuten ohne Geräte?“.
47. Beinlastiger Plan am Tag nach geplantem Laufen zeigt den Beinhinweis **über** „Training starten“; „Tauschen“ setzt einen Oberkörperplan.
48. Beinhinweis schreibt nie „Oberkörper („Oberkörper“)“.
49. Muskelkarte: 9 gewichtete Sätze Brust → stärkste Färbung.
50. Muskel antippen → Toast mit Satzzahl mit Komma („6,5 Sätze“).
51. Vorschlagszeile nennt nie Unterarme und keine Beine, wenn diese Woche eine Bein-Aktivität eingetragen ist.
52. Wochenrückblick am Montag nach einer Woche mit 40 Sätzen: Vergleich „Letzte Woche bis Montag: …“, nie „−100 %“.
53. Rückblick zählt echte Sätze (40 Sätze → „40“, nicht gewichtet).
54. „Sätze pro Muskel“ nur in Profi sichtbar.
55. Plan speichern ohne Namen → „Mein Plan“; Plan löschen braucht zwei Tipps und entfernt ihn aus dem Wochenplan.
56. Gespeicherter Beispielplan verliert die Pill „Beispiel“.
57. Aktivität mit 8 km und 45 Min. → Toast „Lauf eingetragen · 8 km“, Kachel zeigt „8 km · 45 Minuten“.
58. Aktivität bringt +15 Min. Zeitkonto, aber nur einmal pro Tag zusammen mit Training.
59. Zwei Aktivitäten an einem Tag ergeben zwei Einträge.
60. Messwert mit Bereich 70–180: Wert 65 wird im Verlauf markiert.
61. Messwert umbenennen überträgt die alten Werte.

**Live-Training**
62. Tagesform „Eher müde“ bei letztem Gewicht 50 kg → Vorbelegung 45 kg.
63. Ohne Verlauf und mit Ziel Muskelaufbau: Wdh.-Vorbelegung 8.
64. Gewicht antippen öffnet Ziffernfeld; „42,5“ wird übernommen; „600“ zeigt die Fehlermeldung.
65. Gewichtsstufe 1,25 → „+“ erhöht um 1,25 kg.
66. Halten auf „+“ erhöht nach 400 ms alle 80 ms weiter.
67. Satz speichern → Toast „Satz 1 gespeichert · 42,5 kg × 10“ mit „Rückgängig“; Rückgängig entfernt den Satz.
68. Satz-Chip antippen → bearbeiten; Gewicht ändern berechnet die Bestleistung neu (falscher PR verschwindet).
69. Satz löschen und „Rückgängig“ stellt ihn an derselben Stelle wieder her.
70. Erster Satz einer Übung ist nie eine Bestleistung; ein späterer Satz mit höherem e1RM zeigt „Neue Bestleistung“.
71. Einfach: kein RIR sichtbar, gespeicherter RIR ist `null`.
72. Profi: RIR-Auswahl bleibt zwischen Sätzen erhalten.
73. Vorschlag: letzte Sitzung 2×12 bei 40 kg, Bereich 8–12, Stufe 2,5 → „Oben angekommen (12 Wdh.). Heute +2,5 kg, dafür ab 8 Wdh.“; „Übernehmen“ setzt 42,5 kg × 8.
74. Vorschlag: 5 kg, Stufe 2,5, allTop → Hinweis „+2,5 kg wären 50 % mehr …“, kein Gewichtssprung.
75. Scheibenrechner (Profi, Langhantel 60 kg): „Pro Seite: 20 kg (20-kg-Stange)“.
76. Kabelübung zeigt Aufsatz-Chips; gewählter Aufsatz wird im Satz gespeichert.
77. Zeit aus: keine Uhr, keine Pausen-Pille; Zeit an: Pausen-Pille nach jedem Satz mit eingestellter Dauer.
78. Pausen-Pille „Weiter“ beendet sofort; bei 0 erscheint „Los!“.
79. Gedanke in der Pause ablegen landet in „Kurz abladen“.
80. Plan-Warteschlange: nach Erfüllen der Soll-Sätze erscheint „Nächste Übung: …“; nach allen „Alles aus dem Plan geschafft. Stark. …“.
81. Wahl einer Rücken-Übung aus der Warteschlange schaltet die Figur auf „Hinten“.
82. Beenden ohne Satz braucht zwei Tipps und erzeugt keinen Eintrag.
83. Beenden mit Sätzen: Eintrag mit `n` = Satzzahl, Datum des letzten Satzes, Name per `liveTitle`; danach Abschluss-Karte, dann (falls definiert) Messwerte nachher – nie zwei Sheets übereinander.
84. Training 3 h ohne Satz → beim nächsten Öffnen automatisch gespeichert, Toast „Dein Training von vorhin war noch offen. …“, Instagram nicht mehr gesperrt.
85. Live-Training ohne Satz, 3 h später → „Ein leeres Training von vorhin habe ich geschlossen.“
86. Beinhinweis live bei gewähltem Bein-Muskel nach Lauf gestern; „Okay“ blendet ihn für dieses Training aus.
87. Ohne Web-Bluetooth zeigt der Puls-Knopf das Erklär-Sheet.
88. Nach Übungswahl liegt „Satz speichern“ unten im Daumenbereich (Unterkante ≤ Fensterhöhe − 104 px).
89. Alle Bedienelemente im Live-Training sind mindestens 44 px hoch.

**Übungsbrowser, So geht's**
90. Suche „seil rudern“ findet Kabelübungen mit Seil und Rudern (deutsch/englisch).
91. Filter Kabelzug gruppiert nach Hauptmuskel.
92. Im Plan-Kontext fügt Tippen hinzu, der Browser bleibt offen, Zähler „· 1 hinzugefügt“, Zeile „Im Plan“.
93. Im Live-Kontext schließt Tippen den Browser und wählt die Übung; DB-Übungen werden in `lab.custom` importiert.
94. Halten 350 ms auf einer Übungskarte öffnet „So geht's“; Bewegung > 10 px bricht ab.
95. „So geht's“ zeigt drei deutsche Hinweise; ohne Demo-Dateien das Gerätesymbol und „Für diese Übung gibt es noch keine Vorschau.“
96. Mehr als 40 Treffer laden beim Scrollen weitere 40.

**Plan-Session**
97. Tipp auf Satz 3 füllt 1–3; erneuter Tipp auf 3 nimmt ihn zurück.
98. Alles abgehakt → Konfetti (nicht bei reduzierter Bewegung) und „Fertig, speichern“.
99. Beenden ohne Haken → „Hak mindestens einen Satz ab.“

**Abschluss-Karte**
100. Karte 1080×1350 mit Name und Datum in Großbuchstaben, Titel, vier Kennzahlen, Muskelkarte, bis zu 6 Übungen.
101. Bei Zeit aus zeigt die erste Kennzahl die Zahl der Übungen statt Minuten.
102. Übung mit PR heute trägt „★ BEST“.
103. Toast erscheint bei offenem Karten-Sheet oben, nicht über „Schließen“.
104. Knopf im Rückblick zeigt die letzte Karte bzw. das Beispiel.

**Schwangerschaft & Rückbildung**
105. ET in 22 Wochen → „SSW 18+0“, Phase 2. Trimester.
106. SSW 28+0 nach vorher gesehener Phase t2 → Karte „Neu für dich · 3. Trimester“; „Alles klar“ blendet aus.
107. Ab SSW 40 → „Ist dein Baby schon da?“; „Ja“ wechselt zu „Nach der Geburt“ mit leerem Datum.
108. Moduswechsel leert das Datum.
109. 1 Woche nach der Geburt → „1 Woche nach der Geburt“.
110. 7 Wochen nach der Geburt ohne Abfrage → Pläne des Wochenbetts plus „Bereit für den nächsten Schritt?“; „Trifft alles zu“ schaltet auf Rückbildung.
111. 13 Wochen ohne zweite Abfrage bleibt in Rückbildung; Belastungstest erst nach zweiter Abfrage.
112. Erster Start eines Mama-Plans verlangt „Gelesen, los geht's“; danach nie wieder.
113. pp2b startet nur nach „Trifft alles zu, starten“.
114. Längenwahl „Kurz“ bei 33-Min.-Plan zeigt „ca. 15 Minuten“ und jede Übung einmal.
115. Zirkel-Block läuft Übung A, B, C … und dann Runde 2 (nicht A, A, A).
116. Übung mit „Seite wechseln“ piept in der Hälfte und zeigt den Toast „Seite wechseln“.
117. Nach Wdh.-Übung „Fertig“ läuft die Pause sofort, der Knopf zeigt sofort „Pause“.
118. Narbenmobilisation erscheint nur mit Kaiserschnitt.
119. Kaiserschnitt an: Timer zeigt „Kaiserschnitt: nur schmerzfrei, kein Zug an der Narbe.“
120. Player blendet die Tab-Leiste aus; Verlassen pausiert; Mama-Ansicht bietet „Training fortsetzen“.
121. „! Warnzeichen“ öffnet die Liste der Warnzeichen.
122. Planende → Eintrag `mama:{id}`, Toast „Geschafft: {Plan}“, +15 Min., Pill „✓ Start“.

**Umlenken und Feed**
123. Ablauf: Instagram öffnen → Atmen (ca. 5,4 s) → Person mit der längsten Pause steht vorn.
124. „Jemand anderes“ zeigt die nächste Person.
125. „{Name} schreiben“ setzt die Person auf „heute“, erhöht „Umgelenkt“ und gibt +5 Min. – ab dem vierten Mal am Tag kein Guthaben mehr.
126. Guthaben 15 → Optionen 5, 10, 15 Min.; nach 15 Min. ist das Konto leer und zeigt „Dein Konto ist für heute leer.“
127. Leeres Konto: Knopf auf dem Personen-Schritt lautet „Konto leer: lieber kurz rausgehen?“ (nie „(0 Min.)“).
128. Laufende Freigabe zeigt „Freigabe läuft noch {n} Min.“; „Freigabe beenden“ schreibt Restminuten zurück.
129. Live-Training läuft und Sperre an → Sperrbildschirm statt Freigabe.
130. 7-Tage-Verlauf zeigt Versuche und Umlenkungen je Tag.
131. Feed: alle drei „Gelesen“ → „Du bist durch.“ und +5 Min. einmal; erneutes Öffnen am nächsten Tag ohne neues Lesen gibt kein Guthaben.
132. „Auf morgen“ und „Für morgen speichern“ tauchen am nächsten Tag im Feed auf (bis zu 3 Elemente).

**Sicherung, Theme, Ideen, PWA**
133. Sicherung speichern erzeugt `nachtgarten-sicherung-YYYY-MM-DD.json` mit allen `lab.*`-Schlüsseln.
134. Fremde JSON-Datei → „Die Datei ist keine Nachtgarten-Sicherung.“
135. Gültige Sicherung laden ersetzt die Daten nach Bestätigung und lädt neu.
136. Theme-Wechsel bleibt nach Neuladen erhalten, ohne hellen Blitz beim Start.
137. Idee-Skizze öffnet das Sheet mit drei Punkten; Herz zählt „{n} Favoriten“.
138. Sheets schließen per Hintergrund-Tipp, Escape und Wischen nach unten.
139. Standalone-Build funktioniert offline nach dem ersten Laden; geladene Übungsfotos bleiben im Cache.
140. Bei `prefers-reduced-motion` laufen keine Konfetti-, Keimi- oder Demo-Animationen.
