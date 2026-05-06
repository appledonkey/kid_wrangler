/* Find Me — hide the phone, the phone makes escalating sounds until found.
 *
 * Pick one of 8 timbres (chime / bell / siren / beep / cuckoo / whistle /
 * boing / birdcall). 5-phase escalation tied to STATE.difficulty
 * (Easy 25s/phase ≈ 2 min total, Medium 45s ≈ 4 min, Hard 70s ≈ 6 min).
 */

import {
  ensureAudio,
  resumeIfSuspended,
  playChirpSound,
  playSuccessJingle,
} from '../audio.js';
import { requestWakeLock, releaseWakeLock } from '../wakeLock.js';
import { show, isActiveScreen } from '../ui.js';
import { load, save } from '../storage.js';
import { successHaptic } from '../native.js';

const KEY = 'findMe';

const TIMBRES = [
  'chime', 'bell', 'siren', 'beep', 'cuckoo', 'whistle', 'boing', 'birdcall',
];

const STATE = {
  sound: 'chime',
  difficulty: 'medium',
  hideTime: 20,
};

const PHASE_DURATION = { easy: 25, medium: 45, hard: 70 };
const NUM_PHASES = 5;

const DIFFICULTY_LABELS = {
  easy: 'Chirps speed up from every 22s → every 2s, over 2 min',
  medium: 'Chirps speed up from every 22s → every 2s, over 4 min',
  hard: 'Chirps speed up from every 22s → every 2s, over 6 min',
};

const PHASES = [
  { interval: 22000, baseFreq: 523, notes: 1, vol: 0.4, label: 'Listening for footsteps...' },
  { interval: 14000, baseFreq: 587, notes: 2, vol: 0.55, label: 'Hmm, where could they be?' },
  { interval: 8000, baseFreq: 659, notes: 3, vol: 0.75, label: 'Getting a little nervous...' },
  { interval: 4500, baseFreq: 784, notes: 4, vol: 0.9, label: 'Help! Find me!' },
  { interval: 2200, baseFreq: 880, notes: 5, vol: 1.0, label: 'FIND ME NOW!!!' },
];

let chirpTimer = null;
let countdownTimer = null;
let phaseTimers = [];
let seekStartTime = 0;
let currentPhase = 0;
let lastChirpAt = 0;
let watchdog = null;

// ---------- Visual ----------

function visualChirp() {
  const c = document.getElementById('creature');
  const r1 = document.getElementById('ring1');
  const r2 = document.getElementById('ring2');
  if (!c) return;
  c.classList.add('singing');
  r1.classList.remove('go');
  r2.classList.remove('go');
  void r1.offsetWidth;
  r1.classList.add('go');
  setTimeout(() => {
    void r2.offsetWidth;
    r2.classList.add('go');
  }, 300);
  setTimeout(() => c.classList.remove('singing'), 600);
}

function clearAllPhaseTimers() {
  phaseTimers.forEach((t) => clearTimeout(t));
  phaseTimers = [];
  if (chirpTimer) {
    clearInterval(chirpTimer);
    chirpTimer = null;
  }
}

// ---------- Phase scheduling ----------

function setPhase(p) {
  currentPhase = p;
  if (chirpTimer) {
    clearInterval(chirpTimer);
    chirpTimer = null;
  }
  const cfg = PHASES[p];
  document.getElementById('status').textContent = cfg.label;

  const fire = () => {
    resumeIfSuspended();
    visualChirp();
    playChirpSound(STATE.sound, cfg.baseFreq, cfg.notes, cfg.vol);
    lastChirpAt = Date.now();
  };
  setTimeout(fire, 400);
  chirpTimer = setInterval(fire, cfg.interval);
}

function startSeeking() {
  show('seek');
  seekStartTime = Date.now();
  currentPhase = 0;
  resumeIfSuspended();
  setPhase(0);

  const phaseLength = PHASE_DURATION[STATE.difficulty] * 1000;
  const totalDuration = phaseLength * NUM_PHASES;
  const fill = document.getElementById('intensityFill');
  fill.style.transition = `width ${totalDuration}ms linear`;
  requestAnimationFrame(() => {
    fill.style.width = '100%';
  });

  for (let p = 1; p < NUM_PHASES; p++) {
    const t = setTimeout(() => {
      if (isActiveScreen('seek')) setPhase(p);
    }, phaseLength * p);
    phaseTimers.push(t);
  }
}

