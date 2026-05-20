/* Mission Control — phone is mission control walking the kid through a
 * coherent flight, NOT random commands.
 *
 * Every mission follows this phase machine:
 *
 *   1. Pre-flight   (1–2 commands, random pool)
 *   2. Countdown    (forced sequence: 10 → 9 → ... → 1 → BLAST OFF, fast tempo)
 *   3. Liftoff      (1–2 commands)
 *   4. Atmosphere   (2–4 commands — banking, weaving, weather)
 *   5. Space        (3–5 commands — orbit, warp, asteroids, aliens)
 *   6. Mission      (2–4 commands — dock, repair, collect, plant flag)
 *   7. Re-entry     (1–2 commands)
 *   8. Landing      (1–2 commands)
 *   ← loop back to phase 1 for the next mission until game time runs out.
 *
 * Between phases (after liftoff, before landing) there's a small chance of
 * an emergency that interrupts the mission with a forced sequence: low fuel,
 * meteor strike, engine glitch. Each emergency has its own resolution then
 * play returns to the regular phase progression.
 *
 * STATE.pace controls the time between non-sequenced commands. The countdown
 * and emergency sequences run on their own faster cadence so they feel tight.
 */

import {
  ensureAudio,
  playChime,
  playTickSound,
  playSiren,
  playSuccessJingle,
} from '../audio.js';
import {
  speak,
  unlockSpeech,
  startSpeechKeepalive,
  stopSpeechKeepalive,
  speechDurationMs,
  cancelSpeech,
  speakClose,
  MISSION_VICTORY_INTROS,
  MISSION_PRAISE,
} from '../speech.js';
import { requestWakeLock, releaseWakeLock } from '../wakeLock.js';
import {
  show,
  setupOpts,
  isActiveScreen,
  retriggerAnim,
} from '../ui.js';
import { load, save } from '../storage.js';
import { isLocked, attemptPurchase } from '../featureFlags.js';
import { successHaptic, heavyHaptic } from '../native.js';

const KEY = 'missionControl';

const STATE = {
  pace: 'normal',
  length: 120,
};

const PACE = {
  slow: [8, 15],
  normal: [3, 5],
  fast: [1.5, 3],
  chaos: [0.8, 1.5],
};

function normalizePaceKey(k) {
  if (k === 'quick') return 'fast';
  if (k === 'chill') return 'slow';
  if (k === 'long') return 'slow';
  return k;
}

// Minimum gap between commands in a sequence phase (the 10-9-8-...-BLAST OFF
// countdown). The actual tick uses Math.max(this, speechMs + 300) so longer
// words ("BLAST OFF!") don't get stepped on. 1100ms gives roughly 400-500ms
// of silence between recorded "Ten" / "Nine" clips — feels like a real
// countdown rather than a tight stream.
const COUNTDOWN_TICK_MS = 1100;
const EMERGENCY_TICK_MS = 1200;
const EMERGENCY_PROBABILITY = 0.18; // ~1 in 5 missions has an emergency

