# PRD — **Pique-Brasil** (en: *Run Brazil*) — Endless Runner Web

| Campo | Valor |
|---|---|
| Versão | 1.0 (v1 implementada; ver seção 16) |
| Data | 2026-10-21 |
| Autor | ghermanypaganini@gmail.com |
| Status | v1 implementada — falta publicar (seção 16.3) |

> **Decisões tomadas (v0.2):** 3D low-poly com Three.js · mobile primeiro, também desktop · projeto hobby/portfólio, sem monetização · v1 só local (sem backend).
>
> **Decisões tomadas (v0.3):** sátira política em tom cartoon · cenário: cidade brasileira com elementos do folclore · 2 personagens jogáveis (Lule e Bolsonero) · monstros = multidão da torcida rival, 4–5 conforme a tela · coletáveis: moedas, notas e maletas de dinheiro · câmera conforme proposta (seção 8.5).
>
> **Decisões tomadas (v0.4):** 3 faixas com troca de faixa (sem curvas) · colisão frontal = tropeço, não game over · "continuar" após ser pego, pago com moedas · monstros com comportamento igual · modo único infinito · aviso de sátira na tela inicial · sem texto nas faixas e sem bordões · Bolsonero de camisa amarela e relógio preto · lançamento público liberado.
>
> **Decisões tomadas (v0.5):** só retrato · pt-BR e en · acessibilidade incluída na v1 (seção 9.4) · classificação 12 anos · nome com referência ao Brasil (opções na seção 14, item 4).
>
> **Decisões tomadas (v0.6):** nome **Pique-Brasil** (en: *Run Brazil*) · "folclore" = personagens satíricos e populares: Careca de Toga, Saci, Vorcano, Bonecos de Olinda e Cuca · cenários: Rio de Janeiro e Brasília/Planalto, com bandeirinhas de festa junina e carro alegórico · obstáculos temáticos: bumba-meu-boi, boneco de Olinda, homem bêbado e polícia · Super Sprint com tema político.
>
> **Decisões tomadas (v0.7):** banqueiro com nome de paródia **Vorcano** · power-ups políticos confirmados: **Imunidade Parlamentar** (Super Sprint), **Habeas Corpus** (Escudo), **Emenda Pix** (Multiplicador) · todos os power-ups da lista 6.4 mantidos.
>
> **Decisões tomadas (v0.8):** **v1 em 3 dias** com escopo reduzido (seção 15) · desenvolvimento: você + Claude, arte com IA (seção 9.6) · assets conforme sugerido · PWA na v1 · gamepad pós-v1 · publicação: Vercel (principal) + itch.io, Poki e CrazyGames · **cards de patrocínio "ANUNCIE AQUI"** na tela de carregamento, mínimo 4 s (seção 10) · **ranking online só com nome, sem login** (seção 6.12). *Substitui "sem monetização" e "sem backend" da v0.2.*
>
> **Decisões tomadas (v0.9):** Placar da Torcida entra na v1 · endereço gratuito da Vercel (`pique-brasil.vercel.app`) · contato do "ANUNCIE AQUI" por e-mail.
>
> Todas as perguntas da seção 14 estão respondidas. Valores numéricos (custos, durações, distâncias) são pontos de partida e serão ajustados em playtest, nos arquivos de `data/`.

---

## 1. Visão geral

Um *endless runner* para navegador, inspirado em Subway Surfers, Temple Run e Minion Rush. O jogador controla um personagem que corre automaticamente por uma pista de 3 faixas, desviando de obstáculos e coletando recompensas. **Diferencial:** um grupo de monstros persegue o jogador o tempo todo. A velocidade é a arma do jogador — coletar recompensas acelera a corrida e afasta os monstros; errar faz o jogador tropeçar, perder velocidade e deixar os monstros se aproximarem.

**Pitch em uma frase:** "Corra mais rápido que os monstros — cada moeda te dá fôlego, cada tropeço te deixa ao alcance deles."

**Tema:** sátira política brasileira em tom cartoon. O jogador escolhe um político caricato e foge pelas ruas de uma cidade brasileira da multidão de apoiadores do lado rival, catando dinheiro pelo caminho.

## 2. Objetivos

### 2.1 Objetivos do produto
- Jogo jogável direto no navegador, sem instalação, carregando em poucos segundos.
- Sessões curtas (1–5 min) com alta rejogabilidade ("só mais uma").
- Funcionar bem em celular (toque/swipe) e desktop (teclado). **Prioridade: mobile primeiro.**

### 2.2 Métricas de sucesso (pós-lançamento)
| Métrica | Meta inicial |
|---|---|
| Tempo até a primeira jogada (carregamento) | < 5 s em 4G |
| FPS | 60 fps em desktop médio; ≥ 30 fps estável em celular intermediário (ex.: 3–4 anos de uso) |
| Duração média da partida | 60–120 s |
| Partidas por sessão | ≥ 3 |
| Lighthouse Performance (mobile) | ≥ 85 |

### 2.3 Fora de escopo (v1)
- Multiplayer em tempo real.
- Apps nativos nas lojas (pode vir depois via PWA/Capacitor).
- Editor de fases.
- Login/contas de usuário (o ranking usa só nome).
- Tudo o que está marcado como **v1.1** na seção 15.

## 3. Público-alvo
- Jogadores casuais, 10–35 anos, acostumados a jogos mobile de corrida infinita.
- Sessões rápidas em intervalos (transporte, pausas).
- Público com interesse em humor político brasileiro (memes, sátira).
- **Classificação etária: 12 anos.** Conteúdo compatível: humor cartoon, sem violência explícita, sem palavrões, sem conteúdo ofensivo a grupos.

## 4. Referências
| Jogo | O que aproveitar |
|---|---|
| Subway Surfers | 3 faixas, pular/rolar, power-ups, perseguidor (o guarda), visual colorido |
| Temple Run | Perseguição por monstros, tensão constante, curvas |
| Minion Rush | Variedade de cenários e eventos especiais |
| Crossy Road | Monetização leve via personagens colecionáveis |

## 5. Core loop

```
Iniciar corrida → Correr / desviar / coletar → Velocidade e distância aumentam
      ↑                                               ↓
Gastar moedas (skins, upgrades)  ←  Fim de jogo (monstros alcançam) → [Continuar com moedas?]
```

**Meta loop:** missões diárias → moedas/recompensas → desbloquear personagens e upgrades de power-ups → correr mais longe → recordes no ranking.

## 6. Mecânicas de jogo

### 6.1 Movimento
Pista reta de **3 faixas com troca de faixa** (estilo Subway Surfers). Sem curvas de 90°.

| Ação | Teclado | Toque |
|---|---|---|
| Trocar de faixa | ← / → ou A / D | Swipe horizontal |
| Pular | ↑ / W / Espaço | Swipe para cima |
| Rolar / deslizar | ↓ / S | Swipe para baixo |
| Pausar | Esc / P | Botão na tela |

