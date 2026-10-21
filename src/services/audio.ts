// Áudio sintetizado com Web Audio (sem arquivos para baixar): efeitos, multidão e trilha de samba.
// Três canais com volume próprio (acessibilidade, PRD 9.4): música, efeitos e multidão.

export type Sfx =
  | 'coin'
  | 'bill'
  | 'case'
  | 'jump'
  | 'roll'
  | 'stumbleLight'
  | 'stumbleStrong'
  | 'power'
  | 'shield'
  | 'cuca'
  | 'vorcano'
  | 'caught'
  | 'continue'
  | 'click';

const BPM = 104;
const STEP = 60 / BPM / 4; // semicolcheia
// Progressão I–vi–ii–V em Dó (cavaquinho), um acorde por compasso.
const CHORDS = [
  [261.6, 329.6, 392.0],
  [220.0, 261.6, 329.6],
  [293.7, 349.2, 440.0],
  [196.0, 246.9, 293.7],
];
const BASS = [65.4, 55.0, 73.4, 49.0];
const TAMBORIM = 'x.xx.x.xx.x.x.x.';
const AGOGO = 'h...l...h.h.l...';
const CAVACO = '..x...x...x.x.x.';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private crowdBus!: GainNode;
  private musicFilter!: BiquadFilterNode;
  private crowdGain!: GainNode;
  private noise!: AudioBuffer;
  private volumes = { music: 0.6, sfx: 0.8, crowd: 0.7 };

  private musicOn = false;
  private nextStepTime = 0;
  private step = 0;
  private timer: number | null = null;
  private intensity = 0; // 0..1: quão perto está a multidão
  private lastShout = 0;

  /** Precisa ser chamado num gesto do usuário (toque/clique/tecla): navegadores bloqueiam áudio antes disso. */
  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      this.musicFilter = ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 2400;
      this.musicBus = ctx.createGain();
      this.musicBus.connect(this.musicFilter).connect(this.master);
      this.sfxBus = ctx.createGain();
      this.sfxBus.connect(this.master);
      this.crowdBus = ctx.createGain();
      this.crowdBus.connect(this.master);
      this.noise = this.makeNoise();
      this.startCrowdLoop();
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setVolumes(music: number, sfx: number, crowd: number): void {
    this.volumes = { music, sfx, crowd };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(this.volumes.music * 0.5, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx * 0.7, t, 0.05);
    this.crowdBus.gain.setTargetAtTime(this.volumes.crowd, t, 0.05);
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  // ── Multidão ────────────────────────────────────────────────────

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private startCrowdLoop(): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 700;
    band.Q.value = 0.8;
    this.crowdGain = ctx.createGain();
    this.crowdGain.gain.value = 0;
    src.connect(band).connect(this.crowdGain).connect(this.crowdBus);
    src.start();
  }

  /** 0 = multidão longe (silêncio), 1 = colada no jogador. Chamado a cada quadro. */
  setCrowd(intensity: number): void {
    this.intensity = Math.max(0, Math.min(1, intensity));
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.crowdGain.gain.setTargetAtTime(this.intensity * 0.35, t, 0.15);
    this.musicFilter.frequency.setTargetAtTime(2400 + this.intensity * 6000, t, 0.3);
    // Apitos e vuvuzela de vez em quando quando estão perto.
    if (this.intensity > 0.45 && t - this.lastShout > 1.2 && Math.random() < 0.04) {
      this.lastShout = t;
      if (Math.random() < 0.5) this.whistle(t);
      else this.vuvuzela(t);
    }
  }

  private whistle(t: number): void {
    const o = this.osc('sine', 2900, t, 0.35, this.crowdBus, 0.08);
    o.frequency.setValueAtTime(2900, t);
    o.frequency.setValueAtTime(3300, t + 0.12);
    o.frequency.setValueAtTime(2900, t + 0.24);
  }

  private vuvuzela(t: number): void {
    this.osc('sawtooth', 233, t, 0.7, this.crowdBus, 0.05);
  }

  // ── Síntese básica ───────────────────────────────────────────────

  private osc(type: OscillatorType, freq: number, t: number, dur: number, out: AudioNode, vol = 0.2): OscillatorNode {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  private noiseBurst(t: number, dur: number, out: AudioNode, vol: number, filter: BiquadFilterType, freq: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  // ── Efeitos ─────────────────────────────────────────────────────

  play(name: Sfx): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const out = this.sfxBus;
    switch (name) {
      case 'coin':
        this.osc('square', 988, t, 0.08, out, 0.08);
        this.osc('square', 1319, t + 0.06, 0.12, out, 0.08);
        break;
      case 'bill':
        this.noiseBurst(t, 0.15, out, 0.25, 'highpass', 3000);
        this.osc('triangle', 1568, t + 0.03, 0.12, out, 0.1);
        break;
      case 'case':
        // Caixa registradora: "trim" de sino + gaveta
        this.noiseBurst(t, 0.12, out, 0.3, 'bandpass', 1500);
        for (const [i, f] of [1568, 2093, 2637].entries()) this.osc('sine', f, t + 0.08 + i * 0.05, 0.5, out, 0.12);
        break;
      case 'jump': {
        const o = this.osc('sine', 300, t, 0.2, out, 0.15);
        o.frequency.exponentialRampToValueAtTime(700, t + 0.15);
        break;
      }
      case 'roll':
        this.noiseBurst(t, 0.3, out, 0.25, 'lowpass', 800);
        break;
      case 'stumbleLight': {
        this.noiseBurst(t, 0.12, out, 0.35, 'lowpass', 400);
        const o = this.osc('triangle', 220, t, 0.25, out, 0.15);
        o.frequency.exponentialRampToValueAtTime(110, t + 0.25);
        break;
      }
      case 'stumbleStrong': {
        this.noiseBurst(t, 0.3, out, 0.5, 'lowpass', 300);
        const o = this.osc('square', 180, t + 0.05, 0.45, out, 0.12);
        o.frequency.exponentialRampToValueAtTime(60, t + 0.5); // "boing" descendo
        break;
      }
      case 'power':
        for (const [i, f] of [523, 659, 784, 1047].entries()) this.osc('square', f, t + i * 0.07, 0.15, out, 0.08);
        break;
      case 'shield':
        this.osc('sine', 1760, t, 0.5, out, 0.12);
        this.osc('sine', 2637, t + 0.05, 0.5, out, 0.08);
        break;
      case 'cuca':
        // Risada da Cuca: "rá-rá-rá" descendo
        for (let i = 0; i < 4; i++) {
          const o = this.osc('sawtooth', 420 - i * 50, t + i * 0.16, 0.13, out, 0.08);
          o.frequency.exponentialRampToValueAtTime(300 - i * 40, t + i * 0.16 + 0.12);
        }
        break;
      case 'vorcano':
        // Buzina do carro-forte
        this.osc('square', 311, t, 0.35, out, 0.06);
        this.osc('square', 370, t, 0.35, out, 0.06);
        this.osc('square', 311, t + 0.45, 0.5, out, 0.06);
        this.osc('square', 370, t + 0.45, 0.5, out, 0.06);
        break;
      case 'caught': {
        const o = this.osc('sawtooth', 440, t, 0.9, out, 0.1);
        o.frequency.exponentialRampToValueAtTime(110, t + 0.9);
        this.noiseBurst(t, 0.8, this.crowdBus, 0.4, 'bandpass', 700);
        break;
      }
      case 'continue':
        for (const [i, f] of [392, 523, 659].entries()) this.osc('triangle', f, t + i * 0.08, 0.2, out, 0.12);
        break;
      case 'click':
        this.osc('square', 1200, t, 0.04, out, 0.05);
        break;
    }
  }

  // ── Trilha de samba ──────────────────────────────────────────────

  startMusic(): void {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stopMusic(): void {
    this.musicOn = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    while (this.nextStepTime < ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextStepTime);
      this.nextStepTime += STEP;
      this.step++;
    }
  }

  private playStep(step: number, t: number): void {
    const out = this.musicBus;
    const s = step % 16;
    const bar = Math.floor(step / 16) % 4;
    // Surdo: marcação forte no 2º tempo, leve no 1º
    if (s === 0 || s === 8) {
      const o = this.osc('sine', s === 8 ? 62 : 70, t, 0.45, out, s === 8 ? 0.5 : 0.25);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.4);
    }
    if (s % 4 === 0) this.osc('triangle', BASS[bar], t, 0.3, out, 0.12);
    if (TAMBORIM[s] === 'x') this.noiseBurst(t, 0.05, out, 0.18, 'highpass', 5000);
    const ag = AGOGO[s];
    if (ag !== '.') this.osc('square', ag === 'h' ? 1046 : 784, t, 0.12, out, 0.035);
    if (CAVACO[s] === 'x') for (const f of CHORDS[bar]) this.osc('triangle', f * 2, t, 0.14, out, 0.03);
    // Mais tensão: chocalho em todas as semicolcheias quando a multidão está perto
    if (this.intensity > 0.5) this.noiseBurst(t, 0.03, out, 0.08 * this.intensity, 'highpass', 7000);
  }
}

export const audio = new AudioEngine();
