/**
 * Geräte-Fähigkeiten hinter einer schmalen Schnittstelle.
 *
 * Im Browser stecken Web-APIs dahinter, in einer nativen Hülle (Capacitor) später Plugins.
 * Alles ist „sanft“: Fehlt eine Fähigkeit, passiert nichts (oder es kommt ein klares
 * Ergebnis zurück), es wird nie geworfen.
 */

/** @typedef {'tap'|'select'|'success'|'warning'} HapticKind */

/** Vibrationsmuster je Anlass (ms). Kurz und leise – Haptik soll bestätigen, nicht stören. */
const HAPTICS = Object.freeze({
  tap: 6,
  select: 9,
  success: [14, 40, 14],
  warning: [24, 60, 24],
});

const nav = () => /** @type {Navigator|undefined} */ (globalThis.navigator);

/**
 * Kurze Vibration. Ohne Unterstützung (z. B. iOS-Safari) ein stiller No-op.
 * @param {HapticKind|number|number[]} kind
 * @returns {boolean} ob vibriert werden konnte
 */
export function haptic(kind = 'tap') {
  const pattern = typeof kind === 'string' ? HAPTICS[kind] ?? HAPTICS.tap : kind;
  try {
    // Browser erlauben Vibration nur direkt nach einer Berührung; sonst gar nicht erst versuchen.
    if (nav()?.userActivation && !nav().userActivation.isActive) return false;
    return typeof nav()?.vibrate === 'function' ? nav().vibrate(pattern) : false;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------ Wake Lock */

/** @type {WakeLockSentinel|null} */
let wakeLock = null;
let wantWakeLock = false;

async function acquireWakeLock() {
  try {
    wakeLock = (await nav()?.wakeLock?.request('screen')) ?? null;
    wakeLock?.addEventListener?.('release', () => {
      wakeLock = null;
    });
  } catch {
    wakeLock = null;
  }
}

/**
 * Bildschirm wach halten (z. B. im Live-Training). Wird nach dem Zurückkehren in die App
 * automatisch erneuert, solange er gewünscht ist.
 * @param {boolean} on
 * @returns {Promise<boolean>} ob der Bildschirm jetzt wach gehalten wird
 */
export async function keepAwake(on) {
  wantWakeLock = on;
  if (!on) {
    try {
      await wakeLock?.release();
    } catch {
      /* schon freigegeben */
    }
    wakeLock = null;
    return false;
  }
  if (!wakeLock) await acquireWakeLock();
  return !!wakeLock;
}

globalThis.document?.addEventListener?.('visibilitychange', () => {
  if (wantWakeLock && !wakeLock && document.visibilityState === 'visible') acquireWakeLock();
});

/* --------------------------------------------------------------- Dateien */

/**
 * @typedef {object} SaveFileOptions
 * @property {string} name
 * @property {string|Blob} content
 * @property {string} [type]            MIME-Typ, Standard application/json
 * @property {boolean} [preferShare]    auf dem Handy erst das Teilen-Menü anbieten
 */

/**
 * Datei speichern: Teilen-Menü (wenn gewünscht und möglich), sonst Download.
 * @param {SaveFileOptions} options
 * @returns {Promise<'shared'|'downloaded'|'cancelled'|'failed'>}
 */
export async function saveFile({ name, content, type = 'application/json', preferShare = false }) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  if (preferShare && typeof globalThis.File === 'function' && nav()?.canShare) {
    const file = new File([blob], name, { type });
    try {
      if (nav().canShare({ files: [file] })) {
        await nav().share({ files: [file], title: name });
        return 'shared';
      }
    } catch (error) {
      if (/** @type {Error} */ (error)?.name === 'AbortError') return 'cancelled';
      /* sonst: auf Download ausweichen */
    }
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    a.hidden = true;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

/**
 * Datei auswählen und als Text lesen.
 * @param {{accept?: string}} [options]
 * @returns {Promise<{name: string, text: string}|null>}  null = abgebrochen
 */
export function pickTextFile({ accept = 'application/json,.json' } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.hidden = true;
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(value);
    };
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return done(null);
      try {
        done({ name: file.name, text: await file.text() });
      } catch {
        done(null);
      }
    });
    input.addEventListener('cancel', () => done(null));
    document.body.append(input);
    input.click();
  });
}

