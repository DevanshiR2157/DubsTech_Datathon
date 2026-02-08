// Global state
let globalData = null;

// Color palette matching CSS
const COLORS = {
    dj: '#1e293b',
    chronic: '#f59e0b',
    acute: '#dc2626',
    low: '#cbd5e1'
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    loadData();
});

// Load and process data
async function loadData() {
    try {
        const response = await fetch('dashboard_data.json');
        globalData = await response.json();
        
        initializeDashboard();
    } catch (error) {
        console.error('Error loading data:', error);
        showError();
    }
}

// Initialize all components
function initializeDashboard() {
    // Animate stats
    animateValue('stat-counties', 0, globalData.metadata.total_counties, 2000);
    animateValue('stat-dj', 0, globalData.metadata.dj_count, 2000);
    
    // Update thresholds
    document.getElementById('chronic-thresh').textContent = globalData.metadata.chronic_threshold;
    document.getElementById('acute-thresh').textContent = globalData.metadata.acute_threshold;
    
    // Populate state filter
    populateStateFilter();
    
    // Render charts
    renderChronicChart();
    renderAcuteChart();
    renderScatterPlot('ALL');
    
    // Render table
    renderDJTable();
    
    // Add scroll animations
    addScrollAnimations();
}

// Animate number counting
function animateValue(id, start, end, duration) {
    const element = document.getElementById(id);
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            element.textContent = Math.round(end);
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, 16);
}

// Populate state dropdown
function populateStateFilter() {
    const select = document.getElementById('state-filter');
    const states = [...new Set(globalData.scatter_data.map(d => d.State))].sort();
    
    states.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        select.appendChild(option);
    });
    
    select.addEventListener('change', (e) => {
        renderScatterPlot(e.target.value);
    });
}

