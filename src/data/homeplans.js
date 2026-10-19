/**
 * Heimpläne mit Timer: Schwangerschaft & Rückbildung (MAMA) und Einsteigerpläne (BEGIN).
 *
 * Inhalte wörtlich aus der klassischen Version (v1, src/app.html: MAMA, BEGIN), siehe SPEC 3.13/3.14.
 * Fachliche Grundlage: SOURCES. Nur Deutsch (wie die Übungsanleitungen der Pläne in v1).
 * Rechenregeln dazu in domain/homeplans.js (Auswahl, Woche) und domain/timer.js (Schritte).
 *
 * Aufbau: Phase {id, title, weeks:[von,bis], focus, notes[], csection_notes?, return_to_running_criteria?, plans[]},
 * Plan {id, name, minutes, level, equipment[], blocks:[{name, items:[{ex, mode:"time"|"reps", work?, rest, sets, reps?, cue, avoid_if?}]}]}.
 */

export const SOURCES =
  'Kanadische Leitlinie 2019 (Mottola u. a.), WHO 2020, ACOG 2020, UK Chief Medical Officers 2019, Netzwerk Gesund ins Leben, Goom/Donnelly/Brockwell 2019, IOC-Expertengruppe 2016.';

/** @type {import('../domain/homeplans.js').MamaContent} */
export const MAMA = {
  "disclaimer": "Bitte sprich vor dem Start (und bei jeder Änderung im Verlauf) mit deiner Frauenärztin, deinem Frauenarzt oder deiner Hebamme, ob es medizinische Gründe gegen Training gibt. Diese Pläne beruhen auf internationalen Leitlinien, ersetzen aber keine individuelle Beratung oder Untersuchung. Hör auf deinen Körper: Bei Warnzeichen sofort aufhören und ärztlich abklären lassen.",
  "contraindications_absolute": [
    "Blasensprung (vorzeitiger Blasensprung)",
    "Vorzeitige Wehen in der aktuellen Schwangerschaft",
    "Anhaltende oder ungeklärte vaginale Blutung (v. a. 2./3. Trimester)",
    "Placenta praevia ab ca. 26.–28. SSW",
    "Präeklampsie bzw. schwangerschaftsinduzierte Hypertonie",
    "Zervixinsuffizienz bzw. Cerclage",
    "Intrauterine Wachstumsrestriktion",
    "Höhergradige Mehrlingsschwangerschaft (z. B. Drillinge) bzw. Mehrlinge mit Frühgeburtsrisiko",
    "Unkontrollierter Typ-1-Diabetes, unkontrollierte Hypertonie oder unkontrollierte Schilddrüsenerkrankung",
    "Hämodynamisch relevante Herzerkrankung oder restriktive Lungenerkrankung",
    "Schwere Anämie",
    "Andere schwere kardiovaskuläre, respiratorische oder systemische Erkrankung"
  ],
  "contraindications_relative": [
    "Wiederholte Fehlgeburten (habituelle Aborte)",
    "Gestationshypertonie",
    "Spontane Frühgeburt in der Vorgeschichte",
    "Leichte bis mittelgradige Herz- oder Lungenerkrankung (z. B. chronische Bronchitis)",
    "Symptomatische Anämie",
    "Nicht abgeklärte mütterliche Herzrhythmusstörung",
    "Mangelernährung, Essstörung oder extremes Untergewicht",
    "Extreme Adipositas oder bisher extrem inaktiver Lebensstil (dann sehr langsam beginnen)",
    "Zwillingsschwangerschaft ab 28. SSW",
    "Schlecht eingestellte Epilepsie, Hyperthyreose oder Typ-1-Diabetes",
    "Orthopädische Einschränkungen",
    "Starkes Rauchen",
    "Andere relevante Erkrankungen – moderates bis intensives Training vorher individuell besprechen"
  ],
  "stop_signs": [
    "Vaginale Blutung",
    "Regelmäßige, schmerzhafte Wehen/Kontraktionen",
    "Abgang von Fruchtwasser bzw. anhaltender Flüssigkeitsverlust aus der Scheide",
    "Atemnot schon vor der Belastung oder übermäßige Atemnot, die sich in Ruhe nicht bessert",
    "Brustschmerz",
    "Schwindel oder Ohnmachtsgefühl, das sich in Ruhe nicht bessert",
    "Kopfschmerzen (v. a. neu und stark, ggf. mit Sehstörungen)",
    "Muskelschwäche, die das Gleichgewicht beeinträchtigt",
    "Wadenschmerz oder -schwellung (Thrombose ausschließen)",
    "Nachlassende Kindsbewegungen",
    "Nach der Geburt: Wochenfluss wird wieder stärker oder hellrot",
    "Nach der Geburt: Schwere-, Druck- oder Fremdkörpergefühl im Becken, neue Inkontinenz",
    "Nach der Geburt: Schmerzen, Rötung, Nässen an Kaiserschnitt- oder Dammnaht, Fieber",
    "Nach der Geburt: deutliche Vorwölbung (Doming) in der Bauchmitte bei Belastung – Übung abbrechen und anpassen"
  ],
  "principles": [
    "Umfang: mindestens 150 Minuten moderate Aktivität pro Woche, verteilt auf mindestens 3 Tage (besser täglich); Einheiten ab 10 Minuten zählen (Kanada 2019, WHO 2020, UK CMO 2019, Gesund ins Leben).",
    "Kombinieren: Ausdauer plus Krafttraining an 2 Tagen pro Woche; sanftes Dehnen oder Yoga ergänzend. Jede Bewegung zählt, mehr ist besser als nichts.",
    "Intensität: Talk-Test – Sprechen in ganzen Sätzen muss möglich sein (entspricht etwa Borg 12–14 von 20). Wahrgenommene Anstrengung unterschätzt in der Schwangerschaft eher die Herzfrequenz.",
    "Keine Maximalbelastungen: Belastungen über ca. 90 % der max. Herzfrequenz meiden – dabei wurden vorübergehende fetale Bradykardien beobachtet (IOC-Expertengruppe 2016).",
    "Ziel ist Erhalt der Fitness, keine Leistungssteigerung. Bereits trainierte Frauen können ihr gewohntes Training meist angepasst fortsetzen; Einsteigerinnen langsam steigern.",
    "Meiden: Kontaktsportarten und Sport mit Sturz- oder Bauchtraumarisiko (z. B. Kampfsport, Reiten, Skifahren, Mountainbike), Tauchen mit Gerät, Olympisches Gewichtheben; intensives Training über ca. 2.500 m Höhe nur nach Rücksprache.",
    "Hitze: kein intensives Training bei großer Hitze/Luftfeuchte (kein Hot Yoga/Hot Pilates), gut lüften, leichte Kleidung, vor, während und nach dem Training trinken.",
    "Rückenlage: Evidenz schwach. Kanada 2019: Position wechseln, wenn in Rückenlage Schwindel, Übelkeit oder Unwohlsein auftreten. ACOG rät ab ca. 20. SSW, längere Rückenlage möglichst zu meiden. Praxis in den Plänen: ab 2. Trimester Rückenlage nur kurz, sonst Seitlage, Vierfüßlerstand oder erhöhter Oberkörper.",
    "Langes regungsloses Stehen meiden (Blutdruckabfall); zwischendurch Gewicht verlagern oder gehen.",
    "Pressatmung (Valsalva): Grundsätzlich beim Heben ausatmen. Kleine Studien an erfahrenen Kraftsportlerinnen zeigen, dass auch schwere Sätze mit Valsalva akut gut vertragen wurden, die Datenlage ist aber klein. Bei Schwindel, Druck nach unten oder Inkontinenz Gewicht reduzieren und ohne Luftanhalten trainieren.",
    "Krafttraining mit leichten bis moderaten Gewichten ist sicher und wird empfohlen (WHO 2020). Höhere Lasten nur bei Vorerfahrung, sauberer Technik und Rücksprache; in dieser App bewusst leichte Kurzhanteln/Band.",
    "Beckenboden: tägliches Beckenbodentraining senkt das Risiko für Harninkontinenz – Technik am besten einmal von Hebamme oder Physiotherapie anleiten lassen. Anspannen UND bewusstes Loslassen üben.",
    "Rektusdiastase: in der Schwangerschaft physiologisch. Starke Vorwölbung (Doming) bei Übungen vermeiden, klassische Crunches/Sit-ups ab dem 2. Trimester weglassen. Die Evidenz für spezielle Diastase-Programme ist sehr gering – angepasstes Rumpftraining statt Verbote.",
    "Bänder sind durch Hormone lockerer: Dehnen nur bis zum angenehmen Ziehen, keine federnden Endpositionen; bei Symphysen- oder ISG-Schmerzen Schrittweite verkleinern und einbeinige Übungen meiden.",
    "Ausreichend essen: Training erhöht den Energiebedarf; nicht nüchtern trainieren.",
    "Nach der Geburt: sanft beginnen und nach Geburtsmodus und Befinden steigern; Beckenboden so früh wie möglich und täglich; Kraft wieder 2x/Woche. Stillen ist mit Training vereinbar – vorher stillen oder abpumpen ist oft angenehmer.",
    "Laufen und Springen frühestens ab ca. 12 Wochen nach der Geburt und nur bei unauffälligem Belastungstest (Goom et al. 2019)."
  ],
  "phases": [
    {
      "id": "t1",
      "title": "1. Trimester (SSW 1–13)",
      "weeks": [
        1,
        13
      ],
      "focus": "Gewohnte Fitness erhalten oder sanft aufbauen, Beckenboden kennenlernen, mit Übelkeit und Müdigkeit flexibel umgehen.",
      "notes": [
        "Übelkeit und Müdigkeit sind normal – an schlechten Tagen lieber den Mobility-Plan oder einen Spaziergang wählen.",
        "Überhitzung vermeiden, besonders in der frühen Schwangerschaft (Neuralrohrentwicklung): gut lüften, trinken.",
        "Rückenlage ist im 1. Trimester unproblematisch.",
        "Bauchübungen sind noch möglich, aber Pressen und Luftanhalten vermeiden."
      ],
      "plans": [
        {
          "id": "t1a",
          "name": "Ganzkörper-Kraft zu Hause",
          "minutes": 33,
          "level": "mittel",
          "equipment": [
            "Matte",
            "leichte Kurzhanteln",
            "Widerstandsband",
            "Stuhl"
          ],
          "blocks": [
            {
              "name": "Aufwärmen",
              "items": [
                {
                  "ex": "Marschieren auf der Stelle",
                  "mode": "time",
                  "work": 120,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Arme locker mitschwingen, ruhig atmen."
                },
                {
                  "ex": "Schulterkreisen und Armkreisen",
                  "mode": "time",
                  "work": 60,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Große, langsame Kreise in beide Richtungen."
                },
                {
                  "ex": "Hüftkreisen im Stand",
                  "mode": "time",
                  "work": 60,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Knie weich, Becken weich kreisen."
                },
                {
                  "ex": "Kniebeuge ohne Gewicht",
                  "mode": "time",
                  "work": 45,
                  "rest": 15,
                  "sets": 1,
                  "cue": "Gewicht auf der ganzen Fußsohle, Knie Richtung Zehen."
                }
              ]
            },
            {
              "name": "Hauptteil (Zirkel, 3 Runden)",
              "items": [
                {
                  "ex": "Goblet-Kniebeuge",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Hantel vor der Brust, beim Hochkommen ausatmen."
                },
                {
                  "ex": "Vorgebeugtes Rudern mit Kurzhanteln",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Rücken lang, Ellbogen nah am Körper nach hinten."
                },
                {
                  "ex": "Rumänisches Kreuzheben",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Hüfte nach hinten schieben, Hanteln nah an den Beinen."
                },
                {
                  "ex": "Liegestütz erhöht an Tisch oder Wand",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Körper eine Linie, beim Wegdrücken ausatmen."
                },
                {
                  "ex": "Ausfallschritt rückwärts im Wechsel",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Kurzer Schritt, bei Bedarf an Stuhl festhalten.",
                  "avoid_if": "Schmerzen an Symphyse oder ISG – dann Kniebeuge im Stand."
                },
                {
                  "ex": "Schulterdrücken im Sitzen",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Rippen unten lassen, nicht ins Hohlkreuz."
                }
              ]
            },
            {
              "name": "Rumpf",
              "items": [
                {
                  "ex": "Bird-Dog im Vierfüßlerstand",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Arm und Gegenbein lang, Becken bleibt ruhig."
                },
                {
                  "ex": "Seitstütz auf den Knien",
                  "mode": "time",
                  "work": 30,
                  "rest": 30,
                  "sets": 2,
                  "cue": "Pro Satz Seite wechseln, Hüfte hoch halten."
                },
                {
                  "ex": "Pallof-Press mit Band",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Band vor der Brust wegdrücken, nicht mitdrehen; Seite wechseln."
                }
              ]
            },
            {
              "name": "Abschluss",
              "items": [
                {
                  "ex": "Atmung mit Beckenboden-Aktivierung",
                  "mode": "time",
                  "work": 120,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Einatmen loslassen, beim Ausatmen Beckenboden sanft heben."
                },
                {
                  "ex": "Dehnen Hüftbeuger und Brust",
                  "mode": "time",
                  "work": 120,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Nur bis zum angenehmen Ziehen, nicht federn."
                }
              ]
            }
          ]
        },
        {
          "id": "t1b",
          "name": "Mobilität, Atmung & Beckenboden",
          "minutes": 24,
          "level": "leicht",
          "equipment": [
            "Matte",
            "Kissen"
          ],
          "blocks": [
            {
              "name": "Ankommen",
              "items": [
                {
                  "ex": "360°-Atmung im Sitzen",
                  "mode": "time",
                  "work": 120,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Hände an die Rippen, Atem weitet Bauch, Flanken und Rücken."
                },
                {
                  "ex": "Katze-Kuh",
                  "mode": "time",
                  "work": 45,
                  "rest": 15,
                  "sets": 2,
                  "cue": "Wirbel für Wirbel bewegen, mit dem Atem."
                }
              ]
            },
            {
              "name": "Beckenboden",
              "items": [
                {
                  "ex": "Beckenboden halten und lösen",
                  "mode": "time",
                  "work": 60,
                  "rest": 20,
                  "sets": 3,
                  "cue": "10 s sanft anheben, 10 s komplett loslassen."
                },
                {
                  "ex": "Beckenboden schnelle Impulse",
                  "mode": "time",
                  "work": 30,
                  "rest": 30,
                  "sets": 2,
                  "cue": "Kurz anspannen, ganz lösen – nicht den Po zusammenkneifen."
                }
              ]
            },
            {
              "name": "Mobilität & sanfte Kraft",
              "items": [
                {
                  "ex": "Beckenheben (Glute Bridge)",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Ausatmen und Becken heben, oben kurz halten."
                },
                {
                  "ex": "Clamshell in Seitlage",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Füße zusammen, oberes Knie öffnen; pro Satz Seite wechseln."
                },
                {
                  "ex": "Brustwirbelsäulen-Rotation im Vierfüßler",
                  "mode": "time",
                  "work": 45,
                  "rest": 15,
                  "sets": 2,
                  "cue": "Hand an den Hinterkopf, Ellbogen zur Decke drehen; Seite wechseln."
                },
                {
                  "ex": "Hüftbeuger-Dehnung im Halbkniestand",
                  "mode": "time",
                  "work": 45,
                  "rest": 15,
                  "sets": 2,
                  "cue": "Kissen unters Knie, Becken leicht aufrichten; Seite wechseln."
                },
                {
                  "ex": "Tiefe Hocke mit Halt",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "An Tür oder Stuhl festhalten, Becken locker sinken lassen."
                }
              ]
            },
            {
              "name": "Abschluss",
              "items": [
                {
                  "ex": "Kindhaltung mit weiten Knien",
                  "mode": "time",
                  "work": 90,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Knie weit, in den Rücken atmen."
                },
                {
                  "ex": "Ruhige Atmung",
                  "mode": "time",
                  "work": 120,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Ausatmung etwas länger als Einatmung."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "t2",
      "title": "2. Trimester (SSW 14–27)",
      "weeks": [
        14,
        27
      ],
      "focus": "Kraft erhalten, Haltung und Rücken stärken, Positionen an den wachsenden Bauch anpassen.",
      "notes": [
        "Rückenlage nur kurz; bei Schwindel, Übelkeit oder Unwohlsein sofort in Seitlage wechseln. Alternativ Oberkörper mit Kissen erhöhen.",
        "Keine Crunches/Sit-ups und kein Unterarmstütz am Boden mehr; Stütz erhöht an Tisch oder Wand.",
        "Gleichgewicht verändert sich: einbeinige Übungen mit Festhalten.",
        "Bei Symphysen- oder ISG-Beschwerden: kleine Schritte, Beine eher parallel, kein Ausfallschritt."
      ],
      "plans": [
        {
          "id": "t2a",
          "name": "Kraft mit Babybauch",
          "minutes": 33,
          "level": "mittel",
          "equipment": [
            "Matte",
            "leichte Kurzhanteln",
            "Widerstandsband",
            "Stuhl"
          ],
          "blocks": [
            {
              "name": "Aufwärmen",
              "items": [
                {
                  "ex": "Marschieren auf der Stelle",
                  "mode": "time",
                  "work": 120,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Ruhig atmen, Talk-Test im Blick."
                },
                {
                  "ex": "Arm- und Schulterkreisen",
                  "mode": "time",
                  "work": 60,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Brust weit, Schultern weg von den Ohren."
                },
                {
                  "ex": "Hüftkreisen im Stand",
                  "mode": "time",
                  "work": 60,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Fließend und weich bewegen."
                }
              ]
            },
            {
              "name": "Hauptteil (Zirkel, 3 Runden)",
              "items": [
                {
                  "ex": "Kniebeuge zum Stuhl (Box Squat) mit Kurzhantel",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Kurz antippen, beim Aufstehen ausatmen."
                },
                {
                  "ex": "Einarmiges Rudern am Stuhl abgestützt",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Pro Satz Seite wechseln, Schulterblatt nach hinten unten."
                },
                {
                  "ex": "Rumänisches Kreuzheben mit Kurzhanteln",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Füße etwas breiter, Platz für den Bauch."
                },
                {
                  "ex": "Liegestütz erhöht an der Wand",
                  "mode": "time",
                  "work": 30,
                  "rest": 30,
                  "sets": 3,
                  "cue": "Ausatmen beim Wegdrücken, kein Durchhängen."
                },
                {
                  "ex": "Split Squat stationär mit Halt",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Am Stuhl festhalten, pro Satz Seite wechseln.",
                  "avoid_if": "Symphysenschmerz – dann Kniebeuge mit beiden Beinen."
                },
                {
                  "ex": "Band-Zug auseinander (Pull-Apart)",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Arme gestreckt, Band zur Brust ziehen."
                }
              ]
            },
            {
              "name": "Rumpf & Hüfte",
              "items": [
                {
                  "ex": "Beckenheben (Glute Bridge), kurz",
                  "mode": "time",
                  "work": 30,
                  "rest": 30,
                  "sets": 2,
                  "cue": "Ausatmen und heben; zwischen den Sätzen auf die Seite drehen.",
                  "avoid_if": "Schwindel oder Übelkeit in Rückenlage – dann Hüftstrecken im Vierfüßler."
                },
                {
                  "ex": "Bird-Dog im Vierfüßlerstand",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Bauch sanft zur Wirbelsäule, kein Vorwölben."
                },
                {
                  "ex": "Seitstütz auf den Knien",
                  "mode": "time",
                  "work": 25,
                  "rest": 35,
                  "sets": 2,
                  "cue": "Pro Satz Seite wechseln, ruhig weiteratmen."
                },
                {
                  "ex": "Pallof-Press mit Band",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Wegdrücken ohne Mitdrehen; Seite wechseln."
                }
              ]
            },
            {
              "name": "Abschluss",
              "items": [
                {
                  "ex": "Atmung mit Beckenboden im Sitzen",
                  "mode": "time",
                  "work": 120,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Ausatmen und heben, einatmen und ganz loslassen."
                },
                {
                  "ex": "Dehnen Brust am Türrahmen",
                  "mode": "time",
                  "work": 60,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Unterarm an den Rahmen, sanft vorlehnen."
                }
              ]
            }
          ]
        },
        {
          "id": "t2b",
          "name": "Beweglich & entspannt",
          "minutes": 24,
          "level": "leicht",
          "equipment": [
            "Matte",
            "Kissen",
            "Gymnastikball (optional)"
          ],
          "blocks": [
            {
              "name": "Ankommen",
              "items": [
                {
                  "ex": "Atmung im Vierfüßlerstand",
                  "mode": "time",
                  "work": 90,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Bauch darf beim Einatmen sinken, Ausatmen sanft heben."
                },
                {
                  "ex": "Katze-Kuh",
                  "mode": "time",
                  "work": 45,
                  "rest": 15,
                  "sets": 2,
                  "cue": "Klein und fließend, nicht ins Hohlkreuz fallen."
                }
              ]
            },
            {
              "name": "Beckenboden",
              "items": [
                {
                  "ex": "Beckenboden halten und lösen in Seitlage",
                  "mode": "time",
                  "work": 60,
                  "rest": 20,
                  "sets": 3,
                  "cue": "10 s heben, 10 s bewusst loslassen."
                },
                {
                  "ex": "Beckenboden schnelle Impulse im Sitzen",
                  "mode": "time",
                  "work": 30,
                  "rest": 30,
                  "sets": 2,
                  "cue": "Kurz anspannen, vollständig lösen."
                }
              ]
            },
            {
              "name": "Mobilität & Seitlage",
              "items": [
                {
                  "ex": "Clamshell in Seitlage",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Kissen unter den Bauch, pro Satz Seite wechseln."
                },
                {
                  "ex": "Seitliches Beinheben in Seitlage",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Bein leicht nach hinten, Zehen nach vorn; Seite wechseln."
                },
                {
                  "ex": "Offenes Buch (Open Book) in Seitlage",
                  "mode": "time",
                  "work": 45,
                  "rest": 15,
                  "sets": 2,
                  "cue": "Oberen Arm öffnen, Blick folgt der Hand; Seite wechseln."
                },
                {
                  "ex": "Beckenkreisen auf dem Ball oder Stuhl",
                  "mode": "time",
                  "work": 60,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Füße hüftbreit, Becken weich kreisen."
                },
                {
                  "ex": "Hüftbeuger-Dehnung im Halbkniestand",
                  "mode": "time",
                  "work": 45,
                  "rest": 15,
                  "sets": 2,
                  "cue": "Kissen unters Knie, Seite wechseln."
                },
                {
                  "ex": "Tiefe Hocke mit Halt",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Festhalten, Becken entspannt sinken lassen."
                }
              ]
            },
            {
              "name": "Abschluss",
              "items": [
                {
                  "ex": "Entspannung in Seitlage",
                  "mode": "time",
                  "work": 180,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Kissen zwischen die Knie, lange ausatmen."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "t3",
      "title": "3. Trimester (SSW 28–40)",
      "weeks": [
        28,
        40
      ],
      "focus": "In Bewegung bleiben, Kraft für Alltag und Babytragen, Beckenboden auch entspannen können, Geburtsvorbereitung.",
      "notes": [
        "Intensität und Umfang nach Tagesform reduzieren; Talk-Test strikt einhalten.",
        "Keine Rückenlage im Training: Seitlage, Sitzen, Stehen oder Vierfüßler.",
        "Bodenwechsel langsam über die Seite; zügig aufstehen kann Schwindel auslösen.",
        "Gewichte leichter, Bewegungsumfang kleiner, mehr Stabilität (Stuhl, Wand).",
        "Bei Wassereinlagerungen, Kurzatmigkeit oder Senkwehen öfter Pausen; im Zweifel nur gehen und Mobility."
      ],
      "plans": [
        {
          "id": "t3a",
          "name": "Alltagskraft sanft",
          "minutes": 26,
          "level": "leicht",
          "equipment": [
            "Stuhl",
            "leichte Kurzhanteln",
            "Widerstandsband",
            "Miniband (optional)"
          ],
          "blocks": [
            {
              "name": "Aufwärmen",
              "items": [
                {
                  "ex": "Gehen oder Marschieren auf der Stelle",
                  "mode": "time",
                  "work": 120,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Locker, Arme mitschwingen."
                },
                {
                  "ex": "Schulterkreisen im Sitzen",
                  "mode": "time",
                  "work": 60,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Brust öffnen, Nacken lang."
                }
              ]
            },
            {
              "name": "Hauptteil (2–3 Runden nach Tagesform)",
              "items": [
                {
                  "ex": "Aufstehen vom Stuhl (Sit-to-Stand)",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Füße breit, beim Aufstehen ausatmen."
                },
                {
                  "ex": "Rudern mit Band im Stand",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Ellbogen nach hinten, Brust bleibt offen."
                },
                {
                  "ex": "Liegestütz an der Wand",
                  "mode": "time",
                  "work": 30,
                  "rest": 30,
                  "sets": 3,
                  "cue": "Kleiner Bewegungsumfang, ausatmen beim Wegdrücken."
                },
                {
                  "ex": "Hip Hinge mit leichten Kurzhanteln",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Füße breit, nur so weit, wie der Rücken lang bleibt."
                },
                {
                  "ex": "Seitliches Gehen mit Miniband",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Kleine Schritte, Knie leicht gebeugt.",
                  "avoid_if": "Symphysenschmerz – dann Clamshell in Seitlage."
                },
                {
                  "ex": "Wadenheben mit Halt",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Langsam hoch und runter, fördert den Rückfluss."
                },
                {
                  "ex": "Bizepscurl und Schulterdrücken im Sitzen",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Leichte Hanteln, Rippen unten lassen."
                }
              ]
            },
            {
              "name": "Rumpf",
              "items": [
                {
                  "ex": "Pallof-Press im Sitzen",
                  "mode": "time",
                  "work": 30,
                  "rest": 30,
                  "sets": 2,
                  "cue": "Ausatmen beim Wegdrücken; Seite wechseln."
                },
                {
                  "ex": "Vierfüßler: abwechselnd Arm heben",
                  "mode": "time",
                  "work": 30,
                  "rest": 30,
                  "sets": 2,
                  "cue": "Becken ruhig, Bauch nicht durchhängen lassen."
                }
              ]
            },
            {
              "name": "Abschluss",
              "items": [
                {
                  "ex": "Atmung mit Beckenboden in Seitlage",
                  "mode": "time",
                  "work": 120,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Ausatmen heben, einatmen weit loslassen."
                }
              ]
            }
          ]
        },
        {
          "id": "t3b",
          "name": "Geburtsvorbereitung: Mobilität & Loslassen",
          "minutes": 22,
          "level": "leicht",
          "equipment": [
            "Matte",
            "Kissen",
            "Gymnastikball (optional)"
          ],
          "blocks": [
            {
              "name": "Ankommen",
              "items": [
                {
                  "ex": "360°-Atmung im Sitzen",
                  "mode": "time",
                  "work": 120,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Lange, weiche Ausatmung."
                },
                {
                  "ex": "Beckenkreisen auf dem Ball oder Stuhl",
                  "mode": "time",
                  "work": 90,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Große, langsame Kreise und Achten."
                }
              ]
            },
            {
              "name": "Beckenboden: wahrnehmen & entspannen",
              "items": [
                {
                  "ex": "Beckenboden anspannen und bewusst lösen",
                  "mode": "time",
                  "work": 60,
                  "rest": 20,
                  "sets": 3,
                  "cue": "5 s heben, 10 s ganz weich und weit werden lassen."
                },
                {
                  "ex": "Atmen in den Beckenboden in Kindhaltung",
                  "mode": "time",
                  "work": 90,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Knie weit, Bauch zwischen den Knien, beim Einatmen loslassen."
                }
              ]
            },
            {
              "name": "Mobilität",
              "items": [
                {
                  "ex": "Katze-Kuh",
                  "mode": "time",
                  "work": 45,
                  "rest": 15,
                  "sets": 2,
                  "cue": "Klein und fließend."
                },
                {
                  "ex": "Offenes Buch (Open Book) in Seitlage",
                  "mode": "time",
                  "work": 45,
                  "rest": 15,
                  "sets": 2,
                  "cue": "Kissen unter Bauch und Kopf; Seite wechseln."
                },
                {
                  "ex": "Schmetterling im Sitzen",
                  "mode": "time",
                  "work": 60,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Kissen unter den Po, Knie sinken lassen, nicht drücken."
                },
                {
                  "ex": "Unterstützte tiefe Hocke",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Am Stuhl halten oder auf Kissenstapel sitzen.",
                  "avoid_if": "Steißlage nach ärztlichem Hinweis oder Symphysenschmerz – dann weglassen."
                },
                {
                  "ex": "Seitliches Wiegen im Stand",
                  "mode": "time",
                  "work": 60,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Gewicht von Fuß zu Fuß, Becken locker."
                },
                {
                  "ex": "Wadendehnung an der Wand",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Ferse am Boden; Seite wechseln."
                }
              ]
            },
            {
              "name": "Abschluss",
              "items": [
                {
                  "ex": "Entspannung in Seitlage",
                  "mode": "time",
                  "work": 180,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Links liegend, Kissen zwischen den Knien, Atem beobachten."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "pp0",
      "title": "Wochenbett (0–6 Wochen nach Geburt)",
      "weeks": [
        0,
        6
      ],
      "focus": "Erholung, Atmung, Beckenboden und tiefe Bauchmuskulatur wieder wahrnehmen, behutsam gehen.",
      "notes": [
        "Nach unkomplizierter vaginaler Geburt kann mit Beckenboden, Atmung und Gehen oft schon nach wenigen Tagen begonnen werden (nach Entfernung eines Katheters).",
        "Woche 0–2: Beckenboden, Atmung, kurze Spaziergänge. Woche 2–4: Gehen steigern, ggf. leichte Kniebeugen und Beckenheben. Woche 4–6: erste gelenkschonende Ausdauer (z. B. Ergometer) je nach Erholung.",
        "Nicht in dieser Phase: Laufen, Springen, Crunches, Sit-ups, Unterarmstütz, schweres Heben.",
        "Aus der Rückenlage immer über die Seite aufstehen.",
        "Wochenfluss als Belastungsanzeige: wird er stärker oder hellrot, Belastung reduzieren.",
        "Schlaf und Erholung gehen vor – die Einheit kann auch in 2–3 kurze Teile aufgeteilt werden.",
        "Nachsorge-Termin (meist ca. 6 Wochen) abwarten, bevor intensiver trainiert wird."
      ],
      "csection_notes": [
        "Nach Kaiserschnitt ist das eine Bauch-OP: Erholung dauert länger, die Bauchfaszie hat nach 6 Wochen erst ca. 51–59 % ihrer Reißfestigkeit.",
        "Beckenboden- und Atemübungen sind trotzdem sinnvoll, sobald es sich gut anfühlt.",
        "Beim Husten, Niesen oder Lachen ein Kissen auf die Narbe drücken.",
        "In den ersten Wochen nichts heben, was schwerer als das Baby ist; Gehen langsam steigern.",
        "Übungen mit Zug an der Narbe (z. B. Heel Slides, Beckenkippen) nur schmerzfrei und klein ausführen."
      ],
      "plans": [
        {
          "id": "pp0a",
          "name": "Sanfter Neustart",
          "minutes": 27,
          "level": "leicht",
          "equipment": [
            "Matte oder Bett",
            "Kissen"
          ],
          "blocks": [
            {
              "name": "Atmung",
              "items": [
                {
                  "ex": "360°-Atmung in Rückenlage",
                  "mode": "time",
                  "work": 120,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Knie aufgestellt, Atem weitet Bauch und Flanken."
                }
              ]
            },
            {
              "name": "Beckenboden & tiefe Bauchmuskeln",
              "items": [
                {
                  "ex": "Beckenboden sanft anspannen mit Ausatmung",
                  "mode": "time",
                  "work": 60,
                  "rest": 30,
                  "sets": 3,
                  "cue": "Ausatmen und sanft nach innen-oben ziehen, einatmen lösen."
                },
                {
                  "ex": "Tiefe Bauchmuskeln aktivieren",
                  "mode": "time",
                  "work": 45,
                  "rest": 15,
                  "sets": 3,
                  "cue": "Beim Ausatmen Unterbauch sanft Richtung Wirbelsäule, kein Pressen."
                },
                {
                  "ex": "Beckenkippen in Rückenlage",
                  "mode": "time",
                  "work": 45,
                  "rest": 15,
                  "sets": 2,
                  "cue": "Lendenwirbelsäule sanft in die Unterlage, klein bewegen."
                },
                {
                  "ex": "Ferse wegschieben (Heel Slides)",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Bein langsam ausstrecken, Becken bleibt ruhig; abwechseln."
                },
                {
                  "ex": "Clamshell in Seitlage",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Klein und langsam; pro Satz Seite wechseln."
                }
              ]
            },
            {
              "name": "Haltung",
              "items": [
                {
                  "ex": "Brustöffnung und Schulterkreisen im Sitzen",
                  "mode": "time",
                  "work": 60,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Gegen die Stillhaltung: Schultern nach hinten-unten."
                }
              ]
            },
            {
              "name": "Gehen",
              "items": [
                {
                  "ex": "Spaziergang (ggf. mit Kinderwagen)",
                  "mode": "time",
                  "work": 600,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Nach Tagesform 5–15 Minuten, langsam steigern."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "pp1",
      "title": "Rückbildung (6–12 Wochen)",
      "weeks": [
        6,
        12
      ],
      "focus": "Beckenboden und Rumpf belastbar machen, leichtes Krafttraining, gelenkschonende Ausdauer steigern.",
      "notes": [
        "Nach unauffälliger Nachsorge: zügiges Gehen, länger/härter gelenkschonend (Ergometer, Crosstrainer) und leichtes Krafttraining.",
        "Rückbildungskurs oder Beckenboden-Physiotherapie wird empfohlen; Beckenbodentraining bis ca. 6 Monate nach der Geburt fortsetzen.",
        "Rumpftraining ohne deutliche Vorwölbung (Doming) in der Bauchmitte; Diastase ist kein Trainingsverbot, aber Übungen anpassen.",
        "Weiterhin kein Laufen und Springen.",
        "Schwimmen erst, wenn Wochenfluss beendet und Wunden verheilt sind.",
        "Warnzeichen: Schwere-/Druckgefühl im Becken, Inkontinenz, Schmerzen – dann zurückstufen und abklären lassen."
      ],
      "csection_notes": [
        "Narbenmobilisation ab ca. 6–8 Wochen, sobald die Narbe gut verheilt ist (am besten von Hebamme/Physio zeigen lassen).",
        "Rumpfübungen langsamer steigern; Ziehen oder Brennen an der Narbe ist ein Stoppsignal.",
        "Die Umbauprozesse an Gebärmutter und Faszie dauern über 6 Wochen hinaus – Belastung eher eine Stufe vorsichtiger wählen."
      ],
      "plans": [
        {
          "id": "pp1a",
          "name": "Kraft-Basics nach der Geburt",
          "minutes": 25,
          "level": "leicht",
          "equipment": [
            "Matte",
            "leichte Kurzhanteln",
            "Widerstandsband",
            "Stuhl"
          ],
          "blocks": [
            {
              "name": "Aufwärmen",
              "items": [
                {
                  "ex": "Marschieren auf der Stelle",
                  "mode": "time",
                  "work": 120,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Locker, aufrechte Haltung."
                },
                {
                  "ex": "Atmung mit Beckenboden im Stand",
                  "mode": "time",
                  "work": 60,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Ausatmen heben, einatmen lösen."
                }
              ]
            },
            {
              "name": "Hauptteil (Zirkel, 2–3 Runden)",
              "items": [
                {
                  "ex": "Kniebeuge zum Stuhl",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Vor dem Aufstehen Beckenboden aktivieren, dann ausatmen."
                },
                {
                  "ex": "Rudern mit Band",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Schulterblätter zusammen – gut gegen Stillhaltung."
                },
                {
                  "ex": "Beckenheben (Glute Bridge)",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Ausatmen, Beckenboden heben, dann Becken heben."
                },
                {
                  "ex": "Liegestütz erhöht am Tisch",
                  "mode": "time",
                  "work": 30,
                  "rest": 30,
                  "sets": 3,
                  "cue": "Bauch flach halten, kein Doming."
                },
                {
                  "ex": "Rumänisches Kreuzheben mit Kurzhanteln",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Hüfte nach hinten, Rücken lang."
                },
                {
                  "ex": "Schulterdrücken im Sitzen",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Leicht beginnen, Rippen unten."
                }
              ]
            },
            {
              "name": "Rumpf",
              "items": [
                {
                  "ex": "Dead Bug Vorstufe (Füße abwechselnd antippen)",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Knie über Hüfte, abwechselnd Ferse zum Boden, Bauch bleibt flach.",
                  "avoid_if": "Vorwölbung in der Bauchmitte – dann Heel Slides."
                },
                {
                  "ex": "Seitstütz auf den Knien",
                  "mode": "time",
                  "work": 25,
                  "rest": 35,
                  "sets": 2,
                  "cue": "Pro Satz Seite wechseln."
                }
              ]
            },
            {
              "name": "Abschluss",
              "items": [
                {
                  "ex": "Dehnen Brust und Hüftbeuger",
                  "mode": "time",
                  "work": 120,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Ruhig atmen, nicht federn."
                }
              ]
            }
          ]
        },
        {
          "id": "pp1b",
          "name": "Beckenboden & Rumpf-Aufbau",
          "minutes": 23,
          "level": "leicht",
          "equipment": [
            "Matte",
            "Kissen",
            "Widerstandsband"
          ],
          "blocks": [
            {
              "name": "Beckenboden",
              "items": [
                {
                  "ex": "Beckenboden Maximalkraft halten",
                  "mode": "time",
                  "work": 60,
                  "rest": 30,
                  "sets": 3,
                  "cue": "3x 8–10 s kräftig heben, dazwischen ganz lösen."
                },
                {
                  "ex": "Beckenboden schnelle Impulse",
                  "mode": "time",
                  "work": 30,
                  "rest": 30,
                  "sets": 2,
                  "cue": "Schnell anspannen, komplett lösen."
                },
                {
                  "ex": "Beckenboden beim Husten (Knack-Technik)",
                  "mode": "reps",
                  "rest": 30,
                  "sets": 2,
                  "reps": 5,
                  "cue": "Vor dem Husten Beckenboden anspannen, dann husten."
                }
              ]
            },
            {
              "name": "Rumpf",
              "items": [
                {
                  "ex": "Heel Slides mit Ausatmung",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Beim Ausatmen Bein ausstrecken, Bauch flach."
                },
                {
                  "ex": "Bird-Dog im Vierfüßlerstand",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Bauch hält gegen die Schwerkraft, kein Durchhängen."
                },
                {
                  "ex": "Pallof-Press mit Band im Halbkniestand",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Ausatmen beim Wegdrücken; Seite wechseln."
                },
                {
                  "ex": "Clamshell mit Band in Seitlage",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Becken bleibt gestapelt; Seite wechseln."
                },
                {
                  "ex": "Beckenheben mit Halten",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Oben 5 s halten, langsam abrollen."
                }
              ]
            },
            {
              "name": "Abschluss",
              "items": [
                {
                  "ex": "Kindhaltung mit Atmung",
                  "mode": "time",
                  "work": 90,
                  "rest": 0,
                  "sets": 1,
                  "cue": "In den Rücken atmen, Beckenboden lösen."
                },
                {
                  "ex": "Narbenmobilisation (nur nach Kaiserschnitt, verheilt)",
                  "mode": "time",
                  "work": 120,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Haut um die Narbe sanft in alle Richtungen verschieben, schmerzfrei.",
                  "avoid_if": "Narbe noch offen, gerötet oder schmerzhaft."
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "pp2",
      "title": "Zurück ins Training (ab 12 Wochen)",
      "weeks": [
        12,
        52
      ],
      "focus": "Kraft progressiv steigern, Belastbarkeit für Laufen und Springen testen und aufbauen.",
      "notes": [
        "Laufen frühestens ab ca. 3 Monaten nach der Geburt und nur bei bestandenem Belastungstest; Laufen mit Kinderwagen frühestens ab ca. 6–9 Monaten.",
        "Krafttraining 2–3x/Woche mit allmählich steigenden Gewichten; Ziel wieder 150 Minuten Aktivität pro Woche.",
        "Klassische Crunches/Curl-ups sind nicht grundsätzlich verboten – einbauen, wenn sie ohne Doming, Druck nach unten und Schmerzen gelingen.",
        "Risikofaktoren für Probleme beim Wiedereinstieg: Kaiserschnitt, Damm-Verletzungen, Stillen mit Schlafmangel, frühere Inkontinenz, hoher Druck zurück zur Leistung – dann langsamer steigern und Physio einbeziehen.",
        "Bei Beschwerden: Beckenboden-Physiotherapie statt Durchhalten."
      ],
      "csection_notes": [
        "Die Bauchfaszie erreicht erst nach 6–7 Monaten ca. 73–93 % ihrer ursprünglichen Reißfestigkeit – Rumpf- und Impact-Belastungen nach Kaiserschnitt besonders schrittweise steigern.",
        "Narbe weiter mobilisieren, falls sie verklebt oder empfindlich ist.",
        "Kaiserschnitt ist ein Risikofaktor für Probleme beim Wiedereinstieg ins Laufen: Belastungstest besonders genau nehmen."
      ],
      "return_to_running_criteria": [
        "Frühestens ca. 12 Wochen nach der Geburt und nach unauffälliger Nachsorge.",
        "Keine Symptome: keine Urin- oder Stuhlinkontinenz, kein schwer aufschiebbarer Harn-/Stuhldrang, kein Schwere-, Druck- oder Senkungsgefühl, keine Schmerzen beim Geschlechtsverkehr, keine lumbopelvinen Schmerzen.",
        "Keine deutliche Rektusdiastase-Problematik (kein Doming, gute Rumpffunktion).",
        "Belastungstest ohne Schmerzen, Schweregefühl oder Urinverlust: 30 min zügig gehen, 10 s Einbeinstand, 10 einbeinige Kniebeugen je Seite, 1 min Joggen auf der Stelle, 10 Sprünge vorwärts, 10 Hüpfer je Bein, 10x einbeiniger Running Man je Seite.",
        "Krafttest – Ziel jeweils 20 Wiederholungen je Seite: einbeiniges Wadenheben, einbeinige Brücke, einbeiniges Aufstehen vom Stuhl, seitliches Beinheben in Seitlage.",
        "Kaiserschnittnarbe verheilt und gut verschieblich; Erholung, Schlaf und Energie ausreichend.",
        "Dann stufenweise starten (z. B. Gehen-Laufen-Intervalle) und bei Symptomen eine Stufe zurück."
      ],
      "plans": [
        {
          "id": "pp2a",
          "name": "Ganzkörper-Kraft Aufbau",
          "minutes": 29,
          "level": "mittel",
          "equipment": [
            "Matte",
            "Kurzhanteln",
            "Widerstandsband",
            "Stuhl"
          ],
          "blocks": [
            {
              "name": "Aufwärmen",
              "items": [
                {
                  "ex": "Marschieren mit Armkreisen",
                  "mode": "time",
                  "work": 120,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Tempo langsam steigern."
                },
                {
                  "ex": "Kniebeuge und Hip Hinge ohne Gewicht",
                  "mode": "time",
                  "work": 60,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Im Wechsel, sauber und ruhig."
                }
              ]
            },
            {
              "name": "Hauptteil (Zirkel, 3 Runden)",
              "items": [
                {
                  "ex": "Goblet-Kniebeuge",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Ausatmen beim Hochkommen, Beckenboden mitnehmen."
                },
                {
                  "ex": "Rumänisches Kreuzheben",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Hüfte nach hinten, Hanteln nah am Bein."
                },
                {
                  "ex": "Ausfallschritt rückwärts im Wechsel",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Kontrolliert, Knie stabil über dem Fuß."
                },
                {
                  "ex": "Vorgebeugtes Rudern mit Kurzhanteln",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Rücken lang, Ellbogen nach hinten."
                },
                {
                  "ex": "Liegestütz (erhöht oder auf den Knien)",
                  "mode": "time",
                  "work": 30,
                  "rest": 30,
                  "sets": 3,
                  "cue": "Nur so tief, wie der Bauch flach bleibt."
                },
                {
                  "ex": "Schulterdrücken im Stand",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 3,
                  "cue": "Rippen unten, Po leicht anspannen."
                }
              ]
            },
            {
              "name": "Rumpf",
              "items": [
                {
                  "ex": "Dead Bug",
                  "mode": "time",
                  "work": 40,
                  "rest": 20,
                  "sets": 2,
                  "cue": "Gegenarm und -bein strecken, unterer Rücken bleibt ruhig.",
                  "avoid_if": "Doming oder Druck nach unten – dann Vorstufe mit Fußtippen."
                },
                {
                  "ex": "Unterarmstütz erhöht oder auf Knien",
                  "mode": "time",
                  "work": 25,
                  "rest": 35,
                  "sets": 2,
                  "cue": "Erst erhöht, auf den Boden erst wenn ohne Doming möglich."
                },
                {
                  "ex": "Seitstütz (Knie oder Füße)",
                  "mode": "time",
                  "work": 25,
                  "rest": 35,
                  "sets": 2,
                  "cue": "Pro Satz Seite wechseln."
                }
              ]
            },
            {
              "name": "Abschluss",
              "items": [
                {
                  "ex": "Atmung und Dehnen",
                  "mode": "time",
                  "work": 120,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Hüftbeuger, Brust, Waden – ruhig ausatmen."
                }
              ]
            }
          ]
        },
        {
          "id": "pp2b",
          "name": "Laufvorbereitung & Belastungstest",
          "minutes": 26,
          "level": "mittel",
          "equipment": [
            "Matte",
            "Stuhl"
          ],
          "blocks": [
            {
              "name": "Aufwärmen",
              "items": [
                {
                  "ex": "Zügiges Gehen oder Marschieren",
                  "mode": "time",
                  "work": 180,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Warm werden, Beckenboden wahrnehmen."
                }
              ]
            },
            {
              "name": "Kraft einbeinig",
              "items": [
                {
                  "ex": "Einbeiniges Wadenheben",
                  "mode": "reps",
                  "rest": 30,
                  "sets": 2,
                  "reps": 15,
                  "cue": "An der Wand halten, volle Höhe; Seite wechseln."
                },
                {
                  "ex": "Einbeinige Brücke",
                  "mode": "reps",
                  "rest": 30,
                  "sets": 2,
                  "reps": 12,
                  "cue": "Becken bleibt waagerecht; Seite wechseln."
                },
                {
                  "ex": "Einbeiniges Aufstehen vom Stuhl",
                  "mode": "reps",
                  "rest": 30,
                  "sets": 2,
                  "reps": 10,
                  "cue": "Knie stabil über dem Fuß; Seite wechseln."
                },
                {
                  "ex": "Seitliches Beinheben in Seitlage",
                  "mode": "reps",
                  "rest": 30,
                  "sets": 2,
                  "reps": 15,
                  "cue": "Bein leicht nach hinten; Seite wechseln."
                }
              ]
            },
            {
              "name": "Impact-Vorbereitung (nur wenn symptomfrei)",
              "items": [
                {
                  "ex": "Einbeinstand",
                  "mode": "time",
                  "work": 20,
                  "rest": 10,
                  "sets": 2,
                  "cue": "Pro Satz Seite wechseln, ruhig stehen."
                },
                {
                  "ex": "Einbeiniger Running Man",
                  "mode": "time",
                  "work": 30,
                  "rest": 30,
                  "sets": 2,
                  "cue": "Gegenarm und Knie im Laufrhythmus; Seite wechseln."
                },
                {
                  "ex": "Joggen auf der Stelle",
                  "mode": "time",
                  "work": 60,
                  "rest": 60,
                  "sets": 2,
                  "cue": "Leicht und leise landen.",
                  "avoid_if": "Urinverlust, Schwere- oder Druckgefühl – abbrechen."
                },
                {
                  "ex": "Hüpfen auf der Stelle",
                  "mode": "reps",
                  "rest": 45,
                  "sets": 2,
                  "reps": 10,
                  "cue": "Klein und federnd, beidbeinig beginnen.",
                  "avoid_if": "Urinverlust, Schwere- oder Druckgefühl – abbrechen."
                },
                {
                  "ex": "Sprünge vorwärts",
                  "mode": "reps",
                  "rest": 45,
                  "sets": 1,
                  "reps": 10,
                  "cue": "Weich landen, Knie über den Füßen.",
                  "avoid_if": "Urinverlust, Schwere- oder Druckgefühl – abbrechen."
                }
              ]
            },
            {
              "name": "Abschluss",
              "items": [
                {
                  "ex": "Beckenboden lösen in Kindhaltung",
                  "mode": "time",
                  "work": 90,
                  "rest": 0,
                  "sets": 1,
                  "cue": "Nach Impact bewusst loslassen und atmen."
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

/** @type {import('../domain/timer.js').HomePlan[]} */
export const BEGIN = [
  {
    "id": "b1",
    "name": "10 Minuten ohne Geräte",
    "minutes": 10,
    "level": "leicht",
    "equipment": [
      "nichts"
    ],
    "blocks": [
      {
        "name": "Aufwärmen",
        "items": [
          {
            "ex": "Marschieren auf der Stelle",
            "mode": "time",
            "work": 60,
            "rest": 0,
            "sets": 1,
            "cue": "Arme mitschwingen, locker atmen."
          }
        ]
      },
      {
        "name": "Hauptteil (Zirkel, 2 Runden)",
        "items": [
          {
            "ex": "Kniebeugen",
            "mode": "time",
            "work": 40,
            "rest": 20,
            "sets": 2,
            "cue": "Po nach hinten, Fersen bleiben am Boden."
          },
          {
            "ex": "Liegestütz an der Wand oder auf den Knien",
            "mode": "time",
            "work": 40,
            "rest": 20,
            "sets": 2,
            "cue": "Körper eine Linie, langsam runter."
          },
          {
            "ex": "Ausfallschritt rückwärts im Wechsel",
            "mode": "time",
            "work": 40,
            "rest": 20,
            "sets": 2,
            "cue": "Kleiner Schritt, Knie stabil über dem Fuß."
          },
          {
            "ex": "Beckenheben",
            "mode": "time",
            "work": 40,
            "rest": 20,
            "sets": 2,
            "cue": "Fersen drücken, Po oben kurz anspannen."
          },
          {
            "ex": "Unterarmstütz auf den Knien",
            "mode": "time",
            "work": 30,
            "rest": 20,
            "sets": 2,
            "cue": "Bauch fest, ruhig weiteratmen."
          }
        ]
      },
      {
        "name": "Abschluss",
        "items": [
          {
            "ex": "Lockern und dehnen",
            "mode": "time",
            "work": 60,
            "rest": 0,
            "sets": 1,
            "cue": "Was gut tut, ganz ohne Federn."
          }
        ]
      }
    ]
  },
  {
    "id": "b2",
    "name": "Rücken & Beweglichkeit (8 Min.)",
    "minutes": 8,
    "level": "leicht",
    "equipment": [
      "Matte"
    ],
    "blocks": [
      {
        "name": "Mobilität",
        "items": [
          {
            "ex": "Katze-Kuh",
            "mode": "time",
            "work": 45,
            "rest": 15,
            "sets": 1,
            "cue": "Wirbel für Wirbel, mit dem Atem."
          },
          {
            "ex": "Brustwirbelsäulen-Rotation im Vierfüßler",
            "mode": "time",
            "work": 60,
            "rest": 15,
            "sets": 1,
            "cue": "Seite in der Hälfte wechseln."
          },
          {
            "ex": "Hüftbeuger-Dehnung im Halbkniestand",
            "mode": "time",
            "work": 60,
            "rest": 15,
            "sets": 1,
            "cue": "Seite in der Hälfte wechseln."
          },
          {
            "ex": "Bird-Dog",
            "mode": "time",
            "work": 45,
            "rest": 15,
            "sets": 2,
            "cue": "Arm und Gegenbein lang, Becken ruhig."
          },
          {
            "ex": "Kindhaltung",
            "mode": "time",
            "work": 60,
            "rest": 0,
            "sets": 1,
            "cue": "In den Rücken atmen."
          }
        ]
      }
    ]
  }
];