- Corrida automática para frente.
- 3 faixas fixas.
- Rolar no ar = queda rápida (*fast fall*), como em Subway Surfers.
- Input em buffer (~150 ms) para que comandos dados um pouco antes da hora não sejam perdidos.

### 6.2 Sistema de perseguição (diferencial)
Os monstros são representados por uma **distância de perseguição** (0–100):

| Evento | Efeito |
|---|---|
| Correr normalmente | Distância se mantém ou cresce devagar |
| Coletar recompensa de velocidade | +distância (monstros ficam para trás) |
| Tropeço leve (bater de raspão em obstáculo lateral ou baixo) | −distância grande + perda temporária de velocidade |
| Tropeço forte (colisão frontal com obstáculo grande) | −distância maior que o tropeço leve + queda forte de velocidade; personagem cambaleia e é empurrado para a faixa livre mais próxima |
| Distância chega a 0 | **Game over** (monstros alcançam o jogador) — única forma de perder |

- **Não existe morte instantânea.** Toda colisão vira tropeço; quem "mata" é a multidão. Dois tropeços fortes seguidos devem bastar para zerar a distância a partir de um valor médio (balanceamento em `data/`).
- Após qualquer tropeço: ~1 s de invulnerabilidade (personagem pisca) para evitar perder distância duas vezes no mesmo obstáculo.
- O Escudo absorve um tropeço (leve ou forte) sem perda de distância.
- Feedback visual: monstros aparecem na tela/câmera quando a distância está baixa; tela treme e vinheta vermelha quando estão perto.
- Feedback sonoro: rugidos e passos ficam mais altos conforme se aproximam.
- Os monstros podem ter "investidas" em momentos aleatórios, exigindo boost para escapar (evento de tensão).

### 6.3 Velocidade
- Velocidade base aumenta gradualmente com a distância percorrida (curva de dificuldade).
- **Recompensas de velocidade** dão um *boost* temporário somado à base.
- Limite de velocidade máxima para manter o jogo jogável.
- Tensão de design: correr mais rápido afasta os monstros, mas deixa menos tempo para reagir aos obstáculos.

### 6.4 Coletáveis e power-ups (proposta inicial)

**Dinheiro (coletável principal)** — três níveis, todos somam ao saldo de moedas:

| Item | Valor | Ganho de distância | Frequência | Visual |
|---|---|---|---|---|
| Moeda | 1 | pequeno | Muito comum, em fileiras/arcos | Moeda dourada girando |
| Nota de dinheiro | 5 | médio | Comum, em grupos menores e trechos mais difíceis | Nota verde/colorida flutuando, balançando ao vento |
| Maleta de dinheiro | 50 | grande + boost curto de velocidade (~1,5 s) | Rara (≈ 1 a cada 30–45 s), em posições arriscadas (em cima de veículos, após rampas) | Maleta preta que se abre soltando notas ao ser coletada |

- Ao coletar uma maleta, a câmera faz um leve *punch* de FOV e as notas "explodem" na tela (partículas baratas).
- Valores e frequências ficam em `data/` para balanceamento.

**Power-ups:**

| Item | Efeito | Duração |
|---|---|---|
| Energia / Raio | Boost de velocidade | 3–5 s |
| Ímã | Atrai moedas das 3 faixas | 10 s |
| Tênis turbo / Pulo duplo | Pulos mais altos | 10 s |
| Escudo | Absorve 1 colisão | Até ser usado |
| Multiplicador | Pontos ×2 | 15 s |
| Super Sprint | Invencível, corre sozinho em alta velocidade, monstros somem da tela | 5 s |

Os níveis dos power-ups podem ser melhorados com moedas (aumenta a duração).

**Tema dos power-ups** (só visual e nome, mecânica igual):

| Power-up | Versão temática | Status |
|---|---|---|
| Energia / Raio | Cafezinho / guaraná | Proposta |
| Ímã | Redemoinho do Saci — um redemoinho acompanha o personagem e suga o dinheiro das 3 faixas | Proposta |
| Pulo duplo | Sandália de mola | Proposta |
| Escudo | **Habeas Corpus** — um papel carimbado flutua em volta do personagem e "anula" o próximo tropeço | ✅ |
| Multiplicador | **Emenda Pix** — dinheiro vale ×2 | ✅ |
| Super Sprint | **Imunidade Parlamentar** — o personagem entra num carro oficial preto com batedores e sirene, atravessa tudo em alta velocidade e a multidão fica para trás | ✅ |

Opções descartadas para o Super Sprint (podem virar skins ou power-ups pós-v1): Foro Privilegiado · Jatinho da FAB · Carreata.

### 6.5 Obstáculos (temáticos de cidade brasileira)
| Tipo | Como desviar | Exemplos no cenário |
|---|---|---|
| Barreira baixa | Pular ou rolar | Cone, cavalete de obra, carrinho de picolé, caixa de isopor |
| Barreira alta (passagem por baixo) | Rolar | Faixa/banner esticado entre postes, toldo de barraca de feira |
| Bloco grande / veículo parado | Trocar de faixa ou subir nele | Ônibus, kombi, banca de jornal, carro de som |
| Veículo em movimento (vindo de frente) | Trocar de faixa | Ônibus, moto de entregador, carroça |
| Buraco / vão | Pular | Buraco no asfalto, bueiro aberto, obra |
| Rampa | Sobe para a camada superior | Rampa de caçamba, escada de passarela, toldos, carro alegórico (sobe pela traseira e corre por cima) |

**Obstáculos temáticos (destaque da v1)** — convivem com os obstáculos urbanos genéricos acima, para dar variedade:

| Obstáculo | Tipo | Comportamento | Como desviar |
|---|---|---|---|
| **Bumba-meu-boi** | Móvel | Atravessa a pista de lado, dançando de uma faixa para outra; aviso pelo som de tambor antes de aparecer | Trocar de faixa no tempo certo ou pular |
| **Boneco de Olinda** | Alto, parado ou balançando | Boneco gigante de braços abertos ocupando 1–2 faixas | Rolar entre as pernas ou trocar de faixa |
| **Homem bêbado** | Móvel, imprevisível | Anda em zigue-zague lento entre faixas, segurando uma garrafa (sem rótulo de marca) | Trocar de faixa ou pular por cima |
| **Polícia** | Barreira | Blitz com cavaletes e um policial cartoon apitando; às vezes uma viatura parada ao lado | Pular o cavalete ou trocar para a faixa livre |

- Tom cartoon e sem ofensa: o bêbado é um personagem cômico estilo desenho animado; a polícia apita e gesticula, sem armas visíveis (compatível com 12 anos).
### 6.6 Personagens jogáveis
Na v1 há **2 personagens**, escolhidos na tela inicial. A escolha define também quem são os monstros (seção 6.7). Os nomes são paródias; as aparências são caricaturas inspiradas em figuras públicas.

