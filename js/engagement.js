/* Views & likes — CounterAPI (global) + localStorage (per browser) */
const engagement = {
  NS: 'aniverse-blog',
  BASE: 'https://api.counterapi.dev/v1',

  keyViews(postId) {
    return `views-${this._safe(postId)}`;
  },
  keyLikes(postId) {
    return `likes-${this._safe(postId)}`;
  },
  _safe(id) {
    return String(id || 'post')
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .slice(0, 60);
  },

  localKey(type, postId) {
    return `aniverse_${type}_${this._safe(postId)}`;
  },

  async _get(name) {
    try {
      const res = await fetch(`${this.BASE}/${this.NS}/${name}/`, {
        cache: 'no-store'
      });
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data.count === 'number' ? data.count : null;
    } catch {
      return null;
    }
  },

  async _up(name) {
    try {
      const res = await fetch(`${this.BASE}/${this.NS}/${name}/up`, {
        cache: 'no-store'
      });
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data.count === 'number' ? data.count : null;
    } catch {
      return null;
    }
  },

  hasLiked(postId) {
    return localStorage.getItem(this.localKey('liked', postId)) === '1';
  },

  hasViewedSession(postId) {
    return sessionStorage.getItem(this.localKey('viewed', postId)) === '1';
  },

  markViewedSession(postId) {
    sessionStorage.setItem(this.localKey('viewed', postId), '1');
  },

  getLocalCount(type, postId) {
    const n = parseInt(localStorage.getItem(this.localKey(type, postId)) || '0', 10);
    return Number.isFinite(n) ? n : 0;
  },

  setLocalCount(type, postId, n) {
    localStorage.setItem(this.localKey(type, postId), String(Math.max(0, n | 0)));
  },

  format(n) {
    const num = Number(n) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(num);
  },

  async getStats(postId) {
    const [viewsRemote, likesRemote] = await Promise.all([
      this._get(this.keyViews(postId)),
      this._get(this.keyLikes(postId))
    ]);
    const views =
      viewsRemote != null
        ? viewsRemote
        : this.getLocalCount('views', postId);
    const likes =
      likesRemote != null
        ? likesRemote
        : this.getLocalCount('likes', postId);
    if (viewsRemote != null) this.setLocalCount('views', postId, viewsRemote);
    if (likesRemote != null) this.setLocalCount('likes', postId, likesRemote);
    return { views, likes, liked: this.hasLiked(postId) };
  },

  async trackView(postId) {
    if (!postId) return this.getStats(postId);
    // 1 view por aba/sessão (evita inflar no F5)
    if (this.hasViewedSession(postId)) {
      return this.getStats(postId);
    }
    this.markViewedSession(postId);

    let views = await this._up(this.keyViews(postId));
    if (views == null) {
      views = this.getLocalCount('views', postId) + 1;
      this.setLocalCount('views', postId, views);
    } else {
      this.setLocalCount('views', postId, views);
    }

    const likesRemote = await this._get(this.keyLikes(postId));
    const likes =
      likesRemote != null
        ? likesRemote
        : this.getLocalCount('likes', postId);
    if (likesRemote != null) this.setLocalCount('likes', postId, likesRemote);

    return { views, likes, liked: this.hasLiked(postId) };
  },

  async toggleLike(postId) {
    if (!postId) return null;
    // Curtida única por navegador (API de contagem só incrementa)
    if (this.hasLiked(postId)) {
      const stats = await this.getStats(postId);
      return { ...stats, liked: true, already: true };
    }

    localStorage.setItem(this.localKey('liked', postId), '1');
    let likes = await this._up(this.keyLikes(postId));
    if (likes == null) {
      likes = this.getLocalCount('likes', postId) + 1;
      this.setLocalCount('likes', postId, likes);
    } else {
      this.setLocalCount('likes', postId, likes);
    }
    const viewsRemote = await this._get(this.keyViews(postId));
    const views =
      viewsRemote != null
        ? viewsRemote
        : this.getLocalCount('views', postId);
    return { views, likes, liked: true, already: false };
  },

  barHTML(postId, stats = { views: 0, likes: 0, liked: false }) {
    const likedClass = stats.liked ? 'is-liked' : '';
    return `
      <div class="engagement-bar" data-post-id="${this._safe(postId)}" role="group" aria-label="Reações do artigo">
        <div class="eng-stat eng-views" title="Visualizações">
          <span class="eng-icon" aria-hidden="true">👁</span>
          <span class="eng-count" data-eng="views">${this.format(stats.views)}</span>
          <span class="eng-label">views</span>
        </div>
        <button type="button" class="eng-like-btn ${likedClass}" data-eng-like aria-pressed="${stats.liked ? 'true' : 'false'}" title="Curtir este artigo">
          <span class="eng-icon eng-heart" aria-hidden="true">${stats.liked ? '❤️' : '🤍'}</span>
          <span class="eng-count" data-eng="likes">${this.format(stats.likes)}</span>
          <span class="eng-label">curtir</span>
        </button>
      </div>
    `;
  },

  bind(root, postId) {
    const bar = root.querySelector('.engagement-bar');
    if (!bar || bar.dataset.bound === '1') return;
    bar.dataset.bound = '1';

    const btn = bar.querySelector('[data-eng-like]');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      document.querySelectorAll('.eng-like-btn').forEach((b) => {
        b.disabled = true;
      });
      try {
        const stats = await this.toggleLike(postId);
        if (!stats) return;
        this.updateAll(postId, stats);
        if (window.utils) {
          if (stats.already) {
            utils.toast('Você já curtiu este artigo 💜', 'info');
          } else {
            utils.toast('Obrigado pela curtida! 💜', 'success');
          }
        }
      } finally {
        document.querySelectorAll('.eng-like-btn').forEach((b) => {
          b.disabled = false;
        });
      }
    });
  },

  updateUI(bar, stats) {
    if (!bar || !stats) return;
    const viewsEl = bar.querySelector('[data-eng="views"]');
    const likesEl = bar.querySelector('[data-eng="likes"]');
    const btn = bar.querySelector('[data-eng-like]');
    const heart = bar.querySelector('.eng-heart');
    if (viewsEl) viewsEl.textContent = this.format(stats.views);
    if (likesEl) likesEl.textContent = this.format(stats.likes);
    if (btn) {
      btn.classList.toggle('is-liked', !!stats.liked);
      btn.setAttribute('aria-pressed', stats.liked ? 'true' : 'false');
    }
    if (heart) heart.textContent = stats.liked ? '❤️' : '🤍';
  },

  updateAll(postId, stats) {
    const safe = this._safe(postId);
    document.querySelectorAll(`.engagement-bar[data-post-id="${safe}"]`).forEach((bar) => {
      this.updateUI(bar, stats);
    });
  },

  async mount(container, postId) {
    if (!container || !postId) return null;
    // placeholder imediato
    container.innerHTML = this.barHTML(postId, {
      views: this.getLocalCount('views', postId),
      likes: this.getLocalCount('likes', postId),
      liked: this.hasLiked(postId)
    });
    this.bind(container, postId);

    const stats = await this.trackView(postId);
    const bar = container.querySelector('.engagement-bar');
    this.updateUI(bar, stats);
    return stats;
  }
};

window.engagement = engagement;
