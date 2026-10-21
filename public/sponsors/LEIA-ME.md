# Patrocinadores da tela de carregamento

Para adicionar uma marca (sem mexer no código):

1. Coloque a imagem nesta pasta (PNG ou WebP, 1080×1350, até 200 KB).
2. Adicione uma entrada em `sponsors.json`:

```json
{
  "contact": "anuncie@exemplo.com",
  "sponsors": [
    {
      "id": "padaria-do-ze",
      "name": "Padaria do Zé",
      "image": "sponsors/padaria-do-ze.webp",
      "url": "https://padariadoze.com.br",
      "weight": 2,
      "start": "2026-11-01",
      "end": "2026-11-30",
      "locales": ["pt-BR"]
    }
  ]
}
```

3. Faça o commit; a Vercel publica sozinha.

- `id`: letras minúsculas, números e hífen (usado nos contadores de impressões e cliques).
- `weight`: chance relativa de aparecer. `start`/`end`: período da campanha (inclusive).
- `locales`: idiomas em que aparece (`pt-BR`, `en`); vazio ou ausente = todos.
- `contact`: e-mail mostrado no card "ANUNCIE AQUI" quando não há patrocinador ativo.
  Vazio = o card aparece sem o botão de contato.
- Entradas inválidas ou fora do período são ignoradas.
- Impressões e cliques: `GET /api/admin?sponsor=<id>` com o cabeçalho `X-Admin-Key`.
