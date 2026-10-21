import type { Language } from './save';

// Patrocinadores da tela de carregamento (PRD 10). Configuração em public/sponsors/sponsors.json.

export interface Sponsor {
  id: string;
  name: string;
  image: string;
  url: string;
  weight: number;
  start?: string;
  end?: string;
  locales?: Language[];
}

export interface SponsorConfig {
  contact: string;
  sponsors: Sponsor[];
}

const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

function valid(s: Partial<Sponsor>): s is Sponsor {
  return (
    typeof s.id === 'string' &&
    /^[a-z0-9-]{1,40}$/.test(s.id) &&
    typeof s.name === 'string' &&
    typeof s.image === 'string' &&
    !/^\s*javascript:/i.test(s.image) &&
    typeof s.url === 'string' &&
    /^https?:\/\//.test(s.url)
  );
}

/** Patrocinadores válidos e ativos hoje para o idioma atual. */
export function activeSponsors(cfg: Partial<SponsorConfig>, lang: Language, today = new Date()): Sponsor[] {
  const day = today.toISOString().slice(0, 10);
  return (cfg.sponsors ?? [])
    .filter(valid)
    .filter((s) => (!s.start || s.start <= day) && (!s.end || s.end >= day))
    .filter((s) => !s.locales?.length || s.locales.includes(lang))
    .map((s) => ({ ...s, weight: Number.isFinite(s.weight) && s.weight > 0 ? s.weight : 1 }));
}

/** Sorteia até `n` patrocinadores diferentes, respeitando o peso de cada um. */
export function pickSponsors(list: Sponsor[], n: number, rng = Math.random): Sponsor[] {
  const pool = [...list];
  const out: Sponsor[] = [];
  while (pool.length && out.length < n) {
    const total = pool.reduce((a, s) => a + s.weight, 0);
    let r = rng() * total;
    const i = pool.findIndex((s) => (r -= s.weight) <= 0);
    out.push(...pool.splice(i < 0 ? pool.length - 1 : i, 1));
  }
  return out;
}

export const validContact = (c: unknown): string | null => (typeof c === 'string' && EMAIL.test(c.trim()) ? c.trim() : null);

/** Lê a configuração (com limite de tempo: a tela de carregamento não pode travar por causa disso). */
export async function loadSponsorConfig(timeoutMs = 2500): Promise<Partial<SponsorConfig>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('sponsors/sponsors.json', { signal: ctrl.signal, cache: 'no-cache' });
    return res.ok ? ((await res.json()) as Partial<SponsorConfig>) : {};
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

/** Link do patrocinador com UTM (PRD 10.1). */
export function sponsorLink(s: Sponsor): string {
  const u = new URL(s.url);
  u.searchParams.set('utm_source', 'piquebrasil');
  u.searchParams.set('utm_medium', 'loading');
  u.searchParams.set('utm_campaign', s.id);
  return u.toString();
}
