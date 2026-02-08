// Dashboard script
// Data sources:
//  - dashboard_data.json (precomputed county-level 5-year stats)
//  - annual_aqi_by_county_20XX.csv (for state heatmap)

function $(id) { return document.getElementById(id); }
function setText(id, value) { const el = $(id); if (el) el.textContent = value; }

function showError(err) {
  console.error(err);
  const box = $('error-box');
  const details = $('error-details');
  if (details) details.textContent = err?.stack || err?.message || String(err);
  if (box) box.style.display = 'block';
}

// ---------- Constants ----------
const COLORS = {
  low: '#b8c1cc',
  chronic: '#ff8a3d',
  acute: '#ff4d5e',
  dj: '#b16cff',
  livable: '#5dd6a7'
};

// Exclude Mono County, California from scatter only
function isScatterOutlier(row) {
  return String(row.State || '').trim().toLowerCase() === 'california' &&
         String(row.County || '').trim().toLowerCase() === 'mono';
}

const US_STATES_PLUS_DC = new Set([
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','District of Columbia','District Of Columbia',
  'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland',
  'Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
  'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina',
  'South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'
]);

const STATE_TO_ABBR = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO','Connecticut':'CT','Delaware':'DE',
  'District Of Columbia':'DC','District of Columbia':'DC','Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA',
  'Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN',
  'Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM',
  'New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI',
  'South Carolina':'SC','South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA',
  'West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY'
};

// ---------- Helpers ----------
function percentile(values, p) {
  const arr = values.filter(v => Number.isFinite(v)).sort((a,b) => a-b);
  if (!arr.length) return NaN;
  const idx = (arr.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return arr[lo];
  return arr[lo] + (arr[hi] - arr[lo]) * (idx - lo);
}

function commonLayout(title, extra={}) {
  return {
    title: { text: title, font: { color: '#e8ecf3' } },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e8ecf3' },
    ...extra
  };
}

function renderHBar(divId, title, labels, values, xTitle, color, height=560, leftMargin=190) {
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
    margin: { l: leftMargin, r: 20, t: 70, b: 50 },
    height
  }), { responsive: true, displayModeBar: true, displaylogo: false });
}

