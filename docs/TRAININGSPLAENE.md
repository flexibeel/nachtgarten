# Trainingspläne – Grundlagen, Übersicht, Darstellung

*Stand Oktober 2026. Daten: `src/data/plans.js` · Logik: `src/domain/plan-select.js` · Tests: `tests/unit/plans.test.js`.*

Die Vorlagen sind keine zufälligen Übungslisten. Jede folgt denselben Regeln aus der Forschung. Alle Zahlen in der App (Sätze pro Muskel, Minuten) werden aus den Daten **berechnet** und sind nirgends von Hand eingetragen.

## 1. Die Grundsätze in einfachen Worten

1. **Sätze pro Muskel und Woche sind der wichtigste Hebel.** Ein „harter Satz“ endet 0–3 Wiederholungen vor dem Versagen. Ziel sind etwa 10–20 harte Sätze pro Muskel und Woche. Mehr bringt mehr, aber jeder weitere Satz bringt weniger. Hilfsmuskeln zählen halb, Rudern zählt also halb für den Bizeps. Die App prüft einen Korridor von 8–22 Sätzen. Einstiegs-, Kurz- und Laufpläne setzen bewusst eine **Mindestdosis von 4–16**, denn schon 4 Sätze pro Woche wirken.
2. **Jeder große Muskel zweimal pro Woche.** Fürs Wachstum ist das bei gleicher Satzzahl fast egal, für Kraft hilft es klar. Vor allem verteilt es das Volumen, sodass keine Einheit ausufert. Mehr als etwa 12 Sätze pro Muskel in einer Einheit lohnen kaum.
3. **5–30 Wiederholungen funktionieren, wenn es nah ans Versagen geht.** Grundübungen liegen bei 5–12 Wiederholungen und 1–3 Wdh. Reserve (RIR), Isolationsübungen bei 10–20 Wiederholungen und 0–2 RIR. Zu Hause mit leichten Gewichten machst du einfach mehr Wiederholungen.
4. **Ausreichend Pause.** Grundübungen 2–3 Minuten, Isolationsübungen 60–90 Sekunden. Supersätze sparen Zeit, weil die Pause der einen Übung die Arbeitszeit der anderen ist.
5. **Gedehnte Position betonen.** Jede Vorlage hat für jeden großen Muskel mindestens eine Übung, die unten in der Dehnung schwer ist, etwa Beinbeuger sitzend, Überkopf-Trizeps, Schrägbank-Curls, Rumänisches Kreuzheben oder Bulgarische Split Squats. Das prüft `validatePlan`.
6. **Doppelte Progression.** Du bleibst beim Gewicht, bis alle Sätze oben im Bereich sitzen, und nimmst dann die nächste Stufe. Das passt zu `domain/progression.js`.
7. **Deload heißt leichter, nicht aufhören.** Alle 6–8 Wochen oder bei zwei Wochen Leistungstief kommt eine Woche mit halber Satzzahl und RIR 3–4. Einsteiger brauchen das anfangs meist nicht.
8. **Neu vs. erfahren.** Wer neu ist, macht weniger Sätze, nutzt mehr Maschinen und lässt mehr Reserve. Wer erfahren ist, macht mehr Volumen und trainiert an mehr Tagen.
9. **Kraft und Laufen vertragen sich.** Muskel- und Kraftzuwachs leiden kaum, nur die Schnellkraft ein wenig, vor allem wenn beides in derselben Einheit passiert. Deshalb kommen **schwere Beine nie am Tag vor einem harten oder langen Lauf**, gern aber am Tag danach. `arrangeWeek` legt die Krafttage automatisch um die eigenen Lauftage.
10. **Wenig Zeit ist kein Hindernis.** Grundübungen, Supersätze, kurzes und gezieltes Aufwärmen und Maschinen statt Umbauen bringen in 30 Minuten viel.

## 2. Übersicht der Pläne

