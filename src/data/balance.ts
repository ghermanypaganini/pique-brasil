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
    base: 11, // m/s no início
    perMeter: 0.0045, // ganho por metro percorrido
    max: 28,
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
    minGap: 1.6, // metros atrás do jogador com distância 0
    metersPerChase: 0.2, // com a câmera ~6,5 m atrás, a multidão aparece abaixo de ~25
  },
} as const;

export const laneX = (lane: number): number => (lane - 1) * BALANCE.track.laneWidth;