| | **Lule** | **Bolsonero** |
|---|---|---|
| Referência de caricatura | Luiz Inácio Lula da Silva | Flávio Bolsonaro |
| Idade aparente | Velho | Mais novo |
| Rosto | Barba e cabelo brancos | Sem barba |
| Cabelo | Branco | Curto, penteado para o lado |
| Roupa | Terno vermelho | Camisa amarela |
| Acessório | Chapéu panamá | Relógio preto |
| Cor de destaque | Vermelho | Amarelo |
| Proposta de corrida | Passo mais pesado, segura o chapéu com a mão no pulo | Corrida ereta, braços mais duros, ajeita o cabelo no rolamento |

- Proporções cartoon: cabeça grande (~1/3 da altura), mãos e pés grandes, silhueta reconhecível de longe e de costas (a câmera mostra o personagem de costas a maior parte do tempo — chapéu e terno vermelho do Lule e o cabelo/camisa amarela do Bolsonero precisam ser legíveis por trás).
- Animações mínimas por personagem: correr, pular, rolar, trocar de faixa (inclinação), tropeçar, ser pego (game over), idle na tela de seleção, comemoração (recorde).
- Os dois têm a mesma *hitbox* e os mesmos atributos (sem vantagem de jogo).
- **Sem bordões nem falas.** A personalidade vem só da animação e de efeitos sonoros genéricos (grunhidos, "ufa"); nenhuma voz real ou sintetizada imitando as pessoas.

### 6.7 Monstros (multidão perseguidora)
Os "monstros" são uma **multidão de apoiadores do lado rival**, em tom cartoon (exagerados e cômicos, não assustadores):

| Personagem escolhido | Perseguidores |
|---|---|
| Lule | Pessoas vestidas de **verde e amarelo**, com bandeiras e faixas verde-amarelas |
| Bolsonero | Pessoas vestidas de **vermelho**, com bandeiras e faixas vermelhas |

- **Quantidade:** 4 ou 5 perseguidores visíveis, conforme o tamanho/proporção da tela:
  - Tela estreita (celular em retrato, largura < ~500 px CSS): **4**.
  - Tela mais larga (tablet, desktop, paisagem): **5**.
  - Regra calculada no início da partida e ao redimensionar; não afeta a jogabilidade (a perseguição continua sendo a "distância" da seção 6.2), só o visual.
- **Variação visual barata:** um único modelo base de "manifestante" com variações por cor de pele, cabelo, boné/chapéu, óculos, tipo de bandeira/faixa e escala leve (0,9–1,1). Trocar o material/paleta entre as duas torcidas em vez de ter dois conjuntos de modelos.
- **Props:** bandeira em mastro (balança com a corrida — animação por *vertex shader* ou osso simples), faixa segurada por dois perseguidores, apito, megafone.
- **Faixas e bandeiras sem texto:** só cores e formas (listras, estrelas, losango estilizado). Os balões dos perseguidores usam apenas símbolos ("!!!", "?!").
- **Comportamento igual para todos:** sem tipos diferentes (rápido, que pula, chefe). A multidão age como um bloco controlado pela distância de perseguição.
- **Comportamento visual:** correm em formação solta atrás do jogador; quando a distância é baixa, entram na câmera, gritam (balões "!!!") e esticam os braços; numa "investida" (seção 6.2) a multidão acelera e um deles pula à frente.
- **Game over:** a multidão alcança e "engole" o personagem num amontoado cômico (nuvem de poeira estilo desenho animado, bandeiras saindo do bolo) — sem violência explícita.
- **Áudio:** coro de gritos/apitos/vuvuzela que aumenta com a proximidade (substitui os "rugidos" da seção 8).

### 6.8 Geração de pista
- Pista feita de **chunks** (blocos pré-desenhados) combinados por um gerador procedural.
- Cada chunk tem dificuldade; o gerador sorteia chunks conforme a distância.
- Regra obrigatória: sempre existe pelo menos um caminho possível (validação no gerador).
- *Object pooling* para obstáculos, moedas e cenário (evita travadas por coleta de lixo).

### 6.9 Pontuação
- Pontos = distância × multiplicador + moedas.
- Multiplicador permanente aumenta com missões cumpridas.
- Recorde local (localStorage) + ranking online (seção 6.12).

### 6.10 Continuar
Quando a multidão alcança o jogador, aparece a tela **"Continuar?"** com contagem regressiva de 5 s.

| Regra | Valor proposto |
|---|---|
| Pagamento | Moedas do saldo (sem anúncios, já que não há monetização) |
| Custo | Dobra a cada uso na mesma partida: 200 → 400 |
| Limite | 2 continuações por partida |
| Ao continuar | Distância de perseguição volta para 50, multidão é empurrada para fora da tela, 2 s de invulnerabilidade, velocidade volta à base atual |
| Sem saldo | Botão desabilitado, mostrando quanto falta |

- Pontos e moedas da partida são mantidos ao continuar.
- Custos e limites em `data/` para balanceamento.
- **[Pós-v1]** Uma moeda especial rara (ex.: "Santinho" ou "Figa") pode substituir as moedas no continuar.

### 6.11 Modo de jogo
Modo único: **corrida infinita**. Fases com fim e chefes estão fora da v1.

### 6.12 Ranking online (sem login)
- **Identificação:** o jogador informa só um **apelido** na primeira vez que for enviar uma pontuação. Fica salvo no localStorage e pode ser trocado em Configurações.
  - 3 a 16 caracteres (letras, números, espaço, `_` e `-`).
  - Filtro de palavrões (pt/en) e de nomes reais de políticos (evita uso do ranking como campanha).
  - Para diferenciar nomes iguais, o jogo gera uma tag curta (ex.: `Zé#4821`) guardada no aparelho.
- **Envio:** ao fim da partida (depois de recusar ou esgotar o "Continuar"), a pontuação é enviada automaticamente se houver apelido; sem internet, fica na fila e é enviada depois.
- **Abas do ranking:**

| Aba | Conteúdo |
|---|---|
| Semanal | Top 100 da semana (zera segunda-feira 00:00, horário de Brasília) — aba padrão, mais fácil de entrar |
| Geral | Top 100 de todos os tempos |
| Por personagem | Top 100 jogando de Lule e Top 100 jogando de Bolsonero |
| **Placar da Torcida** | Soma da distância percorrida por todos os jogadores de cada personagem na semana: "Time Lule × Time Bolsonero". Só diversão, sem caráter de pesquisa |

- O jogador sempre vê **a própria posição**, mesmo fora do top 100.
- **Antitrapaça básica** (sem login não dá para ser perfeito):
  - O servidor entrega um *token* assinado no início de cada partida; o envio só é aceito com token válido e uma única vez.
  - Validação de plausibilidade: pontos e moedas compatíveis com a duração da partida.
  - Limite de envios por IP (ex.: 30/hora).
  - Rota de administração protegida por senha para apagar pontuações e apelidos.
