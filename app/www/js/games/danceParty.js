/* Dance Party — synthesized drum beat plays continuously, voice calls
 * out dance moves. Surprise FREEZE breaks at ~20% per move-change.
 *
 * The beat loops as 8th notes; a kick on 1 and 5, snare on 3 and 7,
 * hi-hat on every odd 8th. Move changes happen on a separate timer.
 */

import {
  ensureAudio,
  playKick,
  playSnare,
  playHat,
  playSuccessJingle,
  playTickSound,
} from '../audio.js';
import {
  speak,
  unlockSpeech,
  startSpeechKeepalive,
  stopSpeechKeepalive,
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

const KEY = 'danceParty';

const STATE = {
  tempo: 'normal',
  freeze: true,
  length: 180,
  voice: true,
};

const DANCE_MOVES = [
  { text: 'The Robot!', emoji: '🤖' },
  { text: 'Disco point!', emoji: '🕺' },
  { text: 'Spin around!', emoji: '🌀' },
  { text: 'Twist twist twist!', emoji: '🌪️' },
  { text: 'Wiggle your hips!', emoji: '💃' },
  { text: 'Kick your legs!', emoji: '🦵' },
  { text: 'Floss dance!', emoji: '🧵' },
  { text: 'The sprinkler!', emoji: '💦' },
  { text: 'Shake shake shake!', emoji: '✨' },
  { text: 'Wave your arms!', emoji: '🙌' },
  { text: 'Jump jump jump!', emoji: '⬆️' },
  { text: 'Funky chicken!', emoji: '🐔' },
  { text: 'The shopping cart!', emoji: '🛒' },
  { text: 'Stir the pot!', emoji: '🥣' },
  { text: 'Wave like seaweed!', emoji: '🌊' },
  { text: 'Clap to the beat!', emoji: '👏' },
  { text: 'Snap your fingers!', emoji: '🫰' },
  { text: 'Stomp your feet!', emoji: '👟' },
  { text: 'Do the moonwalk!', emoji: '🌙' },
  { text: 'Wave a hand in the air!', emoji: '✋' },
  { text: 'Bounce up and down!', emoji: '🏀' },
  { text: 'Slide side to side!', emoji: '↔️' },
];

const DANCE_TEMPO = {
  slow: { bpm: 90, moveMin: 5, moveMax: 9 },
  normal: { bpm: 110, moveMin: 4, moveMax: 7 },
  fast: { bpm: 130, moveMin: 3, moveMax: 5 },
  party: { bpm: 150, moveMin: 2, moveMax: 4 },
};

const moveQueue = makeQueue(() => DANCE_MOVES);

let beatTimer = null;
let beatStep = 0;
let moveTimer = null;
let endTimeout = null;
let endTime = 0;
let timerInterval = null;
let countdownTimer = null;
let frozen = false;

function startBeat() {
  if (beatTimer) clearInterval(beatTimer);
  const cfg = DANCE_TEMPO[STATE.tempo];
  const stepMs = (60 / cfg.bpm / 2) * 1000; // 8th notes
  beatStep = 0;
  const tick = () => {
    if (frozen) {
      beatStep++;
      return;
    }
    const beatInBar = beatStep % 8;
    if (beatInBar === 0 || beatInBar === 4) playKick();
    if (beatInBar === 2 || beatInBar === 6) playSnare();
    if (beatInBar % 2 === 1) playHat();
    beatStep++;
  };
  tick();
  beatTimer = setInterval(tick, stepMs);
}

function stopBeat() {
  if (beatTimer) {
    clearInterval(beatTimer);
    beatTimer = null;
  }
}

function announceMove(move) {
  const emojiEl = document.getElementById('danceEmoji');
  const textEl = document.getElementById('danceText');
  emojiEl.textContent = move.emoji;
  textEl.textContent = move.text;
  retriggerAnim(emojiEl, textEl);
  if (STATE.voice) {
    setTimeout(() => speak(move.text, { rate: 1.05, pitch: 1.1 }), 80);
  }
}

function announceFreeze() {
  const emojiEl = document.getElementById('danceEmoji');
  const textEl = document.getElementById('danceText');
  emojiEl.textContent = '🧊';
  textEl.textContent = 'FREEZE!';
  frozen = true;
  if (STATE.voice) speak('Freeze!', { rate: 1.0, pitch: 1.0 });
  setTimeout(() => {
    if (!isActiveScreen('danceGame')) return;
    frozen = false;
    if (STATE.voice) speak('Dance!', { rate: 1.05, pitch: 1.15 });
    announceMove(moveQueue.next());
  }, 3000);
}

function updateTimer() {
  if (STATE.length <= 0) return;
  const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  document.getElementById('danceTimer').textContent = `${m}:${s
    .toString()
    .padStart(2, '0')} left`;
}

function startGame() {
  show('danceGame');
  moveQueue.reset();
  frozen = false;
  startBeat();
  announceMove(moveQueue.next());

  const fire = () => {
    if (!isActiveScreen('danceGame')) return;
    if (STATE.freeze && Math.random() < 0.2) {
      announceFreeze();
    } else {
      announceMove(moveQueue.next());
    }
    const cfg = DANCE_TEMPO[STATE.tempo];
    const dur = (cfg.moveMin + Math.random() * (cfg.moveMax - cfg.moveMin)) * 1000;
    moveTimer = setTimeout(fire, dur);
  };
  const cfg = DANCE_TEMPO[STATE.tempo];
  const firstDur = (cfg.moveMin + Math.random() * (cfg.moveMax - cfg.moveMin)) * 1000;
  moveTimer = setTimeout(fire, firstDur);

  if (STATE.length > 0) {
    endTime = Date.now() + STATE.length * 1000;
    updateTimer();
    timerInterval = setInterval(updateTimer, 250);
    endTimeout = setTimeout(endGame, STATE.length * 1000);
  } else {
    document.getElementById('danceTimer').textContent = 'Endless mode';
  }
}

function startCountdown() {
  show('danceCountdown');
  let remaining = 3;
  const el = document.getElementById('danceCountdown');
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
  stopBeat();
  if (moveTimer) clearTimeout(moveTimer);
  if (endTimeout) clearTimeout(endTimeout);
  if (timerInterval) clearInterval(timerInterval);
  moveTimer = endTimeout = timerInterval = null;
  releaseWakeLock();
  stopSpeechKeepalive();
  if (STATE.voice) speak('Dance party over! Awesome moves!', { rate: 1.0 });
  playSuccessJingle();
  show('danceEnd');
}

function clearAll() {
  stopBeat();
  if (moveTimer) clearTimeout(moveTimer);
  if (endTimeout) clearTimeout(endTimeout);
  if (timerInterval) clearInterval(timerInterval);
  if (countdownTimer) clearInterval(countdownTimer);
  moveTimer = endTimeout = timerInterval = countdownTimer = null;
}

function updateTempoDisplay() {
  const el = document.getElementById('danceTempoDisplay');
  if (!el) return;
  const cfg = DANCE_TEMPO[STATE.tempo];
  el.textContent = `${cfg.bpm} BPM, moves every ${cfg.moveMin}–${cfg.moveMax} sec`;
}

async function loadSettings() {
  const saved = await load(KEY, null);
  if (!saved) return;
  Object.assign(STATE, saved);
  syncOpt('danceTempoOpts', STATE.tempo);
  syncOpt('danceLengthOpts', String(STATE.length));
  document.getElementById('danceFreezeToggle').classList.toggle('on', !!STATE.freeze);
  document.getElementById('danceVoiceToggle').classList.toggle('on', !!STATE.voice);
  updateTempoDisplay();
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
  setupOpts('danceTempoOpts', (v) => {
    STATE.tempo = v;
    updateTempoDisplay();
    persist();
  });
  setupOpts('danceLengthOpts', (v) => {
    STATE.length = parseInt(v, 10);
    persist();
  });
  setupToggle('danceFreezeToggle', (on) => {
    STATE.freeze = on;
    persist();
  });
  setupToggle('danceVoiceToggle', (on) => {
    STATE.voice = on;
    persist();
  });

  document.getElementById('danceTestBtn').addEventListener('click', () => {
    ensureAudio();
    unlockSpeech();
    let i = 0;
    const stepMs = (60 / DANCE_TEMPO[STATE.tempo].bpm / 2) * 1000;
    const demo = setInterval(() => {
      const b = i % 8;
      if (b === 0 || b === 4) playKick();
      if (b === 2 || b === 6) playSnare();
      if (b % 2 === 1) playHat();
      i++;
      if (i >= 16) clearInterval(demo);
    }, stepMs);
  });

  document.getElementById('danceStartBtn').addEventListener('click', () => {
    ensureAudio();
    unlockSpeech();
    startSpeechKeepalive();
    requestWakeLock();
    startCountdown();
  });

  document.getElementById('danceStopBtn').addEventListener('click', endGame);

  document.getElementById('danceAgainBtn').addEventListener('click', () => {
    clearAll();
    show('setup');
  });

  loadSettings();
}
