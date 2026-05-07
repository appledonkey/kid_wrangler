/* Simon Says — phone says commands. Kids only obey when "Simon says..."
 * comes first, otherwise they freeze (or they're out).
 *
 * Trickiness controls how often Simon-says is dropped from the front
 * of the command. Commands are pulled from a shuffled queue.
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
  isActiveScreen,
  retriggerAnim,
  makeQueue,
} from '../ui.js';
import { load, save } from '../storage.js';
import { isLocked, attemptPurchase } from '../featureFlags.js';
import { successHaptic } from '../native.js';

const KEY = 'simonSays';

const STATE = {
  tricky: 'normal',
  pace: 'normal',
  length: 120,
};

// 60 commands focused on what Simon Says does best: precise body-target
// and quick-reaction commands that test listening. "Act like X" prompts
// belong in Floor Lava and have been moved out of this list.
const SIMON_COMMANDS = [
  // Body parts (15)
  'touch your nose',
  'touch your toes',
  'touch your ears',
  'touch your knees',
  'touch your eyes',
  'touch your mouth',
  'touch your chin',
  'touch your shoulders',
  'touch your elbows',
  'touch your hair',
  'touch your tummy',
  'touch your forehead',
  'touch your wrist',
  'touch your ankle',
  'touch your eyebrows',

  // Quick reactions (12)
  'sit down',
  'stand up',
  'jump up high',
  'spin around',
  'turn around',
  'crouch low',
  'freeze',
  'dance',
  'bow',
  'shrug your shoulders',
  'shake your head',
  'nod your head',

  // Single-action movements (8)
  'clap your hands',
  'wiggle your fingers',
  'stomp your feet',
  'wave hello',
  'blow a kiss',
  'give a thumbs up',
  'cross your arms',
  'stick out your tongue',

  // Counted actions (6)
  'clap three times',
  'blink three times',
  'jump twice',
  'spin twice',
  'stomp three times',
  'snap your fingers',

  // Spatial commands (7)
  'take a step forward',
  'take a step back',
  'take a step left',
  'take a step right',
  'lean forward',
  'reach for the sky',
  'point at the ceiling',

  // Compound moves (6)
  'touch elbow to knee',
  'hop while clapping',
  'stand on one foot and wave',
  'spin while clapping',
  'balance on one foot',
  'march in place',

  // Fun classics (6)
  'wink one eye',
  'make a silly face',
  'tippy toe',
  'open your mouth wide',
  'tiptoe like a ninja',
  'pretend to be a tree',
];

const TRICKY = { easy: 0.15, normal: 0.3, sneaky: 0.5 };
const PACE = {
  slow: [3.5, 5.5],
  normal: [2.2, 4],
  fast: [1.4, 2.6],
  chaos: [0.8, 1.5],
};

const commandQueue = makeQueue(() => SIMON_COMMANDS);

let simonTimer = null;
let endTimeout = null;
let endTime = 0;
let timerInterval = null;
let countdownTimer = null;
let _ended = false;
let _starting = false;

function pickNext() {
  const cmd = commandQueue.next();
  const isSimon = Math.random() > TRICKY[STATE.tricky];
  return { command: cmd, isSimon };
}

function announce(item) {
  const emojiEl = document.getElementById('simonEmoji');
  const textEl = document.getElementById('simonText');
  if (item.isSimon) {
    emojiEl.textContent = '✅';
    textEl.textContent = 'Simon says ' + item.command + '!';
    playChime(659, 1, 0.5);
    setTimeout(() => speak('Simon says ' + item.command, { rate: 1.0, pitch: 1.05 }), 100);
  } else {
    emojiEl.textContent = '⚠️';
    textEl.textContent = item.command + '!';
    playChime(880, 1, 0.4);
    setTimeout(() => speak(item.command, { rate: 1.0, pitch: 1.0 }), 100);
  }
  retriggerAnim(emojiEl, textEl);
}

function updateTimer() {
  if (STATE.length <= 0) return;
  const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  document.getElementById('simonTimer').textContent = `${m}:${s
    .toString()
    .padStart(2, '0')} left`;
}

function startGame() {
  show('simonGame');
  commandQueue.reset();
  const fire = () => {
    if (!isActiveScreen('simonGame')) return;
    const item = pickNext();
    announce(item);
    const spoken = item.isSimon ? 'Simon says ' + item.command : item.command;
    const [min, max] = PACE[STATE.pace];
    const speechMs = speechDurationMs(spoken, { rate: 1.0 });
    const gapMs = (min + Math.random() * (max - min)) * 1000;
    simonTimer = setTimeout(fire, speechMs + gapMs);
  };
  setTimeout(fire, 900);

  if (STATE.length > 0) {
    endTime = Date.now() + STATE.length * 1000;
    updateTimer();
    timerInterval = setInterval(updateTimer, 250);
    endTimeout = setTimeout(endGame, STATE.length * 1000);
  } else {
    document.getElementById('simonTimer').textContent = 'Endless mode';
  }
}

function startCountdown() {
  show('simonCountdown');
  let remaining = 3;
  const el = document.getElementById('simonCountdown');
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
  if (_ended) return;
  _ended = true;
  clearAll();
  releaseWakeLock();
  stopSpeechKeepalive();
  cancelSpeech();
  speak('Time is up! Great listening!', { rate: 1.0 });
  successHaptic();
  playSuccessJingle();
  show('simonEnd');
  _starting = false;
}

function clearAll() {
  if (simonTimer) clearTimeout(simonTimer);
  if (endTimeout) clearTimeout(endTimeout);
  if (timerInterval) clearInterval(timerInterval);
  if (countdownTimer) clearInterval(countdownTimer);
  simonTimer = endTimeout = timerInterval = countdownTimer = null;
}

function updateTrickyDisplay() {
  const el = document.getElementById('simonTrickyDisplay');
  if (!el) return;
  const labels = {
    easy: '~ 1 in 7 are tricks',
    normal: '~ 1 in 3 are tricks',
    sneaky: 'Half are tricks!',
  };
  el.textContent = labels[STATE.tricky] || '';
}

function updatePaceDisplay() {
  const el = document.getElementById('simonPaceDisplay');
  if (!el) return;
  const [min, max] = PACE[STATE.pace] || PACE.normal;
  el.textContent = `${min}–${max} seconds between commands`;
}

async function loadSettings() {
  const saved = await load(KEY, null);
  if (!saved) return;
  Object.assign(STATE, saved);
  syncOpt('simonTrickyOpts', STATE.tricky);
  syncOpt('simonPaceOpts', STATE.pace);
  syncOpt('simonLengthOpts', String(STATE.length));
  updateTrickyDisplay();
  updatePaceDisplay();
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
  setupOpts('simonTrickyOpts', (v) => {
    STATE.tricky = v;
    updateTrickyDisplay();
    persist();
  });
  setupOpts('simonPaceOpts', (v) => {
    STATE.pace = v;
    updatePaceDisplay();
    persist();
  });
  setupOpts('simonLengthOpts', (v) => {
    STATE.length = parseInt(v, 10);
    persist();
  });

  document.getElementById('simonTestBtn').addEventListener('click', () => {
    ensureAudio();
    unlockSpeech();
    playChime(659, 1, 0.5);
    setTimeout(() => speak('Simon says touch your nose', { rate: 1.0, pitch: 1.05 }), 150);
  });

  document.getElementById('simonStartBtn').addEventListener('click', async () => {
    if (_starting) return;
    _starting = true;
    if (await isLocked('simon')) {
      _starting = false;
      attemptPurchase();
      return;
    }
    _ended = false;
    ensureAudio();
    unlockSpeech();
    startSpeechKeepalive();
    requestWakeLock();
    startCountdown();
  });

  document.getElementById('simonStopBtn').addEventListener('click', endGame);

  document.getElementById('simonCancelBtn').addEventListener('click', () => {
    clearAll();
    releaseWakeLock();
    stopSpeechKeepalive();
    _starting = false;
    _ended = false;
    show('setup');
  });

  document.getElementById('simonAgainBtn').addEventListener('click', () => {
    cancelSpeech();
    clearAll();
    _ended = false;
    _starting = false;
    show('setup');
  });

  loadSettings();
}
