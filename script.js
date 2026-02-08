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
function classify(counties, thrMedian, thrMax) {
  return counties.map(d => {
    const chronic = d.MedianAQI_5yr >= thrMedian;
    const acute = d.MaxAQI_5yr >= thrMax;

    let risk = 'Low Risk';
    if (chronic && acute) risk = 'Double Jeopardy';
    else if (chronic) risk = 'High Chronic';
    else if (acute) risk = 'High Acute';

    return { ...d, Risk: risk };
  });
}

// ---------- Colors ----------
const COLORS = {
  'Low Risk': '#b8c1cc',
  'High Chronic': '#ff8a3d',
  'High Acute': '#ff4d5e',
  'Double Jeopardy': '#b16cff'
};

// ---------- Charts ----------
function renderStateBars(divId, title, states, values, yTitle, color) {
  Plotly.newPlot(divId, [{
    type: 'bar',
    x: states,
    y: values,
    marker: { color },
    hovertemplate: '<b>%{x}</b><br>' + yTitle + ': %{y:.1f}<extra></extra>'
  }], {
    title: { text: title, font: { color: '#e8ecf3' } },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e8ecf3' },
    xaxis: {
      title: 'State',
      tickangle: 60,
      gridcolor: 'rgba(255,255,255,0.10)'
    },
    yaxis: {
      title: yTitle,
      gridcolor: 'rgba(255,255,255,0.10)'
    },
    margin: { l: 70, r: 20, t: 70, b: 120 },
    height: 520
  }, { responsive: true, displayModeBar: true });
}

function renderHorizontalBar(divId, title, labels, values, xTitle, color) {
  Plotly.newPlot(divId, [{
    type: 'bar',
    orientation: 'h',
    x: values,
    y: labels,
    marker: { color },
    hovertemplate: '<b>%{y}</b><br>' + xTitle + ': %{x:.1f}<extra></extra>'
  }], {
    title: { text: title, font: { color: '#e8ecf3' } },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e8ecf3' },
    xaxis: { title: xTitle, gridcolor: 'rgba(255,255,255,0.10)' },
    yaxis: { gridcolor: 'rgba(255,255,255,0.10)' },
    margin: { l: 190, r: 20, t: 70, b: 50 },
    height: 560
  }, { responsive: true, displayModeBar: true });
}

function buildTop5Text(counties, state) {
  const rows = counties.filter(d => d.State === state);
  if (!rows.length) return 'No data for this state.';

  const topChronic = [...rows].sort((a,b) => b.MedianAQI_5yr - a.MedianAQI_5yr).slice(0,5);
  const topAcute = [...rows].sort((a,b) => b.MaxAQI_5yr - a.MaxAQI_5yr).slice(0,5);

  const fmtList = (arr, key) => arr.map((d,i) => `${i+1}. ${d.County} (${d[key].toFixed(1)})`).join('<br>');

  return (
    `<b>${state}</b><br>` +
    `<span style="color:${COLORS['High Chronic']}; font-weight:800;">Top 5 Chronic (Avg Median AQI)</span><br>` +
    fmtList(topChronic, 'MedianAQI_5yr') +
    `<br><br>` +
    `<span style="color:${COLORS['High Acute']}; font-weight:800;">Top 5 Acute (Avg Max AQI)</span><br>` +
    fmtList(topAcute, 'MaxAQI_5yr')
  );
}

