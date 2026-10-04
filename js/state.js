/* ============================================================
   Global state, data access & filter engine
   ============================================================ */
const RAW = window.MJS_DASHBOARD_DATA;

const App = {
  projects: RAW.projects,
  legacy: RAW.legacy,
  forensicBid: RAW.forensicBid,
  forensicVariance: RAW.forensicVariance,
  forensicBom: RAW.forensicBom,
  forensicBudget: RAW.forensicBudget,
  forensicLedger: RAW.forensicLedger,
  meta: RAW.meta,

  filters: {
    vertical: '', component: '', location: '', region: '', status: '', priority: '', health: '',
  },
  currentView: 'overview',
  table: {
    // per-table paging/sort/search state, keyed by table id
  },
  charts: {}, // active Chart.js instances keyed by canvas id, for destroy-on-rerender
};

function resetFilters() {
  App.filters = { vertical: '', component: '', location: '', region: '', status: '', priority: '', health: '' };
}

function activeFilterCount() {
  return Object.values(App.filters).filter(v => v).length;
}

function getFilteredProjects(extra) {
  extra = extra || {};
  const f = Object.assign({}, App.filters, extra);
  return App.projects.filter(p => {
    if (f.vertical && p.vertical !== f.vertical) return false;
    if (f.component && p.component !== f.component) return false;
    if (f.location && p.location !== f.location) return false;
    if (f.region && p.geo_region !== f.region) return false;
    if (f.status && p.status !== f.status) return false;
    if (f.priority && p.priority !== f.priority) return false;
    if (f.health && p.health !== f.health) return false;
    return true;
  });
}

function projectByCode(code) {
  return App.projects.find(p => p.code === code) || App.legacy.find(p => p.code === code);
}

function isAttentionProject(p) {
  return (p.priority === 'Critical' || p.priority === 'High') && p.status !== 'Completed';
}

function kpis(list) {
  list = list || getFilteredProjects();
  const total = list.length;
  const completed = list.filter(p => p.status === 'Completed').length;
  const inProgress = list.filter(p => p.status === 'In progress').length;
  const notStarted = list.filter(p => p.status === 'Not started / Stuck').length;
  const onTrack = list.filter(p => p.health === 'On Time' || p.health === 'Ahead of Schedule').length;
  const delayed = list.filter(p => p.health === 'Delayed').length;
  const critical = list.filter(p => p.priority === 'Critical').length;
  const high = list.filter(p => p.priority === 'High').length;
  const attention = list.filter(isAttentionProject).length;
  const totalAward = sum(list, 'award_value');
  const totalActual = sum(list, 'actual_cost');
  const utilization = totalAward > 0 ? (totalActual / totalAward * 100) : null;
  const statesCovered = uniqSorted(list.filter(p => p.geo_region === 'India').map(p => p.location)).length;
  const overseasCovered = uniqSorted(list.filter(p => p.geo_region === 'Overseas').map(p => p.geo_name)).length;
  const verticalsCovered = uniqSorted(list.map(p => p.vertical)).length;
  const totalOutstanding = sum(list, 'outstanding_value');
  const totalDebtors = sum(list, 'debtors');
  const overdueBilling = list.filter(p => (p.outstanding_value || 0) > 0).length;
  return {
    total, completed, inProgress, notStarted, onTrack, delayed, critical, high, attention,
    totalAward, totalActual, utilization, statesCovered, overseasCovered, verticalsCovered,
    totalOutstanding, totalDebtors, overdueBilling,
    pctOnTrack: total ? (onTrack / total * 100) : null,
    pctDelayed: total ? (delayed / total * 100) : null,
    pctCompleted: total ? (completed / total * 100) : null,
  };
}
