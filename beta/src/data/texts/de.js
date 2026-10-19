/**
 * Deutsche Texte zu den Schlüsseln, die die Domain-Logik liefert.
 * Platzhalter in {geschweiften Klammern}; Zahlen werden deutsch formatiert.
 */

import { fillTemplate } from '../../core/format.js';

export const TEXTS = Object.freeze({
  'progression.bodyweightLoad':
    'Letztes Mal alle Sätze mit {hi} oder mehr Wdh. Heute mit Zusatzgewicht oder einer schwereren Variante.',
  'progression.bodyweightRep': 'Ziel heute: +1 Wiederholung (Bereich {lo}–{hi}).',
  'progression.jumpAfterOvershoot':
    'Schon {reps} Wdh. mit {weight} kg. Zeit für die nächste Stufe: +{step} kg, dafür wieder ab {lo} Wdh.',
  'progression.repBeforeBigJump':
    'Oben angekommen ({hi} Wdh.). +{step} kg wären {percent} % mehr. Lieber erst +1 Wdh. mit {weight} kg, oder eine kleinere Stufe wählen, falls dein Gerät eine hat.',
  'progression.addWeight': 'Oben angekommen ({hi} Wdh.). Heute +{step} kg, dafür ab {lo} Wdh.',
  'progression.lighter': 'Unter deinem Bereich ({lo}–{hi} Wdh.). Heute etwas leichter.',
  'progression.addRep': 'Gleiches Gewicht, Ziel: +1 Wdh. (Bereich {lo}–{hi}).',

  'set.invalidWeight': 'Gewicht bitte zwischen 0 und 500 kg.',
  'set.invalidReps': 'Wiederholungen bitte als ganze Zahl von 1 bis 100.',

  'week.done': 'Wochenziel geschafft. Stark.',
  'week.remainingOne': 'Noch 1 Trainingstag bis zu deinem Wochenziel.',
  'week.remaining': 'Noch {left} Trainingstage bis zu deinem Wochenziel.',
  'week.start': 'Die Woche gehört dir.',

  'greeting.morning': 'Guten Morgen',
  'greeting.day': 'Hallo',
  'greeting.evening': 'Guten Abend',
  'greeting.night': 'Gute Nacht',

  'mama.noDate': 'Trag bitte ein Datum ein.',
  'mama.dueTooFar': 'Der Termin liegt mehr als 40 Wochen in der Zukunft.',
  'mama.dueLongPast': 'Der Termin ist schon über 6 Wochen her. Ist dein Baby schon da?',
  'mama.birthInFuture': 'Das Geburtsdatum liegt in der Zukunft.',
  'mama.birthTooOld': 'Die Rückbildungspläne reichen etwa ein Jahr nach der Geburt.',

  'habit.empty': 'Tipp auf heute, wenn du es gemacht hast.',
  'habit.count': '{count} von 7 Tagen diese Woche. Ausrutscher sind okay.',
  'habit.comeback': 'Comeback. Genau so geht’s.',
  'habit.restart': 'Kleiner Neustart: Heute reicht auch eine Mini-Version.',
  'habit.missedYesterday': 'Gestern war Pause. Heute zählt wieder.',
  'habit.noAnchor': 'Wann genau? Leg einen festen Moment fest.',

  'backup.notJson': 'Die Datei ist keine gültige Sicherung.',
  'backup.notNachtgarten': 'Die Datei ist keine Nachtgarten-Sicherung.',
  'backup.tooNew': 'Diese Sicherung stammt aus einer neueren App-Version.',
  'backup.invalidData': 'Die Sicherung ist beschädigt.',
});

/**
 * Text zu einem Schlüssel. Unbekannte Schlüssel werden unverändert zurückgegeben.
 * @param {string} key
 * @param {Record<string, unknown>} [params]
 */
export function text(key, params) {
  const template = TEXTS[key];
  return template === undefined ? key : fillTemplate(template, params);
}
