/**
 * Sätze des Begleiters – je Tonlage und Situation. Regeln siehe docs/TONE.md
 * (nie über Figur, Gewicht oder Essen; kein Druck, keine Schuld).
 *
 * Allgemeine Sätze passen zu jeder Art. Was nur zu einer Art passt (Blätter, Gießen …),
 * steht in SPECIES_LINES und kommt für diese Art dazu.
 *
 * Platzhalter:
 *   {name}    → Name des Begleiters        {count} → Zahl (z. B. Umlenkungen)
 *   {user}    → Name der Person oder "du"  {, user} → ", Lena" oder nichts
 */

/** @typedef {'ruhig'|'motiv'|'frech'} Tone */
/** @typedef {import('../../domain/buddy.js').BuddyContext | 'tap'|'liveStart'|'liveSet3'|'livePr'|'liveLong'|'liveRest'|'finish'|'gate'|'welcome'} LineContext */

export const TONES = Object.freeze([
  { id: 'ruhig', label: 'Ruhig' },
  { id: 'motiv', label: 'Motivierend' },
  { id: 'frech', label: 'Frech' },
]);

/** @type {Readonly<Record<Tone, Record<string, string[]>>>} */
export const COMPANION_LINES = Object.freeze({
  ruhig: {
    morning: ['Guten Morgen{, user}. Ganz in Ruhe ankommen.', 'Neuer Tag. Eine Sache reicht schon.'],
    day: ['Schön, dass du kurz reinschaust.', 'Ein Schluck Wasser wär jetzt nicht verkehrt.'],
    evening: ['Schöner Abend{, user}. Was war heute gut?', 'Langsam runterfahren. Du hast genug getan.'],
    night: ['Es ist spät. Ich mach schon mal die Augen zu.', 'Schlaf gut. Morgen geht’s weiter.'],
    trainToday: ['Heute steht Training an. Wann es passt, entscheidest du.', 'Training heute. Auch eine kurze Runde zählt.'],
    trainDone: ['Training erledigt. Das tut dir gut.', 'Das war gut heute. Jetzt darfst du ausruhen.'],
    rest: ['Ruhetag. Pausen gehören zum Training dazu.', 'Heute nichts geplant. Genieß es.'],
    back: ['Schön, dass du da bist.', 'Da bist du ja. Ich hab mich gefreut.'],
    sleepy: ['Ich hab ein bisschen gedöst. Eine kleine Runde, wenn dir danach ist?'],
    pr: ['Neue Bestleistung heute. Ganz still stolz auf dich.'],
    redirect: ['Diese Woche {count}× umgelenkt. Das ist echte Pflege.'],
    tap: ['Hallo. Ich bin {name}.', 'Ich wachse mit, wenn du dranbleibst. Ganz ohne Druck.', 'Einmal tief durchatmen. Schon besser.', 'Pausen gehören dazu. Wirklich.'],
    liveStart: ['Schön, dass du trainierst. Ich bin dabei.'],
    liveSet3: ['Einen noch, ganz ruhig. Du packst das.', 'Dritter Satz. Technik vor Gewicht.'],
    livePr: ['Sauber. Neue Bestleistung.'],
    liveLong: ['Du bist schon lange dabei. Hör auf deinen Körper.'],
    liveRest: ['Kurz durchatmen, dann weiter.'],
    finish: ['Gut gemacht. Ich bin stolz auf dich.', 'Fertig. Jetzt in Ruhe erholen.'],
    gate: ['Schön, dass du schreibst. Das bleibt länger als ein Reel.'],
    welcome: ['Schön, dass du da bist{, user}. Wir wachsen zusammen.'],
  },
  motiv: {
    morning: ['Guten Morgen{, user}! Heute wird gut.', 'Aufgewacht! Ich bin schon ganz munter.'],
    day: ['Na, wie läuft’s? Du machst das gut.', 'Kleine Schritte zählen. Jeder einzelne.'],
    evening: ['Guten Abend{, user}! Schön, dass du da bist.', 'Der Tag war deiner. Gönn dir Ruhe.'],
    night: ['Gähn. Schlaf ist auch Training, ehrlich.', 'Ab ins Bett, morgen sind wir wieder frisch.'],
    trainToday: ['Heute ist Trainingstag! Ich freu mich schon.', 'Training steht an. Wir zwei schaffen das.'],
    trainDone: ['Training geschafft! Richtig gut.', 'Stark heute! Ich freu mich mit dir.'],
    rest: ['Ruhetag! Erholung macht dich stärker.', 'Heute nur entspannen. Auch das ist Fortschritt.'],
    back: ['Schön, dass du da bist! Ich hab dich vermisst.', 'Da bist du ja! Wir machen einfach weiter.'],
    sleepy: ['Ich hab ein bisschen geschlafen. Lust, mich mit einer kleinen Runde zu wecken?'],
    pr: ['Neue Bestleistung heute! Ich hüpf vor Freude.'],
    redirect: ['{count}× umgelenkt diese Woche. Richtig stark!'],
    tap: ['Hi, ich bin {name}!', 'Wir wachsen zusammen. Schritt für Schritt.', 'Du bist besser drauf, als du denkst.', 'Tipp mich ruhig öfter an. Ich mag das.'],
    liveStart: ['Los geht’s! Ich feuer dich an.'],
    liveSet3: ['Einen noch! Du packst das.', 'Dritter Satz! Volle Konzentration.'],
    livePr: ['Sauber! Neue Bestleistung!'],
    liveLong: ['Fast geschafft. Gleich darfst du stolz sein.'],
    liveRest: ['Pause vorbei. Kurz durchatmen, dann weiter!'],
    finish: ['Stark gemacht! Ich bin stolz auf dich.', 'Geschafft! Jetzt in Ruhe ankommen.'],
    gate: ['Gute Wahl! Ein Mensch statt ein Feed.'],
    welcome: ['Schön, dass du da bist{, user}! Wir wachsen ab jetzt zusammen.'],
  },
  frech: {
    morning: ['Moin{, user}! Augen auf, Wasser rein, los.', 'Morgen! Ich bin schon wach. Seit Stunden. Glaub ich.'],
    day: ['Na? Ich hab Durst. Du bestimmt auch.', 'Ey, schön dich zu sehen.'],
    evening: ['Abend{, user}! Füße hoch, du Legende.', 'Feierabend? Feierabend.'],
    night: ['Psst. Handy weg, ab ins Bett. Ich schlaf schon.', 'Zzz. Sag morgen Bescheid, wenn’s was gibt.'],
    trainToday: ['Heute ist Training! Ich mach mich schon mal locker.', 'Trainingstag! Die Matte wartet, ich auch.'],
    trainDone: ['Training erledigt?! Guck mal, wie ich mich freue!', 'Läuft bei dir. Ehrlich.'],
    rest: ['Ruhetag! Sofa-Training: Fernbedienung heben.', 'Heute frei. Chillen ist auch ’ne Sportart.'],
    back: ['Ha! Da bist du ja wieder. Schön!', 'Ey, du bist da! Ich wusste es.'],
    sleepy: ['Ich hab gepennt. Weck mich mit einer kleinen Runde, wenn du Lust hast.'],
    pr: ['Neue Bestleistung?! Wer bist du und was hast du mit {user} gemacht?'],
    redirect: ['{count}× umgelenkt! Instagram heult, ich feier dich.'],
    tap: ['Hey! Nicht kitzeln. Okay, doch.', 'Ich bin {name}. Klein, aber motiviert.', 'Noch einmal tippen und ich wachse. War gelogen. Aber fast.', 'Du bist echt nice, weißt du das?'],
    liveStart: ['Los, los! Ich feuer dich an. Liebevoll.'],
    liveSet3: ['Ey, einen Satz noch, du schaffst das!', 'Dritter Satz! Zeig dem Gewicht, wer hier Chef ist.'],
    livePr: ['Uiii, neue Bestleistung! Krass.'],
    liveLong: ['Gleich fertig! Danach wird ausgiebig rumgelegen.'],
    liveRest: ['Pause rum! Hoch mit dir.'],
    finish: ['Boom! Stark gemacht. Ich bin so stolz.', 'Fertig! Du bist der Hammer.'],
    gate: ['Ey, Mensch schreiben statt scrollen. Respekt.'],
    welcome: ['Yay, wir sind jetzt ein Team{, user}!'],
  },
});