const PHASES = [
  {
    id: 'preflight',
    minCommands: 1,
    maxCommands: 2,
    commands: [
      { text: 'Run the pre-flight check!', emoji: '✅' },
      { text: 'Strap into your seat!', emoji: '🪑' },
      { text: 'Helmet on!', emoji: '👨‍🚀' },
      { text: 'Power up the engines!', emoji: '🔋' },
      { text: 'Mission Control: all systems go!', emoji: '📡' },
      { text: 'Final checks complete!', emoji: '📋' },
      { text: 'Crew, sound off!', emoji: '🫡' },
    ],
  },
  {
    id: 'countdown',
    type: 'sequence',
    commands: [
      { text: 'Ten!', emoji: '🔟' },
      { text: 'Nine!', emoji: '9️⃣' },
      { text: 'Eight!', emoji: '8️⃣' },
      { text: 'Seven!', emoji: '7️⃣' },
      { text: 'Six!', emoji: '6️⃣' },
      { text: 'Five!', emoji: '5️⃣' },
      { text: 'Four!', emoji: '4️⃣' },
      { text: 'Three!', emoji: '3️⃣' },
      { text: 'Two!', emoji: '2️⃣' },
      { text: 'One!', emoji: '1️⃣' },
      { text: 'BLAST OFF!', emoji: '🚀' },
    ],
  },
  {
    id: 'liftoff',
    minCommands: 1,
    maxCommands: 2,
    commands: [
      { text: 'Liftoff! Reach for the stars!', emoji: '⭐' },
      { text: 'Engines on full!', emoji: '🔥' },
      { text: 'Throttle up!', emoji: '🛫' },
      { text: 'Climb steep — through the clouds!', emoji: '☁️' },
      { text: 'Punching through the atmosphere!', emoji: '🌤️' },
    ],
  },
  {
    id: 'atmosphere',
    minCommands: 2,
    maxCommands: 4,
    commands: [
      { text: 'Bank left, hard!', emoji: '⬅️' },
      { text: 'Bank right, hard!', emoji: '➡️' },
      { text: 'Punch through the clouds!', emoji: '☁️' },
      { text: 'Avoid the lightning storm!', emoji: '⚡' },
      { text: 'Fly over the mountains!', emoji: '🏔️' },
      { text: 'Skim across the ocean!', emoji: '🌊' },
      { text: 'Race an eagle!', emoji: '🦅' },
      { text: 'Fly through a rainbow!', emoji: '🌈' },
      { text: 'Eye of the tornado!', emoji: '🌪️' },
      { text: 'Climb the asteroid wall!', emoji: '⬆️' },
      { text: 'Pull up! Pull up!', emoji: '⤴️' },
      { text: 'Asteroid dead ahead — swerve!', emoji: '☄️' },
      { text: 'Space debris incoming — duck!', emoji: '💥' },
      { text: 'Fire the thrusters!', emoji: '🔥' },
      { text: 'Soar like an eagle!', emoji: '🌤️' },
      { text: 'Engage afterburner!', emoji: '⚡' },
      { text: 'Sonic boom!', emoji: '💥' },
      { text: 'Barrel roll!', emoji: '🌀' },
      { text: 'Loop-de-loop!', emoji: '🔄' },
    ],
  },
  {
    id: 'space',
    minCommands: 3,
    maxCommands: 5,
    commands: [
      { text: 'Entering orbit!', emoji: '🌍' },
      { text: 'Engage warp drive!', emoji: '✨' },
      { text: 'Hyperdrive!', emoji: '🌟' },
      { text: 'Asteroid field — weave!', emoji: '🌠' },
      { text: 'Aliens spotted — wave hello!', emoji: '👽' },
      { text: 'UFO at twelve oclock!', emoji: '🛸' },
      { text: 'Float in zero gravity!', emoji: '🪐' },
      { text: "Gravity's gone — float!", emoji: '🌌' },
      { text: 'Travel to another galaxy!', emoji: '🌌' },
      { text: 'Hull breach — seal it now!', emoji: '🛡️' },
      { text: 'Oxygen low — breathe slow!', emoji: '😮‍💨' },
      { text: 'Slingshot around the planet!', emoji: '🪐' },
      { text: 'Orbit the Earth!', emoji: '🌍' },
      { text: 'Make a wish on a shooting star!', emoji: '⭐' },
      { text: 'Open the cargo bay!', emoji: '🛸' },
      { text: 'Inverted flight — upside down!', emoji: '🪂' },
      { text: 'Corkscrew through the stars!', emoji: '🌪️' },
    ],
  },
  {
    id: 'mission',
    minCommands: 2,
    maxCommands: 4,
    commands: [
      { text: 'Dock with the space station!', emoji: '🛰️' },
      { text: 'Repair the satellite!', emoji: '🔧' },
      { text: 'Spacewalk!', emoji: '👨‍🚀' },
      { text: 'Land on the moon!', emoji: '🌕' },
      { text: 'Plant the flag!', emoji: '🚩' },
      { text: 'Collect moon rocks!', emoji: '🪨' },
      { text: 'Adjust the antenna!', emoji: '📡' },
      { text: 'Bounce on the moon!', emoji: '🌙' },
      { text: 'Wave at Earth!', emoji: '🌍' },
      { text: 'Squeeze space food into your mouth!', emoji: '🍱' },
      { text: 'Take a selfie with the stars!', emoji: '📸' },
      { text: 'Photograph a new planet!', emoji: '🪐' },
      { text: 'Plant a seed in moon soil!', emoji: '🌱' },
      { text: 'Send a message back to Earth!', emoji: '📨' },
    ],
  },
  {
    id: 'reentry',
    minCommands: 1,
    maxCommands: 2,
    commands: [
      { text: 'Begin re-entry sequence!', emoji: '🌍' },
      { text: 'Heat shield engaged!', emoji: '🔥' },
      { text: 'Brace for impact!', emoji: '🛡️' },
      { text: 'Approach the landing zone!', emoji: '🎯' },
      { text: 'Slow your descent!', emoji: '⬇️' },
      { text: 'Deploy parachutes!', emoji: '🪂' },
    ],
  },
  {
    id: 'landing',
    minCommands: 1,
    maxCommands: 2,
    commands: [
      { text: 'Landing gear out!', emoji: '🛬' },
      { text: 'Touch down — smooth landing!', emoji: '✅' },
      { text: 'Power down the engines!', emoji: '🔌' },
      { text: 'Mission accomplished!', emoji: '🎉' },
      { text: 'Take a victory lap, pilot!', emoji: '🦸' },
      { text: 'Take a bow for Mission Control!', emoji: '🙇' },
    ],
  },
];

