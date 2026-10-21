import { getSecret, json, preflight, readJson, unavailable } from './_lib/http.js';
import { CHARACTERS, startToken, type Character } from './_lib/ranking.js';

/** POST /api/start { character } -> { token }: assina o início da partida. */
export async function POST(req: Request): Promise<Response> {
  const secret = getSecret();
  if (!secret) return unavailable();
  const body = await readJson<{ character?: Character }>(req);
  if (!body?.character || !CHARACTERS.includes(body.character)) return json({ ok: false, error: 'character' }, 400);
  return json({ ok: true, token: startToken(secret, body.character) });
}

export const OPTIONS = preflight;
