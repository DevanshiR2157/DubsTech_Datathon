// Double Jeopardy Dashboard (CSV-powered)
// Uses Plotly + PapaParse. Designed to work on GitHub Pages.

// ---------- DOM safety helpers (prevents null textContent crashes) ----------
function $(id) { return document.getElementById(id); }
function setText(id, value) { const el = $(id); if (el) el.textContent = value; }

function showError(err) {
  console.error(err);
  setText('error-details', err?.message || String(err));
  const box = $('error-box');
  if (box) box.style.display = 'block';
}

// ---------- CSV Loading ----------
function loadCSV(path) {
  return new Promise((resolve, reject) => {
    Papa.parse(path, {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors && results.errors.length) reject(results.errors[0]);
        else resolve(results.data);
      },
      error: reject
    });
  });
}

// ---------- Utility: percentile ----------
function percentile(values, p) {
  const arr = values.filter(v => Number.isFinite(v)).sort((a,b) => a-b);
  if (arr.length === 0) return NaN;
  const idx = (arr.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return arr[lo];
  return arr[lo] + (arr[hi] - arr[lo]) * (idx - lo);
}

// ---------- Aggregation: 5-year average per county ----------
function aggregateFiveYear(rows) {
  const map = new Map();

  for (const r of rows) {
    const state = String(r['State'] ?? '').trim();
    const county = String(r['County'] ?? '').trim();
    const med = Number(r['Median AQI']);
    const mx = Number(r['Max AQI']);

    if (!state || !county) continue;
    if (!Number.isFinite(med) || !Number.isFinite(mx)) continue;

    const key = state + '|' + county;
    if (!map.has(key)) map.set(key, { State: state, County: county, medSum: 0, maxSum: 0, n: 0 });
    const obj = map.get(key);
    obj.medSum += med;
    obj.maxSum += mx;
    obj.n += 1;
  }

  const out = [];
  for (const obj of map.values()) {
    out.push({
      State: obj.State,
      County: obj.County,
      MedianAQI_5yr: obj.medSum / obj.n,
      MaxAQI_5yr: obj.maxSum / obj.n
    });
  }
  return out;
}

// ---------- Scope filtering ----------
const US_STATES_PLUS_DC = new Set([
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','District Of Columbia',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland',
  'Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
  'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina',
  'South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'
]);

function applyScope(counties, scope) {
  if (scope === 'us') return counties.filter(d => US_STATES_PLUS_DC.has(d.State));
  return counties;
}

// ---------- Categorize risk ----------
function classify(counties, p90Median, p90Max) {
  return counties.map(d => {
    const chronic = d.MedianAQI_5yr >= p90Median;
    const acute = d.MaxAQI_5yr >= p90Max;

    let risk = 'Low Risk';
    if (chronic && acute) risk = 'Double Jeopardy';
    else if (chronic) risk = 'High Chronic';
    else if (acute) risk = 'High Acute';

    return { ...d, Risk: risk };
  });
}

// ---------- Charts ----------
const COLORS = {
  'Low Risk': '#b8c1cc',
  'High Chronic': '#ff8a3d',
  'High Acute': '#ff4d5e',
  'Double Jeopardy': '#b16cff'
};

function renderTopBar(divId, title, items, valueKey, color) {
  const labels = items.map(d => `${d.County}, ${d.State}`);
  const vals = items.map(d => d[valueKey]);

  Plotly.newPlot(divId, [{
    type: 'bar',
    x: vals,
    y: labels,
    orientation: 'h',
    marker: { color }
  }], {
    title: { text: title, font: { color: '#e8ecf3' } },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e8ecf3' },
    xaxis: { gridcolor: 'rgba(255,255,255,0.10)' },
    yaxis: { gridcolor: 'rgba(255,255,255,0.10)' },
    margin: { l: 180, r: 20, t: 60, b: 40 },
    height: 520
  }, { responsive: true, displayModeBar: false });
}

function renderScatter(divId, data, p90Median, p90Max, pctLabel) {
  const traces = Object.keys(COLORS).map(risk => {
    const pts = data.filter(d => d.Risk === risk);
    return {
      type: 'scatter',
      mode: 'markers',
      name: risk,
      x: pts.map(d => d.MedianAQI_5yr),
      y: pts.map(d => d.MaxAQI_5yr),
      text: pts.map(d => `${d.County}, ${d.State}<br>Median AQI: ${d.MedianAQI_5yr.toFixed(1)}<br>Max AQI: ${d.MaxAQI_5yr.toFixed(1)}`),
      hovertemplate: '%{text}<extra></extra>',
      marker: { size: 9, color: COLORS[risk], opacity: 0.78 }
    };
  });

  const shapes = [
    { type: 'line', x0: p90Median, x1: p90Median, y0: 0, y1: 1, yref: 'paper', line: { color: 'rgba(255,255,255,0.65)', dash: 'dash', width: 2 } },
    { type: 'line', y0: p90Max, y1: p90Max, x0: 0, x1: 1, xref: 'paper', line: { color: 'rgba(255,255,255,0.65)', dash: 'dash', width: 2 } }
  ];

  Plotly.newPlot(divId, traces, {
    title: { text: `Chronic vs Acute AQI (5-year avg) — thresholds at ${pctLabel}th percentile`, font: { color: '#e8ecf3' } },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e8ecf3' },
    xaxis: { title: 'Median AQI (Daily “Grind”)', gridcolor: 'rgba(255,255,255,0.10)' },
    yaxis: { title: 'Max AQI (Extreme Events)', gridcolor: 'rgba(255,255,255,0.10)' },
    shapes,
    margin: { l: 70, r: 20, t: 70, b: 60 },
    height: 650,
    legend: { orientation: 'h', y: -0.15 }
  }, { responsive: true, displayModeBar: false });
}

// ---------- Main controller ----------
let RAW_ROWS = [];
let AGG_5YR = [];

async function loadAllData() {
  const files = [
    'annual_aqi_by_county_2021.csv',
    'annual_aqi_by_county_2022.csv',
    'annual_aqi_by_county_2023.csv',
    'annual_aqi_by_county_2024.csv',
    'annual_aqi_by_county_2025.csv'
  ];

  const datasets = await Promise.all(files.map(loadCSV));
  RAW_ROWS = datasets.flat();
  AGG_5YR = aggregateFiveYear(RAW_ROWS);
}

function updateDashboard() {
  const scope = $('scope')?.value || 'all';
  const pct = Number($('percentile')?.value || 90);
  setText('percentile-value', String(pct));
  setText('story-pct', String(pct));
  setText('story-pct-2', String(pct));

  // Scope-filtered county list
  const scoped = applyScope(AGG_5YR, scope);

  const p = pct / 100;
  const pMed = percentile(scoped.map(d => d.MedianAQI_5yr), p);
  const pMax = percentile(scoped.map(d => d.MaxAQI_5yr), p);

  const labeled = classify(scoped, pMed, pMax);

  // KPIs
  setText('kpi-total', String(labeled.length));
  const djCount = labeled.filter(d => d.Risk === 'Double Jeopardy').length;
  setText('kpi-dj', String(djCount));
  setText('kpi-chronic', Number.isFinite(pMed) ? pMed.toFixed(1) : '—');
  setText('kpi-acute', Number.isFinite(pMax) ? pMax.toFixed(1) : '—');

  // Story callout
  setText('story-total', String(labeled.length));
  setText('story-dj', String(djCount));

  // Top lists
  const topChronic = [...labeled].sort((a,b) => b.MedianAQI_5yr - a.MedianAQI_5yr).slice(0, 15);
  const topAcute = [...labeled].sort((a,b) => b.MaxAQI_5yr - a.MaxAQI_5yr).slice(0, 15);

  renderTopBar('chart-chronic', 'Top 15 Chronic Burden (Median AQI)', topChronic, 'MedianAQI_5yr', COLORS['High Chronic']);
  renderTopBar('chart-acute', 'Top 15 Acute Events (Max AQI)', topAcute, 'MaxAQI_5yr', COLORS['High Acute']);
  renderScatter('chart-scatter', labeled, pMed, pMax, pct);
}

async function init() {
  // Hide error box if visible
  const box = $('error-box');
  if (box) box.style.display = 'none';

  await loadAllData();

  // Wire up UI
  $('scope')?.addEventListener('change', updateDashboard);
  $('percentile')?.addEventListener('input', updateDashboard);

  updateDashboard();
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(showError);
});
