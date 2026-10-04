/* ============================================================
   Light / Dark theme toggle
   ============================================================ */
const Theme = {
  KEY: 'mjs_dashboard_theme',
  get() {
    try { return localStorage.getItem(this.KEY) || 'light'; } catch (e) { return 'light'; }
  },
  set(t) {
    try { localStorage.setItem(this.KEY, t); } catch (e) { /* ignore - private mode etc */ }
    document.documentElement.setAttribute('data-theme', t);
    const moon = document.getElementById('theme-icon-moon');
    const sun = document.getElementById('theme-icon-sun');
    if (moon && sun) {
      moon.classList.toggle('hidden', t === 'dark');
      sun.classList.toggle('hidden', t !== 'dark');
    }
    Chart.defaults.color = t === 'dark' ? '#aebcd6' : '#475569';
    Chart.defaults.borderColor = t === 'dark' ? '#27456f' : '#eef2f7';
    if (typeof rerenderCurrentView === 'function' && window.__appInited) rerenderCurrentView();
  },
  toggle() { this.set(this.get() === 'dark' ? 'light' : 'dark'); },
  init() {
    this.set(this.get());
    document.getElementById('theme-toggle')?.addEventListener('click', () => this.toggle());
  }
};
document.addEventListener('DOMContentLoaded', () => Theme.init());
