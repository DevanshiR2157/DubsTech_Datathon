# Double Jeopardy Dashboard (2021–2025)

This is a **static** dashboard intended for **GitHub Pages**.

## Required files in repo root

- `index.html`
- `style.css`
- `script.js`
- `dashboard_data.json`
- `annual_aqi_by_county_2021.csv`
- `annual_aqi_by_county_2022.csv`
- `annual_aqi_by_county_2023.csv`
- `annual_aqi_by_county_2024.csv`
- `annual_aqi_by_county_2025.csv`

## Notes

- The charts are built from `dashboard_data.json`.
- The choropleth heatmap uses the annual CSVs to compute high-AQI days.
- **Mono County, California** is excluded from the scatter plot only.

## Run locally

```bash
python -m http.server 8000
```

Then open: http://localhost:8000
