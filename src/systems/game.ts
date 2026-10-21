import { BALANCE, laneX } from '../data/balance';
import { TrackGenerator, makeRng, type Rng } from '../world/generator';
import { groundAt } from '../world/surface';
import type {
  Action,
  Character,
  GameEvent,
  Lane,
  Obstacle,
  ObstacleKind,
  Phase,
  Pickup,
  StumbleKind,
} from './types';

const P = BALANCE.player;
const C = BALANCE.chase;
const S = BALANCE.stumble;

const isSolid = (k: ObstacleKind) => k === 'bus' || k === 'stand' || k === 'vehicle';

export interface PlayerState {
  lane: Lane;
  prevLane: Lane;
  fromX: number;
  laneT: number; // 0..1 progresso da troca de faixa
  x: number;
  y: number;
  vy: number;
  z: number;
  grounded: boolean;
  roll: number; // tempo restante de rolagem
  rollQueued: boolean;
  invuln: number;
  speedMul: number;
  speedRecover: number; // por segundo
  boost: number; // tempo restante de boost da maleta
  stumble: number; // tempo restante da animação de tropeço
  stumbleKind: StumbleKind | null;
}

export interface GameOptions {
  character: Character;
  bank: number; // moedas já guardadas (para pagar o "Continuar")
  seed?: number;
}

export class Game {
  readonly character: Character;
  phase: Phase = 'running';
  time = 0;
  readonly player: PlayerState;
  chase: number = C.start;
  obstacles: Obstacle[] = [];
  pickups: Pickup[] = [];
  events: GameEvent[] = [];

  bank: number;
  coins = 0; // saldo ganho nesta partida (pode ser gasto no "Continuar")
  collected = 0; // valor total coletado (para a pontuação; não diminui ao pagar)
  continuesUsed = 0;
  continueTimer = 0;

  lungeWarning = 0; // tempo restante do aviso
  lungeActive = 0; // tempo restante da investida
  private nextLungeAt: number = C.lunge.firstAfter;

  private buffer: { action: Action; age: number }[] = [];
  private lastStumbleAt = -Infinity;
  private lastCaseAt = -Infinity;
  private rng: Rng;
  private gen: TrackGenerator;

  constructor(opts: GameOptions) {
    this.character = opts.character;
    this.bank = opts.bank;
    this.rng = makeRng(opts.seed ?? (Math.random() * 2 ** 32) >>> 0);
    this.gen = new TrackGenerator(this.rng);
    this.player = {
      lane: 1,
      prevLane: 1,
      fromX: 0,
      laneT: 1,
      x: 0,
      y: 0,
      vy: 0,
      z: 0,
      grounded: true,
      roll: 0,
      rollQueued: false,
      invuln: 0,
      speedMul: 1,
      speedRecover: 0,
      boost: 0,
      stumble: 0,
      stumbleKind: null,
    };
    this.fillTrack();
  }

  // ── Leitura ─────────────────────────────────────────────────────

  get distance(): number {
    return this.player.z;
  }

  get score(): number {
    return Math.floor(this.distance) + this.collected;
  }

  get speed(): number {
    const base = Math.min(BALANCE.speed.max, BALANCE.speed.base + BALANCE.speed.perMeter * this.player.z);
    const boost = this.player.boost > 0 ? 1 + BALANCE.speed.caseBoost : 1;
    return base * this.player.speedMul * boost;
  }

  get playerHeight(): number {
    return this.player.roll > 0 ? P.rollHeight : P.height;
  }

  get continueCost(): number | null {
    const costs = BALANCE.continue.costs;
    return this.continuesUsed < costs.length ? costs[this.continuesUsed] : null;
  }

  get wallet(): number {
    return this.bank + this.coins;
  }

  get canAffordContinue(): boolean {
    const cost = this.continueCost;
    return cost !== null && this.wallet >= cost;
  }

  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  // ── Comandos ────────────────────────────────────────────────────

  input(action: Action): void {
    if (this.phase !== 'running') return;
    this.buffer.push({ action, age: 0 });
  }

  /** Descarta comandos em espera (ao pausar/continuar, para não executar um toque antigo). */
  clearInput(): void {
    this.buffer = [];
  }

