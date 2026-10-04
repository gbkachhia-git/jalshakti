/* ============================================================
   View renderers — one function per navigation section
   ============================================================ */
function el(id) { return document.getElementById(id); }

function kpiCardHtml(opts) {
  // opts: {label, value, sub, tone, pillText, pillTone, onClick-data}
  return `
    <div class="kpi-card ${opts.tone}" data-kpi="${opts.key || ''}">
      ${opts.pillText ? `<span class="kpi-pill pill-${opts.pillTone || opts.tone}">${Fmt.esc(opts.pillText)}</span>` : ''}
      <div class="kpi-label">${Fmt.esc(opts.label)}</div>
      <div class="kpi-value">${opts.value}</div>
      ${opts.sub ? `<div class="kpi-sub">${opts.sub}</div>` : ''}
    </div>`;
}

function wireKpiClicks(container, handlers) {
  container.querySelectorAll('[data-kpi]').forEach(c => {
    const key = c.getAttribute('data-kpi');
    if (handlers[key]) c.addEventListener('click', handlers[key]);
  });
}

function goProjectsWithFilter(patch) {
  resetFilters();
  Object.assign(App.filters, patch);
  switchView('projects');
  syncFilterBarUI();
}

/* =========================================================
   OVERVIEW
   ========================================================= */
function renderOverview() {
  const list = getFilteredProjects();
  const k = kpis(list);
  buildActionItems();
  const overdueActions = App.actionItems.filter(a => a.daysOverdue > 0).length;
  const openActions = App.actionItems.filter(a => a.statusLabel !== 'Completed').length;

  const c = el('view-overview');
  c.innerHTML = `
    <div class="section-head-row">
      <div>
        <h2 class="section-title">🏛 Portfolio at a Glance</h2>
        <p class="section-sub">Executive summary of the Ministry's implementing PSU's live project portfolio. ${activeFilterCount() ? '<b>Filters active — figures reflect current filter selection.</b>' : 'Showing the full live portfolio (' + Fmt.num(App.projects.length) + ' projects).'}</p>
      </div>
    </div>
    <div class="kpi-grid" id="ov-kpis"></div>

    <div class="panel">
      <div class="panel-head"><h3>🗺 India &amp; Overseas Footprint</h3><span class="panel-tag">${k.statesCovered} Indian states/UTs · ${k.overseasCovered} countries</span></div>
      <div class="panel-body"><div id="ov-geo-top" class="state-grid"></div></div>
      <div class="panel-foot"><span data-nav-link="geography" style="cursor:pointer;color:var(--blue-500);font-weight:600;">Open full Geography view →</span></div>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>🌐 India Map — Project Footprint</h3><span class="panel-tag">Street / Satellite / Terrain</span></div>
      <div class="panel-body flush"><div id="ov-india-map" class="map-container"></div></div>
      <div class="panel-foot"><span>Marker size = project count · colour = share delayed/critical. Map imagery loads from public tile services and needs an internet connection; dashboard data itself is fully local.</span></div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h3>⚠ Attention Required</h3><span class="panel-tag">${k.attention} item(s)</span></div>
        <div class="panel-body flush"><div class="attn-list" id="ov-attention"></div></div>
        <div class="panel-foot"><span>Critical + High priority, excluding completed projects</span><span data-nav-link="issues" style="cursor:pointer;color:var(--blue-500);font-weight:600;">View all in Issues →</span></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>📋 Decisions / Interventions Indicated</h3><span class="panel-tag">${App.actionItems.filter(a=>a.category==='Schedule Revision Approval'||a.category==='Recovery Planning').length} item(s)</span></div>
        <div class="panel-body flush"><div class="attn-list" id="ov-decisions"></div></div>
        <div class="panel-foot"><span>Derived from schedule &amp; status fields — see Actions tab</span><span data-nav-link="actions" style="cursor:pointer;color:var(--blue-500);font-weight:600;">Open Action Tracker →</span></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h3>🏢 Business Vertical Performance</h3></div>
        <div class="panel-body"><div class="chart-box" id="ov-vert-chart"><canvas id="cv-ov-vert"></canvas></div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Project Status Distribution</h3></div>
        <div class="panel-body"><div class="chart-box" id="ov-status-chart"><canvas id="cv-ov-status"></canvas></div></div>
      </div>
    </div>

    <div class="grid-3">
      <div class="panel">
        <div class="panel-head"><h3>💡 Key Insights</h3></div>
        <div class="panel-body"><div class="insight-list" id="ov-insights"></div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>🔔 Attention Signals</h3></div>
        <div class="panel-body"><div class="insight-list" id="ov-signals"></div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>🕒 Since Last Review</h3></div>
        <div class="panel-body">
          <div class="empty-state" style="padding:20px 10px;">Historical comparison data not available.<br><span style="font-size:11px;">The supplied export is a single point-in-time snapshot (03 Oct 2026); no prior snapshot was provided to compute period-over-period change.</span></div>
        </div>
      </div>
    </div>
  `;

  // KPI cards
  const utilTone = k.utilization == null ? 'neutral' : k.utilization > 110 ? 'bad' : k.utilization > 95 ? 'warn' : 'ok';
  el('ov-kpis').innerHTML = [
    kpiCardHtml({ key: 'total', label: 'Total Projects', value: Fmt.num(k.total), sub: `${k.verticalsCovered} business verticals`, tone: 'info' }),
    kpiCardHtml({ key: 'ontrack', label: 'On Track', value: Fmt.num(k.onTrack), sub: k.pctOnTrack != null ? Fmt.pct(k.pctOnTrack) + ' of portfolio' : 'N/A', tone: 'ok', pillText: 'Good', pillTone: 'ok' }),
    kpiCardHtml({ key: 'delayed', label: 'Delayed', value: Fmt.num(k.delayed), sub: k.pctDelayed != null ? Fmt.pct(k.pctDelayed) + ' of portfolio' : 'N/A', tone: 'warn', pillText: 'Attention', pillTone: 'warn' }),
    kpiCardHtml({ key: 'critical', label: 'Critical Priority', value: Fmt.num(k.critical), sub: '181+ days late / severe slippage', tone: 'bad', pillText: 'Critical', pillTone: 'bad' }),
    kpiCardHtml({ key: 'actions', label: 'Actions Pending', value: Fmt.num(openActions), sub: 'Derived action &amp; decision items', tone: 'warn', pillText: 'Attention', pillTone: 'warn' }),
    kpiCardHtml({ key: 'overdue', label: 'Overdue Actions', value: Fmt.num(overdueActions), sub: 'Past due date, not completed', tone: 'bad', pillText: 'Critical', pillTone: 'bad' }),
    kpiCardHtml({ key: 'util', label: 'Financial Utilization', value: k.utilization != null ? Fmt.pct(k.utilization) : 'N/A', sub: 'Actual cost ÷ award value', tone: utilTone }),
    kpiCardHtml({ key: 'states', label: 'Geographic Coverage', value: Fmt.num(k.statesCovered), sub: `+ ${k.overseasCovered} countries overseas`, tone: 'info' }),
  ].join('');
  wireKpiClicks(el('ov-kpis'), {
    total: () => goProjectsWithFilter({}),
    ontrack: () => { resetFilters(); App.filters.health = 'On Time'; switchView('projects'); syncFilterBarUI(); },
    delayed: () => goProjectsWithFilter({ health: 'Delayed' }),
    critical: () => goProjectsWithFilter({ priority: 'Critical' }),
    actions: () => switchView('actions'),
    overdue: () => switchView('actions'),
    util: () => switchView('financial'),
    states: () => switchView('geography'),
  });

  // Attention list (top 10 by severity/days late)
  const attn = list.filter(isAttentionProject).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (b.days_late || 0) - (a.days_late || 0)).slice(0, 10);
  el('ov-attention').innerHTML = attn.length ? attn.map(p => attentionRowHtml(p)).join('') : `<div class="empty-state">No attention items under current filters.</div>`;
  wireAttentionRows(el('ov-attention'));

  // Decisions
  const decisions = App.actionItems.filter(a => a.category === 'Schedule Revision Approval' || a.category === 'Recovery Planning').slice(0, 10);
  el('ov-decisions').innerHTML = decisions.length ? decisions.map(a => `
    <div class="attn-item sev-${a.priority}" data-open-action="${a.id}">
      <div class="attn-main">
        <div class="attn-title">${Fmt.esc(a.category)} — ${Fmt.esc(Fmt.truncate(a.project_title, 46))}</div>
        <div class="attn-meta"><span>${Fmt.esc(a.project_code)}</span><span>${Fmt.esc(a.vertical)}</span></div>
      </div>
      <div class="attn-right">${priorityBadge(a.priority)}</div>
    </div>`).join('') : `<div class="empty-state">No decision items indicated.</div>`;
  el('ov-decisions').querySelectorAll('[data-open-action]').forEach(elm => elm.addEventListener('click', () => openActionDrawer(elm.getAttribute('data-open-action'))));

  // charts
  const vertCounts = countBy(list, 'vertical');
  const vertLabels = Object.keys(vertCounts).sort((a, b) => vertCounts[b] - vertCounts[a]);
  mkBar('cv-ov-vert', vertLabels, [{ label: 'Projects', data: vertLabels.map(l => vertCounts[l]), backgroundColor: CHART_PALETTE[0], borderRadius: 4 }], {
    horizontal: true, onClick: (label) => goProjectsWithFilter({ vertical: label })
  });

  const statusCounts = countBy(list, 'status');
  const statusLabels = Object.keys(statusCounts);
  mkDonut('cv-ov-status', statusLabels, statusLabels.map(l => statusCounts[l]),
    statusLabels.map(l => COLOR_HEX[STATUS_COLOR[l]] || '#6b7280'),
    { onClick: (label) => goProjectsWithFilter({ status: label }) });

  // geo top
  const geoCounts = countBy(list.filter(p => p.geo_region !== 'Unclassified'), 'location');
  const topGeo = Object.keys(geoCounts).sort((a, b) => geoCounts[b] - geoCounts[a]).slice(0, 8);
  el('ov-geo-top').innerHTML = topGeo.map(g => {
    const glist = list.filter(p => p.location === g);
    const delayedN = glist.filter(p => p.health === 'Delayed').length;
    return `<div class="state-card" data-open-state="${Fmt.esc(g)}">
      <div class="sc-name"><span>${Fmt.esc(g)}</span><span class="sc-count">${geoCounts[g]}</span></div>
      <div style="font-size:11px;color:var(--ink-500);margin-top:3px;">${delayedN} delayed</div>
    </div>`;
  }).join('');

  // insights + signals
  el('ov-insights').innerHTML = buildKeyInsights(list).map(i => insightHtml(i)).join('');
  el('ov-signals').innerHTML = buildAttentionSignals(list).map(i => insightHtml(i)).join('');

  renderIndiaMap('ov-india-map', list);

  wireDrawerLinks();
  wireNavLinks(c);
}

