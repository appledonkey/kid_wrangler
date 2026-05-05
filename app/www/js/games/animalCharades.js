/* Animal Charades — phone names an animal, kid acts it out, others guess.
 * Tap "Got it! Next" to advance. No timer pressure.
 *
 * Pool picker: All / Farm / Wild / Ocean / Forest / Arctic / Backyard / Dinosaurs.
 *
 * Reveal mode (replaces the old Show + Voice toggles, which contradicted
 * each other when set inconsistently):
 *   - 'show-and-speak': emoji + name on screen + voice loud (party mode)
 *   - 'show-silent':    emoji + name on screen, no voice (older readers)
 *   - 'whisper':        screen hidden, voice plays at low volume — hold the
 *                       phone near the actor's ear so only they hear it.
 *
 * Sound hint: optional toggle. Plays the animal's procedural sound effect
 * (the same one Guess the Sound uses) along with the announcement, but
 * only for animals that have a sound and only outside whisper mode (where
 * a loud animal sound would spoil the secret).
 */

import { ensureAudio, playChime, playSuccessJingle } from '../audio.js';
import {
  speak,
  unlockSpeech,
  startSpeechKeepalive,
  stopSpeechKeepalive,
} from '../speech.js';
import { requestWakeLock, releaseWakeLock } from '../wakeLock.js';
import { show, setupOpts, setupToggle, retriggerAnim, makeQueue } from '../ui.js';
import { ANIMALS, CATEGORIES, CATEGORY_LABELS, animalsIn } from './animalsData.js';
import { playAnimalSound } from './animalSounds.js';
import { load, save } from '../storage.js';
import { isLocked, attemptPurchase } from '../featureFlags.js';

const KEY = 'animalCharades';

const REVEAL_MODES = ['show-and-speak', 'show-silent', 'whisper'];

const STATE = {
  category: 'all',
  reveal: 'show-and-speak',
  soundHint: false,
};

const REVEAL_LABELS = {
  'show-and-speak': 'Phone shows + says it loud (party mode)',
  'show-silent':    'Phone shows the name silently (older readers)',
  'whisper':        'Phone hides + whispers (hold close to actor)',
};

const WHISPER_VOLUME = 0.4;

let score = 0;

const charadesQueue = makeQueue(() => animalsIn(STATE.category));

function announce(animal) {
  const emojiEl = document.getElementById('charadesEmoji');
  const textEl = document.getElementById('charadesText');

  if (STATE.reveal === 'whisper') {
    emojiEl.textContent = '🤫';
    textEl.textContent = '(only the actor can hear)';
  } else {
    emojiEl.textContent = animal.emoji;
    textEl.textContent = 'Act like a ' + animal.name + '!';
  }
  retriggerAnim(emojiEl, textEl);

  playChime(659, 1, 0.5);

  // Speak according to reveal mode.
  if (STATE.reveal === 'show-and-speak') {
    setTimeout(
      () => speak('Act like a ' + animal.name, { rate: 1.0, pitch: 1.05 }),
      100
    );
  } else if (STATE.reveal === 'whisper') {
    setTimeout(
      () => speak('Act like a ' + animal.name, { rate: 1.0, pitch: 1.05, volume: WHISPER_VOLUME }),
      100
    );
  }
  // 'show-silent' deliberately plays no voice.

  // Sound hint — only for animals with a sound, and only when not whispering
  // (a loud moo would give the secret away).
  if (STATE.soundHint && animal.sound && STATE.reveal !== 'whisper') {
    setTimeout(() => playAnimalSound(animal.sound), 1500);
  }
}

function updateScoreDisplay() {
  const el = document.getElementById('charadesScore');
  if (!el) return;
  el.textContent = score + (score === 1 ? ' animal acted out' : ' animals acted out');
}

function endGame() {
  releaseWakeLock();
  stopSpeechKeepalive();
  document.getElementById('charadesFinalScore').textContent =
    score + (score === 1 ? ' animal!' : ' animals!');
  playSuccessJingle();
  show('charadesEnd');
}

// ---------- Display helpers ----------

function updatePoolDisplay() {
  const el = document.getElementById('charadesPoolDisplay');
  if (!el) return;
  const count = animalsIn(STATE.category).length;
  el.textContent = `${CATEGORY_LABELS[STATE.category]} — ${count} animals`;
}

function updateRevealDisplay() {
  const el = document.getElementById('charadesRevealDisplay');
  if (el) el.textContent = REVEAL_LABELS[STATE.reveal] || '';
}

// ---------- Wiring ----------

async function loadSettings() {
  const saved = await load(KEY, null);
  if (saved) {
    if (typeof saved.category === 'string' && CATEGORIES.includes(saved.category)) {
      STATE.category = saved.category;
    }
    if (typeof saved.reveal === 'string' && REVEAL_MODES.includes(saved.reveal)) {
      STATE.reveal = saved.reveal;
    } else if (typeof saved.show === 'boolean' || typeof saved.voice === 'boolean') {
      // Migrate from the old Show + Voice toggle pair.
      if (saved.show === false) STATE.reveal = 'whisper';
      else if (saved.voice === false) STATE.reveal = 'show-silent';
      else STATE.reveal = 'show-and-speak';
    }
    if (typeof saved.soundHint === 'boolean') STATE.soundHint = saved.soundHint;
  }
  syncOpt('charadesPoolOpts', STATE.category);
  syncOpt('charadesRevealOpts', STATE.reveal);
  document.getElementById('charadesSoundToggle').classList.toggle('on', !!STATE.soundHint);
  updatePoolDisplay();
  updateRevealDisplay();
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
  setupOpts('charadesPoolOpts', (v) => {
    STATE.category = v;
    charadesQueue.reset();
    updatePoolDisplay();
    persist();
  });
  setupOpts('charadesRevealOpts', (v) => {
    STATE.reveal = v;
    updateRevealDisplay();
    persist();
  });
  setupToggle('charadesSoundToggle', (on) => {
    STATE.soundHint = on;
    persist();
  });

  document.getElementById('charadesTestBtn').addEventListener('click', () => {
    ensureAudio();
    unlockSpeech();
    playChime(659, 1, 0.5);
    const opts = STATE.reveal === 'whisper'
      ? { rate: 1.0, pitch: 1.05, volume: WHISPER_VOLUME }
      : { rate: 1.0, pitch: 1.05 };
    if (STATE.reveal !== 'show-silent') {
      setTimeout(() => speak('Act like a kangaroo', opts), 150);
    }
  });

  document.getElementById('charadesStartBtn').addEventListener('click', async () => {
    if (await isLocked('charades')) {
      attemptPurchase();
      return;
    }
    ensureAudio();
    unlockSpeech();
    startSpeechKeepalive();
    requestWakeLock();
    score = 0;
    updateScoreDisplay();
    show('charadesGame');
    charadesQueue.reset();
    setTimeout(() => announce(charadesQueue.next()), 400);
  });

  document.getElementById('charadesNextBtn').addEventListener('click', () => {
    score++;
    updateScoreDisplay();
    announce(charadesQueue.next());
  });

  document.getElementById('charadesStopBtn').addEventListener('click', endGame);

  document.getElementById('charadesAgainBtn').addEventListener('click', () => {
    show('setup');
  });

  loadSettings();
}