function startHideCountdown() {
  show('hide');
  let remaining = STATE.hideTime;
  const el = document.getElementById('countdown');
  el.textContent = remaining;
  countdownTimer = setInterval(() => {
    remaining--;
    el.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      startSeeking();
    }
  }, 1000);
}

// ---------- Watchdog ----------
// If a timer was throttled (iOS audio context briefly suspended, OS
// background-throttle), fire a manual fallback after a generous gap.

function startWatchdog() {
  stopWatchdog();
  watchdog = setInterval(() => {
    if (!isActiveScreen('seek')) return;
    const cfg = PHASES[currentPhase];
    if (Date.now() - lastChirpAt > cfg.interval + 5000) {
      resumeIfSuspended();
      visualChirp();
      playChirpSound(STATE.sound, cfg.baseFreq, cfg.notes, cfg.vol);
      lastChirpAt = Date.now();
    }
  }, 3000);
}

function stopWatchdog() {
  if (watchdog) {
    clearInterval(watchdog);
    watchdog = null;
  }
}

// ---------- Setup-screen wiring ----------

function updateDifficultyDisplay() {
  const el = document.getElementById('findMeDifficultyDisplay');
  if (el) el.textContent = DIFFICULTY_LABELS[STATE.difficulty] || '';
}

function syncOpts() {
  document.querySelectorAll('#soundOpts .opt').forEach((b) => {
    b.classList.toggle('selected', b.dataset.val === STATE.sound);
  });
  document.querySelectorAll('#difficultyOpts .opt').forEach((b) => {
    b.classList.toggle('selected', b.dataset.val === STATE.difficulty);
  });
  document.querySelectorAll('#hideOpts .opt').forEach((b) => {
    b.classList.toggle('selected', b.dataset.val === String(STATE.hideTime));
  });
}

async function loadSettings() {
  const saved = await load(KEY, null);
  if (saved) {
    // Accept any historical shape that mentions a sound.
    let candidate = null;
    if (typeof saved.sound === 'string') candidate = saved.sound;
    else if (Array.isArray(saved.sounds) && saved.sounds.length) candidate = saved.sounds[0];
    else if (Array.isArray(saved.chirpSounds) && saved.chirpSounds.length) candidate = saved.chirpSounds[0];
    else if (typeof saved.chirpSound === 'string') candidate = saved.chirpSound;
    if (candidate && TIMBRES.includes(candidate)) STATE.sound = candidate;

    if (typeof saved.difficulty === 'string') STATE.difficulty = saved.difficulty;
    if (typeof saved.hideTime === 'number') STATE.hideTime = saved.hideTime;
  }
  syncOpts();
  updateDifficultyDisplay();
}

const persist = () => save(KEY, STATE);

export function init() {
  // Sound: exclusive single-select.
  document.querySelectorAll('#soundOpts .opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      STATE.sound = btn.dataset.val;
      syncOpts();
      persist();
    });
  });

  // Difficulty + Hide Time: exclusive single-select.
  document.querySelectorAll('#difficultyOpts .opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      STATE.difficulty = btn.dataset.val;
      syncOpts();
      updateDifficultyDisplay();
      persist();
    });
  });
  document.querySelectorAll('#hideOpts .opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      STATE.hideTime = parseInt(btn.dataset.val, 10);
      syncOpts();
      persist();
    });
  });

  document.getElementById('testBtn').addEventListener('click', () => {
    ensureAudio();
    playChirpSound(STATE.sound, 659, 3, 0.7);
  });

  document.getElementById('startBtn').addEventListener('click', () => {
    ensureAudio();
    requestWakeLock();
    startWatchdog();
    startHideCountdown();
  });

  document.getElementById('foundBtn').addEventListener('click', () => {
    clearAllPhaseTimers();
    stopWatchdog();
    releaseWakeLock();
    successHaptic();
    const elapsed = Math.round((Date.now() - seekStartTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    document.getElementById('timeStat').textContent = `Took ${mins}:${secs
      .toString()
      .padStart(2, '0')}`;
    playSuccessJingle();
    show('found');
  });

  document.getElementById('againBtn').addEventListener('click', () => {
    clearAllPhaseTimers();
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    const fill = document.getElementById('intensityFill');
    fill.style.transition = 'none';
    fill.style.width = '0%';
    show('setup');
  });

  loadSettings();
}
