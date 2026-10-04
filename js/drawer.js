/* ============================================================
   Drawer / detail-panel rendering (drill-down experience)
   ============================================================ */
const drawerHistory = [];

function openDrawer(renderFn, pushHistory) {
  const overlay = document.getElementById('overlay');
  const drawer = document.getElementById('drawer');
  if (pushHistory !== false) drawerHistory.push(renderFn);
  drawer.innerHTML = renderFn();
  overlay.classList.add('active');
  wireDrawerLinks();
  drawer.scrollTop = 0;
}

function closeDrawer() {
  document.getElementById('overlay').classList.remove('active');
  drawerHistory.length = 0;
}

function drawerBack() {
  if (drawerHistory.length > 1) {
    drawerHistory.pop();
    const prev = drawerHistory[drawerHistory.length - 1];
    document.getElementById('drawer').innerHTML = prev();
    wireDrawerLinks();
  } else {
    closeDrawer();
  }
}

function wireDrawerLinks() {
  document.querySelectorAll('[data-open-project]').forEach(el => {
    el.addEventListener('click', () => openProjectDrawer(el.getAttribute('data-open-project')));
  });
  document.querySelectorAll('[data-open-vertical]').forEach(el => {
    el.addEventListener('click', () => openVerticalDrawer(el.getAttribute('data-open-vertical')));
  });
  document.querySelectorAll('[data-open-state]').forEach(el => {
    el.addEventListener('click', () => openStateDrawer(el.getAttribute('data-open-state')));
  });
  document.querySelectorAll('[data-drawer-back]').forEach(el => el.addEventListener('click', drawerBack));
  document.querySelectorAll('[data-drawer-close]').forEach(el => el.addEventListener('click', closeDrawer));
}

function fieldHtml(label, value, opts) {
  opts = opts || {};
  const isNA = value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value));
  return `<div class="dfield"><div class="fl">${Fmt.esc(label)}</div><div class="fv ${isNA ? 'na' : ''}">${isNA ? 'Data Not Available' : (opts.raw ? value : Fmt.esc(value))}</div></div>`;
}

function priorityBadge(p) {
  const color = PRIORITY_COLOR[p] || 'grey';
  return badgeHtml(p, color);
}
function healthBadge(h) {
  const color = HEALTH_COLOR[h] || 'grey';
  return badgeHtml(h, color);
}
function statusBadge(s) {
  const color = STATUS_COLOR[s] || 'grey';
  return badgeHtml(s, color);
}

/* ---------------- PROJECT DETAIL ---------------- */
function openProjectDrawer(code) {
  const p = projectByCode(code);
  if (!p) return;
  openDrawer(() => renderProjectDrawer(p));
}

