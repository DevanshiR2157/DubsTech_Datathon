const AQI_FILES = [
    "./annual_aqi_by_county_2021.csv",
    "./annual_aqi_by_county_2022.csv",
    "./annual_aqi_by_county_2023.csv",
    "./annual_aqi_by_county_2024.csv"
];

let processed = [];

/* ---------- HELPERS ---------- */

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function median(arr) {
    const v = arr.sort((a, b) => a - b);
    const m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

function percentile(arr, p) {
    const v = [...arr].sort((a, b) => a - b);
    return v[Math.floor((p / 100) * v.length)];
}

/* ---------- LOAD CSVs ---------- */

document.addEventListener("DOMContentLoaded", loadCSVs);

async function loadCSVs() {
    try {
        const datasets = await Promise.all(
            AQI_FILES.map(f => Plotly.d3.csv(f))
        );

        const countyMap = {};

        datasets.flat().forEach(row => {
            const state = row["State"];
            const county = row["County"];
            const medAQI = Number(row["Median AQI"]);
            const maxAQI = Number(row["Max AQI"]);

            if (!state || !county || isNaN(medAQI) || isNaN(maxAQI)) return;

            const key = `${state}-${county}`;
            if (!countyMap[key]) {
                countyMap[key] = {
                    state,
                    county,
                    medians: [],
                    maxes: []
                };
            }

            countyMap[key].medians.push(medAQI);
            countyMap[key].maxes.push(maxAQI);
        });

        processed = Object.values(countyMap).map(d => ({
            state: d.state,
            county: d.county,
            medianAQI: median(d.medians),
            maxAQI: Math.max(...d.maxes)
        }));

        finalize();
    } catch (err) {
        console.error(err);
        showError("Failed to load CSV files. Check filenames & paths.");
    }
}

/* ---------- PROCESS & STATS ---------- */

function finalize() {
    const chronicThresh = percentile(
        processed.map(d => d.medianAQI),
        90
    );
    const acuteThresh = percentile(
        processed.map(d => d.maxAQI),
        90
    );

    processed.forEach(d => {
        d.risk =
            d.medianAQI >= chronicThresh && d.maxAQI >= acuteThresh
                ? "Double Jeopardy"
                : "Other";
    });

    setText("stat-counties", processed.length);
    setText(
        "stat-dj",
        processed.filter(d => d.risk === "Double Jeopardy").length
    );
    setText("chronic-thresh", chronicThresh.toFixed(1));
    setText("acute-thresh", acuteThresh.toFixed(0));

    populateStates();
    renderCharts();
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
        margin: { l: 220 },
        xaxis: { title: "Median AQI (Chronic Exposure)" }
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
        margin: { l: 220 },
        xaxis: { title: "Max AQI (Acute Events)" }
    });
}

function renderScatter(state) {
    const data =
        state === "ALL"
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
        xaxis: { title: "Median AQI (Chronic)" },
        yaxis: { title: "Max AQI (Acute)" }
    });
}

/* ---------- ERROR ---------- */

function showError(msg) {
    document.body.innerHTML = `<h1 style="padding:40px">${msg}</h1>`;
}