| Plan | Tage | Minuten | Für wen | Schwerpunkt |
|---|---|---|---|---|
| Ganzkörper 2× | 2 | ca. 45 | Neue im Studio, Wochen mit wenig Zeit | Einstieg, Grundkraft |
| Ganzkörper 3× | 3 | 50–55 | Alle mit drei festen Tagen | Muskelaufbau & Kraft, ausgewogen |
| Oberkörper/Unterkörper 4× | 4 | 50–60 | Fortgeschrittene mit vier Tagen, auch im Schichtdienst | Muskelaufbau, Kraft |
| Push/Pull/Beine 3× | 3 | 45–60 | Wer klare Thementage mag | Muskelaufbau (jeder Muskel 1×, Abwägung markiert) |
| Push/Pull/Beine 6× | 6 | 35–50 | Erfahrene, die fast täglich trainieren | Muskelaufbau, hohes Volumen |
| PPL + Ober/Unter 5× | 5 | 40–50 | Fortgeschrittene mit fünf Tagen | Muskelaufbau, Kraft |
| Zuhause mit Kurzhanteln & Bändern | 2–3 | 50–55 | Training zu Hause | Fit & kräftig, ohne Studio |
| Kurz & effektiv | 2–3 | ca. 30 | Volle Wochen, Schichtdienst | Zeiteffizient, Erhalt & Aufbau |
| Kraft + Laufen | 2 (+ Lauftage) | 45–55 | Läufer:innen mit Lauftreff, auch mit Typ-1-Diabetes | Laufen + Kraft, Verletzungsschutz |
| Rücken & Beweglichkeit | 2–3 | 25–30 | Ruhiger Neustart, Rückenbeschwerden | Rücken, Beweglichkeit, sanfter Einstieg |

**Schwangerschaft & Rückbildung** hat eigene Heimpläne (Bereich „Mama“). `recommendPlans` verweist bei `pregnant` oder `postpartum` nur dorthin und schlägt keine dieser Vorlagen vor.

**Besonderheiten:**
- **PPL 3×** trifft jeden Muskel nur einmal pro Woche. Für Beine hinten und Po bleibt das Volumen unter 8 Sätzen. Der Plan trägt das als bewusste Abwägung (`tradeoffs`), und `validatePlan` zeigt es als Info, nicht als Warnung.
- **Kraft + Laufen** bringt Hinweise für Typ-1-Diabetes mit. Sie betreffen nur das Verhalten, nie die Dosis:
  - Konstanz bei Uhrzeit und Ablauf
  - Glukose vorher, nachher und in der Nacht danach prüfen
  - schnelle Kohlenhydrate dabeihaben
  - Kraft vor Ausdauer, wenn beides am selben Tag passiert
  - Anpassungen mit dem Diabetes-Team besprechen

## 3. So zeigt die App die Pläne (UI)

**Plankarte: drei Fakten, ein „Warum“.**
- **Kopf:** Name und darunter die Kurzbeschreibung (`short`).
- **Drei Fakten als Chips, nicht mehr:**
  - Tage pro Woche: „4× pro Woche“
  - Dauer: „ca. 50–60 Min.“ aus `templateMinutes`
  - Schwerpunkt: `focusLabel`
- **„Für wen“** steht als eine ruhige Zeile darunter.
- **„Warum dieser Plan?“** ist eingeklappt. Aufgeklappt zeigt es:
  - `why` mit 2–3 Sätzen
  - `evidence` klein und gedämpft, mit Quellenlinks aus `SOURCES`
  - Progression und Deload, je eine Zeile
  - optional die Muskelkarte mit `weeklyVolume` als Korridor: grau unter 4, grün im Zielbereich, orange darüber
- **Hinweise:** Infos aus `validatePlan` (z. B. PPL 3×) erscheinen als freundliche Zeile mit ⓘ, nie als rote Warnung.

**Wochenansicht: kleine Tages-Chips.**
- Sieben Chips „Mo … So“ in einer Reihe. Ein Trainingstag zeigt den Kurznamen der Einheit, z. B. „O1“, „Beine“ oder „A“. Ruhetage sind leer und gedämpft.
- Lauftage aus `runDays` bekommen ein Lauf-Symbol mit „hart“, „lang“ oder „locker“.
- Wer Einheiten verschiebt, sieht sofort das Ergebnis von `validatePlan({week, runDays})`. Bei `legsBeforeRun` oder `legsBackToBack` färbt sich der Chip warm, darunter steht ein Satz wie: „Schwere Beine am Montag direkt vor den Intervallen. Besser auf Mittwoch?“ Ein Tipp darauf übernimmt den Vorschlag von `arrangeWeek`.
- Antippen eines Chips öffnet die Einheit: Übungen mit „3 × 8–12 · RIR 1–2 · 2 Min. Pause“ und dem Knopf „Live starten“. `toAppPlans` liefert das gespeicherte Planformat.

