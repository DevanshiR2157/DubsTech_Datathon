# Double Jeopardy: Air Quality Analysis Website

A professional data journalism website analyzing 5 years of EPA air quality data (2021-2025) to identify US counties facing both chronic pollution exposure and acute air quality emergencies.

## 🎯 Project Overview

This website tells the story of "Double Jeopardy" counties—communities trapped between persistent poor air quality and severe pollution spikes. Through interactive visualizations and compelling narrative, it transforms EPA data into actionable policy recommendations.

## 📁 Files Included

- `index.html` - Main HTML structure with storytelling layout
- `style.css` - Professional CSS styling (modern, responsive design)
- `script.js` - Interactive JavaScript (Plotly charts, state filtering)
- `dashboard_data.json` - Processed data from 5 years of EPA AQI reports
- `README.md` - This file

## 🚀 Deployment Instructions

### Option 1: GitHub Pages (Recommended)

1. **Create a new GitHub repository**
   ```bash
   # On GitHub, click "New Repository"
   # Name it something like: datathon-2026-air-quality
   ```

2. **Upload files**
   - Upload all 4 files (index.html, style.css, script.js, dashboard_data.json)
   - You can drag and drop directly on GitHub's website

3. **Enable GitHub Pages**
   - Go to repository Settings
   - Click "Pages" in the left sidebar
   - Under "Source", select `main` branch
   - Click "Save"
   - Your site will be live at: `https://[your-username].github.io/[repo-name]/`

### Option 2: Local Testing

1. **Place all files in the same folder**
   ```
   project-folder/
   ├── index.html
   ├── style.css
   ├── script.js
   └── dashboard_data.json
   ```

2. **Start a local server**
   
   Using Python:
   ```bash
   # Python 3
   python -m http.server 8000
   ```
   
   Or using VS Code:
   - Install "Live Server" extension
   - Right-click index.html
   - Select "Open with Live Server"

3. **Open in browser**
   - Navigate to `http://localhost:8000`

## 🎨 Features

### Interactive Components
- **Animated Statistics**: Count-up animations for key metrics
- **State Filter**: Drill down into specific state data
- **Hover Details**: Dynamic county information panel
- **Responsive Charts**: Three Plotly.js visualizations
  - Chronic exposure bar chart
  - Acute events bar chart
  - Interactive scatter plot with log scale

### Storytelling Structure
- **Hero Section**: Compelling introduction with key stats
- **Act I**: The Daily Grind (chronic exposure)
- **Act II**: When the Sky Turns Red (acute events)
- **Act III**: The Explorer (interactive dashboard)
- **Action Plan**: Policy recommendations
- **Methodology**: Transparent data sourcing

### Design Philosophy
- Clean, modern aesthetic inspired by NYT and The Pudding
- Professional typography (Crimson Pro + Inter)
- Accessible color palette
- Mobile-responsive layout
- Smooth scroll animations

## 📊 Data Summary

- **Total Counties Analyzed**: 994
- **Double Jeopardy Counties**: 37
- **Years Covered**: 2021-2025
- **Data Source**: EPA Air Quality System (AQS)

### Key Thresholds
- Chronic Risk: 90th percentile of median AQI (49.2)
- Acute Risk: 90th percentile of max AQI (162.7)

## 🔧 Technical Stack

- **HTML5**: Semantic structure
- **CSS3**: Custom properties, Grid, Flexbox
- **JavaScript (ES6)**: Async/await, Fetch API
- **Plotly.js 2.27.0**: Interactive charts
- **Google Fonts**: Crimson Pro, Inter

## 📝 Customization

### Changing Colors
Edit the CSS variables in `style.css`:
```css
:root {
    --color-dj: #1e293b;      /* Double Jeopardy */
    --color-chronic: #f59e0b;  /* Chronic exposure */
    --color-acute: #dc2626;    /* Acute events */
    --color-low: #cbd5e1;      /* Low risk */
}
```

### Updating Data
Replace `dashboard_data.json` with new processed data following the same schema.

## 🏆 Winning Elements

Based on analysis of past Datathon winners, this project includes:

1. **Narrative Arc**: Story-driven presentation, not just charts
2. **Interactive Exploration**: Users can filter and discover insights
3. **Policy Impact**: Clear connection from data to action
4. **Professional Design**: Publication-quality aesthetics
5. **Technical Depth**: Sophisticated data processing and visualization
6. **Accessibility**: Clear explanations for non-technical audiences

## 📧 Credits

Created for the 7th DubsTech Datathon
University of Washington, February 2026

Data: EPA Air Quality System
Analysis: Python, Pandas
Visualization: Plotly.js

## 🐛 Troubleshooting

**Charts not showing?**
- Ensure `dashboard_data.json` is in the same folder as `index.html`
- Check browser console for errors (F12)
- Verify you're serving via HTTP (not file://)

**State filter empty?**
- Data loaded successfully? Check console
- JSON file properly formatted? Validate at jsonlint.com

**Styling looks broken?**
- Ensure `style.css` is in the same directory
- Check that font CDN links are working (requires internet)

## 📄 License

This project is created for educational purposes as part of a university datathon.
EPA data is public domain. Visualization code is available for academic use.