  /** Faixa em que o jogador está de fato (pela posição x, não pelo destino da troca de faixa). */
  get currentLane(): Lane {
    return (Math.round(this.player.x / BALANCE.track.laneWidth) + 1) as Lane;
  }

  /** Chão sob o jogador: só superfícies que ele alcança (não "sobe" num teto ao lado). */
  get groundHeight(): number {
    return groundAt(this.obstacles, this.currentLane, this.player.z, this.player.y + P.stepUp);
  }

  /** Paga e continua. Retorna false se não puder. */
  continueRun(): boolean {
    const cost = this.continueCost;
    if (this.phase !== 'continue' || cost === null || this.wallet < cost) return false;
    const fromRun = Math.min(this.coins, cost);
    this.coins -= fromRun;
    this.bank -= cost - fromRun;
    this.continuesUsed++;

    const p = this.player;
    this.chase = BALANCE.continue.resetChase;
    p.invuln = BALANCE.continue.invulnTime;
    p.speedMul = 1;
    p.stumble = 0;
    p.stumbleKind = null;
    this.lungeActive = 0;
    this.lungeWarning = 0;
    this.nextLungeAt = this.time + C.lunge.intervalMin;
    this.clearInput();
    // Abre espaço à frente para recomeçar de forma justa.
    const clearTo = p.z + BALANCE.continue.clearAhead;
    this.obstacles = this.obstacles.filter((o) => o.z > clearTo || o.z + o.length < p.z - 1);
    this.phase = 'running';
    this.events.push({ type: 'continued' });
    return true;
  }

  giveUp(): void {
    if (this.phase === 'continue') this.phase = 'over';
  }

  // ── Simulação ───────────────────────────────────────────────────

  update(dt: number): void {
    if (this.phase === 'continue') {
      this.continueTimer -= dt;
      if (this.continueTimer <= 0) this.phase = 'over';
      return;
    }
    if (this.phase !== 'running') return;

    this.time += dt;
    const p = this.player;
    const prevZ = p.z;

    this.processInput(dt);

    // Avanço
    p.z += this.speed * dt;

    // Veículos vindo na direção do jogador
    for (const o of this.obstacles) {
      o.prevZ = o.z;
      if (o.speed > 0 && !o.knocked && o.z - p.z < BALANCE.obstacles.vehicle.activateDistance) {
        o.z -= o.speed * dt;
      }
    }

    // Troca de faixa (suavizada)
    if (p.laneT < 1) {
      p.laneT = Math.min(1, p.laneT + dt / P.laneChangeTime);
      const t = 1 - (1 - p.laneT) * (1 - p.laneT);
      p.x = p.fromX + (laneX(p.lane) - p.fromX) * t;
    }

    this.checkCollisions(prevZ);
    this.updateVertical(dt);
    this.collectPickups(prevZ);
    this.updateTimers(dt);
    this.updateChase(dt);
    this.fillTrack();
  }

  private processInput(dt: number): void {
    const p = this.player;
    const keep: typeof this.buffer = [];
    for (const b of this.buffer) {
      b.age += dt;
      let done = false;
      switch (b.action) {
        case 'left':
        case 'right':
          this.changeLane(b.action === 'left' ? -1 : 1);
          done = true;
          break;
        case 'jump':
          if (p.grounded) {
            p.vy = P.jumpVelocity;
            p.grounded = false;
            p.roll = 0;
            this.events.push({ type: 'jump' });
            done = true;
          }
          break;
        case 'roll':
          if (p.grounded) {
            p.roll = P.rollTime;
            this.events.push({ type: 'roll' });
          } else {
            p.vy = Math.min(p.vy, P.fastFallVelocity);
            p.rollQueued = true;
          }
          done = true;
          break;
      }
      if (!done && b.age < P.inputBuffer) keep.push(b);
    }
    this.buffer = keep;
  }

  private changeLane(dir: -1 | 1): void {
    const p = this.player;
    const target = p.lane + dir;
    if (target < 0 || target > 2) return;
    // Bater de lado num obstáculo grande: tropeço leve e fica na faixa.
    const blocker = this.solidAt(target as Lane, p.z - P.halfDepth, p.z + P.halfDepth);
    if (blocker && p.invuln <= 0) {
      blocker.hit = true;
      this.stumble('light', blocker.kind);
      return;
    }
    this.moveToLane(target as Lane);
  }