- **Privacidade (LGPD):** armazena só apelido, pontuação, personagem, data e um *hash* do IP (para limite de envio, descartado após 7 dias). Aviso curto na tela de apelido.

## 7. Progressão e meta-jogo
- **Moedas:** moeda comum do jogo.
- **Personagens/skins:** Lule e Bolsonero liberados desde o início. Skins desbloqueáveis com moedas (cosmético), ex.: Lule de camisa listrada, Bolsonero de terno, versões "festa junina". Novos personagens ficam para depois da v1.
- **Upgrades:** duração dos power-ups.
- **Missões:** 3 ativas por vez ("colete 500 moedas", "role 20 vezes", "escape de 3 investidas").
- **Desafio diário:** recompensa por login/jogo diário.
- **Salvar progresso:** localStorage na v1 (com versão do formato de save). Nuvem fica para depois.

## 8. Direção de arte e áudio
### 8.1 Estilo
3D *low-poly* com acabamento **cartoon**: cores chapadas e saturadas, *toon shading* (2–3 faixas de luz via `MeshToonMaterial`) e contorno preto opcional nos personagens (técnica de casco invertido; desligado na qualidade baixa). Legível em telas pequenas. Iluminação simples (luz direcional + ambiente, *blob shadows*).

### 8.2 Cenários — Rio de Janeiro e Brasília
A corrida alterna entre **dois cenários (biomas)**, trocando a cada ~1.500 m com um chunk de transição (ex.: túnel ou viaduto). A ordem começa sempre no Rio.

| | **Rio de Janeiro** | **Brasília / Planalto** |
|---|---|---|
| Chão | Asfalto e calçadão de pedra portuguesa com ondas preto-e-brancas | Avenida larga (Eixo Monumental), gramado e espelho d'água nas laterais |
| Laterais | Orla com palmeiras e quiosques, sobrados coloridos, morros com casinhas, bancas, botecos | Prédios da Esplanada dos Ministérios, Congresso (cúpulas e torres gêmeas), Palácio do Planalto com suas colunas |
| Fundo | Cristo Redentor e Pão de Açúcar no horizonte | Céu enorme do cerrado, Catedral de Brasília |
| Luz | Sol forte, céu azul | Fim de tarde alaranjado |
| Elementos | Carros alegóricos estacionados ou desfilando, bonecos de Olinda de bloco de carnaval | Rampa do Planalto, carros oficiais pretos, bandeirinhas em quermesse |

**Elementos comuns aos dois cenários:**
- **Bandeirinhas de festa junina** atravessando a rua em alguns trechos.
- **Carro alegórico:** decoração grande na lateral e, em alguns chunks, rampa para a camada superior (seção 6.5).

### 8.2.1 "Folclore" — personagens satíricos e populares
Figuras que aparecem durante a corrida como **eventos, easter eggs e decoração**. Nenhum deles persegue o jogador (quem persegue é só a multidão) e todos agem igual para os dois personagens.

| Personagem | Papel | O que faz |
|---|---|---|
| **Careca de Toga** (homem careca de toga preta e martelo de juiz) | Evento "Martelada" | Aparece num púlpito à frente, bate o martelo e uma das faixas é interditada por fita zebrada por alguns segundos; o jogador vê o aviso ~2 s antes |
| **Saci** | Easter egg + power-up | Aparece de relance em becos e pulando num pé só no meio da multidão; é o tema do Ímã (Redemoinho do Saci) |
| **Vorcano** (banqueiro de terno, cartoon; paródia de Daniel Vorcaro) | Evento "Chuva de Maletas" | Passa num carro-forte ou jatinho jogando maletas de dinheiro na pista por alguns segundos — trecho bônus raro |
| **Bonecos de Olinda** | Decoração + obstáculo | Dançam nas calçadas em trechos de carnaval; também viram obstáculo (seção 6.5) |
| **Cuca** (a vilã do Sítio do Picapau Amarelo, jacaré com cabelo loiro) | Alerta de investida | Sua risada e sua sombra anunciam as "investidas" da multidão (seção 6.2); ela aparece voando na vassoura no alto da tela |

- **[Pós-v1]** Biomas extras: praia/orla à noite, favela com escadarias, Sambódromo, Amazônia.

### 8.3 Personagens e monstros
Ver seções 6.6 e 6.7. Caricatura exagerada e bem-humorada; os dois lados recebem o mesmo tratamento visual e o mesmo nível de humor (simetria da sátira).

### 8.4 UI/HUD
Pontuação, saldo de dinheiro (ícone de moeda/nota), power-ups ativos com barra de tempo, indicador de distância da multidão (ícone de bandeira da cor rival que se aproxima do ícone do personagem). Tela inicial com seleção de personagem lado a lado (vermelho × amarelo).

**Aviso de sátira** — exibido na primeira abertura do jogo (botão "Entendi") e sempre disponível em "Sobre":
> *"Este jogo é uma obra de sátira e paródia, feita para humor. Os personagens são caricaturas fictícias e não têm vínculo com pessoas reais, partidos ou campanhas. Nenhum lado é apoiado ou atacado."*

### 8.5 Câmera (conforme proposto)
- Terceira pessoa, atrás e acima do personagem, com leve inclinação para baixo (~15–20°).
- Segue o personagem na troca de faixa com suavização (*lerp*), sem girar.
- Recua levemente e abre o FOV com velocidade alta e no boost (sensação de velocidade); *punch* de FOV ao pegar maleta.
- Quando a multidão está perto, a câmera inclui os perseguidores no quadro inferior e treme levemente (com opção de reduzir tremor — seção 9.4).
- No game over, corte rápido para uma vista lateral/frontal mostrando a multidão alcançando o personagem.

### 8.6 Áudio
Trilha dinâmica com cara de música brasileira (ex.: forró/frevo/samba instrumental acelerado; intensidade aumenta com a proximidade da multidão). Efeitos: moeda (tilintar), nota (papel), maleta (caixa registradora), pulo, rolagem, colisão, coro de gritos/apitos/vuvuzela da multidão.

## 9. Requisitos técnicos

### 9.1 Stack recomendada (proposta)
| Camada | Escolha | Motivo |
|---|---|---|
| Linguagem | TypeScript | Segurança de tipos, manutenção |
| Build | Vite | Rápido, bom para jogos web |
| Renderização 3D | **Three.js** | Leve, ecossistema enorme, ideal para runner 3D low-poly |
| Física/colisão | AABB própria (caixas) | Runner não precisa de física completa; mais performático |
| Áudio | Howler.js | Compatibilidade entre navegadores e mobile |
| UI de menus | HTML/CSS sobre o canvas (ou Preact leve) | Menus simples, acessíveis |
| Modelos 3D | glTF/GLB com compressão Draco/Meshopt e texturas KTX2 | Tamanho reduzido |
| Testes | Vitest (lógica) + Playwright (smoke test no navegador) | |
| Backend | **Vercel Functions** (API do ranking e contagem de impressões dos patrocinadores) + **Upstash Redis** (plano gratuito via Vercel Marketplace; *sorted sets* são ideais para ranking) | Sem servidor para manter; mesmo deploy do jogo |
| Hospedagem | **Vercel** (principal, em `pique-brasil.vercel.app`) + builds para itch.io, Poki e CrazyGames | Ver seção 9.7 |
| PWA | `vite-plugin-pwa`: manifest, ícones, service worker para jogar offline e "instalar" no celular | Na v1 |