function renderProjectDrawer(p) {
  const isLegacy = !('priority' in p);
  const progress = p.physical_progress_pct;
  const progressColor = progress >= 80 ? 'var(--green-500)' : progress >= 40 ? 'var(--blue-500)' : (p.priority === 'Critical' ? 'var(--red-500)' : 'var(--amber-500)');
  const bid = App.forensicBid.filter(b => b.project_code === p.code);
  const variance = App.forensicVariance.filter(v => v.project_code === p.code);
  const bom = App.forensicBom.filter(b => b.project_code === p.code);
  const budgetRows = App.forensicBudget.filter(b => b.project_code === p.code);
  const ledgerRows = App.forensicLedger.filter(l => l.project_code === p.code);
  const hasForensic = bid.length || variance.length || bom.length || budgetRows.length || ledgerRows.length;

  return `
    <div class="drawer-head">
      <div style="min-width:0;flex:1;">
        <div class="breadcrumbs"><span data-drawer-back>← Back</span> &nbsp;/&nbsp; Project</div>
        <h2>${Fmt.esc(Fmt.truncate(p.title, 90))}</h2>
        <div class="dh-sub">${Fmt.esc(p.code)} &nbsp;·&nbsp; ${Fmt.esc(p.vertical || 'N/A')} &nbsp;·&nbsp; ${Fmt.esc(p.location || 'N/A')}${isLegacy ? ' &nbsp;·&nbsp; LEGACY REGISTER' : ''}</div>
      </div>
      <button class="drawer-close" data-drawer-close>✕</button>
    </div>
    <div class="drawer-body scroll-thin">
      <div class="dsection">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
          ${isLegacy ? badgeHtml('Legacy / Inactive Record', 'grey') : statusBadge(p.status)}
          ${!isLegacy && p.health ? healthBadge(p.health) : ''}
          ${!isLegacy && p.priority && p.priority !== 'Completed' && p.priority !== 'Normal' ? priorityBadge(p.priority) : ''}
        </div>
        ${!isLegacy ? `
        <div class="fl" style="margin-bottom:3px;">Physical Progress</div>
        <div class="progress-track"><div class="progress-fill" style="width:${progress || 0}%;background:${progressColor}"></div></div>
        <div style="font-size:11px;color:var(--ink-500);margin-top:3px;">${Fmt.pct(progress)} complete${p.elapsed_pct != null ? ' · ' + Fmt.pct(p.elapsed_pct) + ' of planned duration elapsed' : ''}</div>
        ` : `<div style="font-size:11.5px;color:var(--ink-500);">This record is from the Inactive/Legacy project register and carries limited live tracking fields.</div>`}
      </div>

      <div class="dsection">
        <h4>Project Overview</h4>
        <div class="dgrid">
          ${fieldHtml('Contract Type', p.contract_type)}
          ${fieldHtml('Service Component', p.component)}
          ${fieldHtml('Client', p.client)}
          ${fieldHtml('Start Date', Fmt.date(p.start_date || p.planned_start))}
          ${fieldHtml('Planned Completion', Fmt.date(p.planned_finish || p.planned_end))}
          ${fieldHtml('Revised Completion', p.revised_completion ? Fmt.date(p.revised_completion) : null)}
          ${!isLegacy ? fieldHtml('Days Late', p.days_late != null ? Fmt.num(p.days_late) + ' days' : null) : ''}
          ${!isLegacy ? fieldHtml('Delay Band', p.delay_band) : ''}
          ${!isLegacy ? fieldHtml('Schedule ETA Note', p.eta_note) : ''}
        </div>
      </div>

      <div class="dsection">
        <h4>Financial</h4>
        <div class="dgrid">
          ${fieldHtml('Award / Contract Value', p.award_value != null ? Fmt.inr(p.award_value) : (p.contract_amount != null ? Fmt.inr(p.contract_amount) : null))}
          ${fieldHtml('Actual Cost Incurred', p.actual_cost != null ? Fmt.inr(p.actual_cost) : null)}
          ${!isLegacy ? fieldHtml('Financial Utilization', p.utilization_pct != null ? Fmt.pct(p.utilization_pct) : null) : ''}
          ${!isLegacy ? fieldHtml('Planned Billing Value', Fmt.inr(p.planned_billing_value)) : ''}
          ${!isLegacy ? fieldHtml('Realized Value', Fmt.inr(p.realized_value)) : ''}
          ${!isLegacy ? fieldHtml('Outstanding Value', Fmt.inr(p.outstanding_value)) : ''}
          ${fieldHtml('Invoices Raised', p.invoices_raised != null ? Fmt.inr(p.invoices_raised) : null)}
          ${fieldHtml('Invoices Realized', p.invoices_realized != null ? Fmt.inr(p.invoices_realized) : null)}
          ${fieldHtml('Debtors Outstanding', p.debtors != null ? Fmt.inr(p.debtors) : null)}
          ${fieldHtml('Revised Cost (if any)', p.revised_cost != null ? Fmt.inr(p.revised_cost) : null)}
        </div>
      </div>

      ${!isLegacy ? `
      <div class="dsection">
        <h4>Milestones</h4>
        <div class="dgrid">
          ${fieldHtml('Total Milestones', p.milestones_total)}
          ${fieldHtml('Achieved', p.milestones_achieved)}
          ${fieldHtml('Remaining', p.milestones_remaining)}
          ${fieldHtml('% Achieved', p.milestones_achieved_pct != null ? Fmt.pct(p.milestones_achieved_pct * 100) : null)}
        </div>
      </div>` : ''}

      <div class="dsection">
        <h4>Issues / Remarks</h4>
        ${p.delay_reason ? `<div style="font-size:12.5px;background:var(--amber-100);color:var(--amber-700);padding:8px 10px;border-radius:7px;">${Fmt.esc(p.delay_reason)}</div>` :
          `<div style="font-size:12px;color:var(--ink-400);font-style:italic;">No remark recorded in source data.</div>`}
      </div>

      ${!isLegacy ? `
      <div class="dsection">
        <h4>Required Action <span class="tooltip-info" title="Derived from status/schedule/billing fields">ⓘ</span></h4>
        ${renderRequiredActionsForProject(p).length ? renderRequiredActionsForProject(p).map(a => `<div class="drawer-related" style="cursor:default;">${Fmt.esc(a)}</div>`).join('') :
          `<div style="font-size:12px;color:var(--ink-400);font-style:italic;">No outstanding action signalled by current data.</div>`}
      </div>` : ''}

      ${hasForensic ? `
      <div class="dsection">
        <h4>Illustrative Forensic Analysis <span class="tooltip-info" title="Source-flagged as demo/illustrative data (is_demo_data = TRUE) — shown for methodology reference only, not verified financial fact.">ⓘ</span></h4>
        <div style="font-size:11px;background:var(--grey-100);color:var(--grey-700);padding:6px 9px;border-radius:6px;margin-bottom:8px;">⚠ These rows are flagged <b>is_demo_data = TRUE</b> in the source workbook — illustrative only, not verified figures.</div>
        ${bid.length ? `<div class="kv-mini"><div class="k">Bid comparison records</div><div class="v">${bid.length} bidder(s)${bid.some(b=>b.cartel_flag) ? ' · cartel flag raised' : ''}</div></div>` : ''}
        ${variance.length ? variance.map(v => `<div class="kv-mini"><div class="k">${Fmt.esc(v.cost_component)} — DPR vs RFP variance</div><div class="v">${Fmt.pct(v.variance_pct)} (${Fmt.esc(v.variance_flag)})</div></div>`).join('') : ''}
        ${bom.length ? `<div class="kv-mini"><div class="k">BOM variance line items</div><div class="v">${bom.length}</div></div>` : ''}
        ${budgetRows.length ? `<div class="kv-mini"><div class="k">Budget components tracked</div><div class="v">${budgetRows.length}</div></div>` : ''}
        ${ledgerRows.length ? `<div class="kv-mini"><div class="k">Ledger entries</div><div class="v">${ledgerRows.length}</div></div>` : ''}
      </div>` : ''}

      <div class="dsection">
        <h4>Data Source</h4>
        <div style="font-size:11px;color:var(--ink-500);">Source Project Management System — ${isLegacy ? "the Inactive Projects register" : "the primary project register + location + client/invoicing sheets"}, ProjectPortfolio_all_20261003_061248.xlsx.</div>
      </div>
    </div>
  `;
}

