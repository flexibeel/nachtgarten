/**
 * Nachtgarten – Zuordnung Übung → Animation.
 *
 *   mapExercise({ id, n | name, g | gear, m | muscles, att })
 *     → { pattern, equipment, options, source }
 *
 * Reihenfolge:
 *   1. feste Zuordnung für die kuratierten Übungen (Ids aus der v1-Bibliothek),
 *   2. Stichwort-Regeln (deutsch + englisch) auf dem Namen,
 *   3. Rückfall nach Gerät + Hauptmuskel,
 *   4. ruhige Atem-Animation als letzte Rückfallebene.
 * Rein, ohne DOM – auch in node testbar.
 */

/** Gerätenamen der App → Geräte-Schlüssel der Animation. */
export const GEAR = {
  Langhantel: "langhantel", "SZ-Stange": "sz", Kurzhanteln: "kurzhantel", Kurzhantel: "kurzhantel",
  Kabelzug: "kabel", Maschinen: "maschine", Maschine: "maschine", "Körpergewicht": "koerper",
  "Bänder": "band", Band: "band", Kettlebell: "kettlebell", Klimmzugstange: "stange",
  Multipresse: "multipresse", Sonstiges: "koerper", Eigenes: "koerper",
};

/** Feste Zuordnung der kuratierten Übungen. [pattern, equipment, options] */
const O = (pattern, equipment, options = {}) => ({ pattern, equipment, options });
export const OVERRIDES = {
  bench: O("pushH", "langhantel"),
  dbbench: O("pushH", "kurzhantel"),
  pushup: O("pushH", "koerper"),
  fly: O("fly", "maschine"),
  cross: O("fly", "kabel", { height: "hoch" }),
  pullup: O("pullV", "stange"),
  latpull: O("pullV", "kabel", { handle: "Lat-Stange" }),
  row1: O("pullH", "langhantel"),
  dbrow: O("pullH", "kurzhantel", { uni: true }),
  seatrow: O("pullH", "maschine"),
  bandrow: O("pullH", "band"),
  ohp: O("pushV", "kurzhantel"),
  lat: O("latRaise", "kurzhantel"),
  face: O("facePull", "kabel", { handle: "Seil" }),
  pike: O("pushV", "koerper", { variant: "pike" }),
  curl: O("curl", "kurzhantel"),
  hammer: O("curl", "kurzhantel", { variant: "hammer" }),
  bandcurl: O("curl", "band"),
  pushdown: O("triExt", "kabel", { handle: "Stange" }),
  dips: O("dip", "koerper"),
  french: O("triExt", "kurzhantel", { variant: "overhead" }),
  plank: O("plank", "koerper"),
  crunch: O("crunch", "koerper"),
  hang: O("legRaise", "stange"),
  squat: O("squat", "langhantel"),
  goblet: O("squat", "kurzhantel"),
  lunge: O("lunge", "koerper"),
  press: O("legPress", "maschine"),
  rdl: O("hinge", "langhantel"),
  dead: O("hinge", "langhantel", { variant: "deep" }),
  legcurl: O("legCurl", "maschine"),
  hyper: O("hinge", "koerper"),
  thrust: O("hipthrust", "langhantel", { variant: "bench" }),
  bridge: O("hipthrust", "koerper", { variant: "floor" }),
  calf: O("calfRaise", "koerper"),
  chestpress: O("pushH", "maschine"),
  shoulderpress: O("pushV", "maschine"),
  legext: O("legExt", "maschine"),
  abductor: O("hipAbd", "maschine"),
  abmachine: O("crunch", "maschine"),
  calfmachine: O("calfRaise", "maschine"),
  smithsquat: O("squat", "multipresse"),
  reversefly: O("rearFly", "maschine"),
  backext: O("hinge", "koerper"),
  cablecurl: O("curl", "kabel", { handle: "Stange" }),
  k_crosshigh: O("fly", "kabel", { height: "hoch" }),
  k_crosslow: O("fly", "kabel", { height: "tief" }),
  k_flyflat: O("fly", "bank"),
  k_cpress: O("pushH", "kabel", { variant: "stand" }),
  k_row: O("pullH", "kabel", { handle: "V-Griff" }),
  k_row1: O("pullH", "kabel", { uni: true, handle: "Einzelgriff" }),
  k_straight: O("pullover", "kabel", { handle: "Seil" }),
  k_latclose: O("pullV", "kabel", { handle: "V-Griff" }),
  k_ropepush: O("triExt", "kabel", { handle: "Seil" }),
  k_overhead: O("triExt", "kabel", { variant: "overhead", handle: "Seil" }),
  k_lat: O("latRaise", "kabel"),
  k_front: O("frontRaise", "kabel", { handle: "Stange" }),
  k_rear: O("rearFly", "kabel"),
  k_upright: O("uprightRow", "kabel", { handle: "Stange" }),
  k_shrug: O("shrug", "kabel"),
  k_hammer: O("curl", "kabel", { variant: "hammer", handle: "Seil" }),
  k_bayes: O("curl", "kabel", { variant: "bayes" }),
  k_crunch: O("crunch", "kabel"),
  k_wood: O("rotation", "kabel"),
  k_pallof: O("pallof", "kabel"),
  k_through: O("hinge", "kabel"),
  k_kick: O("kickback", "kabel"),
  k_abd: O("hipAbd", "kabel"),
  k_add: O("hipAbd", "kabel", { variant: "add" }),
  k_wrist: O("curl", "kabel", { variant: "wrist" }),
  k_dbwrist: O("curl", "kurzhantel", { variant: "wrist" }),
  k_farmer: O("carry", "kurzhantel"),
};

