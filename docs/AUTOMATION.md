# Automação de posts — AniVerse

## Fluxo (como você pediu)

```
Fila (queue.json)
    ↓  npm run generate   /  GitHub Action "Generate AI draft"
IA rascunha + gera imagens
    ↓
data/drafts/review/     ← VOCÊ REVISA (edita JSON / imagens)
    ↓  npm run approve
data/drafts/scheduled/  ← publishAt em 09:00 / 15:00 / 19:00 (BRT)
    ↓  automático (Action 09:05, 15:05, 19:05)
data/posts.json         ← no ar (Netlify)
```

- **IA rascunha, você revisa** em `data/drafts/review/`
- **Aprovação** = `npm run approve` (agenda sozinho no próximo horário livre)
- Depois de agendado, **publica sozinho** no horário — sem segunda aprovação
- **Imagens** geradas na hora do `generate` (Pollinations; ou OpenAI se configurado)

## Horários

| Slot | Hora (America/Sao_Paulo) | Cron UTC (Action) |
|------|---------------------------|-------------------|
| Manhã | 09:00 | 12:05 |
| Tarde | 15:00 | 18:05 |
| Noite | 19:00 | 22:05 |

## Comandos locais

```bash
# ver fila, review, agendados
npm run pipeline

# gerar rascunho (primeiro item da fila)
npm run generate

# gerar tema avulso
npm run generate -- --topic "One Piece Cap 5 análise"

# aprovar um rascunho (agenda 9h/15h/19h)
npm run approve -- --slug nome-do-slug

# aprovar todos em review
npm run approve:all

# publicar os que já venceram (teste local)
npm run publish

# forçar publicar um agendado agora
npm run publish -- --force-slug nome-do-slug

# próximo horário livre
npm run slot
```

## Secrets no GitHub (Settings → Secrets and variables → Actions)

| Secret | Uso |
|--------|-----|
| `XAI_API_KEY` | Rascunho com Grok (xAI) — preferencial |
| `OPENAI_API_KEY` | Alternativa de texto e/ou imagem |
| `XAI_MODEL` | opcional (default `grok-2-latest`) |
| `OPENAI_MODEL` | opcional (default `gpt-4o-mini`) |
| `IMAGE_ENGINE` | `openai` para forçar DALL·E; senão Pollinations |

Sem key de IA, o `generate` ainda cria um **template editável** + tenta imagens via Pollinations.

## Fila

Edite `data/queue.json`:

```json
{
  "items": [
    {
      "id": "meu-id",
      "topic": "Título/tema do post",
      "category": "mangas",
      "type": "manga",
      "notes": "Instruções para a IA",
      "tags": ["one piece"],
      "priority": 1
    }
  ]
}
```

Categorias: `reviews`, `episodios`, `mangas`, `noticias`, `teorias`  
Tipos: `anime`, `manga`, `episode`

## Revisar um draft

1. Abra `data/drafts/review/<slug>.json`
2. Ajuste `title`, `excerpt`, `content`, `tags`, `featured`
3. Confira imagens em `images/posts/<slug>/`
4. `npm run approve -- --slug <slug>`
5. Commit + push (ou deixe o Action de generate já ter commitado o review)

## Publicação no GitHub

O workflow **Publish scheduled posts** roda sozinho nos 3 horários.  
Ele commita `data/posts.json` + move drafts → a **Netlify** redeploya.

## Boas práticas

- Não edite `posts.json` na mão se o post ainda está em `scheduled/` (pode duplicar)
- Use `npm run pipeline` antes de gerar para ver o estado
- Prefira 1 generate → review → approve por vez no começo
