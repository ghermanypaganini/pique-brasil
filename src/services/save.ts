import type { Character } from '../systems/types';

const KEY = 'pique-brasil:save';
const VERSION = 1;

export interface SaveData {
  version: number;
  bank: number;
  best: number;
  character: Character;
  satireAccepted: boolean;
  reduceShake: boolean;
}

const DEFAULTS: SaveData = {
  version: VERSION,
  bank: 0,
  best: 0,
  character: 'lule',
  satireAccepted: false,
  reduceShake: false,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const data = JSON.parse(raw) as Partial<SaveData>;
    if (data.version !== VERSION) return { ...DEFAULTS, ...data, version: VERSION };
    return { ...DEFAULTS, ...data };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Navegação privada ou armazenamento cheio: o jogo continua sem salvar.
  }
}
