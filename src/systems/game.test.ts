import { describe, expect, it } from 'vitest';
import { BALANCE, laneX } from '../data/balance';
import { CHUNKS } from '../data/chunks';
import { buildChunk, makeObstacle } from '../world/generator';
import { Game } from './game';
import type { Obstacle, ObstacleKind } from './types';

const DT = 1 / 60;

function emptyGame(): Game {
  const g = new Game({ character: 'lule', bank: 0, seed: 1 });
  g.obstacles = [];
  g.pickups = [];
  // Empurra o gerador para longe para os testes controlarem a pista.
  (g as unknown as { gen: { nextZ: number } }).gen.nextZ = 1e9;
  return g;
}

const nextId = { next: 1000 };
function obstacle(kind: ObstacleKind, lane: 0 | 1 | 2, z: number, extra: Partial<Obstacle> = {}): Obstacle {
  return { ...makeObstacle(nextId, kind, lane, z), ...extra };
}

function run(g: Game, seconds: number) {
  for (let t = 0; t < seconds; t += DT) g.update(DT);
}

describe('trechos de pista', () => {
  it('todo trecho, espelhado ou não, deixa pelo menos uma faixa passável em qualquer ponto', () => {
    for (const def of CHUNKS) {
      for (const mirror of [false, true]) {
        const { obstacles } = buildChunk(def, 0, { next: 1 }, { mirror, allowCase: true, power: 'saci' });
        const blocking = obstacles.filter((o) => o.kind === 'bus' || o.kind === 'stand' || o.kind === 'vehicle');
        for (let z = 0; z < def.length; z += 0.25) {
          const blocked = new Set(
            blocking
              .filter((o) => z >= o.z && z <= o.z + o.length)
              // Teto alcançado por rampa na mesma faixa conta como passável.
              .filter((o) => !obstacles.some((r) => r.kind === 'ramp' && r.lane === o.lane && Math.abs(r.z + r.length - o.z) < 0.01))
              .map((o) => o.lane),
          );
          expect(blocked.size, `${def.name} (mirror=${mirror}) em z=${z}`).toBeLessThan(3);
        }
      }
    }
  });

  it('moedas sobre o telhado ficam na altura do telhado', () => {
    const def = CHUNKS.find((c) => c.name === 'rampa-telhado')!;
    const { pickups } = buildChunk(def, 0, { next: 1 }, { mirror: false, allowCase: true, power: null });
    const onCase = pickups.find((k) => k.kind === 'case')!;
    expect(onCase.y).toBeGreaterThan(BALANCE.obstacles.bus.height);
  });
});

