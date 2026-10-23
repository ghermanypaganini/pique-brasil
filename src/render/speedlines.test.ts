import { describe, expect, it } from 'vitest';
import { BALANCE } from '../data/balance';
import { SpeedLines } from './speedlines';

const zs = (s: SpeedLines) => s.positions.map((v) => v.z);
const xs = (s: SpeedLines) => s.positions.map((v) => Math.abs(v.x));

describe('linhas de velocidade', () => {
  it('voltam para perto do jogador quando uma nova partida começa', () => {
    const s = new SpeedLines();
    for (let z = 0; z <= 3000; z += 5) s.update(z, 1);
    s.reset(0);
    expect(Math.max(...zs(s))).toBeLessThanOrEqual(60);
    expect(Math.min(...zs(s))).toBeGreaterThanOrEqual(0);
  });

  it('continuam sendo recicladas com o efeito escondido (sem "parede" ao reaparecer)', () => {
    const s = new SpeedLines();
    for (let z = 0; z <= 500; z += 2) s.update(z, 0);
    expect(s.root.visible).toBe(false);
    expect(zs(s).every((z) => z >= 500 - 8)).toBe(true);
  });

  it('ficam sempre fora da pista', () => {
    const s = new SpeedLines();
    for (let z = 0; z <= 1000; z += 3) s.update(z, 1);
    expect(Math.min(...xs(s))).toBeGreaterThan(BALANCE.track.laneWidth * 1.5);
  });
});