const EMERGENCIES = [
  {
    id: 'fuel',
    sequence: [
      { text: 'FUEL CRITICAL!', emoji: '⛽' },
      { text: 'Shake the ship — engine failure!', emoji: '😱' },
      { text: 'EJECT! EJECT!', emoji: '🧨' },
      { text: 'Pull the parachute!', emoji: '🪂' },
    ],
  },
  {
    id: 'meteor',
    sequence: [
      { text: 'METEOR INCOMING!', emoji: '☄️' },
      { text: 'DODGE LEFT!', emoji: '⬅️' },
      { text: 'DODGE RIGHT!', emoji: '➡️' },
      { text: 'Brace for impact!', emoji: '🛡️' },
      { text: 'Patch the hull — quick!', emoji: '🛠️' },
    ],
  },
  {
    id: 'glitch',
    sequence: [
      { text: 'Engine glitch! Wiggle the ship!', emoji: '😱' },
      { text: 'Mash buttons — emergency diagnostic!', emoji: '🔧' },
      { text: 'Tap the dashboard hard!', emoji: '👊' },
      { text: 'Engines back online!', emoji: '✅' },
    ],
  },
  {
    id: 'alien',
    sequence: [
      { text: 'UFO on the radar!', emoji: '🛸' },
      { text: 'Hail them — wave hello!', emoji: '👋' },
      { text: 'Friendly aliens — share a snack!', emoji: '🍪' },
      { text: 'Salute the aliens goodbye!', emoji: '👽' },
    ],
  },
];

// Phases where an emergency is allowed to fire (between liftoff and landing
// — never during pre-flight, countdown, re-entry or landing itself).
const EMERGENCY_OK_PHASES = new Set(['atmosphere', 'space', 'mission']);

// =============================================================
// Runtime state
// =============================================================

let actionTimer = null;
let endTimeout = null;
let endTime = 0;
let timerInterval = null;
let countdownTimer = null;
let _ended = false;
let _starting = false;

let phaseIndex = 0;
let phaseCommandsFired = 0;
let phaseTarget = 0; // for non-sequence phases, how many commands this run
let phaseQueue = []; // shuffle queue per non-sequence phase
let emergencyTriggeredThisMission = false;

// For emergency injection: when truthy, fire that sequence in order before
// returning to the normal phase progression.
let activeEmergency = null;
let emergencyIndex = 0;

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function paceMs() {
  const [min, max] = PACE[STATE.pace] || PACE.normal;
  return (min + Math.random() * (max - min)) * 1000;
}

function announce(cmd, opts = {}) {
  const emojiEl = document.getElementById('missionEmoji');
  const textEl = document.getElementById('missionText');
  emojiEl.textContent = cmd.emoji;
  textEl.textContent = cmd.text;
  retriggerAnim(emojiEl, textEl);
  if (opts.urgent) {
    heavyHaptic();
    playSiren(659, 2, 0.8);
  } else {
    playChime(784, 1, 0.55);
  }
  setTimeout(() => speak(cmd.text, { rate: opts.urgent ? 1.1 : 1.05, pitch: 1.0 }), 100);
}

function startNewMission() {
  phaseIndex = 0;
  phaseCommandsFired = 0;
  phaseQueue = [];
  emergencyTriggeredThisMission = false;
  setupCurrentPhase();
}

function setupCurrentPhase() {
  const phase = PHASES[phaseIndex];
  phaseCommandsFired = 0;
  if (phase.type === 'sequence') {
    phaseTarget = phase.commands.length;
    phaseQueue = phase.commands.slice(); // sequenced, in order
  } else {
    phaseTarget = randInt(phase.minCommands, phase.maxCommands);
    phaseQueue = shuffleArray(phase.commands);
  }
}

function maybeTriggerEmergency() {
  if (emergencyTriggeredThisMission) return false;
  const phase = PHASES[phaseIndex];
  if (!EMERGENCY_OK_PHASES.has(phase.id)) return false;
  if (Math.random() >= EMERGENCY_PROBABILITY) return false;
  // Pick + arm an emergency.
  activeEmergency = pickRandom(EMERGENCIES);
  emergencyIndex = 0;
  emergencyTriggeredThisMission = true;
  return true;
}

