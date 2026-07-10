# AniVerse 🌌

Blog estático de anime e mangá — reviews, análises de episódios, teorias e novidades.

**Site:** [https://aniverseanime.netlify.app](https://aniverseanime.netlify.app)

## Stack

- HTML + CSS + JavaScript (vanilla)
- Conteúdo em `data/posts.json`
- Deploy automático na **Netlify** a cada push em `master`
- **Pipeline de posts:** IA rascunha → você revisa → agenda 9h/15h/19h → publica sozinho

## Automação de posts

Fluxo completo documentado em **[docs/AUTOMATION.md](docs/AUTOMATION.md)**.

```bash
npm run pipeline    # status da fila / review / agendados
npm run generate    # IA + imagens → drafts/review
npm run approve -- --slug <slug>   # agenda 09:00 / 15:00 / 19:00 BRT
npm run publish     # publica o que já venceu (local ou CI)
```

Horários fixos (America/Sao_Paulo): **09:00 · 15:00 · 19:00**

## Estrutura

```
├── index.html / post.html / ...
├── data/
│   ├── posts.json          # no ar
│   ├── queue.json          # ideias para a IA
│   └── drafts/
│       ├── review/         # aguardando você
│       ├── scheduled/      # com publishAt
│       └── published/      # arquivo
├── images/posts/
├── scripts/                # generate / approve / publish
├── .github/workflows/      # cron de publicação + generate
└── docs/AUTOMATION.md
```

## Como adicionar post manualmente

1. Edite `data/posts.json` **ou** use o pipeline acima
2. Commit e push → Netlify atualiza

Categorias: `reviews`, `episodios`, `mangas`, `noticias`, `teorias`  
Tipos: `anime`, `manga`, `episode`

## Desenvolvimento local

```bash
python -m http.server 5500
# ou: npx serve .
```

Abra `http://localhost:5500`.

## Newsletter

Assinaturas ainda no `localStorage` do navegador (evolução futura: Netlify Forms / e-mail real).
