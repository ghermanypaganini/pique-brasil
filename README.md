# Pique-Brasil (Run Brazil)

Endless runner 3D de sátira política para navegador. Lule ou Bolsonero fogem da multidão do lado rival pelas ruas do Rio, catando dinheiro. Especificação completa em [`PRD.md`](PRD.md).

> Obra de sátira e paródia. Os personagens são caricaturas fictícias, sem vínculo com pessoas reais, partidos ou campanhas.

## Desenvolvimento

```bash
npm install
npm run dev            # http://localhost:5173 (as funções /api rodam no próprio Vite, ranking em memória)
npm test               # testes de lógica do jogo, do ranking e do patrocínio
npm run smoke          # teste no navegador (com o dev rodando em outro terminal)
npm run shots -- pasta # capturas de obstáculos, power-ups e eventos
```

**Testar no celular (mesma rede Wi-Fi):** `npm run dev -- --host` e abra no celular o endereço "Network" que aparecer (ex.: `http://192.168.0.10:5173`).

## Publicação

### 1. Vercel (site principal, com ranking e patrocínio)

1. Em vercel.com: **Add New → Project** → importe `ghermanypaganini/pique-brasil`. O `vercel.json` já define build e saída.
2. **Banco do ranking:** no projeto, aba **Storage → Create/Connect → Upstash Redis** (plano gratuito) e conecte ao projeto. A integração cria as variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN` (ou `UPSTASH_REDIS_REST_*`); o código aceita as duas.
3. **Settings → Environment Variables** (Production e Preview):
   - `RUN_SECRET`: texto aleatório longo (assina os tokens das partidas). Ex.: `openssl rand -hex 32`.
   - `ADMIN_KEY`: outra senha longa (moderação e números dos patrocinadores).
4. **Redeploy**. Cada `git push` na `main` publica sozinho.

Sem Redis ou sem `RUN_SECRET` em produção, o jogo funciona normalmente e o ranking aparece como "indisponível".

### 2. itch.io

```bash
npm run build:itch     # gera pique-brasil-itch.zip (API apontando para https://pique-brasil.vercel.app)
```

No itch.io: **Create new project → Kind of project: HTML** → envie o zip → marque *This file will be played in the browser* → tamanho do viewport 450 × 800 (retrato) e *Mobile friendly*. Se o endereço da Vercel for outro, gere com `VITE_API_BASE=https://seu-endereco.vercel.app npm run build:itch`.

### 3. Poki e CrazyGames

```bash
npm run build:poki         # pique-brasil-poki.zip
npm run build:crazygames   # pique-brasil-crazygames.zip
```

Esses builds carregam o SDK do portal e **desligam o patrocínio** (os portais proíbem anúncios de terceiros). Envie pelo painel de desenvolvedor de cada portal; ambos fazem avaliação antes de publicar. Confira na documentação atual de cada SDK se as chamadas em `src/services/portal.ts` continuam as mesmas.

## Métricas e erros (PostHog + Sentry)

Opcional: sem as chaves o jogo funciona igual, só sem métricas. Ligado só no site e no itch.io e nunca em `npm run dev`. Nos builds da Poki e da CrazyGames o código dos SDKs e as chaves nem entram no zip. No PWA, os SDKs não são baixados antecipadamente: só quando as métricas estão ligadas.

**Privacidade (LGPD):** eventos anônimos, sem nome nem apelido, sem cookies. O identificador da visita fica só na aba (`sessionStorage`, some ao fechar; sobrevive à recarga ao trocar o idioma). O único dado guardado no aparelho é o resumo de uma partida interrompida com a aba em segundo plano, enviado na abertura seguinte e apagado. Não há gravação de tela nem captura automática de cliques. O jogador pode desligar em **Configurações → Enviar estatísticas anônimas**. Os erros começam a ser capturados logo na abertura (antes do 3D), para pegar aparelhos sem WebGL.

