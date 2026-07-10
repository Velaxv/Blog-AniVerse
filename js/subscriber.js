/* Newsletter — localStorage for now (ready for Netlify Forms later) */
const subscriber = {
  STORAGE_KEY: 'aniverse_subscribers',

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  },

  save(email) {
    const list = this.getAll();
    const normalized = email.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return { ok: false, message: 'Digite um e-mail válido.' };
    }
    if (list.includes(normalized)) {
      return { ok: true, message: 'Você já está na lista. Obrigado! 💜' };
    }
    list.push(normalized);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    return { ok: true, message: 'Inscrição feita! Bem-vindo ao AniVerse 🌌' };
  },

  init(root = document) {
    const forms = root.querySelectorAll('#subscribe-form, form.subscribe-form');
    forms.forEach((form) => {
      if (form.dataset.bound === '1') return;
      form.dataset.bound = '1';
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input =
          form.querySelector('#subscribe-email, input[type="email"]');
        const msg =
          form.parentElement?.querySelector('#subscribe-msg, .subscribe-msg') ||
          document.getElementById('subscribe-msg');
        const result = this.save(input ? input.value : '');
        if (msg) {
          msg.textContent = result.message;
          msg.className = `subscribe-msg ${result.ok ? 'ok' : 'err'}`;
        }
        if (result.ok) {
          if (input) input.value = '';
          if (window.utils) utils.toast(result.message, 'success');
        } else if (window.utils) {
          utils.toast(result.message, 'error');
        }
      });
    });
  }
};

window.subscriber = subscriber;
