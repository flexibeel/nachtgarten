/**
 * Sicherheitshinweise für Schwangerschaft & Rückbildung (aus v1 übernommen).
 * Inhalt beruht auf internationalen Leitlinien (Zusammenfassung aus v1, unverändert).
 * Die Trainingspläne selbst folgen in data/mama-plans.js.
 */

export const MAMA_DISCLAIMER =
  'Bitte sprich vor dem Start (und bei jeder Änderung im Verlauf) mit deiner Frauenärztin, deinem Frauenarzt oder deiner Hebamme, ob es medizinische Gründe gegen Training gibt. Diese Pläne beruhen auf internationalen Leitlinien, ersetzen aber keine individuelle Beratung oder Untersuchung. Hör auf deinen Körper: Bei Warnzeichen sofort aufhören und ärztlich abklären lassen.';

/** Warnzeichen: sofort aufhören und ärztlich abklären lassen. */
export const MAMA_STOP_SIGNS = Object.freeze([
  'Vaginale Blutung',
  'Regelmäßige, schmerzhafte Wehen/Kontraktionen',
  'Abgang von Fruchtwasser bzw. anhaltender Flüssigkeitsverlust aus der Scheide',
  'Atemnot schon vor der Belastung oder übermäßige Atemnot, die sich in Ruhe nicht bessert',
  'Brustschmerz',
  'Schwindel oder Ohnmachtsgefühl, das sich in Ruhe nicht bessert',
  'Kopfschmerzen (v. a. neu und stark, ggf. mit Sehstörungen)',
  'Muskelschwäche, die das Gleichgewicht beeinträchtigt',
  'Wadenschmerz oder -schwellung (Thrombose ausschließen)',
  'Nachlassende Kindsbewegungen',
  'Nach der Geburt: Wochenfluss wird wieder stärker oder hellrot',
  'Nach der Geburt: Schwere-, Druck- oder Fremdkörpergefühl im Becken, neue Inkontinenz',
  'Nach der Geburt: Schmerzen, Rötung, Nässen an Kaiserschnitt- oder Dammnaht, Fieber',
  'Nach der Geburt: deutliche Vorwölbung (Doming) in der Bauchmitte bei Belastung – Übung abbrechen und anpassen'
]);

/** Gründe, die gegen Training sprechen (vorher unbedingt ärztlich klären). */
export const MAMA_CONTRAINDICATIONS = Object.freeze({
  absolute: Object.freeze([
    'Blasensprung (vorzeitiger Blasensprung)',
    'Vorzeitige Wehen in der aktuellen Schwangerschaft',
    'Anhaltende oder ungeklärte vaginale Blutung (v. a. 2./3. Trimester)',
    'Placenta praevia ab ca. 26.–28. SSW',
    'Präeklampsie bzw. schwangerschaftsinduzierte Hypertonie',
    'Zervixinsuffizienz bzw. Cerclage',
    'Intrauterine Wachstumsrestriktion',
    'Höhergradige Mehrlingsschwangerschaft (z. B. Drillinge) bzw. Mehrlinge mit Frühgeburtsrisiko',
    'Unkontrollierter Typ-1-Diabetes, unkontrollierte Hypertonie oder unkontrollierte Schilddrüsenerkrankung',
    'Hämodynamisch relevante Herzerkrankung oder restriktive Lungenerkrankung',
    'Schwere Anämie',
    'Andere schwere kardiovaskuläre, respiratorische oder systemische Erkrankung'
  ]),
  relative: Object.freeze([
    'Wiederholte Fehlgeburten (habituelle Aborte)',
    'Gestationshypertonie',
    'Spontane Frühgeburt in der Vorgeschichte',
    'Leichte bis mittelgradige Herz- oder Lungenerkrankung (z. B. chronische Bronchitis)',
    'Symptomatische Anämie',
    'Nicht abgeklärte mütterliche Herzrhythmusstörung',
    'Mangelernährung, Essstörung oder extremes Untergewicht',
    'Extreme Adipositas oder bisher extrem inaktiver Lebensstil (dann sehr langsam beginnen)',
    'Zwillingsschwangerschaft ab 28. SSW',
    'Schlecht eingestellte Epilepsie, Hyperthyreose oder Typ-1-Diabetes',
    'Orthopädische Einschränkungen',
    'Starkes Rauchen',
    'Andere relevante Erkrankungen – moderates bis intensives Training vorher individuell besprechen'
  ]),
});
