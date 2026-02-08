# Double Jeopardy: Air Quality Analysis 2021-2025

A data-driven analysis identifying 37 U.S. counties facing both chronic daily pollution and acute emergency air quality events.

## 🚀 Quick Start

### Local Development

**Option 1: Python HTTP Server (Recommended)**
```bash
# Navigate to the project folder
cd /path/to/your/project

# Start the server
python -m http.server 8000

# Open in browser
http://localhost:8000
```

**Option 2: Python 2**
```bash
python -m SimpleHTTPServer 8000
```

**Option 3: Node.js**
```bash
npx http-server -p 8000
```

### Deploy to GitHub Pages

1. Create a new repository on GitHub
2. Upload all files:
   - index.html
   - style.css
   - script.js
   - dashboard_data.json
   - README.md

3. Go to **Settings** → **Pages**
4. Under "Source", select **main** branch
5. Click **Save**
6. Your site will be live at: `https://[username].github.io/[repo-name]/`

## ⚠️ Important Notes

- **Do NOT open index.html directly in your browser** - This will cause a security error preventing the JSON data from loading
- Always use a local server for testing (see Quick Start above)
- All 4 files must be in the same directory

## 📊 Project Structure

```
project/
├── index.html              # Main HTML file
├── style.css               # Styling (Bella Slee inspired)
├── script.js               # Interactive visualizations
├── dashboard_data.json     # Processed EPA data (2021-2025)
└── README.md              # This file
```

## 🎨 Features

- **Rotating Title Animation** - Eye-catching entry point
- **State-Colored Charts** - Geographic patterns at a glance
- **Interactive Filters** - Explore by state
- **Basket Analysis** - Visual clustering of 37 Double Jeopardy counties
- **Hover Details** - Real-time county statistics
- **Mobile Responsive** - Works on all devices

## 🏆 Data Analysis Highlights

- **994 counties analyzed** across 2021-2025
- **37 counties identified** in "Double Jeopardy"
- **68% concentrated** in Western U.S.
- **California leads** with 12 counties (32% of total)

## 📈 Technologies Used

- HTML5
- CSS3 (Mulish font, inspired by award-winning datathon projects)
- JavaScript (Vanilla ES6+)
- Plotly.js for interactive visualizations
- EPA Air Quality Index data

## 🔧 Troubleshooting

**Error: "Error Loading Data"**
- Make sure you're using a local server (not opening file:// directly)
- Check that dashboard_data.json is in the same folder
- Try the Python HTTP server command above

**Charts not displaying**
- Open browser console (F12) and check for errors
- Verify Plotly.js CDN is accessible
- Ensure all files are in the same directory

## 👥 Credits

Created for the 2026 DubsTech Datathon
Data Source: EPA Air Quality Index (2021-2025)

Design inspiration: Bella Slee's award-winning 2023 datathon project
