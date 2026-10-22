import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// VITE_TARGET: web (Vercel), itch, poki ou crazygames. Ver src/services/config.ts.
const target = process.env.VITE_TARGET ?? 'web';

/**
 * Em desenvolvimento, executa as Vercel Functions de /api dentro do próprio Vite
 * (sem Redis: o ranking fica em memória). Em produção quem executa é a Vercel.
 */
function localApi(): Plugin {
  return {
    name: 'pique-brasil-local-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api', async (req: IncomingMessage, res: ServerResponse, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\//, '');
        if (!/^[a-z-]+$/.test(name)) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          const handler = mod[req.method ?? 'GET'];
          if (typeof handler !== 'function') {
            res.statusCode = 405;
            return res.end();
          }
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const body = chunks.length ? Buffer.concat(chunks) : undefined;
          const url = `http://${req.headers.host}/api/${req.url?.replace(/^\//, '')}`;
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
          headers.set('x-forwarded-for', req.socket.remoteAddress ?? '127.0.0.1');
          const response: Response = await handler(new Request(url, { method: req.method, headers, body }));
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          server.config.logger.error(String(e));
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: 'dev-server' }));
        }
      });
    },
  };
}

// Versão do build para as métricas e os relatórios de erro: o commit na Vercel, senão a do package.json.
const release = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.npm_package_version ?? 'dev';

export default defineConfig({
  // Caminhos relativos: o mesmo build funciona na Vercel e dentro do zip do itch.io/portais.
  base: './',
  define: {
    'import.meta.env.VITE_RELEASE': JSON.stringify(release),
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1000,
    outDir: target === 'web' ? 'dist' : `dist-${target}`,
    rolldownOptions: {
      output: {
        // SDKs de métricas com prefixo próprio, para o PWA não baixá-los antecipadamente (ver globIgnores).
        chunkFileNames: (chunk) =>
          chunk.moduleIds.some((id) => /posthog-js|@sentry|sentry-lite/.test(id))
            ? 'assets/telemetry-[name]-[hash].js'
            : 'assets/[name]-[hash].js',
      },
    },
  },
  plugins: [
    localApi(),
    // PWA só no site próprio: service workers dentro de iframes de portais causam problemas.
    ...(target === 'web'
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg'],
            manifest: {
              name: 'Pique-Brasil',
              short_name: 'Pique-Brasil',
              description: 'Corra da multidão pelas ruas do Brasil. Jogo de sátira para navegador.',
              lang: 'pt-BR',
              start_url: './',
              scope: './',
              display: 'fullscreen',
              orientation: 'portrait',
              background_color: '#12301f',
              theme_color: '#0a9c4a',
              icons: [
                { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,png,svg,webp,json}'],
              // Métricas só são baixadas por quem as usa (carregadas sob demanda, quando ligadas).
              globIgnores: ['**/telemetry-*.js'],
              // Patrocinadores e API sempre da rede (o jogo funciona offline sem eles).
              navigateFallbackDenylist: [/^\/api\//],
              runtimeCaching: [
                {
                  urlPattern: ({ url }) => url.pathname.startsWith('/sponsors/'),
                  handler: 'NetworkFirst',
                  options: { cacheName: 'sponsors', networkTimeoutSeconds: 3 },
                },
              ],
            },
          }),
        ]
      : []),
  ],
  test: {
    environment: 'node',
  },
});