function fire() {
  if (!isActiveScreen('missionGame')) return;

  // 1. If an emergency is active, walk through it first.
  if (activeEmergency) {
    const cmd = activeEmergency.sequence[emergencyIndex];
    announce(cmd, { urgent: true });
    emergencyIndex++;
    const done = emergencyIndex >= activeEmergency.sequence.length;
    if (done) {
      activeEmergency = null;
      emergencyIndex = 0;
    }
    // Tight emergency tempo, but never let the next utterance start before
    // the current one has finished speaking.
    const dur = Math.max(
      EMERGENCY_TICK_MS,
      speechDurationMs(cmd.text, { rate: 1.1 }) + 200
    );
    actionTimer = setTimeout(fire, dur);
    return;
  }

  // 2. Maybe arm an emergency before this command (only at "ok" phases).
  if (maybeTriggerEmergency()) {
    fire(); // re-enter, this time the emergency branch fires.
    return;
  }

  // 3. Normal phase command.
  const phase = PHASES[phaseIndex];
  const cmd = phaseQueue[phaseCommandsFired] || phaseQueue[0];
  announce(cmd);
  phaseCommandsFired++;

  const phaseDone = phaseCommandsFired >= phaseTarget;
  if (phaseDone) {
    phaseIndex++;
    if (phaseIndex >= PHASES.length) {
      // Mission complete — start a new one.
      startNewMission();
    } else {
      setupCurrentPhase();
    }
  }

  // 4. Schedule next. For non-sequenced phases, wait for the voice to finish
  //    before adding the user's chosen gap. The countdown phase has its own
  //    fixed tick so 10-9-8 stays tight.
  let dur;
  if (phase.type === 'sequence') {
    // Speech-aware floor: if the spoken line is longer than our tick
    // (e.g. "BLAST OFF!" is wordier than "Ten!"), wait for the voice
    // to finish before scheduling the next tick.
    dur = Math.max(
      COUNTDOWN_TICK_MS,
      speechDurationMs(cmd.text, { rate: 1.05 }) + 300
    );
  } else {
    dur = speechDurationMs(cmd.text, { rate: 1.05 }) + paceMs();
  }
  actionTimer = setTimeout(fire, dur);
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
  startNewMission();
  fire(); // see floorLava.js for the rationale

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
  if (_ended) return;
  _ended = true;
  clearAll();
  releaseWakeLock();
  stopSpeechKeepalive();
  cancelSpeech();
  document.body.classList.remove('mission-bg');
  speakClose(MISSION_VICTORY_INTROS, MISSION_PRAISE, { rate: 1.0 });
  successHaptic();
  playSuccessJingle();
  show('missionEnd');
  _starting = false;
}

function clearAll() {
  if (actionTimer) clearTimeout(actionTimer);
  if (endTimeout) clearTimeout(endTimeout);
  if (timerInterval) clearInterval(timerInterval);
  if (countdownTimer) clearInterval(countdownTimer);
  actionTimer = endTimeout = timerInterval = countdownTimer = null;
  activeEmergency = null;
  emergencyIndex = 0;
}

function updatePaceDisplay() {
  const el = document.getElementById('missionPaceDisplay');
  if (!el) return;
  const [min, max] = PACE[STATE.pace] || PACE.normal;
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
    playChime(784, 1, 0.55);
    setTimeout(() => speak('Mission Control: all systems go!', { rate: 1.05, pitch: 1.0 }), 150);
  });

  document.getElementById('missionStartBtn').addEventListener('click', async () => {
    if (_starting) return;
    _starting = true;
    if (await isLocked('mission')) {
      await attemptPurchase();
      _starting = false;
      return;
    }
    _ended = false;
    ensureAudio();
    unlockSpeech();
    startSpeechKeepalive();
    requestWakeLock();
    startCountdown();
  });

  document.getElementById('missionStopBtn').addEventListener('click', endGame);

  document.getElementById('missionCancelBtn').addEventListener('click', () => {
    clearAll();
    releaseWakeLock();
    stopSpeechKeepalive();
    document.body.classList.remove('mission-bg');
    _starting = false;
    _ended = false;
    show('setup');
  });

  document.getElementById('missionAgainBtn').addEventListener('click', () => {
    cancelSpeech();
    clearAll();
    document.body.classList.remove('mission-bg');
    _ended = false;
    _starting = false;
    show('setup');
  });

  loadSettings();
}
