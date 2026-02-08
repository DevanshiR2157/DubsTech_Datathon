document.addEventListener("DOMContentLoaded", init);

async function init() {
    try {
        console.log("Fetching dashboard_data.json…");

        const res = await fetch("./dashboard_data.json");

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log("Loaded JSON:", data);

        // ---- Normalize data ----
        const counties =
            Array.isArray(data)
                ? data
                : Array.isArray(data.counties)
                    ? data.counties
                    : [];

        if (counties.length === 0) {
            throw new Error("No county data found in JSON");
        }

        // ---- Stats ----
        document.getElementById("total-counties").textContent =
            counties.length;

        const dj = counties.filter(d => d.double_jeopardy === true);
        document.getElementById("dj-counties").textContent = dj.length;

        // ---- Charts ----
        renderChronic(counties);
        renderAcute(counties);
        renderScatter(counties);

    } catch (err) {
        console.error("LOCK-IN ERROR:", err);
        document.body.innerHTML = `
            <h1 style="padding:40px;color:red">
                Dashboard failed to load
            </h1>
            <pre>${err.message}</pre>
            <p>Open DevTools → Console for details</p>
        `;
    }
}

/* ---------- Charts ---------- */

function renderChronic(data) {
    Plotly.newPlot("chronic-chart", [{
        type: "bar",
        orientation: "h",
        x: data.map(d => d.median_aqi),
        y: data.map(d => `${d.county}, ${d.state}`)
    }], { margin: { l: 200 } });
}

function renderAcute(data) {
    Plotly.newPlot("acute-chart", [{
        type: "bar",
        orientation: "h",
        x: data.map(d => d.max_aqi),
        y: data.map(d => `${d.county}, ${d.state}`)
    }], { margin: { l: 200 } });
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
