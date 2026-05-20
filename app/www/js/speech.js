/* Speech with iOS hardening + recorded-voice override.
 *
 * speak(text) first tries to play a recorded MP3 from `audio/voice/<slug>.mp3`,
 * where <slug> is the slugified text (lowercase, alphanumeric + hyphens).
 * If no file is found, falls back to browser speechSynthesis (TTS).
 *
 * That means you can ship the app entirely with TTS, then drop in recorded
 * versions of any line — they'll be used automatically without code changes.
 *
 * iOS quirks handled (only relevant for the TTS fallback):
 *
 * 1. iOS Safari speechSynthesis dies after ~15s idle.
 *    Fix: poll resume() on a 4-second interval during games.
 *
 * 2. iOS speech requires a user-gesture "unlock" via a silent priming utterance.
 *    Fix: call unlockSpeech() inside every Test/Start button handler.
 *
 * 3. cancel() then speak() on iOS races. The new utterance can get dropped.
 *    Fix: 50ms gap between cancel and speak.
 */

import { getAudioCtx, connectSource } from './audio.js';
import { logErr } from './log.js';

let speechVoice = null;
let speechUnlocked = false;
let speechKeepalive = null;

// =============================================================
// Recorded voice support
// =============================================================

/* clipCache: slug -> AudioBuffer[] (one or more variants) | null (known miss).
 *
 * Variants: high-repeat lines (Red Light state calls, Floor Lava events,
 * closing lines) ship as `<slug>.mp3`, `<slug>-2.mp3`, `<slug>-3.mp3`, etc.
 * `speak()` picks one variant at random per call so kids don't hear the
 * same take 30× in a Red Light session. Most lines have a single MP3 and
 * play deterministically.
 *
 * The runtime auto-detects variants by probing sequential suffixes
 * (-2, -3, ...) until the first 404, capped at MAX_VARIANTS.
 */
const clipCache = new Map();
const MAX_VARIANTS = 5;

/**
 * Slug rules: lowercase, strip everything except letters / digits /
 * whitespace, collapse whitespace into single hyphens.
 *
 *   "Green light!"               → "green-light"
 *   "Hop on one foot!"           → "hop-on-one-foot"
 *   "It's a cow"                 → "its-a-cow"
 *   "FLOOR IS LAVA! Climb..."    → "floor-is-lava-climb-on-something"
 */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function tryLoadClip(slug) {
  if (clipCache.has(slug)) return clipCache.get(slug);
  const ctx = getAudioCtx();
  if (!ctx) {
    clipCache.set(slug, null);
    return null;
  }
  const bufs = [];
  // Probe slug.mp3, slug-2.mp3, slug-3.mp3, ... up to MAX_VARIANTS.
  // First 404 ends discovery (after at least slug.mp3 was tried).
  for (let n = 1; n <= MAX_VARIANTS; n++) {
    const suffix = n === 1 ? '' : `-${n}`;
    const url = `audio/voice/${slug}${suffix}.mp3`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) break; // 404 is expected for missing variants
      const arr = await resp.arrayBuffer();
      const buf = await ctx.decodeAudioData(arr);
      bufs.push(buf);
    } catch (e) {
      // Only logged in dev — a corrupt MP3 or fetch failure leaves a
      // trace, but we still gracefully fall back to TTS or earlier
      // variants below.
      logErr('speech.tryLoadClip', e);
      break;
    }
  }
  const result = bufs.length ? bufs : null;
  clipCache.set(slug, result);
  return result;
}

function pickVariant(bufs) {
  if (!bufs || bufs.length === 0) return null;
  if (bufs.length === 1) return bufs[0];
  return bufs[Math.floor(Math.random() * bufs.length)];
}

function playRecording(buf, volume) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  if (typeof volume === 'number' && volume < 1) {
    const g = ctx.createGain();
    g.gain.value = volume;
    src.connect(g);
    connectSource(g);
  } else {
    connectSource(src);
  }
  src.start();
}

