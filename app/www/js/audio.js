/* Shared audio infrastructure.
 *
 * Web Audio graph (simple — no reverb, no per-screen routing):
 *
 *   source ──► dryGain ──► compressor ──► masterGain ──► destination
 *
 * Compressor is the "loud" preset: -22dB threshold, 8:1 ratio, ~1.6×
 * makeup gain via masterGain. Tuned to make the phone speaker pop on
 * a kid's playroom floor.
 *
 * Earlier versions had a convolution-reverb wet path and three
 * compressor presets ("normal" / "loud" / "max"). Both were never
 * exposed in the UI and the convolver impulse-response build (~880KB
 * of stereo Float32 random noise) was a 30-100ms main-thread hitch
 * on the first user click for no benefit. Both removed.
 */

import { logErr } from './log.js';

let audioCtx = null;
let masterGain = null;
let compressor = null;
let dryGain = null;

const silentAudio =
  typeof document !== 'undefined' ? document.getElementById('silentLoop') : null;

const MASTER_GAIN = 1.6;

export function getAudioCtx() {
  return audioCtx;
}

export function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      buildAudioGraph();
    } catch (e) {
      logErr('audio.ensureAudio', e);
      return;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch((e) => logErr('audio.resume', e));
  }
  if (silentAudio) {
    silentAudio.volume = 0.001;
    silentAudio.play().catch((e) => logErr('audio.silentLoop', e));
  }
}

export function resumeIfSuspended() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch((e) => logErr('audio.resumeIfSuspended', e));
  }
  if (silentAudio) silentAudio.play().catch((e) => logErr('audio.silentLoop', e));
}

function buildAudioGraph() {
  dryGain = audioCtx.createGain();
  compressor = audioCtx.createDynamicsCompressor();
  masterGain = audioCtx.createGain();

  const now = audioCtx.currentTime;
  compressor.threshold.setValueAtTime(-22, now);
  compressor.knee.setValueAtTime(15, now);
  compressor.ratio.setValueAtTime(8, now);
  compressor.attack.setValueAtTime(0.002, now);
  compressor.release.setValueAtTime(0.2, now);
  masterGain.gain.setValueAtTime(MASTER_GAIN, now);

  dryGain.connect(compressor);
  compressor.connect(masterGain);
  masterGain.connect(audioCtx.destination);
}

/**
 * Connect a source node to the routing chain.
 */
export function connectSource(node) {
  if (!dryGain) return;
  node.connect(dryGain);
}

/**
 * Quickly mute the master output for ~60ms, then restore. In-flight
 * oscillators (e.g. a 0.5s lava siren still wailing when the user taps
 * Stop) ramp to silence immediately, but anything scheduled afterwards
 * (closing speech, success jingle) plays normally — by the time their
 * envelopes warm up the master gain has been restored.
 */
export function silenceAll() {
  if (!audioCtx || !masterGain) return;
  const now = audioCtx.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.06);
  masterGain.gain.linearRampToValueAtTime(MASTER_GAIN, now + 0.1);
}

// =============================================================
// Find Me — Chirp voices
// =============================================================

export function playChime(baseFreq, numNotes, vol) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const intervals = [0, 4, 7, 12, 16];
  for (let i = 0; i < numNotes; i++) {
    const freq = baseFreq * Math.pow(2, intervals[i] / 12);
    const startT = now + i * 0.13;
    const dur = 0.5;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.value = freq;
    osc2.frequency.value = freq * 2;
    const mix = audioCtx.createGain();
    mix.gain.value = 0.35;
    osc2.connect(mix);
    osc1.connect(gain);
    mix.connect(gain);
    gain.gain.setValueAtTime(0, startT);
    gain.gain.linearRampToValueAtTime(vol, startT + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
    connectSource(gain);
    osc1.start(startT);
    osc1.stop(startT + dur + 0.05);
    osc2.start(startT);
    osc2.stop(startT + dur + 0.05);
  }
}