/** Der Begleiter im Onboarding – unabhängig von der Tonlage. */
export const ONBOARDING_LINES = Object.freeze({
  hello: 'Hi! Ich bin {name}. Ich wohne ab jetzt in deinem Handy. Wie darf ich dich nennen?',
  modules: 'Freut mich{, user}! Was ist dir gerade wichtig? Ich zeig dir dann nur das.',
  mama: 'Wie schön. Damit ich die passenden Übungen vorschlage, brauche ich zwei Angaben.',
  goal: 'Wofür bewegst du dich? Ganz für dich, kein Muss.',
  days: 'Wie oft passt Bewegung in deine Woche? Lieber realistisch als perfekt.',
  gear: 'Was hast du zum Trainieren da? Dein Körper reicht völlig.',
  companion: 'Letzte Frage: Wie soll ich heißen, und wie soll ich mit dir reden?',
});

/**
 * Zusätzliche Sätze je Art (werden an die allgemeinen angehängt).
 * @type {Readonly<Record<string, Partial<Record<Tone, Record<string, string[]>>>>>}
 */
export const SPECIES_LINES = Object.freeze({
  keimling: {
    ruhig: {
      night: ['Es ist spät. Ich mach schon mal die Blätter zu.'],
      trainDone: ['Training erledigt. Ich bin ein Stück gewachsen.'],
    },
    motiv: {
      morning: ['Aufgewacht! Ich hab schon Sonne getankt.'],
      trainDone: ['Stark heute! Guck mal, meine neuen Blätter.'],
      finish: ['Geschafft! Ich bin ein Stück gewachsen.'],
    },
    frech: {
      morning: ['Morgen! Ich bin schon wach. Ich bin ’ne Pflanze, ich muss.'],
      trainToday: ['Heute ist Training! Ich mach schon mal Dehnübungen. Mit meinem Blatt.'],
      trainDone: ['Läuft bei dir. Und bei mir, ich hab ein neues Blatt.'],
      tap: ['Ich bin {name}. Klein, grün, motiviert.'],
    },
  },
});

