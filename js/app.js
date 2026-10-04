/* ============================================================
   App shell: navigation, filter bar, global search, init
   ============================================================ */
const VIEW_RENDERERS = {
  overview: renderOverview,
  departments: renderDepartments,
  programmes: renderProgrammes,
  projects: renderProjects,
  geography: renderGeography,
  actions: renderActions,
  financial: renderFinancial,
  timeline: renderTimeline,
  issues: renderIssues,
  dataquality: renderDataQuality,
};

function switchView(name) {
  if (!VIEW_RENDERERS[name]) return;
  App.currentView = name;
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === name));
  VIEW_RENDERERS[name]();
  document.getElementById('main-scroll-anchor')?.scrollIntoView({ block: 'start' });
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function rerenderCurrentView() {
  VIEW_RENDERERS[App.currentView]();
}

/* ---------------- Filter bar ---------------- */
function populateFilterOptions() {
  const sel = (id, values, labelAll) => {
    const elx = document.getElementById(id);
    elx.innerHTML = `<option value="">${labelAll}</option>` + values.map(v => `<option value="${Fmt.esc(v)}">${Fmt.esc(v)}</option>`).join('');
  };
  sel('f-vertical', uniqSorted(App.projects.map(p => p.vertical)), 'All Verticals');
  sel('f-component', uniqSorted(App.projects.map(p => p.component)), 'All Components');
  sel('f-location', uniqSorted(App.projects.map(p => p.location)), 'All States/Locations');
  sel('f-region', ['India', 'Overseas', 'Unclassified'], 'All Regions');
  sel('f-status', uniqSorted(App.projects.map(p => p.status)), 'All Statuses');
  sel('f-priority', ['Critical', 'High', 'Medium', 'Normal', 'Completed'], 'All Priorities');
  sel('f-health', uniqSorted(App.projects.map(p => p.health)), 'All Health');
}

function syncFilterBarUI() {
  ['vertical', 'component', 'location', 'region', 'status', 'priority', 'health'].forEach(k => {
    const elx = document.getElementById('f-' + k);
    if (elx) elx.value = App.filters[k] || '';
  });
  renderActiveChips();
}

function renderActiveChips() {
  const wrap = document.getElementById('active-chips');
  const chips = Object.entries(App.filters).filter(([k, v]) => v);
  wrap.innerHTML = chips.map(([k, v]) => `<span class="active-filter-chip">${k}: ${Fmt.esc(v)}<button data-chip-remove="${k}">✕</button></span>`).join('');
  wrap.querySelectorAll('[data-chip-remove]').forEach(btn => {
    btn.addEventListener('click', () => { App.filters[btn.getAttribute('data-chip-remove')] = ''; syncFilterBarUI(); rerenderCurrentView(); });
  });
}

function wireFilterBar() {
  ['vertical', 'component', 'location', 'region', 'status', 'priority', 'health'].forEach(k => {
    document.getElementById('f-' + k).addEventListener('change', (e) => {
      App.filters[k] = e.target.value;
      renderActiveChips();
      rerenderCurrentView();
    });
  });
  document.getElementById('btn-reset-filters').addEventListener('click', () => {
    resetFilters(); syncFilterBarUI(); rerenderCurrentView();
  });
}

