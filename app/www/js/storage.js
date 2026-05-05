/* Settings persistence.
 *
 * Uses @capacitor/preferences when running inside Capacitor.
 * Falls back to localStorage in plain web preview.
 *
 * All keys are namespaced under "kw:" to avoid colliding with
 * future site-wide preferences.
 */

const NS = 'kw:';

const Preferences =
  typeof window !== 'undefined' &&
  window.Capacitor &&
  window.Capacitor.Plugins &&
  window.Capacitor.Plugins.Preferences
    ? window.Capacitor.Plugins.Preferences
    : null;

export async function load(key, defaultVal) {
  const fullKey = NS + key;
  if (Preferences) {
    try {
      const { value } = await Preferences.get({ key: fullKey });
      if (value === null || value === undefined) return defaultVal;
      try {
        return JSON.parse(value);
      } catch {
        return defaultVal;
      }
    } catch {
      return defaultVal;
    }
  }
  try {
    const raw = localStorage.getItem(fullKey);
    if (raw === null) return defaultVal;
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

export async function save(key, value) {
  const fullKey = NS + key;
  const v = JSON.stringify(value);
  if (Preferences) {
    try {
      await Preferences.set({ key: fullKey, value: v });
    } catch {
      /* swallow */
    }
    return;
  }
  try {
    localStorage.setItem(fullKey, v);
  } catch {
    /* swallow */
  }
}

export async function remove(key) {
  const fullKey = NS + key;
  if (Preferences) {
    try {
      await Preferences.remove({ key: fullKey });
    } catch {
      /* swallow */
    }
    return;
  }
  try {
    localStorage.removeItem(fullKey);
  } catch {
    /* swallow */
  }
}
