/* Floor Lava — random crazy actions, with surprise lava events.
 *
 * Two layers:
 *   1. A shuffled queue over the chosen action pool (Easy / Mixed / Wild).
 *   2. A separate lava-event roll on each tick, gated by both probability
 *      AND a minimum gap since the last lava (so users don't get four
 *      lavas in a row when they pick MAYHEM).
 */

import {
  ensureAudio,
  playChime,
  playSiren,
  playTickSound,
  playSuccessJingle,
  silenceAll,
} from '../audio.js';
import {
  speak,
  unlockSpeech,
  startSpeechKeepalive,
  stopSpeechKeepalive,
  speechDurationMs,
  cancelSpeech,
  speakClose,
  TIME_UP_PHRASES,
  PRAISE_GENERIC,
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
import { heavyHaptic, successHaptic } from '../native.js';

const KEY = 'floorLava';

const STATE = {
  pace: 'normal',
  difficulty: 'mixed',
  lavaFreq: 'sometimes',
  length: 120,
};

// Each entry can carry an optional `holdMs` — the minimum time the prompt
// stays on screen before the next one fires, regardless of the user's
// chosen Speed setting. Use it for prompts where the kid needs time to
// actually perform the move:
//   - "five seconds" durations → holdMs ≈ 5500
//   - count-based actions → holdMs ≈ count × per-rep time + ~500ms buffer
//     (clap ~280ms each · hop ~600ms · jumping jack ~800ms · squat / lunge /
//     push-up ~1400ms · spin ~1500ms · step ~700ms)
//
// fire() floors the per-tick duration at holdMs, so even on CHAOS pace
// a "Hold a plank for five seconds!" still gets ~5.5 seconds.
const ACTIONS = {
  // Easy moves (~20) — body-part overlaps with Simon Says intentionally dropped
  easy: [
    { text: 'Hop on one foot!', emoji: '🦶' },
    { text: 'Spin in a circle!', emoji: '🌀', holdMs: 2000 },
    { text: 'Jump up and down!', emoji: '⬆️' },
    { text: 'Clap three times!', emoji: '👏', holdMs: 1300 },
    { text: 'Clap five times!', emoji: '👏', holdMs: 1900 },
    { text: 'Clap eight times!', emoji: '👏', holdMs: 2750 },
    { text: 'Stand on tiptoes!', emoji: '🩰', holdMs: 2000 },
    { text: 'Skip in place!', emoji: '🦘' },
    { text: 'Run in place!', emoji: '🏃' },
    { text: 'Hop forward three times!', emoji: '➡️', holdMs: 2300 },
    { text: 'Hop forward five times!', emoji: '➡️', holdMs: 3500 },
    { text: 'Hop backward three times!', emoji: '⬅️', holdMs: 2300 },
    { text: 'Hop backward five times!', emoji: '⬅️', holdMs: 3500 },
    { text: 'Bounce on your toes!', emoji: '🪀' },
    { text: 'Wiggle your whole body!', emoji: '🌪️' },
    { text: 'Spin like a top!', emoji: '🌀', holdMs: 2500 },
    { text: 'March around the room!', emoji: '🪖' },
    { text: 'Walk backwards!', emoji: '🔄' },
    { text: 'Tiptoe slowly!', emoji: '🤫', holdMs: 2500 },
    { text: 'Crawl on hands and knees!', emoji: '👶', holdMs: 2500 },
  ],

  // Animal moves (16) — acting out animals, kept here (Simon doesn't have these now)
  animals: [
    { text: 'Bark like a dog!', emoji: '🐶' },
    { text: 'Roar like a lion!', emoji: '🦁' },
    { text: 'Hop like a bunny!', emoji: '🐰' },
    { text: 'Flap like a bird!', emoji: '🐦' },
    { text: 'Slither like a snake!', emoji: '🐍' },
    { text: 'Stomp like an elephant!', emoji: '🐘' },
    { text: 'Crawl like a crab!', emoji: '🦀' },
    { text: 'Jump like a frog!', emoji: '🐸' },
    { text: 'Howl like a wolf!', emoji: '🐺' },
    { text: 'Waddle like a penguin!', emoji: '🐧' },
    { text: 'Buzz like a bee!', emoji: '🐝' },
    { text: 'Gallop like a horse!', emoji: '🐴' },
    { text: 'Roar like a dinosaur!', emoji: '🦖' },
    { text: 'Stretch like a cat!', emoji: '🐱' },
    { text: 'Swing like a monkey!', emoji: '🐒' },
    { text: 'Bounce like a kangaroo!', emoji: '🦘' },
  ],

  // Exercise (~9) — calorie burners that fit lava-game energy
  exercise: [
    { text: 'Do three jumping jacks!', emoji: '🤸', holdMs: 2900 },
    { text: 'Do five jumping jacks!', emoji: '🤸', holdMs: 4500 },
    { text: 'Do three squats!', emoji: '🏋️', holdMs: 4700 },
    { text: 'Do five squats!', emoji: '🏋️', holdMs: 7500 },
    { text: 'Do three lunges!', emoji: '🚶', holdMs: 4700 },
    { text: 'Do five lunges!', emoji: '🚶', holdMs: 7500 },
    { text: 'Do five push-ups!', emoji: '💪', holdMs: 7500 },
    { text: 'High knees for five seconds!', emoji: '🦵', holdMs: 5500 },
    { text: 'Hold a plank for five seconds!', emoji: '🛹', holdMs: 5500 },
  ],

  // Balance & freeze (~11) — yoga / statue holds with explicit dwell time
  balance: [
    { text: 'Balance on one foot!', emoji: '🦩', holdMs: 3000 },
    { text: 'Stand like a flamingo for three seconds!', emoji: '🦩', holdMs: 3500 },
    { text: 'Stand like a flamingo for five seconds!', emoji: '🦩', holdMs: 5500 },
    { text: 'Be a statue for three seconds!', emoji: '🗿', holdMs: 3500 },
    { text: 'Be a statue for five seconds!', emoji: '🗿', holdMs: 5500 },
    { text: 'Hold a tree pose!', emoji: '🌳', holdMs: 3000 },
    { text: 'Balance on tiptoes for five seconds!', emoji: '🩰', holdMs: 5500 },
    { text: 'Freeze like a popsicle!', emoji: '🧊', holdMs: 3000 },
    { text: 'Stand on one leg with eyes closed!', emoji: '🙈', holdMs: 3500 },
    { text: 'Hold a karate pose!', emoji: '🥋', holdMs: 2500 },
    { text: 'Hold a plank for three seconds!', emoji: '🛹', holdMs: 3500 },
  ],

  // Stretches (4) — slimmed to the punchier ones, dropped yoga-class fillers
  stretches: [
    { text: 'Reach for the sky!', emoji: '🙌', holdMs: 1500 },
    { text: 'Touch your toes!', emoji: '🤸', holdMs: 1500 },
    { text: 'Twist side to side!', emoji: '🔁', holdMs: 2500 },
    { text: 'Stretch your arms out wide!', emoji: '🪽', holdMs: 1500 },
  ],

  // Lava escape moves (10) — on-theme physical urgency, mostly quick reacts
  escape: [
    { text: 'Jump to safety!', emoji: '⬆️' },
    { text: 'Hop from rock to rock!', emoji: '🪨', holdMs: 3000 },
    { text: 'Climb the imaginary mountain!', emoji: '🏔️', holdMs: 3000 },
    { text: 'Surf across the lava!', emoji: '🏄', holdMs: 2500 },
    { text: 'Balance on one foot — lava rising!', emoji: '🦩', holdMs: 3000 },
    { text: 'The lava is getting closer!', emoji: '🔥' },
    { text: 'The ground is cracking!', emoji: '🪨' },
    { text: 'Build a bridge with your arms!', emoji: '🌉', holdMs: 2500 },
    { text: 'Pretend you are on a sinking ship!', emoji: '🚢', holdMs: 3000 },
    { text: 'Earthquake — shake the ground!', emoji: '🌍', holdMs: 2500 },
  ],

  // Skill / dexterity (5) — kept the strongest patterns
  skills: [
    { text: 'Clap a fast pattern: clap-clap-pause-clap!', emoji: '👏', holdMs: 2000 },
    { text: 'Pat your head and rub your tummy!', emoji: '🙆', holdMs: 3000 },
    { text: 'Wiggle your fingers like piano keys!', emoji: '🎹', holdMs: 2000 },
    { text: 'Stomp left, right, left, right!', emoji: '👣', holdMs: 2500 },
    { text: 'Hop on one foot, then the other!', emoji: '🦶', holdMs: 2500 },
  ],

  // Silly / pretend (12)
  silly: [
    { text: 'Do a silly dance!', emoji: '💃' },
    { text: 'Sing your name out loud!', emoji: '🎤' },
    { text: 'Talk like a robot!', emoji: '🤖' },
    { text: 'Walk like a zombie!', emoji: '🧟' },
    { text: 'Do a superhero pose!', emoji: '🦸', holdMs: 2000 },
    { text: 'Pretend to be a tree!', emoji: '🌳', holdMs: 2500 },
    { text: 'Pretend to be a snowman!', emoji: '⛄', holdMs: 2500 },
    { text: 'Pretend to brush your teeth!', emoji: '🪥' },
    { text: 'Pretend to be asleep!', emoji: '😴', holdMs: 2000 },
    { text: 'Pretend to be a chef cooking!', emoji: '👨‍🍳' },
    { text: 'Pretend you are underwater!', emoji: '🤿' },
    { text: 'Pretend to ride a horse!', emoji: '🏇' },
  ],

  // Wild / random (~12) — leftover creative
  wild: [
    { text: 'Tiptoe like a ninja!', emoji: '🥷', holdMs: 2500 },
    { text: 'Pretend to swim!', emoji: '🏊' },
    { text: 'Pretend to fly!', emoji: '🪁' },
    { text: 'Spin around two times!', emoji: '🌀', holdMs: 3500 },
    { text: 'Spin around three times!', emoji: '🌀', holdMs: 5000 },
    { text: 'Walk backwards three steps!', emoji: '🔙', holdMs: 2600 },
    { text: 'Walk backwards five steps!', emoji: '🔙', holdMs: 4000 },
    { text: 'Crawl like a baby!', emoji: '👶', holdMs: 2500 },
    { text: 'Wiggle like a worm!', emoji: '🪱' },
    { text: 'Pretend you are stuck in mud!', emoji: '🟫', holdMs: 2500 },
    { text: 'Pretend to be a bouncing ball!', emoji: '🏀' },
    { text: 'Pretend to be popcorn popping!', emoji: '🍿', holdMs: 2500 },
  ],
};

export const LAVA_ACTIONS = [
  { text: 'FLOOR IS LAVA!\nClimb on something!', emoji: '🔥' },
  { text: 'LAVA EVERYWHERE!\nGet off the floor!', emoji: '🌋' },
  { text: 'The ground is melting!\nFind higher ground!', emoji: '🔥' },
  { text: 'LAVA! LAVA! LAVA!\nGet up high NOW!', emoji: '🌋' },
  { text: 'HOT LAVA!\nJump on the couch!', emoji: '🔥' },
  { text: 'THE FLOOR IS BURNING!\nGet up!', emoji: '🔥' },
  { text: 'MOLTEN ROCK EVERYWHERE!\nClimb!', emoji: '🌋' },
  { text: 'LAVA RIVER!\nGet to safety!', emoji: '🌊' },
  { text: 'VOLCANO ERUPTING!\nGet high!', emoji: '🌋' },
  { text: 'SCORCHING GROUND!\nOff the floor!', emoji: '🔥' },
];

const ACTION_PACE = {
  slow: [8, 15],
  normal: [3, 5],
  fast: [1.5, 3],
  chaos: [0.8, 1.5],
};

/** Old shape used quick/chill/long/surprise/custom. Map to the new tier set. */
function normalizePaceKey(k) {
  if (k === 'quick') return 'fast';
  if (k === 'chill') return 'slow';
  if (k === 'long') return 'slow';
  if (k === 'surprise' || k === 'custom') return 'normal';
  return k;
}

const LAVA_FREQ = { never: 0, sometimes: 0.1, often: 0.22, mayhem: 0.45 };
const LAVA_MIN_GAP_MS = { never: 0, sometimes: 25000, often: 15000, mayhem: 7000 };
const LAVA_DURATION = 7000;

function getActionPool() {
  if (STATE.difficulty === 'easy') {
    return [
      ...ACTIONS.easy, ...ACTIONS.animals,
      ...ACTIONS.balance, ...ACTIONS.stretches,
    ];
  }
  if (STATE.difficulty === 'wild') {
    return [
      ...ACTIONS.exercise, ...ACTIONS.silly, ...ACTIONS.skills,
      ...ACTIONS.wild, ...ACTIONS.animals, ...ACTIONS.escape,
    ];
  }
  // mixed = all categories
  return [
    ...ACTIONS.easy, ...ACTIONS.animals, ...ACTIONS.exercise,
    ...ACTIONS.balance, ...ACTIONS.stretches, ...ACTIONS.escape,
    ...ACTIONS.skills, ...ACTIONS.silly, ...ACTIONS.wild,
  ];
}

const actionQueue = makeQueue(() => getActionPool());
const lavaQueue = makeQueue(() => LAVA_ACTIONS);

let actionTimer = null;
let endTimeout = null;
let endTime = 0;
let timerInterval = null;
let countdownTimer = null;
let inLava = false;
let lastLavaTime = 0;
let _ended = false;
let _starting = false;

function pickNextAction() {
  // Lava roll first: probability AND cooldown gate.
  const sinceLava = Date.now() - lastLavaTime;
  const minGap = LAVA_MIN_GAP_MS[STATE.lavaFreq];
  if (
    !inLava &&
    sinceLava >= minGap &&
    Math.random() < LAVA_FREQ[STATE.lavaFreq]
  ) {
    lastLavaTime = Date.now();
    return { ...lavaQueue.next(), isLava: true };
  }
  return { ...actionQueue.next(), isLava: false };
}

function announceAction(action) {
  const emojiEl = document.getElementById('actionEmoji');
  const textEl = document.getElementById('actionText');
  emojiEl.textContent = action.emoji;
  textEl.textContent = action.text;
  retriggerAnim(emojiEl, textEl);

  if (action.isLava) {
    inLava = true;
    document.body.classList.add('lava-bg');
    heavyHaptic();
    playSiren(659, 4, 1.0);
    setTimeout(
      () => speak(action.text.replace(/\n/g, ' '), { rate: 1.15, pitch: 1.0 }),
      120
    );
  } else {
    if (inLava) document.body.classList.remove('lava-bg');
    inLava = false;
    playChime(659, 1, 0.55);
    setTimeout(() => speak(action.text, { rate: 1.05, pitch: 1.05 }), 100);
  }
}

function updateTimer() {
  if (STATE.length <= 0) return;
  const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  document.getElementById('actionTimer').textContent = `${m}:${s
    .toString()
    .padStart(2, '0')} left`;
}

function startGame() {
  show('actionGame');
  inLava = false;
  lastLavaTime = Date.now();
  actionQueue.reset();
  lavaQueue.reset();
  document.body.classList.remove('lava-bg');

  const fire = () => {
    if (!isActiveScreen('actionGame')) return;
    const action = pickNextAction();
    announceAction(action);
    const [min, max] = ACTION_PACE[STATE.pace] || ACTION_PACE.normal;
    // Wait for voice to finish, THEN apply the user's chosen gap. Prevents
    // the next command's chime from cutting off the previous voice.
    const speechMs = speechDurationMs(action.text, { rate: action.isLava ? 1.15 : 1.05 });
    const gapMs = (min + Math.random() * (max - min)) * 1000;
    let duration = action.isLava ? LAVA_DURATION : speechMs + gapMs;
    // Per-prompt minimum hold so "Hold a plank for five seconds!" /
    // "Hop forward five times!" get enough time on screen to actually
    // perform — even on CHAOS pace. holdMs is a floor, not a ceiling.
    if (action.holdMs) duration = Math.max(duration, action.holdMs);
    actionTimer = setTimeout(fire, duration);
  };
  // Fire synchronously — the 3-2-1 countdown was the get-ready beat,
  // so the first prompt should land the moment the game screen swaps in.
  // fire() updates the DOM before the browser paints, so the placeholder
  // never renders and no stale state from a prior session flashes.
  fire();

  if (STATE.length > 0) {
    endTime = Date.now() + STATE.length * 1000;
    updateTimer();
    timerInterval = setInterval(updateTimer, 250);
    endTimeout = setTimeout(endGame, STATE.length * 1000);
  } else {
    document.getElementById('actionTimer').textContent = 'Endless mode';
  }
}

function startCountdown() {
  show('actionCountdown');
  let remaining = 3;
  const el = document.getElementById('actionCountdown');
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
  // If the user tapped Stop during a lava overlay, the siren oscillator
  // would otherwise keep wailing for up to ~1s on the end screen. Silence
  // the master briefly to cut it cleanly; closing speech + jingle play
  // normally after the ~100ms restore.
  silenceAll();
  document.body.classList.remove('lava-bg');
  inLava = false;
  speakClose(TIME_UP_PHRASES, PRAISE_GENERIC, { rate: 1.0 });
  successHaptic();
  playSuccessJingle();
  show('actionEnd');
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
  const el = document.getElementById('paceRangeDisplay');
  if (!el) return;
  const [min, max] = ACTION_PACE[STATE.pace] || ACTION_PACE.normal;
  el.textContent = `${min}–${max} seconds per action`;
}

function updateDifficultyDisplay() {
  const el = document.getElementById('actionDifficultyDisplay');
  if (!el) return;
  const labels = {
    easy: 'Gentle moves — hops, finds, stretches, balance',
    mixed: 'Everything — gentle and wild together',
    wild: 'High energy — exercise, silly, skills',
  };
  el.textContent = labels[STATE.difficulty] || '';
}

function updateLavaDisplay() {
  const el = document.getElementById('lavaRangeDisplay');
  if (!el) return;
  const labels = {
    never: 'No lava events',
    sometimes: '~ every 35–60 seconds',
    often: '~ every 20–30 seconds',
    mayhem: '~ every 8–15 seconds!',
  };
  el.textContent = labels[STATE.lavaFreq] || '';
}

// ---------- Wiring ----------

async function loadSettings() {
  const saved = await load(KEY, null);
  if (!saved) return;
  Object.assign(STATE, saved);
  STATE.pace = normalizePaceKey(STATE.pace);
  syncOpt('actionPaceOpts', STATE.pace);
  syncOpt('actionDifficultyOpts', STATE.difficulty);
  syncOpt('actionLavaOpts', STATE.lavaFreq);
  syncOpt('actionLengthOpts', String(STATE.length));
  updatePaceDisplay();
  updateDifficultyDisplay();
  updateLavaDisplay();
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
  setupOpts('actionPaceOpts', (v) => {
    STATE.pace = v;
    updatePaceDisplay();
    persist();
  });

  setupOpts('actionDifficultyOpts', (v) => {
    STATE.difficulty = v;
    actionQueue.reset();
    updateDifficultyDisplay();
    persist();
  });
  setupOpts('actionLavaOpts', (v) => {
    STATE.lavaFreq = v;
    updateLavaDisplay();
    persist();
  });
  setupOpts('actionLengthOpts', (v) => {
    STATE.length = parseInt(v, 10);
    persist();
  });

  document.getElementById('actionTestBtn').addEventListener('click', () => {
    ensureAudio();
    unlockSpeech();
    playChime(659, 1, 0.6);
    setTimeout(() => speak('Hop on one foot!', { rate: 1.05, pitch: 1.05 }), 150);
  });

  document.getElementById('actionStartBtn').addEventListener('click', () => {
    if (_starting) return;
    _starting = true;
    _ended = false;
    ensureAudio();
    unlockSpeech();
    startSpeechKeepalive();
    requestWakeLock();
    startCountdown();
  });

  document.getElementById('actionStopBtn').addEventListener('click', endGame);

  document.getElementById('actionCancelBtn').addEventListener('click', () => {
    clearAll();
    releaseWakeLock();
    stopSpeechKeepalive();
    document.body.classList.remove('lava-bg');
    inLava = false;
    _starting = false;
    _ended = false;
    show('setup');
  });

  document.getElementById('actionAgainBtn').addEventListener('click', () => {
    cancelSpeech();
    clearAll();
    document.body.classList.remove('lava-bg');
    inLava = false;
    _ended = false;
    _starting = false;
    show('setup');
  });

  loadSettings();
}