/* ---------------- Global search ---------------- */
function wireSearch() {
  const input = document.getElementById('global-search');
  const results = document.getElementById('search-results');
  const run = debounce(() => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { results.classList.add('hidden'); results.innerHTML = ''; return; }
    const projMatches = App.projects.filter(p => [p.code, p.title, p.vertical, p.location, p.client, p.component].some(v => v && String(v).toLowerCase().includes(q))).slice(0, 8);
    const legacyMatches = App.legacy.filter(p => [p.code, p.title, p.vertical, p.client].some(v => v && String(v).toLowerCase().includes(q))).slice(0, 4);
    const stateMatches = uniqSorted(App.projects.map(p => p.location)).filter(s => s && s.toLowerCase().includes(q)).slice(0, 5);
    const vertMatches = uniqSorted(App.projects.map(p => p.vertical)).filter(s => s && s.toLowerCase().includes(q)).slice(0, 5);

    let html = '';
    if (projMatches.length) {
      html += `<div class="sr-group-label">Projects</div>` + projMatches.map(p => `<div class="sr-item" data-sr-project="${Fmt.esc(p.code)}"><div class="sr-title">${Fmt.esc(Fmt.truncate(p.title, 60))}</div><div class="sr-sub">${Fmt.esc(p.code)} · ${Fmt.esc(p.vertical)} · ${Fmt.esc(p.location||'N/A')}</div></div>`).join('');
    }
    if (vertMatches.length) {
      html += `<div class="sr-group-label">Business Verticals</div>` + vertMatches.map(v => `<div class="sr-item" data-sr-vertical="${Fmt.esc(v)}"><div class="sr-title">${Fmt.esc(v)}</div></div>`).join('');
    }
    if (stateMatches.length) {
      html += `<div class="sr-group-label">States / Locations</div>` + stateMatches.map(s => `<div class="sr-item" data-sr-state="${Fmt.esc(s)}"><div class="sr-title">${Fmt.esc(s)}</div></div>`).join('');
    }
    if (legacyMatches.length) {
      html += `<div class="sr-group-label">Legacy Register</div>` + legacyMatches.map(p => `<div class="sr-item" data-sr-project="${Fmt.esc(p.code)}"><div class="sr-title">${Fmt.esc(Fmt.truncate(p.title, 60))}</div><div class="sr-sub">${Fmt.esc(p.code)} · Legacy</div></div>`).join('');
    }
    if (!html) html = `<div class="search-empty">No matches for "${Fmt.esc(input.value)}".</div>`;
    results.innerHTML = html;
    results.classList.remove('hidden');
    results.querySelectorAll('[data-sr-project]').forEach(elx => elx.addEventListener('click', () => { openProjectDrawer(elx.getAttribute('data-sr-project')); results.classList.add('hidden'); }));
    results.querySelectorAll('[data-sr-vertical]').forEach(elx => elx.addEventListener('click', () => { openVerticalDrawer(elx.getAttribute('data-sr-vertical')); results.classList.add('hidden'); }));
    results.querySelectorAll('[data-sr-state]').forEach(elx => elx.addEventListener('click', () => { openStateDrawer(elx.getAttribute('data-sr-state')); results.classList.add('hidden'); }));
  }, 180);
  input.addEventListener('input', run);
  input.addEventListener('focus', run);
  document.addEventListener('click', (e) => { if (!e.target.closest('.appbar-search')) results.classList.add('hidden'); });
}

/* ---------------- Nav wiring ---------------- */
function wireNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.getAttribute('data-view')));
  });
  document.getElementById('overlay').addEventListener('click', (e) => { if (e.target.id === 'overlay') closeDrawer(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
}

function updateNavBadges() {
  const attnCount = App.projects.filter(isAttentionProject).length;
  const issuesBadge = document.getElementById('nav-badge-issues');
  if (issuesBadge) issuesBadge.textContent = attnCount;
  const actionsBadge = document.getElementById('nav-badge-actions');
  if (actionsBadge) { buildActionItems(); actionsBadge.textContent = App.actionItems.filter(a => a.daysOverdue > 0).length; }
}

/* ---------------- Init ---------------- */
function initApp() {
  document.getElementById('app-last-updated').textContent = App.meta.generated_on;
  document.getElementById('app-total-projects').textContent = Fmt.num(App.meta.totals.total_projects);
  populateFilterOptions();
  wireFilterBar();
  wireSearch();
  wireNav();
  updateNavBadges();
  switchView('overview');
  window.__appInited = true;
}

document.addEventListener('DOMContentLoaded', initApp);
