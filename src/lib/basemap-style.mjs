// Protomaps v4 schema: https://docs.protomaps.com/basemaps/layers
// Keep the iOS map's quiet land/water palette; event overlays are added above it.
export function createBasemapStyle(release) {
  const base = `/basemap/${release.version}`;
  const name = ['coalesce', ['get', 'name:en'], ['get', 'name']];
  const kinds = (...values) => ['in', ['get', 'kind'], ['literal', values]];
  const layer = (id, type, sourceLayer, options) => ({
    id, type, source: 'basemap', 'source-layer': sourceLayer, ...options,
  });
  const label = (size, extra = {}) => ({
    'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-size': size,
    'text-max-width': 9, ...extra,
  });
  const textPaint = {
    'text-color': '#58665f', 'text-halo-color': '#f5f6f2', 'text-halo-width': 1.5,
  };
  return {
    version: 8,
    name: 'MapSF Muted',
    glyphs: `${base}/fonts/{fontstack}/{range}.pbf`,
    sources: {
      basemap: {
        type: 'vector', tiles: [`${base}/{z}/{x}/{y}.pbf`],
        bounds: [...release.bounds], minzoom: release.minzoom, maxzoom: release.maxzoom,
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> · <a href="https://protomaps.com" target="_blank" rel="noopener noreferrer">Protomaps</a>',
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#d4e4ec' } },
      layer('earth', 'fill', 'earth', { paint: { 'fill-color': '#f0f0ed' } }),
      layer('landcover', 'fill', 'landcover', {
        filter: kinds('forest', 'grassland', 'scrub'), paint: { 'fill-color': '#e0e8e0' },
      }),
      layer('parks', 'fill', 'landuse', {
        filter: kinds('park', 'garden', 'grass', 'meadow', 'forest', 'wood', 'nature_reserve', 'recreation_ground', 'golf_course', 'cemetery', 'national_park'),
        paint: { 'fill-color': '#dfe8dc' },
      }),
      layer('beaches', 'fill', 'landuse', {
        filter: kinds('beach', 'sand'), paint: { 'fill-color': '#eee9d9' },
      }),
      layer('water', 'fill', 'water', {
        filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#d4e4ec' },
      }),
      layer('buildings', 'fill', 'buildings', {
        minzoom: 14, filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#e3e4df' },
      }),
      layer('paths', 'line', 'roads', {
        minzoom: 13, filter: kinds('path'), paint: {
          'line-color': '#b8c3b4', 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.6, 18, 2],
          'line-dasharray': [2, 2],
        },
      }),
      layer('roads-casing', 'line', 'roads', {
        minzoom: 11, filter: kinds('highway', 'major_road', 'minor_road'),
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#d8dcd6', 'line-width': ['interpolate', ['exponential', 1.3], ['zoom'], 11, 1.2, 15, 5, 18, 15] },
      }),
      layer('roads-minor', 'line', 'roads', {
        minzoom: 11, filter: kinds('minor_road'), layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['exponential', 1.3], ['zoom'], 11, 0.6, 15, 3.5, 18, 13] },
      }),
      layer('roads-major', 'line', 'roads', {
        filter: kinds('highway', 'major_road'), layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#faf9f0', 'line-width': ['interpolate', ['exponential', 1.3], ['zoom'], 8, 0.8, 12, 2, 15, 4.5, 18, 15] },
      }),
      layer('rail', 'line', 'roads', {
        minzoom: 13, filter: ['all', kinds('rail'), ['!=', ['get', 'is_tunnel'], true]],
        paint: { 'line-color': '#b7bdb8', 'line-width': 1, 'line-dasharray': [3, 3] },
      }),
      layer('city-boundaries', 'line', 'boundaries', {
        minzoom: 9, filter: kinds('county', 'locality'),
        paint: { 'line-color': '#8b9991', 'line-width': 1.3, 'line-dasharray': [4, 3] },
      }),
      layer('road-labels', 'symbol', 'roads', {
        minzoom: 12, filter: kinds('major_road', 'highway'),
        layout: label(['interpolate', ['linear'], ['zoom'], 12, 11, 16, 13], { 'symbol-placement': 'line', 'symbol-spacing': 300 }),
        paint: textPaint,
      }),
      layer('minor-road-labels', 'symbol', 'roads', {
        minzoom: 14, filter: kinds('minor_road'),
        layout: label(11, { 'symbol-placement': 'line', 'symbol-spacing': 250 }), paint: textPaint,
      }),
      layer('park-labels', 'symbol', 'pois', {
        minzoom: 13, filter: kinds('park', 'garden', 'nature_reserve'),
        layout: label(12), paint: { ...textPaint, 'text-color': '#58745b' },
      }),
      layer('neighbourhood-labels', 'symbol', 'places', {
        minzoom: 11, maxzoom: 16, filter: kinds('neighbourhood', 'macrohood'),
        layout: label(['interpolate', ['linear'], ['zoom'], 11, 11, 15, 14], { 'text-letter-spacing': 0.04 }),
        paint: textPaint,
      }),
      layer('city-labels', 'symbol', 'places', {
        maxzoom: 12, filter: kinds('locality'),
        layout: label(['interpolate', ['linear'], ['zoom'], 8, 12, 11, 17]), paint: textPaint,
      }),
    ],
  };
}
