/**
 * audio.js — Mahjong Sound Effects & Background Music
 * All audio synthesized via Web Audio API (no external files).
 */

let audioCtx = null;
let bgmGain = null;
let sfxGain = null;
let bgmPlaying = false;

/**
 * Initialize audio context (must be called after user gesture)
 */
export function initAudio() {
  const unlock = () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      sfxGain = audioCtx.createGain();
      sfxGain.gain.value = 0.4;
      sfxGain.connect(audioCtx.destination);
      bgmGain = audioCtx.createGain();
      bgmGain.gain.value = 0.12;
      bgmGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  };
  document.addEventListener('pointerdown', unlock, { once: false });
  document.addEventListener('touchstart', unlock, { once: false });
}

// ─── Helper: play a single tone ───
function playTone(freq, duration, type = 'sine', gainVal = 0.3, detune = 0) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// ─── Helper: filtered noise burst ───
function playNoiseBurst(duration = 0.08, filterFreq = 3000) {
  if (!audioCtx) return;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = 2;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  source.start();
}

// ═══════════════════════════════════════
//  SOUND EFFECTS
// ═══════════════════════════════════════

/**
 * Tile tap — crisp ceramic click (like placing a mahjong tile on table)
 */
export function playTapSound() {
  if (!audioCtx) return;
  // Sharp attack click
  playNoiseBurst(0.04, 4500);
  // Ceramic resonance
  playTone(1800, 0.06, 'sine', 0.15);
  playTone(3200, 0.03, 'sine', 0.08);
}

/**
 * Ring slide — smooth sliding sound when dragging a ring
 */
export function playSlideSound() {
  if (!audioCtx) return;
  // Low friction slide
  playNoiseBurst(0.12, 1200);
  playTone(300, 0.1, 'triangle', 0.08);
}

// ─── Continuous grinding/millstone sound ───
let grindNodes = null;

/**
 * Start grinding sound — stone millstone rotation feel
 * Plays continuously while ring is being dragged
 */
export function startGrindSound() {
  if (!audioCtx || grindNodes) return;

  // Long noise buffer (2 seconds, looping)
  const duration = 2;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  // Generate "gritty" noise — mix of random + low-freq modulation
  for (let i = 0; i < bufferSize; i++) {
    const t = i / audioCtx.sampleRate;
    const rumble = Math.sin(t * 40) * 0.3;  // low rumble
    const grit = (Math.random() * 2 - 1) * 0.4;  // gritty noise
    const crackle = Math.random() < 0.02 ? (Math.random() - 0.5) * 0.8 : 0; // random crackles
    data[i] = rumble + grit + crackle;
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Bandpass filter — stone grinding frequency range
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 350;
  filter.Q.value = 0.8;

  // Secondary low-pass for warmth
  const lpf = audioCtx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 1200;

  // Gain with fade-in
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.1);

  // Low rumble oscillator (stone vibration)
  const rumbleOsc = audioCtx.createOscillator();
  rumbleOsc.type = 'triangle';
  rumbleOsc.frequency.value = 60;
  const rumbleGain = audioCtx.createGain();
  rumbleGain.gain.value = 0.06;
  rumbleOsc.connect(rumbleGain);
  rumbleGain.connect(sfxGain);
  rumbleOsc.start();

  source.connect(filter);
  filter.connect(lpf);
  lpf.connect(gain);
  gain.connect(sfxGain);
  source.start();

  grindNodes = { source, filter, lpf, gain, rumbleOsc, rumbleGain };
}

/**
 * Stop grinding sound with fade-out
 */
export function stopGrindSound() {
  if (!grindNodes) return;
  const { source, gain, rumbleOsc, rumbleGain } = grindNodes;
  const t = audioCtx.currentTime;

  // Fade out
  gain.gain.setValueAtTime(gain.gain.value, t);
  gain.gain.linearRampToValueAtTime(0, t + 0.15);
  rumbleGain.gain.setValueAtTime(rumbleGain.gain.value, t);
  rumbleGain.gain.linearRampToValueAtTime(0, t + 0.15);

  // Stop after fade
  setTimeout(() => {
    try { source.stop(); } catch(e) {}
    try { rumbleOsc.stop(); } catch(e) {}
  }, 200);

  grindNodes = null;
}

/**
 * Column match — satisfying multi-tone chime cascade (mahjong win flourish)
 */
