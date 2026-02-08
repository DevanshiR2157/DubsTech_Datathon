// Global state
let globalData = null;

// Color palette matching CSS
const COLORS = {
    dj: '#1e293b',
    chronic: '#f59e0b',
    acute: '#dc2626',
    low: '#cbd5e1'
};

// State color palette - distinct colors for each state
const STATE_COLORS = {
    'California': '#e63946',
    'Arizona': '#f77f00',
    'Texas': '#d62828',
    'Nevada': '#ff6b6b',
    'New Mexico': '#e76f51',
    'Oklahoma': '#f4a261',
    'Indiana': '#2a9d8f',
    'Pennsylvania': '#264653',
    'Illinois': '#219ebc',
    'Missouri': '#8338ec',
    'Utah': '#fb8500',
    'Arkansas': '#bc6c25',
    'Wyoming': '#dda15e',
    'Country Of Mexico': '#e76f51'
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
    
    // Render basket analysis
    renderDJBasket();
    
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
            color: data.map(d => STATE_COLORS[d.State] || '#666666'),
            line: {
                color: 'rgba(255, 255, 255, 0.3)',
                width: 1
            }
        },
        text: data.map(d => d['Median AQI'].toFixed(1)),
        textposition: 'outside',
        hovertemplate: '<b>%{y}</b><br>Median AQI: %{x:.1f}<br><extra></extra>',
        showlegend: false
    };
    
    // Create state legend traces
    const states = [...new Set(data.map(d => d.State))];
    const legendTraces = states.map(state => ({
        type: 'bar',
        x: [null],
        y: [null],
        name: state,
        marker: { color: STATE_COLORS[state] || '#666666' },
        showlegend: true
    }));
    
    const layout = {
        title: {
            text: 'The Daily Grind: Top 15 Counties by Chronic Exposure<br><sub>Five years of breathing compromised air, every single day</sub>',
            font: { family: 'Crimson Pro, serif', size: 20, color: '#ffffff' }
        },
        xaxis: {
            title: 'Average Median AQI (Daily Baseline)',
            gridcolor: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            range: [0, Math.max(...data.map(d => d['Median AQI'])) * 1.15]
        },
        yaxis: {
            autorange: 'reversed',
            gridcolor: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff'
        },
        margin: { l: 200, r: 80, t: 100, b: 60 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#ffffff', family: 'Inter, sans-serif' },
        height: 600,
        legend: {
            font: { color: '#ffffff' },
            bgcolor: 'rgba(0,0,0,0.3)',
            bordercolor: 'rgba(255,255,255,0.2)',
            borderwidth: 1
        }
    };
    
    const config = { responsive: true, displayModeBar: false };
    
    Plotly.newPlot('chronic-chart', [trace, ...legendTraces], layout, config);
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
            color: data.map(d => STATE_COLORS[d.State] || '#666666'),
            line: {
                color: 'rgba(0, 0, 0, 0.1)',
                width: 1
            }
        },
        text: data.map(d => d['Max AQI'].toFixed(0)),
        textposition: 'outside',
        hovertemplate: '<b>%{y}</b><br>Max AQI: %{x:.0f}<br><extra></extra>',
        showlegend: false
    };
    
    // Create state legend traces
    const states = [...new Set(data.map(d => d.State))];
    const legendTraces = states.map(state => ({
        type: 'bar',
        x: [null],
        y: [null],
        name: state,
        marker: { color: STATE_COLORS[state] || '#666666' },
        showlegend: true
    }));
    
    const layout = {
        title: {
            text: 'The Sudden Shock: Top 15 Counties by Acute Events<br><sub>The single worst day in each county over five years—when the sky turned hazardous</sub>',
            font: { family: 'Crimson Pro, serif', size: 20 }
        },
        xaxis: {
            title: 'Average Maximum AQI (Worst Single Event)',
            gridcolor: 'rgba(0, 0, 0, 0.05)',
            range: [0, Math.max(...data.map(d => d['Max AQI'])) * 1.15]
        },
        yaxis: {
            autorange: 'reversed',
            gridcolor: 'rgba(0, 0, 0, 0.05)'
        },
        margin: { l: 200, r: 80, t: 100, b: 60 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { family: 'Inter, sans-serif' },
        height: 600,
        legend: {
            bgcolor: 'rgba(255,255,255,0.9)',
            bordercolor: 'rgba(0,0,0,0.1)',
            borderwidth: 1
        }
    };
    
    const config = { responsive: true, displayModeBar: false };
    
    Plotly.newPlot('acute-chart', [trace, ...legendTraces], layout, config);
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
    
    // Calculate proper y-axis range - no crazy exponential scaling!
    const maxY = Math.max(...data.map(d => d['Max AQI']));
    const minY = Math.min(...data.map(d => d['Max AQI']));
    
    const layout = {
        title: {
            text: selectedState === 'ALL' 
                ? 'The Double Jeopardy Map: United States<br><sub>Chronic exposure (x-axis) meets acute crisis (y-axis). Top-right = highest risk.</sub>' 
                : `The Double Jeopardy Map: ${selectedState}<br><sub>Counties in ${selectedState} compared to national thresholds</sub>`,
            font: { family: 'Crimson Pro, serif', size: 22 }
        },
        xaxis: {
            title: 'Chronic Risk (5-Year Avg Median AQI)',
            gridcolor: 'rgba(0, 0, 0, 0.05)',
            zeroline: false,
            range: [0, Math.max(...data.map(d => d['Median AQI'])) * 1.1]
        },
        yaxis: {
            title: 'Acute Risk (5-Year Avg Max AQI)',
            gridcolor: 'rgba(0, 0, 0, 0.05)',
            zeroline: false,
            // Use LINEAR scale with proper range instead of log scale
            type: 'linear',
            range: [0, maxY * 1.15]
        },
        shapes: [
            // Chronic threshold line
            {
                type: 'line',
                x0: globalData.metadata.chronic_threshold,
                x1: globalData.metadata.chronic_threshold,
                y0: 0,
                y1: maxY * 1.15,
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
                x1: Math.max(...data.map(d => d['Median AQI'])) * 1.1,
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
                y: maxY * 1.15,
                text: `Chronic Threshold (${globalData.metadata.chronic_threshold})`,
                showarrow: false,
                xanchor: 'left',
                yanchor: 'top',
                font: { size: 10, color: COLORS.chronic },
                xshift: 5
            },
            {
                x: Math.max(...data.map(d => d['Median AQI'])) * 1.1,
                y: globalData.metadata.acute_threshold,
                text: `Acute Threshold (${globalData.metadata.acute_threshold})`,
                showarrow: false,
                xanchor: 'right',
                yanchor: 'bottom',
                font: { size: 10, color: COLORS.acute },
                yshift: 5
            }
        ],
        hovermode: 'closest',
        showlegend: false,
        margin: { l: 80, r: 40, t: 100, b: 80 },
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

// Render Double Jeopardy basket analysis
function renderDJBasket() {
    const counties = globalData.dj_counties;
    
    // Group by state
    const byState = {};
    counties.forEach(county => {
        if (!byState[county.State]) {
            byState[county.State] = [];
        }
        byState[county.State].push(county);
    });
    
    // Create bubble data
    const bubbleData = [];
    Object.keys(byState).forEach(state => {
        byState[state].forEach((county, index) => {
            // Calculate size based on combined risk (median + max normalized)
            const size = (county['Median AQI'] + county['Max AQI'] / 10);
            bubbleData.push({
                state: state,
                county: county.County,
                median: county['Median AQI'],
                max: county['Max AQI'],
                size: size,
                color: STATE_COLORS[state] || '#666666'
            });
        });
    });
    
    // Populate state filter
    const stateFilter = document.getElementById('basket-state-filter');
    const states = Object.keys(byState).sort();
    states.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = `${state} (${byState[state].length})`;
        stateFilter.appendChild(option);
    });
    
    stateFilter.addEventListener('change', (e) => {
        renderBasketChart(e.target.value, bubbleData, byState);
    });
    
    // Update stats
    document.getElementById('basket-total').textContent = counties.length;
    document.getElementById('basket-states').textContent = states.length;
    
    // Render initial chart
    renderBasketChart('ALL', bubbleData, byState);
}

