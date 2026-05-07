/* Weather Report — phone is the cheery weatherman.
 *
 * Each "tick" picks a weather entry from the shuffled queue, announces it
 * (emoji + voice + body bg theme), then ~60% of the time chains a follow-up
 * "reaction" prompt scoped to the same category 600ms after the weather
 * speech finishes. Reactions feel like part of a tiny themed scene:
 *   "It's pouring!" → "Jump in muddy puddles!"
 *   "Ice everywhere!" → "Don't slip on the ice!"
 *
 * Speech-aware pacing: the next tick fires speech_duration + paceGap after
 * the current line, so commands never overlap.
 */

import {
  ensureAudio,
  playChime,
  playTickSound,
  playSuccessJingle,
} from '../audio.js';
import {
  speak,
  unlockSpeech,
  startSpeechKeepalive,
  stopSpeechKeepalive,
  speechDurationMs,
  cancelSpeech,
} from '../speech.js';
import { requestWakeLock, releaseWakeLock } from '../wakeLock.js';
import {
  show,
  setupOpts,
  setupToggle,
  isActiveScreen,
  retriggerAnim,
  makeQueue,
} from '../ui.js';
import { load, save } from '../storage.js';
import { tapHaptic, successHaptic } from '../native.js';
import { WEATHER, REACTIONS, CATEGORIES } from './weatherData.js';

const KEY = 'weatherReport';

const STATE = {
  pace: 'normal',
  length: 120,
  reactions: true,
  sfx: true,
};

const WEATHER_PACE = {
  slow: [6, 10],
  normal: [3, 6],
  fast: [1.5, 3],
  chaos: [0.8, 1.5],
};

const REACTION_CHANCE = 0.6;
const REACTION_PAUSE_MS = 600;

const BG_CLASSES = CATEGORIES.map((c) => `${c}-bg`);

const weatherQueue = makeQueue(() => WEATHER);

let actionTimer = null;
let reactionTimer = null;
let endTimeout = null;
let endTime = 0;
let timerInterval = null;
let countdownTimer = null;

function setBg(category) {
  document.body.classList.remove(...BG_CLASSES);
  if (category) document.body.classList.add(`${category}-bg`);
}

function announce(text, emoji) {
  const emojiEl = document.getElementById('weatherEmoji');
  const textEl = document.getElementById('weatherText');
  if (!emojiEl || !textEl) return;
  emojiEl.textContent = emoji;
  textEl.textContent = text;
  retriggerAnim(emojiEl, textEl);
}

