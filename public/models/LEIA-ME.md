# Modelos 3D gerados com IA

Gerados em 23/10/2026 com **Tripo (texto → 3D)** pela Higgsfield (conta do dono do projeto, 5 créditos cada) e otimizados com:

```bash
npx @gltf-transform/cli@4 optimize original.glb public/models/NOME.glb --texture-compress webp --texture-size 512 --compress quantize --simplify false
```

(~1 MB no total, contra 6,6 MB dos originais.) O jogo troca o material pelo toon do jogo e ajusta tamanho e orientação em `src/render/models.ts`; se um arquivo faltar, usa a versão feita por código.

| Arquivo | Uso | Pedido (resumo) |
|---|---|---|
| `onibus.glb` | Obstáculo ônibus (dois em sequência = articulado) | Ônibus urbano cartoon amarelo e azul, sem texto |
| `taxi.glb` | Veículo vindo de frente (Rio) | Táxi carioca amarelo com faixa azul, sem letras |
| `banca.glb` | Obstáculo banca de jornal | Banca verde com toldo, revistas sem texto legível |
| `boi.glb` | Bumba-meu-boi | Boi de festa com saia bordada, estrelas e fitas |
| `alegorico.glb` | Carro alegórico decorativo (beira da pista) | Carro alegórico com máscara gigante e plumas |
| `quiosque.glb` | Quiosque da praia | Quiosque branco com teto listrado |
| `palmeira.glb` | Palmeiras do calçadão | Coqueiro cartoon |

Regras seguidas: nada de texto, marcas, placas ou pessoas reais nos modelos. Para trocar um modelo, gere outro com o mesmo nome e rode o comando acima.
