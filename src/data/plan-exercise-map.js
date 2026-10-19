/**
 * Allgemeine Plan-Übungen (`g_…` aus data/plans.js) → Bibliothek.
 *
 * - `exact: true`: Es gibt dieselbe Übung in der Bibliothek. Beim Übernehmen eines Plans
 *   (toLibraryPlans) wird die Id ersetzt, Verlauf und Bestleistungen laufen dann dort weiter.
 * - `exact: false`: nur eine nahe Verwandte (`to`, `null` = keine). Die Übung behält ihre
 *   `g_`-Id, damit ihr Verlauf nicht mit einer anderen Übung vermischt wird; die Bibliothek
 *   führt sie als eigene Übung mit Namen, Muskeln und Bewegungsmuster aus dem Plan und den
 *   Hinweisen unten. Die Tabelle steht auch in docs/TRAININGSPLAENE.md (Abschnitt 4).
 */

/** @typedef {{to: string|null, exact: boolean, cues?: string[]}} PlanExerciseLink */

/** @type {Readonly<Record<string, PlanExerciseLink>>} */
export const G_MAP = Object.freeze({
  g_inclinedb: { to: 'db279', exact: true }, // Schrägbankdrücken mit Kurzhanteln
  g_inclinepush: { to: 'db282', exact: true }, // Schräge Liegestütze
  g_dbfly: { to: 'db186', exact: true }, // Kurzhantel-Flys
  g_bandpull: { to: 'db29', exact: true }, // Band Pull Apart
  g_lyinglat: { to: 'db361', exact: true }, // Einarmiges Seitheben liegend
  g_inclinecurl: { to: 'db276', exact: true }, // Schrägbank-Kurzhantelcurls
  g_deadbug: { to: 'db154', exact: true }, // Dead Bug
  g_sideplank: { to: 'db520', exact: true }, // Seitstütz
  g_bandpulldown: {
    to: 'latpull', exact: false,
    cues: ['Band oben sicher befestigen', 'Ellbogen zur Hüfte ziehen, Brust bleibt offen', 'Langsam nach oben zurück, bis die Arme lang sind'],
  },
  g_proneytw: {
    to: 'db362', exact: false,
    cues: ['Bauchlage, Stirn auf einem Handtuch', 'Arme als Y, T und W anheben, Daumen zeigen nach oben', 'Schulterblätter sanft zusammen, Nacken lang'],
  },
  g_bandpushdown: {
    to: 'pushdown', exact: false,
    cues: ['Band oben befestigen, Ellbogen am Körper', 'Unterarme nach unten strecken', 'Kontrolliert zurück, Schultern bleiben unten'],
  },
  g_bulgarian: {
    to: 'db573', exact: false,
    cues: ['Hinterer Fuß auf einer Bank oder einem Stuhl', 'Senkrecht absenken, vorderes Knie über dem Fuß', 'Aus der vorderen Ferse hochdrücken'],
  },
  g_boxsquat: {
    to: 'db79', exact: false,
    cues: ['Stuhl oder Box hinter dir', 'Hüfte nach hinten, kurz antippen, nicht absacken', 'Aus den Fersen aufstehen'],
  },
  g_dbrdl: {
    to: 'db615', exact: false,
    cues: ['Knie leicht gebeugt, Rücken lang', 'Hanteln eng an den Beinen nach unten schieben', 'Dehnung hinten spüren, dann Hüfte nach vorn'],
  },
  g_goodmorning: {
    to: 'db250', exact: false,
    cues: ['Hände an den Hinterkopf oder vor die Brust', 'Hüfte nach hinten schieben, Rücken bleibt gerade', 'Mit dem Po zurück in den Stand'],
  },
  g_sliderhamcurl: {
    to: 'db24', exact: false,
    cues: ['Rückenlage, Fersen auf Tüchern, Becken hoch', 'Fersen langsam wegschieben', 'Mit den Fersen zurückziehen, Becken bleibt oben'],
  },
  g_bridgemarch: {
    to: 'bridge', exact: false,
    cues: ['Becken anheben und dort halten', 'Abwechselnd ein Knie Richtung Brust heben', 'Becken bleibt ruhig und waagrecht'],
  },
  g_birddog: {
    to: null, exact: false,
    cues: ['Vierfüßlerstand, Rücken wie ein Tisch', 'Gegenüberliegenden Arm und Bein lang machen', 'Kurz halten, ruhig atmen, Seite wechseln'],
  },
  g_catcow: {
    to: null, exact: false,
    cues: ['Vierfüßlerstand, Hände unter den Schultern', 'Ausatmen: Rücken rund wie eine Katze', 'Einatmen: Brust nach vorn, Blick leicht hoch'],
  },
  g_thoracic: {
    to: null, exact: false,
    cues: ['Vierfüßlerstand, eine Hand an den Hinterkopf', 'Ellbogen zur Decke aufdrehen, Blick folgt', 'Langsam zurück, Becken bleibt ruhig'],
  },
  g_hipflexor: {
    to: null, exact: false,
    cues: ['Halbkniestand, hinteres Knie weich gepolstert', 'Po anspannen, Becken leicht nach vorn schieben', 'Dehnung vorn an der Hüfte halten, ruhig atmen'],
  },
  g_childpose: {
    to: null, exact: false,
    cues: ['Knie auseinander, Po Richtung Fersen', 'Arme lang nach vorn, Stirn ablegen', 'In den Rücken atmen und loslassen'],
  },
});

/**
 * Id, unter der eine Plan-Übung in der App geführt wird.
 * @param {string} id
 */
export const libraryIdFor = (id) => (G_MAP[id]?.exact ? /** @type {string} */ (G_MAP[id].to) : id);
