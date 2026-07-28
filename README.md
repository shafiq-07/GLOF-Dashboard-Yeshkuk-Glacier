# GLOF Risk Monitoring Dashboard for Yishkuk Glacier

An interactive Google Earth Engine dashboard for monitoring **Glacial Lake Outburst Flood (GLOF)** risk at **Yishkuk Glacier, Chipurson Valley, Upper Hunza, Gilgit-Baltistan, Pakistan**.

## Overview

This dashboard uses Sentinel-2 satellite imagery (2019–2026) to monitor seasonal changes in glacial lakes. It computes the **Normalized Difference Water Index (NDWI)** to estimate water extent and provides interactive visualisations for analysing glacier and lake dynamics.

## Features

- Multi-year Sentinel-2 archive (2019–2026)
- Automatic cloud masking
- NDWI computation
- Monthly melt-season (May–September) analysis
- Lake surface area estimation
- NDWI trend analysis
- Interactive before-after comparison slider
- RGB and NDWI visualisation
- Google Earth Engine web application

## Study Area

- **Glacier:** Yishkuk Glacier
- **Valley:** Chipurson Valley
- **District:** Upper Hunza
- **Region:** Gilgit-Baltistan, Pakistan

## Data Source

- Sentinel-2 Surface Reflectance (COPERNICUS/S2_SR_HARMONIZED)
- Google Earth Engine

## Methodology

1. Filter Sentinel-2 imagery by date and cloud cover.
2. Apply cloud masking.
3. Compute NDWI.
4. Generate monthly median composites.
5. Estimate lake surface area using NDWI thresholding.
6. Produce time-series charts.
7. Compare glacier conditions using an interactive split-panel interface.

## Technologies Used

- Google Earth Engine
- JavaScript
- Sentinel-2
- Remote Sensing
- GIS

## Live Dashboard

https://proj-no-1.projects.earthengine.app/view/yishkuk-glof-dashboard

## Repository Contents

- `GLOF_Dashboard.js` — Google Earth Engine source code
- `README.md` — Project documentation

## Future Work

- Automatic GLOF early-warning alerts
- Integration of precipitation and temperature datasets
- Machine learning-based GLOF prediction
- Expansion to other glaciers in Gilgit-Baltistan

## Author

**Shafiq Ur Rehman**

BS Civil Engineering  
National University of Technology (NUTECH), Islamabad