/* --------------------------------------------------------------- Regeln */

const has = (s, re) => re.test(s);
/** Position bei Atem-/Beckenboden-Übungen. */
const pose = (s) =>
  has(s, /seitlage|side.?lying|seite\b/) ? "seite" :
  has(s, /kindhaltung|child/) ? "kind" :
  has(s, /vierfü|quadruped|all fours/) ? "vierfuessler" :
  has(s, /sitz|seated|ball|stuhl/) ? "sitzen" :
  has(s, /\bstand\b|stehend|standing/) ? "stand" : "ruecken";
const heightOf = (s) =>
  has(s, /von oben|\bhoch\b|high|oben nach unten/) ? "hoch" :
  has(s, /von unten|\btief\b|\blow\b|unten nach oben/) ? "tief" :
  has(s, /mittel|\bmid/) ? "mittel" : undefined;
const handleOf = (s, att) => {
  if (att) return att;
  if (has(s, /seil|rope/)) return "Seil";
  if (has(s, /v-griff|v-bar|v grip|eng|close/)) return "V-Griff";
  if (has(s, /fußschlaufe|ankle|fußmanschette/)) return "Fußschlaufe";
  if (has(s, /lat-stange|lat bar|breit|wide/)) return "Lat-Stange";
  if (has(s, /stange|\bbar\b/)) return "Stange";
  return undefined;
};

/**
 * Regel-Liste: [RegExp, (name, eq, ctx) → [pattern, equipmentOverride?, options?]]
 * Die erste passende Regel gewinnt – spezielle Begriffe stehen deshalb oben.
 */
