// Validação de apelidos do ranking. Usado no jogo (aviso imediato) e no servidor (regra final).

export const NAME_MIN = 3;
export const NAME_MAX = 16;
const NAME_PATTERN = /^[\p{L}\p{N} _-]+$/u;

/** Palavrões e ofensas (pt/en): bloqueados quando aparecem em qualquer parte do apelido. */
const BANNED_PARTS = [
  'porra', 'caralh', 'buceta', 'merda', 'putaria', 'viado', 'foda', 'fuder', 'foder', 'arrombad',
  'corno', 'bosta', 'piroca', 'xoxota', 'cuzao', 'otario', 'vagabund', 'retardad', 'macaco',
  'babaca', 'safad', 'punheta', 'boquete', 'cacete', 'escroto', 'desgraca',
  'fuck', 'shit', 'bitch', 'cunt', 'pussy', 'nigg', 'faggot', 'whore', 'slut', 'nazi', 'hitler',
];

/** Palavras curtas bloqueadas só quando são uma palavra inteira (evita barrar "Cuca", "Curitiba"...). */
// (ex.: "puta" estaria em "computador", "rola" em "Rolando").
const BANNED_WORDS = ['cu', 'fdp', 'pqp', 'vsf', 'tnc', 'krl', 'crl', 'vtnc', 'kct', 'ass', 'puta', 'puto', 'rola', 'dick', 'fag', 'rape', 'xota'];

/** Nomes reais de políticos e números de urna: o ranking não pode virar espaço de campanha. */
const POLITICAL_PARTS = [
  'lula', 'bolsonaro', 'moraes', 'xandao', 'vorcaro', 'alckmin', 'haddad', 'tarcisio', 'janja',
  'dilma', 'boulos', 'nikolas', 'caiado', 'forapt', 'forabolso', 'eleicao',
];
// Nomes comuns (Flávio, Marina, Ciro...) não são bloqueados; só palavras inteiras de campanha.
const POLITICAL_WORDS = ['pt', 'pl', '13', '22', 'psol', 'mdb', 'psdb', 'mito', 'vote', 'voto', 'temer', 'zema'];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // remove acentos (marcas combinantes após NFD)
    .toLowerCase();
}

/** Desfaz leetspeak; "1" pode ser "i" ou "l", então gera as duas leituras. */
function deLeet(s: string): string[] {
  const base = s.replace(/[03457@$]/g, (c) => LEET[c] ?? c);
  return [base.replace(/1/g, 'i'), base.replace(/1/g, 'l')];
}

export type NameProblem = 'length' | 'chars' | 'offensive' | 'political';

/** Retorna o problema do apelido, ou null se puder ser usado. */
export function checkName(raw: string): NameProblem | null {
  const name = raw.trim();
  const len = [...name].length;
  if (len < NAME_MIN || len > NAME_MAX) return 'length';
  if (!NAME_PATTERN.test(name)) return 'chars';

  const base = normalize(name);
  const words = base.split(/[\s_-]+/).filter(Boolean);
  const joined = words.join('');
  const variants = [joined, ...deLeet(joined)];
  const wordVariants = new Set([...words, ...words.flatMap(deLeet)]);
  const hasPart = (parts: string[]) => parts.some((p) => variants.some((v) => v.includes(p)));

  if (POLITICAL_WORDS.some((w) => wordVariants.has(w))) return 'political';
  if (hasPart(POLITICAL_PARTS)) return 'political';
  if (BANNED_WORDS.some((w) => wordVariants.has(w))) return 'offensive';
  if (hasPart(BANNED_PARTS)) return 'offensive';
  return null;
}

/** Apelido limpo para exibição (espaços extras removidos). */
export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/** Tag de 4 dígitos que diferencia apelidos iguais (ex.: "Zé#4821"). */
export function makeTag(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export const memberOf = (name: string, tag: string) => `${cleanName(name)}#${tag}`;

export function parseMember(member: string): { name: string; tag: string } {
  const i = member.lastIndexOf('#');
  return i < 0 ? { name: member, tag: '' } : { name: member.slice(0, i), tag: member.slice(i + 1) };
}
