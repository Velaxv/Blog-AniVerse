/* AniVerse utilities */
const utils = {
  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  },

  truncate(text, max = 120) {
    if (!text) return '';
    const clean = String(text).replace(/<[^>]+>/g, '');
    if (clean.length <= max) return clean;
    return clean.slice(0, max).trim() + '…';
  },

  getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  debounce(fn, wait = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  },

  categoryLabel(categories, id) {
    const cat = (categories || []).find((c) => c.id === id);
    return cat ? `${cat.icon || ''} ${cat.name}`.trim() : id;
  },

  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3200);
  },

  setActiveNav() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach((link) => {
      const href = link.getAttribute('href') || '';
      const file = href.split('/').pop().split('?')[0];
      link.classList.toggle('active', file === path || (path === '' && file === 'index.html'));
    });
  },

  initScrollTop() {
    const btn = document.getElementById('scroll-top');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    });
  },

  initMobileMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
      toggle.classList.toggle('open');
    });
  }
};

window.utils = utils;
