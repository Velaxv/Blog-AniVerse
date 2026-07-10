/* AniVerse data API — static JSON for Netlify */
const AniAPI = {
  _cache: null,

  async load() {
    if (this._cache) return this._cache;
    const base = this._basePath();
    const res = await fetch(`${base}data/posts.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error('Falha ao carregar posts');
    this._cache = await res.json();
    return this._cache;
  },

  _basePath() {
    // Works from root pages and nested paths on Netlify
    const path = window.location.pathname;
    if (path.includes('/posts/')) return '../';
    return './';
  },

  async getPosts() {
    const data = await this.load();
    return [...(data.posts || [])].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
  },

  async getPostBySlug(slug) {
    const posts = await this.getPosts();
    return posts.find((p) => p.slug === slug || p.id === slug) || null;
  },

  async getFeatured() {
    const posts = await this.getPosts();
    return posts.find((p) => p.featured) || posts[0] || null;
  },

  async getPopular(limit = 5) {
    const posts = await this.getPosts();
    return posts.filter((p) => p.popular).slice(0, limit);
  },

  async getByCategory(categoryId) {
    const posts = await this.getPosts();
    if (!categoryId || categoryId === 'all') return posts;
    return posts.filter((p) => p.category === categoryId);
  },

  async getByType(type) {
    const posts = await this.getPosts();
    return posts.filter((p) => p.type === type);
  },

  async getCategories() {
    const data = await this.load();
    return data.categories || [];
  },

  async search(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return this.getPosts();
    const posts = await this.getPosts();
    return posts.filter((p) => {
      const hay = [
        p.title,
        p.excerpt,
        p.category,
        ...(p.tags || [])
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }
};

window.AniAPI = AniAPI;
