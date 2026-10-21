import { API_BASE } from './config';
import { readJson, writeJson } from './save';
import type { Character } from '../systems/types';

// Cliente do ranking online (PRD 6.12). Tudo é "melhor esforço": sem internet ou sem servidor,
// o jogo continua normal e o envio fica na fila para depois.

export type Board = 'week' | 'all' | 'lule' | 'bolsonero';

export interface Entry {
  rank: number;
  name: string;
  tag: string;
  score: number;
}

export interface BoardData {
  board: Board;
  top: Entry[];
  me: Entry | null;
  placar: Record<Character, number>;
}

export interface RunResult {
  score: number;
  distance: number;
  coins: number;
}

export type SubmitOutcome =
  | { status: 'ok'; ranks: { week: number | null; all: number | null; character: number | null } }
  | { status: 'queued' } // sem conexão: enviado depois
  | { status: 'rejected'; error: string };

interface Pending extends RunResult {
  token: string;
  name: string;
  tag: string;
}

const QUEUE_KEY = 'pique-brasil:ranking-queue';
const TIMEOUT_MS = 6000;

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    });
    const data = await res.json().catch(() => ({ ok: false, error: `http-${res.status}` }));
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Pede o token assinado do início da partida. Nunca bloqueia o jogo: sem resposta, a partida só não vai ao ranking. */
export async function requestRunToken(character: Character): Promise<string | null> {
  try {
    const r = await call<{ ok: boolean; token?: string }>('/api/start', { method: 'POST', body: JSON.stringify({ character }) });
    return r.ok && r.token ? r.token : null;
  } catch {
    return null;
  }
}

async function send(p: Pending): Promise<SubmitOutcome> {
  try {
    const r = await call<{ ok: boolean; error?: string; ranks?: { week: number | null; all: number | null; character: number | null } }>(
      '/api/score',
      { method: 'POST', body: JSON.stringify(p) },
    );
    if (r.ok && r.ranks) return { status: 'ok', ranks: r.ranks };
    // Servidor fora do ar: tenta de novo depois. Erro de validação: descarta.
    if (r.error === 'unavailable' || r.error?.startsWith('http-5')) return { status: 'queued' };
    return { status: 'rejected', error: r.error ?? 'unknown' };
  } catch {
    return { status: 'queued' };
  }
}

export async function submitRun(token: string, name: string, tag: string, result: RunResult): Promise<SubmitOutcome> {
  const pending: Pending = { token, name, tag, ...result };
  const outcome = await send(pending);
  if (outcome.status === 'queued') {
    const queue = readJson<Pending[]>(QUEUE_KEY, []);
    queue.push(pending);
    writeJson(QUEUE_KEY, queue.slice(-10));
  }
  return outcome;
}

/** Reenvia partidas que ficaram na fila (chamado ao abrir o jogo e ao iniciar partidas). */
export async function flushQueue(): Promise<void> {
  const queue = readJson<Pending[]>(QUEUE_KEY, []);
  if (!queue.length) return;
  const left: Pending[] = [];
  for (const p of queue) {
    const o = await send(p);
    if (o.status === 'queued') left.push(p);
  }
  writeJson(QUEUE_KEY, left);
}

export async function fetchBoard(board: Board, me: string | null): Promise<BoardData | null> {
  try {
    const q = new URLSearchParams({ board });
    if (me) q.set('me', me);
    const r = await call<{ ok: boolean } & BoardData>(`/api/leaderboard?${q}`);
    return r.ok ? r : null;
  } catch {
    return null;
  }
}

/** Contadores de patrocínio: dispara e esquece (sendBeacon sobrevive à troca de página no clique). */
export function trackSponsor(id: string, event: 'impression' | 'click'): void {
  const body = JSON.stringify({ id, event });
  try {
    if (navigator.sendBeacon?.(`${API_BASE}/api/sponsor`, new Blob([body], { type: 'application/json' }))) return;
  } catch {
    /* segue para o fetch */
  }
  fetch(`${API_BASE}/api/sponsor`, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(
    () => {},
  );
}