function renderRequiredActionsForProject(p) {
  const actions = [];
  if (p.status === 'Not started / Stuck' && (p.elapsed_pct || 0) > 100) {
    actions.push(`Mobilize / commence execution — ${Fmt.pct(p.elapsed_pct)} of planned duration elapsed with 0% physical progress.`);
  }
  if ((p.debtors || 0) > 0) {
    actions.push(`Follow up realization of ${Fmt.inr(p.debtors)} outstanding from ${p.client || 'client'}.`);
  }
  if (p.revised_completion) {
    actions.push(`Formalize approval of revised completion date (${Fmt.date(p.revised_completion)}).`);
  }
  if (p.priority === 'Critical' && p.status === 'In progress') {
    actions.push(`Escalate for recovery planning — schedule slippage of ${Fmt.num(p.days_late)} days against plan.`);
  }
  return actions;
}

/* ---------------- VERTICAL / DEPARTMENT DETAIL ---------------- */
function openVerticalDrawer(vertical) {
  openDrawer(() => renderVerticalDrawer(vertical));
}
function renderVerticalDrawer(vertical) {
  const list = App.projects.filter(p => p.vertical === vertical);
  const k = kpis(list);
  const statuses = countBy(list, 'status');
  const states = uniqSorted(list.map(p => p.location));
  const attn = list.filter(isAttentionProject).sort((a, b) => (b.days_late || 0) - (a.days_late || 0)).slice(0, 8);
  const clients = uniqSorted(list.map(p => p.client)).filter(Boolean);

  return `
    <div class="drawer-head">
      <div style="min-width:0;flex:1;">
        <div class="breadcrumbs"><span data-drawer-back>← Back</span> &nbsp;/&nbsp; Business Vertical</div>
        <h2>${Fmt.esc(vertical)}</h2>
        <div class="dh-sub">${k.total} projects &nbsp;·&nbsp; ${states.length} state(s)/location(s)</div>
      </div>
      <button class="drawer-close" data-drawer-close>✕</button>
    </div>
    <div class="drawer-body scroll-thin">
      <div class="dsection">
        <h4>Summary</h4>
        <div class="dgrid">
          ${fieldHtml('Total Projects', k.total)}
          ${fieldHtml('Completed', k.completed)}
          ${fieldHtml('In Progress', k.inProgress)}
          ${fieldHtml('Not Started / Stuck', k.notStarted)}
          ${fieldHtml('On Track', k.onTrack)}
          ${fieldHtml('Delayed', k.delayed)}
          ${fieldHtml('Critical Priority', k.critical)}
          ${fieldHtml('High Priority', k.high)}
        </div>
      </div>
      <div class="dsection">
        <h4>Financial Status</h4>
        <div class="dgrid">
          ${fieldHtml('Total Award Value', Fmt.inr(k.totalAward))}
          ${fieldHtml('Total Actual Cost', Fmt.inr(k.totalActual))}
          ${fieldHtml('Utilization', k.utilization != null ? Fmt.pct(k.utilization) : null)}
          ${fieldHtml('Outstanding Value', Fmt.inr(k.totalOutstanding))}
        </div>
      </div>
      <div class="dsection">
        <h4>Attention Required (top ${attn.length})</h4>
        ${attn.length ? attn.map(p => `<div class="drawer-related" data-open-project="${Fmt.esc(p.code)}"><b>${Fmt.esc(Fmt.truncate(p.title, 60))}</b><br><span style="color:var(--ink-500);">${Fmt.esc(p.code)} · ${Fmt.esc(p.location || 'N/A')} · ${priorityBadge(p.priority)}</span></div>`).join('') : '<div class="empty-state">No attention items in this vertical.</div>'}
      </div>
      <div class="dsection">
        <h4>States / Locations Covered</h4>
        <div class="tag-list">${states.map(s => `<span class="tag" data-open-state="${Fmt.esc(s)}" style="cursor:pointer;">${Fmt.esc(s)}</span>`).join('')}</div>
      </div>
      <div class="dsection">
        <h4>Client Base (sample)</h4>
        <div class="tag-list">${clients.slice(0, 20).map(c => `<span class="tag">${Fmt.esc(Fmt.truncate(c, 36))}</span>`).join('')}${clients.length > 20 ? `<span class="tag">+${clients.length - 20} more</span>` : ''}</div>
      </div>
    </div>
  `;
}

