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

let speechVoice = null;
let speechUnlocked = false;
let speechKeepalive = null;

// =============================================================
// Recorded voice support
// =============================================================

const clipCache = new Map(); // slug -> AudioBuffer (hit) | null (known miss)

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
  const url = `audio/voice/${slug}.mp3`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      clipCache.set(slug, null);
      return null;
    }
    const arr = await resp.arrayBuffer();
    const buf = await ctx.decodeAudioData(arr);
    clipCache.set(slug, buf);
    return buf;
  } catch {
    clipCache.set(slug, null);
    return null;
  }
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
 * Calibrated against typical iOS / Android TTS at rate ~1.0:
 *   - ~380ms per word
 *   - 450ms minimum (very short utterances still need warmup time)
 *   - rate scales inversely (rate=2 halves duration, rate=0.5 doubles)
 */
export function speechDurationMs(text, opts = {}) {
  if (!text) return 0;
  const rate = opts.rate || 1.0;
  const words = String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const baseMs = Math.max(450, words * 380);
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
  } catch {
    /* swallow */
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
    /* swallow */
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
      /* swallow */
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
        /* swallow */
      }
    }, 50);
    return true;
  } catch (e) {
    return false;
  }
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
    const buf = clipCache.get(slug);
    if (buf) {
      playRecording(buf, opts.volume);
      return true;
    }
    return speakTTS(text, opts);
  }

  // First time we've seen this slug — try the network. The async wait adds
  // ~100-300ms before sound on the very first call; subsequent calls (and
  // anything preloaded via preloadVoices) play immediately.
  tryLoadClip(slug).then((buf) => {
    if (buf) playRecording(buf, opts.volume);
    else speakTTS(text, opts);
  });
  return true;
}