function attentionRowHtml(p) {
  return `
    <div class="attn-item sev-${p.priority}" data-open-project="${Fmt.esc(p.code)}">
      <div class="attn-main">
        <div class="attn-title">${Fmt.esc(Fmt.truncate(p.title, 58))}</div>
        <div class="attn-meta">
          <span>${Fmt.esc(p.code)}</span><span>${Fmt.esc(p.vertical)}</span><span>${Fmt.esc(p.location || 'N/A')}</span>
        </div>
      </div>
      <div class="attn-right">
        ${priorityBadge(p.priority)}
        ${p.days_late ? `<div class="attn-days">${p.days_late}d late</div>` : ''}
      </div>
    </div>`;
}
function wireAttentionRows(container) {
  container.querySelectorAll('[data-open-project]').forEach(elm => elm.addEventListener('click', () => openProjectDrawer(elm.getAttribute('data-open-project'))));
}
function wireNavLinks(container) {
  container.querySelectorAll('[data-nav-link]').forEach(elm => elm.addEventListener('click', () => switchView(elm.getAttribute('data-nav-link'))));
}

function insightHtml(i) {
  const icon = { bad: '!', warn: '△', info: 'i', ok: '✓' }[i.type] || 'i';
  return `<div class="insight-item t-${i.type}"><div class="ii-icon">${icon}</div><div>${i.text}</div></div>`;
}

