/* Capacitor native plugin shims.
 *
 * Each helper is a thin wrapper that no-ops gracefully when the
 * underlying plugin isn't available (i.e. when the app is running
 * in a regular web browser instead of inside Capacitor).
 */

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
  } catch {
    /* swallow */
  }
}

/* ---------- Splash screen ---------- */

const SplashScreen = Plugins.SplashScreen || null;

export async function hideSplash() {
  if (!SplashScreen) return;
  try {
    await SplashScreen.hide();
  } catch {
    /* swallow */
  }
}

/* ---------- Haptics ---------- */

const Haptics = Plugins.Haptics || null;

export async function tapHaptic() {
  if (!Haptics) return;
  try {
    await Haptics.impact({ style: 'LIGHT' });
  } catch {
    /* swallow */
  }
}

export async function heavyHaptic() {
  if (!Haptics) return;
  try {
    await Haptics.impact({ style: 'HEAVY' });
  } catch {
    /* swallow */
  }
}

export async function successHaptic() {
  if (!Haptics) return;
  try {
    await Haptics.notification({ type: 'SUCCESS' });
  } catch {
    /* swallow */
  }
}

export async function warningHaptic() {
  if (!Haptics) return;
  try {
    await Haptics.notification({ type: 'WARNING' });
  } catch {
    /* swallow */
  }
}

/* ---------- App lifecycle ---------- */

const App = Plugins.App || null;

/**
 * Register a callback fired when the app is backgrounded.
 * Useful for pausing timers / silent loop on background.
 */
export function onAppStateChange(cb) {
  if (!App) return () => {};
  let handle;
  try {
    App.addListener('appStateChange', (state) => cb(state.isActive));
  } catch {
    /* swallow */
  }
  return () => {
    if (handle && handle.remove) handle.remove();
  };
}
