import { TARGET } from './config';

// Integração mínima com os SDKs dos portais (PRD 9.7). Só é carregada nos builds poki/crazygames.
// Os portais pedem para avisar quando o carregamento termina e quando a partida começa/para
// (eles usam isso para métricas e para não exibir anúncios do próprio portal no meio do jogo).
// Conferir a documentação de cada portal antes de enviar: as APIs podem mudar.

interface PokiSDK {
  init(): Promise<void>;
  gameLoadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
}

interface CrazySDK {
  init(): Promise<void>;
  game: { loadingStart(): void; loadingStop(): void; gameplayStart(): void; gameplayStop(): void };
}

declare global {
  interface Window {
    PokiSDK?: PokiSDK;
    CrazyGames?: { SDK: CrazySDK };
  }
}

const SDK_URL: Partial<Record<typeof TARGET, string>> = {
  poki: 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js',
  crazygames: 'https://sdk.crazygames.com/crazygames-sdk-v3.js',
};

let ready = false;
let playing = false;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`falha ao carregar ${src}`));
    document.head.appendChild(s);
  });
}

/** Inicializa o SDK do portal (se houver). Nunca impede o jogo de abrir. */
export async function initPortal(): Promise<void> {
  const url = SDK_URL[TARGET];
  if (!url) return;
  try {
    await loadScript(url);
    if (TARGET === 'poki') await window.PokiSDK?.init();
    if (TARGET === 'crazygames') {
      await window.CrazyGames?.SDK.init();
      window.CrazyGames?.SDK.game.loadingStart();
    }
    ready = true;
  } catch {
    ready = false; // bloqueador de anúncios etc.: o jogo segue sem o SDK
  }
}

export function portalLoadingFinished(): void {
  if (!ready) return;
  if (TARGET === 'poki') window.PokiSDK?.gameLoadingFinished();
  if (TARGET === 'crazygames') window.CrazyGames?.SDK.game.loadingStop();
}

export function portalGameplay(active: boolean): void {
  if (!ready || active === playing) return;
  playing = active;
  try {
    if (TARGET === 'poki') active ? window.PokiSDK?.gameplayStart() : window.PokiSDK?.gameplayStop();
    if (TARGET === 'crazygames') active ? window.CrazyGames?.SDK.game.gameplayStart() : window.CrazyGames?.SDK.game.gameplayStop();
  } catch {
    /* SDK indisponível */
  }
}
