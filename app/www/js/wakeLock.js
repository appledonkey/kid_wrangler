/* Screen wake lock with auto-reacquire on visibility change.
 *
 * Uses Web Wake Lock API. When running in Capacitor, the
 * @capacitor-community/keep-awake plugin is also engaged for
 * stronger guarantees on iOS Low Power Mode. Both are no-ops
 * if unavailable.
 */

import { resumeIfSuspended } from './audio.js';

let _webLock = null;
let _shouldBeAwake = false;

const KeepAwakePlugin =
  typeof window !== 'undefined' &&
  window.Capacitor &&
  window.Capacitor.Plugins &&
  window.Capacitor.Plugins.KeepAwake
    ? window.Capacitor.Plugins.KeepAwake
    : null;

async function _acquire() {
  if (KeepAwakePlugin) {
    try {
      await KeepAwakePlugin.keepAwake();
    } catch (e) {
      /* swallow */
    }
  }
  if (_webLock) return;
  if (!('wakeLock' in navigator)) return;
  try {
    _webLock = await navigator.wakeLock.request('screen');
    _webLock.addEventListener('release', () => {
      _webLock = null;
    });
  } catch (e) {
    /* swallow */
  }
}

async function _drop() {
  if (KeepAwakePlugin) {
    try {
      await KeepAwakePlugin.allowSleep();
    } catch (e) {
      /* swallow */
    }
  }
  if (_webLock) {
    try {
      await _webLock.release();
    } catch (e) {
      /* swallow */
    }
    _webLock = null;
  }
}

/** Mark a game as active; acquire the wake lock. */
export async function requestWakeLock() {
  _shouldBeAwake = true;
  await _acquire();
}

/** Mark game as ended; release the wake lock. */
export async function releaseWakeLock() {
  _shouldBeAwake = false;
  await _drop();
}

/** True if a wake-lock-eligible screen is currently expected to keep the device awake. */
export function shouldStayAwake() {
  return _shouldBeAwake;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    // Always try to resume audio context — the silent loop and the
    // suspended-context resume both happen via audio.js helper.
    resumeIfSuspended();
    if (_shouldBeAwake && !_webLock) _acquire();
  });
}
