const AQI_FILES = [
    "annual_aqi_by_county_2021.csv",
    "annual_aqi_by_county_2022.csv",
    "annual_aqi_by_county_2023.csv",
    "annual_aqi_by_county_2024.csv"
];

let countyData = {};
let processed = [];

/* ---------- HELPERS ---------- */

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function median(values) {
    const v = [...values].sort((a, b) => a - b);
    const mid = Math.floor(v.length / 2);
    return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/* ---------- LOAD CSVs ---------- */

document.addEventListener("DOMContentLoaded", loadAllCSVs);

async function loadAllCSVs() {
    try {
        const datasets = await Promise.all(
            AQI_FILES.map(f => Plotly.d3.csv(f))
        );

        datasets.flat().forEach(row => {
            const key = `${row.State}-${row.County}`;

            if (!countyData[key]) {
                countyData[key] = {
                    state: row.State,
                    county: row.County,
                    medians: [],
                    maxes: []
                };
            }

            countyData[key].medians.push(+row["Median AQI"]);
            countyData[key].maxes.push(+row["Max AQI"]);
        });

        processData();
    } catch (err) {
        console.error(err);
        showError("Failed to load CSV files");
    }
}

/* ---------- PROCESS DATA ---------- */

function processData() {
    processed = Object.values(countyData).map(d => ({
        state: d.state,
        county: d.county,
        medianAQI: median(d.medians),
        maxAQI: Math.max(...d.maxes)
    }));

    const chronicThresh = percentile(processed.map(d => d.medianAQI), 90);
    const acuteThresh = percentile(processed.map(d => d.maxAQI), 90);

    processed.forEach(d => {
        d.risk =
            d.medianAQI >= chronicThresh && d.maxAQI >= acuteThresh
                ? "Double Jeopardy"
                : "Other";
    });

    updateStats(chronicThresh, acuteThresh);
    populateStates();
    renderCharts();
}

/* ---------- STATS ---------- */

function percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor((p / 100) * sorted.length);
    return sorted[idx];
}

function updateStats(chronic, acute) {
    setText("stat-counties", processed.length);
    setText(
        "stat-dj",
        processed.filter(d => d.risk === "Double Jeopardy").length
    );
    setText("chronic-thresh", chronic.toFixed(1));
    setText("acute-thresh", acute.toFixed(0));
}

/* ---------- FILTER ---------- */

function populateStates() {
    const select = document.getElementById("state-filter");
    const states = [...new Set(processed.map(d => d.state))].sort();

    states.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        select.appendChild(opt);
    });

    select.addEventListener("change", e =>
        renderScatter(e.target.value)
    );
}

/* ---------- CHARTS ---------- */

function renderCharts() {
    renderChronic();
    renderAcute();
    renderScatter("ALL");
}

function renderChronic() {
    const top = [...processed]
        .sort((a, b) => b.medianAQI - a.medianAQI)
        .slice(0, 15);

    Plotly.newPlot("chronic-chart", [{
        type: "bar",
        orientation: "h",
        x: top.map(d => d.medianAQI),
        y: top.map(d => `${d.county}, ${d.state}`)
    }], {
        title: "Top 15 Counties by Chronic Exposure",
        margin: { l: 200 }
    });
}

function renderAcute() {
    const top = [...processed]
        .sort((a, b) => b.maxAQI - a.maxAQI)
        .slice(0, 15);

    Plotly.newPlot("acute-chart", [{
        type: "bar",
        orientation: "h",
        x: top.map(d => d.maxAQI),
        y: top.map(d => `${d.county}, ${d.state}`)
    }], {
        title: "Top 15 Counties by Acute Events",
        margin: { l: 200 }
    });
}

function renderScatter(state) {
    const data = state === "ALL"
        ? processed
        : processed.filter(d => d.state === state);

    Plotly.newPlot("scatter-plot", [{
        type: "scatter",
        mode: "markers",
        x: data.map(d => d.medianAQI),
        y: data.map(d => d.maxAQI),
        text: data.map(d => `${d.county}, ${d.state}`),
        marker: {
            size: 8,
            color: data.map(d =>
                d.risk === "Double Jeopardy" ? "#dc2626" : "#94a3b8"
            )
        }
    }], {
        title: "Median vs Max AQI by County",
        xaxis: { title: "Median AQI (Chronic)" },
        yaxis: { title: "Max AQI (Acute)" }
    });
}

/* ---------- ERROR ---------- */

function showError(msg) {
    document.body.innerHTML = `<h1>${msg}</h1>`;
}
