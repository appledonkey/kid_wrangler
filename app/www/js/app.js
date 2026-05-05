/* App bootstrap.
 *
 * Wires up the game picker on the setup screen and delegates each
 * game's settings + flow to its own module. Also registers the
 * service worker (web/PWA) and hides the native splash screen
 * once the first paint completes.
 */

import { initScreens } from './ui.js';
import { hideSplash, setStatusBar, isNative } from './native.js';
import { load, save } from './storage.js';
import { applyPaywallUI } from './featureFlags.js';

import * as findMe from './games/findMe.js';
import * as redLight from './games/redLight.js';
import * as floorLava from './games/floorLava.js';
import * as superHero from './games/superHero.js';
import * as simonSays from './games/simonSays.js';
import * as animalCharades from './games/animalCharades.js';
import * as whatIsIt from './games/whatIsIt.js';

const PANEL_BY_GAME = {
  findMe: 'findMeSettings',
  rlgl: 'rlglSettings',
  action: 'actionSettings',
  hero: 'heroSettings',
  simon: 'simonSettings',
  charades: 'charadesSettings',
  whatis: 'whatIsItSettings',
};

// Games that are present in the picker but not yet wired up. Tiles for these
// are visually disabled and clicks are ignored.
const COMING_SOON = new Set(['dance', 'guess']);

const ACTIVE_GAME_KEY = 'activeGame';

function showGamePanel(name) {
  for (const [key, panelId] of Object.entries(PANEL_BY_GAME)) {
    const el = document.getElementById(panelId);
    if (el) el.classList.toggle('hidden', key !== name);
  }
  // Reflect in the game picker.
  const container = document.getElementById('gameOpts');
  if (container) {
    container.querySelectorAll('.game-opt').forEach((b) => {
      b.classList.toggle('selected', b.dataset.val === name);
    });
  }
}

function setupGamePicker() {
  const container = document.getElementById('gameOpts');
  if (!container) return;
  container.querySelectorAll('.game-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.val;
      if (COMING_SOON.has(v)) return; // tile is just a placeholder
      showGamePanel(v);
      save(ACTIVE_GAME_KEY, v);
    });
  });
}

async function restoreLastGame() {
  const v = await load(ACTIVE_GAME_KEY, 'findMe');
  // If the saved game is unavailable (e.g. now coming-soon), fall back to default.
  const target = PANEL_BY_GAME[v] ? v : 'findMe';
  showGamePanel(target);
}

function registerServiceWorker() {
  // Don't register the SW when running in Capacitor — the WebView
  // already serves from the bundled webDir, and SWs add no value
  // and can cause cache headaches inside a native shell.
  if (isNative) return;
  if (!('serviceWorker' in navigator)) return;
  // Only register on http(s); skip file:// previews.
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;

  const isLocalhost =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '';

  if (isLocalhost) {
    // Don't register a SW on localhost. Also clean up any registration left
    // over from earlier dev sessions so we stop serving stale cached JS.
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js')
      .catch((err) => console.warn('[SW] register failed', err));
  });
}

function bootstrap() {
  initScreens();
  setupGamePicker();
  restoreLastGame();

  // Init each (active) game module exactly once. Coming-soon games (dance,
  // guess) intentionally aren't imported — saves bytes and keeps stale event
  // bindings out of the DOM.
  findMe.init();
  redLight.init();
  floorLava.init();
  superHero.init();
  simonSays.init();
  animalCharades.init();
  whatIsIt.init();

  // Mark paid game tiles as locked / unlocked based on premium state.
  // v1 always returns "unlocked" so this is currently a no-op visually.
  applyPaywallUI();

  registerServiceWorker();

  // Hide the splash screen as soon as the first paint completes.
  requestAnimationFrame(() => {
    setTimeout(() => {
      hideSplash();
      // Match status bar to the cream background.
      setStatusBar('#FFF4E0', false);
    }, 50);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