// Render chronic exposure chart
function renderChronicChart() {
    const data = globalData.chronic_top;
    
    const trace = {
        type: 'bar',
        x: data.map(d => d['Median AQI']),
        y: data.map(d => `${d.County}, ${d.State}`),
        orientation: 'h',
        marker: {
            color: data.map(d => getRiskColor(d.Risk)),
            line: {
                color: 'rgba(255, 255, 255, 0.3)',
                width: 1
            }
        },
        text: data.map(d => d['Median AQI'].toFixed(1)),
        textposition: 'outside',
        hovertemplate: '<b>%{y}</b><br>Median AQI: %{x:.1f}<extra></extra>'
    };
    
    const layout = {
        title: {
            text: 'Top 15 Counties by Chronic Exposure (5-Year Avg Median AQI)',
            font: { family: 'Crimson Pro, serif', size: 20, color: '#ffffff' }
        },
        xaxis: {
            title: 'Average Median AQI',
            gridcolor: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff'
        },
        yaxis: {
            autorange: 'reversed',
            gridcolor: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff'
        },
        margin: { l: 200, r: 80, t: 80, b: 60 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#ffffff', family: 'Inter, sans-serif' },
        height: 600
    };
    
    const config = { responsive: true, displayModeBar: false };
    
    Plotly.newPlot('chronic-chart', [trace], layout, config);
}

// Render acute events chart
function renderAcuteChart() {
    const data = globalData.acute_top;
    
    const trace = {
        type: 'bar',
        x: data.map(d => d['Max AQI']),
        y: data.map(d => `${d.County}, ${d.State}`),
        orientation: 'h',
        marker: {
            color: data.map(d => getRiskColor(d.Risk)),
            line: {
                color: 'rgba(0, 0, 0, 0.1)',
                width: 1
            }
        },
        text: data.map(d => d['Max AQI'].toFixed(0)),
        textposition: 'outside',
        hovertemplate: '<b>%{y}</b><br>Max AQI: %{x:.0f}<extra></extra>'
    };
    
    const layout = {
        title: {
            text: 'Top 15 Counties by Acute Events (5-Year Avg Max AQI)',
            font: { family: 'Crimson Pro, serif', size: 20 }
        },
        xaxis: {
            title: 'Average Maximum AQI',
            gridcolor: 'rgba(0, 0, 0, 0.05)'
        },
        yaxis: {
            autorange: 'reversed',
            gridcolor: 'rgba(0, 0, 0, 0.05)'
        },
        margin: { l: 200, r: 80, t: 80, b: 60 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { family: 'Inter, sans-serif' },
        height: 600
    };
    
    const config = { responsive: true, displayModeBar: false };
    
    Plotly.newPlot('acute-chart', [trace], layout, config);
}

// Render scatter plot
function renderScatterPlot(selectedState) {
    const allData = globalData.scatter_data;
    const data = selectedState === 'ALL' 
        ? allData 
        : allData.filter(d => d.State === selectedState);
    
    // Create traces for each risk category
    const categories = ['Low Risk', 'High Chronic', 'High Acute', 'Double Jeopardy'];
    const traces = categories.map(category => {
        const subset = data.filter(d => d.Risk === category);
        
        return {
            type: 'scatter',
            mode: 'markers',
            name: category,
            x: subset.map(d => d['Median AQI']),
            y: subset.map(d => d['Max AQI']),
            text: subset.map(d => `${d.County}, ${d.State}`),
            customdata: subset.map(d => ({
                county: d.County,
                state: d.State,
                median: d['Median AQI'],
                max: d['Max AQI'],
                risk: d.Risk,
                region: d.Region
            })),
            marker: {
                color: getRiskColor(category),
                size: category === 'Double Jeopardy' ? 12 : 8,
                opacity: 0.7,
                line: {
                    color: 'white',
                    width: 1
                }
            },
            hovertemplate: '<b>%{text}</b><br>' +
                          'Median AQI: %{x:.1f}<br>' +
                          'Max AQI: %{y:.1f}<br>' +
                          '<extra></extra>'
        };
    });
    
    // Add threshold lines
    const thresholdLines = {
        type: 'scatter',
        mode: 'lines',
        showlegend: false,
        hoverinfo: 'skip'
    };
    
    const layout = {
        title: {
            text: selectedState === 'ALL' 
                ? 'The Double Jeopardy Map: United States' 
                : `The Double Jeopardy Map: ${selectedState}`,
            font: { family: 'Crimson Pro, serif', size: 22 }
        },
        xaxis: {
            title: 'Chronic Risk (5-Year Avg Median AQI)',
            gridcolor: 'rgba(0, 0, 0, 0.05)',
            zeroline: false
        },
        yaxis: {
            title: 'Acute Risk (5-Year Avg Max AQI)',
            type: 'log',
            gridcolor: 'rgba(0, 0, 0, 0.05)',
            zeroline: false
        },
        shapes: [
            // Chronic threshold line
            {
                type: 'line',
                x0: globalData.metadata.chronic_threshold,
                x1: globalData.metadata.chronic_threshold,
                y0: 0,
                y1: 1,
                yref: 'paper',
                line: {
                    color: COLORS.chronic,
                    width: 2,
                    dash: 'dash'
                }
            },
            // Acute threshold line
            {
                type: 'line',
                x0: 0,
                x1: 1,
                xref: 'paper',
                y0: globalData.metadata.acute_threshold,
                y1: globalData.metadata.acute_threshold,
                line: {
                    color: COLORS.acute,
                    width: 2,
                    dash: 'dash'
                }
            }
        ],
        annotations: [
            {
                x: globalData.metadata.chronic_threshold,
                y: 1,
                yref: 'paper',
                text: 'Chronic Threshold',
                showarrow: false,
                xanchor: 'left',
                yanchor: 'bottom',
                font: { size: 10, color: COLORS.chronic }
            },
            {
                x: 1,
                xref: 'paper',
                y: globalData.metadata.acute_threshold,
                text: 'Acute Threshold',
                showarrow: false,
                xanchor: 'right',
                yanchor: 'bottom',
                font: { size: 10, color: COLORS.acute }
            }
        ],
        hovermode: 'closest',
        showlegend: false,
        margin: { l: 80, r: 40, t: 80, b: 80 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { family: 'Inter, sans-serif' }
    };
    
    const config = { 
        responsive: true, 
        displayModeBar: false
    };
    
    Plotly.newPlot('scatter-plot', traces, layout, config);
    
    // Add hover events
    const plotDiv = document.getElementById('scatter-plot');
    plotDiv.on('plotly_hover', function(data) {
        const point = data.points[0];
        updateDetailsPanel(point.customdata);
    });
    
    plotDiv.on('plotly_unhover', function() {
        resetDetailsPanel();
    });
}

// Update details panel on hover
function updateDetailsPanel(data) {
    const panel = document.getElementById('details-panel');
    
    panel.innerHTML = `
        <div class="details-active">
            <div class="details-county">${data.county}</div>
            <div class="details-state">${data.state}</div>
            <div class="details-metrics">
                <div class="metric">
                    <span class="metric-value">${data.median.toFixed(1)}</span>
                    <div class="metric-label">Median AQI</div>
                </div>
                <div class="metric">
                    <span class="metric-value">${data.max.toFixed(0)}</span>
                    <div class="metric-label">Max AQI</div>
                </div>
            </div>
            <div class="details-risk ${getRiskClass(data.risk)}">
                ${data.risk}
            </div>
        </div>
    `;
}

// Reset details panel
function resetDetailsPanel() {
    const panel = document.getElementById('details-panel');
    panel.innerHTML = `
        <div class="details-placeholder">
            <div class="details-icon">👆</div>
            <p>Hover over a county to see detailed statistics</p>
        </div>
    `;
}

// Render Double Jeopardy table
function renderDJTable() {
    const tbody = document.querySelector('#dj-table tbody');
    const counties = globalData.dj_counties;
    
    counties.forEach((county, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="rank">${index + 1}</td>
            <td class="county">${county.County}</td>
            <td>${county.State}</td>
            <td>${county['Median AQI'].toFixed(1)}</td>
            <td>${county['Max AQI'].toFixed(0)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Helper: Get color for risk category
function getRiskColor(risk) {
    switch(risk) {
        case 'Double Jeopardy': return COLORS.dj;
        case 'High Chronic': return COLORS.chronic;
        case 'High Acute': return COLORS.acute;
        default: return COLORS.low;
    }
}

// Helper: Get CSS class for risk category
function getRiskClass(risk) {
    switch(risk) {
        case 'Double Jeopardy': return 'risk-dj';
        case 'High Chronic': return 'risk-chronic';
        case 'High Acute': return 'risk-acute';
        default: return 'risk-low';
    }
}

// Add scroll animations
function addScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);
    
    // Observe elements that should animate
    document.querySelectorAll('.concept-card, .action-card, .insight-box').forEach(el => {
        observer.observe(el);
    });
}

// Error handling
function showError() {
    document.body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; font-family: Inter, sans-serif;">
            <h1 style="color: #dc2626; margin-bottom: 1rem;">Error Loading Data</h1>
            <p style="color: #666;">Please ensure dashboard_data.json is in the same directory as index.html</p>
        </div>
    `;
}

// Smooth scroll for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});
