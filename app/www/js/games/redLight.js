/* Red Light / Green Light — phone calls "Green Light" / "Red Light" at random
 * intervals. Kids run on green, freeze on red.
 *
 * Optional Yellow Light mode: ~30% of greens transition to yellow ("slow
 * motion") before red. Red ALWAYS follows yellow — yellow is just a
 * teach-the-kid pause before the freeze.
 */

import {
  ensureAudio,
  playGreenSound,
  playYellowSound,
  playRedSound,
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
import { show, screens, setupOpts, setupToggle, isActiveScreen, retriggerAnim } from '../ui.js';
import { load, save } from '../storage.js';
import { successHaptic, warningHaptic, tapHaptic } from '../native.js';

const KEY = 'rlgl';

const STATE = {
  speed: 'normal',
  length: 120,
  voice: true,
  yellowLight: false,
};

// [greenMin, greenMax, redMin, redMax] in seconds
const SPEED_CONFIG = {
  slow: [5, 10, 1.5, 3],
  normal: [3, 7, 2, 4],
  fast: [1.5, 4, 1.5, 3.5],
  chaos: [0.8, 2.5, 0.8, 2.5],
};

// Yellow phase always runs short — feels like a "slow motion" beat before red.
const YELLOW_DURATION = [1.5, 2.5];
// Probability that a green transitions to yellow (vs straight to red) when
// the Yellow Light toggle is on.
const YELLOW_PROBABILITY = 0.35;

function normalizePaceKey(k) {
  return k === 'relaxed' ? 'slow' : k;
}

let stateTimeout = null;
let endTimeout = null;
let endTime = 0;
let timerInterval = null;
let countdownTimer = null;
let currentLight = 'green';

function setLight(newState) {
  currentLight = newState;
  const body = document.body;
  const emoji = document.getElementById('rlglEmoji');
  const stateText = document.getElementById('rlglStateText');
  const actionText = document.getElementById('rlglActionText');

  body.classList.remove('green-bg', 'red-bg', 'yellow-bg');

  if (newState === 'green') {
    body.classList.add('green-bg');
    emoji.textContent = '🟢';
    stateText.textContent = 'GREEN LIGHT';
    actionText.textContent = 'RUN!';
    retriggerAnim(emoji, stateText);
    playGreenSound();
    if (STATE.voice) setTimeout(() => speak('Green light!', { rate: 1.05, pitch: 1.1 }), 100);
  } else if (newState === 'yellow') {
    body.classList.add('yellow-bg');
    emoji.textContent = '🟡';
    stateText.textContent = 'YELLOW LIGHT';
    actionText.textContent = 'SLOW MO!';
    retriggerAnim(emoji, stateText);
    tapHaptic();
    playYellowSound();
    if (STATE.voice) setTimeout(() => speak('Yellow light!', { rate: 1.0, pitch: 1.0 }), 100);
  } else {
    body.classList.add('red-bg');
    emoji.textContent = '🔴';
    stateText.textContent = 'RED LIGHT';
    actionText.textContent = 'FREEZE!';
    retriggerAnim(emoji, stateText);
    warningHaptic();
    playRedSound();
    if (STATE.voice) setTimeout(() => speak('Red light!', { rate: 1.05, pitch: 0.95 }), 100);
  }

  scheduleNext();
}

function scheduleNext() {
  const cfg = SPEED_CONFIG[STATE.speed];

  // How long does the CURRENT state last?
  let gapMs;
  if (currentLight === 'green') {
    gapMs = (cfg[0] + Math.random() * (cfg[1] - cfg[0])) * 1000;
  } else if (currentLight === 'yellow') {
    gapMs = (YELLOW_DURATION[0] + Math.random() * (YELLOW_DURATION[1] - YELLOW_DURATION[0])) * 1000;
  } else {
    gapMs = (cfg[2] + Math.random() * (cfg[3] - cfg[2])) * 1000;
  }

  // Wait for voice to finish before timing the next state, so CHAOS pace
  // doesn't cut "Green light!" off mid-word.
  let speechMs = 0;
  if (STATE.voice) {
    const text =
      currentLight === 'green' ? 'Green light!' :
      currentLight === 'yellow' ? 'Yellow light!' :
      'Red light!';
    speechMs = speechDurationMs(text, { rate: 1.05 });
  }

  const duration = speechMs + gapMs;

  if (stateTimeout) clearTimeout(stateTimeout);
  stateTimeout = setTimeout(() => {
    if (!isActiveScreen('rlglGame')) return;

    // Determine NEXT state.
    let nextState;
    if (currentLight === 'green') {
      nextState = STATE.yellowLight && Math.random() < YELLOW_PROBABILITY
        ? 'yellow'
        : 'red';
    } else if (currentLight === 'yellow') {
      nextState = 'red'; // red ALWAYS follows yellow
    } else {
      nextState = 'green';
    }

    setLight(nextState);
  }, duration);
}

function updateTimer() {
  if (STATE.length <= 0) return;
  const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  document.getElementById('rlglTimer').textContent = `${m}:${s.toString().padStart(2, '0')} left`;
}

function startGame() {
  show('rlglGame');
  setLight('green');
  if (STATE.length > 0) {
    endTime = Date.now() + STATE.length * 1000;
    updateTimer();
    timerInterval = setInterval(updateTimer, 250);
    endTimeout = setTimeout(endGame, STATE.length * 1000);
  } else {
    document.getElementById('rlglTimer').textContent = 'Endless mode';
  }
}

function startCountdown() {
  show('rlglCountdown');
  let remaining = 3;
  const el = document.getElementById('rlglCountdown');
  el.textContent = remaining;
  playTickSound();
  countdownTimer = setInterval(() => {
    remaining--;
    if (remaining > 0) {
      el.textContent = remaining;
      playTickSound();
    } else {
      clearInterval(countdownTimer);
      countdownTimer = null;
      startGame();
    }
  }, 1000);
}

function endGame() {
  if (stateTimeout) clearTimeout(stateTimeout);
  if (endTimeout) clearTimeout(endTimeout);
  if (timerInterval) clearInterval(timerInterval);
  stateTimeout = endTimeout = timerInterval = null;
  releaseWakeLock();
  stopSpeechKeepalive();
  cancelSpeech();
  document.body.classList.remove('green-bg', 'red-bg', 'yellow-bg');
  if (STATE.voice) speak('Time is up! Great job!', { rate: 1.0 });
  successHaptic();
  playSuccessJingle();
  show('rlglEnd');
}

function clearAll() {
  if (stateTimeout) clearTimeout(stateTimeout);
  if (endTimeout) clearTimeout(endTimeout);
  if (timerInterval) clearInterval(timerInterval);
  if (countdownTimer) clearInterval(countdownTimer);
  stateTimeout = endTimeout = timerInterval = countdownTimer = null;
}

// ---------- Wiring ----------

async function loadSettings() {
  const saved = await load(KEY, null);
  if (!saved) return;
  Object.assign(STATE, saved);
  STATE.speed = normalizePaceKey(STATE.speed);
  syncOpt('rlglSpeedOpts', STATE.speed);
  syncOpt('rlglLengthOpts', String(STATE.length));
  document.getElementById('voiceToggle').classList.toggle('on', !!STATE.voice);
  document.getElementById('yellowToggle').classList.toggle('on', !!STATE.yellowLight);
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
  setupOpts('rlglSpeedOpts', (v) => {
    STATE.speed = v;
    persist();
  });
  setupOpts('rlglLengthOpts', (v) => {
    STATE.length = parseInt(v, 10);
    persist();
  });
  setupToggle('voiceToggle', (on) => {
    STATE.voice = on;
    persist();
  });
  setupToggle('yellowToggle', (on) => {
    STATE.yellowLight = on;
    persist();
  });

  document.getElementById('rlglTestBtn').addEventListener('click', () => {
    ensureAudio();
    unlockSpeech();
    playGreenSound();
    if (STATE.voice) {
      setTimeout(() => speak('Green light!', { rate: 1.0, pitch: 1.1 }), 100);
    }
  });

  document.getElementById('rlglStartBtn').addEventListener('click', () => {
    ensureAudio();
    unlockSpeech();
    startSpeechKeepalive();
    requestWakeLock();
    startCountdown();
  });

  document.getElementById('rlglStopBtn').addEventListener('click', endGame);

  document.getElementById('rlglAgainBtn').addEventListener('click', () => {
    clearAll();
    document.body.classList.remove('green-bg', 'red-bg', 'yellow-bg');
    show('setup');
  });

  loadSettings();
}
