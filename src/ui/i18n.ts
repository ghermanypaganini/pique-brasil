import en from '../data/i18n/en.json';
import pt from '../data/i18n/pt-BR.json';
import { loadSave, writeSave, type Language } from '../services/save';

// Textos em data/i18n/*.json (PRD 9.3). Idioma: escolhido nas configurações ou o do navegador.

export type TextKey = keyof typeof pt;

const DICTS: Record<Language, Record<TextKey, string>> = { 'pt-BR': pt, en };

function detect(): Language {
  const saved = loadSave().language;
  if (saved) return saved;
  return navigator.language?.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}

export const language: Language = detect();
const dict = DICTS[language];
document.documentElement.lang = language;

/** Texto traduzido; `{n}` e afins são trocados pelos valores de `vars`. */
export function t(key: TextKey, vars: Record<string, string | number> = {}): string {
  return dict[key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

/** Troca o idioma e recarrega (a interface é montada uma vez com os textos). */
export function setLanguage(lang: Language): void {
  const save = loadSave();
  save.language = lang;
  writeSave(save);
  location.reload();
}
