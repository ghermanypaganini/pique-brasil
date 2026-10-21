import { getKv, json, preflight, readJson } from './_lib/http';
import { trackSponsor } from './_lib/ranking';

/** POST /api/sponsor { id, event: 'impression' | 'click' }: contadores de patrocínio. */
export async function POST(req: Request): Promise<Response> {
  const kv = getKv();
  const body = await readJson<{ id?: string; event?: string }>(req);
  if (kv && body?.id && (body.event === 'impression' || body.event === 'click')) await trackSponsor(kv, body.id, body.event);
  return json({ ok: true }); // nunca falha para o jogador
}

export const OPTIONS = preflight;