export function playBell(baseFreq, numNotes, vol) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const partials = [1, 2, 2.4, 3.2, 4.5];
  const partialGains = [1, 0.5, 0.4, 0.25, 0.15];
  for (let n = 0; n < numNotes; n++) {
    const freq = baseFreq * (n === 0 ? 1 : Math.pow(2, (n * 3) / 12));
    const startT = now + n * 0.2;
    const dur = 1.5;
    const sumGain = audioCtx.createGain();
    sumGain.gain.setValueAtTime(0, startT);
    sumGain.gain.linearRampToValueAtTime(vol, startT + 0.005);
    sumGain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
    connectSource(sumGain);
    partials.forEach((p, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * p;
      g.gain.value = partialGains[i];
      osc.connect(g);
      g.connect(sumGain);
      osc.start(startT);
      osc.stop(startT + dur + 0.1);
    });
  }
}

export function playSiren(baseFreq, numNotes, vol) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const dur = 0.3 + numNotes * 0.18;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  const lowF = baseFreq * 0.7;
  const highF = baseFreq * 1.4;
  osc.frequency.setValueAtTime(lowF, now);
  const sweeps = Math.max(2, numNotes);
  for (let i = 0; i < sweeps; i++) {
    const t2 = now + ((i + 0.5) * dur) / sweeps;
    const t3 = now + ((i + 1) * dur) / sweeps;
    osc.frequency.exponentialRampToValueAtTime(highF, t2);
    osc.frequency.exponentialRampToValueAtTime(lowF, t3);
  }
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol * 0.7, now + 0.05);
  gain.gain.setValueAtTime(vol * 0.7, now + dur - 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  osc.connect(gain);
  connectSource(gain);
  osc.start(now);
  osc.stop(now + dur + 0.05);
}

export function playBeep(baseFreq, numNotes, vol) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  for (let i = 0; i < numNotes; i++) {
    const startT = now + i * 0.18;
    const dur = 0.12;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = baseFreq * (i === 0 ? 1 : 1.06);
    gain.gain.setValueAtTime(0, startT);
    gain.gain.linearRampToValueAtTime(vol * 0.6, startT + 0.005);
    gain.gain.setValueAtTime(vol * 0.6, startT + dur - 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
    osc.connect(gain);
    connectSource(gain);
    osc.start(startT);
    osc.stop(startT + dur + 0.02);
  }
}

export function playCuckoo(baseFreq, numNotes, vol) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const reps = Math.max(1, Math.floor(numNotes / 2)) + (numNotes >= 3 ? 1 : 0);
  const high = baseFreq * 1.5;
  const low = baseFreq * 1.2;
  for (let r = 0; r < reps; r++) {
    [high, low].forEach((f, i) => {
      const startT = now + r * 0.5 + i * 0.22;
      const dur = 0.18;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.value = 6;
      lfoGain.gain.value = 4;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      gain.gain.setValueAtTime(0, startT);
      gain.gain.linearRampToValueAtTime(vol * 0.7, startT + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
      osc.connect(gain);
      connectSource(gain);
      osc.start(startT);
      osc.stop(startT + dur + 0.05);
      lfo.start(startT);
      lfo.stop(startT + dur);
    });
  }
}

/** Sliding "tweet" — pure sine, descending pitch, sustains in middle. */
export function playWhistle(baseFreq, numNotes, vol) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  for (let i = 0; i < numNotes; i++) {
    const startT = now + i * 0.32;
    const dur = 0.4;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.6, startT);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, startT + dur);
    gain.gain.setValueAtTime(0, startT);
    gain.gain.linearRampToValueAtTime(vol * 0.75, startT + 0.05);
    gain.gain.setValueAtTime(vol * 0.75, startT + dur - 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
    osc.connect(gain);
    connectSource(gain);
    osc.start(startT);
    osc.stop(startT + dur + 0.05);
  }
}

