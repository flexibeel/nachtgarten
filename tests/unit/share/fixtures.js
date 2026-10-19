/**
 * Beispieldaten für die Teilen-Vorlagen: Abendlauf um die Außenalster (Hamburg),
 * Beintag und Push-Tag. Die Route ist erzeugt (Stützpunkte am Ufer, Catmull-Rom,
 * leichtes GPS-Zittern) und reproduzierbar.
 */
import { seeded } from '../../../src/ui/share/geo.js';

// Uferweg, im Uhrzeigersinn ab Kennedybrücke (grob nachgezeichnet)
const ALSTER = [
  [53.55712, 10.00128], [53.55808, 9.99826], [53.55985, 9.99640], [53.56215, 9.99520],
  [53.56420, 9.99442], [53.56655, 9.99395], [53.56880, 9.99420], [53.57085, 9.99492],
  [53.57260, 9.99610], [53.57430, 9.99760], [53.57590, 9.99930], [53.57715, 10.00105],
  [53.57790, 10.00330], [53.57735, 10.00560], [53.57580, 10.00700], [53.57390, 10.00810],
  [53.57190, 10.00930], [53.56985, 10.01060], [53.56780, 10.01150], [53.56560, 10.01190],
  [53.56335, 10.01160], [53.56120, 10.01060], [53.55940, 10.00890], [53.55815, 10.00640],
  [53.55745, 10.00390], [53.55712, 10.00128],
];

function catmull(points, perSeg = 14) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]; const p1 = points[i];
    const p2 = points[i + 1]; const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg; const t2 = t * t; const t3 = t2 * t;
      out.push([0, 1].map((d) => 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t
        + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Route mit Anlauf von St. Georg (Lange Reihe) und GPS-Zittern. */
export function alsterRoute() {
  const rand = seeded(1910);
  const lead = [[53.55305, 10.01420], [53.55420, 10.01240], [53.55520, 10.01020], [53.55590, 10.00760], [53.55660, 10.00420]];
  const back = [[53.55660, 10.00420], [53.55590, 10.00760], [53.55505, 10.01090], [53.55400, 10.01290], [53.55330, 10.01400]];
  const pts = catmull([...lead, ...ALSTER.slice(0), ...back], 14);
  return pts.map(([la, lo]) => [la + (rand() - 0.5) * 0.00005, lo + (rand() - 0.5) * 0.00008]);
}

export const RUN = {
  type: 'lauf',
  title: 'Abendlauf an der Alster',
  constellation: 'Alster',
  place: 'Hamburg',
  start: '2026-10-19T18:42:00+02:00',
  distanceM: 7420,
  durationS: 2478,
  elevationM: 18,
  // 7 volle Kilometer + die letzten 420 m (Tempo auf den km hochgerechnet)
  splits: [347, 338, 334, 331, 326, 321, 330, 312],
  route: alsterRoute(),
  edition: 112,
  garden: { count: 9 },
};

export const LEG_DAY = {
  type: 'kraft',
  title: 'Beintag',
  place: 'Studio Eimsbüttel',
  start: '2026-10-20T18:10:00+02:00',
  durationS: 58 * 60,
  edition: 113,
  garden: { count: 10 },
  exercises: [
    { name: 'Kniebeuge', muscles: { quads: 1, glutes: 0.7, lowerback: 0.25 }, pr: true, sets: [{ reps: 8, kg: 100 }, { reps: 8, kg: 100 }, { reps: 8, kg: 100 }] },
    { name: 'Rumänisches Kreuzheben', muscles: { hams: 1, glutes: 0.8, lowerback: 0.4 }, sets: [{ reps: 10, kg: 80 }, { reps: 10, kg: 80 }, { reps: 8, kg: 85 }] },
    { name: 'Bulgarische Kniebeuge', muscles: { quads: 0.9, glutes: 1 }, perSide: true, sets: [{ reps: 10, kg: 16 }, { reps: 10, kg: 16 }, { reps: 10, kg: 16 }] },
    { name: 'Beinpresse', muscles: { quads: 1, glutes: 0.5 }, sets: [{ reps: 12, kg: 160 }, { reps: 12, kg: 160 }, { reps: 10, kg: 170 }] },
    { name: 'Beinbeuger liegend', muscles: { hams: 1, calves: 0.3 }, sets: [{ reps: 12, kg: 45 }, { reps: 12, kg: 45 }, { reps: 12, kg: 45 }] },
    { name: 'Wadenheben stehend', muscles: { calves: 1 }, sets: [{ reps: 15, kg: 60 }, { reps: 15, kg: 60 }, { reps: 15, kg: 60 }, { reps: 15, kg: 60 }] },
  ],
};

export const PUSH_DAY = {
  type: 'kraft',
  title: 'Push-Tag',
  place: 'Studio Eimsbüttel',
  start: '2026-10-22T07:15:00+02:00',
  durationS: 52 * 60,
  edition: 115,
  garden: { count: 11 },
  exercises: [
    { name: 'Bankdrücken', muscles: { chest: 1, triceps: 0.6, shoulders: 0.4 }, sets: [{ reps: 6, kg: 70 }, { reps: 6, kg: 70 }, { reps: 6, kg: 70 }, { reps: 5, kg: 72.5 }] },
    { name: 'Schulterdrücken', muscles: { shoulders: 1, triceps: 0.5 }, sets: [{ reps: 8, kg: 40 }, { reps: 8, kg: 40 }, { reps: 8, kg: 40 }] },
    { name: 'Schrägbankdrücken KH', muscles: { chest: 1, shoulders: 0.5 }, perSide: true, sets: [{ reps: 10, kg: 24 }, { reps: 10, kg: 24 }, { reps: 9, kg: 24 }] },
    { name: 'Dips', muscles: { triceps: 1, chest: 0.6 }, sets: [{ reps: 10 }, { reps: 10 }, { reps: 8 }] },
    { name: 'Seitheben', muscles: { shoulders: 1 }, perSide: true, sets: [{ reps: 12, kg: 8 }, { reps: 12, kg: 8 }, { reps: 12, kg: 8 }] },
    { name: 'Trizepsdrücken am Seil', muscles: { triceps: 1 }, sets: [{ reps: 12, kg: 20 }, { reps: 12, kg: 20 }, { reps: 12, kg: 22.5 }] },
  ],
};
