function subscribeEmail(email) {
    // Simple subscription logic using localStorage
    const stored = localStorage.getItem('subscribed_emails') || '';
    const emails = stored ? stored.split(',') : [];
    if (!emails.includes(email)) {
        emails.push(email);
        localStorage.setItem('subscribed_emails', emails.join(','));
        const msgEl = document.getElementById('subscribe-msg');
        if (msgEl) msgEl.textContent = 'Obrigado por se inscrever!';
    }
}