function buildKeyInsights(list) {
  const out = [];
  const k = kpis(list);
  const vertCounts = countBy(list, 'vertical');
  const topVert = Object.entries(vertCounts).sort((a, b) => b[1] - a[1])[0];
  if (topVert) {
    const shareTop3 = Object.entries(vertCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).reduce((s, e) => s + e[1], 0);
    out.push({ type: 'info', text: `<b>${topVert[0]}</b> is the largest business vertical with ${topVert[1]} projects (${Fmt.pct(topVert[1] / k.total * 100)} of portfolio); the top 3 verticals account for ${Fmt.pct(shareTop3 / k.total * 100)} of all active work.` });
  }
  if (k.delayed) out.push({ type: 'warn', text: `<b>${k.delayed}</b> projects (${Fmt.pct(k.pctDelayed)}) are currently flagged <b>Delayed</b> against their planned schedule.` });
  if (k.critical) out.push({ type: 'bad', text: `<b>${k.critical}</b> projects are at <b>Critical</b> priority — 181+ days behind schedule or severely stalled.` });
  const stuckNotStarted = list.filter(p => p.status === 'Not started / Stuck' && (p.elapsed_pct || 0) > 100).length;
  if (stuckNotStarted) out.push({ type: 'bad', text: `<b>${stuckNotStarted}</b> projects have already crossed their planned completion window without any recorded physical progress.` });
  const bigTicket = list.filter(p => (p.award_value || 0) > 1e9).length;
  if (bigTicket) out.push({ type: 'info', text: `<b>${bigTicket}</b> projects carry an award value above ₹100 Cr, representing the portfolio's highest financial exposure.` });
  if (k.statesCovered) out.push({ type: 'info', text: `The portfolio spans <b>${k.statesCovered}</b> Indian states/UTs${k.overseasCovered ? ` and <b>${k.overseasCovered}</b> overseas countries` : ''}.` });
  return out.slice(0, 6);
}

/* =========================================================
   DEPARTMENTS (Business Verticals)
   ========================================================= */
function renderDepartments() {
  const list = getFilteredProjects();
  const c = el('view-departments');
  const verticals = uniqSorted(list.map(p => p.vertical));
  c.innerHTML = `
    <div class="section-head-row">
      <div>
        <h2 class="section-title">🏢 Department &amp; Business Vertical Performance</h2>
        <p class="section-sub">The implementing agency organizes delivery into business verticals rather than ministry departments; each card aggregates its live projects. Click a card to drill down.</p>
      </div>
    </div>
    <div class="org-grid" id="dept-grid"></div>
  `;
  const grid = el('dept-grid');
  grid.innerHTML = verticals.map(v => {
    const vl = list.filter(p => p.vertical === v);
    const k = kpis(vl);
    const pctOk = k.total ? (k.onTrack + k.completed) / k.total * 100 : 0;
    return `
    <div class="org-card" data-open-vertical="${Fmt.esc(v)}">
      <div class="org-name">${Fmt.esc(v)}</div>
      <div class="org-sub">${k.total} projects · ${uniqSorted(vl.map(p=>p.location)).length} locations</div>
      <div class="org-stats">
        <div class="org-stat"><div class="n">${k.inProgress}</div><div class="l">Active</div></div>
        <div class="org-stat"><div class="n">${k.completed}</div><div class="l">Done</div></div>
        <div class="org-stat"><div class="n" style="color:var(--amber-600)">${k.delayed}</div><div class="l">Delayed</div></div>
        <div class="org-stat"><div class="n" style="color:var(--red-600)">${k.critical}</div><div class="l">Critical</div></div>
      </div>
      <div class="org-bar">
        <span style="width:${k.total ? k.completed/k.total*100 : 0}%;background:var(--green-500)"></span>
        <span style="width:${k.total ? k.inProgress/k.total*100 : 0}%;background:var(--blue-500)"></span>
        <span style="width:${k.total ? k.notStarted/k.total*100 : 0}%;background:var(--grey-500)"></span>
      </div>
      <div style="font-size:10.5px;color:var(--ink-500);margin-top:6px;">${Fmt.inr(k.totalAward)} total award value</div>
    </div>`;
  }).join('');
  grid.querySelectorAll('[data-open-vertical]').forEach(elm => elm.addEventListener('click', () => openVerticalDrawer(elm.getAttribute('data-open-vertical'))));
}

/* =========================================================
   PROGRAMMES (Service Components: DPR / PMC / EPC / etc.)
   ========================================================= */
function renderProgrammes() {
  const list = getFilteredProjects();
  const c = el('view-programmes');
  c.innerHTML = `
    <div class="section-head-row">
      <div>
        <h2 class="section-title">📑 Programme / Service-Line Performance</h2>
        <p class="section-sub">The source data does not identify named ministry schemes (e.g. Jal Jeevan Mission, Namami Gange); the closest equivalent captured is the agency's <b>service component</b> — the type of assignment undertaken (DPR, PMC, EPC, Supervision, etc.). Click a tile to drill into its projects.</p>
      </div>
    </div>
    <div class="org-grid" id="prog-grid"></div>
    <div class="panel" style="margin-top:16px;">
      <div class="panel-head"><h3>Service-Line Budget vs Actual</h3></div>
      <div class="panel-body"><div class="chart-box lg"><canvas id="cv-prog-fin"></canvas></div></div>
    </div>
  `;
  const comps = uniqSorted(list.map(p => p.component));
  el('prog-grid').innerHTML = comps.map(comp => {
    const cl = list.filter(p => p.component === comp);
    const k = kpis(cl);
    return `
    <div class="org-card" data-prog="${Fmt.esc(comp)}">
      <div class="org-name">${Fmt.esc(comp)}</div>
      <div class="org-sub">${k.total} projects</div>
      <div class="org-stats">
        <div class="org-stat"><div class="n">${k.inProgress}</div><div class="l">Active</div></div>
        <div class="org-stat"><div class="n">${k.completed}</div><div class="l">Done</div></div>
        <div class="org-stat"><div class="n" style="color:var(--amber-600)">${k.delayed}</div><div class="l">Delayed</div></div>
        <div class="org-stat"><div class="n" style="color:var(--red-600)">${k.critical}</div><div class="l">Critical</div></div>
      </div>
      <div style="font-size:10.5px;color:var(--ink-500);margin-top:8px;">${Fmt.inr(k.totalAward)} award · ${k.utilization!=null?Fmt.pct(k.utilization):'N/A'} utilized</div>
    </div>`;
  }).join('');
  el('prog-grid').querySelectorAll('[data-prog]').forEach(elm => elm.addEventListener('click', () => goProjectsWithFilter({ component: elm.getAttribute('data-prog') })));

  const topComps = comps.map(comp => ({ comp, l: list.filter(p => p.component === comp) }))
    .sort((a, b) => sum(b.l, 'award_value') - sum(a.l, 'award_value')).slice(0, 10);
  mkBar('cv-prog-fin', topComps.map(t => t.comp), [
    { label: 'Award Value', data: topComps.map(t => sum(t.l, 'award_value') / 1e7), backgroundColor: CHART_PALETTE[0], borderRadius: 4 },
    { label: 'Actual Cost', data: topComps.map(t => sum(t.l, 'actual_cost') / 1e7), backgroundColor: CHART_PALETTE[3], borderRadius: 4 },
  ], { extra: { scales: { y: { title: { display: true, text: '₹ Crore' } } } } });
}

