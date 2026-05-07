/* Paywall feature flags.
 *
 * v1 ships with everything unlocked — V1_FORCE_UNLOCKED = true. The lock UI
 * is wired but never displays, because isPremium() always returns true.
 *
 * v1.1 will flip V1_FORCE_UNLOCKED to false and replace `attemptPurchase()`
 * with a real RevenueCat call. No other code in the app needs to change —
 * the lock checks throughout the games already gate on isLocked().
 *
 * Apple's review team prefers seeing the IAP architecture wired up *before*
 * it's enforced. That's exactly what this v1 setup is.
 */

import { load, save } from './storage.js';

const PAYWALL_KEY = 'premiumUnlocked';

/** Game IDs that go behind the $4.99 unlock. Free games are not in this set. */
export const PAID_GAMES = new Set(['hero', 'simon', 'charades', 'mission']);

/**
 * v1 toggle. Leave true through v1.x. Flip to false the same release that
 * wires up RevenueCat / native IAP, so the user-facing paywall and the real
 * purchase flow ship together.
 */
const V1_FORCE_UNLOCKED = true;

let _premiumCache = null;
let _purchaseInFlight = false;

export function isPaidGame(gameId) {
  return PAID_GAMES.has(gameId);
}

/** True if the user has unlocked the premium pack. Cached after first read. */
export async function isPremium() {
  if (V1_FORCE_UNLOCKED) return true;
  if (_premiumCache !== null) return _premiumCache;
  _premiumCache = await load(PAYWALL_KEY, false);
  return _premiumCache;
}

/** True if the given game is paid AND the user hasn't unlocked yet. */
export async function isLocked(gameId) {
  if (!isPaidGame(gameId)) return false;
  return !(await isPremium());
}

/**
 * Triggered when a locked game's Start button is tapped.
 *
 * Single-flight: if a purchase is already in progress, a second concurrent
 * call short-circuits and returns immediately. This matters most in v1.1
 * — when the alert() below is replaced with a real async RevenueCat flow,
 * a rapid double-tap on Start could otherwise trigger two purchase prompts
 * (and on Android, two charges). The per-game `_starting` flag in each
 * Start handler is the first line of defense; this is belt-and-suspenders.
 *
 * v1: shows a "coming soon" notice — never actually fires because the lock
 *     check above always passes when V1_FORCE_UNLOCKED is true.
 *
 * v1.1: replace the alert() body with:
 *
 *   import { Purchases } from '@revenuecat/purchases-capacitor';
 *   const offerings = await Purchases.getOfferings();
 *   const pkg = offerings.current.availablePackages[0];
 *   const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
 *   if (customerInfo.entitlements.active.premium) await markPurchased();
 */
export async function attemptPurchase() {
  if (_purchaseInFlight) return;
  _purchaseInFlight = true;
  try {
    // Capacitor's WebView supports window.alert; on native iOS/Android it
    // routes to a native dialog. Replace with @capacitor/dialog if you want
    // tighter control over the look.
    alert(
      'Premium Unlock\n\n' +
        'Unlocks Super Hero, Simon Says, and Animal Acts ' +
        '(plus future premium games) with a one-time $4.99 purchase.\n\n' +
        'Real purchase flow lands in version 1.1.'
    );
  } finally {
    _purchaseInFlight = false;
  }
}

/** Persist that the user has paid. v1.1 hooks this up after a successful purchase. */
export async function markPurchased() {
  await save(PAYWALL_KEY, true);
  _premiumCache = true;
  await applyPaywallUI();
}

/** Reset for testing — not exposed to users. */
export async function _devLock() {
  await save(PAYWALL_KEY, false);
  _premiumCache = false;
  await applyPaywallUI();
}

/**
 * Walk every .game-opt tile and toggle a `.locked` class based on the current
 * premium state. Called once at boot and again whenever premium state changes.
 */
export async function applyPaywallUI() {
  const unlocked = await isPremium();
  document.querySelectorAll('.game-opt').forEach((btn) => {
    const id = btn.dataset.val;
    btn.classList.toggle('locked', isPaidGame(id) && !unlocked);
  });
}
