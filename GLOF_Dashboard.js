// ============================================================
// GLOF RISK MONITORING DASHBOARD - Yishkuk Glacier / Chipurson
// ============================================================

// --- Cloud mask ---
function maskS2clouds(image) {
  var qa = image.select('QA60');
  var mask = qa.bitwiseAnd(1 << 10).eq(0).and(qa.bitwiseAnd(1 << 11).eq(0));
  return image.updateMask(mask).divide(10000).copyProperties(image, ['system:time_start']);
}

// --- Collection: Sentinel-2 archive since 2019 ---
var collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(yishkukAOI)
  .filterDate('2019-01-01', '2026-07-23')
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 40))
  .map(maskS2clouds)
  .map(function(img) {
    var ndwi = img.normalizedDifference(['B3', 'B8']).rename('NDWI');
    return img.addBands(ndwi);
  });

print('Total images since 2019:', collection.size());

// ============================================================
// PART 1: Glacial lake area time series (melt-season composites)
// ============================================================

var YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
var MELT_MONTHS = [5, 6, 7, 8, 9];

var WATER_THRESHOLD = 0.1;
var combinedReducer = ee.Reducer.sum().combine({reducer2: ee.Reducer.mean(), sharedInputs: true});

var periodList = [];
YEARS.forEach(function(y) {
  MELT_MONTHS.forEach(function(m) {
    periodList.push({year: y, month: m});
  });
});

// Trim any period beyond today (July 28, 2026) - plain JS filter, safe on this array
periodList = periodList.filter(function(p) {
  var d = new Date(p.year, p.month - 1, 1);
  return d <= new Date(2026, 6, 28);
});

var lakeFeatures = periodList.map(function(p) {
  var start = ee.Date.fromYMD(p.year, p.month, 1);
  var end = start.advance(1, 'month');
  var monthly = collection.filterDate(start, end);
  var count = monthly.size();

  var ndwiband = ee.Image(ee.Algorithms.If(
    count.gt(0),
    monthly.median().select('NDWI'),
    ee.Image(0).rename('NDWI')
  ));

  var waterArea = ee.Image(ee.Algorithms.If(
    count.gt(0),
    ndwiband.gt(WATER_THRESHOLD).multiply(ee.Image.pixelArea()).rename('water'),
    ee.Image(0).rename('water')
  ));

  var combined = ndwiband.addBands(waterArea);

  var stats = combined.reduceRegion({
    reducer: combinedReducer,
    geometry: yishkukAOI,
    scale: 10,
    maxPixels: 1e13,
    bestEffort: true
  });

  return ee.Feature(null, {
    date: start.format('YYYY-MM'),
    lake_area_m2: stats.get('water_sum'),
    mean_NDWI: stats.get('NDWI_mean'),
    image_count: count
  });
});

var lakeAreaSeries = ee.FeatureCollection(lakeFeatures)
  .filter(ee.Filter.gt('image_count', 0));

var lakeAreaChart = ui.Chart.feature.byFeature(lakeAreaSeries, 'date', 'lake_area_m2')
  .setChartType('LineChart')
  .setOptions({
    title: 'Estimated Lake/Water Surface Area (May-Sep composites)',
    hAxis: {title: 'Year-Month'},
    vAxis: {title: 'Area (m²)'},
    lineWidth: 2, pointSize: 3, colors: ['#0077be']
  });

var ndwiTrendChart = ui.Chart.feature.byFeature(lakeAreaSeries, 'date', 'mean_NDWI')
  .setChartType('LineChart')
  .setOptions({
    title: 'Mean NDWI Trend (May-Sep composites)',
    hAxis: {title: 'Year-Month'},
    vAxis: {title: 'Mean NDWI'},
    lineWidth: 2, colors: ['#20B2AA']
  });

// ============================================================
// PART 2: Before/after comparison slider (safe against empty images)
// ============================================================

var beforeMap = ui.Map();
var afterMap = ui.Map();
beforeMap.centerObject(yishkukAOI, 13);
afterMap.centerObject(yishkukAOI, 13);
beforeMap.setControlVisibility({layerList: false});
afterMap.setControlVisibility({layerList: false});
var linker = ui.Map.Linker([beforeMap, afterMap], 'change-bounds');

var visRGB = {min: 0, max: 0.3, bands: ['B4', 'B3', 'B2']};
var visNDWI = {min: -0.3, max: 0.5, palette: ['brown', 'white', 'cyan', 'blue']};

function safeAddComposite(map, dateStr, label) {
  var start = ee.Date(dateStr);
  var end = start.advance(1, 'month');
  var monthly = collection.filterDate(start, end);
  var count = monthly.size().getInfo();

  map.layers().reset();
  if (count === 0) {
    map.add(ui.Label('No cloud-free images for ' + label, {color: 'red', backgroundColor: 'white'}));
    return;
  }
  var img = monthly.median().clip(yishkukAOI);
  map.addLayer(img, visRGB, 'RGB ' + label);
  map.addLayer(img.select('NDWI'), visNDWI, 'Water/NDWI ' + label, false);
}

var dateOptions = ['2019-07-01', '2020-07-01', '2021-07-01', '2022-07-01',
                    '2023-07-01', '2024-07-01', '2025-07-01', '2026-07-01'];

var beforeSelect = ui.Select({items: dateOptions, value: '2019-07-01', onChange: function() { redraw(); }});
var afterSelect = ui.Select({items: dateOptions, value: '2026-07-01', onChange: function() { redraw(); }});

function redraw() {
  safeAddComposite(beforeMap, beforeSelect.getValue(), beforeSelect.getValue());
  safeAddComposite(afterMap, afterSelect.getValue(), afterSelect.getValue());
}
redraw();

var comparisonPanel = ui.Panel({
  widgets: [ui.Label('Before:'), beforeSelect, ui.Label('After:'), afterSelect],
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {position: 'top-center'}
});
beforeMap.add(comparisonPanel);

var splitCompare = ui.SplitPanel({
  firstPanel: beforeMap, secondPanel: afterMap,
  orientation: 'horizontal', wipe: true
});

// ============================================================
// PART 3: Assemble dashboard
// ============================================================

var sidePanel = ui.Panel({style: {width: '350px', padding: '10px'}});
sidePanel.add(ui.Label('GLOF Risk Monitoring Dashboard', {fontWeight: 'bold', fontSize: '18px'}));
sidePanel.add(ui.Label('Yishkuk Glacier — Chipurson Valley, Hunza', {fontSize: '12px', color: 'gray'}));
sidePanel.add(lakeAreaChart);
sidePanel.add(ndwiTrendChart);
sidePanel.add(ui.Label('Before/After dropdowns compare July of each year (peak melt season).', {fontSize: '11px', fontStyle: 'italic'}));

var mainPanel = ui.Panel({
  widgets: [sidePanel, splitCompare],
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {stretch: 'both'}
});
ui.root.widgets().reset([mainPanel]);
