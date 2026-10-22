// Parâmetros de balanceamento. Ajustar aqui, nunca espalhados pelo código.

export const BALANCE = {
  track: {
    laneWidth: 2.2,
    laneCount: 3,
    spawnAhead: 160, // metros gerados à frente do jogador
    despawnBehind: 25, // metros mantidos atrás do jogador
    startClear: 45, // trecho inicial sem obstáculos
  },

  player: {
    laneChangeTime: 0.14, // s
    jumpVelocity: 9.5, // m/s
    gravity: 28, // m/s²
    fastFallVelocity: -26, // m/s ao rolar no ar
    rollTime: 0.6, // s
    height: 1.8,
    rollHeight: 0.85,
    halfDepth: 0.4,
    halfWidth: 0.45,
    stepUp: 0.35, // degrau máximo que sobe sem colidir (rampas)
    inputBuffer: 0.15, // s
  },

  speed: {
    // Curva que sobe rápido no começo e estabiliza: v = base + (max - base) * (1 - e^(-distância / rampMeters))
    // ≈ 14 m/s na largada, 17 aos 15 s, 20 aos 30 s, 24 em 1 min, perto de 28 em 2 min.
    base: 14, // m/s no início
    max: 30,
    rampMeters: 1000,
    caseBoost: 0.3, // +30% ao pegar maleta
    caseBoostTime: 1.5, // s
  },

  stumble: {
    invulnTime: 1.0,
    light: { chase: -20, speedMul: 0.7, recover: 1.5 },
    strong: { chase: -35, speedMul: 0.45, recover: 2.5 },
  },

  chase: {
    start: 70,
    max: 100,
    regenPerSec: 1.5, // ganho de distância correndo sem tropeçar
    regenDelay: 3, // s após um tropeço antes de voltar a ganhar distância
    slowDrainPerSec: 12, // perda extra proporcional à velocidade perdida
    lunge: {
      firstAfter: 25, // s de partida antes da primeira investida
      intervalMin: 25,
      intervalMax: 40,
      warning: 2, // s de aviso (risada da Cuca, no dia 2)
      duration: 3,
      drainPerSec: 6,
    },
  },

  pickups: {
    coin: { value: 1, chase: 0.4 },
    bill: { value: 5, chase: 1.5 },
    case: { value: 50, chase: 6 },
    caseMinInterval: 30, // s entre maletas
    radius: 0.9,
  },

  obstacles: {
    low: { height: 0.8, length: 0.4 },
    high: { bottom: 1.1, top: 2.8, length: 0.4 },
    bus: { height: 2.6, length: 10 },
    stand: { height: 2.2, length: 3.5 },
    ramp: { height: 2.6, length: 7 },
    roof: { length: 14 },
    vehicle: { height: 1.6, length: 4.2, speed: 9, activateDistance: 70 },
    hole: { length: 2.4 },
    boi: { height: 1.3, length: 1.8, lateralSpeed: 3.2, activateDistance: 45 },
    drunk: { height: 1.0, length: 0.8, speed: 1.2, lateralSpeed: 1.1, retargetMin: 1.2, retargetMax: 2.2, activateDistance: 55 },
    policeChance: 0.4, // barreira baixa vira blitz policial
    olindaChance: 0.45, // barreira alta vira boneco de Olinda
  },

  powerups: {
    minInterval: 16, // s entre power-ups
    weights: { saci: 0.22, habeas: 0.22, immunity: 0.16, cafe: 0.14, sandal: 0.13, pix: 0.13 },
    immunity: { duration: 5, speedMul: 1.6, chasePerSec: 40, graceAfter: 1 },
    saci: { duration: 10, reachAhead: 3 }, // ímã: coleta dinheiro das 3 faixas até 3 m à frente
    // Cafezinho: corre mais rápido, mas continua tropeçando. Não soma com a Imunidade (vale o maior),
    // então o limite de velocidade do ranking continua valendo.
    cafe: { duration: 4, speedMul: 1.35, chasePerSec: 10 },
    sandal: { duration: 10, jumpMul: 1.3 }, // Sandália de mola: pula ~1,7× mais alto (alcança o teto do ônibus)
    pix: { duration: 15, moneyMul: 2 }, // Emenda Pix: dinheiro em dobro
  },

  // Careca de Toga: bate o martelo e interdita uma faixa com fita zebrada.
  careca: {
    firstAfter: 50, // s
    intervalMin: 40,
    intervalMax: 70,
    warning: 2, // s entre o aviso e o jogador chegar na fita
    tapeLength: 70, // m de faixa interditada (~3–4 s de corrida)
    tapeHeight: 2.0, // não dá para pular sem a Sandália de mola
  },

  vorcano: {
    firstAfter: 40, // s
    intervalMin: 55,
    intervalMax: 85,
    duration: 4,
    drops: 7, // itens jogados na pista durante o evento
    caseChance: 0.3, // o resto são notas
    dropAhead: 32, // m à frente do jogador
  },

  continue: {
    costs: [200, 400],
    countdown: 5,
    resetChase: 50,
    invulnTime: 2,
    clearAhead: 14,
  },

  crowd: {
    narrowScreenPx: 500, // abaixo disso: 4 perseguidores; acima: 5
    // A câmera fica ~9,5 m atrás do jogador; a multidão vive no espaço entre os dois e está
    // sempre na parte de baixo da tela: ~4,3 m atrás com distância 100, ~1,8 m (encostando) com 0.
    minGap: 1.8, // metros atrás do jogador com distância 0
    metersPerChase: 0.025,
    scale: 0.85, // um pouco menores que o jogador: perto da câmera a perspectiva já os aumenta
  },
} as const;

// Com a câmera atrás do jogador olhando para +z, o eixo +x do Three.js aparece à ESQUERDA da tela.
// Por isso a faixa 0 (esquerda na tela) fica em +x.
export const laneX = (lane: number): number => (1 - lane) * BALANCE.track.laneWidth;
export const laneOf = (x: number): number => 1 - Math.round(x / BALANCE.track.laneWidth);