describe('jogo', () => {
  it('corre sozinho sem travar e gera pista', () => {
    const g = new Game({ character: 'bolsonero', bank: 0, seed: 42 });
    run(g, 5);
    expect(g.distance).toBeGreaterThan(50);
    expect(g.obstacles.length).toBeGreaterThan(0);
  });

  it('pular evita a barreira baixa', () => {
    const g = emptyGame();
    g.obstacles.push(obstacle('low', 1, 6));
    run(g, 0.2);
    g.input('jump');
    run(g, 1);
    expect(g.player.speedMul).toBe(1);
    expect(g.chase).toBeGreaterThanOrEqual(BALANCE.chase.start);
  });

  it('bater de frente num ônibus é tropeço forte, não fim de jogo', () => {
    const g = emptyGame();
    g.obstacles.push(obstacle('bus', 1, 4));
    run(g, 0.6);
    expect(g.phase).toBe('running');
    // Tropeço forte + perda extra enquanto está lento.
    const afterHit = BALANCE.chase.start + BALANCE.stumble.strong.chase;
    expect(g.chase).toBeLessThanOrEqual(afterHit);
    expect(g.chase).toBeGreaterThan(afterHit - 3);
    expect(g.player.lane).not.toBe(1); // empurrado para a faixa livre
  });

  it('dois tropeços fortes a partir de 60 de distância levam à captura', () => {
    const g = emptyGame();
    g.chase = 60;
    g.obstacles.push(obstacle('bus', 1, 4), obstacle('hole', 0, 22), obstacle('hole', 2, 22));
    run(g, 4);
    expect(g.phase).toBe('continue');
  });

  it('continuar cobra moedas, reinicia a distância e respeita o limite', () => {
    const g = emptyGame();
    g.bank = 1000;
    g.chase = 0.1;
    g.obstacles.push(obstacle('hole', 1, 2));
    run(g, 0.5);
    expect(g.phase).toBe('continue');
    expect(g.continueRun()).toBe(true);
    expect(g.wallet).toBe(800);
    expect(g.chase).toBe(BALANCE.continue.resetChase);

    g.chase = 0.1;
    g.player.invuln = 0;
    g.obstacles.push(obstacle('hole', g.player.lane, g.player.z + 2));
    run(g, 0.5);
    expect(g.continueRun()).toBe(true);
    expect(g.wallet).toBe(400);

    g.chase = 0.1;
    g.player.invuln = 0;
    g.obstacles.push(obstacle('hole', g.player.lane, g.player.z + 2));
    run(g, 0.5);
    expect(g.phase).toBe('over'); // terceira captura: sem continuar
  });

  it('sem saldo, a tela de continuar expira e encerra a partida', () => {
    const g = emptyGame();
    g.chase = 0.1;
    g.obstacles.push(obstacle('hole', 1, 2));
    run(g, 0.5);
    expect(g.phase).toBe('continue');
    expect(g.continueRun()).toBe(false);
    run(g, BALANCE.continue.countdown + 0.1);
    expect(g.phase).toBe('over');
  });

  it('sobe a rampa e corre no telhado sem tropeçar', () => {
    const g = emptyGame();
    const ramp = obstacle('ramp', 1, 4);
    const roof = obstacle('bus', 1, 4 + ramp.length, { length: BALANCE.obstacles.roof.length });
    g.obstacles.push(ramp, roof);
    run(g, 1.2);
    expect(g.player.y).toBeCloseTo(BALANCE.obstacles.bus.height, 1);
    expect(g.player.speedMul).toBe(1);
  });

  it('trocar de faixa ao lado de um ônibus (invulnerável) não teletransporta para o teto', () => {
    const g = emptyGame();
    g.player.invuln = 2;
    g.obstacles.push(obstacle('bus', 2, -2)); // ônibus já ao lado do jogador
    g.input('right');
    for (let t = 0; t < 0.5; t += DT) {
      g.update(DT);
      expect(g.player.y).toBeLessThan(0.5);
    }
  });

  it('raspão lateral sem troca de faixa em andamento não volta para uma faixa antiga bloqueada', () => {
    const g = emptyGame();
    // O jogador veio da faixa 1 há muito tempo; agora a faixa 1 está bloqueada.
    g.player.prevLane = 1;
    g.player.lane = 2;
    g.player.x = laneX(2);
    g.player.laneT = 1;
    g.obstacles.push(obstacle('bus', 1, -1, { length: 20 }));
    // Ônibus na faixa 2 que já começou atrás do jogador (entra "de lado").
    g.obstacles.push(obstacle('stand', 2, -0.2));
    g.update(DT);
    expect(g.player.lane).toBe(2);
  });

  it('carro em movimento batendo de frente é tropeço forte', () => {
    const g = emptyGame();
    g.obstacles.push(obstacle('vehicle', 1, 12, { speed: BALANCE.obstacles.vehicle.speed }));
    const events: string[] = [];
    for (let t = 0; t < 1.5; t += DT) {
      g.update(DT);
      for (const e of g.drainEvents()) if (e.type === 'stumble') events.push(e.kind);
    }
    expect(events[0]).toBe('strong');
  });

  it('comandos em espera são descartados por clearInput', () => {
    const g = emptyGame();
    g.player.grounded = false;
    g.player.y = 1;
    g.player.vy = 2;
    g.input('jump'); // fica no buffer (está no ar)
    g.clearInput();
    let jumps = 0;
    for (let t = 0; t < 0.6; t += DT) {
      g.update(DT);
      jumps += g.drainEvents().filter((e) => e.type === 'jump').length;
    }
    expect(jumps).toBe(0);
    expect(g.player.grounded).toBe(true);
  });

  it('Imunidade Parlamentar atravessa tudo sem tropeçar e afasta a multidão', () => {
    const g = emptyGame();
    g.chase = 40;
    g.pickups.push({ id: 1, kind: 'immunity', lane: 1, z: 2, y: 0.9, taken: false });
    g.obstacles.push(obstacle('bus', 1, 10), obstacle('hole', 1, 30), obstacle('low', 1, 45));
    const stumbles: string[] = [];
    for (let t = 0; t < 3; t += DT) {
      g.update(DT);
      for (const e of g.drainEvents()) if (e.type === 'stumble') stumbles.push(e.kind);
    }
    expect(stumbles).toEqual([]);
    expect(g.obstacles.every((o) => o.knocked)).toBe(true);
    expect(g.chase).toBeGreaterThan(90);
  });

  it('Habeas Corpus anula um tropeço forte e é consumido', () => {
    const g = emptyGame();
    g.player.powers.habeas = true;
    g.obstacles.push(obstacle('bus', 1, 4));
    run(g, 0.6);
    expect(g.chase).toBeGreaterThanOrEqual(BALANCE.chase.start);
    expect(g.player.powers.habeas).toBe(false);
    expect(g.player.lane).toBe(1);
  });

  it('Redemoinho do Saci coleta dinheiro das outras faixas', () => {
    const g = emptyGame();
    g.player.powers.saci = 10;
    g.pickups.push(
      { id: 1, kind: 'coin', lane: 0, z: 5, y: 0.9, taken: false },
      { id: 2, kind: 'bill', lane: 2, z: 8, y: 3.5, taken: false },
    );
    run(g, 1);
    expect(g.collected).toBe(6);
  });

  it('o boi muda de faixa e o bêbado anda na direção do jogador', () => {
    const g = emptyGame();
    const boi = obstacle('boi', 0, 20);
    const drunk = obstacle('drunk', 2, 40);
    g.obstacles.push(boi, drunk);
    g.player.invuln = 99;
    const lanes = new Set<number>();
    for (let t = 0; t < 1.5; t += DT) {
      g.update(DT);
      lanes.add(boi.lane);
    }
    expect(lanes.size).toBeGreaterThan(1);
    expect(drunk.z).toBeLessThan(40);
  });

  it('Vorcano joga maletas/notas alcançáveis na pista', () => {
    const g = emptyGame();
    (g as unknown as { nextVorcanoAt: number }).nextVorcanoAt = 0;
    const before = g.pickups.length;
    run(g, BALANCE.vorcano.duration);
    const drops = g.pickups.length - before;
    expect(drops).toBeGreaterThanOrEqual(BALANCE.vorcano.drops - 1);
    expect(g.pickups.every((k) => k.kind === 'case' || k.kind === 'bill')).toBe(true);
  });

  it('maleta dá boost e soma 50', () => {
    const g = emptyGame();
    g.pickups.push({ id: 1, kind: 'case', lane: 1, z: 5, y: 0.9, taken: false });
    run(g, 0.6);
    expect(g.collected).toBe(50);
    expect(g.player.boost).toBeGreaterThan(0);
  });
});
