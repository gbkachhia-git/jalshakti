/* ============================================================
   Lightweight "pseudo-3D" styling for Chart.js — no extra heavy
   3D library, just canvas-level depth/gradient/shadow tricks so
   doughnuts read as cylinders and bars read as embossed/glossy.
   Registered globally; each plugin checks chart type internally.
   ============================================================ */
function hexToRgb(hex) {
  if (!hex || hex[0] !== '#') return null;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function shadeColor(color, percent) {
  // percent negative = darker, positive = lighter
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const r = Math.round((t - rgb.r) * p + rgb.r);
  const g = Math.round((t - rgb.g) * p + rgb.g);
  const b = Math.round((t - rgb.b) * p + rgb.b);
  return `rgb(${r},${g},${b})`;
}

const Pseudo3DDoughnut = {
  id: 'pseudo3dDoughnut',
  beforeDatasetsDraw(chart, args, opts) {
    if (chart.config.type !== 'doughnut' && chart.config.type !== 'pie') return;
    if (opts.enabled === false) return;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data || !meta.data.length) return;
    const depth = opts.depth ?? 11;
    const { ctx } = chart;
    ctx.save();
    for (let s = depth; s >= 1; s--) {
      const shadeFactor = -0.28 - (0.22 * (s / depth)); // darker toward the bottom
      meta.data.forEach((arc) => {
        const bg = arc.options && arc.options.backgroundColor;
        if (!bg || bg === 'transparent') return;
        const dark = shadeColor(bg, shadeFactor);
        ctx.beginPath();
        ctx.fillStyle = dark;
        ctx.moveTo(arc.x, arc.y + s);
        ctx.arc(arc.x, arc.y + s, arc.outerRadius, arc.startAngle, arc.endAngle);
        ctx.arc(arc.x, arc.y + s, Math.max(arc.innerRadius, 0.01), arc.endAngle, arc.startAngle, true);
        ctx.closePath();
        ctx.fill();
      });
    }
    ctx.restore();
  },
  afterDatasetsDraw(chart, args, opts) {
    if (chart.config.type !== 'doughnut' && chart.config.type !== 'pie') return;
    if (opts.enabled === false) return;
    // subtle top-face sheen for extra depth cue
    const meta = chart.getDatasetMeta(0);
    if (!meta) return;
    const { ctx } = chart;
    ctx.save();
    meta.data.forEach((arc) => {
      const grad = ctx.createRadialGradient(arc.x, arc.y - arc.outerRadius * 0.3, 2, arc.x, arc.y, arc.outerRadius);
      grad.addColorStop(0, 'rgba(255,255,255,0.22)');
      grad.addColorStop(0.55, 'rgba(255,255,255,0.04)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.moveTo(arc.x, arc.y);
      ctx.arc(arc.x, arc.y, arc.outerRadius, arc.startAngle, arc.endAngle);
      ctx.arc(arc.x, arc.y, Math.max(arc.innerRadius, 0.01), arc.endAngle, arc.startAngle, true);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }
};

const GlossyBars = {
  id: 'glossyBars',
  beforeDatasetsDraw(chart, args, opts) {
    if (chart.config.type !== 'bar') return;
    if (opts.enabled === false) return;
    chart.$glossyShadow = true;
  },
  beforeDatasetDraw(chart, args) {
    if (chart.config.type !== 'bar') return;
    const { ctx } = chart;
    ctx.save();
    ctx.shadowColor = 'rgba(15,31,56,0.28)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;
  },
  afterDatasetDraw(chart) {
    if (chart.config.type !== 'bar') return;
    chart.ctx.restore();
  }
};

function barGradient(ctx, colorHex, horizontal) {
  const chartArea = ctx.chart?.chartArea;
  if (!chartArea) return colorHex;
  const light = shadeColor(colorHex, 0.32);
  const dark = shadeColor(colorHex, -0.18);
  const g = horizontal
    ? ctx.chart.ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0)
    : ctx.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  return g;
}

Chart.register(Pseudo3DDoughnut, GlossyBars);
Chart.defaults.plugins = Chart.defaults.plugins || {};
