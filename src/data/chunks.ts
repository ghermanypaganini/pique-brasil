// Trechos de pista pré-desenhados. Cada linha é [z relativo ao início do trecho, padrão de 3 faixas].
//
// Obstáculos:  L baixa · H alta · B ônibus · S banca · R rampa + teto · V veículo vindo · O buraco
// Coletáveis:  c fileira de moedas · a arco de moedas (sobre obstáculo) · n nota · m maleta
// .            faixa vazia
//
// O gerador espelha os trechos aleatoriamente (faixa 0 <-> 2), então basta desenhar um lado.

export interface ChunkDef {
  name: string;
  tier: 0 | 1 | 2;
  length: number;
  rows: [number, string][];
}

export const CHUNKS: ChunkDef[] = [
  // ── Nível 0: aprendizado ──────────────────────────────────────────
  {
    name: 'moedas-retas',
    tier: 0,
    length: 36,
    rows: [
      [4, 'c..'],
      [20, '.c.'],
    ],
  },
  {
    name: 'barreiras-baixas',
    tier: 0,
    length: 40,
    rows: [
      [10, 'L..'],
      [10, 'a.c'],
      [26, '.L.'],
      [26, '.a.'],
    ],
  },
  {
    name: 'onibus-unico',
    tier: 0,
    length: 34,
    rows: [
      [8, 'B..'],
      [6, '.c.'],
      [22, '.n.'],
    ],
  },
  {
    name: 'barreira-alta',
    tier: 0,
    length: 36,
    rows: [
      [12, '.H.'],
      [8, '.c.'],
      [24, 'S..'],
    ],
  },
  {
    name: 'dois-onibus',
    tier: 0,
    length: 34,
    rows: [
      [8, 'BB.'],
      [6, '..c'],
    ],
  },

  // ── Nível 1 ───────────────────────────────────────────────────────
  {
    name: 'rampa-telhado',
    tier: 1,
    length: 44,
    rows: [
      [4, 'R..'],
      [4, 'c..'],
      [18, 'm..'],
      [6, '.B.'],
      [14, '..L'],
      [14, '..a'],
    ],
  },
  {
    name: 'baixa-alta',
    tier: 1,
    length: 42,
    rows: [
      [6, 'L.H'],
      [6, 'a..'],
      [20, '.B.'],
      [22, 'c.c'],
    ],
  },
  {
    name: 'buraco-corredor',
    tier: 1,
    length: 40,
    rows: [
      [8, 'B.B'],
      [12, '.O.'],
      [13.2, '.a.'],
      [28, '.n.'],
    ],
  },
  {
    name: 'veiculo-vindo',
    tier: 1,
    length: 52,
    rows: [
      [40, 'V..'],
      [8, '.c.'],
      [28, '.cc'],
    ],
  },
  {
    name: 'bancas-zigue',
    tier: 1,
    length: 44,
    rows: [
      [6, 'S..'],
      [16, '.S.'],
      [26, '..S'],
      [6, '.cc'],
      [16, 'c..'],
      [30, 'n..'],
    ],
  },

  // ── Nível 2 ───────────────────────────────────────────────────────
  {
    name: 'slalom-onibus',
    tier: 2,
    length: 52,
    rows: [
      [4, 'BB.'],
      [20, '.BB'],
      [36, 'BB.'],
      [4, '..c'],
      [20, 'c..'],
      [36, '..c'],
    ],
  },
  {
    name: 'pula-rola-pula',
    tier: 2,
    length: 44,
    rows: [
      [8, 'LLL'],
      [8, '.a.'],
      [20, 'HHH'],
      [32, 'OOO'],
      [33.2, 'a.a'],
    ],
  },
  {
    name: 'rampa-e-transito',
    tier: 2,
    length: 56,
    rows: [
      [4, 'R..'],
      [40, '..V'],
      [4, 'c..'],
      [18, 'm..'],
      [10, '.B.'],
      [30, '.H.'],
      [44, 'L..'],
    ],
  },
  {
    name: 'corredor-estreito',
    tier: 2,
    length: 46,
    rows: [
      [4, 'B.B'],
      [8, '.L.'],
      [16, '.H.'],
      [24, 'B.B'],
      [28, '.O.'],
      [29.2, '.a.'],
      [38, 'n.n'],
    ],
  },
];
