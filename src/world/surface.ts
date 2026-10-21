import type { Obstacle } from '../systems/types';

/** Obstáculos em cima dos quais dá para correr. */
export const isWalkable = (o: Obstacle): boolean =>
  !o.knocked && (o.kind === 'bus' || o.kind === 'stand' || o.kind === 'ramp' || o.kind === 'vehicle');

/** Altura do topo de um obstáculo caminhável no ponto z (rampas sobem linearmente). */
export function surfaceHeight(o: Obstacle, z: number): number {
  if (o.kind === 'ramp') return ((z - o.z) / o.length) * o.height;
  return o.height;
}

/**
 * Altura do chão numa faixa, considerando tetos e rampas. Buracos não entram aqui (são tratados como colisão).
 * `maxHeight` ignora superfícies acima desse valor: quem está ao lado de um ônibus não é "puxado" para o teto.
 */
export function groundAt(obstacles: readonly Obstacle[], lane: number, z: number, maxHeight = Infinity): number {
  let ground = 0;
  for (const o of obstacles) {
    if (o.lane !== lane || !isWalkable(o)) continue;
    if (z < o.z || z > o.z + o.length) continue;
    const h = surfaceHeight(o, z);
    if (h > ground && h <= maxHeight) ground = h;
  }
  return ground;
}
