/**
 * Kurze Töne für den Timer (Web Audio). Der Audio-Kontext entsteht erst nach einer Berührung
 * (`unlockAudio` beim Start), ohne Unterstützung bleibt es still.
 */

/** @type {AudioContext|null} */
let audio = null;

export function unlockAudio() {
  try {
    const Ctx = globalThis.AudioContext ?? /** @type {any} */ (globalThis).webkitAudioContext;
    if (!audio && Ctx) audio = new Ctx();
    if (audio?.state === 'suspended') audio.resume();
  } catch {
    audio = null;
  }
}

/**
 * @param {number} freq   Hz
 * @param {number} [ms]
 */
export function beep(freq, ms = 120) {
  if (!audio) return;
  try {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, audio.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + ms / 1000);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + ms / 1000 + 0.02);
  } catch {
    /* still */
  }
}