**„Plan für mich finden“: vier Taps.**
1. **Wie oft?** 2 · 3 · 4 · 5 · 6 Tage
2. **Wie lange?** 30 · 45 · 60 · 75+ Min.
3. **Wo?** Studio · Zuhause mit Hanteln/Bändern · Ohne Geräte
4. **Was ist dir wichtig?** Stärker werden · Muskeln aufbauen · Fit & beweglich · Laufen + Kraft. Darunter stehen optionale Chips für Besonderheiten, die keinen eigenen Schritt brauchen: Schichtdienst · Rücken · Lauftreff-Tage · Typ-1-Diabetes · Schwanger/Rückbildung (führt direkt zu „Mama“). Bei „Lauftreff-Tage“ klappt eine Mini-Wochenreihe auf, in der man die Lauftage antippt.

Die Erfahrung kommt aus dem Profil oder dem Trainingsverlauf und wird nicht noch einmal abgefragt: Wer keinen Verlauf hat, gilt als „neu“, sonst als „etwas“. Im Profi-Modus lässt sie sich ändern. Das Ergebnis sind drei Plankarten mit je einem „Passt, weil …“-Satz. Die erste ist vorausgewählt, und „Übernehmen“ legt die Einheiten und den Wochenplan an. Der Ton bleibt warm und ohne Druck, und Ziele werden über Gefühl und Fähigkeit beschrieben, nie über das Aussehen (TONE.md).

## 4. Offene Punkte

- **Allgemeine Übungen:** Übungen mit `g_`-Id (z. B. Bulgarische Split Squats, Schrägbankdrücken mit Kurzhanteln, Dead Bug, Y-T-W) haben Muster und Muskeln, aber noch keine kuratierte Bibliotheks-Id. Beim Übernehmen müssen sie in die Bibliothek aufgenommen oder auf eine DB-Übung abgebildet werden.
- **Minuten:** Die Minuten sind Schätzungen. Gerechnet wird mit 3 s pro Wiederholung, der Pause, 1 Minute Umbau pro Übung und 5 Minuten Aufwärmen. Die echte Dauer kann ±10 Minuten abweichen.

## 5. Quellen

- Pelland u. a. 2026, *Sports Medicine* 56:481–505, Volumen und Frequenz: https://sponet.de/sponet/Record/4097139?lng=en (Preprint: https://sportrxiv.org/index.php/server/preprint/download/460/967/908)
- Schoenfeld, Grgic & Krieger 2019, Frequenz: https://ro.ecu.edu.au/ecuworkspost2013/5665
- Refalo u. a. 2023, Nähe zum Versagen: https://dro.deakin.edu.au/articles/journal_contribution/Influence_of_Resistance_Training_Proximity-to-Failure_on_Skeletal_Muscle_Hypertrophy_A_Systematic_Review_with_Meta-analysis/22030796
- Schoenfeld u. a. 2021, Wiederholungsbereiche: https://doaj.org/article/6d51b905504d46f0873bb43d5d84bf21
- Singer u. a. 2024, Satzpausen: https://rgu-repository.worktribe.com/OutputFile/2344468
- Wolf u. a. 2025, gedehnte Position: https://peerj.com/articles/18904
- Iversen u. a. 2021, zeiteffizientes Training: https://pmc.ncbi.nlm.nih.gov/articles/PMC8449772
- Androulakis-Korakakis u. a. 2021, Mindestdosis Kraft: https://research.bond.edu.au/en/publications/the-minimum-effective-training-dose-required-for-1rm-strength-in-/
- Bell u. a. 2023, Deload-Konsens: https://shura.shu.ac.uk/32417/ · Coleman u. a. 2024: https://peerj.com/articles/16777
- Schumann u. a. 2022, Kraft + Ausdauer: https://researchonline.jcu.edu.au/71546/1/Schumann2021_Article_CompatibilityOfConcurrentAerob.pdf
- Blagrove u. a. 2018, Kraft für Läufer: https://repository.lboro.ac.uk/articles/journal_contribution/Effects_of_strength_training_on_the_physiological_determinants_of_middle-_and_long-distance_running_performance_a_systematic_review/9619553
- Riddell u. a. 2017, Sport bei Typ-1-Diabetes: https://discovery.dundee.ac.uk/en/publications/exercise-management-in-type-1-diabetes-a-consensus-statement/ · Yardley u. a. 2012, Reihenfolge Kraft/Ausdauer: https://pmc.ncbi.nlm.nih.gov/articles/PMC3308306
- Hayden u. a. 2021, Cochrane, Bewegung bei Rückenschmerzen: https://cochranelibrary.com/cdsr/doi/10.1002/14651858.CD009790.pub2/information