/**
 * Warm the cache for a list of texts so they play instantly on first use.
 * Safe to call any time after ensureAudio() has run. Misses are cached too,
 * so a missing recording costs one fetch per session, not one per call.
 */
export function preloadVoices(texts) {
  for (const t of texts) {
    if (typeof t === 'string' && t.trim()) tryLoadClip(slugify(t));
  }
}

/**
 * Estimate how long a TTS utterance will take. Callers use this to schedule
 * the NEXT command after the current one's voice has finished — prevents
 * commands from talking over each other.
 *
 * Calibrated to slightly OVER-estimate so kids have a real beat between
 * commands rather than the next chime hitting the moment voice finishes:
 *   - ~460ms per word
 *   - 700ms minimum (covers warmup + tail)
 *   - rate scales inversely (rate=2 halves duration, rate=0.5 doubles)
 */
export function speechDurationMs(text, opts = {}) {
  if (!text) return 0;
  const rate = opts.rate || 1.0;
  const words = String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const baseMs = Math.max(700, words * 460);
  return Math.round(baseMs / rate);
}

/**
 * Cancel any in-flight TTS utterance. Call from game stop / end handlers
 * so the previous announcement isn't still talking when the success
 * jingle plays.
 */
export function cancelSpeech() {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch (e) {
    logErr('speech.cancel', e);
  }
}

// =============================================================
// TTS fallback
// =============================================================

function getEnglishVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  return (
    voices.find(
      (v) =>
        /en[-_]?US/i.test(v.lang) &&
        /Samantha|Karen|Daniel|Google US English|Microsoft/i.test(v.name)
    ) ||
    voices.find((v) => /en[-_]?US/i.test(v.lang)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
    voices[0]
  );
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    speechVoice = getEnglishVoice();
  };
  speechVoice = getEnglishVoice();
}

/** Must be called from inside a user-gesture handler to unlock speech on iOS. */
export function unlockSpeech() {
  if (!('speechSynthesis' in window)) return;
  if (speechUnlocked) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    u.rate = 1;
    window.speechSynthesis.speak(u);
    speechUnlocked = true;
  } catch (e) {
    logErr('speech.unlock', e);
  }
}

export function startSpeechKeepalive() {
  if (speechKeepalive) return;
  if (!('speechSynthesis' in window)) return;
  speechKeepalive = setInterval(() => {
    try {
      if (!window.speechSynthesis.speaking) {
        window.speechSynthesis.resume();
      }
    } catch (e) {
      logErr('speech.keepalive', e);
    }
  }, 4000);
}

export function stopSpeechKeepalive() {
  if (speechKeepalive) {
    clearInterval(speechKeepalive);
    speechKeepalive = null;
  }
}

function speakTTS(text, opts = {}) {
  if (!('speechSynthesis' in window)) return false;
  try {
    window.speechSynthesis.cancel();
    setTimeout(() => {
      try {
        const u = new SpeechSynthesisUtterance(text);
        if (!speechVoice) speechVoice = getEnglishVoice();
        if (speechVoice) u.voice = speechVoice;
        u.lang = 'en-US';
        u.rate = opts.rate || 1.0;
        u.pitch = opts.pitch || 1.0;
        u.volume = typeof opts.volume === 'number' ? opts.volume : 1.0;
        window.speechSynthesis.speak(u);
      } catch (e) {
        logErr('speech.speakTTS.inner', e);
      }
    }, 50);
    return true;
  } catch (e) {
    logErr('speech.speakTTS', e);
    return false;
  }
}

// =============================================================
// Closing speech — two-phrase split
// =============================================================
//
// `speak('Time is up! Great job!')` as one utterance feels rushed —
// the comma-pause TTS provides between clauses is too short, and the
// MP3 path runs the whole phrase as one take. `speakClose(intros,
// praises)` instead picks one random phrase from each pool and
// speaks them in sequence with a real beat between, so the
// combinatorial variety (intros × praises) provides freshness
// without per-line variant MP3s.