const RULES = [
  [/beckenboden|pelvic floor|kegel/, (s) => ["breathing", null, { variant: pose(s), pelvic: true }]],
  [/beckenkipp|pelvic tilt/, () => ["hipthrust", "koerper", { variant: "tilt" }]],
  [/kindhaltung|child'?s? pose/, () => ["breathing", null, { variant: "kind" }]],
  [/heel slide|ferse wegschieben/, () => ["deadBug", "koerper", { variant: "heel" }]],
  [/dead.?bug/, () => ["deadBug", "koerper"]],
  [/tiefe bauch|transvers|deep core/, () => ["breathing", null, { variant: "ruecken", pelvic: true }]],
  [/schmetterling/, () => ["breathing", null, { variant: "sitzen" }]],
  [/atmung|atmen|breath|entspannung/, (s) => ["breathing", null, { variant: pose(s) }]],
  [/clamshell|muschel/, (s) => ["clamshell", has(s, /band/) ? "band" : "koerper"]],
  [/katze|cat.?cow|cat.?camel/, () => ["catCow", "koerper"]],
  [/bird.?dog|vierfü.*(arm|bein) heben/, () => ["birdDog", "koerper"]],
  [/seitlich.*beinheben|beinheben in seitlage|side.?lying leg/, () => ["clamshell", "koerper"]],
  [/seitstütz|side plank|seitlicher unterarmstütz/, (s) => ["sidePlank", "koerper", { variant: has(s, /knie|knee/) ? "knee" : undefined }]],
  [/unterarmstütz|plank|planke/, (s) => ["plank", "koerper", { variant: has(s, /knie|knee/) ? "knee" : undefined }]],
  [/face.?pull/, () => ["facePull", "kabel", { handle: "Seil" }]],
  [/pallof/, (s, eq) => ["pallof", eq === "band" || has(s, /band/) ? "band" : "kabel",
    { variant: has(s, /halbknie|half.?kneel|kniend/) ? "kneel" : has(s, /sitz|seated/) ? "seated" : undefined }]],
  [/holzhack|wood.?chop/, (s) => ["rotation", "kabel", { variant: has(s, /unten nach oben|low.?to.?high|von unten/) ? "up" : undefined }]],
  [/farmer|tragen|carry|koffer/, () => ["carry", null]],
  [/einbeinstand|balance/, () => ["march", "koerper", { variant: "hold" }]],
  [/jogg|joggen|lauf|hüpf|hop|jump|sprung|sprünge|hampelmann|running man/, () => ["march", "koerper", { variant: "jog" }]],
  [/marsch|march|gehen\b|walk|spazier/, () => ["march", "koerper"]],
  [/hip thrust|hüftstoß/, (s, eq) => ["hipthrust", eq, { variant: "bench" }]],
  [/glute bridge|beckenheben|brücke|bridge/, (s) => ["hipthrust", "koerper", { variant: "floor", uni: has(s, /einbein|single/) }]],
  [/donkey|eselstritt|kickback.*(vierfü|quadruped)/, () => ["kickback", "koerper"]],
  [/adduktion|adduktor|adduct/, (s, eq) => ["hipAbd", eq === "maschine" ? "maschine" : "kabel", { variant: "add" }]],
  [/abduktion|abduktor|abduct|fire hydrant/, (s, eq) => ["hipAbd", eq === "maschine" ? "maschine" : "kabel"]],
  [/hüftkreis|becken.*kreis|hip circle|beckenkreis|wiegen|schaukeln|sway/, () => ["sway", "koerper"]],
  [/beinstrecker|leg extension/, () => ["legExt", "maschine"]],
  [/beinbeuger|leg curl|hamstring curl/, () => ["legCurl", "maschine"]],
  [/beinpresse|leg press/, () => ["legPress", "maschine"]],
  [/wade|calf/, (s, eq) => ["calfRaise", eq === "maschine" ? "maschine" : eq, { uni: has(s, /einbein|single|one.?leg/), wall: has(s, /wand|wall/) }]],
  [/halbkniestand|hüftbeuger|hip flexor/, () => ["splitsquat", "koerper", { variant: "kneel" }]],
  [/swing/, (s, eq) => ["hinge", eq === "koerper" ? "kettlebell" : eq]],
  [/pull.?through/, () => ["hinge", "kabel"]],
  [/kreuzheben|deadlift|good morning|hip hinge|hüftbeuge|hyperext|rückenstreck|back extension|superman/, (s, eq) =>
    ["hinge", eq === "maschine" ? "koerper" : eq,
      { variant: has(s, /rumän|romanian|stiff|gestreckt|good morning|hinge|hyper|rücken|back ext|superman/) ? undefined : has(s, /kreuzheben|deadlift/) ? "deep" : undefined }]],
  [/split squat|bulgar/, (s, eq) => ["splitsquat", eq]],
  [/ausfallschritt|lunge|step.?up|aufsteigen/, (s, eq) => ["lunge", eq, { variant: has(s, /rückwärts|reverse|back/) ? "back" : undefined }]],
  [/kniebeuge|squat|sit.?to.?stand|aufstehen vom stuhl|hocke/, (s, eq) => [
    "squat",
    has(s, /goblet/) ? (eq === "kettlebell" ? "kettlebell" : "kurzhantel") : has(s, /multipresse|smith/) ? "multipresse" : eq,
    { chair: has(s, /stuhl|box|sit.?to.?stand|chair/) }]],
  [/klimmz|pull.?up|chin.?up/, () => ["pullV", "stange"]],
  [/überzug|pullover|straight.?arm|gestreckte.*arm/, (s, eq, c) => ["pullover", "kabel", { handle: c.handle || "Seil" }]],
  [/latzug|lat.?pull|pulldown|lat-zug/, (s, eq, c) => ["pullV", "kabel", { handle: c.handle || "Lat-Stange" }]],
  [/hängend.*bein|hanging.*(leg|knee)|beinheben|leg raise|knee raise|knieheben/, (s) => ["legRaise", has(s, /hängend|hanging/) ? "stange" : "koerper"]],
  [/crunch|sit.?up|bauchpresse|bauchmaschine|russian twist/, (s, eq) => ["crunch", eq === "kabel" || eq === "maschine" ? eq : "koerper"]],
  [/reverse fl|reverse butterfly|rear delt|pull.?apart|auseinander|band.?zug/, (s, eq) => ["rearFly", has(s, /band|pull.?apart|auseinander/) ? "band" : eq]],
  [/butterfly|fliegende|\bfly|flye|crossover|cross.?over/, (s, eq, c) => {
    if (has(s, /butterfly|maschine|machine|pec deck/) || eq === "maschine") return ["fly", "maschine"];
    if (eq === "kabel" || has(s, /kabel|cable/)) return ["fly", "kabel", { height: c.height || "hoch" }];
    return ["fly", eq === "kurzhantel" ? "kurzhantel" : "bank"];
  }],
  [/seitheben|lateral raise|side raise|seitlich.*heben/, (s, eq) => ["latRaise", eq]],
  [/armkreis|arm circle|schulterkreis/, () => ["latRaise", "koerper", { variant: "circle" }]],
  [/frontheben|front raise/, (s, eq) => ["frontRaise", eq]],
  [/aufrechtes rudern|upright row/, (s, eq) => ["uprightRow", eq]],
  [/shrug|schulterheben|nackenheben/, (s, eq) => ["shrug", eq]],
  [/rudern|row\b|rowing/, (s, eq) => ["pullH", eq,
    { uni: has(s, /einarm|one.?arm|single/), variant: has(s, /abgestützt|support|stuhl|bank/) ? "support" : has(s, /sitz|seated/) ? "seated" : undefined }]],
  [/dips?\b|barren/, () => ["dip", "koerper"]],
  [/pike/, () => ["pushV", "koerper", { variant: "pike" }]],
  [/trizeps|triceps|pushdown|push.?down|french|skull|überkopf|overhead.*ext|kickback/, (s, eq) =>
    ["triExt", eq === "kabel" || has(s, /kabel|cable|pushdown|push.?down/) ? "kabel" : eq === "koerper" ? "kurzhantel" : eq,
      { variant: has(s, /über.?kopf|overhead|french|skull/) ? "overhead" : undefined }]],
  [/unterarm|wrist|handgelenk/, (s, eq) => ["curl", eq, { variant: "wrist" }]],
  [/curl|bizeps|biceps/, (s, eq) => ["curl", eq, {
    variant: has(s, /hammer/) ? "hammer" : has(s, /hinter dem körper|behind|bayes/) ? "bayes" : undefined,
    seated: has(s, /im sitzen|sitzend|seated/) }]],
  [/schulterdrück|shoulder press|overhead press|military|arnold|schulterpresse|push press/, (s, eq) =>
    ["pushV", eq, { variant: has(s, /stehend|standing/) ? "stand" : undefined }]],
  [/liegestütz|push.?up|press.?up/, (s) => ["pushH", "koerper",
    { variant: has(s, /wand|wall/) ? "wall" : has(s, /tisch|erhöht|incline|table/) ? "table" : has(s, /knie|knee/) ? "knee" : undefined }]],
  [/bankdrück|bench press|brustpresse|chest press|floor press|brustdrück/, (s, eq) => ["pushH", eq,
    { variant: has(s, /schräg|incline/) ? "incline" : undefined }]],
  [/\bpress\b|drücken|presse/, (s, eq, c) => [c.muscles[0] === "shoulders" ? "pushV" : "pushH", eq,
    { variant: has(s, /schräg|incline/) ? "incline" : undefined }]],
  [/rotation|drehung|open book|offenes buch/, () => ["catCow", "koerper"]],
  [/dehn|stretch|mobil|yoga/, (s) => { const v = pose(s); return ["breathing", null, { variant: v === "ruecken" ? "stand" : v }]; }],
];

/** Gerät aus dem Namen ableiten (wenn kein Gerät angegeben ist). */
export function gearFromName(s) {
  if (has(s, /kurzhantel|dumbbell|\bdb\b/)) return "kurzhantel";
  if (has(s, /sz-stange|sz stange|ez.?bar|\bez\b/)) return "sz";
  if (has(s, /langhantel|barbell/)) return "langhantel";
  if (has(s, /kettlebell/)) return "kettlebell";
  if (has(s, /multipresse|smith/)) return "multipresse";
  if (has(s, /kabel|cable|seilzug/)) return "kabel";
  if (has(s, /maschine|machine/)) return "maschine";
  if (has(s, /band|tube/)) return "band";
  return null;
}

/** Rückfall: Hauptmuskel → Muster (je nach Gerät). */
function byMuscle(m, eq) {
  switch (m) {
    case "chest": return ["pushH", eq];
    case "shoulders": return eq === "kurzhantel" || eq === "kabel" ? ["latRaise", eq] : ["pushV", eq];
    case "back": return eq === "stange" ? ["pullV", "stange"] : ["pullH", eq];
    case "biceps": return ["curl", eq];
    case "triceps": return ["triExt", eq];
    case "forearms": return ["curl", eq, { variant: "wrist" }];
    case "abs": return ["crunch", eq === "kabel" || eq === "maschine" ? eq : "koerper"];
    case "lowerback": return ["hinge", eq];
    case "glutes": return eq === "kabel" ? ["kickback", "kabel"] : ["hipthrust", eq];
    case "quads": return eq === "maschine" ? ["legExt", "maschine"] : ["squat", eq];
    case "hams": return eq === "maschine" ? ["legCurl", "maschine"] : ["hinge", eq];
    case "calves": return ["calfRaise", eq];
    default: return null;
  }
}

/**
 * Wählt Muster, Gerät und Optionen für eine Übung.
 * @param {{id?:string, n?:string, name?:string, g?:string, gear?:string, m?:string[], muscles?:string[], att?:string}} ex
 * @param {{handle?:string, height?:string}} [prefs] z. B. gewählter Aufsatz aus der App
 * @returns {{pattern:string, equipment:string, options:object, muscles:string[], source:"override"|"rule"|"muscle"|"fallback"}}
 */
export function mapExercise(ex = {}, prefs = {}) {
  const muscles = ex.m || ex.muscles || [];
  const gearName = ex.g || ex.gear || "";
  const name = String(ex.n || ex.name || "").toLowerCase();
  const g0 = GEAR[gearName] || (gearName ? String(gearName).toLowerCase() : "");
  const eq = (!g0 || g0 === "koerper") && gearFromName(name) || g0 || "koerper";
  const ov = ex.id && OVERRIDES[ex.id];
  if (ov) {
    const options = { ...ov.options };
    if (prefs.handle || ex.att) options.handle = prefs.handle || ex.att;
    if (prefs.height) options.height = prefs.height;
    return { pattern: ov.pattern, equipment: ov.equipment, options, muscles, source: "override" };
  }
  const ctx = { muscles, handle: handleOf(name, prefs.handle || ex.att), height: prefs.height || heightOf(name) };
  for (const [re, fn] of RULES) {
    if (!re.test(name)) continue;
    const [pattern, eqo, opt = {}] = fn(name, eq, ctx);
    const options = { ...opt };
    for (const k of Object.keys(options)) if (options[k] === undefined || options[k] === false) delete options[k];
    if (ctx.handle && !options.handle && (eqo || eq) === "kabel") options.handle = ctx.handle;
    if (ctx.height && !options.height && (eqo || eq) === "kabel") options.height = ctx.height;
    return { pattern, equipment: eqo || eq, options, muscles, source: "rule" };
  }
  const bm = byMuscle(muscles[0], eq);
  if (bm) return { pattern: bm[0], equipment: bm[1], options: bm[2] || {}, muscles, source: "muscle" };
  return { pattern: "breathing", equipment: "koerper", options: { variant: "stand" }, muscles, source: "fallback" };
}
