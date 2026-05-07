/* Capacitor native plugin shims.
 *
 * Each helper is a thin wrapper that no-ops gracefully when the
 * underlying plugin isn't available (i.e. when the app is running
 * in a regular web browser instead of inside Capacitor).
 */

import { logErr } from './log.js';

const Plugins =
  typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins
    ? window.Capacitor.Plugins
    : {};

export const isNative =
  typeof window !== 'undefined' &&
  window.Capacitor &&
  typeof window.Capacitor.isNativePlatform === 'function' &&
  window.Capacitor.isNativePlatform();

/* ---------- Status bar ---------- */

const StatusBar = Plugins.StatusBar || null;

/**
 * Tint the native status bar to match the active screen.
 * `bg` is a hex color string.
 */
export async function setStatusBar(bg, dark = false) {
  if (!StatusBar) return;
  try {
    await StatusBar.setBackgroundColor({ color: bg });
    await StatusBar.setStyle({ style: dark ? 'DARK' : 'LIGHT' });
  } catch (e) {
    logErr('statusBar', e);
  }
}

/* ---------- Splash screen ---------- */

const SplashScreen = Plugins.SplashScreen || null;

export async function hideSplash() {
  if (!SplashScreen) return;
  try {
    await SplashScreen.hide();
  } catch (e) {
    logErr('splash', e);
  }
}

/* ---------- Haptics ---------- */

const Haptics = Plugins.Haptics || null;

export async function tapHaptic() {
  if (!Haptics) return;
  try {
    await Haptics.impact({ style: 'LIGHT' });
  } catch (e) {
    logErr('haptic.tap', e);
  }
}

export async function heavyHaptic() {
  if (!Haptics) return;
  try {
    await Haptics.impact({ style: 'HEAVY' });
  } catch (e) {
    logErr('haptic.heavy', e);
  }
}

export async function successHaptic() {
  if (!Haptics) return;
  try {
    await Haptics.notification({ type: 'SUCCESS' });
  } catch (e) {
    logErr('haptic.success', e);
  }
}

export async function warningHaptic() {
  if (!Haptics) return;
  try {
    await Haptics.notification({ type: 'WARNING' });
  } catch (e) {
    logErr('haptic.warning', e);
  }
}

/* ---------- App lifecycle ---------- */

const App = Plugins.App || null;

/**
 * Register a callback fired when the app is backgrounded.
 * Useful for pausing timers / silent loop on background.
 *
 * Returns an unsubscribe function. In Capacitor 3+ `addListener`
 * returns a Promise<PluginListenerHandle>, so the unsubscribe is
 * deferred until the promise resolves. Earlier versions returned
 * a sync handle — both shapes are supported.
 */
export function onAppStateChange(cb) {
  if (!App) return () => {};
  let handle = null;
  try {
    handle = App.addListener('appStateChange', (state) => cb(state.isActive));
  } catch (e) {
    logErr('appState', e);
  }
  return () => {
    if (!handle) return;
    if (typeof handle.then === 'function') {
      handle.then((h) => {
        if (h && typeof h.remove === 'function') h.remove();
      }).catch(() => {});
    } else if (typeof handle.remove === 'function') {
      handle.remove();
    }
  };
}
