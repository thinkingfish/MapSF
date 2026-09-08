# Offline Map Tiles with Custom Styling

## Overview

Replace Apple MapKit tiles with locally-bundled OpenStreetMap vector tiles, styled with a muted aesthetic so album overlays (segments, areas, POIs) remain the visual focus.

**Goals:**
- Offline capability (pre-bundled, no network required)
- Minimalist/muted base map styling
- San Francisco County coverage only
- Street-level detail (z10-16)

## Architecture

**Current:**
```
Map (SwiftUI) → MapKit → Apple tile servers
```

**Proposed:**
```
MLNMapView (UIKit wrapped) → sf-tiles.pmtiles → style.json
```

**Components:**

| Component | Description |
|-----------|-------------|
| `sf-tiles.pmtiles` | Pre-generated vector tiles for SF County, z10-16 (~15-25MB) |
| `style.json` | MapLibre style spec based on CARTO Positron, POI labels removed |
| `MapLibreMapView.swift` | UIViewRepresentable wrapper for SwiftUI integration |

## Tile Generation

One-time extraction using Protomaps:

```bash
# Check available builds at https://maps.protomaps.com/builds/
npx pmtiles extract \
  https://build.protomaps.com/YYYYMMDD.pmtiles \
  sf-tiles.pmtiles \
  --bbox=-122.5155,37.708,-122.357,37.8324 \
  --maxzoom=16 --minzoom=10
```

**SF County bounding box:**
- min_lon: -122.5155
- min_lat: 37.7080
- max_lon: -122.3570
- max_lat: 37.8324

**Updating tiles:** Run the same command with a newer build date when fresher OSM data is needed.

## Style Specification

Based on [CARTO Positron](https://github.com/CartoDB/basemap-styles/blob/master/mapboxgl/positron.json) — a muted, light gray palette designed as a backdrop for data visualization.

**Modifications from stock Positron:**
- Remove POI labels (app has its own markers)
- Keep street names, neighborhood names, water/park names

**Palette summary:**

| Layer | Color |
|-------|-------|
| Background/land | `#f0f0f0` |
| Water | `#d4e4ec` |
| Parks | `#e0e8e0` |
| Buildings | `#e8e8e8` |
| Roads (major) | `#ffffff` |
| Roads (minor) | `#fafafa` |
| Road casings | `#dedede` |
| Labels | `#909090` |

## MapLibre Integration

### Wrapper

`MapLibreMapView.swift` — UIViewRepresentable that:
1. Loads local PMTiles from `Resources/BaseMap/sf-tiles.pmtiles`
2. Applies `style.json`
3. Enforces camera constraints (SF bounds, z10-16)
4. Binds to `MapState` for selection and overlays

### Overlay Rendering

MapLibre equivalents for current MapKit annotations:

| Current (MapKit) | MapLibre |
|------------------|----------|
| `MapPolyline` | `MLNPolylineFeature` + style layer |
| `MapPolygon` | `MLNPolygonFeature` + style layer |
| `Annotation` (markers) | `MLNPointAnnotation` or symbol layer |

### Tap Handling

Use `queryRenderedFeatures(at:styleLayerIdentifiers:)` for hit-testing:
- **Lines:** Configurable tolerance (~22pt), handles route segments
- **Polygons:** Native point-in-polygon on GPU, handles areas
- **Overlap:** Returns features in render order, topmost first

This replaces custom area tap hit-testing code.

## File Structure

**New files:**
```
MapSF/
├── Resources/
│   └── BaseMap/
│       ├── sf-tiles.pmtiles
│       └── style.json
├── Views/
│   └── MapLibreMapView.swift
```

**Modified files:**
```
MapSF/
├── Views/
│   └── MapExplorerView.swift    # Swap Map → MapLibreMapView
```

**Deleted code:**
- Custom area tap hit-testing logic in MapExplorerView

## Dependencies

```swift
// SPM
.package(url: "https://github.com/maplibre/maplibre-gl-native-distribution", from: "6.0.0")
```

## Bundle Size Impact

| Item | Size |
|------|------|
| MapLibre framework | ~15MB |
| sf-tiles.pmtiles | ~15-25MB |
| style.json | ~50KB |
| **Total added** | **~30-40MB** |

## Migration Approach

1. Add MapLibre SPM dependency
2. Create `MapLibreMapView.swift` wrapper
3. Swap into `MapExplorerView` in place of SwiftUI `Map`
4. Delete custom area tap code
5. Test overlays, selection, camera bounds

**Fallback:** Keep old `Map` implementation behind feature flag during development.