/** Cartoon spring boing — sawtooth + rapid LFO, falling pitch. */
export function playBoing(baseFreq, numNotes, vol) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  for (let i = 0; i < numNotes; i++) {
    const startT = now + i * 0.32;
    const dur = 0.3;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq * 1.6, startT);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, startT + dur);
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.frequency.value = 22;
    lfoGain.gain.value = baseFreq * 0.15;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0, startT);
    gain.gain.linearRampToValueAtTime(vol * 0.55, startT + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
    osc.connect(gain);
    connectSource(gain);
    osc.start(startT);
    osc.stop(startT + dur + 0.05);
    lfo.start(startT);
    lfo.stop(startT + dur);
  }
}

/** Bird trill — each "note" is a 4-tap warble of two alternating frequencies. */
export function playBirdcall(baseFreq, numNotes, vol) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  for (let n = 0; n < numNotes; n++) {
    const callT = now + n * 0.45;
    for (let i = 0; i < 4; i++) {
      const startT = callT + i * 0.06;
      const dur = 0.05;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      const variation = i % 2 === 0 ? 1.0 : 1.18;
      osc.frequency.value = baseFreq * 1.8 * variation;
      gain.gain.setValueAtTime(0, startT);
      gain.gain.linearRampToValueAtTime(vol * 0.7, startT + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
      osc.connect(gain);
      connectSource(gain);
      osc.start(startT);
      osc.stop(startT + dur + 0.02);
    }
  }
}

export function playChirpSound(name, baseFreq, numNotes, vol) {
  switch (name) {
    case 'bell':
      playBell(baseFreq, numNotes, vol);
      break;
    case 'siren':
      playSiren(baseFreq, numNotes, vol);
      break;
    case 'beep':
      playBeep(baseFreq, numNotes, vol);
      break;
    case 'cuckoo':
      playCuckoo(baseFreq, numNotes, vol);
      break;
    case 'whistle':
      playWhistle(baseFreq, numNotes, vol);
      break;
    case 'boing':
      playBoing(baseFreq, numNotes, vol);
      break;
    case 'birdcall':
      playBirdcall(baseFreq, numNotes, vol);
      break;
    default:
      playChime(baseFreq, numNotes, vol);
  }
}

// =============================================================
// Red Light / Green Light + UI cues
// =============================================================

export function playGreenSound() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
  notes.forEach((f, i) => {
    const startT = now + i * 0.08;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0, startT);
    gain.gain.linearRampToValueAtTime(0.55, startT + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.4);
    osc.connect(gain);
    connectSource(gain);
    osc.start(startT);
    osc.stop(startT + 0.45);
  });
}

export function playYellowSound() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  // Mid-pitch descending three-note: A4 → G4 → E4 (caution motif).
  const notes = [440, 392, 330];
  notes.forEach((f, i) => {
    const startT = now + i * 0.12;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0, startT);
    gain.gain.linearRampToValueAtTime(0.5, startT + 0.01);
    gain.gain.setValueAtTime(0.5, startT + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.32);
    osc.connect(gain);
    connectSource(gain);
    osc.start(startT);
    osc.stop(startT + 0.4);
  });
}

export function playRedSound() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const notes = [392.0, 311.13, 233.08]; // G4 Eb4 Bb3
  notes.forEach((f, i) => {
    const startT = now + i * 0.1;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0, startT);
    gain.gain.linearRampToValueAtTime(0.5, startT + 0.01);
    gain.gain.setValueAtTime(0.5, startT + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.32);
    osc.connect(gain);
    connectSource(gain);
    osc.start(startT);
    osc.stop(startT + 0.4);
  });
}

export function playTickSound() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 1100;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc.connect(gain);
  connectSource(gain);
  osc.start(now);
  osc.stop(now + 0.08);
}

export function playSuccessJingle() {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => {
    const startT = now + i * 0.11;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.value = f;
    osc2.frequency.value = f * 2;
    const mix = audioCtx.createGain();
    mix.gain.value = 0.25;
    osc2.connect(mix);
    osc1.connect(gain);
    mix.connect(gain);
    gain.gain.setValueAtTime(0, startT);
    gain.gain.linearRampToValueAtTime(0.55, startT + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.5);
    connectSource(gain);
    osc1.start(startT);
    osc1.stop(startT + 0.55);
    osc2.start(startT);
    osc2.stop(startT + 0.55);
  });
}

