export type Lane = 0 | 1 | 2;

export type ObstacleKind =
  | 'low' // barreira baixa: pular (cavalete ou blitz policial)
  | 'high' // barreira alta: rolar (faixa ou boneco de Olinda)
  | 'bus' // bloco grande: trocar de faixa ou subir pela rampa
  | 'stand' // bloco curto (banca de jornal)
  | 'ramp' // rampa: leva ao teto do bloco seguinte (carro alegórico)
  | 'vehicle' // veículo vindo de frente
  | 'hole' // buraco: pular
  | 'boi' // bumba-meu-boi: atravessa a pista dançando de lado
  | 'drunk'; // homem bêbado: anda em zigue-zague

/** Variações visuais com a mesma mecânica do tipo. */
export type ObstacleVariant = 'cavalete' | 'police' | 'faixa' | 'olinda' | 'roof' | null;

export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  variant: ObstacleVariant;
  lane: Lane; // faixa atual (obstáculos móveis mudam de faixa)
  x: number; // posição lateral contínua (para o desenho)
  z: number; // início (lado mais próximo do jogador)
  prevZ: number; // z no passo anterior (veículos se movem)
  length: number;
  height: number;
  speed: number; // m/s em direção ao jogador
  dir: number; // boi: sentido lateral (-1/1); bêbado: faixa-alvo
  timer: number; // bêbado: tempo até escolher outra faixa
  hit: boolean; // já causou tropeço (não colide de novo)
  knocked: boolean; // tirado do caminho
}

export type MoneyKind = 'coin' | 'bill' | 'case';
export type PowerKind = 'immunity' | 'habeas' | 'saci';
export type PickupKind = MoneyKind | PowerKind;

export const isMoney = (k: PickupKind): k is MoneyKind => k === 'coin' || k === 'bill' || k === 'case';

export interface Pickup {
  id: number;
  kind: PickupKind;
  lane: Lane;
  z: number;
  y: number;
  taken: boolean;
}

export type Character = 'lule' | 'bolsonero';

export type Action = 'left' | 'right' | 'jump' | 'roll';

export type Phase = 'running' | 'continue' | 'over';

export type StumbleKind = 'light' | 'strong';

export type GameEvent =
  | { type: 'pickup'; kind: PickupKind }
  | { type: 'stumble'; kind: StumbleKind; obstacle: ObstacleKind }
  | { type: 'shieldUsed' }
  | { type: 'powerEnd'; kind: PowerKind }
  | { type: 'jump' }
  | { type: 'roll' }
  | { type: 'land' }
  | { type: 'lungeWarning' }
  | { type: 'lunge' }
  | { type: 'vorcano' }
  | { type: 'caught' }
  | { type: 'continued' };
