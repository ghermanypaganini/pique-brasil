import { clientIp, getKv, getSecret, json, preflight, readJson, unavailable } from './_lib/http.js';
import { hashIp, submitScore, type ScoreInput } from './_lib/ranking.js';

/** POST /api/score { token, name, tag, score, distance, coins } -> posições no ranking. */
export async function POST(req: Request): Promise<Response> {
  const kv = getKv();
  const secret = getSecret();
  if (!kv || !secret) return unavailable();
  const body = await readJson<ScoreInput>(req);
  if (!body || typeof body.token !== 'string' || typeof body.name !== 'string' || typeof body.tag !== 'string') {
    return json({ ok: false, error: 'body' }, 400);
  }
  const result = await submitScore(kv, secret, hashIp(secret, clientIp(req)), body);
  const status = result.ok ? 200 : result.error === 'rate' ? 429 : 400;
  return json(result, status);
}

export const OPTIONS = preflight;
