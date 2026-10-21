import { describe, expect, it } from 'vitest';
import { memoryKv } from './kv';
import { getLeaderboard, readToken, startToken, submitScore, weekId } from './ranking';

const SECRET = 'segredo-de-teste';
const T0 = Date.UTC(2026, 9, 21, 15, 0, 0); // quarta, 21/10/2026, 12:00 em Brasília

function run(kv = memoryKv(), opts: Partial<{ name: string; tag: string; score: number; distance: number; coins: number; seconds: number; character: 'lule' | 'bolsonero' }> = {}) {
  const o = { name: 'Zéca', tag: '1234', distance: 900, coins: 100, seconds: 60, character: 'lule' as const, ...opts };
  const token = startToken(SECRET, o.character, T0);
  const score = o.score ?? o.distance + o.coins;
  return submitScore(kv, SECRET, 'ip1', { token, name: o.name, tag: o.tag, score, distance: o.distance, coins: o.coins }, T0 + o.seconds * 1000);
}

describe('ranking', () => {
  it('semana começa segunda 00:00 de Brasília', () => {
    expect(weekId(T0)).toBe('2026-10-19');
    expect(weekId(Date.UTC(2026, 9, 26, 2, 59))).toBe('2026-10-19'); // domingo 23:59 BRT
    expect(weekId(Date.UTC(2026, 9, 26, 3, 0))).toBe('2026-10-26'); // segunda 00:00 BRT
  });

  it('token assinado não pode ser adulterado', () => {
    const tok = startToken(SECRET, 'bolsonero', T0);
    expect(readToken(SECRET, tok)?.c).toBe('bolsonero');
    expect(readToken('outro', tok)).toBeNull();
    const [p, mac] = tok.split('.');
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url').toString()), t: 0 })).toString('base64url');
    expect(readToken(SECRET, `${forged}.${mac}`)).toBeNull();
  });

  it('aceita pontuação plausível e devolve as posições', async () => {
    const r = await run();
    expect(r).toMatchObject({ ok: true, member: 'Zéca#1234', ranks: { week: 1, all: 1, character: 1 } });
  });

  it('recusa distância impossível para o tempo de partida', async () => {
    expect(await run(undefined, { distance: 100000, seconds: 30 })).toEqual({ ok: false, error: 'implausible' });
    expect(await run(undefined, { score: 999999 })).toEqual({ ok: false, error: 'implausible' });
  });

  it('cada partida só pode ser enviada uma vez', async () => {
    const kv = memoryKv();
    const token = startToken(SECRET, 'lule', T0);
    const input = { token, name: 'Zéca', tag: '1234', score: 1000, distance: 900, coins: 100 };
    expect((await submitScore(kv, SECRET, 'ip', input, T0 + 60000)).ok).toBe(true);
    expect(await submitScore(kv, SECRET, 'ip', input, T0 + 61000)).toEqual({ ok: false, error: 'used' });
  });

  it('recusa apelidos ofensivos ou de campanha', async () => {
    expect(await run(undefined, { name: 'Lula 13' })).toEqual({ ok: false, error: 'political' });
    expect(await run(undefined, { name: 'p0rra' })).toEqual({ ok: false, error: 'offensive' });
  });

  it('mantém o melhor resultado, separa por personagem e soma o Placar da Torcida', async () => {
    const kv = memoryKv();
    await run(kv, { name: 'Ana Rio', distance: 500, coins: 50 });
    await run(kv, { name: 'Ana Rio', distance: 300, coins: 10 }); // pior: não substitui
    await run(kv, { name: 'Beto SP', tag: '9999', distance: 800, coins: 80, character: 'bolsonero' });
    const week = await getLeaderboard(kv, 'week', 'Ana Rio#1234', T0 + 60000);
    expect(week.top.map((e) => [e.name, e.score])).toEqual([['Beto SP', 880], ['Ana Rio', 550]]);
    expect(week.me).toMatchObject({ rank: 2, score: 550 });
    expect(week.placar).toEqual({ lule: 800, bolsonero: 800 });
    const lule = await getLeaderboard(kv, 'lule', null, T0);
    expect(lule.top.map((e) => e.name)).toEqual(['Ana Rio']);
  });

  it('limita envios por IP', async () => {
    const kv = memoryKv();
    let last;
    for (let i = 0; i < 31; i++) last = await run(kv);
    expect(last).toEqual({ ok: false, error: 'rate' });
  });
});
