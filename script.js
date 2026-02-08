document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const res = await fetch("./dashboard_data.json");
    if (!res.ok) throw new Error("Failed to fetch JSON");

    const raw = await res.json();

    // Normalize data shape
    const counties = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.counties)
        ? raw.counties
        : [];

    if (counties.length === 0) {
      throw new Error("No county data found");
    }

    // ---- STATS ----
    document.getElementById("total-counties").textContent = counties.length;

    const dj = counties.filter(d => d.double_jeopardy === true);
    document.getElementById("dj-counties").textContent = dj.length;

    // ---- CHARTS ----
    renderChronic(counties);
    renderAcute(counties);
    renderScatter(counties);

  } catch (err) {
    console.error(err);
    document.body.innerHTML = `
      <h1 style="padding:40px;color:red">
        Dashboard failed to load
      </h1>
      <pre>${err.message}</pre>
    `;
  }
}

/* ---------- CHARTS ---------- */

function renderChronic(data) {
  Plotly.newPlot("chronic-chart", [{
    type: "bar",
    orientation: "h",
    x: data.map(d => d.median_aqi),
    y: data.map(d => `${d.county}, ${d.state}`)
  }], {
    margin: { l: 200 },
    xaxis: { title: "Median AQI" }
  });
}

function renderAcute(data) {
  Plotly.newPlot("acute-chart", [{
    type: "bar",
    orientation: "h",
    x: data.map(d => d.max_aqi),
    y: data.map(d => `${d.county}, ${d.state}`)
  }], {
    margin: { l: 200 },
    xaxis: { title: "Max AQI" }
  });
}

function renderScatter(data) {
  Plotly.newPlot("scatter-chart", [{
    type: "scatter",
    mode: "markers",
    x: data.map(d => d.median_aqi),
    y: data.map(d => d.max_aqi),
    text: data.map(d => `${d.county}, ${d.state}`),
    marker: { size: 8 }
  }], {
    xaxis: { title: "Median AQI" },
    yaxis: { title: "Max AQI" }
  });
}