/* ---------------- STATE / GEOGRAPHY DETAIL ---------------- */
function openStateDrawer(loc) {
  openDrawer(() => renderStateDrawer(loc));
}
function renderStateDrawer(loc) {
  const list = App.projects.filter(p => p.location === loc);
  const k = kpis(list);
  const verticals = countBy(list, 'vertical');
  const attn = list.filter(isAttentionProject).sort((a, b) => (b.days_late || 0) - (a.days_late || 0)).slice(0, 10);
  const majorByValue = list.slice().sort((a, b) => (b.award_value || 0) - (a.award_value || 0)).slice(0, 6);

  return `
    <div class="drawer-head">
      <div style="min-width:0;flex:1;">
        <div class="breadcrumbs"><span data-drawer-back>← Back</span> &nbsp;/&nbsp; Geography</div>
        <h2>${Fmt.esc(loc)}</h2>
        <div class="dh-sub">${k.total} project(s)</div>
      </div>
      <button class="drawer-close" data-drawer-close>✕</button>
    </div>
    <div class="drawer-body scroll-thin">
      <div class="dsection">
        <h4>Summary</h4>
        <div class="dgrid">
          ${fieldHtml('Total Projects', k.total)}
          ${fieldHtml('Active (In progress)', k.inProgress)}
          ${fieldHtml('Completed', k.completed)}
          ${fieldHtml('Not Started / Stuck', k.notStarted)}
          ${fieldHtml('Delayed', k.delayed)}
          ${fieldHtml('Critical Priority', k.critical)}
        </div>
      </div>
      <div class="dsection">
        <h4>Financial Status</h4>
        <div class="dgrid">
          ${fieldHtml('Total Award Value', Fmt.inr(k.totalAward))}
          ${fieldHtml('Total Actual Cost', Fmt.inr(k.totalActual))}
          ${fieldHtml('Outstanding Value', Fmt.inr(k.totalOutstanding))}
        </div>
      </div>
      <div class="dsection">
        <h4>Major Projects (by value)</h4>
        ${majorByValue.map(p => `<div class="drawer-related" data-open-project="${Fmt.esc(p.code)}"><b>${Fmt.esc(Fmt.truncate(p.title, 60))}</b><br><span style="color:var(--ink-500);">${Fmt.esc(p.vertical)} · ${Fmt.inr(p.award_value)}</span></div>`).join('')}
      </div>
      <div class="dsection">
        <h4>Issues / Attention Items</h4>
        ${attn.length ? attn.map(p => `<div class="drawer-related" data-open-project="${Fmt.esc(p.code)}"><b>${Fmt.esc(Fmt.truncate(p.title, 60))}</b><br><span style="color:var(--ink-500);">${Fmt.esc(p.code)} · ${priorityBadge(p.priority)}</span></div>`).join('') : '<div class="empty-state">No attention items in this location.</div>'}
      </div>
      <div class="dsection">
        <h4>Business Verticals Present</h4>
        <div class="tag-list">${Object.keys(verticals).map(v => `<span class="tag">${Fmt.esc(v)} (${verticals[v]})</span>`).join('')}</div>
      </div>
    </div>
  `;
}

