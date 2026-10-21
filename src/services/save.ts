import type { Character } from '../systems/types';

const KEY = 'pique-brasil:save';
const VERSION = 1;

export type Language = 'pt-BR' | 'en';

export interface SaveData {
  version: number;
  bank: number;
  best: number;
  character: Character;
  satireAccepted: boolean;
  // Ranking
  nickname: string | null;
  tag: string | null;
  nicknameAsked: boolean; // já perguntou o apelido (não pergunta de novo se o jogador pulou)
  // Configurações e acessibilidade
  language: Language | null; // null = do navegador
  reduceShake: boolean;
  reduceFlashes: boolean;
  touchButtons: boolean;
  musicVolume: number; // 0..1
  sfxVolume: number;
  crowdVolume: number;
}

const DEFAULTS: SaveData = {
  version: VERSION,
  bank: 0,
  best: 0,
  character: 'lule',
  satireAccepted: false,
  nickname: null,
  tag: null,
  nicknameAsked: false,
  language: null,
  reduceShake: false,
  reduceFlashes: false,
  touchButtons: false,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  crowdVolume: 0.7,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const data = JSON.parse(raw) as Partial<SaveData>;
    // Campos novos entram com o valor padrão; a versão só muda se o formato quebrar.
    return { ...DEFAULTS, ...data, version: VERSION };
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

/** Leitura/escrita protegidas para chaves avulsas (fila do ranking, retratos). */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sem armazenamento */
  }
}
