/* AniVerse HTML templates */
const templates = {
  postCard(post) {
    return `
      <article class="post-card" data-id="${post.id}" data-category="${post.category}">
        <a href="post.html?slug=${encodeURIComponent(post.slug)}" class="post-card-link">
          <div class="post-card-image">
            <img src="${post.cover}" alt="${this.escape(post.title)}" loading="lazy" width="600" height="340">
            <span class="post-badge">${this.escape(post.category)}</span>
          </div>
          <div class="post-card-body">
            <time class="post-date" datetime="${post.date}">${utils.formatDate(post.date)}</time>
            <h3 class="post-card-title">${this.escape(post.title)}</h3>
            <p class="post-card-excerpt">${this.escape(post.excerpt)}</p>
            <span class="post-card-cta">Ler mais →</span>
          </div>
        </a>
      </article>
    `;
  },

  hero(post) {
    if (!post) {
      return `<div class="hero-empty"><h1>🌌 AniVerse</h1><p>Seu universo anime em um só lugar</p></div>`;
    }
    return `
      <a href="post.html?slug=${encodeURIComponent(post.slug)}" class="hero-card" style="--hero-bg: url('${post.cover}')">
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <span class="hero-label">✨ Em destaque</span>
          <span class="post-badge">${this.escape(post.category)}</span>
          <h1 class="hero-title">${this.escape(post.title)}</h1>
          <p class="hero-excerpt">${this.escape(post.excerpt)}</p>
          <span class="hero-cta">Ler review completo →</span>
        </div>
      </a>
    `;
  },

  categories(categories, activeId = 'all') {
    const items = (categories || [])
      .map(
        (c) => `
      <a href="category.html?cat=${encodeURIComponent(c.id)}"
         class="cat-chip ${c.id === activeId ? 'active' : ''}"
         data-cat="${c.id}">
        ${c.icon || ''} ${this.escape(c.name)}
      </a>`
      )
      .join('');
    return `<div class="filter-chips">${items}</div>`;
  },

  categoriesSidebar(categories, posts) {
    const counts = {};
    (posts || []).forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    const list = (categories || [])
      .filter((c) => c.id !== 'all')
      .map(
        (c) => `
      <li>
        <a href="category.html?cat=${encodeURIComponent(c.id)}">
          <span>${c.icon || ''} ${this.escape(c.name)}</span>
          <span class="count">${counts[c.id] || 0}</span>
        </a>
      </li>`
      )
      .join('');
    return `
      <div class="sidebar-widget">
        <h3 class="widget-title">📂 Categorias</h3>
        <ul class="cat-list">${list}</ul>
      </div>
    `;
  },

  popularSidebar(posts) {
    const items = (posts || [])
      .map(
        (p, i) => `
      <li>
        <a href="post.html?slug=${encodeURIComponent(p.slug)}">
          <span class="rank">${i + 1}</span>
          <span class="pop-title">${this.escape(p.title)}</span>
        </a>
      </li>`
      )
      .join('');
    return `
      <div class="sidebar-widget">
        <h3 class="widget-title">🔥 Populares</h3>
        <ul class="popular-list">${items || '<li class="muted">Nenhum post ainda</li>'}</ul>
      </div>
    `;
  },

  newsletterWidget() {
    return `
      <div class="sidebar-widget newsletter-box" id="newsletter-box">
        <h3 class="widget-title">📧 Newsletter</h3>
        <p class="widget-text">Receba reviews e alertas de novos posts no seu e-mail.</p>
        <form id="subscribe-form" class="subscribe-form" novalidate>
          <input type="email" id="subscribe-email" class="subscribe-input" placeholder="seu@email.com" required autocomplete="email">
          <button type="submit" class="subscribe-btn">Assinar</button>
        </form>
        <p id="subscribe-msg" class="subscribe-msg" role="status"></p>
      </div>
    `;
  },

  postFull(post, categoryLabel) {
    return `
      <article class="post-full">
        <header class="post-full-header">
          <div class="post-meta">
            <span class="post-badge">${this.escape(categoryLabel || post.category)}</span>
            <time datetime="${post.date}">${utils.formatDate(post.date)}</time>
            <span class="post-author">por ${this.escape(post.author || 'AniVerse')}</span>
          </div>
          <h1 class="post-full-title">${this.escape(post.title)}</h1>
          <p class="post-full-excerpt">${this.escape(post.excerpt)}</p>
        </header>
        <div class="post-full-cover">
          <img src="${post.cover}" alt="${this.escape(post.title)}" width="1200" height="630">
        </div>
        <div class="post-full-content">
          ${post.content || ''}
        </div>
        <footer class="post-tags">
          ${(post.tags || []).map((t) => `<span class="tag">#${this.escape(t)}</span>`).join('')}
        </footer>
      </article>
    `;
  },

  emptyState(message) {
    return `
      <div class="empty-state">
        <div class="empty-icon">🌙</div>
        <p>${this.escape(message || 'Nenhum post encontrado.')}</p>
        <a href="index.html" class="btn-primary">Voltar ao início</a>
      </div>
    `;
  },

  escape(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};

window.templates = templates;
