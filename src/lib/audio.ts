import type { ShatterMode } from '../App';

let _ctx: AudioContext | null = null;
let _master: GainNode | null = null;

let _ambientGain: GainNode | null = null;
let _ambientSources: (OscillatorNode | AudioBufferSourceNode)[] = [];

let _chargeOsc: OscillatorNode | null = null;
let _chargeLfo: OscillatorNode | null = null;
let _chargeGain: GainNode | null = null;

function getCtx(): AudioContext {
  if (!_ctx) {
    _ctx = new AudioContext();
    _master = _ctx.createGain();
    _master.gain.value = 0.65;
    _master.connect(_ctx.destination);
  }
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
  return _ctx;
}

function master(): GainNode {
  getCtx();
  return _master!;
}

const MODE_FREQ: Record<ShatterMode, number> = {
  default: 220,
  fire:    280,
  mirror:  440,
  slowmo:  140,
  vortex:  350,
  glitch:  880,
};

export function playUIClick() {
  try {
    const c = getCtx();
    const len = Math.floor(c.sampleRate * 0.01);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 5) * 0.06;
    const src = c.createBufferSource(); src.buffer = buf;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    src.connect(hp); hp.connect(master()); src.start();
  } catch { /* silence */ }
}

export function playTypeClick(mode: ShatterMode = 'default') {
  try {
    const c = getCtx();
    const baseFreq = MODE_FREQ[mode] * 2;
    const len = Math.floor(c.sampleRate * 0.008);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4) * 0.048;
    }
    const src = c.createBufferSource(); src.buffer = buf;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = baseFreq * 0.8;
    const g = c.createGain(); g.gain.value = 0.9;
    src.connect(hp); hp.connect(g); g.connect(master()); src.start();
  } catch { /* silence */ }
}

export function playModeSelect(mode: ShatterMode) {
  try {
    const c = getCtx();
    const freq = MODE_FREQ[mode];
    const now = c.currentTime;
    const type: OscillatorType = mode === 'glitch' ? 'square' : mode === 'mirror' ? 'sine' : 'triangle';
    const osc = c.createOscillator(); osc.type = type;
    osc.frequency.setValueAtTime(freq * 0.75, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.12);
    const g = c.createGain();
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(g); g.connect(master());
    osc.start(now); osc.stop(now + 0.32);
  } catch { /* silence */ }
}

export function playModeUnlock(mode: ShatterMode) {
  try {
    const c = getCtx();
    const freq = MODE_FREQ[mode];
    const now = c.currentTime;
    const osc = c.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.5, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 2.5, now + 0.5);
    const g = c.createGain();
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc.connect(g); g.connect(master());
    osc.start(now); osc.stop(now + 0.95);
    const blen = Math.floor(c.sampleRate * 0.25);
    const nbuf = c.createBuffer(1, blen, c.sampleRate);
    const nd = nbuf.getChannelData(0);
    for (let i = 0; i < blen; i++) nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / blen, 1.5) * 0.08;
    const nsrc = c.createBufferSource(); nsrc.buffer = nbuf;
    const nhp = c.createBiquadFilter(); nhp.type = 'highpass'; nhp.frequency.value = 2500;
    nsrc.connect(nhp); nhp.connect(master()); nsrc.start(now + 0.2);
  } catch { /* silence */ }
}

export function startCharge(mode: ShatterMode) {
  try {
    stopCharge();
    const c = getCtx();
    const baseFreq = MODE_FREQ[mode] * 0.45;
    _chargeOsc = c.createOscillator();
    _chargeOsc.type = mode === 'glitch' ? 'sawtooth' : mode === 'fire' ? 'triangle' : 'sine';
    _chargeOsc.frequency.value = baseFreq;
    _chargeGain = c.createGain();
    _chargeGain.gain.value = 0;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = baseFreq * 3;
    filter.Q.value = 4;
    _chargeLfo = c.createOscillator();
    _chargeLfo.frequency.value = 5;
    const lfoG = c.createGain(); lfoG.gain.value = 0.003;
    _chargeLfo.connect(lfoG);
    lfoG.connect(_chargeGain.gain);
    _chargeLfo.start();
    _chargeOsc.connect(filter);
    filter.connect(_chargeGain);
    _chargeGain.connect(master());
    _chargeOsc.start();
  } catch { /* silence */ }
}

export function updateCharge(pct: number, mode: ShatterMode) {
  try {
    if (!_chargeOsc || !_chargeGain) return;
    const c = getCtx();
    const baseFreq = MODE_FREQ[mode] * 0.45;
    const t = pct / 100;
    _chargeOsc.frequency.setTargetAtTime(baseFreq * (1 + t * 2.2), c.currentTime, 0.08);
    _chargeGain.gain.setTargetAtTime(Math.min(t * 0.055, 0.055), c.currentTime, 0.05);
    if (_chargeLfo) _chargeLfo.frequency.setTargetAtTime(3 + t * 12, c.currentTime, 0.1);
  } catch { /* silence */ }
}