function renderBasketChart(selectedState, bubbleData, byState) {
    const filteredData = selectedState === 'ALL' 
        ? bubbleData 
        : bubbleData.filter(d => d.state === selectedState);
    
    // Create trace for each state
    const states = selectedState === 'ALL' ? Object.keys(byState) : [selectedState];
    
    const traces = states.map(state => {
        const stateData = filteredData.filter(d => d.state === state);
        return {
            type: 'scatter',
            mode: 'markers+text',
            name: state,
            x: stateData.map((d, i) => i % 8),  // Arrange in grid
            y: stateData.map((d, i) => Math.floor(i / 8)),
            text: stateData.map(d => d.county),
            textposition: 'middle center',
            textfont: { 
                size: 10, 
                color: 'white',
                family: 'Inter, sans-serif',
                weight: 600
            },
            marker: {
                size: stateData.map(d => d.size),
                color: STATE_COLORS[state] || '#666666',
                opacity: 0.85,
                line: {
                    color: 'white',
                    width: 2
                },
                sizemode: 'diameter',
                sizeref: 2
            },
            customdata: stateData.map(d => ({
                county: d.county,
                state: d.state,
                median: d.median,
                max: d.max
            })),
            hovertemplate: '<b>%{customdata.county}, %{customdata.state}</b><br>' +
                          'Median AQI: %{customdata.median:.1f}<br>' +
                          'Max AQI: %{customdata.max:.0f}<br>' +
                          '<extra></extra>'
        };
    });
    
    const layout = {
        title: {
            text: selectedState === 'ALL' 
                ? 'The 37 Double Jeopardy Counties: A Basket Analysis<br><sub>Circle size represents combined health burden (chronic + acute risk)</sub>'
                : `Double Jeopardy Counties in ${selectedState}<br><sub>Circle size represents combined health burden</sub>`,
            font: { family: 'Crimson Pro, serif', size: 20 }
        },
        showlegend: selectedState === 'ALL',
        legend: {
            bgcolor: 'rgba(255,255,255,0.9)',
            bordercolor: 'rgba(0,0,0,0.1)',
            borderwidth: 1,
            orientation: 'v'
        },
        xaxis: {
            visible: false,
            showgrid: false
        },
        yaxis: {
            visible: false,
            showgrid: false
        },
        margin: { l: 20, r: 20, t: 80, b: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        height: 600,
        hovermode: 'closest'
    };
    
    const config = { responsive: true, displayModeBar: false };
    
    Plotly.newPlot('basket-chart', traces, layout, config);
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
