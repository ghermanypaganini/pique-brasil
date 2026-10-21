import { getKv, json, preflight, unavailable } from './_lib/http.js';
import { removeMember } from './_lib/ranking.js';

// Moderação. Exige o cabeçalho X-Admin-Key igual à variável de ambiente ADMIN_KEY.
//   GET    /api/admin?sponsor=padaria-do-ze     -> impressões e cliques do patrocinador
//   DELETE /api/admin?member=Nome%231234        -> remove o apelido de todos os rankings

function authorized(req: Request): boolean {
  const key = process.env.ADMIN_KEY;
  return !!key && req.headers.get('x-admin-key') === key;
}

export async function GET(req: Request): Promise<Response> {
  if (!authorized(req)) return json({ ok: false, error: 'forbidden' }, 403);
  const kv = getKv();
  if (!kv) return unavailable();
  const id = new URL(req.url).searchParams.get('sponsor');
  if (!id) return json({ ok: false, error: 'sponsor' }, 400);
  return json({ ok: true, id, stats: await kv.hgetall(`sponsor:${id}`) });
}

export async function DELETE(req: Request): Promise<Response> {
  if (!authorized(req)) return json({ ok: false, error: 'forbidden' }, 403);
  const kv = getKv();
  if (!kv) return unavailable();
  const member = new URL(req.url).searchParams.get('member');
  if (!member) return json({ ok: false, error: 'member' }, 400);
  await removeMember(kv, member);
  return json({ ok: true, removed: member });
}

export const OPTIONS = preflight;
