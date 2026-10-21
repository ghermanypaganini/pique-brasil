export type Lane = 0 | 1 | 2;

export type ObstacleKind =
  | 'low' // barreira baixa: pular
  | 'high' // barreira alta: rolar
  | 'bus' // bloco grande: trocar de faixa ou subir pela rampa
  | 'stand' // bloco curto (banca de jornal)
  | 'ramp' // rampa: leva ao teto do bloco seguinte
  | 'vehicle' // veículo vindo de frente
  | 'hole'; // buraco: pular

export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  lane: Lane;
  z: number; // início (lado mais próximo do jogador)
  prevZ: number; // z no passo anterior (veículos se movem)
  length: number;
  height: number;
  speed: number; // veículos: m/s em direção ao jogador
  hit: boolean; // já causou tropeço (não colide de novo)
  knocked: boolean; // tirado do caminho num tropeço forte
}

export type PickupKind = 'coin' | 'bill' | 'case';

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
  | { type: 'jump' }
  | { type: 'roll' }
  | { type: 'land' }
  | { type: 'lungeWarning' }
  | { type: 'lunge' }
  | { type: 'caught' }
  | { type: 'continued' };
