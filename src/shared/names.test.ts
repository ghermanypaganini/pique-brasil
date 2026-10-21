import { describe, expect, it } from 'vitest';
import { checkName, parseMember, memberOf } from './names';

describe('apelidos do ranking', () => {
  it('aceita nomes comuns, inclusive os que contêm trechos parecidos com palavrões', () => {
    for (const n of ['Zéca', 'Maria_99', 'Carolina', 'Rolando', 'Computador', 'Cuca Fã', 'Flávio', 'Marina', 'João-Pedro']) {
      expect(checkName(n), n).toBeNull();
    }
  });

  it('recusa tamanho e caracteres inválidos', () => {
    expect(checkName('ab')).toBe('length');
    expect(checkName('a'.repeat(17))).toBe('length');
    expect(checkName('oi<script>')).toBe('chars');
  });

  it('recusa palavrões, inclusive com leetspeak e acentos', () => {
    for (const n of ['p0rra', 'Merdão', 'f u c k', 'vsf mano', 'Caralhão']) expect(checkName(n), n).toBe('offensive');
  });

  it('recusa nomes de políticos e números de urna', () => {
    for (const n of ['Lula 13', 'Bolsonaro22', 'vote 22', 'Lu1a', 'Xandão', 'b0ls0nar0']) expect(checkName(n), n).toBe('political');
  });

  it('monta e separa o identificador com tag', () => {
    expect(memberOf('  Zé  da  Silva ', '4821')).toBe('Zé da Silva#4821');
    expect(parseMember('Zé#4821')).toEqual({ name: 'Zé', tag: '4821' });
  });
});
