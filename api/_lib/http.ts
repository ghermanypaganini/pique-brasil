import { memoryKv, redisKv, type Kv } from './kv.js';

// Utilitários das Vercel Functions (handlers no formato Web: Request -> Response).

const CORS = {
  // O jogo também roda no itch.io (outro domínio) e chama esta API. Não há cookies nem login.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
};

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS, ...headers },
  });
}

export const preflight = () => new Response(null, { status: 204, headers: CORS });

let devKv: Kv | null = null;
/** Redis em produção; sem as variáveis de ambiente, usa memória (só para desenvolvimento). */
export function getKv(): Kv | null {
  const kv = redisKv();
  if (kv) return kv;
  if (process.env.VERCEL_ENV === 'production') return null;
  return (devKv ??= memoryKv());
}

export function getSecret(): string | null {
  return process.env.RUN_SECRET ?? (process.env.VERCEL_ENV === 'production' ? null : 'dev-secret');
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export const unavailable = () => json({ ok: false, error: 'unavailable' }, 503);
