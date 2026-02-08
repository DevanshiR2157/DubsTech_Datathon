// Double Jeopardy Dashboard (CSV-powered)
// Uses Plotly + PapaParse. Designed to work on GitHub Pages.

// ---------- DOM helpers ----------
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

// ---------- Percentile helper ----------
function percentile(values, p) {
  const arr = values.filter(v => Number.isFinite(v)).sort((a,b) => a-b);
  if (arr.length === 0) return NaN;
  const idx = (arr.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return arr[lo];
  return arr[lo] + (arr[hi] - arr[lo]) * (idx - lo);
}

// ---------- Aggregate 5-year average per county ----------
function aggregateFiveYear(rows) {
  const map = new Map();

  for (const r of rows) {
    const state = String(r['State'] ?? '').trim();
    const county = String(r['County'] ?? '').trim();

    const med = Number(r['Median AQI']);
    const mx = Number(r['Max AQI']);

    const ufs = Number(r['Unhealthy for Sensitive Groups Days']);
    const un  = Number(r['Unhealthy Days']);
    const vun = Number(r['Very Unhealthy Days']);
    const haz = Number(r['Hazardous Days']);

    if (!state || !county) continue;
    if (!Number.isFinite(med) || !Number.isFinite(mx)) continue;

    const key = state + '|' + county;
    if (!map.has(key)) {
      map.set(key, { State: state, County: county, medSum: 0, maxSum: 0, n: 0, anomalySum: 0 });
    }
    const obj = map.get(key);
    obj.medSum += med;
    obj.maxSum += mx;
    obj.n += 1;

    const anomalyDays = (Number.isFinite(ufs)?ufs:0) + (Number.isFinite(un)?un:0) + (Number.isFinite(vun)?vun:0) + (Number.isFinite(haz)?haz:0);
    obj.anomalySum += anomalyDays;
  }

  const out = [];
  for (const obj of map.values()) {
    out.push({
      State: obj.State,
      County: obj.County,
      MedianAQI_5yr: obj.medSum / obj.n,
      MaxAQI_5yr: obj.maxSum / obj.n,
      HighAQIDays_5yr: obj.anomalySum
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

// ---------- Risk classification (fixed 90th percentile thresholds) ----------
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
  'Double Jeopardy': '#b16cff',
  'Livable': '#5dd6a7'
};

// ---------- Outlier handling ----------
// Exclude known extreme outliers from the scatter plot only (does not affect thresholds/KPIs).
const SCATTER_EXCLUDE = [
  { state: 'california', county: 'mono' }
];

function isScatterExcluded(row) {
  const st = String(row.State || '').trim().toLowerCase();
  const ct = String(row.County || '').trim().toLowerCase();
  return SCATTER_EXCLUDE.some(o => o.state === st && o.county === ct);
}

function commonLayout(title, extra = {}) {
  return {
    title: { text: title, font: { color: '#e8ecf3' } },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e8ecf3' },
    ...extra
  };
}

function renderTopCounties(divId, title, rows, valueKey, xTitle, color) {
  const labels = rows.map(d => `${d.County}, ${d.State}`).reverse();
  const values = rows.map(d => d[valueKey]).reverse();

  Plotly.newPlot(divId, [{
    type: 'bar',
    orientation: 'h',
    x: values,
    y: labels,
    marker: { color },
    hovertemplate: '<b>%{y}</b><br>' + xTitle + ': %{x:.1f}<extra></extra>'
  }], commonLayout(title, {
    xaxis: { title: xTitle, gridcolor: 'rgba(255,255,255,0.10)' },
    yaxis: { gridcolor: 'rgba(255,255,255,0.10)' },
    margin: { l: 190, r: 20, t: 70, b: 50 },
    height: 560
  }), { responsive: true, displayModeBar: true, displaylogo: false });
}

function renderLivable(divId, rows) {
  const labels = rows.map(d => `${d.County}, ${d.State}`).reverse();
  const values = rows.map(d => d.MedianAQI_5yr).reverse();

  Plotly.newPlot(divId, [{
    type: 'bar',
    orientation: 'h',
    x: values,
    y: labels,
    marker: { color: COLORS['Livable'] },
    hovertemplate: '<b>%{y}</b><br>Avg Median AQI: %{x:.1f}<extra></extra>'
  }], commonLayout('Top 15 Most Livable Counties (Lowest Avg Median AQI)', {
    xaxis: { title: 'Avg Median AQI', gridcolor: 'rgba(255,255,255,0.10)' },
    yaxis: { gridcolor: 'rgba(255,255,255,0.10)' },
    margin: { l: 190, r: 20, t: 70, b: 50 },
    height: 560
  }), { responsive: true, displayModeBar: false });
}

function renderScatter(divId, data, thrMedian, thrMax, titleSuffix) {
  const risks = ['Low Risk','High Chronic','High Acute','Double Jeopardy'];

  const traces = risks.map(risk => {
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

  const shapes = [
    { type: 'line', x0: thrMedian, x1: thrMedian, y0: 0, y1: 1, yref: 'paper', line: { color: 'rgba(255,255,255,0.65)', dash: 'dash', width: 2 } },
    { type: 'line', y0: thrMax, y1: thrMax, x0: 0, x1: 1, xref: 'paper', line: { color: 'rgba(255,255,255,0.65)', dash: 'dash', width: 2 } }
  ];

  Plotly.newPlot(divId, traces, commonLayout(`Chronic vs Acute AQI (5-year avg)${titleSuffix}`, {
    xaxis: { title: '5-year Avg Median AQI (Daily “Grind”)', gridcolor: 'rgba(255,255,255,0.10)' },
    yaxis: { title: '5-year Avg Max AQI (Extreme Events)', gridcolor: 'rgba(255,255,255,0.10)' },
    shapes,
    margin: { l: 70, r: 20, t: 70, b: 60 },
    height: 680,
    legend: { orientation: 'h', y: -0.18 }
  }), {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToAdd: ['zoomIn2d','zoomOut2d','autoScale2d','resetScale2d'],
    displaylogo: false
  });
}

function renderDJTop5(divId, title, rows) {
  if (!rows.length) {
    Plotly.newPlot(divId, [], commonLayout(title, {
      annotations: [{
        text: 'No Double Jeopardy counties for this selection.',
        xref: 'paper', yref: 'paper', x: 0.5, y: 0.5, showarrow: false,
        font: { color: 'rgba(232,236,243,0.85)', size: 14 }
      }],
      margin: { l: 20, r: 20, t: 70, b: 40 },
      height: 680
    }), { responsive: true, displayModeBar: false });
    return;
  }

  const labels = rows.map(d => d.County).reverse();
  const values = rows.map(d => d.DJ_Score).reverse();

  Plotly.newPlot(divId, [{
    type: 'bar',
    orientation: 'h',
    x: values,
    y: labels,
    marker: { color: COLORS['Double Jeopardy'] },
    hovertemplate: '<b>%{y}</b><br>DJ score: %{x:.1f}<extra></extra>'
  }], commonLayout(title, {
    xaxis: { title: 'Double Jeopardy Score', gridcolor: 'rgba(255,255,255,0.10)' },
    yaxis: { gridcolor: 'rgba(255,255,255,0.10)' },
    margin: { l: 110, r: 20, t: 70, b: 50 },
    height: 680
  }), { responsive: true, displayModeBar: false });
}

// ---------- USA choropleth heatmap ----------
const STATE_TO_ABBR = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO','Connecticut':'CT','Delaware':'DE',
  'District Of Columbia':'DC','Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA',
  'Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN',
  'Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM',
  'New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI',
  'South Carolina':'SC','South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA',
  'West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY'
};

function renderHeatmap(divId, counties) {
  const byState = new Map();
  for (const d of counties) {
    const abbr = STATE_TO_ABBR[d.State];
    if (!abbr) continue;
    byState.set(abbr, (byState.get(abbr) || 0) + (Number.isFinite(d.HighAQIDays_5yr) ? d.HighAQIDays_5yr : 0));
  }

  const locations = Array.from(byState.keys());
  const z = locations.map(k => byState.get(k));

  Plotly.newPlot(divId, [{
    type: 'choropleth',
    locationmode: 'USA-states',
    locations,
    z,
    colorscale: 'OrRd',
    marker: { line: { color: 'rgba(255,255,255,0.35)', width: 0.6 } },
    colorbar: { title: 'High AQI days
(2021–2025)', tickcolor: '#e8ecf3' }
  }], commonLayout('High AQI Days by State (2021–2025)', {
    geo: { scope: 'usa', bgcolor: 'rgba(0,0,0,0)' },
    margin: { l: 20, r: 20, t: 70, b: 20 },
    height: 680
  }), { responsive: true, displayModeBar: false });
}

// ---------- App state ----------
let AGG_5YR = [];
let LABELED = [];
let THR_MED = NaN;
let THR_MAX = NaN;

async function loadAllData() {
  const files = [
    'annual_aqi_by_county_2021.csv',
    'annual_aqi_by_county_2022.csv',
    'annual_aqi_by_county_2023.csv',
    'annual_aqi_by_county_2024.csv',
    'annual_aqi_by_county_2025.csv'
  ];

  const datasets = await Promise.all(files.map(loadCSV));
  const rows = datasets.flat();
  AGG_5YR = aggregateFiveYear(rows);
}

function populateStateSelect(scoped) {
  const select = $('state-select');
  if (!select) return;
  const states = Array.from(new Set(scoped.map(d => d.State))).sort();
  select.innerHTML = '<option value="ALL" selected>All states</option>' +
    states.map(s => `<option value="${s.replace(/"/g,'')}">${s}</option>`).join('');
}

function computeThresholds(scoped) {
  THR_MED = percentile(scoped.map(d => d.MedianAQI_5yr), 0.90);
  THR_MAX = percentile(scoped.map(d => d.MaxAQI_5yr), 0.90);
}

function updateTopNLabels() {
  const nCh = Number($('topn-chronic')?.value || 15);
  const nAc = Number($('topn-acute')?.value || 15);
  setText('topn-chronic-value', String(nCh));
  setText('topn-acute-value', String(nAc));
  setText('topn-chronic-caption', String(nCh));
  setText('topn-acute-caption', String(nAc));
}

function updateKPIs(scoped) {
  setText('kpi-total', String(scoped.length));
  const djCount = LABELED.filter(d => d.Risk === 'Double Jeopardy').length;
  setText('kpi-dj', String(djCount));
  setText('kpi-chronic', Number.isFinite(THR_MED) ? THR_MED.toFixed(1) : '—');
  setText('kpi-acute', Number.isFinite(THR_MAX) ? THR_MAX.toFixed(1) : '—');
  setText('story-total', String(scoped.length));
  setText('story-dj', String(djCount));
}

function renderChronicAcuteCharts(scoped) {
  const nCh = Number($('topn-chronic')?.value || 15);
  const nAc = Number($('topn-acute')?.value || 15);

  const topChronic = [...scoped].sort((a,b) => b.MedianAQI_5yr - a.MedianAQI_5yr).slice(0, nCh);
  const topAcute = [...scoped].sort((a,b) => b.MaxAQI_5yr - a.MaxAQI_5yr).slice(0, nAc);

  renderTopCounties('chart-chronic', `Top ${nCh} Counties by Chronic Burden (Avg Median AQI)`, topChronic, 'MedianAQI_5yr', 'Avg Median AQI', COLORS['High Chronic']);
  renderTopCounties('chart-acute', `Top ${nAc} Counties by Acute Severity (Avg Max AQI)`, topAcute, 'MaxAQI_5yr', 'Avg Max AQI', COLORS['High Acute']);
}

function getLivableTop15(scoped) {
  return [...scoped].sort((a,b) => a.MedianAQI_5yr - b.MedianAQI_5yr).slice(0, 15);
}

function getDJTop5For(allLabeled, state) {
  return allLabeled
    .filter(d => d.Risk === 'Double Jeopardy')
    .filter(d => state === 'ALL' ? true : d.State === state)
    .map(d => ({ ...d, DJ_Score: (d.MedianAQI_5yr - THR_MED) + (d.MaxAQI_5yr - THR_MAX) }))
    .sort((a,b) => b.DJ_Score - a.DJ_Score)
    .slice(0, 5);
}

function renderScatterAndSide(allLabeled, state) {
  const filtered0 = (state && state !== 'ALL') ? allLabeled.filter(d => d.State === state) : allLabeled;
  // remove specified outliers from scatter only
  const filtered = filtered0.filter(d => !isScatterExcluded(d));

  const suffix = (state && state !== 'ALL') ? ` — ${state}` : '';
  renderScatter('chart-scatter', filtered, THR_MED, THR_MAX, suffix);

  const top5 = getDJTop5For(allLabeled, state || 'ALL');
  const title = (state && state !== 'ALL') ? `Top 5 Double Jeopardy — ${state}` : 'Top 5 Double Jeopardy (Overall)';
  renderDJTop5('chart-dj-top5', title, top5);
}

function updateDashboard() {
  const scope = $('scope')?.value || 'all';
  const scoped = applyScope(AGG_5YR, scope);

  computeThresholds(scoped);
  LABELED = classify(scoped, THR_MED, THR_MAX);

  updateTopNLabels();
  updateKPIs(scoped);

  renderChronicAcuteCharts(LABELED);
  renderLivable('chart-livable', getLivableTop15(LABELED));

  populateStateSelect(scoped);
  const st = $('state-select')?.value || 'ALL';
  renderScatterAndSide(LABELED, st);

  renderHeatmap('chart-heatmap', scoped);
}

async function init() {
  const box = $('error-box');
  if (box) box.style.display = 'none';

  await loadAllData();

  $('scope')?.addEventListener('change', updateDashboard);

  $('topn-chronic')?.addEventListener('input', () => {
    updateTopNLabels();
    renderChronicAcuteCharts(LABELED);
  });

  $('topn-acute')?.addEventListener('input', () => {
    updateTopNLabels();
    renderChronicAcuteCharts(LABELED);
  });

  $('state-select')?.addEventListener('change', (e) => {
    renderScatterAndSide(LABELED, e.target.value);
  });

  updateDashboard();
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(showError);
});
