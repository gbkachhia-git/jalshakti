/* ============================================================
   Chart.js helpers — thin wrappers with consistent styling,
   pseudo-3D doughnuts (see chart3d.js) and glossy gradient bars.
   ============================================================ */
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
Chart.defaults.font.size = 11.5;
Chart.defaults.color = '#475569';
Chart.defaults.plugins.legend.labels.boxWidth = 10;
Chart.defaults.plugins.legend.labels.boxHeight = 10;

function isDarkTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}
function themeGrid() {
  return isDarkTheme() ? '#23385c' : '#eef2f7';
}
function themeCardBg() {
  return isDarkTheme() ? '#132544' : '#ffffff';
}

function destroyChart(canvasId) {
  if (App.charts[canvasId]) { App.charts[canvasId].destroy(); delete App.charts[canvasId]; }
}

function mkDonut(canvasId, labels, data, colors, opts) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  App.charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: themeCardBg(), hoverOffset: 4 }] },
    options: Object.assign({
      responsive: true, maintainAspectRatio: false, cutout: '58%',
      layout: { padding: { bottom: 16 } },
      plugins: {
        legend: { position: 'right', labels: { padding: 10 } },
        tooltip: { callbacks: { label: (c) => `${c.label}: ${c.parsed} (${(c.parsed / c.dataset.data.reduce((a, b) => a + b, 0) * 100).toFixed(1)}%)` } },
        pseudo3dDoughnut: { enabled: true, depth: 11 },
      },
      onClick: opts && opts.onClick ? (evt, elements) => {
        if (elements.length) opts.onClick(labels[elements[0].index]);
      } : undefined,
    }, opts && opts.extra || {})
  });
}

function mkBar(canvasId, labels, datasets, opts) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const horizontal = !!(opts && opts.horizontal);
  const gradientDatasets = datasets.map(ds => {
    const flatColor = typeof ds.backgroundColor === 'string' ? ds.backgroundColor : CHART_PALETTE[0];
    return Object.assign({}, ds, {
      backgroundColor: (context) => {
        if (!context.chart.chartArea) return flatColor;
        return barGradient(context, flatColor, horizontal);
      },
      hoverBackgroundColor: shadeColor(flatColor, 0.15),
      borderRadius: ds.borderRadius ?? 4,
      borderSkipped: false,
    });
  });
  const grid = themeGrid();
  App.charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: gradientDatasets },
    options: Object.assign({
      responsive: true, maintainAspectRatio: false,
      indexAxis: horizontal ? 'y' : 'x',
      scales: {
        x: { stacked: !!(opts && opts.stacked), grid: { display: horizontal, color: grid }, ticks: { color: Chart.defaults.color } },
        y: { stacked: !!(opts && opts.stacked), grid: { color: grid }, beginAtZero: true, ticks: { color: Chart.defaults.color } }
      },
      plugins: {
        legend: { display: datasets.length > 1, position: 'top', align: 'end' },
        tooltip: { mode: 'index', intersect: false },
        glossyBars: { enabled: true },
      },
      onClick: opts && opts.onClick ? (evt, elements) => {
        if (elements.length) opts.onClick(labels[elements[0].index], datasets[elements[0].datasetIndex]?.label);
      } : undefined,
    }, opts && opts.extra || {})
  });
}

function mkLine(canvasId, labels, datasets, opts) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const grid = themeGrid();
  App.charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: Object.assign({
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, grid: { color: grid } }, x: { grid: { display: false } } },
      plugins: { legend: { display: datasets.length > 1, position: 'top', align: 'end' } },
      interaction: { mode: 'index', intersect: false },
    }, opts && opts.extra || {})
  });
}

const COLOR_HEX = { red: '#dc2626', amber: '#d97706', green: '#16a34a', blue: '#2563eb', grey: '#6b7280' };