/* ---------------- ACTION DETAIL ---------------- */
function openActionDrawer(actionId) {
  const a = App.actionItems.find(x => x.id === actionId);
  if (!a) return;
  openDrawer(() => renderActionDrawer(a));
}
function renderActionDrawer(a) {
  return `
    <div class="drawer-head">
      <div style="min-width:0;flex:1;">
        <div class="breadcrumbs"><span data-drawer-back>← Back</span> &nbsp;/&nbsp; Action Item</div>
        <h2>${Fmt.esc(Fmt.truncate(a.action, 90))}</h2>
        <div class="dh-sub">${Fmt.esc(a.project_code)} &nbsp;·&nbsp; ${Fmt.esc(a.vertical)}</div>
      </div>
      <button class="drawer-close" data-drawer-close>✕</button>
    </div>
    <div class="drawer-body scroll-thin">
      <div class="dsection">
        <div style="display:flex;gap:8px;margin-bottom:10px;">${badgeHtml(a.statusLabel, a.statusColor)}${priorityBadge(a.priority)}</div>
        <div class="dgrid">
          ${fieldHtml('Action', a.action)}
          ${fieldHtml('Related Project', a.project_title)}
          ${fieldHtml('Department / Vertical', a.vertical)}
          ${fieldHtml('Owner / Client', a.owner)}
          ${fieldHtml('Due Date', a.dueDate ? Fmt.date(a.dueDate) : null)}
          ${fieldHtml('Days Overdue', a.daysOverdue > 0 ? a.daysOverdue + ' days' : null)}
          ${fieldHtml('Source Category', a.category)}
          ${fieldHtml('Remarks', a.remarks)}
        </div>
      </div>
      <div class="dsection">
        <div class="drawer-related" data-open-project="${Fmt.esc(a.project_code)}">Open related project →</div>
      </div>
    </div>
  `;
}