function pickReaction(category) {
  const pool = REACTIONS[category];
  if (!pool || !pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function updateTimer() {
  if (STATE.length <= 0) return;
  const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const el = document.getElementById('weatherTimer');
  if (el) el.textContent = `${m}:${s.toString().padStart(2, '0')} left`;
}

function startGame() {
  show('weatherGame');
  weatherQueue.reset();
  setBg(null);

  const fire = () => {
    if (!isActiveScreen('weatherGame')) return;
    const w = weatherQueue.next();
    setBg(w.category);
    announce(w.text, w.emoji);
    if (STATE.sfx) playChime(659, 1, 0.55);
    setTimeout(() => speak(w.text, { rate: 1.0, pitch: 1.05 }), 100);

    const speechMs = speechDurationMs(w.text, { rate: 1.0 });
    const willReact = STATE.reactions && Math.random() < REACTION_CHANCE;
    const [paceMin, paceMax] = WEATHER_PACE[STATE.pace] || WEATHER_PACE.normal;
    const gapMs = (paceMin + Math.random() * (paceMax - paceMin)) * 1000;

    if (willReact) {
      const r = pickReaction(w.category);
      if (r) {
        const reactDelay = speechMs + REACTION_PAUSE_MS;
        reactionTimer = setTimeout(() => {
          if (!isActiveScreen('weatherGame')) return;
          announce(r.text, r.emoji);
          setTimeout(() => speak(r.text, { rate: 1.05, pitch: 1.1 }), 80);
        }, reactDelay);
        const reactSpeechMs = speechDurationMs(r.text, { rate: 1.05 });
        actionTimer = setTimeout(fire, reactDelay + reactSpeechMs + gapMs);
        return;
      }
    }
    actionTimer = setTimeout(fire, speechMs + gapMs);
  };
  setTimeout(fire, 900);

  if (STATE.length > 0) {
    endTime = Date.now() + STATE.length * 1000;
    updateTimer();
    timerInterval = setInterval(updateTimer, 250);
    endTimeout = setTimeout(endGame, STATE.length * 1000);
  } else {
    const el = document.getElementById('weatherTimer');
    if (el) el.textContent = 'Endless mode';
  }
}

function startCountdown() {
  show('weatherCountdown');
  let remaining = 3;
  const el = document.getElementById('weatherCountdown');
  if (el) el.textContent = remaining;
  playTickSound();
  countdownTimer = setInterval(() => {
    remaining--;
    if (remaining > 0) {
      if (el) el.textContent = remaining;
      playTickSound();
    } else {
      clearInterval(countdownTimer);
      countdownTimer = null;
      startGame();
    }
  }, 1000);
}

function endGame() {
  if (actionTimer) clearTimeout(actionTimer);
  if (reactionTimer) clearTimeout(reactionTimer);
  if (endTimeout) clearTimeout(endTimeout);
  if (timerInterval) clearInterval(timerInterval);
  actionTimer = reactionTimer = endTimeout = timerInterval = null;
  releaseWakeLock();
  stopSpeechKeepalive();
  cancelSpeech();
  setBg(null);
  speak("That's all for today's weather!", { rate: 1.0 });
  successHaptic();
  playSuccessJingle();
  show('weatherEnd');
}

function clearAll() {
  if (actionTimer) clearTimeout(actionTimer);
  if (reactionTimer) clearTimeout(reactionTimer);
  if (endTimeout) clearTimeout(endTimeout);
  if (timerInterval) clearInterval(timerInterval);
  if (countdownTimer) clearInterval(countdownTimer);
  actionTimer = reactionTimer = endTimeout = timerInterval = countdownTimer = null;
}

// ---------- Display helpers ----------

function updatePaceDisplay() {
  const el = document.getElementById('weatherPaceDisplay');
  if (!el) return;
  const [min, max] = WEATHER_PACE[STATE.pace] || WEATHER_PACE.normal;
  el.textContent = `${min}–${max} seconds between reports`;
}

// ---------- Wiring ----------

function syncOpt(containerId, value) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.querySelectorAll('.opt').forEach((b) => {
    b.classList.toggle('selected', b.dataset.val === value);
  });
}

async function loadSettings() {
  const saved = await load(KEY, null);
  if (saved) {
    if (typeof saved.pace === 'string') STATE.pace = saved.pace;
    if (typeof saved.length === 'number') STATE.length = saved.length;
    if (typeof saved.reactions === 'boolean') STATE.reactions = saved.reactions;
    if (typeof saved.sfx === 'boolean') STATE.sfx = saved.sfx;
  }
  syncOpt('weatherPaceOpts', STATE.pace);
  syncOpt('weatherLengthOpts', String(STATE.length));
  document
    .getElementById('weatherReactionsToggle')
    ?.classList.toggle('on', !!STATE.reactions);
  document
    .getElementById('weatherSfxToggle')
    ?.classList.toggle('on', !!STATE.sfx);
  updatePaceDisplay();
}

const persist = () => save(KEY, STATE);

export function init() {
  setupOpts('weatherPaceOpts', (v) => {
    STATE.pace = v;
    updatePaceDisplay();
    persist();
  });
  setupOpts('weatherLengthOpts', (v) => {
    STATE.length = parseInt(v, 10);
    persist();
  });
  setupToggle('weatherReactionsToggle', (on) => {
    STATE.reactions = on;
    persist();
  });
  setupToggle('weatherSfxToggle', (on) => {
    STATE.sfx = on;
    persist();
  });

  document.getElementById('weatherTestBtn')?.addEventListener('click', () => {
    ensureAudio();
    unlockSpeech();
    playChime(659, 1, 0.6);
    setTimeout(
      () => speak("It's pouring rain!", { rate: 1.0, pitch: 1.05 }),
      150
    );
  });

  document.getElementById('weatherStartBtn')?.addEventListener('click', () => {
    ensureAudio();
    unlockSpeech();
    startSpeechKeepalive();
    requestWakeLock();
    tapHaptic();
    startCountdown();
  });

  document.getElementById('weatherStopBtn')?.addEventListener('click', endGame);

  document.getElementById('weatherAgainBtn')?.addEventListener('click', () => {
    clearAll();
    setBg(null);
    show('setup');
  });

  loadSettings();
}
