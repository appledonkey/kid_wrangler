/* Shared audio infrastructure.
 *
 * Web Audio graph:
 *
 *   source ──► dryGain ──┐
 *                        ├──► compressor ──► masterGain ──► destination
 *   source ──► convolver ─► wetGain ──┘
 *
 * Reverb is only routed when explicitly enabled (Find Me only at the moment).
 *
 * Per BUILD_SPEC, three compressor presets:
 *   normal: -12dB / 4:1
 *   loud:   -22dB / 8:1
 *   max:    -32dB / 16:1 (heavy limiting + 2.4× master gain)
 *
 * Volume Boost values 'normal' / 'loud' / 'max' map to VOLUME_MULT below.
 */

let audioCtx = null;
let masterGain = null;
let compressor = null;
let convolver = null;
let dryGain = null;
let wetGain = null;
let _reverbWet = false;

const silentAudio =
  typeof document !== 'undefined' ? document.getElementById('silentLoop') : null;

const VOLUME_MULT = { normal: 1.0, loud: 1.6, max: 2.4 };

export function getAudioCtx() {
  return audioCtx;
}

export function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    buildAudioGraph();
    // Hard-code the "loud" preset since user-facing volume boost is gone.
    configureMaster('loud');
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (silentAudio) {
    silentAudio.volume = 0.001;
    silentAudio.play().catch(() => {});
  }
}

export function resumeIfSuspended() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  if (silentAudio) silentAudio.play().catch(() => {});
}

function buildAudioGraph() {
  convolver = audioCtx.createConvolver();
  convolver.buffer = createImpulseResponse(2.5, 3.0);
  dryGain = audioCtx.createGain();
  wetGain = audioCtx.createGain();
  compressor = audioCtx.createDynamicsCompressor();
  masterGain = audioCtx.createGain();

  dryGain.connect(compressor);
  convolver.connect(wetGain);
  wetGain.connect(compressor);
  compressor.connect(masterGain);
  masterGain.connect(audioCtx.destination);
}

export function configureMaster(boost, opts = {}) {
  if (!compressor) return;
  const reverb = !!opts.reverb;
  _reverbWet = reverb;
  const now = audioCtx.currentTime;
  if (boost === 'normal') {
    compressor.threshold.setValueAtTime(-12, now);
    compressor.knee.setValueAtTime(20, now);
    compressor.ratio.setValueAtTime(4, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.25, now);
  } else if (boost === 'loud') {
    compressor.threshold.setValueAtTime(-22, now);
    compressor.knee.setValueAtTime(15, now);
    compressor.ratio.setValueAtTime(8, now);
    compressor.attack.setValueAtTime(0.002, now);
    compressor.release.setValueAtTime(0.2, now);
  } else {
    compressor.threshold.setValueAtTime(-32, now);
    compressor.knee.setValueAtTime(8, now);
    compressor.ratio.setValueAtTime(16, now);
    compressor.attack.setValueAtTime(0.001, now);
    compressor.release.setValueAtTime(0.15, now);
  }
  masterGain.gain.setValueAtTime(VOLUME_MULT[boost] || 1.0, now);
  dryGain.gain.setValueAtTime(reverb ? 0.7 : 1.0, now);
  wetGain.gain.setValueAtTime(reverb ? 0.5 : 0.0, now);
}

function createImpulseResponse(duration, decay) {
  const sampleRate = audioCtx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const impulse = audioCtx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

/**
 * Connect a source node to the routing chain. Always taps the dry path;
 * also taps the convolver path when reverb is currently wet.
 */
export function connectSource(node) {
  if (!dryGain) return;
  node.connect(dryGain);
  if (_reverbWet) node.connect(convolver);
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

// =============================================================
// Dance Party drum machine voices
// =============================================================

export function playKick() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.8, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(gain);
  connectSource(gain);
  osc.start(now);
  osc.stop(now + 0.2);
}

export function playSnare() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const bufferSize = audioCtx.sampleRate * 0.15;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1500;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.5, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  src.connect(filter);
  filter.connect(gain);
  connectSource(gain);
  src.start(now);
  src.stop(now + 0.13);
}

export function playHat() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const bufferSize = audioCtx.sampleRate * 0.05;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  src.connect(filter);
  filter.connect(gain);
  connectSource(gain);
  src.start(now);
  src.stop(now + 0.06);
}
