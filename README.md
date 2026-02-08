# Double Jeopardy: Air Quality Analysis (2021–2025)

Static dashboard (GitHub Pages friendly). Loads annual AQI by county CSVs (2021–2025) in-browser and builds interactive charts.

## Includes

1) Chronic: Top N counties by 5-year average **Median AQI**
2) Acute: Top N counties by 5-year average **Max AQI**
3) Scatter: Chronic vs Acute with **Double Jeopardy** zone (top 10% thresholds)
4) Side bar: Top 5 Double Jeopardy counties (updates with selected state)
5) Choropleth heatmap: High AQI days by state (2021–2025)

## Outlier handling

- The point **Mono County, California** is excluded from the **scatter plot only** (to avoid extreme-scale distortion). Thresholds/KPIs are unchanged.

## Run locally

```bash
python -m http.server 8000
```
Open: http://localhost:8000

## Deploy

Commit everything and enable GitHub Pages from Settings → Pages.
