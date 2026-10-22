import { BALANCE, laneX } from '../data/balance';
import { CHUNKS, type ChunkDef } from '../data/chunks';
import type { Lane, Obstacle, ObstacleKind, ObstacleVariant, Pickup, PickupKind, PowerKind } from '../systems/types';
import { groundAt } from './surface';

export type Rng = () => number;

/** PRNG determinístico (mulberry32) — facilita testes e replays. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const tierForDistance = (distance: number): 0 | 1 | 2 =>
  distance < 400 ? 0 : distance < 1400 ? 1 : 2;

const OB = BALANCE.obstacles;

export interface Ids {
  next: number;
}

export function makeObstacle(
  ids: Ids,
  kind: ObstacleKind,
  lane: Lane,
  z: number,
  variant: ObstacleVariant = null,
): Obstacle {
  const base = {
    id: ids.next++,
    kind,
    variant,
    lane,
    x: laneX(lane),
    z,
    prevZ: z,
    speed: 0,
    dir: 1,
    timer: 0,
    hit: false,
    knocked: false,
  };
  switch (kind) {
    case 'low':
      return { ...base, length: OB.low.length, height: OB.low.height };
    case 'high':
      return { ...base, length: OB.high.length, height: OB.high.top };
    case 'bus':
      return { ...base, length: OB.bus.length, height: OB.bus.height };
    case 'stand':
      return { ...base, length: OB.stand.length, height: OB.stand.height };
    case 'ramp':
      return { ...base, length: OB.ramp.length, height: OB.ramp.height };
    case 'vehicle':
      return { ...base, length: OB.vehicle.length, height: OB.vehicle.height, speed: OB.vehicle.speed };
    case 'hole':
      return { ...base, length: OB.hole.length, height: 0 };
    case 'boi':
      // Começa andando em direção ao centro da pista.
      return { ...base, length: OB.boi.length, height: OB.boi.height, dir: laneX(lane) > 0 ? -1 : 1 };
    case 'drunk':
      return { ...base, length: OB.drunk.length, height: OB.drunk.height, speed: OB.drunk.speed, dir: lane };
    case 'tape':
      return { ...base, length: BALANCE.careca.tapeLength, height: BALANCE.careca.tapeHeight };
  }
}

const OBSTACLE_CHARS: Record<string, ObstacleKind> = {
  L: 'low',
  H: 'high',
  B: 'bus',
  S: 'stand',
  V: 'vehicle',
  O: 'hole',
  X: 'boi',
  D: 'drunk',
};

export interface ChunkOutput {
  obstacles: Obstacle[];
  pickups: Pickup[];
}

export interface BuildOptions {
  mirror: boolean;
  allowCase: boolean;
  /** Power-up a colocar no lugar de 'p' (null: vira nota). */
  power: PowerKind | null;
  rng?: Rng;
}

/** Transforma a definição de um trecho em obstáculos e coletáveis posicionados no mundo. */
export function buildChunk(def: ChunkDef, startZ: number, ids: Ids, opts: BuildOptions): ChunkOutput {
  const obstacles: Obstacle[] = [];
  const pickups: Pickup[] = [];
  const rng = opts.rng ?? Math.random;
  const toLane = (i: number): Lane => (opts.mirror ? 2 - i : i) as Lane;

  // 1ª passada: obstáculos (os coletáveis precisam saber a altura do chão).
  for (const [dz, pattern] of def.rows) {
    for (let i = 0; i < 3; i++) {
      const ch = pattern[i];
      const lane = toLane(i);
      const z = startZ + dz;
      if (ch === 'R') {
        obstacles.push(makeObstacle(ids, 'ramp', lane, z));
        const roof = makeObstacle(ids, 'bus', lane, z + OB.ramp.length, 'roof');
        roof.length = OB.roof.length;
        obstacles.push(roof);
      } else if (ch === 'L') {
        obstacles.push(makeObstacle(ids, 'low', lane, z, rng() < OB.policeChance ? 'police' : 'cavalete'));
      } else if (ch === 'H') {
        obstacles.push(makeObstacle(ids, 'high', lane, z, rng() < OB.olindaChance ? 'olinda' : 'faixa'));
      } else if (OBSTACLE_CHARS[ch]) {
        obstacles.push(makeObstacle(ids, OBSTACLE_CHARS[ch], lane, z));
      }
    }
  }

  const put = (kind: PickupKind, lane: Lane, z: number, lift = 0) => {
    pickups.push({ id: ids.next++, kind, lane, z, y: groundAt(obstacles, lane, z) + 0.9 + lift, taken: false });
  };

  let caseUsed = false;
  let powerUsed = false;
  for (const [dz, pattern] of def.rows) {
    for (let i = 0; i < 3; i++) {
      const ch = pattern[i];
      const lane = toLane(i);
      const z = startZ + dz;
      if (ch === 'c') {
        for (let k = 0; k < 8; k++) put('coin', lane, z + k * 1.6);
      } else if (ch === 'a') {
        for (let k = -2; k <= 2; k++) {
          const t = k / 2;
          put('coin', lane, z + k * 1.3, 1.5 * (1 - t * t));
        }
      } else if (ch === 'n') {
        put('bill', lane, z);
      } else if (ch === 'm') {
        if (opts.allowCase && !caseUsed) {
          put('case', lane, z);
          caseUsed = true;
        } else {
          put('bill', lane, z);
        }
      } else if (ch === 'p') {
        if (opts.power && !powerUsed) {
          put(opts.power, lane, z, 0.2);
          powerUsed = true;
        } else {
          put('bill', lane, z);
        }
      }
    }
  }

  return { obstacles, pickups };
}

export function pickPower(rng: Rng): PowerKind {
  const entries = Object.entries(BALANCE.powerups.weights) as [PowerKind, number][];
  let r = rng() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [kind, w] of entries) {
    r -= w;
    if (r < 0) return kind;
  }
  return entries[entries.length - 1][0];
}

/** Gera a pista à frente do jogador, trecho a trecho. */
export class TrackGenerator {
  nextZ: number;
  readonly ids: Ids = { next: 1 };
  private lastName = '';

  constructor(
    private rng: Rng,
    startZ = BALANCE.track.startClear,
  ) {
    this.nextZ = startZ;
  }

  /** Sorteia o próximo trecho. `allowCase`/`allowPower` evitam maletas e power-ups em sequência. */
  next(allowCase: boolean, allowPower: boolean): ChunkOutput & { def: ChunkDef } {
    const tier = tierForDistance(this.nextZ);
    // Trechos do nível atual têm peso maior; níveis anteriores continuam aparecendo.
    const pool = CHUNKS.filter((c) => c.tier <= tier && c.name !== this.lastName);
    const weights = pool.map((c) => (c.tier === tier ? 3 : 1));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.rng() * total;
    let def = pool[0];
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        def = pool[i];
        break;
      }
    }
    this.lastName = def.name;
    const out = buildChunk(def, this.nextZ, this.ids, {
      mirror: this.rng() < 0.5,
      allowCase,
      power: allowPower ? pickPower(this.rng) : null,
      rng: this.rng,
    });
    this.nextZ += def.length;
    return { ...out, def };
  }
}
