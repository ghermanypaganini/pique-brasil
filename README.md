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
