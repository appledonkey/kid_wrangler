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
import { heavyHaptic, successHaptic } from '../native.js';

const KEY = 'floorLava';

const STATE = {
  pace: 'normal',
  difficulty: 'mixed',
  lavaFreq: 'sometimes',
  length: 120,
};

const ACTIONS = {
  // Easy moves (16) — body-part overlaps with Simon Says intentionally dropped
  easy: [
    { text: 'Hop on one foot!', emoji: '🦶' },
    { text: 'Spin in a circle!', emoji: '🌀' },
    { text: 'Jump up and down!', emoji: '⬆️' },
    { text: 'Clap five times!', emoji: '👏' },
    { text: 'Stand on tiptoes!', emoji: '🩰' },
    { text: 'Skip in place!', emoji: '🦘' },
    { text: 'Run in place!', emoji: '🏃' },
    { text: 'Hop forward five times!', emoji: '➡️' },
    { text: 'Hop backward five times!', emoji: '⬅️' },
    { text: 'Bounce on your toes!', emoji: '🪀' },
    { text: 'Wiggle your whole body!', emoji: '🌪️' },
    { text: 'Spin like a top!', emoji: '🌀' },
    { text: 'March around the room!', emoji: '🪖' },
    { text: 'Walk backwards!', emoji: '🔄' },
    { text: 'Tiptoe slowly!', emoji: '🤫' },
    { text: 'Crawl on hands and knees!', emoji: '👶' },
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

  // Exercise (10) — calorie burners
  exercise: [
    { text: 'Do five jumping jacks!', emoji: '🤸' },
    { text: 'Do five squats!', emoji: '🏋️' },
    { text: 'Do five lunges!', emoji: '🚶' },
    { text: 'Do five push-ups!', emoji: '💪' },
    { text: 'High knees for five seconds!', emoji: '🦵' },
    { text: 'Do five sit-ups!', emoji: '🧘' },
    { text: 'Do five mountain climbers!', emoji: '🧗' },
    { text: 'Hold a plank for five seconds!', emoji: '🛹' },
    { text: 'Do five toe touches!', emoji: '🦶' },
    { text: 'Do five leg lifts!', emoji: '🦵' },
  ],

  // Balance & freeze (8) — yoga / statue holds
  balance: [
    { text: 'Balance on one foot!', emoji: '🦩' },
    { text: 'Stand like a flamingo for five seconds!', emoji: '🦩' },
    { text: 'Be a statue for five seconds!', emoji: '🗿' },
    { text: 'Hold a tree pose!', emoji: '🌳' },
    { text: 'Balance on tiptoes for five seconds!', emoji: '🩰' },
    { text: 'Freeze like a popsicle!', emoji: '🧊' },
    { text: 'Stand on one leg with eyes closed!', emoji: '🙈' },
    { text: 'Hold a karate pose!', emoji: '🥋' },
  ],

  // Stretches (8)
  stretches: [
    { text: 'Reach for the sky!', emoji: '🙌' },
    { text: 'Touch your toes!', emoji: '🤸' },
    { text: 'Twist side to side!', emoji: '🔁' },
    { text: 'Roll your shoulders back!', emoji: '🔄' },
    { text: 'Side-bend left and right!', emoji: '↔️' },
    { text: 'Touch the floor!', emoji: '⬇️' },
    { text: 'Stretch your arms out wide!', emoji: '🪽' },
    { text: 'Big yawn and stretch!', emoji: '🥱' },
  ],

  // Scavenger hunt (12)
  find: [
    { text: 'Find something RED!', emoji: '🔴' },
    { text: 'Find something BLUE!', emoji: '🔵' },
    { text: 'Find something GREEN!', emoji: '🟢' },
    { text: 'Find something soft!', emoji: '☁️' },
    { text: 'Find something round!', emoji: '⚪' },
    { text: 'Find something fluffy!', emoji: '🧸' },
    { text: 'Find something shiny!', emoji: '✨' },
    { text: 'Find a book!', emoji: '📖' },
    { text: 'Find a pillow!', emoji: '🛏️' },
    { text: 'Find a shoe!', emoji: '👟' },
    { text: 'Find a hat!', emoji: '🧢' },
    { text: 'Find a stuffed animal!', emoji: '🧸' },
  ],

  // Skill / dexterity (8)
  skills: [
    { text: 'Clap a fast pattern: clap-clap-pause-clap!', emoji: '👏' },
    { text: 'Snap your fingers ten times!', emoji: '🫰' },
    { text: 'Pat your head and rub your tummy!', emoji: '🙆' },
    { text: 'Wiggle your fingers like piano keys!', emoji: '🎹' },
    { text: 'Stomp left, right, left, right!', emoji: '👣' },
    { text: 'Hop on one foot, then the other!', emoji: '🦶' },
    { text: 'Tap each finger to your thumb!', emoji: '🤏' },
    { text: 'Wink with one eye, then the other!', emoji: '😉' },
  ],

  // Silly / pretend (12)
  silly: [
    { text: 'Do a silly dance!', emoji: '💃' },
    { text: 'Sing your name out loud!', emoji: '🎤' },
    { text: 'Talk like a robot!', emoji: '🤖' },
    { text: 'Walk like a zombie!', emoji: '🧟' },
    { text: 'Do a superhero pose!', emoji: '🦸' },
    { text: 'Pretend to be a tree!', emoji: '🌳' },
    { text: 'Pretend to be a snowman!', emoji: '⛄' },
    { text: 'Pretend to brush your teeth!', emoji: '🪥' },
    { text: 'Pretend to be asleep!', emoji: '😴' },
    { text: 'Pretend to be a chef cooking!', emoji: '👨‍🍳' },
    { text: 'Pretend you are underwater!', emoji: '🤿' },
    { text: 'Pretend to ride a horse!', emoji: '🏇' },
  ],

  // Wild / random (10) — leftover creative
  wild: [
    { text: 'Tiptoe like a ninja!', emoji: '🥷' },
    { text: 'Pretend to swim!', emoji: '🏊' },
    { text: 'Pretend to fly!', emoji: '🪁' },
    { text: 'Spin around three times!', emoji: '🌀' },
    { text: 'Walk backwards five steps!', emoji: '🔙' },
    { text: 'Crawl like a baby!', emoji: '👶' },
    { text: 'Wiggle like a worm!', emoji: '🪱' },
    { text: 'Pretend you are stuck in mud!', emoji: '🟫' },
    { text: 'Pretend to be a bouncing ball!', emoji: '🏀' },
    { text: 'Pretend to be popcorn popping!', emoji: '🍿' },
  ],
};

const LAVA_ACTIONS = [
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
      ...ACTIONS.easy, ...ACTIONS.animals, ...ACTIONS.find,
      ...ACTIONS.balance, ...ACTIONS.stretches,
    ];
  }
  if (STATE.difficulty === 'wild') {
    return [
      ...ACTIONS.exercise, ...ACTIONS.silly, ...ACTIONS.skills,
      ...ACTIONS.wild, ...ACTIONS.animals,
    ];
  }
  // mixed = all categories
  return [
    ...ACTIONS.easy, ...ACTIONS.animals, ...ACTIONS.exercise,
    ...ACTIONS.balance, ...ACTIONS.stretches, ...ACTIONS.find,
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
    const duration = action.isLava ? LAVA_DURATION : speechMs + gapMs;
    actionTimer = setTimeout(fire, duration);
  };
  setTimeout(fire, 900);

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
  if (actionTimer) clearTimeout(actionTimer);
  if (endTimeout) clearTimeout(endTimeout);
  if (timerInterval) clearInterval(timerInterval);
  actionTimer = endTimeout = timerInterval = null;
  releaseWakeLock();
  stopSpeechKeepalive();
  cancelSpeech();
  document.body.classList.remove('lava-bg');
  inLava = false;
  speak('Time is up! Great job!', { rate: 1.0 });
  successHaptic();
  playSuccessJingle();
  show('actionEnd');
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
    ensureAudio();
    unlockSpeech();
    startSpeechKeepalive();
    requestWakeLock();
    startCountdown();
  });

  document.getElementById('actionStopBtn').addEventListener('click', endGame);

  document.getElementById('actionAgainBtn').addEventListener('click', () => {
    clearAll();
    document.body.classList.remove('lava-bg');
    show('setup');
  });

  loadSettings();
}
