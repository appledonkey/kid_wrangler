/* Mission Control — phone is mission control giving pilot / fighter / astronaut
 * commands. Kids act them out: barrel rolls, takeoffs, dock with the space
 * station, eye of the tornado, etc.
 *
 * Same timer-based action-prompt rhythm as Floor Lava, no lava events.
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

const KEY = 'missionControl';

const STATE = {
  pace: 'normal',
  length: 120,
};

const COMMANDS = [
  // Takeoff & landing (10)
  { text: 'Blast off! Rocket up!', emoji: '🚀' },
  { text: 'Engines on! Takeoff!', emoji: '✈️' },
  { text: 'Pull back on the stick! Climb!', emoji: '🛩️' },
  { text: 'Initiate landing approach!', emoji: '🪂' },
  { text: 'Touch down — gear out!', emoji: '🛬' },
  { text: 'Three, two, one... ignition!', emoji: '🚀' },
  { text: 'Throttle up! Full power!', emoji: '🛫' },
  { text: 'Smooth landing — flaps down!', emoji: '⬇️' },
  { text: 'Liftoff! Reach for the stars!', emoji: '⭐' },
  { text: 'Wheels up! We are flying!', emoji: '✈️' },

  // Maneuvers (15)
  { text: 'Barrel roll!', emoji: '🌀' },
  { text: 'Bank left, hard!', emoji: '⬅️' },
  { text: 'Bank right, hard!', emoji: '➡️' },
  { text: 'Full loop-de-loop!', emoji: '🔄' },
  { text: 'Nosedive! Pull up at the last second!', emoji: '🔻' },
  { text: 'Climb steep!', emoji: '⬆️' },
  { text: 'Spiral up!', emoji: '🔁' },
  { text: 'Somersault through the air!', emoji: '🤸' },
  { text: 'Corkscrew!', emoji: '🌪️' },
  { text: 'Power dive!', emoji: '⤵️' },
  { text: 'Wing wave — tilt side to side!', emoji: '🦋' },
  { text: 'Inverted flight — upside down!', emoji: '🪂' },
  { text: 'Sharp U-turn!', emoji: '↩️' },
  { text: 'Pull up! Pull up!', emoji: '⤴️' },
  { text: 'Weave through the canyon!', emoji: '〰️' },

  // Boost & speed (8)
  { text: 'Engage afterburner!', emoji: '⚡' },
  { text: 'Boost forward!', emoji: '🚀' },
  { text: 'Punch it! Full speed!', emoji: '💨' },
  { text: 'Hyperdrive!', emoji: '🌟' },
  { text: 'Throttle to max!', emoji: '⏩' },
  { text: 'Sonic boom!', emoji: '💥' },
  { text: 'Engage warp drive!', emoji: '✨' },
  { text: 'Speed burst!', emoji: '🚦' },

  // Combat / evasion (10)
  { text: 'Target locked!', emoji: '🎯' },
  { text: 'Raise shields!', emoji: '🛡️' },
  { text: 'Fire torpedoes!', emoji: '💥' },
  { text: 'Incoming! Dodge!', emoji: '🚨' },
  { text: 'Lasers ready!', emoji: '🔫' },
  { text: 'Eyes on the bandit!', emoji: '👀' },
  { text: 'Evasive maneuvers!', emoji: '✋' },
  { text: 'Drop chaff!', emoji: '🌠' },
  { text: 'Aim for the target!', emoji: '🎯' },
  { text: 'Brace for impact!', emoji: '🛡️' },

  // Mission communication (8)
  { text: 'Copy that, Mission Control!', emoji: '📡' },
  { text: 'Mayday! Mayday!', emoji: '🆘' },
  { text: 'Calling base!', emoji: '📞' },
  { text: 'Mission accomplished!', emoji: '✅' },
  { text: 'Abort! Abort!', emoji: '🛟' },
  { text: 'Roger that!', emoji: '📡' },
  { text: 'Red alert!', emoji: '🚨' },
  { text: 'All systems go!', emoji: '📢' },

  // Space scenarios (10)
  { text: 'Dock with the space station!', emoji: '🛰️' },
  { text: 'Asteroid field — weave!', emoji: '🌠' },
  { text: 'Aliens spotted — wave hello!', emoji: '👽' },
  { text: 'Orbit the Earth!', emoji: '🌍' },
  { text: 'Land on the moon!', emoji: '🌕' },
  { text: 'Plant the flag!', emoji: '🚩' },
  { text: 'UFO at twelve o\'clock!', emoji: '🛸' },
  { text: 'Make a wish on a shooting star!', emoji: '⭐' },
  { text: 'Travel to another galaxy!', emoji: '🌌' },
  { text: 'Slingshot around the planet!', emoji: '🪐' },

  // Pilot / jet scenarios (10)
  { text: 'Punch through the clouds!', emoji: '☁️' },
  { text: 'Fly over the mountains!', emoji: '🏔️' },
  { text: 'Skim across the ocean!', emoji: '🌊' },
  { text: 'Race an eagle!', emoji: '🦅' },
  { text: 'Fly through a rainbow!', emoji: '🌈' },
  { text: 'Avoid the lightning storm!', emoji: '⚡' },
  { text: 'Eye of the tornado!', emoji: '🌪️' },
  { text: 'Dogfight!', emoji: '🛩️' },
  { text: 'Glide silently!', emoji: '🪶' },
  { text: 'Hover over the target!', emoji: '🚁' },

  // Astronaut tasks (8)
  { text: 'Spacewalk!', emoji: '👨‍🚀' },
  { text: 'Float in zero gravity!', emoji: '🪐' },
  { text: 'Repair the satellite!', emoji: '🔧' },
  { text: 'Wave at Earth!', emoji: '🌍' },
  { text: 'Bounce on the moon!', emoji: '🌙' },
  { text: 'Collect moon rocks!', emoji: '🪨' },
  { text: 'Adjust the antenna!', emoji: '📡' },
  { text: 'Eat space food!', emoji: '🍱' },

  // Funny / glitches (6)
  { text: 'Engine glitch! Wiggle the whole ship!', emoji: '😱' },
  { text: 'Butterfly in the cockpit — swat it!', emoji: '🦋' },
  { text: 'Co-pilot is sleeping — shake them!', emoji: '💤' },
  { text: 'Lunch break — chomp space pizza!', emoji: '🍕' },
  { text: 'Sing the mission anthem!', emoji: '🎵' },
  { text: 'Air-guitar solo at Mach 2!', emoji: '🎸' },
];

const PACE = {
  slow: [8, 15],
  normal: [3, 5],
  fast: [1.5, 3],
  chaos: [0.8, 1.5],
};

/** Old shape used quick/chill/long. Map to the new tier set. */
function normalizePaceKey(k) {
  if (k === 'quick') return 'fast';
  if (k === 'chill') return 'slow';
  if (k === 'long') return 'slow';
  return k;
}