### 9.2 Requisitos não funcionais
- Download inicial ≤ 10 MB; resto carregado sob demanda.
- Funcionar em Chrome, Safari (iOS), Firefox, Edge — últimas 2 versões.
- Pausa automática quando a aba perde foco.
- Ajuste automático de qualidade (resolução/sombras) conforme o FPS.
- **Orientação: só retrato.** No celular, ao girar para paisagem aparece a mensagem "Gire o celular" (e o jogo pausa). No desktop, a área de jogo é um quadro em retrato (9:16) centralizado, com fundo decorativo nas laterais.
- Áreas de toque e HUD respeitando *safe areas* (notch).

### 9.3 Idiomas
- **Português (pt-BR)** e **inglês (en)** na v1.
- Idioma inicial detectado pelo navegador (`navigator.language`); troca manual em Configurações, salva no localStorage.
- Todos os textos em arquivos `data/i18n/pt-BR.json` e `data/i18n/en.json`; nenhum texto fixo no código.
- Nomes dos personagens não mudam (Lule e Bolsonero); o aviso de sátira é traduzido.
- HUD usa números e ícones sempre que possível, para reduzir texto.

### 9.4 Acessibilidade
| Recurso | Descrição |
|---|---|
| Reduzir tremor de tela | Liga/desliga o tremor da câmera e reduz o *punch* de FOV |
| Reduzir flashes e partículas | Diminui piscadas (invulnerabilidade), explosão de notas e vinheta |
| Modo daltônico | Itens, obstáculos e power-ups se distinguem por **forma e ícone**, não só por cor. Paletas alternativas para deuteranopia/protanopia/tritanopia — importante porque vermelho × verde/amarelo é a base visual do jogo |
| Sinais visuais para sons | Indicador na tela da proximidade da multidão (não depende de ouvir os gritos) |
| Volumes separados | Música, efeitos e multidão, cada um com seu controle |
| Controles remapeáveis | Teclado no desktop |
| Controle alternativo no toque | Opção de botões na tela em vez de swipe; ajuste de sensibilidade do swipe |
| Tamanho do HUD/texto | Normal e grande |
| Modo assistido | Multidão mais lenta e velocidade máxima menor (não conta para recordes) |
| Pausa a qualquer momento | Inclusive ao perder o foco |

### 9.5 Arquitetura (alto nível)
```
src/
  core/        loop do jogo, tempo fixo, input, eventos
  world/       gerador de chunks, pooling, cenário
  entities/    jogador, monstros, obstáculos, coletáveis
  systems/     movimento, colisão, perseguição, power-ups, pontuação
  render/      cena Three.js, câmera, efeitos
  audio/       gerenciador de som/trilha dinâmica
  ui/          HUD, menus, loja, missões
  data/        definições de chunks, power-ups, personagens (JSON)
  services/    save local, analytics, cliente do ranking, patrocinadores
api/           Vercel Functions: /api/run/start, /api/score, /api/leaderboard, /api/sponsor-impression
public/
  sponsors/    sponsors.json + imagens dos patrocinadores (seção 10)
```
- Lógica de jogo separada da renderização (facilita testes e ajustes de balanceamento).
- Parâmetros de balanceamento em arquivos de dados, não no código.

### 9.6 Ferramentas de IA e assets externos
| Necessidade | Ferramenta sugerida | Observação |
|---|---|---|
| Personagens e multidão na v1 | **Modelados por código** no Three.js (formas low-poly: cabeça, chapéu, barba, terno) com animação procedural | Mais rápido e consistente para 3 dias; sem *rigging*. Substituídos por modelos de IA na v1.1 se valer a pena |
| Arte 2D (logo, tela de carregamento, retratos da seleção, ícones, card "ANUNCIE AQUI", capa para itch.io/portais) | **Higgsfield** (já conectado nesta sessão) ou Midjourney / Ideogram (bom para texto em logo) | Descrever como caricatura cartoon, sem citar nomes reais — várias ferramentas recusam pessoas reais |
| Modelos 3D (v1.1) | **Meshy** ou **Tripo3D** (imagem → GLB com *auto-rig*); Higgsfield `generate_3d` | Reduzir polígonos e comprimir (gltf-transform) |
| Animações (v1.1) | **Mixamo** (gratuito) | Correr, pular, rolar, tropeçar |
| Cenário e props | **Kenney** e **Quaternius** (CC0) | Cidade, carros, mobiliário urbano |
| Música | **Pixabay Music** (livre) ou **Suno** (exige plano pago para uso comercial) | Forró/frevo/samba instrumental |
| Efeitos sonoros | **jsfxr** (gerado no navegador), **Freesound** (CC0), **ElevenLabs Sound Effects** | Moeda, pulo, apito, vuvuzela |
| Ícones do PWA | **pwa-asset-generator** (a partir do logo) | |

### 9.7 Publicação e builds
| Destino | Build | Patrocínio | Ranking | Observação |
|---|---|---|---|---|
| **Vercel** (principal) | `build:web` | Ligado | Ligado | PWA instalável; endereço `pique-brasil.vercel.app` (domínio próprio pode ser ligado depois sem mudar nada no jogo) |
| **itch.io** | `build:itch` (zip HTML5) | Ligado | Ligado (chama a API da Vercel) | Aceita publicação imediata |
| **Poki** | `build:poki` + Poki SDK | **Desligado** | A confirmar | Exige SDK próprio e, em geral, proíbe anúncios e links externos de terceiros; passa por avaliação (semanas) e pode recusar conteúdo político/pessoas reais |
| **CrazyGames** | `build:crazygames` + CrazyGames SDK | **Desligado** | A confirmar | Mesmas restrições de anúncios externos; avaliação antes de publicar |

- Uma variável de build (`VITE_TARGET=web|itch|poki|crazygames`) liga/desliga patrocínio, ranking, PWA e o SDK de cada portal. O jogo é o mesmo em todos.
- As submissões para Poki e CrazyGames podem ser enviadas no dia 3, mas a aprovação não depende de nós e não cabe no prazo.

## 10. Patrocínio ("ANUNCIE AQUI")
Única forma de receita da v1. Moedas do jogo continuam sendo obtidas só jogando.