export function playMatchSound() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  // Pentatonic cascade (Japanese/Chinese feel)
  const notes = [523, 659, 784, 1047, 1319]; // C5, E5, G5, C6, E6
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t + i * 0.07);
    gain.gain.linearRampToValueAtTime(0.25, t + i * 0.07 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.4);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(t + i * 0.07);
    osc.stop(t + i * 0.07 + 0.5);
  });

  // Shimmer overlay
  playTone(2093, 0.6, 'sine', 0.06);  // C7 shimmer
  playTone(2637, 0.5, 'sine', 0.04);  // E7 shimmer
}

/**
 * Shuffle — cascading tumble (tiles being mixed on table)
 */
export function playShuffleSound() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  // Rapid clicking cascade (tiles tumbling)
  for (let i = 0; i < 12; i++) {
    const delay = i * 0.04 + Math.random() * 0.02;
    const freq = 800 + Math.random() * 2000;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.06, t + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.05);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(t + delay);
    osc.stop(t + delay + 0.06);
  }
  // Low rumble
  playTone(120, 0.5, 'triangle', 0.12);
}

/**
 * Column eliminate — deep resonant gong + sparkle
 */
export function playEliminateSound() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  // Deep gong
  const gong = audioCtx.createOscillator();
  const gongGain = audioCtx.createGain();
  gong.type = 'sine';
  gong.frequency.setValueAtTime(180, t);
  gong.frequency.exponentialRampToValueAtTime(80, t + 1.5);
  gongGain.gain.setValueAtTime(0.35, t);
  gongGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
  gong.connect(gongGain);
  gongGain.connect(sfxGain);
  gong.start(t);
  gong.stop(t + 1.6);

  // Metallic harmonics
  [360, 540, 720].forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.8 - i * 0.1);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(t);
    osc.stop(t + 1.0);
  });

  // Sparkle trail
  for (let i = 0; i < 6; i++) {
    const d = 0.05 + i * 0.06;
    playTone(2000 + i * 300, 0.15, 'sine', 0.05);
  }
}

// ═══════════════════════════════════════
//  BACKGROUND MUSIC
// ═══════════════════════════════════════

let bgmNodes = [];

/**
 * Start looping ambient BGM — gentle Japanese-inspired ambient
 * Uses layered oscillators: pentatonic pads + slow arpeggios
 */
export function startBGM() {
  if (!audioCtx || bgmPlaying) return;
  bgmPlaying = true;

  // ─── Pad layer: warm sustained chords ───
  const padNotes = [261.6, 329.6, 392.0, 523.3]; // C4, E4, G4, C5
  padNotes.forEach(freq => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.5;
    gain.gain.value = 0.025;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(bgmGain);
    osc.start();
    bgmNodes.push({ osc, gain });
  });

  // ─── Sub bass drone ───
  const sub = audioCtx.createOscillator();
  const subGain = audioCtx.createGain();
  sub.type = 'sine';
  sub.frequency.value = 65.4; // C2
  subGain.gain.value = 0.04;
  sub.connect(subGain);
  subGain.connect(bgmGain);
  sub.start();
  bgmNodes.push({ osc: sub, gain: subGain });

  // ─── Arpeggio layer: gentle pentatonic plucks ───
  const arpNotes = [523, 659, 784, 1047, 784, 659]; // C5 E5 G5 C6 G5 E5
  let arpIndex = 0;

  function scheduleArp() {
    if (!bgmPlaying) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime;
    osc.type = 'sine';
    osc.frequency.value = arpNotes[arpIndex % arpNotes.length];
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.03, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    osc.connect(gain);
    gain.connect(bgmGain);
    osc.start(t);
    osc.stop(t + 1.6);
    arpIndex++;
    // Schedule next note with some variation
    const interval = 1800 + Math.random() * 1200; // 1.8-3s between notes
    bgmTimer = setTimeout(scheduleArp, interval);
  }

  scheduleArp();
}

let bgmTimer = null;

/**
 * Stop BGM
 */
export function stopBGM() {
  bgmPlaying = false;
  if (bgmTimer) {
    clearTimeout(bgmTimer);
    bgmTimer = null;
  }
  bgmNodes.forEach(({ osc, gain }) => {
    try {
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {}
  });
  bgmNodes = [];
}

// ═══════════════════════════════════════
//  HAPTIC FEEDBACK
// ═══════════════════════════════════════

export function hapticTap() {
  if (navigator.vibrate) navigator.vibrate(15);
}

export function hapticMatch() {
  if (navigator.vibrate) navigator.vibrate([20, 50, 30]);
}
