/* Animal sound synthesis. Each routine is a hand-tuned oscillator
 * + noise composition. DO NOT regenerate from scratch — these were
 * tuned by ear in the prototype.
 *
 * playAnimalSound(name) is the single public entry point. Names match
 * the `sound` key on entries in the ANIMALS data set.
 */

import { getAudioCtx, connectSource } from '../audio.js';

export function playAnimalSound(name) {
  const audioCtx = getAudioCtx();
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;

  function tone(freq, startT, dur, type, vol, freqEnd) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, startT);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, startT + dur);
    }
    gain.gain.setValueAtTime(0, startT);
    gain.gain.linearRampToValueAtTime(vol, startT + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
    osc.connect(gain);
    connectSource(gain);
    osc.start(startT);
    osc.stop(startT + dur + 0.05);
  }

  function noise(startT, dur, vol, filterFreq) {
    const bufferSize = audioCtx.sampleRate * dur;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq || 1000;
    filter.Q.value = 1;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, startT);
    gain.gain.linearRampToValueAtTime(vol, startT + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
    src.connect(filter);
    filter.connect(gain);
    connectSource(gain);
    src.start(startT);
    src.stop(startT + dur + 0.05);
  }

  switch (name) {
    case 'cow':
      tone(220, now, 0.4, 'sawtooth', 0.6, 165);
      tone(440, now, 0.4, 'sine', 0.2, 330);
      tone(165, now + 0.45, 0.6, 'sawtooth', 0.7, 110);
      tone(330, now + 0.45, 0.6, 'sine', 0.25, 220);
      break;
    case 'cat':
      tone(700, now, 0.15, 'sawtooth', 0.4, 900);
      tone(900, now + 0.15, 0.35, 'sawtooth', 0.5, 500);
      break;
    case 'dog':
      tone(300, now, 0.08, 'square', 0.6, 200);
      noise(now, 0.1, 0.3, 800);
      tone(300, now + 0.25, 0.08, 'square', 0.6, 200);
      noise(now + 0.25, 0.1, 0.3, 800);
      break;
    case 'pig':
      for (let i = 0; i < 3; i++) {
        const t = now + i * 0.25;
        noise(t, 0.15, 0.5, 400 + i * 100);
        tone(180, t, 0.15, 'sawtooth', 0.3, 140);
      }
      break;
    case 'duck':
      for (let i = 0; i < 2; i++) {
        const t = now + i * 0.35;
        tone(380, t, 0.1, 'sawtooth', 0.5, 320);
        tone(380, t + 0.1, 0.15, 'square', 0.4, 280);
      }
      break;
    case 'sheep': {
      const base = 440;
      for (let i = 0; i < 8; i++) {
        const t = now + i * 0.05;
        tone(base + (i % 2 ? 30 : -30), t, 0.06, 'sawtooth', 0.45);
      }
      tone(330, now + 0.45, 0.4, 'sawtooth', 0.5, 280);
      break;
    }
    case 'horse':
      tone(800, now, 0.15, 'sawtooth', 0.4, 600);
      tone(600, now + 0.15, 0.2, 'sawtooth', 0.5, 900);
      tone(900, now + 0.35, 0.35, 'sawtooth', 0.5, 500);
      tone(500, now + 0.7, 0.25, 'sawtooth', 0.4, 350);
      break;
    case 'chicken':
      for (let i = 0; i < 3; i++) {
        const t = now + i * 0.18;
        tone(500, t, 0.08, 'square', 0.4, 700);
        tone(700, t + 0.08, 0.08, 'square', 0.4, 500);
      }
      tone(500, now + 0.7, 0.1, 'square', 0.5, 800);
      tone(900, now + 0.8, 0.4, 'sawtooth', 0.5, 400);
      break;
    case 'frog':
      for (let i = 0; i < 2; i++) {
        const t = now + i * 0.4;
        tone(180, t, 0.08, 'sawtooth', 0.6);
        tone(220, t + 0.08, 0.15, 'square', 0.5, 160);
      }
      break;
    case 'bee':
      tone(220, now, 0.8, 'sawtooth', 0.4);
      tone(225, now, 0.8, 'sawtooth', 0.4);
      tone(440, now, 0.8, 'sawtooth', 0.2);
      break;
    case 'lion':
      noise(now, 0.8, 0.7, 250);
      tone(110, now, 0.8, 'sawtooth', 0.7, 80);
      tone(220, now, 0.8, 'sawtooth', 0.4, 165);
      break;
    case 'monkey':
      tone(500, now, 0.15, 'square', 0.4, 600);
      tone(700, now + 0.2, 0.15, 'square', 0.4, 800);
      tone(450, now + 0.45, 0.2, 'square', 0.45, 380);
      tone(380, now + 0.7, 0.25, 'square', 0.5, 320);
      break;
    case 'elephant':
      tone(220, now, 0.1, 'sawtooth', 0.5, 800);
      tone(800, now + 0.1, 0.6, 'sawtooth', 0.7, 400);
      noise(now, 0.7, 0.2, 600);
      break;
    case 'snake':
      noise(now, 1.0, 0.6, 4000);
      break;
    case 'owl':
      for (let i = 0; i < 2; i++) {
        const t = now + i * 0.4;
        tone(330, t, 0.3, 'sine', 0.5, 280);
      }
      break;
    case 'wolf':
      tone(220, now, 1.2, 'sawtooth', 0.6, 440);
      tone(440, now, 1.2, 'sine', 0.3, 880);
      break;
    case 'rooster':
      tone(700, now, 0.15, 'sawtooth', 0.5, 900);
      tone(900, now + 0.15, 0.15, 'sawtooth', 0.5, 700);
      tone(700, now + 0.3, 0.15, 'sawtooth', 0.5, 1100);
      tone(900, now + 0.5, 0.4, 'sawtooth', 0.6, 500);
      break;
    case 'mouse':
      tone(2000, now, 0.08, 'square', 0.3, 2400);
      tone(2200, now + 0.12, 0.1, 'square', 0.3, 1800);
      break;
    case 'turkey':
      for (let i = 0; i < 4; i++) {
        const t = now + i * 0.12;
        tone(400, t, 0.05, 'sawtooth', 0.4, 600);
        tone(600, t + 0.05, 0.05, 'sawtooth', 0.4, 400);
      }
      break;
    case 'crow':
      for (let i = 0; i < 2; i++) {
        const t = now + i * 0.5;
        tone(400, t, 0.4, 'sawtooth', 0.6, 250);
        noise(t, 0.4, 0.3, 1200);
      }
      break;
    case 'donkey':
      tone(900, now, 0.4, 'sawtooth', 0.5, 700);
      tone(220, now + 0.45, 0.6, 'sawtooth', 0.7, 165);
      break;
    case 'bear':
      noise(now, 0.9, 0.5, 200);
      tone(80, now, 0.9, 'sawtooth', 0.7);
      tone(160, now, 0.9, 'sawtooth', 0.4);
      break;
    default:
      // Fallback chime so unknown names don't silently fail.
      tone(659, now, 0.5, 'sine', 0.5);
  }
}
