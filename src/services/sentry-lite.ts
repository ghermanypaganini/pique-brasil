import {
  browserApiErrorsIntegration,
  dedupeIntegration,
  globalHandlersIntegration,
  init,
  linkedErrorsIntegration,
} from '@sentry/browser';

export { captureException } from '@sentry/browser';

// Sentry só com o essencial para capturar erros (sem tracing, replay nem feedback).
// Importar por nome aqui, e carregar este arquivo sob demanda, deixa o pacote bem menor.

export function startSentry(dsn: string, release: string, environment: string, isEnabled: () => boolean): void {
  init({
    dsn,
    release,
    environment,
    defaultIntegrations: false,
    integrations: [globalHandlersIntegration(), browserApiErrorsIntegration(), linkedErrorsIntegration(), dedupeIntegration()],
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    tracesSampleRate: 0,
    beforeSend: (event) => (isEnabled() ? event : null), // respeita o "desligar" das Configurações
  });
}
