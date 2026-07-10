/* Views & likes — CounterAPI (global) + localStorage (fallback) */
(function () {
  const NS = 'aniverse-blog';
  const BASE = 'https://api.counterapi.dev/v1';

  function safeId(id) {
    return String(id || 'post')
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .slice(0, 48);
  }

  function storageGet(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : v;
    } catch {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      /* private mode */
    }
  }

  function sessionGet(key) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function sessionSet(key, value) {
    try {
      sessionStorage.setItem(key, String(value));
    } catch {
      /* ignore */
    }
  }

  const engagement = {
    keyViews(postId) {
      return `v-${safeId(postId)}`;
    },
    keyLikes(postId) {
      return `l-${safeId(postId)}`;
    },
    localViewsKey(postId) {
      return `aniverse_views_${safeId(postId)}`;
    },
    localLikesKey(postId) {
      return `aniverse_likes_${safeId(postId)}`;
    },
    likedKey(postId) {
      return `aniverse_liked_${safeId(postId)}`;
    },
    viewedKey(postId) {
      return `aniverse_viewed_${safeId(postId)}`;
    },

    format(n) {
      const num = Number(n) || 0;
      if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
      return String(num);
    },

    hasLiked(postId) {
      return storageGet(this.likedKey(postId), '') === '1';
    },

    getLocalViews(postId) {
      return parseInt(storageGet(this.localViewsKey(postId), '0'), 10) || 0;
    },

    getLocalLikes(postId) {
      return parseInt(storageGet(this.localLikesKey(postId), '0'), 10) || 0;
    },

    async fetchJson(url) {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), 4000) : null;
      try {
        const res = await fetch(url, {
          cache: 'no-store',
          mode: 'cors',
          signal: ctrl ? ctrl.signal : undefined
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      } finally {
        if (timer) clearTimeout(timer);
      }
    },

    async remoteGet(name) {
      const data = await this.fetchJson(`${BASE}/${NS}/${name}`);
      return data && typeof data.count === 'number' ? data.count : null;
    },

    async remoteUp(name) {
      const data = await this.fetchJson(`${BASE}/${NS}/${name}/up`);
      return data && typeof data.count === 'number' ? data.count : null;
    },

    async getStats(postId) {
      const [rv, rl] = await Promise.all([
        this.remoteGet(this.keyViews(postId)),
        this.remoteGet(this.keyLikes(postId))
      ]);
      const views = rv != null ? rv : this.getLocalViews(postId);
      const likes = rl != null ? rl : this.getLocalLikes(postId);
      if (rv != null) storageSet(this.localViewsKey(postId), rv);
      if (rl != null) storageSet(this.localLikesKey(postId), rl);
      return { views, likes, liked: this.hasLiked(postId) };
    },

    async trackView(postId) {
      if (!postId) return { views: 0, likes: 0, liked: false };

      const already = sessionGet(this.viewedKey(postId)) === '1';
      if (already) return this.getStats(postId);

      sessionSet(this.viewedKey(postId), '1');

      let views = await this.remoteUp(this.keyViews(postId));
      if (views == null) {
        views = this.getLocalViews(postId) + 1;
      }
      storageSet(this.localViewsKey(postId), views);

      const likesRemote = await this.remoteGet(this.keyLikes(postId));
      const likes = likesRemote != null ? likesRemote : this.getLocalLikes(postId);
      if (likesRemote != null) storageSet(this.localLikesKey(postId), likesRemote);

      return { views, likes, liked: this.hasLiked(postId) };
    },

    async like(postId) {
      if (!postId) return null;
      if (this.hasLiked(postId)) {
        const stats = await this.getStats(postId);
        return { ...stats, liked: true, already: true };
      }

      storageSet(this.likedKey(postId), '1');
      let likes = await this.remoteUp(this.keyLikes(postId));
      if (likes == null) likes = this.getLocalLikes(postId) + 1;
      storageSet(this.localLikesKey(postId), likes);

      const viewsRemote = await this.remoteGet(this.keyViews(postId));
      const views = viewsRemote != null ? viewsRemote : this.getLocalViews(postId);
      return { views, likes, liked: true, already: false };
    },

    barHTML(postId, stats) {
      const s = stats || {
        views: this.getLocalViews(postId),
        likes: this.getLocalLikes(postId),
        liked: this.hasLiked(postId)
      };
      const liked = !!s.liked;
      const id = safeId(postId);
      return (
        '<div class="engagement-bar" data-post-id="' +
        id +
        '" role="group" aria-label="Reações do artigo">' +
        '<div class="eng-stat eng-views" title="Visualizações">' +
        '<span class="eng-icon" aria-hidden="true">👁</span>' +
        '<span class="eng-count" data-eng="views">' +
        this.format(s.views) +
        '</span>' +
        '<span class="eng-label">views</span>' +
        '</div>' +
        '<button type="button" class="eng-like-btn' +
        (liked ? ' is-liked' : '') +
        '" data-eng-like data-post-id="' +
        id +
        '" aria-pressed="' +
        (liked ? 'true' : 'false') +
        '" title="Curtir este artigo">' +
        '<span class="eng-icon eng-heart" aria-hidden="true">' +
        (liked ? '❤️' : '🤍') +
        '</span>' +
        '<span class="eng-count" data-eng="likes">' +
        this.format(s.likes) +
        '</span>' +
        '<span class="eng-label">curtir</span>' +
        '</button>' +
        '</div>'
      );
    },

    cardStatsHTML(postId) {
      const id = safeId(postId);
      return (
        '<div class="card-stats" data-eng-card="' +
        id +
        '" data-raw-id="' +
        id +
        '">' +
        '<span class="card-stat" title="Visualizações">' +
        '<span aria-hidden="true">👁</span> ' +
        '<span data-eng="views">' +
        this.format(this.getLocalViews(postId)) +
        '</span>' +
        '</span>' +
        '<span class="card-stat" title="Curtidas">' +
        '<span aria-hidden="true">❤️</span> ' +
        '<span data-eng="likes">' +
        this.format(this.getLocalLikes(postId)) +
        '</span>' +
        '</span>' +
        '</div>'
      );
    },

    updateUI(root, stats) {
      if (!root || !stats) return;
      root.querySelectorAll('[data-eng="views"]').forEach(function (el) {
        el.textContent = engagement.format(stats.views);
      });
      root.querySelectorAll('[data-eng="likes"]').forEach(function (el) {
        el.textContent = engagement.format(stats.likes);
      });
      root.querySelectorAll('[data-eng-like]').forEach(function (btn) {
        btn.classList.toggle('is-liked', !!stats.liked);
        btn.setAttribute('aria-pressed', stats.liked ? 'true' : 'false');
        const heart = btn.querySelector('.eng-heart');
        if (heart) heart.textContent = stats.liked ? '❤️' : '🤍';
      });
    },

    updateAll(postId, stats) {
      const id = safeId(postId);
      document.querySelectorAll('.engagement-bar[data-post-id="' + id + '"]').forEach(function (bar) {
        engagement.updateUI(bar, stats);
      });
      document.querySelectorAll('[data-eng-card="' + id + '"]').forEach(function (card) {
        engagement.updateUI(card, stats);
      });
    },

    bindLikes(scope) {
      const root = scope || document;
      root.querySelectorAll('[data-eng-like]').forEach(function (btn) {
        if (btn.dataset.bound === '1') return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', async function (e) {
          e.preventDefault();
          e.stopPropagation();
          const postId = btn.getAttribute('data-post-id');
          if (!postId) return;
          btn.disabled = true;
          try {
            const stats = await engagement.like(postId);
            if (!stats) return;
            engagement.updateAll(postId, stats);
            if (window.utils && utils.toast) {
              utils.toast(
                stats.already ? 'Você já curtiu este artigo 💜' : 'Obrigado pela curtida! 💜',
                stats.already ? 'info' : 'success'
              );
            }
          } finally {
            btn.disabled = false;
          }
        });
      });
    },

    /** Monta barras no artigo (topo + rodapé) e registra view */
    async attachToPost(postId) {
      if (!postId) return null;

      const initial = {
        views: this.getLocalViews(postId),
        likes: this.getLocalLikes(postId),
        liked: this.hasLiked(postId)
      };
      const html = this.barHTML(postId, initial);

      let top = document.getElementById('engagement-top');
      let bottom = document.getElementById('engagement-bottom');

      // Se os mounts não existirem (HTML antigo/cache), cria no artigo
      const article = document.querySelector('.post-full');
      if (!top && article) {
        top = document.createElement('div');
        top.id = 'engagement-top';
        top.className = 'engagement-mount';
        const header = article.querySelector('.post-full-header');
        if (header) header.appendChild(top);
        else article.insertBefore(top, article.firstChild);
      }
      if (!bottom && article) {
        const footer = document.createElement('div');
        footer.className = 'engagement-footer';
        footer.innerHTML =
          '<p class="engagement-footer-label">Gostou do artigo?</p><div id="engagement-bottom" class="engagement-mount"></div>';
        article.appendChild(footer);
        bottom = document.getElementById('engagement-bottom');
      }

      if (top) top.innerHTML = html;
      if (bottom) bottom.innerHTML = html;

      this.bindLikes(document);
      const stats = await this.trackView(postId);
      this.updateAll(postId, stats);
      return stats;
    },

    /** Atualiza contadores nos cards da home/listas (sem incrementar view) */
    async hydrateCards(scope) {
      const root = scope || document;
      const cards = root.querySelectorAll('[data-eng-card]');
      if (!cards.length) return;

      const ids = [];
      cards.forEach(function (el) {
        const id = el.getAttribute('data-eng-card');
        if (id && ids.indexOf(id) === -1) ids.push(id);
      });

      await Promise.all(
        ids.map(async function (id) {
          const stats = await engagement.getStats(id);
          engagement.updateAll(id, stats);
        })
      );
    }
  };

  window.engagement = engagement;
})();
