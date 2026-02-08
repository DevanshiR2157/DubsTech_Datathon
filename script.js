let globalData = null;

// Utility: safe DOM write
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// Init after DOM
document.addEventListener("DOMContentLoaded", () => {
    loadData();
});

async function loadData() {
    try {
        const response = await fetch("./dashboard_data.json");
        if (!response.ok) throw new Error("Failed to load dashboard_data.json");

        globalData = await response.json();
        initializeDashboard();
    } catch (err) {
        console.error(err);
        showError(err.message);
    }
}

function initializeDashboard() {
    try {
        // SAFE STATS UPDATES
        setText("stat-counties", globalData.metadata.total_counties);
        setText("stat-dj", globalData.metadata.dj_count);
        setText("chronic-thresh", globalData.metadata.chronic_threshold);
        setText("acute-thresh", globalData.metadata.acute_threshold);

        populateStateFilter();
        renderChronicChart();
        renderAcuteChart();
        renderScatterPlot("ALL");

        console.log("Dashboard initialized successfully");
    } catch (err) {
        console.error("Init error:", err);
        showError(err.message);
    }
}

function populateStateFilter() {
    const select = document.getElementById("state-filter");
    if (!select) return;

    const states = [...new Set(globalData.scatter_data.map(d => d.State))].sort();
    states.forEach(state => {
        const option = document.createElement("option");
        option.value = state;
        option.textContent = state;
        select.appendChild(option);
    });

    select.addEventListener("change", e => {
        renderScatterPlot(e.target.value);
    });
}

/* ===== CHARTS ===== */

function renderChronicChart() {
    Plotly.newPlot("chronic-chart", [], { title: "Chronic Exposure" });
}

function renderAcuteChart() {
    Plotly.newPlot("acute-chart", [], { title: "Acute Events" });
}

function renderScatterPlot(state) {
    Plotly.newPlot("scatter-plot", [], { title: "Double Jeopardy Map" });
}

/* ===== ERROR UI ===== */

function showError(message) {
    document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center">
            <div>
                <h1>Error Loading Data</h1>
                <p>${message}</p>
                <p><strong>Run a local server:</strong></p>
                <pre>python -m http.server 8000</pre>
                <p>Then open <code>http://localhost:8000</code></p>
            </div>
        </div>
    `;
}
