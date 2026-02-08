document.addEventListener("DOMContentLoaded", init);

async function init() {
    try {
        const res = await fetch("dashboard_data.json");
        const data = await res.json();

        // ---- Stats ----
        document.getElementById("total-counties").textContent =
            data.counties.length;

        const dj = data.counties.filter(d => d.double_jeopardy);
        document.getElementById("dj-counties").textContent = dj.length;

        // ---- Charts ----
        renderChronic(data.counties);
        renderAcute(data.counties);
        renderScatter(data.counties);

    } catch (err) {
        console.error(err);
        document.body.innerHTML = "<h1>Error loading dashboard data</h1>";
    }
}

function renderChronic(counties) {
    Plotly.newPlot("chronic-chart", [{
        type: "bar",
        x: counties.map(d => d.median_aqi),
        y: counties.map(d => `${d.county}, ${d.state}`),
        orientation: "h"
    }], {
        margin: { l: 200 },
        xaxis: { title: "Median AQI" }
    });
}

function renderAcute(counties) {
    Plotly.newPlot("acute-chart", [{
        type: "bar",
        x: counties.map(d => d.max_aqi),
        y: counties.map(d => `${d.county}, ${d.state}`),
        orientation: "h"
    }], {
        margin: { l: 200 },
        xaxis: { title: "Max AQI" }
    });
}

function renderScatter(counties) {
    Plotly.newPlot("scatter-chart", [{
        type: "scatter",
        mode: "markers",
        x: counties.map(d => d.median_aqi),
        y: counties.map(d => d.max_aqi),
        text: counties.map(d => `${d.county}, ${d.state}`),
        marker: { size: 8 }
    }], {
        xaxis: { title: "Median AQI" },
        yaxis: { title: "Max AQI" }
    });
}
