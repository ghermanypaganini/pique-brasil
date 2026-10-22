// Destino do build (PRD 9.7): o mesmo jogo, com recursos ligados/desligados por plataforma.
//   web         Vercel (principal): patrocínio, ranking e PWA
//   itch        zip HTML5 para o itch.io: patrocínio e ranking (API na Vercel)
//   poki        Poki: SDK do portal, sem patrocínio externo
//   crazygames  CrazyGames: SDK do portal, sem patrocínio externo

export type Target = 'web' | 'itch' | 'poki' | 'crazygames';

export const TARGET: Target = (import.meta.env.VITE_TARGET as Target | undefined) ?? 'web';

/** Endereço público da API (usado quando o jogo não está hospedado na própria Vercel). */
const PUBLIC_API = 'https://pique-brasil.vercel.app';

export const API_BASE: string = import.meta.env.VITE_API_BASE ?? (TARGET === 'web' ? '' : PUBLIC_API);

export const FEATURES = {
  sponsors: TARGET === 'web' || TARGET === 'itch',
  ranking: true,
  pwa: TARGET === 'web',
  portalSdk: TARGET === 'poki' || TARGET === 'crazygames',
  // Métricas próprias só fora dos portais (eles já medem e têm regras sobre rastreamento de terceiros).
  analytics: TARGET === 'web' || TARGET === 'itch',
};
