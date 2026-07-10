/* AniVerse page bootstraps */
const app = {
  async init() {
    utils.setActiveNav();
    utils.initScrollTop();
    utils.initMobileMenu();
    auth.init();

    const page = document.body.dataset.page || this.detectPage();

    try {
      if (page === 'home') await this.home();
      else if (page === 'post') await this.post();
      else if (page === 'category') await this.category();
      else if (page === 'episodes') await this.typed('episode', '🎬 Episódios & Análises');
      else if (page === 'mangas') await this.typed('manga', '📖 Mangás');
      else if (page === 'about') this.aboutChrome();
      else this.aboutChrome();
    } catch (err) {
      console.error(err);
      utils.toast('Erro ao carregar conteúdo. Tente recarregar.', 'error');
      const grid = document.getElementById('posts-grid');
      if (grid) grid.innerHTML = templates.emptyState('Não foi possível carregar os posts.');
    }

    subscriber.init();
  },

  detectPage() {
    const file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (file === '' || file === 'index.html') return 'home';
    if (file.startsWith('post')) return 'post';
    if (file.startsWith('category')) return 'category';
    if (file.startsWith('episodes')) return 'episodes';
    if (file.startsWith('mangas')) return 'mangas';
    if (file.startsWith('about')) return 'about';
    return 'home';
  },

  async home() {
    const [posts, categories, featured, popular] = await Promise.all([
      AniAPI.getPosts(),
      AniAPI.getCategories(),
      AniAPI.getFeatured(),
      AniAPI.getPopular(5)
    ]);

    const hero = document.getElementById('hero-post');
    if (hero) hero.innerHTML = templates.hero(featured);

    // Feed: outros posts (sem repetir o destaque)
    const feedPosts = posts.filter((p) => !featured || p.id !== featured.id);
    const filterBar = document.getElementById('filter-bar');
    const sectionHeader = document.querySelector('.posts-feed .section-header');
    const grid = document.getElementById('posts-grid');
    const seeAll = document.querySelector('.posts-feed .see-all');

    // Com poucos posts, simplifica a home (sem chips vazios / "ver todos")
    if (posts.length <= 2) {
      if (filterBar) filterBar.hidden = true;
      if (seeAll) seeAll.hidden = true;
    } else if (filterBar) {
      filterBar.hidden = false;
      filterBar.innerHTML = templates.categories(categories, 'all');
    }

    const render = (list) => {
      if (!grid) return;
      if (!list.length) {
        grid.innerHTML = templates.comingSoon();
        if (sectionHeader) {
          const title = sectionHeader.querySelector('.section-title');
          if (title) title.textContent = '✨ Próximos passos';
        }
        return;
      }
      if (sectionHeader) {
        const title = sectionHeader.querySelector('.section-title');
        if (title) title.textContent = '🔥 Posts recentes';
      }
      grid.innerHTML = list.map((p) => templates.postCard(p)).join('');
    };

    filters.activeCategory = 'all';
    filters.init(() => {
      const base = filters.activeCategory === 'all'
        ? feedPosts
        : posts.filter((p) => p.category === filters.activeCategory);
      render(filters.apply(base.length ? base : posts));
    });
    render(feedPosts);

    if (filterBar && !filterBar.hidden) {
      filterBar.querySelectorAll('.cat-chip').forEach((chip) => {
        chip.addEventListener('click', (e) => {
          e.preventDefault();
          filters.activeCategory = chip.dataset.cat;
          filterBar.querySelectorAll('.cat-chip').forEach((c) => {
            c.classList.toggle('active', c === chip);
          });
          const list =
            filters.activeCategory === 'all'
              ? feedPosts
              : posts.filter((p) => p.category === filters.activeCategory);
          render(list);
        });
      });
    }

    const catSide = document.getElementById('categories-sidebar');
    if (catSide) catSide.innerHTML = templates.categoriesSidebar(categories, posts);

    const popSide = document.getElementById('popular-sidebar');
    if (popSide) popSide.innerHTML = templates.popularSidebar(popular);

    const news = document.getElementById('newsletter-widget');
    if (news) news.innerHTML = templates.newsletterWidget();
  },

  async post() {
    const slug = utils.getQueryParam('slug');
    const container = document.getElementById('post-container');
    if (!slug) {
      if (container) container.innerHTML = templates.emptyState('Post não especificado.');
      return;
    }

    const [post, categories, popular] = await Promise.all([
      AniAPI.getPostBySlug(slug),
      AniAPI.getCategories(),
      AniAPI.getPopular(5)
    ]);

    if (!post) {
      if (container) container.innerHTML = templates.emptyState('Post não encontrado.');
      return;
    }

    const cat = categories.find((c) => c.id === post.category);
    const label = cat ? `${cat.icon || ''} ${cat.name}` : post.category;

    if (container) container.innerHTML = templates.postFull(post, label);

    document.title = `${post.title} | AniVerse`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', post.excerpt);

    // Curtidas + visualizações (topo conta view; rodapé só sincroniza UI)
    if (window.engagement) {
      const top = document.getElementById('engagement-top');
      const bottom = document.getElementById('engagement-bottom');
      if (top) {
        engagement.mount(top, post.id).then((stats) => {
          if (bottom && stats) {
            bottom.innerHTML = engagement.barHTML(post.id, stats);
            engagement.bind(bottom, post.id);
            engagement.updateAll(post.id, stats);
          }
        });
      }
    }

    const popSide = document.getElementById('popular-sidebar');
    if (popSide) popSide.innerHTML = templates.popularSidebar(popular);

    const news = document.getElementById('newsletter-widget');
    if (news) news.innerHTML = templates.newsletterWidget();

    const related = document.getElementById('related-grid');
    const relatedSection = document.querySelector('.related-section');
    if (related) {
      const all = await AniAPI.getPosts();
      const list = all
        .filter((p) => p.id !== post.id && p.category === post.category)
        .slice(0, 3);
      const fallback = all.filter((p) => p.id !== post.id).slice(0, 3);
      const final = list.length ? list : fallback;
      if (!final.length) {
        if (relatedSection) relatedSection.hidden = true;
        related.innerHTML = '';
      } else {
        if (relatedSection) relatedSection.hidden = false;
        related.innerHTML = final.map((p) => templates.postCard(p)).join('');
      }
    }
  },

  async category() {
    const catId = utils.getQueryParam('cat') || 'all';
    const q = utils.getQueryParam('q') || '';

    const [posts, categories] = await Promise.all([
      AniAPI.getPosts(),
      AniAPI.getCategories()
    ]);

    const cat = categories.find((c) => c.id === catId);
    const titleEl = document.getElementById('category-title');
    if (titleEl) {
      if (q) titleEl.textContent = `🔍 Resultados para “${q}”`;
      else titleEl.textContent = cat
        ? `${cat.icon || ''} ${cat.name}`
        : 'Todos os posts';
    }

    const filterBar = document.getElementById('filter-bar');
    if (filterBar) filterBar.innerHTML = templates.categories(categories, catId);

    filters.activeCategory = catId;
    filters.query = q;
    const input = document.getElementById('search-input');
    if (input && q) input.value = q;

    const grid = document.getElementById('posts-grid');
    const list = filters.apply(posts);
    if (grid) {
      grid.innerHTML = list.length
        ? list.map((p) => templates.postCard(p)).join('')
        : templates.emptyState('Nenhum post encontrado com esses filtros.');
    }

    filters.init(() => {
      const next = filters.apply(posts);
      if (grid) {
        grid.innerHTML = next.length
          ? next.map((p) => templates.postCard(p)).join('')
          : templates.emptyState('Nenhum post encontrado.');
      }
    });

    const news = document.getElementById('newsletter-widget');
    if (news) news.innerHTML = templates.newsletterWidget();
  },

  async typed(type, heading) {
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = heading;

    const posts = await AniAPI.getByType(type);
    const grid = document.getElementById('posts-grid');
    if (grid) {
      grid.innerHTML = posts.length
        ? posts.map((p) => templates.postCard(p)).join('')
        : templates.emptyState('Em breve novos conteúdos por aqui.');
    }

    const popular = await AniAPI.getPopular(5);
    const popSide = document.getElementById('popular-sidebar');
    if (popSide) popSide.innerHTML = templates.popularSidebar(popular);

    const news = document.getElementById('newsletter-widget');
    if (news) news.innerHTML = templates.newsletterWidget();

    filters.init();
  },

  aboutChrome() {
    const news = document.getElementById('newsletter-widget');
    if (news && !news.querySelector('form')) {
      news.innerHTML = templates.newsletterWidget();
    }
    filters.init();
  }
};

document.addEventListener('DOMContentLoaded', () => app.init());
window.app = app;