/** @param {unknown[]} list @param {() => number} random */
const pick = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))];

/**
 * Platzhalter füllen.
 * @param {string} template
 * @param {{name: string, user?: string, count?: number}} params  name = Begleiter
 */
export function fillLine(template, { name, user = '', count = 0 }) {
  const u = user.trim();
  return template
    .replaceAll('{, user}', u ? `, ${u}` : '')
    .replaceAll('{user}', u || 'du')
    .replaceAll('{name}', name)
    .replaceAll('{count}', String(count));
}

/**
 * Alle Sätze einer Situation für Art und Ton (allgemein + Art).
 * @param {string} context
 * @param {string} tone
 * @param {string} species
 */
export function linePool(context, tone, species) {
  const t = /** @type {Tone} */ (tone in COMPANION_LINES ? tone : 'motiv');
  const general = COMPANION_LINES[t];
  const extra = SPECIES_LINES[species]?.[t] ?? {};
  const key = context in general ? context : 'tap';
  return [...general[key], ...(extra[key] ?? [])];
}

/**
 * Ein passender Satz für die Situation. Unbekannte Situationen fallen auf „tap“ zurück,
 * unbekannte Tonlagen auf „motiv“.
 * @param {string} context
 * @param {{name: string, species: string, tone?: string, user?: string, count?: number, random?: () => number}} options
 */
export function companionLine(context, { species, tone = 'motiv', random = Math.random, ...params }) {
  return fillLine(pick(linePool(context, tone, species), random), params);
}
