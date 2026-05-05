/* Guess the Sound — phone plays an animal sound a few times, kids guess.
 * Tap "Reveal Answer" to see + hear the animal again.
 */

import { ensureAudio, playSuccessJingle } from '../audio.js';
import {
  speak,
  unlockSpeech,
  startSpeechKeepalive,
  stopSpeechKeepalive,
} from '../speech.js';
import { requestWakeLock, releaseWakeLock } from '../wakeLock.js';
import { show, setupOpts, setupToggle, isActiveScreen, makeQueue } from '../ui.js';
import { ANIMALS } from './animalsData.js';
import { playAnimalSound } from './animalSounds.js';
import { load, save } from '../storage.js';

const KEY = 'guessSound';

const STATE = {
  difficulty: 'easy',
  repeats: 3,
  auto: false,
};

let round = 0;
let currentAnimal = null;
let revealed = false;
let autoTimeout = null;

function getPool() {
  // Only animals that have a synthesized sound. Difficulty filters by
  // guessTier ('easy' | 'medium'); 'medium' and 'all' both return everything
  // since hard-tier animals don't have synthesized sounds.
  if (STATE.difficulty === 'easy') {
    return ANIMALS.filter((a) => a.sound && a.guessTier === 'easy');
  }
  return ANIMALS.filter((a) => a.sound);
}

const guessQueue = makeQueue(() => getPool());

function playSequence(animal) {
  let i = 0;
  const playOne = () => {
    if (!isActiveScreen('guessGame')) return;
    playAnimalSound(animal.sound);
    i++;
    if (i < STATE.repeats) {
      setTimeout(playOne, 1400);
    }
  };
  playOne();
}

function startRound() {
  revealed = false;
  round++;
  document.getElementById('guessScore').textContent = 'Round ' + round;

  currentAnimal = guessQueue.next();

  const emojiEl = document.getElementById('guessEmoji');
  const textEl = document.getElementById('guessText');
  emojiEl.textContent = '🔊';
  textEl.textContent = 'Listen carefully...';
  document.getElementById('guessRevealBtn').textContent = 'Reveal Answer';

  setTimeout(() => playSequence(currentAnimal), 500);
}

function reveal() {
  if (!currentAnimal || revealed) return;
  revealed = true;
  const animal = currentAnimal;
  document.getElementById('guessEmoji').textContent = animal.emoji;
  document.getElementById('guessText').textContent = "It's a " + animal.name + '!';
  if (animal.sound) setTimeout(() => playAnimalSound(animal.sound), 200);
  setTimeout(() => speak("It's a " + animal.name, { rate: 1.0, pitch: 1.05 }), 800);
  document.getElementById('guessRevealBtn').textContent = 'Next Sound';

  if (STATE.auto) {
    autoTimeout = setTimeout(() => {
      if (isActiveScreen('guessGame')) startRound();
    }, 3500);
  }
}

function endGame() {
  if (autoTimeout) clearTimeout(autoTimeout);
  releaseWakeLock();
  stopSpeechKeepalive();
  document.getElementById('guessFinalScore').textContent =
    round + (round === 1 ? ' sound played!' : ' sounds played!');
  playSuccessJingle();
  show('guessEnd');
}

async function loadSettings() {
  const saved = await load(KEY, null);
  if (!saved) return;
  Object.assign(STATE, saved);
  syncOpt('guessDifficultyOpts', STATE.difficulty);
  syncOpt('guessRepeatsOpts', String(STATE.repeats));
  document.getElementById('guessAutoToggle').classList.toggle('on', !!STATE.auto);
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
  setupOpts('guessDifficultyOpts', (v) => {
    STATE.difficulty = v;
    guessQueue.reset();
    persist();
  });
  setupOpts('guessRepeatsOpts', (v) => {
    STATE.repeats = parseInt(v, 10);
    persist();
  });
  setupToggle('guessAutoToggle', (on) => {
    STATE.auto = on;
    persist();
  });

  document.getElementById('guessTestBtn').addEventListener('click', () => {
    ensureAudio();
    unlockSpeech();
    playAnimalSound('cow');
  });

  document.getElementById('guessStartBtn').addEventListener('click', () => {
    ensureAudio();
    unlockSpeech();
    startSpeechKeepalive();
    requestWakeLock();
    round = 0;
    show('guessGame');
    startRound();
  });

  document.getElementById('guessRevealBtn').addEventListener('click', () => {
    if (autoTimeout) {
      clearTimeout(autoTimeout);
      autoTimeout = null;
    }
    if (revealed) startRound();
    else reveal();
  });

  document.getElementById('guessStopBtn').addEventListener('click', endGame);

  document.getElementById('guessAgainBtn').addEventListener('click', () => {
    if (autoTimeout) clearTimeout(autoTimeout);
    show('setup');
  });

  loadSettings();
}