function renderScatter(divId, data, thrMedian, thrMax, pctLabel) {
  const traces = Object.keys(COLORS).map(risk => {
    const pts = data.filter(d => d.Risk === risk);
    return {
      type: 'scatter',
      mode: 'markers',
      name: risk,
      x: pts.map(d => d.MedianAQI_5yr),
      y: pts.map(d => d.MaxAQI_5yr),
      text: pts.map(d => `${d.County}, ${d.State}<br>Avg Median AQI: ${d.MedianAQI_5yr.toFixed(1)}<br>Avg Max AQI: ${d.MaxAQI_5yr.toFixed(1)}`),
      hovertemplate: '%{text}<extra></extra>',
      marker: { size: 9, color: COLORS[risk], opacity: 0.78 }
    };
  });

  // Threshold lines
  const shapes = [
    { type: 'line', x0: thrMedian, x1: thrMedian, y0: 0, y1: 1, yref: 'paper', line: { color: 'rgba(255,255,255,0.65)', dash: 'dash', width: 2 } },
    { type: 'line', y0: thrMax, y1: thrMax, x0: 0, x1: 1, xref: 'paper', line: { color: 'rgba(255,255,255,0.65)', dash: 'dash', width: 2 } }
  ];

  // In-chart dropdown: Top 5 counties for each state
  const states = Array.from(new Set(data.map(d => d.State))).sort();
  const baseAnno = {
    xref: 'paper', yref: 'paper', x: 0.01, y: 0.99,
    xanchor: 'left', yanchor: 'top',
    align: 'left',
    text: '<b>Select a state</b><br>Use the dropdown to show Top 5 counties (chronic + acute).',
    showarrow: false,
    bgcolor: 'rgba(0,0,0,0.35)',
    bordercolor: 'rgba(255,255,255,0.18)',
    borderwidth: 1,
    borderpad: 10,
    font: { size: 12, color: '#e8ecf3' }
  };

  const buttons = [
    {
      label: 'Select state…',
      method: 'relayout',
      args: [{ annotations: [baseAnno] }]
    },
    ...states.map(st => ({
      label: st,
      method: 'relayout',
      args: [{ annotations: [{ ...baseAnno, text: buildTop5Text(data, st) }] }]
    }))
  ];

  Plotly.newPlot(divId, traces, {
    title: { text: `Chronic vs Acute AQI (5-year avg) — thresholds at ${pctLabel}th percentile`, font: { color: '#e8ecf3' } },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e8ecf3' },
    xaxis: { title: 'Avg Median AQI (Daily “Grind”)', gridcolor: 'rgba(255,255,255,0.10)' },
    yaxis: { title: 'Avg Max AQI (Extreme Events)', gridcolor: 'rgba(255,255,255,0.10)' },
    shapes,
    annotations: [baseAnno],
    updatemenus: [
      {
        type: 'dropdown',
        direction: 'down',
        x: 0.01,
        y: 1.15,
        xanchor: 'left',
        yanchor: 'top',
        bgcolor: 'rgba(0,0,0,0.35)',
        bordercolor: 'rgba(255,255,255,0.18)',
        font: { color: '#e8ecf3' },
        buttons
      }
    ],
    margin: { l: 70, r: 20, t: 90, b: 60 },
    height: 680,
    legend: { orientation: 'h', y: -0.18 }
  }, {
    responsive: true,
    displayModeBar: true,
    // Ensure zoom controls are available (zoom in/out + reset)
    modeBarButtonsToAdd: ['zoomIn2d','zoomOut2d','autoScale2d','resetScale2d'],
    displaylogo: false
  });
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
  const thrMedian = percentile(scoped.map(d => d.MedianAQI_5yr), p);
  const thrMax = percentile(scoped.map(d => d.MaxAQI_5yr), p);

  const labeled = classify(scoped, thrMedian, thrMax);

  // KPIs
  setText('kpi-total', String(labeled.length));
  const djCount = labeled.filter(d => d.Risk === 'Double Jeopardy').length;
  setText('kpi-dj', String(djCount));
  setText('kpi-chronic', Number.isFinite(thrMedian) ? thrMedian.toFixed(1) : '—');
  setText('kpi-acute', Number.isFinite(thrMax) ? thrMax.toFixed(1) : '—');

  // Story callout
  setText('story-total', String(labeled.length));
  setText('story-dj', String(djCount));

  // ---- Chart 1 & 2: state on x-axis, avg median/max on y-axis ----
  const byState = new Map();
  for (const d of labeled) {
    if (!byState.has(d.State)) byState.set(d.State, { State: d.State, medSum: 0, maxSum: 0, n: 0 });
    const s = byState.get(d.State);
    s.medSum += d.MedianAQI_5yr;
    s.maxSum += d.MaxAQI_5yr;
    s.n += 1;
  }
  const stateRows = Array.from(byState.values())
    .map(s => ({
      State: s.State,
      AvgMedian: s.medSum / s.n,
      AvgMax: s.maxSum / s.n
    }))
    .sort((a,b) => a.State.localeCompare(b.State));

  renderStateBars(
    'chart-chronic',
    'Chronic Burden by State (Avg of Counties’ 5-year Median AQI)',
    stateRows.map(d => d.State),
    stateRows.map(d => d.AvgMedian),
    'Avg Median AQI',
    COLORS['High Chronic']
  );

  renderStateBars(
    'chart-acute',
    'Acute Events by State (Avg of Counties’ 5-year Max AQI)',
    stateRows.map(d => d.State),
    stateRows.map(d => d.AvgMax),
    'Avg Max AQI',
    COLORS['High Acute']
  );

  // ---- Chart 4: most livable counties (lowest avg median AQI) ----
  const livable = [...labeled]
    .sort((a,b) => a.MedianAQI_5yr - b.MedianAQI_5yr)
    .slice(0, 15);

  renderHorizontalBar(
    'chart-livable',
    'Top 15 Most Livable Counties (Lowest Avg Median AQI)',
    livable.map(d => `${d.County}, ${d.State}`).reverse(),
    livable.map(d => d.MedianAQI_5yr).reverse(),
    'Avg Median AQI',
    '#5dd6a7'
  );

  // ---- Scatter (with dropdown + zoom controls) ----
  renderScatter('chart-scatter', labeled, thrMedian, thrMax, pct);
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
