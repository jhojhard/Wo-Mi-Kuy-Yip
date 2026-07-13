let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean) { enabled = v; }
export function getSoundEnabled() { return enabled; }

function ac() {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.22, delay = 0) {
  if (!enabled) return;
  try {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = type; o.frequency.value = freq;
    const t = c.currentTime + delay;
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  } catch { /* ignore */ }
}

function noise(dur: number, vol = 0.3, delay = 0) {
  if (!enabled) return;
  try {
    const c = ac();
    const sr = c.sampleRate;
    const buf = c.createBuffer(1, sr * dur, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource();
    const g = c.createGain();
    s.buffer = buf; s.connect(g); g.connect(c.destination);
    const t = c.currentTime + delay;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.start(t);
  } catch { /* ignore */ }
}

export const SFX = {
  click:       () => tone(440, 0.07, 'sine', 0.1),
  place:       () => { tone(350, 0.08, 'triangle', 0.18); tone(420, 0.06, 'triangle', 0.1, 0.06); },
  shield:      () => { tone(780, 0.15, 'sine', 0.15); tone(980, 0.1, 'sine', 0.1, 0.1); },
  bomb:        () => { noise(0.25, 0.35); tone(90, 0.2, 'sawtooth', 0.18, 0.03); },
  robo:        () => { tone(440, 0.08, 'sawtooth', 0.12); tone(330, 0.1, 'sawtooth', 0.1, 0.08); },
  intercambio: () => { tone(520, 0.1, 'sine', 0.15); tone(440, 0.1, 'sine', 0.15, 0.1); tone(520, 0.1, 'sine', 0.12, 0.2); },
  doble:       () => { tone(440, 0.07, 'triangle', 0.15); tone(550, 0.07, 'triangle', 0.15, 0.1); },
  earthquake:  () => { noise(0.5, 0.4); tone(70, 0.45, 'sawtooth', 0.22, 0.05); tone(90, 0.35, 'sawtooth', 0.15, 0.1); },
  turnExtra:   () => { tone(880, 0.1, 'sine', 0.15); tone(880, 0.1, 'sine', 0.12, 0.15); tone(1100, 0.12, 'sine', 0.1, 0.3); },
  powerupPick: () => { tone(550, 0.08, 'sine', 0.15); tone(660, 0.1, 'sine', 0.15, 0.08); },
  bonusCell:   () => { [660, 880, 1100].forEach((f, i) => tone(f, 0.12, 'sine', 0.15, i * 0.07)); },
  teleport:    () => { [880, 1320, 660, 990].forEach((f, i) => tone(f, 0.1, 'sine', 0.12, i * 0.06)); },
  drop:        () => { tone(660, 0.12, 'sine', 0.14); tone(770, 0.12, 'sine', 0.14, 0.1); tone(880, 0.15, 'sine', 0.12, 0.2); },
  victory:     () => { [262, 330, 392, 523, 659].forEach((f, i) => tone(f, 0.28, 'sine', 0.22, i * 0.11)); },
  draw:        () => { tone(330, 0.2, 'triangle', 0.12); tone(220, 0.4, 'sawtooth', 0.08, 0.15); },
  boss:        () => { [110, 220, 165, 110, 220].forEach((f, i) => tone(f, 0.18, 'sawtooth', 0.22, i * 0.13)); },
  levelUp:     () => { [392, 494, 587, 740, 784].forEach((f, i) => tone(f, 0.2, 'sine', 0.25, i * 0.09)); },
  bossHit:     () => { noise(0.15, 0.4); tone(150, 0.3, 'sawtooth', 0.2, 0.05); [440, 330, 220].forEach((f, i) => tone(f, 0.15, 'sine', 0.15, 0.1 + i * 0.1)); },
};
