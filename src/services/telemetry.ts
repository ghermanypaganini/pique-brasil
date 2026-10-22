// Métricas (PostHog) e erros (Sentry), PRD seção 11.
// Privacidade em primeiro lugar (LGPD): dados anônimos, sem cookies, sem gravação de tela, sem cliques
// automáticos, sem IP guardado. O identificador da visita fica só na aba (sessionStorage: some ao fechar).
// O jogador pode desligar em Configurações. Sem as chaves (VITE_POSTHOG_KEY / VITE_SENTRY_DSN)
// tudo vira "não faz nada".
// - Erros: o Sentry começa logo na abertura (antes do 3D), e erros anteriores a ele carregar são guardados.
// - Eventos: o PostHog só carrega depois do jogo abrir, para não atrasar o carregamento.

export type Props = Record<string, string | number | boolean | null>;

// Constante de build (não de execução): nos builds dos portais o código dos SDKs e as chaves nem entram no
// pacote (Poki/CrazyGames têm métricas próprias e regras contra rastreamento de terceiros).
const BUILD_TARGET: string = import.meta.env.VITE_TARGET ?? 'web';
const ANALYTICS_BUILD = (BUILD_TARGET === 'web' || BUILD_TARGET === 'itch') && !import.meta.env.DEV;

const POSTHOG_KEY: string | undefined = ANALYTICS_BUILD ? import.meta.env.VITE_POSTHOG_KEY : undefined;
const POSTHOG_HOST: string = import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const SENTRY_DSN: string | undefined = ANALYTICS_BUILD ? import.meta.env.VITE_SENTRY_DSN : undefined;
const RELEASE: string = import.meta.env.VITE_RELEASE ?? 'dev';

interface Capturer {
  capture(event: string, props: Props, beacon: boolean): void;
}

let enabled = false;
let sentryStarted = false;
let posthogStarted = false;
let posthog: Capturer | null = null;
const queue: [string, Props][] = []; // eventos antes do SDK carregar
const MAX_QUEUE = 50;

// Erros que acontecem antes de o Sentry terminar de carregar (ex.: aparelho sem WebGL ao montar o 3D).
const early: unknown[] = [];
const onEarlyError = (e: ErrorEvent) => early.length < 10 && early.push(e.error ?? e.message);
const onEarlyRejection = (e: PromiseRejectionEvent) => early.length < 10 && early.push(e.reason);

/** Relatório de erros: chamar logo no começo, antes de montar o jogo. */
export function startErrorReporting(allowed: boolean): void {
  enabled = allowed && ANALYTICS_BUILD;
  if (!enabled || sentryStarted || !SENTRY_DSN) return;
  sentryStarted = true;
  window.addEventListener('error', onEarlyError);
  window.addEventListener('unhandledrejection', onEarlyRejection);
  void loadSentry(SENTRY_DSN);
}

/** Métricas de jogo: chamar quando o jogo já estiver aberto. */
export function startAnalytics(allowed: boolean): void {
  enabled = allowed && ANALYTICS_BUILD;
  if (!enabled || posthogStarted || !POSTHOG_KEY) return;
  posthogStarted = true;
  void loadPosthog(POSTHOG_KEY);
}

/** Configurações: desligar para de enviar na hora; religar vale a partir de agora. */
export function setTelemetryEnabled(allowed: boolean): void {
  if (!allowed) {
    enabled = false;
    queue.length = 0;
    return;
  }
  startErrorReporting(true);
  startAnalytics(true);
}

/** `beacon`: para a página que está fechando (o envio sobrevive ao fechamento). */
export function track(event: string, props: Props = {}, beacon = false): void {
  if (!enabled) return;
  if (posthog) posthog.capture(event, props, beacon);
  else if (queue.length < MAX_QUEUE) queue.push([event, props]);
}

async function loadPosthog(key: string): Promise<void> {
  try {
    // Versão "slim" e sem scripts externos: só captura de eventos (sem gravação, pesquisas etc.).
    const { default: ph } = await import('posthog-js/dist/module.slim.no-external');
    ph.init(key, {
      api_host: POSTHOG_HOST,
      // Mantém a visita ao recarregar a página (ex.: trocar o idioma); some ao fechar a aba.
      persistence: 'sessionStorage',
      person_profiles: 'never',
      autocapture: false,
      rageclick: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      capture_performance: false,
      capture_exceptions: false, // erros vão para o Sentry
      disable_session_recording: true,
      disable_surveys: true,
      disable_web_experiments: true,
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
      save_referrer: false,
      ip: false,
    });
    ph.register({ target: BUILD_TARGET, release: RELEASE });
    posthog = {
      capture: (event, props, beacon) => {
        if (enabled) ph.capture(event, props, beacon ? { transport: 'sendBeacon' } : undefined);
      },
    };
    for (const [event, props] of queue.splice(0)) posthog.capture(event, props, false);
  } catch {
    // Bloqueador de anúncios ou rede fora: o jogo segue sem métricas.
  }
}

async function loadSentry(dsn: string): Promise<void> {
  try {
    const sentry = await import('./sentry-lite');
    sentry.startSentry(dsn, RELEASE, BUILD_TARGET, () => enabled);
    for (const err of early.splice(0)) sentry.captureException(err);
  } catch {
    /* sem relatório de erros */
  } finally {
    window.removeEventListener('error', onEarlyError);
    window.removeEventListener('unhandledrejection', onEarlyRejection);
  }
}

// ── Medição de FPS durante a corrida ─────────────────────────────

const BUCKETS = 251; // duração do quadro em ms inteiros (0..250)

/**
 * FPS médio e FPS dos 5% piores quadros. Histograma de tamanho fixo: memória constante
 * e a partida inteira conta, por mais longa que seja.
 */
export class FpsMeter {
  private hist = new Uint32Array(BUCKETS);
  private count = 0;
  private total = 0;

  add(frameDt: number): void {
    if (!(frameDt > 0 && frameDt < 0.25)) return;
    this.hist[Math.min(BUCKETS - 1, Math.floor(frameDt * 1000))]++;
    this.count++;
    this.total += frameDt;
  }

  reset(): void {
    this.hist.fill(0);
    this.count = 0;
    this.total = 0;
  }

  summary(): { fps_avg: number | null; fps_low: number | null } {
    if (this.count < 30) return { fps_avg: null, fps_low: null };
    // Anda dos quadros mais lentos para os mais rápidos até juntar os 5% piores.
    const target = Math.ceil(this.count * 0.05);
    let seen = 0;
    let ms = BUCKETS - 1;
    for (; ms > 0; ms--) {
      seen += this.hist[ms];
      if (seen >= target) break;
    }
    return { fps_avg: Math.round(this.count / this.total), fps_low: Math.round(1000 / (ms + 0.5)) };
  }
}