  /** Obstáculo sólido na faixa, no intervalo z, que bloqueia na altura atual do jogador. */
  private solidAt(lane: Lane, z0: number, z1: number): Obstacle | undefined {
    const y = this.player.y;
    return this.obstacles.find(
      (o) =>
        o.lane === lane &&
        isSolid(o.kind) &&
        !o.knocked &&
        y < o.height - P.stepUp &&
        z1 >= o.z &&
        z0 <= o.z + o.length,
    );
  }

  private checkCollisions(prevZ: number): void {
    const p = this.player;
    const lane = this.currentLane;
    const height = this.playerHeight;
    const back = prevZ - P.halfDepth;
    const front = p.z + P.halfDepth;

    for (const o of this.obstacles) {
      if (o.hit || o.knocked || o.lane !== lane) continue;
      if (front < o.z || back > o.z + o.length) continue;

      let kind: StumbleKind | null = null;
      switch (o.kind) {
        case 'low':
          if (p.y < o.height) kind = 'light';
          break;
        case 'high':
          if (p.y + height > BALANCE.obstacles.high.bottom && p.y < o.height) kind = 'light';
          break;
        case 'hole':
          if (p.y <= 0.05 && p.z >= o.z && p.z <= o.z + o.length) kind = 'strong';
          break;
        case 'bus':
        case 'stand':
        case 'vehicle': {
          if (p.y >= o.height - P.stepUp) break; // por cima
          // Frente: no passo anterior o jogador ainda não tinha alcançado o início do obstáculo.
          const wasBefore = prevZ + P.halfDepth <= o.prevZ + 0.01;
          kind = wasBefore ? 'strong' : 'light';
          break;
        }
        case 'ramp':
          break;
      }
      if (!kind) continue;

      o.hit = true;
      if (p.invuln > 0) {
        if (isSolid(o.kind)) o.knocked = true;
        continue;
      }

      if (isSolid(o.kind)) {
        if (kind === 'strong') {
          const free = this.findFreeLane(lane);
          if (free !== null) this.moveToLane(free);
          else o.knocked = true;
        } else {
          // Entrou de lado: volta para a faixa de onde veio (se ainda estiver trocando e ela estiver livre).
          const cameFrom = p.laneT < 1 && !this.solidAt(p.prevLane, p.z - 1, p.z + 1) ? p.prevLane : null;
          const back = cameFrom ?? this.findFreeLane(lane);
          if (back !== null) this.moveToLane(back);
          else o.knocked = true;
        }
      }
      this.stumble(kind, o.kind);
    }
  }

  private moveToLane(lane: Lane): void {
    const p = this.player;
    p.prevLane = p.lane;
    p.lane = lane;
    p.fromX = p.x;
    p.laneT = 0;
  }

  private findFreeLane(from: Lane): Lane | null {
    const p = this.player;
    const candidates = [from - 1, from + 1].filter((l) => l >= 0 && l <= 2) as Lane[];
    // Prefere a faixa mais próxima do centro quando ambas estiverem livres.
    candidates.sort((a, b) => Math.abs(a - 1) - Math.abs(b - 1));
    for (const l of candidates) {
      if (!this.solidAt(l, p.z - 1, p.z + 4)) return l;
    }
    return null;
  }

  private stumble(kind: StumbleKind, obstacle: ObstacleKind): void {
    const p = this.player;
    const cfg = S[kind];
    this.chase += cfg.chase;
    p.speedMul = Math.min(p.speedMul, cfg.speedMul);
    p.speedRecover = (1 - cfg.speedMul) / cfg.recover;
    p.invuln = S.invulnTime;
    p.roll = 0;
    p.stumble = kind === 'strong' ? 0.6 : 0.35;
    p.stumbleKind = kind;
    this.lastStumbleAt = this.time;
    this.events.push({ type: 'stumble', kind, obstacle });
  }

