/**
 * Kuratierte Übungen (aus v1, SPEC 3.7.1): 72 Einträge mit deutschem Namen, Gerät, Muskeln
 * (erster = Hauptmuskel), Kabel-Aufsatz, „beliebt“ und drei kurzen deutschen Hinweisen.
 * `db` ist der Index der passenden Übung in der offenen Datenbank (exercise-db.js).
 * Erzeugt aus src/app.html (v1) – Inhalte bitte hier pflegen.
 */

/**
 * @typedef {object} CuratedExercise
 * @property {string} id
 * @property {string} name
 * @property {string} gear
 * @property {string[]} muscles
 * @property {string} [attachment]
 * @property {boolean} [pop]
 * @property {number} [db]
 * @property {string[]} [cues]
 */

/** @type {readonly CuratedExercise[]} */
export const CURATED = Object.freeze([
  {"id":"bench","name":"Bankdrücken","gear":"Langhantel","muscles":["chest","triceps","shoulders"],"pop":true,"db":33,"cues":["Schulterblätter zusammen, Füße fest","Stange zur unteren Brust ablassen","Ellbogen ca. 45°, nicht abfedern"]},
  {"id":"dbbench","name":"Kurzhantel-Bankdrücken","gear":"Kurzhanteln","muscles":["chest","triceps"],"db":181,"cues":["Schulterblätter zusammen","Hanteln seitlich zur Brust ablassen","Kontrolliert drücken, Füße fest"]},
  {"id":"pushup","name":"Liegestütze","gear":"Körpergewicht","muscles":["chest","triceps","shoulders"],"db":454,"cues":["Körper gerade wie ein Brett","Brust zum Boden ablassen","Ellbogen ca. 45° zum Körper"]},
  {"id":"fly","name":"Butterfly","gear":"Maschinen","muscles":["chest"],"pop":true,"db":90,"cues":["Ellbogen leicht gebeugt","Arme vor der Brust zusammenführen","Langsam öffnen, Dehnung kontrollieren"]},
  {"id":"cross","name":"Cable Crossover","gear":"Kabelzug","muscles":["chest"],"db":92,"cues":["Ellbogen leicht gebeugt","Griffe vor der Brust zusammenführen","Langsam öffnen, Brust raus"]},
  {"id":"pullup","name":"Klimmzüge","gear":"Klimmzugstange","muscles":["back","biceps"],"db":446,"cues":["Aus dem Hang, Schultern aktiv","Kinn über die Stange","Langsam ganz ablassen"]},
  {"id":"latpull","name":"Latzug","gear":"Kabelzug","muscles":["back","biceps"],"pop":true,"db":665,"cues":["Brust raus","Stange zur oberen Brust ziehen","Schulterblätter runter"]},
  {"id":"row1","name":"Langhantelrudern","gear":"Langhantel","muscles":["back","biceps"],"db":66,"cues":["Rücken gerade, Oberkörper vorgebeugt","Stange zum Bauchnabel ziehen","Schulterblätter zusammen, kein Schwung"]},
  {"id":"dbrow","name":"Einarmiges Rudern","gear":"Kurzhanteln","muscles":["back","biceps"],"db":384,"cues":["Rücken gerade, auf Bank stützen","Ellbogen nach hinten zur Hüfte","Schulterblatt zurück, kein Drehen"]},
  {"id":"seatrow","name":"Rudern am Gerät","gear":"Maschinen","muscles":["back"],"pop":true,"db":495,"cues":["Rücken gerade, Brust raus","Griff zum Bauch ziehen","Schulterblätter zusammen"]},
  {"id":"bandrow","name":"Rudern mit Band","gear":"Bänder","muscles":["back"]},
  {"id":"ohp","name":"Schulterdrücken","gear":"Kurzhanteln","muscles":["shoulders","triceps"],"db":202,"cues":["Rumpf fest, kein Hohlkreuz","Hanteln über Kopf drücken","Kontrolliert bis Ohrhöhe zurück"]},
  {"id":"lat","name":"Seitheben","gear":"Kurzhanteln","muscles":["shoulders"],"pop":true,"db":522,"cues":["Ellbogen leicht gebeugt","Bis Schulterhöhe heben","Kein Schwung"]},
  {"id":"face","name":"Face Pulls","gear":"Kabelzug","muscles":["shoulders","back"],"db":220,"cues":["Seil zum Gesicht ziehen","Ellbogen hoch, Hände nach außen","Schulterblätter zusammen, langsam zurück"]},
  {"id":"pike","name":"Pike-Liegestütze","gear":"Körpergewicht","muscles":["shoulders","triceps"]},
  {"id":"curl","name":"Bizepscurls","gear":"Kurzhanteln","muscles":["biceps"],"pop":true,"db":183,"cues":["Ellbogen fest am Körper","Ohne Schwung curlen","Langsam ganz ablassen"]},
  {"id":"hammer","name":"Hammercurls","gear":"Kurzhanteln","muscles":["biceps"],"db":254,"cues":["Daumen zeigt nach oben","Ellbogen am Körper","Ohne Schwung, langsam ab"]},
  {"id":"bandcurl","name":"Curls mit Band","gear":"Bänder","muscles":["biceps"]},
  {"id":"pushdown","name":"Trizepsdrücken am Kabel","gear":"Kabelzug","muscles":["triceps"],"pop":true,"db":638,"cues":["Ellbogen fest am Körper","Arme ganz strecken","Langsam zurück"]},
  {"id":"dips","name":"Dips","gear":"Körpergewicht","muscles":["triceps","chest"],"db":171,"cues":["Oberkörper aufrecht","Ellbogen eng am Körper","Nicht zu tief, Schultern tief"]},
  {"id":"french","name":"French Press","gear":"Kurzhanteln","muscles":["triceps"],"db":595,"cues":["Ellbogen eng am Kopf","Hantel hinter Kopf ablassen","Langsam strecken"]},
  {"id":"plank","name":"Unterarmstütz","gear":"Körpergewicht","muscles":["abs"],"db":428,"cues":["Körper gerade wie ein Brett","Bauch und Gesäß anspannen","Hüfte nicht absacken lassen"]},
  {"id":"crunch","name":"Crunches","gear":"Körpergewicht","muscles":["abs"],"db":152,"cues":["Hände locker am Kopf","Schultern vom Boden einrollen","Unterer Rücken am Boden, nicht ziehen"]},
  {"id":"hang","name":"Hängendes Beinheben","gear":"Klimmzugstange","muscles":["abs"],"db":262,"cues":["Nicht schwingen","Beine kontrolliert anheben","Langsam ablassen"]},
  {"id":"squat","name":"Kniebeugen","gear":"Langhantel","muscles":["quads","glutes"],"pop":true,"db":37,"cues":["Knie in Richtung Zehen","Rücken gerade, Brust raus","Fersen bleiben am Boden"]},
  {"id":"goblet","name":"Goblet Squat","gear":"Kurzhanteln","muscles":["quads","glutes"],"db":249,"cues":["Hantel vor der Brust","Ellbogen zwischen die Knie","Oberkörper aufrecht, tief beugen"]},
  {"id":"lunge","name":"Ausfallschritte","gear":"Körpergewicht","muscles":["quads","glutes"],"db":80,"cues":["Oberkörper aufrecht","Vorderes Knie über dem Fuß","Hinteres Knie fast zum Boden"]},
  {"id":"press","name":"Beinpresse","gear":"Maschinen","muscles":["quads","glutes"],"pop":true,"db":333,"cues":["Rücken fest am Polster","Knie nicht durchdrücken","Knie in Fußrichtung"]},
  {"id":"rdl","name":"Rumänisches Kreuzheben","gear":"Langhantel","muscles":["hams","glutes","lowerback"],"db":481,"cues":["Knie leicht gebeugt","Hüfte nach hinten, Stange am Bein","Rücken gerade, Dehnung hinten spüren"]},
  {"id":"dead","name":"Kreuzheben","gear":"Langhantel","muscles":["lowerback","hams","glutes","back"],"db":36,"cues":["Rücken gerade, Brust raus","Stange eng am Körper führen","Aus Beinen und Hüfte drücken"]},
  {"id":"legcurl","name":"Beinbeuger","gear":"Maschinen","muscles":["hams"],"pop":true,"db":359,"cues":["Hüfte fest auf Polster","Fersen zum Gesäß ziehen","Langsam ablassen"]},
  {"id":"hyper","name":"Hyperextensions","gear":"Körpergewicht","muscles":["lowerback","glutes"],"db":269,"cues":["Hüfte am Polsterrand","Rücken gerade absenken","Nicht überstrecken oben"]},
  {"id":"thrust","name":"Hip Thrust","gear":"Langhantel","muscles":["glutes","hams"],"db":41,"cues":["Schulterblätter auf der Bank","Fersen drücken, Hüfte ganz strecken","Oben Gesäß anspannen, Kinn leicht zur Brust"]},
  {"id":"bridge","name":"Glute Bridge","gear":"Körpergewicht","muscles":["glutes"],"db":89,"cues":["Fersen in den Boden drücken","Gesäß oben anspannen","Kein Hohlkreuz, kurz halten"]},
  {"id":"calf","name":"Wadenheben","gear":"Körpergewicht","muscles":["calves"],"db":589,"cues":["Aufrecht stehen","Hoch auf die Fußballen","Langsam ablassen"]},
  {"id":"chestpress","name":"Brustpresse","gear":"Maschinen","muscles":["chest","triceps"],"pop":true,"db":366,"cues":["Schulterblätter zusammen","Griffe nach vorn drücken","Langsam zurück"]},
  {"id":"shoulderpress","name":"Schulterpresse","gear":"Maschinen","muscles":["shoulders","triceps"],"pop":true,"db":369,"cues":["Rücken fest an der Lehne","Griffe über Kopf drücken","Langsam zurück"]},
  {"id":"legext","name":"Beinstrecker","gear":"Maschinen","muscles":["quads"],"pop":true,"db":331,"cues":["Rücken fest an der Lehne","Beine ganz strecken","Langsam ablassen"]},
  {"id":"abductor","name":"Abduktoren","gear":"Maschinen","muscles":["glutes"],"db":632,"cues":["Aufrecht sitzen","Beine nach außen drücken","Langsam zurück"]},
  {"id":"abmachine","name":"Bauchmaschine","gear":"Maschinen","muscles":["abs"],"db":1,"cues":["Bauch aktiv einrollen, nicht ziehen","Nacken locker, Blick nach vorn","Langsam zurück, Gewicht nicht absetzen"]},
  {"id":"calfmachine","name":"Wadenmaschine","gear":"Maschinen","muscles":["calves"],"db":497,"cues":["Hoch auf die Fußballen","Oben kurz halten","Unten volle Dehnung"]},
  {"id":"smithsquat","name":"Kniebeugen an der Multipresse","gear":"Maschinen","muscles":["quads","glutes"],"db":554,"cues":["Füße leicht vor der Stange","Rücken gerade","Tief beugen, Fersen am Boden"]},
  {"id":"reversefly","name":"Reverse Butterfly","gear":"Maschinen","muscles":["shoulders","back"],"db":473,"cues":["Brust am Polster","Arme nach hinten führen","Schulterblätter zusammen"]},
  {"id":"backext","name":"Rückenstrecker-Maschine","gear":"Maschinen","muscles":["lowerback"],"db":269,"cues":["Hüfte am Polsterrand","Rücken gerade absenken","Nicht überstrecken oben"]},
  {"id":"cablecurl","name":"Curls am Kabel","gear":"Kabelzug","muscles":["biceps"],"db":584,"cues":["Ellbogen fest am Körper","Griff zur Schulter curlen","Langsam zurück"]},
  {"id":"k_crosshigh","name":"Kabel-Crossover von oben","gear":"Kabelzug","muscles":["chest","shoulders"],"attachment":"Einzelgriff","pop":true,"db":92,"cues":["Ellbogen leicht gebeugt","Griffe vor der Brust zusammenführen","Langsam öffnen, Brust raus"]},
  {"id":"k_crosslow","name":"Kabel-Crossover von unten","gear":"Kabelzug","muscles":["chest","shoulders"],"attachment":"Einzelgriff","db":345,"cues":["Ellbogen leicht gebeugt","Griffe nach oben zusammenführen","Langsam zurück"]},
  {"id":"k_flyflat","name":"Kabel-Fliegende auf der Bank","gear":"Kabelzug","muscles":["chest"],"attachment":"Einzelgriff","db":223,"cues":["Ellbogen leicht gebeugt","Griffe über der Brust zusammenführen","Langsam öffnen"]},
  {"id":"k_cpress","name":"Brustpresse am Kabel","gear":"Kabelzug","muscles":["chest","triceps"],"attachment":"Einzelgriff","db":586,"cues":["Rumpf fest","Griffe nach vorn drücken","Langsam zurück"]},
  {"id":"k_row","name":"Kabelrudern sitzend","gear":"Kabelzug","muscles":["back","biceps"],"attachment":"V-Griff","pop":true,"db":495,"cues":["Rücken gerade, Brust raus","Griff zum Bauch ziehen","Schulterblätter zusammen"]},
  {"id":"k_row1","name":"Einarmiges Kabelrudern","gear":"Kabelzug","muscles":["back","biceps"],"attachment":"Einzelgriff","db":511,"cues":["Rücken gerade","Ellbogen nach hinten ziehen","Langsam zurück, kein Drehen"]},
  {"id":"k_straight","name":"Überzüge am Kabel","gear":"Kabelzug","muscles":["back"],"attachment":"Seil","pop":true,"db":485,"cues":["Arme fast gestreckt","Seil zu den Oberschenkeln ziehen","Lat anspannen, langsam zurück"]},
  {"id":"k_latclose","name":"Latzug eng","gear":"Kabelzug","muscles":["back","biceps"],"attachment":"V-Griff","db":651,"cues":["Brust raus","Griff zur Brust ziehen","Langsam zurück"]},
  {"id":"k_ropepush","name":"Trizepsdrücken mit Seil","gear":"Kabelzug","muscles":["triceps"],"attachment":"Seil","pop":true,"db":639,"cues":["Ellbogen am Körper","Seil unten auseinanderziehen","Langsam zurück"]},
  {"id":"k_overhead","name":"Trizepsstrecken über Kopf","gear":"Kabelzug","muscles":["triceps"],"attachment":"Seil","pop":true,"db":107,"cues":["Ellbogen eng am Kopf","Seil über Kopf ganz strecken","Rumpf fest, kein Hohlkreuz"]},
  {"id":"k_lat","name":"Seitheben am Kabel","gear":"Kabelzug","muscles":["shoulders"],"attachment":"Einzelgriff","pop":true,"db":111,"cues":["Ellbogen leicht gebeugt","Nur bis Schulterhöhe heben","Langsam ablassen, kein Schwung"]},
  {"id":"k_front","name":"Frontheben am Kabel","gear":"Kabelzug","muscles":["shoulders"],"attachment":"Stange","db":237,"cues":["Arm fast gestreckt","Bis Schulterhöhe heben","Langsam ablassen, kein Schwung"]},
  {"id":"k_rear","name":"Reverse Fly am Kabel","gear":"Kabelzug","muscles":["shoulders","back"],"attachment":"Einzelgriff","db":105,"cues":["Arme fast gestreckt","Griffe seitlich nach hinten ziehen","Schulterblätter zusammen, langsam zurück"]},
  {"id":"k_upright","name":"Aufrechtes Rudern am Kabel","gear":"Kabelzug","muscles":["shoulders","back"],"attachment":"Stange","db":649,"cues":["Griff nah am Körper","Ellbogen hoch","Nicht über Schulterhöhe"]},
  {"id":"k_shrug","name":"Shrugs am Kabel","gear":"Kabelzug","muscles":["back"],"attachment":"Stange","db":113,"cues":["Arme gestreckt lassen","Schultern gerade zu den Ohren","Oben halten, langsam ablassen"]},
  {"id":"k_hammer","name":"Hammercurls am Seil","gear":"Kabelzug","muscles":["biceps","forearms"],"attachment":"Seil","pop":true,"db":95,"cues":["Ellbogen fest am Körper","Seil zur Schulter curlen","Langsam ablassen, kein Schwung"]},
  {"id":"k_bayes","name":"Bizepscurls hinter dem Körper","gear":"Kabelzug","muscles":["biceps"],"attachment":"Einzelgriff","db":604,"cues":["Ellbogen fest am Körper","Griff zur Schulter curlen","Langsam zurück"]},
  {"id":"k_crunch","name":"Kabel-Crunch kniend","gear":"Kabelzug","muscles":["abs"],"attachment":"Seil","pop":true,"db":93,"cues":["Hüfte bleibt fixiert","Aus dem Bauch einrollen","Nicht mit Armen ziehen"]},
  {"id":"k_wood","name":"Holzhacker am Kabel","gear":"Kabelzug","muscles":["abs"],"attachment":"Einzelgriff","db":588,"cues":["Rumpf drehen, Arme gestreckt","Diagonal nach unten ziehen","Hüfte mitdrehen"]},
  {"id":"k_pallof","name":"Pallof Press","gear":"Kabelzug","muscles":["abs"],"attachment":"Einzelgriff","db":419,"cues":["Rumpf fest, nicht drehen","Griff gerade nach vorn drücken","Kurz halten, langsam zurück"]},
  {"id":"k_through","name":"Pull Through am Kabel","gear":"Kabelzug","muscles":["glutes","hams"],"attachment":"Seil","db":445,"cues":["Hüfte weit nach hinten","Arme gestreckt lassen","Hüfte nach vorn strecken"]},
  {"id":"k_kick","name":"Kickbacks am Kabel","gear":"Kabelzug","muscles":["glutes"],"attachment":"Fußschlaufe","pop":true,"db":406,"cues":["Rumpf fest, festhalten","Bein nach hinten strecken","Kein Hohlkreuz"]},
  {"id":"k_abd","name":"Abduktion am Kabel","gear":"Kabelzug","muscles":["glutes"],"attachment":"Fußschlaufe","db":96,"cues":["Aufrecht stehen, festhalten","Bein über die Mitte ziehen","Langsam zurück, kein Schwung"]},
  {"id":"k_add","name":"Adduktion am Kabel","gear":"Kabelzug","muscles":["quads"],"attachment":"Fußschlaufe","db":96,"cues":["Aufrecht stehen, festhalten","Bein über die Mitte ziehen","Langsam zurück, kein Schwung"]},
  {"id":"k_wrist","name":"Unterarmcurls am Kabel","gear":"Kabelzug","muscles":["forearms"],"attachment":"Stange","db":114,"cues":["Unterarme aufgelegt","Nur Handgelenk bewegen","Volle Bewegung, langsam"]},
  {"id":"k_dbwrist","name":"Unterarmcurls","gear":"Kurzhanteln","muscles":["forearms"],"db":424,"cues":["Unterarme aufgelegt","Handgelenk hoch beugen","Langsam ablassen"]},
  {"id":"k_farmer","name":"Farmer's Walk","gear":"Kurzhanteln","muscles":["forearms","back"],"pop":true,"db":221,"cues":["Aufrecht gehen, Schultern tief","Griff fest, Rumpf angespannt","Kurze, kontrollierte Schritte"]},
]);

/** Favoriten, bevor jemand selbst welche setzt (SPEC 3.7.1). */
export const DEFAULT_FAVORITES = Object.freeze(['latpull', 'chestpress', 'press']);

/** Kabel-Aufsätze und Rollenhöhen (SPEC 3.9.11). */
export const ATTACHMENTS = Object.freeze(['Stange', 'Seil', 'V-Griff', 'Einzelgriff', 'Lat-Stange', 'Fußschlaufe']);
export const HEIGHTS = Object.freeze(['hoch', 'mittel', 'tief']);
