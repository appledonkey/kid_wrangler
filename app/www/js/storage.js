/* Settings persistence.
 *
 * Uses @capacitor/preferences when running inside Capacitor.
 * Falls back to localStorage in plain web preview.
 *
 * All keys are namespaced under "kw:" to avoid colliding with
 * future site-wide preferences.
 */

import { logErr } from './log.js';

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
      } catch (e) {
        // Bad migration / corrupt JSON — fall back to default.
        logErr('storage.load.parse', e);
        return defaultVal;
      }
    } catch (e) {
      logErr('storage.load.preferences', e);
      return defaultVal;
    }
  }
  try {
    const raw = localStorage.getItem(fullKey);
    if (raw === null) return defaultVal;
    return JSON.parse(raw);
  } catch (e) {
    logErr('storage.load.localStorage', e);
    return defaultVal;
  }
}

export async function save(key, value) {
  const fullKey = NS + key;
  const v = JSON.stringify(value);
  if (Preferences) {
    try {
      await Preferences.set({ key: fullKey, value: v });
    } catch (e) {
      logErr('storage.save.preferences', e);
    }
    return;
  }
  try {
    localStorage.setItem(fullKey, v);
  } catch (e) {
    logErr('storage.save.localStorage', e);
  }
}

export async function remove(key) {
  const fullKey = NS + key;
  if (Preferences) {
    try {
      await Preferences.remove({ key: fullKey });
    } catch (e) {
      logErr('storage.remove.preferences', e);
    }
    return;
  }
  try {
    localStorage.removeItem(fullKey);
  } catch (e) {
    logErr('storage.remove.localStorage', e);
  }
}
