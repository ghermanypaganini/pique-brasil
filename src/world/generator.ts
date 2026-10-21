import { BALANCE } from '../data/balance';
import { CHUNKS, type ChunkDef } from '../data/chunks';
import type { Lane, Obstacle, ObstacleKind, Pickup } from '../systems/types';
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

interface Ids {
  next: number;
}

function makeObstacle(ids: Ids, kind: ObstacleKind, lane: Lane, z: number): Obstacle {
  const base = { id: ids.next++, kind, lane, z, prevZ: z, speed: 0, hit: false, knocked: false };
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
  }
}

const OBSTACLE_CHARS: Record<string, ObstacleKind> = {
  L: 'low',
  H: 'high',
  B: 'bus',
  S: 'stand',
  V: 'vehicle',
  O: 'hole',
};

export interface ChunkOutput {
  obstacles: Obstacle[];
  pickups: Pickup[];
}

export interface BuildOptions {
  mirror: boolean;
  allowCase: boolean;
}

/** Transforma a definição de um trecho em obstáculos e coletáveis posicionados no mundo. */
export function buildChunk(def: ChunkDef, startZ: number, ids: Ids, opts: BuildOptions): ChunkOutput {
  const obstacles: Obstacle[] = [];
  const pickups: Pickup[] = [];
  const toLane = (i: number): Lane => (opts.mirror ? 2 - i : i) as Lane;

  // 1ª passada: obstáculos (os coletáveis precisam saber a altura do chão).
  for (const [dz, pattern] of def.rows) {
    for (let i = 0; i < 3; i++) {
      const ch = pattern[i];
      const lane = toLane(i);
      const z = startZ + dz;
      if (ch === 'R') {
        obstacles.push(makeObstacle(ids, 'ramp', lane, z));
        const roof = makeObstacle(ids, 'bus', lane, z + OB.ramp.length);
        roof.length = OB.roof.length;
        obstacles.push(roof);
      } else if (OBSTACLE_CHARS[ch]) {
        obstacles.push(makeObstacle(ids, OBSTACLE_CHARS[ch], lane, z));
      }
    }
  }

  const coinAt = (kind: Pickup['kind'], lane: Lane, z: number, lift = 0) => {
    pickups.push({ id: ids.next++, kind, lane, z, y: groundAt(obstacles, lane, z) + 0.9 + lift, taken: false });
  };

  let caseUsed = false;
  for (const [dz, pattern] of def.rows) {
    for (let i = 0; i < 3; i++) {
      const ch = pattern[i];
      const lane = toLane(i);
      const z = startZ + dz;
      if (ch === 'c') {
        for (let k = 0; k < 8; k++) coinAt('coin', lane, z + k * 1.6);
      } else if (ch === 'a') {
        for (let k = -2; k <= 2; k++) {
          const t = k / 2;
          coinAt('coin', lane, z + k * 1.3, 1.5 * (1 - t * t));
        }
      } else if (ch === 'n') {
        coinAt('bill', lane, z);
      } else if (ch === 'm') {
        if (opts.allowCase && !caseUsed) {
          coinAt('case', lane, z);
          caseUsed = true;
        } else {
          coinAt('bill', lane, z);
        }
      }
    }
  }

  return { obstacles, pickups };
}

/** Gera a pista à frente do jogador, trecho a trecho. */
export class TrackGenerator {
  nextZ: number;
  private ids: Ids = { next: 1 };
  private lastName = '';

  constructor(
    private rng: Rng,
    startZ = BALANCE.track.startClear,
  ) {
    this.nextZ = startZ;
  }

  /** Sorteia o próximo trecho. `allowCase` evita maletas em sequência. */
  next(allowCase: boolean): ChunkOutput & { def: ChunkDef } {
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
    const out = buildChunk(def, this.nextZ, this.ids, { mirror: this.rng() < 0.5, allowCase });
    this.nextZ += def.length;
    return { ...out, def };
  }
}
