/* ============================================================
   Utility layer: formatting, helpers, small generic functions
   ============================================================ */
const Fmt = {
  inr(v, opts) {
    opts = opts || {};
    if (v === null || v === undefined || isNaN(v)) return 'N/A';
    const abs = Math.abs(v);
    let out;
    if (abs >= 1e7) out = '₹ ' + (v / 1e7).toFixed(2) + ' Cr';
    else if (abs >= 1e5) out = '₹ ' + (v / 1e5).toFixed(2) + ' L';
    else out = '₹ ' + Math.round(v).toLocaleString('en-IN');
    return out;
  },
  inrShort(v) {
    if (v === null || v === undefined || isNaN(v)) return 'N/A';
    const abs = Math.abs(v);
    if (abs >= 1e7) return (v / 1e7).toFixed(1) + 'Cr';
    if (abs >= 1e5) return (v / 1e5).toFixed(1) + 'L';
    return Math.round(v).toLocaleString('en-IN');
  },
  num(v) {
    if (v === null || v === undefined || isNaN(v)) return 'N/A';
    return Number(v).toLocaleString('en-IN');
  },
  pct(v, digits) {
    if (v === null || v === undefined || isNaN(v)) return 'N/A';
    return Number(v).toFixed(digits === undefined ? 1 : digits) + '%';
  },
  date(v) {
    if (!v) return 'N/A';
    const d = new Date(v);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  dateShort(v) {
    if (!v) return 'N/A';
    const d = new Date(v);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  },
  naIf(v, fmtFn) {
    if (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) return '<span class="fv na">Data Not Available</span>';
    return fmtFn ? fmtFn(v) : v;
  },
  esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  truncate(s, n) {
    if (!s) return '';
    s = String(s);
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }
};

function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

function uniqSorted(arr) {
  return Array.from(new Set(arr.filter(v => v !== null && v !== undefined && v !== ''))).sort();
}

function sum(arr, key) {
  return arr.reduce((a, r) => a + (typeof key === 'function' ? (key(r) || 0) : (r[key] || 0)), 0);
}

function countBy(arr, key) {
  const m = {};
  arr.forEach(r => {
    const k = (typeof key === 'function' ? key(r) : r[key]) ?? 'N/A';
    m[k] = (m[k] || 0) + 1;
  });
  return m;
}

function escCsvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Normal: 3, Completed: 4 };
const PRIORITY_COLOR = { Critical: 'red', High: 'amber', Medium: 'amber', Normal: 'green', Completed: 'blue' };
const HEALTH_COLOR = { 'Delayed': 'red', 'On Time': 'green', 'Ahead of Schedule': 'blue' };
const STATUS_COLOR = { 'In progress': 'blue', 'Completed': 'green', 'Not started / Stuck': 'grey' };

const CHART_PALETTE = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#64748b', '#be185d', '#059669', '#ca8a04'];

function badgeHtml(text, color) {
  return `<span class="badge badge-${color}"><span class="badge-dot"></span>${Fmt.esc(text)}</span>`;
}