### 10.1 Tela de carregamento com patrocinadores
- Ao abrir o jogo, a tela de carregamento fica visível **por no mínimo 4 s**, mesmo que o carregamento termine antes. Se demorar mais, fica até terminar.
- Exibe **1 card grande** de patrocinador (ou 2 cards alternando a cada 2 s se houver mais de um ativo), com a etiqueta **"Patrocínio"** visível (transparência exigida pelo CONAR).
- **Sem patrocinador ativo:** mostra o card **"ANUNCIE AQUI"** com o texto "Sua marca no Pique-Brasil" e um botão de contato por **e-mail** (`mailto:` com assunto "Anunciar no Pique-Brasil"), definido no campo `contact` do `sponsors.json`.
- Clique no card abre o site do patrocinador numa nova aba, com `?utm_source=piquebrasil&utm_medium=loading`.
- Contagem de impressões e cliques por patrocinador (API da Vercel + Redis), para mostrar números a quem for anunciar.
- Desligado nos builds de Poki e CrazyGames (seção 9.7).

### 10.2 Como adicionar um patrocinador (sem mexer no código)
1. Colocar a imagem em `public/sponsors/` (PNG/WebP, 1080×1350, até 200 KB).
2. Adicionar uma entrada em `public/sponsors/sponsors.json`:

```json
{
  "contact": "CONTATO_A_DEFINIR@exemplo.com",
  "sponsors": [
    {
      "id": "padaria-do-ze",
      "name": "Padaria do Zé",
      "image": "/sponsors/padaria-do-ze.webp",
      "url": "https://padariadoze.com.br",
      "weight": 2,
      "start": "2026-11-01",
      "end": "2026-11-30",
      "locales": ["pt-BR"]
    }
  ]
}
```

3. Fazer o deploy (commit → a Vercel publica sozinha).

- `weight`: chance relativa de aparecer; `start`/`end`: período da campanha; `locales`: idiomas em que aparece (vazio = todos).
- O jogo valida o arquivo ao carregar; entrada inválida ou expirada é ignorada.

### 10.3 Sugestões de espaços extras (v1.1)
| Espaço | Descrição |
|---|---|
| **Outdoors no cenário** | Painéis nas laterais da rua e prédios exibindo a marca do patrocinador — encaixa naturalmente na cidade e não interrompe o jogo |
| Tela de fim de partida | Card pequeno "Patrocínio" abaixo da pontuação |
| Power-up patrocinado | Ex.: "Cafezinho oferecido por [marca]" |
| Ranking semanal patrocinado | "Ranking da semana oferecido por [marca]", com prêmio opcional ao 1º lugar (exige regulamento) |

## 11. Analytics e telemetria
- Eventos: início de partida, fim de partida (obstáculo do último tropeço, continuações usadas), personagem escolhido, distância, moedas, power-ups usados, tempo de carregamento, FPS médio.
- Uso: balanceamento (onde os jogadores morrem) e performance.
- Ferramenta sugerida (opcional para hobby): PostHog (plano gratuito). Erros: Sentry (plano gratuito).
- Consentimento conforme LGPD.
- **v1:** só os contadores de patrocínio e os dados do ranking. PostHog/Sentry ficam para a v1.1.

## 12. Roadmap

> Com o prazo de 3 dias, a v1 é um recorte de M0–M4 — ver seção 15. Esta tabela continua valendo como visão de longo prazo.

| Fase | Entregas | Critério de saída |
|---|---|---|
| **M0 — Protótipo (greybox)** | Pista com 3 faixas, cubos como obstáculos, pular/rolar/trocar faixa, colisão, game over | Jogável e divertido com formas simples |
| **M1 — Perseguição + velocidade** | Sistema de distância dos monstros, boosts, curva de dificuldade, gerador de chunks | O "loop de tensão" funciona |
| **M2 — Vertical slice** | Cenário do Rio com arte final (Brasília pode ficar para o M3), obstáculos temáticos, Lule e Bolsonero animados, multidão (4–5) nas duas paletas, moedas/notas/maletas, áudio, HUD, menu com seleção de personagem | Parece um jogo de verdade |
| **M3 — Conteúdo e meta** | Power-ups completos, loja, personagens, missões, save | Rejogabilidade |
| **M4 — Polimento e lançamento** | Performance mobile, PWA, analytics, deploy (Vercel + itch.io) | Metas da seção 2.2 atingidas |
| **Pós-lançamento** | Novos cenários, eventos sazonais, novos monstros | — |

## 13. Riscos
| Risco | Mitigação |
|---|---|
| Performance ruim em celulares fracos | Low-poly, pooling, qualidade adaptativa, testar cedo em aparelho real |
| Safari/iOS (áudio, WebGL, tela cheia) | Testes em iOS desde o M0; Howler.js; desbloquear áudio na primeira interação |
| Produção de arte 3D (personagem + animações) consome muito tempo | Usar packs CC0 (Kenney, Quaternius) + Mixamo + geração com IA para protótipos |
| Semelhança excessiva com Subway Surfers (marca registrada) | Identidade própria (tema, monstros, personagem); não usar nomes/assets da marca |
| Balanceamento da perseguição frustrante | Parâmetros em dados + telemetria + playtests |
| **Uso de imagem de pessoas reais (direito de imagem/personalidade)** | Nomes de paródia (Lule, Bolsonero), caricatura claramente exagerada, aviso "obra de sátira/paródia, sem vínculo com as pessoas retratadas" na tela inicial; não usar fotos, voz real nem voz sintetizada imitando as pessoas |
| **Personagens secundários reais (Careca de Toga, Vorcano)** — o banqueiro é pessoa privada envolvida em investigação em andamento, com risco maior de ação por difamação do que figuras políticas | Careca de Toga sem nome. Banqueiro com nome de paródia **Vorcano**. Nenhum texto acusando crime; o humor fica no visual (maletas, carro-forte), sem afirmar fatos |
| **Legislação eleitoral** (Lei 9.504/97 e resoluções do TSE sobre propaganda e conteúdo com IA) | **Decisão: lançamento público liberado** — sátira simétrica, sem ataque a nenhum lado. O 2º turno é em 25/10/2026, antes de qualquer lançamento realista. Manter: sem slogans, números de urna, pedidos de voto ou referências a campanha; sem textos nas faixas; sem imagens realistas das pessoas geradas por IA |
| **Políticas de plataformas/portais** (itch.io, Poki, CrazyGames, lojas de apps costumam restringir conteúdo político e de pessoas reais) | Hospedagem própria (Vercel/Cloudflare) como canal principal; checar termos de cada portal antes de publicar; manter personagens em dados para poder trocar por personagens fictícios se necessário |
| **Reação negativa / polarização** (comentários, denúncias, ataques ao autor) | Humor que satiriza os dois lados por igual; sem conteúdo ofensivo a grupos; sem chat |
| **Prazo de 3 dias** | Escopo cortado (seção 15); personagens por código em vez de modelos de IA; corte de emergência definido com antecedência (seção 15.3) |
| **Apelidos ofensivos ou de campanha no ranking** | Filtro de palavras e de nomes de políticos, rota de moderação, limite de envio |
| **Trapaça no ranking** | Token por partida, validação de plausibilidade, limite por IP; aceitar que sem login não há proteção total |
| **Patrocínio × regras dos portais** | Patrocínio só nos builds Vercel e itch.io; desligado em Poki e CrazyGames |
| **Patrocinador associado a sátira política** | Deixar claro na proposta comercial que o jogo é sátira; patrocinador pode escolher idiomas e períodos em que aparece |
| **Limites dos planos gratuitos** (Vercel, Upstash) | Ranking em cache por 30 s no CDN; contadores agregados; monitorar uso |

