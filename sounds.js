// ARISE MONARCH — Sound Module
// Web Audio API synthesized sounds — Solo-Leveling-Vibe ohne Copyright-Mülleimer.
// Alle Sounds sind synthetisch erzeugt: kein File-Download, kein Server, kein Lizenz-Drama.
// iOS-Caveat: iPhone Silent-Switch muss aus sein.

const ARISE_SOUND_KEY = 'arise_sound_settings_v1';

const DEFAULT_SOUND_SETTINGS = {
  enabled: true,
  volume: 0.6  // 0..1
};

let audioCtx = null;
let masterGain = null;

function ensureCtx() {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = loadSettings().volume;
    masterGain.connect(audioCtx.destination);
  } catch (e) { audioCtx = null; }
  return audioCtx;
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(ARISE_SOUND_KEY);
    return raw ? { ...DEFAULT_SOUND_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SOUND_SETTINGS };
  } catch (e) { return { ...DEFAULT_SOUND_SETTINGS }; }
}

function saveSettings(s) {
  try { localStorage.setItem(ARISE_SOUND_KEY, JSON.stringify(s)); } catch (e) {}
  if (masterGain && typeof s.volume === 'number') masterGain.gain.value = s.volume;
}

function isEnabled() { return loadSettings().enabled; }

// ----- Helper-Bausteine -----

function tone(freq, duration, type = 'sine', volume = 1, attack = 0.005, release = 0.1) {
  const ctx = ensureCtx();
  if (!ctx || !masterGain) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + attack);
  gain.gain.setValueAtTime(volume, now + attack + Math.max(0, duration - attack - release));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain).connect(masterGain);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

function sweep(fromFreq, toFreq, duration, type = 'sawtooth', volume = 0.5) {
  const ctx = ensureCtx();
  if (!ctx || !masterGain) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(fromFreq, now);
  osc.frequency.exponentialRampToValueAtTime(toFreq, now + duration);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  // High-pass für klareren Klang
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(toFreq * 1.5, now);
  filter.Q.value = 5;
  osc.connect(filter).connect(gain).connect(masterGain);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

function noise(duration, volume = 0.3, filterFreq = 2000) {
  const ctx = ensureCtx();
  if (!ctx || !masterGain) return;
  const now = ctx.currentTime;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = 1;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(filter).connect(gain).connect(masterGain);
  src.start(now);
}

// Reverb-Tail via einfaches Convolver — minimal aber wirksam
function reverbConnect(node) {
  const ctx = ensureCtx();
  if (!ctx) return node;
  const conv = ctx.createConvolver();
  const length = ctx.sampleRate * 1.2;
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
    }
  }
  conv.buffer = impulse;
  return conv;
}

// ----- Sound-Library -----

export const Sounds = {
  loadSettings,
  saveSettings,
  isEnabled,

  // Kurzer Quest-Done — C-Dur Triade aufsteigend
  questDone() {
    if (!isEnabled()) return;
    const ctx = ensureCtx(); if (!ctx) return;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      setTimeout(() => tone(freq, 0.18, 'triangle', 0.35), i * 50);
    });
  },

  // Combo-Up — schneller Triple-Beat aufsteigend mit Energie
  combo() {
    if (!isEnabled()) return;
    [880, 1046.5, 1318.5].forEach((freq, i) => {
      setTimeout(() => tone(freq, 0.12, 'square', 0.25), i * 70);
    });
  },

  // Level-Up — anschwellender Sweep + Akkord
  levelUp() {
    if (!isEnabled()) return;
    sweep(220, 880, 0.6, 'sawtooth', 0.3);
    setTimeout(() => {
      // Power-Akkord am Ende: A4 + C#5 + E5
      tone(440, 0.6, 'triangle', 0.25);
      tone(554.37, 0.6, 'triangle', 0.2);
      tone(659.25, 0.6, 'triangle', 0.2);
    }, 400);
  },

  // Rank-Up (E→D, D→C, etc.) — dramatisch
  rankUp() {
    if (!isEnabled()) return;
    sweep(110, 440, 0.8, 'sawtooth', 0.35);
    setTimeout(() => {
      tone(220, 0.8, 'triangle', 0.3);
      tone(330, 0.8, 'triangle', 0.25);
      tone(440, 0.8, 'sine', 0.25);
    }, 300);
    setTimeout(() => noise(0.4, 0.15, 4000), 600);
  },

  // MONARCH ACHIEVED — Endgame, S-Rank Erreichen
  monarch() {
    if (!isEnabled()) return;
    const ctx = ensureCtx(); if (!ctx) return;
    // Bass-Gong
    tone(82.4, 3.5, 'sine', 0.5, 0.005, 2.5);
    tone(164.8, 3.5, 'sine', 0.3, 0.005, 2.5);
    // Choir-Pad mit langsamem Filter-Sweep
    setTimeout(() => {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();
      osc1.type = 'sawtooth'; osc1.frequency.value = 261.63; // C4
      osc2.type = 'sawtooth'; osc2.frequency.value = 329.63; // E4
      osc3.type = 'sawtooth'; osc3.frequency.value = 392.00; // G4
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(3000, now + 1.5);
      filter.Q.value = 8;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
      gain.gain.linearRampToValueAtTime(0.15, now + 1.5);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);
      osc1.connect(filter); osc2.connect(filter); osc3.connect(filter);
      filter.connect(gain).connect(masterGain);
      osc1.start(now); osc2.start(now); osc3.start(now);
      osc1.stop(now + 3.2); osc2.stop(now + 3.2); osc3.stop(now + 3.2);
    }, 200);
    // Cymbal-Crash am Anfang
    noise(0.6, 0.2, 6000);
  },

  // Streak gerissen — fallender Minor
  streakBroken() {
    if (!isEnabled()) return;
    [659.25, 587.33, 523.25, 440].forEach((freq, i) => {
      setTimeout(() => tone(freq, 0.18, 'triangle', 0.25), i * 90);
    });
  },

  // Notfall / Heißhunger — Warning-Pulse
  alert() {
    if (!isEnabled()) return;
    [880, 880].forEach((freq, i) => {
      setTimeout(() => tone(freq, 0.12, 'square', 0.3), i * 200);
    });
  },

  // Test-Button für Settings: spielt Quest-Done
  test() {
    this.questDone();
  },

  // Resume Audio Context (iOS unlock nach erstem Tap)
  unlock() {
    const ctx = ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
  }
};

// Globale Verfügbarkeit für inline-Scripts
if (typeof window !== 'undefined') window.AriseSounds = Sounds;
