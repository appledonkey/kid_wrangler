/* What Is It? — phone shows an emoji, kids guess what it is, parent taps
 * Reveal Answer to confirm. Visual cousin of Guess the Sound.
 *
 * Categories: All / Animals / Food / Objects / Vehicles / Nature.
 * Optional: auto-advance after a reveal.
 */

import { ensureAudio, playChime, playSuccessJingle } from '../audio.js';
import {
  speak,
  unlockSpeech,
  startSpeechKeepalive,
  stopSpeechKeepalive,
} from '../speech.js';
import { requestWakeLock, releaseWakeLock } from '../wakeLock.js';
import { show, setupOpts, setupToggle, isActiveScreen, makeQueue } from '../ui.js';
import { itemsIn, CATEGORIES, CATEGORY_LABELS } from './whatIsItData.js';
import { load, save } from '../storage.js';
import { tapHaptic, successHaptic } from '../native.js';

const KEY = 'whatIsIt';

const STATE = {
  category: 'all',
  auto: false,
};

let round = 0;
let currentItem = null;
let revealed = false;
let autoTimeout = null;

const itemQueue = makeQueue(() => itemsIn(STATE.category));

function startRound() {
  revealed = false;
  round++;
  document.getElementById('whatIsItScore').textContent = 'Round ' + round;

  currentItem = itemQueue.next();

  const emojiEl = document.getElementById('whatIsItEmoji');
  const textEl = document.getElementById('whatIsItText');
  emojiEl.textContent = currentItem.emoji;
  textEl.textContent = 'What is it?';
  document.getElementById('whatIsItRevealBtn').textContent = 'Reveal Answer';

  playChime(659, 1, 0.5);
}

function reveal() {
  if (!currentItem || revealed) return;
  revealed = true;
  const item = currentItem;
  document.getElementById('whatIsItText').textContent = "It's a " + item.name + '!';
  setTimeout(() => speak("It's a " + item.name, { rate: 1.0, pitch: 1.05 }), 200);
  document.getElementById('whatIsItRevealBtn').textContent = 'Next';

  if (STATE.auto) {
    autoTimeout = setTimeout(() => {
      if (isActiveScreen('whatIsItGame')) startRound();
    }, 3500);
  }
}

function endGame() {
  if (autoTimeout) clearTimeout(autoTimeout);
  releaseWakeLock();
  stopSpeechKeepalive();
  document.getElementById('whatIsItFinalScore').textContent =
    round + (round === 1 ? ' emoji shown!' : ' emojis shown!');
  successHaptic();
  playSuccessJingle();
  show('whatIsItEnd');
}

function updatePoolDisplay() {
  const el = document.getElementById('whatIsItPoolDisplay');
  if (!el) return;
  const count = itemsIn(STATE.category).length;
  el.textContent = `${CATEGORY_LABELS[STATE.category]} — ${count} emojis`;
}

async function loadSettings() {
  const saved = await load(KEY, null);
  if (saved) {
    if (typeof saved.category === 'string' && CATEGORIES.includes(saved.category)) {
      STATE.category = saved.category;
    }
    if (typeof saved.auto === 'boolean') STATE.auto = saved.auto;
  }
  syncOpt('whatIsItPoolOpts', STATE.category);
  document.getElementById('whatIsItAutoToggle').classList.toggle('on', !!STATE.auto);
  updatePoolDisplay();
}

function syncOpt(containerId, value) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.querySelectorAll('.opt').forEach((b) => {
    b.classList.toggle('selected', b.dataset.val === value);
  });
}

const persist = () => save(KEY, STATE);

export function init() {
  setupOpts('whatIsItPoolOpts', (v) => {
    STATE.category = v;
    itemQueue.reset();
    updatePoolDisplay();
    persist();
  });
  setupToggle('whatIsItAutoToggle', (on) => {
    STATE.auto = on;
    persist();
  });

  document.getElementById('whatIsItTestBtn').addEventListener('click', () => {
    ensureAudio();
    unlockSpeech();
    playChime(659, 1, 0.5);
    setTimeout(() => speak("It's an apple", { rate: 1.0, pitch: 1.05 }), 150);
  });

  document.getElementById('whatIsItStartBtn').addEventListener('click', () => {
    ensureAudio();
    unlockSpeech();
    startSpeechKeepalive();
    requestWakeLock();
    round = 0;
    show('whatIsItGame');
    itemQueue.reset();
    setTimeout(startRound, 400);
  });

  document.getElementById('whatIsItRevealBtn').addEventListener('click', () => {
    tapHaptic();
    if (autoTimeout) {
      clearTimeout(autoTimeout);
      autoTimeout = null;
    }
    if (revealed) startRound();
    else reveal();
  });

  document.getElementById('whatIsItStopBtn').addEventListener('click', endGame);

  document.getElementById('whatIsItAgainBtn').addEventListener('click', () => {
    if (autoTimeout) clearTimeout(autoTimeout);
    show('setup');
  });

  loadSettings();
}