/* =========================================================
   PROJECTS (full portfolio table)
   ========================================================= */
function renderProjects() {
  const list = getFilteredProjects();
  const c = el('view-projects');
  c.innerHTML = `
    <div class="section-head-row">
      <div>
        <h2 class="section-title">📁 Complete Project Portfolio</h2>
        <p class="section-sub">${Fmt.num(list.length)} of ${Fmt.num(App.projects.length)} live projects match current filters. Click any row for the full detail panel.</p>
      </div>
      <button class="btn" id="projects-export">⬇ Export CSV</button>
    </div>
    <div id="projects-table"></div>
  `;
  const columns = [
    { key: 'code', label: 'Code', render: r => Fmt.esc(r.code) },
    { key: 'title', label: 'Project', wrap: true, render: r => Fmt.esc(Fmt.truncate(r.title, 70)) },
    { key: 'vertical', label: 'Vertical', render: r => Fmt.esc(r.vertical) },
    { key: 'location', label: 'Location', render: r => Fmt.esc(r.location || 'N/A') },
    { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
    { key: 'health', label: 'Health', render: r => healthBadge(r.health) },
    { key: 'priority', label: 'Priority', sortVal: r => PRIORITY_ORDER[r.priority], render: r => priorityBadge(r.priority) },
    { key: 'physical_progress_pct', label: 'Progress', align: 'right', render: r => Fmt.pct(r.physical_progress_pct) },
    { key: 'award_value', label: 'Award Value', align: 'right', render: r => Fmt.inr(r.award_value) },
    { key: 'days_late', label: 'Days Late', align: 'right', render: r => r.days_late ? Fmt.num(r.days_late) : '—' },
    { key: 'planned_finish', label: 'Planned Finish', align: 'right', render: r => Fmt.dateShort(r.planned_finish) },
  ];
  renderDataTable({
    id: 'projects-main', container: el('projects-table'), columns, data: list,
    pageSize: 50, searchPlaceholder: 'Search project code, title, vertical, location, client…',
    searchFn: (r, q) => [r.code, r.title, r.vertical, r.location, r.client, r.component].some(v => v && String(v).toLowerCase().includes(q)),
    defaultSortKey: 'priority', defaultSortDir: 'asc',
    onRowClick: r => openProjectDrawer(r.code),
  });
  el('projects-export').addEventListener('click', () => exportCsv(list));
}

function exportCsv(list) {
  const headers = ['code', 'title', 'vertical', 'location', 'component', 'contract_type', 'status', 'health', 'priority', 'physical_progress_pct', 'award_value', 'actual_cost', 'days_late', 'start_date', 'planned_finish', 'client'];
  const lines = [headers.join(',')];
  list.forEach(r => lines.push(headers.map(h => escCsvCell(r[h])).join(',')));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'wapcos_projects_export.csv';
  a.click();
}

/* =========================================================
   GEOGRAPHY
   ========================================================= */
function renderGeography() {
  const list = getFilteredProjects();
  const c = el('view-geography');
  const india = list.filter(p => p.geo_region === 'India');
  const overseas = list.filter(p => p.geo_region === 'Overseas');
  const unclass = list.filter(p => p.geo_region === 'Unclassified');

  c.innerHTML = `
    <div class="section-head-row">
      <div>
        <h2 class="section-title">🗺 India &amp; Overseas Programme Overview</h2>
        <p class="section-sub">State/location is captured as a free-text field in the source register. The interactive map below plots every resolvable state/UT with the same figures as the cards underneath it.</p>
      </div>
    </div>
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);" id="geo-kpis"></div>
    <div class="panel">
      <div class="panel-head"><h3>🌐 India Map</h3><span class="panel-tag">Street / Satellite / Terrain</span></div>
      <div class="panel-body flush"><div id="geo-india-map" class="map-container lg"></div></div>
      <div class="panel-foot"><span>Marker size = project count · colour = share delayed/critical · click a marker to drill down. Requires internet for map tiles.</span></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>India — State / UT-wise Distribution</h3><span class="panel-tag">${uniqSorted(india.map(p=>p.location)).length} states/UTs</span></div>
      <div class="panel-body"><div class="state-grid" id="geo-india-grid"></div></div>
    </div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h3>Overseas Programmes</h3><span class="panel-tag">${uniqSorted(overseas.map(p=>p.geo_name)).length} countries</span></div>
        <div class="panel-body"><div class="state-grid" id="geo-overseas-grid"></div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Top 10 States by Project Count</h3></div>
        <div class="panel-body"><div class="chart-box"><canvas id="cv-geo-top"></canvas></div></div>
      </div>
    </div>
    ${unclass.length ? `<div class="panel"><div class="panel-head"><h3>Unclassified Location Records</h3><span class="panel-tag">${unclass.length}</span></div><div class="panel-body"><p style="font-size:12px;color:var(--ink-500);">These location values could not be confidently mapped to an Indian state/UT or a country from the source text (e.g. ambiguous site names, blank values) and are kept separate rather than guessed. See Data Quality for the full list.</p></div></div>` : ''}
  `;

  const kAll = kpis(list);
  el('geo-kpis').innerHTML = [
    kpiCardHtml({ label: 'India Projects', value: Fmt.num(india.length), tone: 'info' }),
    kpiCardHtml({ label: 'Overseas Projects', value: Fmt.num(overseas.length), tone: 'info' }),
    kpiCardHtml({ label: 'States / UTs Covered', value: Fmt.num(uniqSorted(india.map(p=>p.location)).length), tone: 'ok' }),
    kpiCardHtml({ label: 'Countries Covered', value: Fmt.num(uniqSorted(overseas.map(p=>p.geo_name)).length), tone: 'ok' }),
  ].join('');

  function stateCard(name, plist) {
    const k = kpis(plist);
    return `<div class="state-card" data-open-state="${Fmt.esc(name)}">
      <div class="sc-name"><span>${Fmt.esc(name)}</span><span class="sc-count">${k.total}</span></div>
      <div class="sc-bars">
        <span style="width:${k.total?k.completed/k.total*100:0}%;background:var(--green-500)"></span>
        <span style="width:${k.total?k.inProgress/k.total*100:0}%;background:var(--blue-500)"></span>
        <span style="width:${k.total?k.notStarted/k.total*100:0}%;background:var(--grey-500)"></span>
      </div>
      <div style="font-size:10.5px;color:var(--ink-500);margin-top:5px;">${k.delayed} delayed · ${k.critical} critical</div>
    </div>`;
  }
  const indiaStates = uniqSorted(india.map(p => p.location)).sort((a, b) => india.filter(p=>p.location===b).length - india.filter(p=>p.location===a).length);
  el('geo-india-grid').innerHTML = indiaStates.map(s => stateCard(s, india.filter(p => p.location === s))).join('');
  const overseasCountries = uniqSorted(overseas.map(p => p.geo_name));
  el('geo-overseas-grid').innerHTML = overseasCountries.length ? overseasCountries.map(s => stateCard(s, overseas.filter(p => p.geo_name === s))).join('') : '<div class="empty-state">No overseas projects under current filters.</div>';
  el('geo-india-grid').querySelectorAll('[data-open-state]').forEach(elm => elm.addEventListener('click', () => openStateDrawer(elm.getAttribute('data-open-state'))));

  const top10 = indiaStates.slice(0, 10);
  mkBar('cv-geo-top', top10, [{ label: 'Projects', data: top10.map(s => india.filter(p => p.location === s).length), backgroundColor: CHART_PALETTE[0], borderRadius: 4 }], { horizontal: true, onClick: (l) => openStateDrawer(l) });

  renderIndiaMap('geo-india-map', list);
}

/* =========================================================
   ACTIONS & DECISIONS TRACKER
   ========================================================= */
function renderActions() {
  buildActionItems();
  const vFilterSet = App.filters.vertical ? new Set(getFilteredProjects().map(p => p.code)) : null;
  const items = vFilterSet ? App.actionItems.filter(a => vFilterSet.has(a.project_code)) : App.actionItems;

  const c = el('view-actions');
  c.innerHTML = `
    <div class="section-head-row">
      <div>
        <h2 class="section-title">✅ Action &amp; Decision Tracker</h2>
        <p class="section-sub">No standalone action-item sheet was supplied. These entries are mechanically derived from project status, schedule and invoicing fields in the PMS export (mobilization pending, billing realization pending, schedule-revision approvals, recorded delay remarks, recovery-planning escalations).</p>
      </div>
    </div>
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);" id="act-kpis"></div>
    <div id="actions-table"></div>
  `;
  const overdue = items.filter(a => a.daysOverdue > 0).length;
  const dueSoon = items.filter(a => a.statusLabel === 'Due Soon').length;
  const onTrack = items.filter(a => a.statusLabel === 'On Track').length;
  el('act-kpis').innerHTML = [
    kpiCardHtml({ label: 'Total Action Items', value: Fmt.num(items.length), tone: 'info' }),
    kpiCardHtml({ label: 'Overdue', value: Fmt.num(overdue), tone: 'bad', pillText: 'Critical', pillTone: 'bad' }),
    kpiCardHtml({ label: 'Due Soon (≤30 days)', value: Fmt.num(dueSoon), tone: 'warn', pillText: 'Attention', pillTone: 'warn' }),
    kpiCardHtml({ label: 'On Track', value: Fmt.num(onTrack), tone: 'ok' }),
  ].join('');

  const columns = [
    { key: 'category', label: 'Category', render: r => Fmt.esc(r.category) },
    { key: 'action', label: 'Action Item', wrap: true, render: r => Fmt.esc(Fmt.truncate(r.action, 90)) },
    { key: 'project_code', label: 'Project', render: r => Fmt.esc(r.project_code) },
    { key: 'vertical', label: 'Vertical', render: r => Fmt.esc(r.vertical) },
    { key: 'owner', label: 'Owner / Client', wrap: true, render: r => Fmt.esc(Fmt.truncate(r.owner, 32)) },
    { key: 'dueDate', label: 'Due Date', render: r => r.dueDate ? Fmt.dateShort(r.dueDate) : 'N/A' },
    { key: 'daysOverdue', label: 'Days Overdue', align: 'right', render: r => r.daysOverdue > 0 ? Fmt.num(r.daysOverdue) : '—' },
    { key: 'statusLabel', label: 'Status', render: r => badgeHtml(r.statusLabel, r.statusColor) },
    { key: 'priority', label: 'Priority', sortVal: r => PRIORITY_ORDER[r.priority] ?? 9, render: r => priorityBadge(r.priority) },
  ];
  renderDataTable({
    id: 'actions-main', container: el('actions-table'), columns, data: items,
    pageSize: 50, searchPlaceholder: 'Search action, project, owner…',
    searchFn: (r, q) => [r.action, r.project_code, r.project_title, r.owner, r.vertical].some(v => v && String(v).toLowerCase().includes(q)),
    defaultSortKey: 'daysOverdue', defaultSortDir: 'desc',
    onRowClick: r => openActionDrawer(r.id),
  });
}

/* =========================================================
   FINANCIAL
   ========================================================= */
function findCostOutliers(list) {
  return list.filter(p => (p.award_value || 0) > 0 && (p.actual_cost || 0) > (p.award_value || 0) * 5);
}

function renderFinancial() {
  const list = getFilteredProjects();
  const k = kpis(list);
  const outliers = findCostOutliers(list);
  const c = el('view-financial');
  c.innerHTML = `
    <div class="section-head-row">
      <div>
        <h2 class="section-title">💰 Financial Performance</h2>
        <p class="section-sub">Budget = contract/award value; Expenditure = actual cost incurred; Utilization = Expenditure ÷ Budget. Realized / Outstanding values reflect invoicing &amp; collection status from the source PMS. Figures are shown only where the source field is populated.</p>
      </div>
    </div>
    ${outliers.length ? `<div class="panel" style="border:1px solid var(--red-100);">
      <div class="panel-body" style="display:flex;gap:10px;align-items:flex-start;background:var(--red-100);">
        <div style="font-size:12.5px;color:var(--red-700);"><b>⚠ Data quality flag:</b> ${outliers.length} project(s) show actual cost more than 5× their award value, which appears inconsistent with the award field — totals below are <b>not</b> adjusted for this (raw source figures), but headline totals may be skewed. ${outliers.map(o => `<span class="tag" data-open-project="${Fmt.esc(o.code)}" style="cursor:pointer;background:#fff;">${Fmt.esc(o.code)}: ${Fmt.inr(o.actual_cost)} actual vs ${Fmt.inr(o.award_value)} award</span>`).join(' ')} — see Data Quality tab.</div>
      </div>
    </div>` : ''}
    <div class="kpi-grid" style="grid-template-columns:repeat(5,1fr);" id="fin-kpis"></div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h3>Award Value vs Actual Cost by Vertical</h3></div>
        <div class="panel-body"><div class="chart-box lg"><canvas id="cv-fin-vert"></canvas></div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Billing Realization</h3></div>
        <div class="panel-body"><div class="chart-box lg"><canvas id="cv-fin-bill"></canvas></div></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>⚠ Illustrative Forensic Analysis</h3><span class="panel-tag">Demo data</span></div>
      <div class="panel-body">
        <div style="font-size:11.5px;background:var(--grey-100);color:var(--grey-700);padding:8px 10px;border-radius:7px;margin-bottom:12px;">
          ⚠ The source workbook includes five "forensic" analysis sheets (bid comparison, DPR-vs-RFP cost variance, BOM quantity/rate variance, budget-component variance, and debtor/creditor ledger ageing). <b>Every row in these sheets is flagged <code>is_demo_data = TRUE</code> by the source file itself</b> — they illustrate what an audit module could surface, but are not verified figures, and are presented here as a methodology preview only, clearly separated from the live project financials above.
        </div>
        <div class="grid-3">
          <div class="dq-card"><div class="dq-n">${App.forensicBid.length}</div><div class="dq-l">Bid comparison records · ${App.forensicBid.filter(b=>b.cartel_flag).length} cartel-flagged</div></div>
          <div class="dq-card"><div class="dq-n">${App.forensicVariance.length}</div><div class="dq-l">DPR vs RFP variance records · ${App.forensicVariance.filter(v=>v.variance_flag==='High Risk').length} high-risk</div></div>
          <div class="dq-card"><div class="dq-n">${App.forensicBom.length}</div><div class="dq-l">BOM variance line items · ${App.forensicBom.filter(b=>b.flag==='High').length} high-flag</div></div>
          <div class="dq-card"><div class="dq-n">${App.forensicBudget.length}</div><div class="dq-l">Budget-component records</div></div>
          <div class="dq-card"><div class="dq-n">${App.forensicLedger.length}</div><div class="dq-l">Ledger / ageing entries · ${App.forensicLedger.filter(l=>l.ageing_bucket==='90+').length} aged 90+ days</div></div>
        </div>
      </div>
    </div>
  `;
  el('fin-kpis').innerHTML = [
    kpiCardHtml({ label: 'Total Award Value', value: Fmt.inr(k.totalAward), tone: 'info' }),
    kpiCardHtml({ label: 'Total Actual Cost', value: Fmt.inr(k.totalActual), tone: 'info' }),
    kpiCardHtml({ label: 'Utilization', value: k.utilization != null ? Fmt.pct(k.utilization) : 'N/A', tone: k.utilization > 105 ? 'bad' : 'ok' }),
    kpiCardHtml({ label: 'Outstanding Value', value: Fmt.inr(k.totalOutstanding), tone: 'warn' }),
    kpiCardHtml({ label: 'Debtors Outstanding', value: Fmt.inr(k.totalDebtors), tone: 'warn' }),
  ].join('');

  const verts = uniqSorted(list.map(p => p.vertical)).map(v => ({ v, l: list.filter(p => p.vertical === v) })).sort((a, b) => sum(b.l, 'award_value') - sum(a.l, 'award_value'));
  mkBar('cv-fin-vert', verts.map(x => x.v), [
    { label: 'Award Value (₹ Cr)', data: verts.map(x => +(sum(x.l, 'award_value') / 1e7).toFixed(1)), backgroundColor: CHART_PALETTE[0], borderRadius: 4 },
    { label: 'Actual Cost (₹ Cr)', data: verts.map(x => +(sum(x.l, 'actual_cost') / 1e7).toFixed(1)), backgroundColor: CHART_PALETTE[3], borderRadius: 4 },
  ], { horizontal: true, onClick: (l) => goProjectsWithFilter({ vertical: l }) });

  const totalRaised = sum(list, 'invoices_raised'), totalRealized = sum(list, 'invoices_realized'), totalDebtors = sum(list, 'debtors');
  mkDonut('cv-fin-bill', ['Realized', 'Outstanding (Debtors)'], [totalRealized, totalDebtors], [COLOR_HEX.green, COLOR_HEX.amber]);
  wireDrawerLinks();
}

/* =========================================================
   TIMELINE
   ========================================================= */
function renderTimeline() {
  const list = getFilteredProjects();
  const c = el('view-timeline');
  c.innerHTML = `
    <div class="section-head-row">
      <div>
        <h2 class="section-title">📅 Timeline &amp; Milestones</h2>
        <p class="section-sub">Planned completion by year, and projects whose planned finish falls in the near term. Use the quick filters below to isolate upcoming, delayed or recently completed work.</p>
      </div>
    </div>
    <div class="filterbar" style="margin-bottom:16px;">
      <span class="fb-label">Quick view</span>
      <button class="btn" data-tf="30">Next 30 days</button>
      <button class="btn" data-tf="90">Next 90 days</button>
      <button class="btn" data-tf="delayed">Delayed</button>
      <button class="btn" data-tf="critical">Critical</button>
      <button class="btn" data-tf="completed">Completed</button>
      <button class="btn" data-tf="all">All</button>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Planned Completions by Year</h3></div>
      <div class="panel-body"><div class="chart-box lg"><canvas id="cv-tl-year"></canvas></div></div>
    </div>
    <div id="timeline-table"></div>
  `;
  const byYear = {};
  list.forEach(p => { if (p.planned_finish) { const y = p.planned_finish.slice(0, 4); byYear[y] = (byYear[y] || 0) + 1; } });
  const years = Object.keys(byYear).sort();
  mkBar('cv-tl-year', years, [{ label: 'Projects due', data: years.map(y => byYear[y]), backgroundColor: CHART_PALETTE[0], borderRadius: 4 }], {});

  let tfState = 'all';
  function renderTfTable() {
    const today = new Date('2026-10-03');
    let rows = list;
    if (tfState === '30' || tfState === '90') {
      const days = parseInt(tfState, 10);
      const until = new Date(today.getTime() + days * 86400000);
      rows = list.filter(p => p.planned_finish && new Date(p.planned_finish) >= today && new Date(p.planned_finish) <= until);
    } else if (tfState === 'delayed') rows = list.filter(p => p.health === 'Delayed');
    else if (tfState === 'critical') rows = list.filter(p => p.priority === 'Critical');
    else if (tfState === 'completed') rows = list.filter(p => p.status === 'Completed');

    renderDataTable({
      id: 'timeline-main', container: el('timeline-table'),
      columns: [
        { key: 'code', label: 'Code', render: r => Fmt.esc(r.code) },
        { key: 'title', label: 'Project', wrap: true, render: r => Fmt.esc(Fmt.truncate(r.title, 60)) },
        { key: 'vertical', label: 'Vertical', render: r => Fmt.esc(r.vertical) },
        { key: 'start_date', label: 'Start', render: r => Fmt.dateShort(r.start_date) },
        { key: 'planned_finish', label: 'Planned Finish', render: r => Fmt.dateShort(r.planned_finish) },
        { key: 'physical_progress_pct', label: 'Progress', align: 'right', render: r => Fmt.pct(r.physical_progress_pct) },
        { key: 'health', label: 'Health', render: r => healthBadge(r.health) },
        { key: 'priority', label: 'Priority', sortVal: r => PRIORITY_ORDER[r.priority], render: r => priorityBadge(r.priority) },
      ],
      data: rows, pageSize: 50, defaultSortKey: 'planned_finish', defaultSortDir: 'asc',
      searchPlaceholder: 'Search…', searchFn: (r, q) => [r.code, r.title, r.vertical].some(v => v && v.toLowerCase().includes(q)),
      onRowClick: r => openProjectDrawer(r.code),
    });
  }
  renderTfTable();
  c.querySelectorAll('[data-tf]').forEach(btn => btn.addEventListener('click', () => { tfState = btn.getAttribute('data-tf'); renderTfTable(); }));
}

/* =========================================================
   ISSUES (Attention Required + Decisions)
   ========================================================= */
function renderIssues() {
  const list = getFilteredProjects();
  const attn = list.filter(isAttentionProject);
  const c = el('view-issues');
  c.innerHTML = `
    <div class="section-head-row">
      <div>
        <h2 class="section-title">🔴 Attention Required &amp; Decisions Indicated</h2>
        <p class="section-sub">Priority is derived from schedule delay fields (delay band / days late) in the source PMS — see the ⓘ in each project's detail panel. Wording below follows "indicated by current project status", not an invented recommendation.</p>
      </div>
    </div>
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);" id="iss-kpis"></div>
    <div id="issues-table"></div>
  `;
  const crit = attn.filter(p => p.priority === 'Critical').length;
  const high = attn.filter(p => p.priority === 'High').length;
  const noUpdate = list.filter(p => p.status === 'Not started / Stuck').length;
  el('iss-kpis').innerHTML = [
    kpiCardHtml({ label: 'Total Attention Items', value: Fmt.num(attn.length), tone: 'warn' }),
    kpiCardHtml({ label: 'Critical', value: Fmt.num(crit), tone: 'bad' }),
    kpiCardHtml({ label: 'High', value: Fmt.num(high), tone: 'warn' }),
    kpiCardHtml({ label: 'Not Started / Stuck', value: Fmt.num(noUpdate), tone: 'neutral' }),
  ].join('');

  const columns = [
    { key: 'priority', label: 'Priority', sortVal: r => PRIORITY_ORDER[r.priority], render: r => priorityBadge(r.priority) },
    { key: 'code', label: 'Code', render: r => Fmt.esc(r.code) },
    { key: 'title', label: 'Project / Issue', wrap: true, render: r => Fmt.esc(Fmt.truncate(r.title, 60)) },
    { key: 'vertical', label: 'Department', render: r => Fmt.esc(r.vertical) },
    { key: 'location', label: 'State/Location', render: r => Fmt.esc(r.location || 'N/A') },
    { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
    { key: 'days_late', label: 'Days Late', align: 'right', render: r => r.days_late ? Fmt.num(r.days_late) : '—' },
    { key: 'client', label: 'Responsible / Client', wrap: true, render: r => Fmt.esc(Fmt.truncate(r.client || 'Not Available', 30)) },
    { key: 'action', label: 'Indicated Action', wrap: true, render: r => Fmt.esc(renderRequiredActionsForProject(r)[0] || 'Review status — see detail panel') },
  ];
  renderDataTable({
    id: 'issues-main', container: el('issues-table'), columns, data: attn,
    pageSize: 50, defaultSortKey: 'priority', defaultSortDir: 'asc',
    searchPlaceholder: 'Search issues…', searchFn: (r, q) => [r.code, r.title, r.vertical, r.location].some(v => v && v.toLowerCase().includes(q)),
    onRowClick: r => openProjectDrawer(r.code),
  });
}

/* =========================================================
   DATA QUALITY
   ========================================================= */
function renderDataQuality() {
  const all = App.projects;
  const c = el('view-dataquality');
  const missingTitle = all.filter(p => !p.title).length;
  const missingDates = all.filter(p => !p.start_date || !p.planned_finish).length;
  const missingStatus = all.filter(p => !p.status).length;
  const missingFinancial = all.filter(p => !p.award_value && !p.contract_amount).length;
  const missingClient = all.filter(p => !p.client).length;
  const unclassLoc = all.filter(p => p.geo_region === 'Unclassified');
  const dupCodes = (() => {
    const seen = {}, dups = [];
    all.forEach(p => { seen[p.code] = (seen[p.code] || 0) + 1; });
    Object.entries(seen).forEach(([k, v]) => { if (v > 1) dups.push(k); });
    return dups;
  })();
  const invalidDates = all.filter(p => p.start_date && p.planned_finish && new Date(p.start_date) > new Date(p.planned_finish)).length;
  const costOutliers = findCostOutliers(all);

  c.innerHTML = `
    <div class="section-head-row">
      <div>
        <h2 class="section-title">🔎 Data Quality</h2>
        <p class="section-sub">Transparency panel — issues identified in the supplied source files. Source values are never silently altered; records are normalized only for display grouping (e.g. location → state/country).</p>
      </div>
    </div>
    <div class="dq-grid">
      <div class="dq-card"><div class="dq-n">${missingTitle}</div><div class="dq-l">Projects missing a title</div></div>
      <div class="dq-card"><div class="dq-n">${missingDates}</div><div class="dq-l">Projects missing start or planned-finish date</div></div>
      <div class="dq-card"><div class="dq-n">${missingStatus}</div><div class="dq-l">Projects missing status</div></div>
      <div class="dq-card"><div class="dq-n">${missingFinancial}</div><div class="dq-l">Projects with no award/contract value recorded</div></div>
      <div class="dq-card"><div class="dq-n">${missingClient}</div><div class="dq-l">Projects with no client name captured</div></div>
      <div class="dq-card"><div class="dq-n">${dupCodes.length}</div><div class="dq-l">Duplicate project codes across the register</div></div>
      <div class="dq-card"><div class="dq-n">${invalidDates}</div><div class="dq-l">Projects where start date is after planned finish</div></div>
      <div class="dq-card"><div class="dq-n">${unclassLoc.length}</div><div class="dq-l">Projects with an unclassified / unverified location string</div></div>
      <div class="dq-card"><div class="dq-n" style="color:var(--red-600)">${costOutliers.length}</div><div class="dq-l">Projects with actual cost &gt;5× award value (likely entry error)</div></div>
    </div>
    <div class="panel" style="margin-top:16px;">
      <div class="panel-head"><h3>Unclassified Location Values</h3></div>
      <div class="panel-body">
        ${unclassLoc.length ? `<div class="tag-list">${uniqSorted(unclassLoc.map(p => p.location || 'Blank')).map(l => `<span class="tag">${Fmt.esc(l)}</span>`).join('')}</div>` : '<div class="empty-state">None.</div>'}
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Implausible Actual-Cost Records</h3><span class="panel-tag">${costOutliers.length}</span></div>
      <div class="panel-body">
        ${costOutliers.length ? costOutliers.map(p => `<div class="drawer-related" data-open-project="${Fmt.esc(p.code)}"><b>${Fmt.esc(Fmt.truncate(p.title,60))}</b><br><span style="color:var(--ink-500);">${Fmt.esc(p.code)} · Award ${Fmt.inr(p.award_value)} vs Actual Cost ${Fmt.inr(p.actual_cost)}</span></div>`).join('') : '<div class="empty-state">None detected.</div>'}
        <p style="font-size:11px;color:var(--ink-500);margin-top:8px;">Flagged where actual_cost exceeds award_value by more than 5×. Source values are shown as-is (not corrected); this almost certainly reflects a data-entry issue in the source PMS export rather than genuine cost overrun of this magnitude.</p>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Legacy / Inactive Register</h3><span class="panel-tag">${App.legacy.length} records</span></div>
      <div class="panel-body"><p style="font-size:12px;color:var(--ink-500);">The source workbook's "Inactive Projects" sheet (${App.legacy.length} records) lists projects with no overlapping codes in the live 1,148-project register — these are treated as a separate legacy/closed-out set and excluded from live KPIs above, but remain searchable and viewable individually.</p></div>
    </div>
    <div class="source-footer">
      <div><b>Primary source:</b> ProjectPortfolio_all_20261003_061248.xlsx — sheets: wapcos_all_projects, Projects (2), Active Projects, Inactive Projects, forensic_* (5 sheets)</div>
      <div><b>Cross-checked against:</b> project-list-report.xlsx, the full-portfolio yearly report export, Project Information.xlsx (exact on-disk file names are kept verbatim in the Data Quality source list for traceability)</div>
      <div><b>As of:</b> 03 Oct 2026</div>
    </div>
  `;
  wireDrawerLinks();
}

function buildAttentionSignals(list) {
  const out = [];
  const over90 = list.filter(p => (p.days_late || 0) > 90).length;
  if (over90) out.push({ type: 'bad', text: `<b>${over90}</b> projects are more than 90 days behind their schedule baseline.` });
  const debtorsHigh = list.filter(p => (p.debtors || 0) > 0);
  if (debtorsHigh.length) out.push({ type: 'warn', text: `<b>${debtorsHigh.length}</b> projects carry unrealized debtors totalling ${Fmt.inr(sum(debtorsHigh, 'debtors'))}.` });
  const overUtil = list.filter(p => p.utilization_pct != null && p.utilization_pct > 110).length;
  if (overUtil) out.push({ type: 'bad', text: `<b>${overUtil}</b> projects have incurred actual cost exceeding their award value by 10%+.` });
  const zeroAward = list.filter(p => (p.award_value || 0) === 0).length;
  if (zeroAward) out.push({ type: 'info', text: `<b>${zeroAward}</b> projects show no award value recorded in the source PMS — likely unpriced / deposit-work / data-pending records.` });
  const noClient = list.filter(p => !p.client).length;
  if (noClient) out.push({ type: 'info', text: `<b>${noClient}</b> projects have no client name captured in the source register.` });
  if (!out.length) out.push({ type: 'ok', text: 'No elevated attention signals detected under current filters.' });
  return out.slice(0, 6);
}