function renderScatter(divId, rows, thrMed, thrMax, suffix='') {
  const riskOrder = ['Low Risk','High Chronic','High Acute','Double Jeopardy'];
  const colorMap = {
    'Low Risk': COLORS.low,
    'High Chronic': COLORS.chronic,
    'High Acute': COLORS.acute,
    'Double Jeopardy': COLORS.dj
  };

  const traces = riskOrder.map(risk => {
    const pts = rows.filter(r => r.Risk === risk);
    return {
      type: 'scatter',
      mode: 'markers',
      name: risk,
      x: pts.map(p => p['Median AQI']),
      y: pts.map(p => p['Max AQI']),
      text: pts.map(p => `${p.County}, ${p.State}<br>Avg Median AQI: ${p['Median AQI'].toFixed(1)}<br>Avg Max AQI: ${p['Max AQI'].toFixed(1)}`),
      hovertemplate: '%{text}<extra></extra>',
      marker: { size: 9, color: colorMap[risk], opacity: 0.78 }
    };
  });

  const shapes = [
    { type:'line', x0: thrMed, x1: thrMed, y0:0, y1:1, yref:'paper', line:{ color:'rgba(255,255,255,0.65)', dash:'dash', width:2 } },
    { type:'line', y0: thrMax, y1: thrMax, x0:0, x1:1, xref:'paper', line:{ color:'rgba(255,255,255,0.65)', dash:'dash', width:2 } }
  ];

  Plotly.newPlot(divId, traces, commonLayout(`Chronic vs Acute AQI (5-year avg)${suffix}`, {
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

// PapaParse helper
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

async function loadDashboardJSON() {
  const res = await fetch('dashboard_data.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch dashboard_data.json (${res.status})`);
  return await res.json();
}

function applyScopeScatter(scatterRows, scope) {
  if (scope === 'us') return scatterRows.filter(r => US_STATES_PLUS_DC.has(r.State));
  return scatterRows;
}

function rebuildThresholds(scopedRows) {
  const meds = scopedRows.map(r => r['Median AQI']);
  const mxs  = scopedRows.map(r => r['Max AQI']);
  return {
    thrMed: percentile(meds, 0.90),
    thrMax: percentile(mxs, 0.90)
  };
}

function fillStateDropdown(scopedRows) {
  const sel = $('state-select');
  if (!sel) return;
  const states = Array.from(new Set(scopedRows.map(r => r.State))).sort();
  sel.innerHTML = '<option value="ALL" selected>All states</option>' + states.map(s => `<option value="${s.replace(/"/g,'')}">${s}</option>`).join('');
}

function computeDJCount(scopedRows, thrMed, thrMax) {
  return scopedRows.filter(r => r['Median AQI'] >= thrMed && r['Max AQI'] >= thrMax).length;
}

function computeRisk(scopedRows, thrMed, thrMax) {
  return scopedRows.map(r => {
    const chronic = r['Median AQI'] >= thrMed;
    const acute = r['Max AQI'] >= thrMax;
    let risk = 'Low Risk';
    if (chronic && acute) risk = 'Double Jeopardy';
    else if (chronic) risk = 'High Chronic';
    else if (acute) risk = 'High Acute';
    return { ...r, Risk: risk };
  });
}

function computeDJTop5(scopedRowsWithRisk, thrMed, thrMax, state) {
  const rows = scopedRowsWithRisk
    .filter(r => r.Risk === 'Double Jeopardy')
    .filter(r => state === 'ALL' ? true : r.State === state)
    .map(r => ({ ...r, DJ_Score: (r['Median AQI'] - thrMed) + (r['Max AQI'] - thrMax) }))
    .sort((a,b) => b.DJ_Score - a.DJ_Score)
    .slice(0, 5);
  return rows;
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

  const labels = rows.map(r => r.County).reverse();
  const values = rows.map(r => r.DJ_Score).reverse();
  renderHBar(divId, title, labels, values, 'Double Jeopardy score', COLORS.dj, 680, 110);
}

async function renderHeatmapFromCSVs(scope) {
  // Try to read annual CSVs to compute high AQI day totals by state.
  const files = [
    'annual_aqi_by_county_2021.csv',
    'annual_aqi_by_county_2022.csv',
    'annual_aqi_by_county_2023.csv',
    'annual_aqi_by_county_2024.csv',
    'annual_aqi_by_county_2025.csv'
  ];

  let rows = [];
  for (const f of files) {
    try {
      const part = await loadCSV(f);
      rows = rows.concat(part);
    } catch (e) {
      // if file missing, continue
      console.warn('Heatmap: failed to load', f, e);
    }
  }

  if (!rows.length) throw new Error('Heatmap: no annual CSVs loaded.');

  const byState = new Map();
  for (const r of rows) {
    const st = String(r.State ?? '').trim();
    if (!st) continue;
    if (scope === 'us' && !US_STATES_PLUS_DC.has(st) && st !== 'District Of Columbia') continue;

    const ufs = Number(r['Unhealthy for Sensitive Groups Days']) || 0;
    const un  = Number(r['Unhealthy Days']) || 0;
    const vun = Number(r['Very Unhealthy Days']) || 0;
    const haz = Number(r['Hazardous Days']) || 0;
    const val = ufs + un + vun + haz;
    byState.set(st, (byState.get(st) || 0) + val);
  }

  // Convert to abbrev arrays for Plotly USA states
  const locations = [];
  const z = [];
  for (const [state, val] of byState.entries()) {
    const abbr = STATE_TO_ABBR[state];
    if (!abbr) continue;
    locations.push(abbr);
    z.push(val);
  }

  Plotly.newPlot('chart-heatmap', [{
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

// ---------- Main ----------
let DASH = null;
let SCATTER = [];

function updateTopNLabels() {
  const nCh = Number($('topn-chronic')?.value || 15);
  const nAc = Number($('topn-acute')?.value || 15);
  setText('topn-chronic-value', String(nCh));
  setText('topn-acute-value', String(nAc));
  setText('topn-chronic-caption', String(nCh));
  setText('topn-acute-caption', String(nAc));
  return { nCh, nAc };
}

function updateAllCharts() {
  const scope = $('scope')?.value || 'all';
  const { nCh, nAc } = updateTopNLabels();

  // Scope scatter rows + remove outlier
  const scopedBase = applyScopeScatter(SCATTER, scope).filter(r => !isScatterOutlier(r));

  // Recompute thresholds for the current scope
  const { thrMed, thrMax } = rebuildThresholds(scopedBase);

  // KPIs
  setText('kpi-total', String(scopedBase.length));
  setText('kpi-chronic', Number.isFinite(thrMed) ? thrMed.toFixed(1) : '—');
  setText('kpi-acute', Number.isFinite(thrMax) ? thrMax.toFixed(1) : '—');
  const djCount = computeDJCount(scopedBase, thrMed, thrMax);
  setText('kpi-dj', String(djCount));
  setText('story-total', String(scopedBase.length));
  setText('story-dj', String(djCount));

  // Risk labels
  const scoped = computeRisk(scopedBase, thrMed, thrMax);

  // Fill state dropdown once (or when scope changes)
  fillStateDropdown(scopedBase);

  // Charts 1 & 2
  const topChronic = [...scoped].sort((a,b) => b['Median AQI'] - a['Median AQI']).slice(0, nCh);
  const chronicLabels = topChronic.map(r => `${r.County}, ${r.State}`).reverse();
  const chronicVals   = topChronic.map(r => r['Median AQI']).reverse();
  renderHBar('chart-chronic', `Top ${nCh} Counties by Chronic Burden (Avg Median AQI)`, chronicLabels, chronicVals, 'Avg Median AQI', COLORS.chronic);

  const topAcute = [...scoped].sort((a,b) => b['Max AQI'] - a['Max AQI']).slice(0, nAc);
  const acuteLabels = topAcute.map(r => `${r.County}, ${r.State}`).reverse();
  const acuteVals   = topAcute.map(r => r['Max AQI']).reverse();
  renderHBar('chart-acute', `Top ${nAc} Counties by Acute Severity (Avg Max AQI)`, acuteLabels, acuteVals, 'Avg Max AQI', COLORS.acute);

  // Livable
  const livable = [...scoped].sort((a,b) => a['Median AQI'] - b['Median AQI']).slice(0, 15);
  renderHBar('chart-livable', 'Top 15 Most Livable Counties (Lowest Avg Median AQI)',
             livable.map(r => `${r.County}, ${r.State}`).reverse(),
             livable.map(r => r['Median AQI']).reverse(),
             'Avg Median AQI', COLORS.livable, 560, 190);

  // Scatter + DJ side
  const stateSel = $('state-select')?.value || 'ALL';
  const scatterRows = (stateSel === 'ALL') ? scoped : scoped.filter(r => r.State === stateSel);
  const suffix = (stateSel === 'ALL') ? '' : ` — ${stateSel}`;
  renderScatter('chart-scatter', scatterRows, thrMed, thrMax, suffix);

  const djTop5 = computeDJTop5(scoped, thrMed, thrMax, stateSel);
  const djTitle = (stateSel === 'ALL') ? 'Top 5 Double Jeopardy (Overall)' : `Top 5 Double Jeopardy — ${stateSel}`;
  renderDJTop5('chart-dj-top5', djTitle, djTop5);

  // Heatmap (best effort)
  renderHeatmapFromCSVs(scope).catch(e => {
    console.warn(e);
    Plotly.newPlot('chart-heatmap', [], commonLayout('High AQI Days by State (2021–2025)', {
      annotations: [{
        text: 'Heatmap data unavailable (missing annual CSVs).',
        xref: 'paper', yref: 'paper', x: 0.5, y: 0.5, showarrow: false,
        font: { color: 'rgba(232,236,243,0.85)', size: 14 }
      }],
      margin: { l: 20, r: 20, t: 70, b: 20 },
      height: 680
    }), { responsive: true, displayModeBar: false });
  });
}

async function init() {
  $('error-box') && ($('error-box').style.display = 'none');

  DASH = await loadDashboardJSON();
  SCATTER = (DASH.scatter_data || []).map(r => ({
    State: r.State,
    County: r.County,
    'Median AQI': Number(r['Median AQI']),
    'Max AQI': Number(r['Max AQI'])
  }));

  // wire UI
  $('scope')?.addEventListener('change', updateAllCharts);
  $('topn-chronic')?.addEventListener('input', updateAllCharts);
  $('topn-acute')?.addEventListener('input', updateAllCharts);
  $('state-select')?.addEventListener('change', updateAllCharts);

  updateAllCharts();
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(showError);
});