/**
 * Text in die Zwischenablage.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyText(text) {
  try {
    await nav()?.clipboard?.writeText(text);
    return !!nav()?.clipboard;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------- Installation */

/** Läuft die App als installierte Web-App (Homebildschirm)? */
export function isStandalone() {
  try {
    return (
      globalThis.matchMedia?.('(display-mode: standalone)').matches === true ||
      /** @type {any} */ (nav())?.standalone === true
    );
  } catch {
    return false;
  }
}

/** @type {any} */
let installEvent = null;
/** @type {Set<(available: boolean) => void>} */
const installListeners = new Set();

globalThis.addEventListener?.('beforeinstallprompt', (event) => {
  event.preventDefault();
  installEvent = event;
  installListeners.forEach((fn) => fn(true));
});
globalThis.addEventListener?.('appinstalled', () => {
  installEvent = null;
  installListeners.forEach((fn) => fn(false));
});

/** Kann der Browser gerade einen Installations-Dialog zeigen? */
export const canInstall = () => !!installEvent;

/**
 * Über Änderungen informiert werden.
 * @param {(available: boolean) => void} fn
 * @returns {() => void} Abmelden
 */
export function onInstallAvailability(fn) {
  installListeners.add(fn);
  return () => installListeners.delete(fn);
}

/**
 * Installations-Dialog zeigen.
 * @returns {Promise<'accepted'|'dismissed'|'unavailable'>}
 */
export async function promptInstall() {
  if (!installEvent) return 'unavailable';
  const event = installEvent;
  installEvent = null;
  try {
    event.prompt();
    const { outcome } = await event.userChoice;
    return outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch {
    return 'unavailable';
  }
}

/* --------------------------------------------------------- Vorlieben */

/** Wünscht das System weniger Bewegung? */
export const prefersReducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/** Ist das System gerade dunkel eingestellt? */
export const prefersDark = () => globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches === true;

/* ------------------------------------------------------- Andere Apps */

/**
 * Eine andere App öffnen (z. B. instagram://), mit Web-Adresse als Rückfall, falls die App
 * nicht da ist und die Seite sichtbar bleibt. Tests können `globalThis.__ngOpenExternal` setzen.
 * @param {string} appUrl
 * @param {string} webUrl
 */
export function openExternal(appUrl, webUrl) {
  const hook = /** @type {any} */ (globalThis).__ngOpenExternal;
  if (typeof hook === 'function') return hook(appUrl, webUrl);
  globalThis.location.href = appUrl;
  globalThis.setTimeout(() => {
    if (globalThis.document?.visibilityState === 'visible') globalThis.location.href = webUrl;
  }, 1200);
  return undefined;
}

/* ------------------------------------------------------- Bilder teilen */

/**
 * Bild über das Teilen-Menü (mit Datei) teilen; ohne Unterstützung als Download.
 * @param {Blob} blob
 * @param {string} name
 * @param {string} [title]
 * @returns {Promise<'shared'|'downloaded'|'cancelled'|'failed'>}
 */
export async function shareImage(blob, name, title) {
  const file = typeof globalThis.File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
  try {
    if (file && nav()?.canShare?.({ files: [file] })) {
      await nav().share({ files: [file], title });
      return 'shared';
    }
  } catch (error) {
    if (/** @type {Error} */ (error)?.name === 'AbortError') return 'cancelled';
  }
  return saveFile({ name, content: blob, type: 'image/png' });
}

/**
 * PNG in die Zwischenablage (z. B. als Sticker für die Instagram-Story).
 * @param {Blob} blob
 */
export async function copyImage(blob) {
  try {
    const Item = /** @type {any} */ (globalThis).ClipboardItem;
    if (!Item || !nav()?.clipboard?.write) return false;
    await nav().clipboard.write([new Item({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}