## 14. Perguntas em aberto

### Visão e escopo
1. ~~Qual é o objetivo do projeto: hobby/portfólio, aprendizado, ou produto comercial?~~ ✅
2. ~~Prazo?~~ ✅ v1 em 3 dias (seção 15).
3. ~~Quem desenvolve?~~ ✅ Você + Claude, com IA para arte (seção 9.6).
4. ~~Qual é o nome do jogo?~~ ✅ **Pique-Brasil** (en: *Run Brazil*).

### Tema e arte
5. ~~Qual estilo visual: 3D low-poly, 3D cartoon detalhado, 2D pseudo-3D ou pixel art?~~ ✅
6. ~~Qual o tema/cenário?~~ ✅ Cidade brasileira com folclore.
7. ~~Como são os monstros? Quantos? Tom?~~ ✅ Multidão rival, 4–5, cartoon. *Faixa etária ainda em aberto (seção 3).*
8. ~~Quem é o protagonista? Haverá vários personagens jogáveis?~~ ✅ Lule e Bolsonero.
8a. ~~Textos das faixas e bordões?~~ ✅ Nenhum.
8b. ~~Acessório do Bolsonero?~~ ✅ Relógio preto (e camisa amarela no lugar da social branca).
8c. ~~Quais elementos de folclore entram na v1?~~ ✅ Careca de Toga, Saci, Vorcano, Bonecos de Olinda e Cuca (seção 8.2.1).
8f. ~~Nome de paródia para o banqueiro?~~ ✅ Vorcano.
8g. ~~Super Sprint?~~ ✅ Imunidade Parlamentar.
8h. ~~Habeas Corpus e Emenda Pix?~~ ✅ Sim.
8d. ~~Aviso de sátira na tela inicial?~~ ✅ Sim (seção 8.4).
8e. ~~Publicação considerando o calendário eleitoral?~~ ✅ Liberada.
9. ~~Vários cenários (biomas)?~~ ✅ Rio de Janeiro e Brasília, alternando a cada ~1.500 m (seção 8.2).
10. ~~Assets?~~ ✅ Conforme seção 9.6.
10a. ~~Contato do "ANUNCIE AQUI"?~~ ✅ E-mail *(endereço a informar; até lá fica um placeholder no `sponsors.json`)*.
10b. ~~Placar da Torcida?~~ ✅ Sim, na v1.

### Jogabilidade
11. ~~3 faixas ou curvas em 90°?~~ ✅ 3 faixas com troca de faixa.
12. ~~Colisão frontal: game over ou tropeço?~~ ✅ Tropeço (seção 6.2).
13. ~~"Continuar" após morrer?~~ ✅ Sim, com moedas (seção 6.10).
14. ~~Quais power-ups manter?~~ ✅ Todos, com os temas da seção 6.4.
15. ~~Monstros com comportamentos diferentes?~~ ✅ Não.
16. ~~Modo único ou fases?~~ ✅ Único infinito, por enquanto.

### Plataforma
17. ~~Prioridade: celular, desktop ou ambos igualmente?~~ ✅
18. ~~Orientação no celular?~~ ✅ Só retrato (seção 9.2).
19. ~~PWA / lojas?~~ ✅ PWA na v1; lojas fora.
20. ~~Gamepad?~~ ✅ Pós-v1.

### Online e monetização
21. ~~Vai ter ranking online e/ou contas de usuário?~~ ✅
22. ~~Salvar progresso na nuvem (jogar em vários aparelhos)?~~ ✅
23. ~~Modelo de monetização: nenhum, anúncios, compras ou publicação em portais (Poki, CrazyGames)?~~ ✅
24. ~~Onde hospedar?~~ ✅ Vercel + itch.io, Poki e CrazyGames (seção 9.7).
24a. ~~Domínio?~~ ✅ Endereço gratuito da Vercel (`pique-brasil.vercel.app`, sujeito a estar disponível; senão, variação próxima).

### Idioma e acessibilidade
25. ~~Idiomas?~~ ✅ pt-BR e en (seção 9.3).
26. ~~Acessibilidade?~~ ✅ Sim (seção 9.4).

## 15. Escopo e plano da v1 (3 dias)

### 15.1 O que entra na v1
- Pista de 3 faixas, pular, rolar, trocar de faixa, tropeço leve/forte, perseguição por distância, investidas, continuar com moedas.
- Lule e Bolsonero e a multidão (4–5) nas duas paletas, **modelados por código**.
- Cenário **Rio de Janeiro** com obstáculos genéricos + bumba-meu-boi, boneco de Olinda, homem bêbado e polícia; bandeirinhas e carro alegórico.
- Moedas, notas e maletas.
- Power-ups: **Imunidade Parlamentar**, **Habeas Corpus**, **Redemoinho do Saci** (ímã).
- Evento **Chuva de Maletas** (Vorcano) e **Cuca** anunciando investidas.
- HUD, menu, seleção de personagem, aviso de sátira, pausa, configurações.
- Tela de carregamento com patrocínio (mínimo 4 s) e card "ANUNCIE AQUI".
- Ranking online com apelido (Semanal, Geral, por personagem) + Placar da Torcida.
- pt-BR e en; PWA; só retrato.
- Acessibilidade: reduzir tremor/flashes, volumes separados, itens distinguíveis por forma, indicador visual da multidão, botões na tela como alternativa ao swipe.
- Áudio: trilha e efeitos básicos.
- Deploy na Vercel e no itch.io; submissão enviada a Poki e CrazyGames.

### 15.2 O que fica para a v1.1
- ~~Cenário Brasília e transição entre cenários.~~ ✅ (seção 17)
- ~~Careca de Toga (Martelada) e Bonecos de Olinda dançando como decoração.~~ ✅
- ~~Power-ups Cafezinho, Sandália de mola e Emenda Pix.~~ ✅
- Loja, skins, upgrades, missões, desafio diário.
- Modelos 3D gerados por IA + animações Mixamo.
- Outdoors patrocinados e demais espaços da seção 10.3.
- Modo daltônico com paletas, modo assistido, controles remapeáveis, HUD grande.
- Analytics (PostHog) e erros (Sentry).