export function stopCharge() {
  try {
    if (_chargeOsc) { try { _chargeOsc.stop(); } catch { } _chargeOsc.disconnect(); _chargeOsc = null; }
    if (_chargeLfo) { try { _chargeLfo.stop(); } catch { } _chargeLfo.disconnect(); _chargeLfo = null; }
    if (_chargeGain) { _chargeGain.disconnect(); _chargeGain = null; }
  } catch { /* silence */ }
}

export function playAchievement() {
  try {
    const c = getCtx();
    const now = c.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
      const g = c.createGain(); const t = now + i * 0.1;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g); g.connect(master()); osc.start(t); osc.stop(t + 0.55);
    });
  } catch { /* silence */ }
}

export function playLevelUp() {
  try {
    const c = getCtx();
    const now = c.currentTime;
    [261.63, 329.63, 392, 523.25, 659.25, 784].forEach((freq, i) => {
      const osc = c.createOscillator(); osc.type = 'triangle'; osc.frequency.value = freq;
      const g = c.createGain(); const t = now + i * 0.08;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(g); g.connect(master()); osc.start(t); osc.stop(t + 0.65);
    });
  } catch { /* silence */ }
}

export function playQuestComplete() {
  try {
    const c = getCtx();
    const now = c.currentTime;
    [440, 554.37, 659.25].forEach((freq, i) => {
      const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
      const g = c.createGain(); const t = now + i * 0.09;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.15, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(g); g.connect(master()); osc.start(t); osc.stop(t + 0.5);
    });
  } catch { /* silence */ }
}

export function playXPGain() {
  try {
    const c = getCtx();
    const now = c.currentTime;
    const osc = c.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.exponentialRampToValueAtTime(495, now + 0.08);
    const g = c.createGain();
    g.gain.setValueAtTime(0.1, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(g); g.connect(master()); osc.start(now); osc.stop(now + 0.25);
  } catch { /* silence */ }
}

export function startAmbient(mode: ShatterMode) {
  try {
    stopAmbient();
    const c = getCtx();
    const masterG = c.createGain();
    masterG.gain.value = 0;
    masterG.connect(master());
    _ambientGain = masterG;

    const makeOsc = (freq: number, type: OscillatorType, gain: number, detune = 0) => {
      const osc = c.createOscillator(); osc.type = type;
      osc.frequency.value = freq; osc.detune.value = detune;
      const g = c.createGain(); g.gain.value = gain;
      osc.connect(g); g.connect(masterG); osc.start();
      _ambientSources.push(osc);
    };

    const makeNoise = (gainVal: number, hpFreq = 100, lpFreq = 4000) => {
      const blen = Math.floor(c.sampleRate * 1.5);
      const buf = c.createBuffer(1, blen, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < blen; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = hpFreq;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lpFreq;
      const g = c.createGain(); g.gain.value = gainVal;
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(masterG); src.start();
      _ambientSources.push(src);
    };

    switch (mode) {
      case 'default':
        makeNoise(0.018, 80, 600);
        makeOsc(55, 'sine', 0.03);
        makeOsc(110, 'sine', 0.012, 3);
        break;
      case 'fire':
        makeNoise(0.035, 200, 1200);
        makeOsc(60, 'sawtooth', 0.012);
        makeOsc(90, 'sine', 0.018, 7);
        break;
      case 'mirror':
        makeOsc(220, 'sine', 0.025);
        makeOsc(440, 'sine', 0.012, 4);
        makeOsc(880, 'sine', 0.006, -3);
        makeNoise(0.005, 2000, 6000);
        break;
      case 'slowmo':
        makeOsc(40, 'sine', 0.04);
        makeOsc(80, 'sine', 0.02, -5);
        makeNoise(0.008, 800, 2000);
        break;
      case 'vortex':
        makeOsc(70, 'sine', 0.035);
        makeOsc(105, 'sine', 0.018, 8);
        makeOsc(140, 'sine', 0.01, -6);
        makeNoise(0.015, 400, 1500);
        break;
      case 'glitch':
        makeNoise(0.012, 1500, 8000);
        makeOsc(440, 'square', 0.006);
        makeOsc(220, 'square', 0.004);
        break;
    }

    const now = c.currentTime;
    masterG.gain.setValueAtTime(0, now);
    masterG.gain.linearRampToValueAtTime(0.28, now + 2.5);
  } catch { /* silence */ }
}

export function stopAmbient() {
  try {
    if (_ambientGain) {
      const c = getCtx();
      const now = c.currentTime;
      _ambientGain.gain.setValueAtTime(_ambientGain.gain.value, now);
      _ambientGain.gain.linearRampToValueAtTime(0, now + 1.0);
      const g = _ambientGain; _ambientGain = null;
      setTimeout(() => { try { g.disconnect(); } catch { /* */ } }, 1500);
    }
    const srcs = _ambientSources; _ambientSources = [];
    setTimeout(() => {
      srcs.forEach(n => {
        try {
          if (n instanceof OscillatorNode || n instanceof AudioBufferSourceNode) n.stop();
          n.disconnect();
        } catch { /* already stopped */ }
      });
    }, 1200);
  } catch { /* silence */ }
}
