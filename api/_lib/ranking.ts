import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { checkName, cleanName, memberOf, parseMember, type NameProblem } from '../../src/shared/names';
import type { Kv } from './kv';

// Regras do ranking (PRD 6.12). Sem login, a proteção é "boa o bastante", não perfeita.

export type Character = 'lule' | 'bolsonero';
export type Board = 'week' | 'all' | 'lule' | 'bolsonero';
export const CHARACTERS: Character[] = ['lule', 'bolsonero'];

const TOKEN_MAX_AGE_MS = 3 * 60 * 60 * 1000; // partida mais longa aceita: 3 h
const MIN_RUN_MS = 3000;
const MAX_METERS_PER_SEC = 45; // velocidade máxima do jogo com Imunidade + maleta, com folga
const MAX_COINS_PER_METER = 3; // dinheiro coletável por metro, com folga
const RATE_LIMIT_PER_HOUR = 30;
const WEEK_TTL = 60 * 60 * 24 * 35;
export const TOP = 100;

// ── Semana (zera segunda-feira 00:00, horário de Brasília) ─────────

export function weekId(now = Date.now()): string {
  const brt = new Date(now - 3 * 60 * 60 * 1000); // UTC-3
  const day = brt.getUTCDay(); // 0 = domingo
  const monday = new Date(Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate() - ((day + 6) % 7)));
  return monday.toISOString().slice(0, 10);
}

export const boardKey = (board: Board, now = Date.now()): string =>
  board === 'week' ? `lb:week:${weekId(now)}` : board === 'all' ? 'lb:all' : `lb:char:${board}`;

const placarKey = (now = Date.now()) => `placar:${weekId(now)}`;

// ── Token da partida ──────────────────────────────────────────────

const sign = (secret: string, payload: string) => createHmac('sha256', secret).update(payload).digest('base64url');

export function startToken(secret: string, character: Character, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ r: randomUUID(), t: now, c: character })).toString('base64url');
  return `${payload}.${sign(secret, payload)}`;
}

export function readToken(secret: string, token: string): { r: string; t: number; c: Character } | null {
  const [payload, mac] = token.split('.');
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(secret, payload));
  const got = Buffer.from(mac);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof data.r !== 'string' || typeof data.t !== 'number' || !CHARACTERS.includes(data.c)) return null;
    return data;
  } catch {
    return null;
  }
}

export const hashIp = (secret: string, ip: string) => createHash('sha256').update(`${secret}:${ip}`).digest('hex').slice(0, 24);

// ── Envio de pontuação ────────────────────────────────────────────

export interface ScoreInput {
  token: string;
  name: string;
  tag: string;
  score: number;
  distance: number;
  coins: number;
}

export type ScoreResult =
  | { ok: true; member: string; ranks: Record<'week' | 'all' | 'character', number | null> }
  | { ok: false; error: 'token' | 'used' | 'implausible' | 'rate' | 'tag' | NameProblem };

export async function submitScore(kv: Kv, secret: string, ipHash: string, input: ScoreInput, now = Date.now()): Promise<ScoreResult> {
  const tok = readToken(secret, input.token);
  if (!tok) return { ok: false, error: 'token' };
  const elapsed = now - tok.t;
  if (elapsed > TOKEN_MAX_AGE_MS || elapsed < 0) return { ok: false, error: 'token' };

  const problem = checkName(input.name);
  if (problem) return { ok: false, error: problem };
  if (!/^\d{4}$/.test(input.tag)) return { ok: false, error: 'tag' };

  const { score, distance, coins } = input;
  const nums = [score, distance, coins];
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return { ok: false, error: 'implausible' };
  const plausible =
    elapsed >= MIN_RUN_MS &&
    distance <= (elapsed / 1000) * MAX_METERS_PER_SEC + 50 &&
    coins <= distance * MAX_COINS_PER_METER + 200 &&
    Math.abs(score - (Math.floor(distance) + coins)) <= 2;
  if (!plausible) return { ok: false, error: 'implausible' };

  if ((await kv.incrWithTtl(`rl:${ipHash}`, 3600)) > RATE_LIMIT_PER_HOUR) return { ok: false, error: 'rate' };
  if (!(await kv.setOnce(`run:${tok.r}`, 60 * 60 * 24))) return { ok: false, error: 'used' };

  const member = memberOf(cleanName(input.name), input.tag);
  const s = Math.floor(score);
  const week = boardKey('week', now);
  await Promise.all([
    kv.zaddGt(week, s, member),
    kv.zaddGt(boardKey('all'), s, member),
    kv.zaddGt(boardKey(tok.c), s, member),
    kv.hincrby(placarKey(now), tok.c, Math.floor(distance)),
  ]);
  await Promise.all([kv.expire(week, WEEK_TTL), kv.expire(placarKey(now), WEEK_TTL)]);

  const [rw, ra, rc] = await Promise.all([kv.revRank(week, member), kv.revRank(boardKey('all'), member), kv.revRank(boardKey(tok.c), member)]);
  const pos = (r: number | null) => (r === null ? null : r + 1);
  return { ok: true, member, ranks: { week: pos(rw), all: pos(ra), character: pos(rc) } };
}

// ── Leitura ───────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  name: string;
  tag: string;
  score: number;
}

export interface Leaderboard {
  board: Board;
  week: string;
  top: LeaderboardEntry[];
  me: LeaderboardEntry | null;
  placar: Record<Character, number>;
}

export async function getLeaderboard(kv: Kv, board: Board, me: string | null, now = Date.now()): Promise<Leaderboard> {
  const key = boardKey(board, now);
  const [top, placarRaw] = await Promise.all([kv.topWithScores(key, TOP), kv.hgetall(placarKey(now))]);
  const entries = top.map((e, i) => ({ rank: i + 1, ...parseMember(e.member), score: e.score }));
  let mine: LeaderboardEntry | null = null;
  if (me) {
    const [rank, score] = await Promise.all([kv.revRank(key, me), kv.score(key, me)]);
    if (rank !== null && score !== null) mine = { rank: rank + 1, ...parseMember(me), score };
  }
  return {
    board,
    week: weekId(now),
    top: entries,
    me: mine,
    placar: { lule: placarRaw.lule ?? 0, bolsonero: placarRaw.bolsonero ?? 0 },
  };
}

/** Remove um apelido de todos os rankings (moderação). */
export async function removeMember(kv: Kv, member: string, now = Date.now()): Promise<void> {
  const boards: Board[] = ['week', 'all', 'lule', 'bolsonero'];
  await Promise.all(boards.map((b) => kv.zrem(boardKey(b, now), member)));
}

// ── Patrocínio ────────────────────────────────────────────────────

export async function trackSponsor(kv: Kv, id: string, event: 'impression' | 'click'): Promise<void> {
  if (!/^[a-z0-9-]{1,40}$/.test(id)) return;
  await kv.hincrby(`sponsor:${id}`, event, 1);
}
