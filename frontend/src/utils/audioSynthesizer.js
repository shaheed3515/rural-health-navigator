// Web Audio API Sound Synthesizer for Teleconsultation & Emergency Dialing
// Generates authentic telecom ringback tones, DTMF keypad tones, and connection chimes

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// DTMF Keypad Frequencies (Hz)
const DTMF_FREQUENCIES = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477]
};

// Play a single DTMF keypad beep
export function playDtmfTone(key, durationMs = 120) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const freqs = DTMF_FREQUENCIES[key] || [700, 1200];
    const now = ctx.currentTime;
    const durSec = durationMs / 1000;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(freqs[0], now);
    osc2.frequency.setValueAtTime(freqs[1], now);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + durSec);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + durSec);
    osc2.stop(now + durSec);
  } catch (err) {
    console.warn('[AudioSynth] DTMF playback prevented:', err);
  }
}

// Play Indian Standard Telecom Ringback Tone (400Hz modulated cadence)
export class RingbackTonePlayer {
  constructor() {
    this.intervalId = null;
    this.activeNodes = [];
    this.isPlaying = false;
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    const ctx = getAudioContext();
    if (!ctx) return;

    const playRingBurst = () => {
      if (!this.isPlaying) return;
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // 400Hz pure tone typical of Indian and European telecom networks
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);

        // First 0.4s beep
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
        gainNode.gain.setValueAtTime(0.18, now + 0.38);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        // Second 0.4s beep after 0.2s pause
        const secondStart = now + 0.6;
        gainNode.gain.setValueAtTime(0.001, secondStart);
        gainNode.gain.exponentialRampToValueAtTime(0.18, secondStart + 0.02);
        gainNode.gain.setValueAtTime(0.18, secondStart + 0.38);
        gainNode.gain.exponentialRampToValueAtTime(0.001, secondStart + 0.4);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.1);
        this.activeNodes.push({ osc, gainNode });
      } catch (err) {
        console.warn('[Ringback] Audio error:', err);
      }
    };

    playRingBurst();
    // 3 second cadence: burst (1.1s) + pause (1.9s)
    this.intervalId = setInterval(playRingBurst, 3000);
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.activeNodes.forEach(({ osc, gainNode }) => {
      try {
        osc.stop();
        gainNode.disconnect();
      } catch (e) {}
    });
    this.activeNodes = [];
  }
}

// Call Connected Chime (pleasant rising arpeggio)
export function playConnectedChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.15, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.25);
    });
  } catch (e) {}
}

// Call Disconnected Tone (descending double beep)
export function playDisconnectedTone() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [480, 420].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.16;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.14);
    });
  } catch (e) {}
}

// Incoming Call Ringtone (melodic repeating chime)
export class IncomingRingtonePlayer {
  constructor() {
    this.intervalId = null;
    this.isPlaying = false;
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    const ctx = getAudioContext();
    if (!ctx) return;

    const playMelody = () => {
      if (!this.isPlaying) return;
      try {
        const now = ctx.currentTime;
        const melody = [
          { f: 587.33, d: 0.15, o: 0 },    // D5
          { f: 880, d: 0.15, o: 0.15 },     // A5
          { f: 1174.66, d: 0.2, o: 0.3 },   // D6
          { f: 987.77, d: 0.35, o: 0.55 }   // B5
        ];

        melody.forEach(note => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + note.o;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(note.f, start);

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.exponentialRampToValueAtTime(0.22, start + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, start + note.d);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + note.d + 0.05);
        });
      } catch (err) {}
    };

    playMelody();
    this.intervalId = setInterval(playMelody, 2400);
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
