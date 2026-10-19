/**
 * Varianten: dieselbe Bewegung an verschiedenen Geräten. Gewichte sind zwischen Geräten nicht
 * vergleichbar (45°-Schlitten ≠ horizontale Presse), deshalb hat jede Variante eine eigene Id –
 * Verlauf, letztes Gewicht und Vorschlag gelten je Variante.
 *
 * Eine Variante ist entweder eine vorhandene Übung (kuratiert, „db…“) oder eine abgeleitete
 * Id „<basis>~<schlüssel>“ (z. B. „press~horizontal“), die Name, Gerät und Muskeln der Basis
 * übernimmt. `label` ist ein Text-Schlüssel (variant.*) für den kurzen Chip-Namen.
 * Jede Übung gehört höchstens zu einer Gruppe (Test).
 */

/**
 * @typedef {object} Variant
 * @property {string} id
 * @property {string} label     Text-Schlüssel des Chips („variant.sled45“)
 * @property {string} [gear]    abweichendes Gerät (abgeleitete Ids)
 * @property {object} [anim]    abweichende Animation {pattern?, equipment?, options?}
 * @typedef {object} VariantGroup
 * @property {string} id
 * @property {Variant[]} variants   erste = Standard
 */

/** @type {readonly VariantGroup[]} */
export const VARIANT_GROUPS = Object.freeze([
  { id: 'legpress', variants: [
    { id: 'press', label: 'variant.sled45' },
    { id: 'press~horizontal', label: 'variant.horizontal', gear: 'Maschinen', anim: { pattern: 'legPress', equipment: 'maschine', options: { variant: 'horizontal' } } },
    { id: 'db253', label: 'variant.hack' },
    { id: 'goblet', label: 'variant.dumbbells' },
  ] },
  { id: 'squat', variants: [
    { id: 'squat', label: 'variant.barbell' },
    { id: 'smithsquat', label: 'variant.smith' },
    { id: 'db40', label: 'variant.hackBarbell' },
  ] },
  { id: 'chestpress', variants: [
    { id: 'bench', label: 'variant.barbell' },
    { id: 'dbbench', label: 'variant.dumbbells' },
    { id: 'chestpress', label: 'variant.machine' },
    { id: 'db541', label: 'variant.smith' },
    { id: 'k_cpress', label: 'variant.cable' },
  ] },
  { id: 'fly', variants: [
    { id: 'fly', label: 'variant.machine' },
    { id: 'cross', label: 'variant.cable' },
  ] },
  { id: 'pulldown', variants: [
    { id: 'latpull', label: 'variant.wide' },
    { id: 'k_latclose', label: 'variant.close' },
    { id: 'pullup', label: 'variant.bar' },
  ] },
  { id: 'row', variants: [
    { id: 'seatrow', label: 'variant.machine' },
    { id: 'k_row', label: 'variant.cable' },
    { id: 'row1', label: 'variant.barbell' },
    { id: 'dbrow', label: 'variant.dumbbell' },
    { id: 'bandrow', label: 'variant.band' },
  ] },
  { id: 'shoulderpress', variants: [
    { id: 'ohp', label: 'variant.dumbbells' },
    { id: 'shoulderpress', label: 'variant.machine' },
    { id: 'db551', label: 'variant.smith' },
  ] },
  { id: 'lateral', variants: [
    { id: 'lat', label: 'variant.dumbbells' },
    { id: 'k_lat', label: 'variant.cable' },
  ] },
  { id: 'reversefly', variants: [
    { id: 'reversefly', label: 'variant.machine' },
    { id: 'k_rear', label: 'variant.cable' },
  ] },
  { id: 'curl', variants: [
    { id: 'curl', label: 'variant.dumbbells' },
    { id: 'cablecurl', label: 'variant.cable' },
    { id: 'bandcurl', label: 'variant.band' },
  ] },
  { id: 'hammer', variants: [
    { id: 'hammer', label: 'variant.dumbbells' },
    { id: 'k_hammer', label: 'variant.rope' },
  ] },
  { id: 'triceps', variants: [
    { id: 'pushdown', label: 'variant.cableBar' },
    { id: 'k_ropepush', label: 'variant.rope' },
    { id: 'french', label: 'variant.dumbbell' },
  ] },
  { id: 'legcurl', variants: [
    { id: 'legcurl', label: 'variant.seated' },
    { id: 'db359', label: 'variant.lying' },
    { id: 'db599', label: 'variant.standing' },
  ] },
  { id: 'calf', variants: [
    { id: 'calf', label: 'variant.bodyweight' },
    { id: 'calfmachine', label: 'variant.machine' },
  ] },
]);