1. **PostHog** (plano gratuito, 1 milhão de eventos/mês): crie o projeto e copie a *Project API key* (`phc_...`). Em **Project settings**, ligue **Discard client IP data**.
2. **Sentry** (plano gratuito): crie um projeto *Browser JavaScript* e copie o **DSN**. Em **Project settings → Security & Privacy**, ligue **Prevent storing of IP addresses**.
3. Na Vercel, **Settings → Environment Variables** (Production): `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` (`https://us.i.posthog.com` ou `https://eu.i.posthog.com`) e `VITE_SENTRY_DSN`. São chaves públicas, feitas para ficar no navegador. **Redeploy**.
4. Para o zip do itch.io, copie `.env.example` para `.env.local`, preencha e rode `npm run build:itch`.

**Eventos enviados:**

| Evento | Quando | Propriedades principais |
|---|---|---|
| `app_open` | jogo pronto | `boot_ms` (tempo até poder jogar, incluindo SDK do portal e patrocinadores, sem o mínimo de 4 s da tela de patrocínio), `language`, `language_switch` (recarga por troca de idioma), `returning`, `standalone` (PWA instalado) |
| `run_start` | início da partida | `character`, `run_index` (nº da partida na visita, mantido ao trocar o idioma), `best` |
| `run_end` | fim da partida | `ended` (`caught`, `quit`, `closed` = fechou a página, `abandoned` = o sistema fechou a aba em segundo plano), `cause` (obstáculo do último tropeço, `lunge` = investida, ou `pressure`), `duration_s`, `distance`, `score`, `money`, `continues`, `stumbles_light/strong`, `lunges`, `vorcanos`, `marteladas`, `biome`, `power_*`, `fps_avg`, `fps_low` (5% piores quadros) |

Todos levam `target` e `release` (commit). O PostHog acrescenta sistema, navegador e tipo de aparelho.

**Painéis sugeridos no PostHog** (metas da seção 2.2 do PRD): média de `duration_s` em `run_end` com `ended = caught` (meta 60–120 s) · `cause` em gráfico de barras (onde os jogadores são pegos) · máximo de `run_index` por visita (meta ≥ 3) · `fps_avg` e `fps_low` por tipo de aparelho · média de `boot_ms`.

## Patrocinadores

Veja [`public/sponsors/LEIA-ME.md`](public/sponsors/LEIA-ME.md): imagem na pasta + entrada no `sponsors.json` + commit. O e-mail do card "ANUNCIE AQUI" fica no campo `contact` do mesmo arquivo.

Números de um patrocinador:

```bash
curl -H "X-Admin-Key: $ADMIN_KEY" "https://pique-brasil.vercel.app/api/admin?sponsor=padaria-do-ze"
```

## Moderação do ranking

Remover um apelido de todos os rankings:

```bash
curl -X DELETE -H "X-Admin-Key: $ADMIN_KEY" "https://pique-brasil.vercel.app/api/admin?member=Apelido%231234"
```

O filtro de apelidos (palavrões, nomes de políticos, números de urna) fica em `src/shared/names.ts` e vale no jogo e no servidor.

## Estrutura

```
api/                Vercel Functions (ranking, patrocínio, moderação)
  _lib/             regras do ranking e acesso ao Redis (testadas sem Redis)
src/
  core/             loop de jogo e entrada (teclado, swipe)
  data/             balanceamento, trechos de pista, textos (i18n)
  world/            gerador de pista e superfícies
  systems/          lógica do jogo (sem Three.js; testável)
  render/           cena 3D, personagens, cenário do Rio, efeitos
  services/         áudio, ranking, patrocínio, salvamento, SDK dos portais
  shared/           código usado no jogo e no servidor (filtro de apelidos)
  ui/               HUD, menus, carregamento
public/             ícones do PWA e patrocinadores
scripts/            testes no navegador, ícones, builds e empacotamento
```
