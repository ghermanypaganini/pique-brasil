import { json, preflight } from './_lib/http.js';

/**
 * GET /api/health -> quais configurações o servidor enxerga (só presença, nunca os valores).
 * Serve para diagnosticar a publicação: Redis conectado, RUN_SECRET e ADMIN_KEY definidas.
 */
export function GET(): Response {
  const env = process.env;
  return json({
    ok: true,
    environment: env.VERCEL_ENV ?? 'local',
    redis: !!((env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL) && (env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN)),
    runSecret: !!env.RUN_SECRET,
    adminKey: !!env.ADMIN_KEY,
  });
}

export const OPTIONS = preflight;