export const TIME_UP_PHRASES = [
  'Time is up',
  "Time's up",
  'Out of time',
  'Buzzer time',
  'All done',
];

export const PRAISE_GENERIC = [
  'Great job',
  'Good job',
  'Nice work',
  'Well done',
  'You did it',
  'Awesome',
];

export const PRAISE_LISTENING = [
  'Great listening',
  'Sharp ears',
  'Way to listen',
  'You heard them all',
];

// ---- Mission Control closing pools ----
export const MISSION_VICTORY_INTROS = [
  'Mission accomplished',
  'Touchdown',
  'Safe landing',
  'Mission complete',
];
export const MISSION_PRAISE = [
  'Great flying',
  'Ace work pilot',
  'Stellar work',
  'Smooth landing',
];

// ---- Heroes & Villains closing pools (role-conditional) ----
export const HERO_VICTORY_INTROS = [
  'You saved the day',
  'The city is safe',
  'Justice prevails',
  'Victory is yours',
];
export const HERO_PRAISE = [
  'Great job hero',
  'Way to go',
  'Heroic effort',
  'True hero',
];

export const VILLAIN_VICTORY_INTROS = [
  'Mwa ha ha',
  'Diabolical',
  'Wickedly done',
  'Evil plans complete',
];
export const VILLAIN_PRAISE = [
  'Great evil-doing',
  'You scoundrel',
  'Truly villainous',
  'A worthy villain',
];

export const BOTH_VICTORY_INTROS = [
  'What a showdown',
  'Heroes and villains alike',
  'Battle over',
];
export const BOTH_PRAISE = [
  'Great work either way',
  'All the moves',
  'Truly versatile',
];

// ---- Weather Report closing pools ----
export const WEATHER_VICTORY_INTROS = [
  "That's all for today's weather",
  "And that's the forecast",
  'Forecast complete',
];
export const WEATHER_PRAISE = [
  'Stay weather-wise',
  'See you tomorrow',
  'Bundle up out there',
];

/**
 * Speak a two-part closing line: pick one from `intros`, one from
 * `praises`, speak them in sequence with a natural pause between
 * (speech duration estimate + 350ms). Both phrases get a trailing
 * "!" automatically — the pool entries are bare phrases.
 */
export function speakClose(intros, praises, opts = {}) {
  if (!intros?.length || !praises?.length) return;
  const intro = intros[Math.floor(Math.random() * intros.length)];
  const praise = praises[Math.floor(Math.random() * praises.length)];
  const introLine = `${intro}!`;
  const praiseLine = `${praise}!`;
  speak(introLine, opts);
  const gap = speechDurationMs(introLine, opts) + 350;
  setTimeout(() => speak(praiseLine, opts), gap);
}

// =============================================================
// Public API
// =============================================================

/**
 * Speak text. Plays a recorded MP3 from audio/voice/<slug>.mp3 if present,
 * otherwise falls back to browser TTS.
 *
 * opts: { rate, pitch } — only applied to the TTS fallback. Recorded clips
 * play at their captured rate/pitch.
 */
export function speak(text, opts = {}) {
  if (!text) return false;
  const slug = slugify(text);

  // Synchronous cache check: avoids async overhead for clips we've already
  // resolved this session (hit or miss).
  if (clipCache.has(slug)) {
    const bufs = clipCache.get(slug);
    if (bufs) {
      playRecording(pickVariant(bufs), opts.volume);
      return true;
    }
    return speakTTS(text, opts);
  }

  // First time we've seen this slug — probe for variants. The async wait
  // adds ~100-300ms before sound on the very first call; subsequent calls
  // (and anything preloaded via preloadVoices) play immediately.
  tryLoadClip(slug).then((bufs) => {
    if (bufs) playRecording(pickVariant(bufs), opts.volume);
    else speakTTS(text, opts);
  });
  return true;
}
