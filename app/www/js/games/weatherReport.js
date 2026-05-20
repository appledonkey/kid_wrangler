/* Weather Report — phone is the cheery weatherman.
 *
 * Each "tick" picks a weather entry from the shuffled queue and announces
 * it (emoji + voice + body bg theme). Kids react in their own way to each
 * forecast — no scripted follow-up.
 *
 * Speech-aware pacing: the next tick fires speech_duration + paceGap
 * after the current line, so commands never overlap.
 *
 * (Earlier versions chained category-scoped "reaction" prompts after
 * each weather call. Removed 2026-05-11 — kept the game simpler and
 * cut the voice-recording pool by ~50 lines.)
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
import { WEATHER, CATEGORIES } from './weatherData.js';

const KEY = 'weatherReport';

const STATE = {
  pace: 'normal',
  length: 120,
  sfx: true,
};

const WEATHER_PACE = {
  slow: [6, 10],
  normal: [3, 6],
  fast: [1.5, 3],
  chaos: [0.8, 1.5],
};

const BG_CLASSES = CATEGORIES.map((c) => `${c}-bg`);

const weatherQueue = makeQueue(() => WEATHER);

let actionTimer = null;
let endTimeout = null;
let endTime = 0;
let timerInterval = null;
let countdownTimer = null;
let _ended = false;
let _starting = false;

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
  // Reset prompt area so stale state from the last session doesn't flash.
  document.getElementById('weatherEmoji').textContent = '🌦️';
  document.getElementById('weatherText').textContent = 'And now, the weather!';

  const fire = () => {
    if (!isActiveScreen('weatherGame')) return;
    const w = weatherQueue.next();
    setBg(w.category);
    announce(w.text, w.emoji);
    if (STATE.sfx) playChime(659, 1, 0.55);
    setTimeout(() => speak(w.text, { rate: 1.0, pitch: 1.05 }), 100);

    const speechMs = speechDurationMs(w.text, { rate: 1.0 });
    const [paceMin, paceMax] = WEATHER_PACE[STATE.pace] || WEATHER_PACE.normal;
    const gapMs = (paceMin + Math.random() * (paceMax - paceMin)) * 1000;
    actionTimer = setTimeout(fire, speechMs + gapMs);
  };
  setTimeout(fire, 250); // see floorLava.js for the rationale

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
  if (_ended) return;
  _ended = true;
  clearAll();
  releaseWakeLock();
  stopSpeechKeepalive();
  cancelSpeech();
  setBg(null);
  speak("That's all for today's weather!", { rate: 1.0 });
  successHaptic();
  playSuccessJingle();
  show('weatherEnd');
  _starting = false;
}

function clearAll() {
  if (actionTimer) clearTimeout(actionTimer);
  if (endTimeout) clearTimeout(endTimeout);
  if (timerInterval) clearInterval(timerInterval);
  if (countdownTimer) clearInterval(countdownTimer);
  actionTimer = endTimeout = timerInterval = countdownTimer = null;
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
    if (typeof saved.sfx === 'boolean') STATE.sfx = saved.sfx;
    // Earlier versions persisted `reactions: true/false`; the feature is
    // gone but the saved field is harmlessly ignored.
  }
  syncOpt('weatherPaceOpts', STATE.pace);
  syncOpt('weatherLengthOpts', String(STATE.length));
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
    if (_starting) return;
    _starting = true;
    _ended = false;
    ensureAudio();
    unlockSpeech();
    startSpeechKeepalive();
    requestWakeLock();
    tapHaptic();
    startCountdown();
  });

  document.getElementById('weatherStopBtn')?.addEventListener('click', endGame);

  document.getElementById('weatherCancelBtn')?.addEventListener('click', () => {
    clearAll();
    releaseWakeLock();
    stopSpeechKeepalive();
    setBg(null);
    _starting = false;
    _ended = false;
    show('setup');
  });

  document.getElementById('weatherAgainBtn')?.addEventListener('click', () => {
    cancelSpeech();
    clearAll();
    setBg(null);
    _ended = false;
    _starting = false;
    show('setup');
  });

  loadSettings();
}
