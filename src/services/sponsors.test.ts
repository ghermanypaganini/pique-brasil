import { describe, expect, it } from 'vitest';
import { activeSponsors, pickSponsors, sponsorLink, validContact } from './sponsors';

const base = { name: 'X', image: 'sponsors/x.webp', url: 'https://x.com.br', weight: 1 };

describe('patrocinadores', () => {
  it('filtra por período, idioma e validade', () => {
    const cfg = {
      sponsors: [
        { ...base, id: 'ativo' },
        { ...base, id: 'futuro', start: '2026-12-01' },
        { ...base, id: 'vencido', end: '2026-10-01' },
        { ...base, id: 'so-ingles', locales: ['en' as const] },
        { ...base, id: 'Inválido!' },
        { ...base, id: 'script', url: 'javascript:alert(1)' },
      ],
    };
    const ids = activeSponsors(cfg, 'pt-BR', new Date('2026-10-21T12:00:00Z')).map((s) => s.id);
    expect(ids).toEqual(['ativo']);
  });

  it('sorteia sem repetir e respeita o peso', () => {
    const list = [
      { ...base, id: 'a', weight: 9 },
      { ...base, id: 'b', weight: 1 },
    ];
    expect(pickSponsors(list, 2).map((s) => s.id).sort()).toEqual(['a', 'b']);
    let a = 0;
    for (let i = 0; i < 1000; i++) if (pickSponsors(list, 1)[0].id === 'a') a++;
    expect(a).toBeGreaterThan(800);
  });

  it('monta o link com UTM e valida o e-mail de contato', () => {
    expect(sponsorLink({ ...base, id: 'x' })).toBe('https://x.com.br/?utm_source=piquebrasil&utm_medium=loading&utm_campaign=x');
    expect(validContact('anuncie@exemplo.com')).toBe('anuncie@exemplo.com');
    expect(validContact('')).toBeNull();
    expect(validContact('CONTATO_A_DEFINIR')).toBeNull();
  });
});