const queue = makeQueue(() => COMMANDS);

let actionTimer = null;
let endTimeout = null;
let endTime = 0;
let timerInterval = null;
let countdownTimer = null;

function announce(cmd) {
  const emojiEl = document.getElementById('missionEmoji');
  const textEl = document.getElementById('missionText');
  emojiEl.textContent = cmd.emoji;
  textEl.textContent = cmd.text;
  retriggerAnim(emojiEl, textEl);
  playChime(659, 1, 0.55);
  setTimeout(() => speak(cmd.text, { rate: 1.05, pitch: 1.0 }), 100);
}

function updateTimer() {
  if (STATE.length <= 0) return;
  const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  document.getElementById('missionTimer').textContent = `${m}:${s
    .toString()
    .padStart(2, '0')} left`;
}

function startGame() {
  show('missionGame');
  document.body.classList.add('mission-bg');
  queue.reset();

  const fire = () => {
    if (!isActiveScreen('missionGame')) return;
    announce(queue.next());
    const [min, max] = PACE[STATE.pace];
    const dur = (min + Math.random() * (max - min)) * 1000;
    actionTimer = setTimeout(fire, dur);
  };
  setTimeout(fire, 500);

  if (STATE.length > 0) {
    endTime = Date.now() + STATE.length * 1000;
    updateTimer();
    timerInterval = setInterval(updateTimer, 250);
    endTimeout = setTimeout(endGame, STATE.length * 1000);
  } else {
    document.getElementById('missionTimer').textContent = 'Endless mode';
  }
}

function startCountdown() {
  show('missionCountdown');
  let remaining = 3;
  const el = document.getElementById('missionCountdown');
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
  if (actionTimer) clearTimeout(actionTimer);
  if (endTimeout) clearTimeout(endTimeout);
  if (timerInterval) clearInterval(timerInterval);
  actionTimer = endTimeout = timerInterval = null;
  releaseWakeLock();
  stopSpeechKeepalive();
  document.body.classList.remove('mission-bg');
  speak('Mission accomplished! Great flying!', { rate: 1.0 });
  successHaptic();
  playSuccessJingle();
  show('missionEnd');
}

function clearAll() {
  if (actionTimer) clearTimeout(actionTimer);
  if (endTimeout) clearTimeout(endTimeout);
  if (timerInterval) clearInterval(timerInterval);
  if (countdownTimer) clearInterval(countdownTimer);
  actionTimer = endTimeout = timerInterval = countdownTimer = null;
}

function updatePaceDisplay() {
  const el = document.getElementById('missionPaceDisplay');
  if (!el) return;
  const [min, max] = PACE[STATE.pace];
  el.textContent = `${min}–${max} seconds per command`;
}

async function loadSettings() {
  const saved = await load(KEY, null);
  if (saved) {
    if (typeof saved.pace === 'string') STATE.pace = normalizePaceKey(saved.pace);
    if (typeof saved.length === 'number') STATE.length = saved.length;
  }
  syncOpt('missionPaceOpts', STATE.pace);
  syncOpt('missionLengthOpts', String(STATE.length));
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
  setupOpts('missionPaceOpts', (v) => {
    STATE.pace = v;
    updatePaceDisplay();
    persist();
  });
  setupOpts('missionLengthOpts', (v) => {
    STATE.length = parseInt(v, 10);
    persist();
  });

  document.getElementById('missionTestBtn').addEventListener('click', () => {
    ensureAudio();
    unlockSpeech();
    playChime(659, 1, 0.55);
    setTimeout(() => speak('Liftoff in three, two, one!', { rate: 1.05, pitch: 1.0 }), 150);
  });

  document.getElementById('missionStartBtn').addEventListener('click', async () => {
    if (await isLocked('mission')) {
      attemptPurchase();
      return;
    }
    ensureAudio();
    unlockSpeech();
    startSpeechKeepalive();
    requestWakeLock();
    startCountdown();
  });

  document.getElementById('missionStopBtn').addEventListener('click', endGame);

  document.getElementById('missionAgainBtn').addEventListener('click', () => {
    clearAll();
    document.body.classList.remove('mission-bg');
    show('setup');
  });

  loadSettings();
}