### 15.3 Plano por dia
| Dia | Entregas | Fim do dia |
|---|---|---|
| **1 — Jogo funcionando** | Projeto Vite + TS + Three.js; pista e chunks; movimento e input (teclado + swipe); colisão e tropeços; perseguição e investidas; dinheiro; continuar; câmera; deploy contínuo na Vercel | Jogável com formas simples, publicado num link |
| **2 — Cara de jogo** | Personagens e multidão por código; cenário do Rio com packs CC0; obstáculos temáticos; power-ups; Vorcano e Cuca; HUD, menus, seleção, aviso de sátira; arte 2D gerada com IA (logo, carregamento, retratos) | Parece o Pique-Brasil |
| **3 — Lançamento** | Ranking e Placar da Torcida (API + Redis + filtro de nomes); patrocínio e "ANUNCIE AQUI"; i18n pt/en; PWA; áudio; acessibilidade básica; teste em celular real (Android e iPhone); build itch.io; submissões Poki/CrazyGames | v1 publicada |

**Corte de emergência** (se o dia 2 atrasar): sair sem Vorcano/Cuca e com 2 power-ups (Imunidade Parlamentar e Habeas Corpus). Ranking e patrocínio não são cortados, porque são pedidos explícitos da v1.

## 16. Status da v1 (implementação)

### 16.1 Entregue
Tudo da seção 15.1, incluindo os itens de corte de emergência (Vorcano, Cuca e os 3 power-ups entraram). Código em https://github.com/ghermanypaganini/pique-brasil; instruções de publicação no `README.md`.

### 16.2 Diferenças em relação ao plano
| Item do PRD | Como ficou | Motivo |
|---|---|---|
| Cenário com packs CC0 (Kenney/Quaternius) | Cenário do Rio modelado por código | Sem downloads; estilo consistente com os personagens |
| Arte 2D gerada por IA (logo, retratos) | Retratos renderizados dos modelos 3D; logo em texto estilizado; ícone do PWA em SVG | Sem custo de créditos; pode ser trocado depois |
| Áudio com Howler.js e arquivos de som | Áudio sintetizado com Web Audio (efeitos, multidão e trilha de samba) | Nenhum arquivo para baixar ou licenciar |
| Backend Supabase (proposta antiga) | Vercel Functions + Upstash Redis | Já definido na v0.8 |
| Balanceamento | Bot que desvia perfeitamente dura 110–229 s (meta 60–120 s) | Calibrar com jogadores reais (seção 16.3) |

### 16.3 Pendências (dependem do dono do projeto)
1. Conectar o repositório na Vercel e criar o Upstash Redis + variáveis `RUN_SECRET` e `ADMIN_KEY` (README, "Publicação").
2. Informar o e-mail do card "ANUNCIE AQUI" (`public/sponsors/sponsors.json`, campo `contact`).
3. Testar em celular real (Android e iPhone) e calibrar a dificuldade em `src/data/balance.ts`.
4. Publicar no itch.io (`npm run build:itch`) e enviar para Poki/CrazyGames (`npm run build:poki`, `npm run build:crazygames`), conferindo as regras de conteúdo de cada portal.

## 17. v1.1 — andamento

### 17.1 Bloco Conteúdo ✅
| Item | Como ficou |
|---|---|
| Cenário Brasília | Eixo Monumental com Esplanada (ministérios), gramados, espelho d'água, ipês amarelos e rosa, postes altos, palácio de colunas brancas com rampa; Congresso e Catedral no horizonte; céu e luz de fim de tarde. Carros vindo de frente viram sedãs oficiais pretos |
| Transição | Rio e Brasília se alternam a cada 1.520 m, começando no Rio, com um túnel de 80 m na troca. Céu, neblina e luz mudam suavemente dentro do túnel; o horizonte troca lá dentro |
| Careca de Toga — Martelada | A partir de 50 s, a cada 40–70 s (fora da Imunidade): o juiz aparece num púlpito ao lado da pista batendo o martelo (som de 3 batidas + aviso na tela) e uma faixa fica interditada por 70 m de fita zebrada, começando ~2 s à frente. Bater na fita = tropeço leve e empurrão para uma faixa livre. O jogo garante um caminho livre: remove o que fecharia as outras duas faixas ao mesmo tempo. Habeas Corpus derruba a fita; o carro oficial a rompe; a Sandália de mola pula por cima |
| Bonecos de Olinda dançando | Grupos de 3 bonecos dançando nas calçadas do Rio a cada 160 m (trechos de carnaval) |
| Cafezinho | +35% de velocidade por 4 s, afasta a multidão (+10/s), mas continua tropeçando. Não soma com a Imunidade (vale o maior). Visual: fumacinha saindo da cabeça, mais linhas de velocidade |
| Sandália de mola | Pulo 30% mais forte por 10 s (alcança o teto do ônibus sem rampa e passa por cima da fita). Visual: molas nos pés, passo saltitante |
| Emenda Pix | Dinheiro em dobro por 15 s. Visual: notas girando em volta do personagem |

- Sorteio dos power-ups: Saci 22%, Habeas 22%, Imunidade 16%, Cafezinho 14%, Sandália 13%, Emenda Pix 13% (`balance.ts`).
- Ranking: o limite de dinheiro por metro dobrou por causa da Emenda Pix; o de velocidade continua válido porque Cafezinho e Imunidade não se somam (há teste garantindo).

### 17.2 Bloco Métricas ✅ (falta só criar as contas e cadastrar as chaves)
- **PostHog** para eventos (`app_open`, `run_start`, `run_end`) e **Sentry** para erros; detalhes, eventos e painéis sugeridos no `README.md` ("Métricas e erros").
- Cobre a seção 11: início/fim de partida, personagem, distância, dinheiro, causa da captura (obstáculo do último tropeço), continuações, power-ups, investidas, Vorcano, Marteladas, tempo de carregamento e FPS (médio e dos 5% piores quadros). Permite acompanhar as metas da seção 2.2.
- **LGPD:** anônimo, sem cookies, identificador só na aba (some ao fechar), sem gravação de tela nem cliques automáticos, IP descartado (configurar nos dois serviços). Aviso e opção de desligar em Configurações ("Enviar estatísticas anônimas", ligado por padrão).
- Partidas que terminam fora do fluxo normal também contam: fechar a página (`closed`, enviado na hora) e aba fechada pelo sistema em segundo plano (`abandoned`, enviado na abertura seguinte).
- Só no site e no itch.io; nos portais (Poki/CrazyGames têm métricas próprias e regras contra rastreamento de terceiros) o código nem entra no pacote. Desligado em desenvolvimento.
- Carregado depois do jogo abrir (não afeta o carregamento): +52 KB (PostHog) e +31 KB (Sentry) compactados, usando as versões mínimas dos dois SDKs.

### 17.3 Próximos blocos
Meta-jogo (loja, skins, upgrades, missões, desafio diário) · Patrocínio extra (outdoors, power-up patrocinado) · Acessibilidade restante · Arte 3D por IA.

