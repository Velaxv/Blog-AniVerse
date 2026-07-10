# AniVerse 🌌

Blog estático de anime e mangá — reviews, análises de episódios, teorias e novidades.

**Site:** [https://aniverseanime.netlify.app](https://aniverseanime.netlify.app)

## Stack

- HTML + CSS + JavaScript (vanilla)
- Conteúdo em `data/posts.json`
- Deploy automático na **Netlify** a cada push em `master`

## Estrutura

```
├── index.html          # Home
├── post.html           # Post individual (?slug=)
├── category.html       # Filtro por categoria / busca
├── episodes.html       # Posts tipo episódio
├── mangas.html         # Posts tipo mangá
├── about.html
├── style.css
├── data/posts.json     # Fonte de conteúdo
├── js/                 # API, templates, filtros, newsletter
└── netlify.toml
```

## Como adicionar um post

1. Abra `data/posts.json`
2. Adicione um objeto em `posts` com `id`, `slug`, `title`, `excerpt`, `content`, `cover`, `category`, `tags`, `date`, `type`, etc.
3. Commit e push → Netlify atualiza o site

Categorias: `reviews`, `episodios`, `mangas`, `noticias`, `teorias`  
Tipos: `anime`, `manga`, `episode`

## Desenvolvimento local

Precisa de um servidor HTTP (fetch do JSON não funciona em `file://`):

```bash
# Python
python -m http.server 5500

# ou Node
npx serve .
```

Abra `http://localhost:5500`.

## Newsletter

Por enquanto as assinaturas ficam no `localStorage` do navegador.  
Dá para evoluir depois com Netlify Forms ou um serviço de e-mail.
