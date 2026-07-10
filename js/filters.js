/* AniVerse filters & search */
const filters = {
  activeCategory: 'all',
  query: '',

  init(onChange) {
    this.onChange = onChange;
    this.bindSearch();
    this.bindChips();
  },

  bindSearch() {
    const input = document.getElementById('search-input');
    const btn = document.getElementById('search-btn');
    if (!input) return;

    const run = utils.debounce(() => {
      this.query = input.value.trim();
      if (this.onChange) this.onChange();
    }, 280);

    input.addEventListener('input', run);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.query = input.value.trim();
        if (this.query) {
          window.location.href = `category.html?cat=all&q=${encodeURIComponent(this.query)}`;
        } else if (this.onChange) {
          this.onChange();
        }
      }
    });
    if (btn) {
      btn.addEventListener('click', () => {
        this.query = input.value.trim();
        if (this.query) {
          window.location.href = `category.html?cat=all&q=${encodeURIComponent(this.query)}`;
        }
      });
    }
  },

  bindChips() {
    document.addEventListener('click', (e) => {
      const chip = e.target.closest('.cat-chip[data-cat]');
      if (!chip) return;
      // Let navigation happen for real links; for in-page filter bars without href nav:
      if (chip.dataset.noscroll === '1') {
        e.preventDefault();
        this.activeCategory = chip.dataset.cat;
        document.querySelectorAll('.cat-chip').forEach((c) => {
          c.classList.toggle('active', c.dataset.cat === this.activeCategory);
        });
        if (this.onChange) this.onChange();
      }
    });
  },

  apply(posts) {
    let result = posts || [];
    if (this.activeCategory && this.activeCategory !== 'all') {
      result = result.filter((p) => p.category === this.activeCategory);
    }
    if (this.query) {
      const q = this.query.toLowerCase();
      result = result.filter((p) => {
        const hay = [p.title, p.excerpt, p.category, ...(p.tags || [])]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return result;
  }
};

window.filters = filters;