  private updateVertical(dt: number): void {
    const p = this.player;
    const ground = this.groundHeight;
    const wasGrounded = p.grounded;

    if (p.grounded && ground < p.y - 0.01) p.grounded = false; // saiu de um teto

    if (!p.grounded) {
      p.vy -= P.gravity * dt;
      p.y += p.vy * dt;
      if (p.y <= ground) {
        p.y = ground;
        p.vy = 0;
        p.grounded = true;
      }
    } else {
      p.y = ground; // acompanha rampas
    }

    if (p.grounded && !wasGrounded) {
      this.events.push({ type: 'land' });
      if (p.rollQueued) {
        p.roll = P.rollTime;
        this.events.push({ type: 'roll' });
      }
      p.rollQueued = false;
    }
  }

  private collectPickups(prevZ: number): void {
    const p = this.player;
    const lane = this.currentLane;
    const r = BALANCE.pickups.radius;
    const midY = p.y + this.playerHeight / 2;
    for (const k of this.pickups) {
      if (k.taken || k.lane !== lane) continue;
      if (k.z < prevZ - r || k.z > p.z + r) continue;
      if (Math.abs(k.y - midY) > 1.3) continue;
      k.taken = true;
      const cfg = BALANCE.pickups[k.kind];
      this.coins += cfg.value;
      this.collected += cfg.value;
      this.chase += cfg.chase;
      if (k.kind === 'case') {
        p.boost = BALANCE.speed.caseBoostTime;
        this.lungeActive = 0; // maleta escapa da investida
      }
      this.events.push({ type: 'pickup', kind: k.kind });
    }
  }

  private updateTimers(dt: number): void {
    const p = this.player;
    p.invuln = Math.max(0, p.invuln - dt);
    p.roll = Math.max(0, p.roll - dt);
    p.boost = Math.max(0, p.boost - dt);
    p.stumble = Math.max(0, p.stumble - dt);
    if (p.stumble === 0) p.stumbleKind = null;
    if (p.speedMul < 1) p.speedMul = Math.min(1, p.speedMul + p.speedRecover * dt);

    // Investidas da multidão
    if (this.lungeWarning > 0) {
      this.lungeWarning -= dt;
      if (this.lungeWarning <= 0) {
        this.lungeWarning = 0;
        this.lungeActive = C.lunge.duration;
        this.events.push({ type: 'lunge' });
      }
    } else if (this.lungeActive > 0) {
      this.lungeActive = Math.max(0, this.lungeActive - dt);
    } else if (this.time >= this.nextLungeAt) {
      this.lungeWarning = C.lunge.warning;
      this.nextLungeAt =
        this.time + C.lunge.warning + C.lunge.duration + C.lunge.intervalMin +
        this.rng() * (C.lunge.intervalMax - C.lunge.intervalMin);
      this.events.push({ type: 'lungeWarning' });
    }
  }

  private updateChase(dt: number): void {
    const p = this.player;
    if (this.time - this.lastStumbleAt > C.regenDelay && this.lungeActive === 0) {
      this.chase += C.regenPerSec * dt;
    }
    this.chase -= (1 - p.speedMul) * C.slowDrainPerSec * dt;
    if (p.boost > 0) this.chase += 3 * dt;
    if (this.lungeActive > 0) this.chase -= C.lunge.drainPerSec * dt;
    this.chase = Math.min(C.max, this.chase);

    if (this.chase <= 0) {
      this.chase = 0;
      this.phase = this.continueCost !== null ? 'continue' : 'over';
      this.continueTimer = BALANCE.continue.countdown;
      this.events.push({ type: 'caught' });
    }
  }

  private fillTrack(): void {
    const p = this.player;
    while (this.gen.nextZ < p.z + BALANCE.track.spawnAhead) {
      const allowCase = this.time - this.lastCaseAt >= BALANCE.pickups.caseMinInterval;
      const chunk = this.gen.next(allowCase);
      if (chunk.pickups.some((k) => k.kind === 'case')) this.lastCaseAt = this.time;
      this.obstacles.push(...chunk.obstacles);
      this.pickups.push(...chunk.pickups);
    }
    const minZ = p.z - BALANCE.track.despawnBehind;
    // Só recria os arrays quando há algo para descartar (evita lixo para o GC a cada passo).
    if (this.obstacles.some((o) => o.z + o.length < minZ)) {
      this.obstacles = this.obstacles.filter((o) => o.z + o.length >= minZ);
    }
    if (this.pickups.some((k) => k.taken || k.z < minZ)) {
      this.pickups = this.pickups.filter((k) => !k.taken && k.z >= minZ);
    }
  }
}

