import { getKv, json, preflight, unavailable } from './_lib/http';
import { getLeaderboard, type Board } from './_lib/ranking';

const BOARDS: Board[] = ['week', 'all', 'lule', 'bolsonero'];

/** GET /api/leaderboard?board=week&me=Nome%231234 -> top 100, posição do jogador e Placar da Torcida. */
export async function GET(req: Request): Promise<Response> {
  const kv = getKv();
  if (!kv) return unavailable();
  const url = new URL(req.url);
  const board = (url.searchParams.get('board') ?? 'week') as Board;
  if (!BOARDS.includes(board)) return json({ ok: false, error: 'board' }, 400);
  const me = url.searchParams.get('me');
  const data = await getLeaderboard(kv, board, me && me.length <= 40 ? me : null);
  // O top 100 muda pouco: cache curto no CDN (a posição do jogador vem no mesmo pedido, então só sem "me").
  const cache = me ? 'no-store' : 'public, s-maxage=30, stale-while-revalidate=60';
  return json({ ok: true, ...data }, 200, { 'Cache-Control': cache });
}

export const OPTIONS = preflight;
