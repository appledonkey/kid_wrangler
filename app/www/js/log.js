/* Tagged error logging.
 *
 * `logErr(tag, err)` writes a console.warn in dev (localhost or with
 * `?debug=1` in the URL), no-op in production. The tag tells us
 * which subsystem hiccupped without spamming the console.
 *
 * In production we don't want noisy console output for errors that
 * are already gracefully handled (e.g. iOS speechSynthesis intermittent
 * failures, missing voice MP3s, Capacitor plugin not present in plain
 * browser preview) — but we DO want them when actively developing.
 *
 * Replace `/* swallow *\/` catch blocks with this so future iOS or
 * Capacitor plugin failures actually leave a trace in dev.
 */

const _isLocalhost =
  typeof location !== 'undefined' &&
  (location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '');

const _isDebugQuery =
  typeof window !== 'undefined' &&
  window.location &&
  typeof window.location.search === 'string' &&
  /[?&]debug=1\b/.test(window.location.search);

const IS_DEV = _isLocalhost || _isDebugQuery;

export function logErr(tag, err) {
  if (!IS_DEV) return;
  try {
    // eslint-disable-next-line no-console
    console.warn(`[${tag}]`, err);
  } catch {
    /* console itself isn't available — give up */
  }
}
