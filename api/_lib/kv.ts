import { Redis } from '@upstash/redis';

/** Operações de armazenamento que o ranking usa (Redis em produção, memória nos testes). */
export interface Kv {
  /** Adiciona ao ranking só se a pontuação for maior que a atual (ZADD GT). */
  zaddGt(key: string, score: number, member: string): Promise<void>;
  topWithScores(key: string, count: number): Promise<{ member: string; score: number }[]>;
  revRank(key: string, member: string): Promise<number | null>;
  score(key: string, member: string): Promise<number | null>;
  zrem(key: string, member: string): Promise<void>;
  /** Incrementa e define validade na primeira vez (limite de envios). */
  incrWithTtl(key: string, ttlSeconds: number): Promise<number>;
  /** Grava só se não existir (token de partida usado uma vez). */
  setOnce(key: string, ttlSeconds: number): Promise<boolean>;
  hincrby(key: string, field: string, by: number): Promise<void>;
  hgetall(key: string): Promise<Record<string, number>>;
  expire(key: string, ttlSeconds: number): Promise<void>;
}

/** Redis da Upstash. Aceita as variáveis criadas pela integração da Vercel (KV_*) ou as da Upstash. */
export function redisKv(): Kv | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const r = new Redis({ url, token });
  return {
    async zaddGt(key, score, member) {
      await r.zadd(key, { gt: true }, { score, member });
    },
    async topWithScores(key, count) {
      const flat = await r.zrange<(string | number)[]>(key, 0, count - 1, { rev: true, withScores: true });
      const out: { member: string; score: number }[] = [];
      for (let i = 0; i < flat.length; i += 2) out.push({ member: String(flat[i]), score: Number(flat[i + 1]) });
      return out;
    },
    async revRank(key, member) {
      return r.zrevrank(key, member);
    },
    async score(key, member) {
      const s = await r.zscore(key, member);
      return s === null ? null : Number(s);
    },
    async zrem(key, member) {
      await r.zrem(key, member);
    },
    async incrWithTtl(key, ttl) {
      const n = await r.incr(key);
      if (n === 1) await r.expire(key, ttl);
      return n;
    },
    async setOnce(key, ttl) {
      return (await r.set(key, 1, { nx: true, ex: ttl })) === 'OK';
    },
    async hincrby(key, field, by) {
      await r.hincrby(key, field, by);
    },
    async hgetall(key) {
      const h = (await r.hgetall<Record<string, string | number>>(key)) ?? {};
      return Object.fromEntries(Object.entries(h).map(([k, v]) => [k, Number(v)]));
    },
    async expire(key, ttl) {
      await r.expire(key, ttl);
    },
  };
}

/** Implementação em memória (testes e desenvolvimento local sem Redis). */
export function memoryKv(): Kv {
  const zsets = new Map<string, Map<string, number>>();
  const counters = new Map<string, number>();
  const hashes = new Map<string, Map<string, number>>();
  const zset = (k: string) => zsets.get(k) ?? zsets.set(k, new Map()).get(k)!;
  const sorted = (k: string) => [...zset(k).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    async zaddGt(key, score, member) {
      const z = zset(key);
      const cur = z.get(member);
      if (cur === undefined || score > cur) z.set(member, score);
    },
    async topWithScores(key, count) {
      return sorted(key).slice(0, count).map(([member, score]) => ({ member, score }));
    },
    async revRank(key, member) {
      const i = sorted(key).findIndex(([m]) => m === member);
      return i < 0 ? null : i;
    },
    async score(key, member) {
      return zset(key).get(member) ?? null;
    },
    async zrem(key, member) {
      zset(key).delete(member);
    },
    async incrWithTtl(key) {
      const n = (counters.get(key) ?? 0) + 1;
      counters.set(key, n);
      return n;
    },
    async setOnce(key) {
      if (counters.has(key)) return false;
      counters.set(key, 1);
      return true;
    },
    async hincrby(key, field, by) {
      const h = hashes.get(key) ?? hashes.set(key, new Map()).get(key)!;
      h.set(field, (h.get(field) ?? 0) + by);
    },
    async hgetall(key) {
      return Object.fromEntries(hashes.get(key) ?? []);
    },
    async expire() {},
  };
}
