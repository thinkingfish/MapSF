# Offline Tiles Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Apple MapKit with MapLibre + locally-bundled PMTiles for offline SF maps with muted styling.

**Architecture:** UIViewRepresentable wrapper around MLNMapView, loading tiles from bundled sf-tiles.pmtiles with Positron-derived style. Overlays (segments, areas, POIs) rendered via MapLibre's annotation/layer system.

**Tech Stack:** MapLibre Native iOS, PMTiles, MapLibre Style Spec JSON

---

## Prerequisites

The PMTiles file already exists at `MapSF/Resources/BaseMap/sf-tiles.pmtiles` (~12MB).

---

## Task 1: Add MapLibre SPM Dependency

**Files:**
- Modify: `MapSF.xcodeproj/project.pbxproj` (via Xcode)

**Step 1: Add package dependency**

In Xcode:
1. File → Add Package Dependencies
2. Enter URL: `https://github.com/maplibre/maplibre-gl-native-distribution`
3. Set version rule: Up to Next Major from `6.0.0`
4. Add `MapLibre` product to MapSF target

**Step 2: Verify build**

Run: `xcodebuild -project MapSF.xcodeproj -scheme MapSF -destination 'platform=iOS Simulator,name=iPhone 16' build -quiet`

Expected: BUILD SUCCEEDED (with MapLibre framework linked)

**Step 3: Commit**

```bash
git add MapSF.xcodeproj/project.pbxproj
git commit -m "deps: add MapLibre Native iOS via SPM"
```

---

## Task 2: Add PMTiles Protocol Handler

MapLibre doesn't natively understand PMTiles format. We need a custom URL protocol handler to serve tiles from the PMTiles file.

**Files:**
- Create: `MapSF/Services/PMTilesSource.swift`

**Step 1: Create PMTiles source helper**

```swift
import Foundation
import MapLibre

/// Provides access to bundled PMTiles for MapLibre
enum PMTilesSource {
    /// URL for the bundled SF tiles PMTiles file
    static var sfTilesURL: URL? {
        Bundle.main.url(forResource: "sf-tiles", withExtension: "pmtiles", subdirectory: "Resources/BaseMap")
    }

    /// Register the PMTiles URL scheme with MapLibre
    static func registerProtocol() {
        // MapLibre supports pmtiles:// URLs natively as of v6.0
        // No additional registration needed
    }
}
```

**Step 2: Verify file compiles**

Run: `xcodebuild -project MapSF.xcodeproj -scheme MapSF -destination 'platform=iOS Simulator,name=iPhone 16' build -quiet`

Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add MapSF/Services/PMTilesSource.swift
git commit -m "feat: add PMTiles source helper"
```

---

## Task 3: Create Base Map Style JSON

**Files:**
- Create: `MapSF/Resources/BaseMap/style.json`

**Step 1: Create minimal Positron-based style**

The style references the local PMTiles file and defines the muted color palette.

```json
{
  "version": 8,
  "name": "MapSF Muted",
  "sources": {
    "protomaps": {
      "type": "vector",
      "url": "pmtiles://sf-tiles.pmtiles",
      "attribution": "© OpenStreetMap contributors"
    }
  },
  "layers": [
    {
      "id": "background",
      "type": "background",
      "paint": {
        "background-color": "#f0f0f0"
      }
    },
    {
      "id": "water",
      "type": "fill",
      "source": "protomaps",
      "source-layer": "water",
      "paint": {
        "fill-color": "#d4e4ec"
      }
    },
    {
      "id": "landuse-park",
      "type": "fill",
      "source": "protomaps",
      "source-layer": "landuse",
      "filter": ["==", "pmap:kind", "park"],
      "paint": {
        "fill-color": "#e0e8e0"
      }
    },
    {
      "id": "buildings",
      "type": "fill",
      "source": "protomaps",
      "source-layer": "buildings",
      "paint": {
        "fill-color": "#e8e8e8"
      }
    },
    {
      "id": "roads-minor",
      "type": "line",
      "source": "protomaps",
      "source-layer": "roads",
      "filter": ["in", "pmap:kind", "minor_road", "other"],
      "paint": {
        "line-color": "#fafafa",
        "line-width": 1
      }
    },
    {
      "id": "roads-major-casing",
      "type": "line",
      "source": "protomaps",
      "source-layer": "roads",
      "filter": ["in", "pmap:kind", "highway", "major_road"],
      "paint": {
        "line-color": "#dedede",
        "line-width": 6,
        "line-gap-width": 0
      }
    },
    {
      "id": "roads-major",
      "type": "line",
      "source": "protomaps",
      "source-layer": "roads",
      "filter": ["in", "pmap:kind", "highway", "major_road"],
      "paint": {
        "line-color": "#ffffff",
        "line-width": 4
      }
    },
    {
      "id": "road-labels",
      "type": "symbol",
      "source": "protomaps",
      "source-layer": "roads",
      "filter": ["has", "name"],
      "layout": {
        "text-field": "{name}",
        "text-font": ["Noto Sans Regular"],
        "text-size": 10,
        "symbol-placement": "line"
      },
      "paint": {
        "text-color": "#909090",
        "text-halo-color": "#f0f0f0",
        "text-halo-width": 1
      }
    },
    {
      "id": "place-labels",
      "type": "symbol",
      "source": "protomaps",
      "source-layer": "places",
      "filter": ["in", "pmap:kind", "neighbourhood", "locality"],
      "layout": {
        "text-field": "{name}",
        "text-font": ["Noto Sans Regular"],
        "text-size": 12
      },
      "paint": {
        "text-color": "#909090",
        "text-halo-color": "#f0f0f0",
        "text-halo-width": 1
      }
    }
  ]
}
```

**Step 2: Add file to Xcode project**

Ensure `style.json` is included in the target's Copy Bundle Resources build phase.

**Step 3: Verify file is bundled**

Run: `xcodebuild -project MapSF.xcodeproj -scheme MapSF -destination 'platform=iOS Simulator,name=iPhone 16' build -quiet && ls -la ~/Library/Developer/Xcode/DerivedData/MapSF-*/Build/Products/Debug-iphonesimulator/MapSF.app/Resources/BaseMap/`

Expected: Both `sf-tiles.pmtiles` and `style.json` present

**Step 4: Commit**

```bash
git add MapSF/Resources/BaseMap/style.json
git commit -m "feat: add Positron-based muted style for base map"
```

---

## Task 4: Create MapLibre View Wrapper

**Files:**
- Create: `MapSF/Views/MapLibreMapView.swift`

**Step 1: Create basic UIViewRepresentable wrapper**

```swift
import SwiftUI
import MapLibre

struct MapLibreMapView: UIViewRepresentable {
    @Environment(MapState.self) private var mapState

    // SF bounds for camera constraints
    private static let sfBounds = MLNCoordinateBounds(
        sw: CLLocationCoordinate2D(latitude: 37.708, longitude: -122.5155),
        ne: CLLocationCoordinate2D(latitude: 37.8324, longitude: -122.357)
    )

    private static let defaultCenter = CLLocationCoordinate2D(latitude: 37.7610, longitude: -122.4410)
    private static let defaultZoom: Double = 12.0

    func makeUIView(context: Context) -> MLNMapView {
        let mapView = MLNMapView(frame: .zero)
        mapView.delegate = context.coordinator

        // Load local style
        if let styleURL = Bundle.main.url(forResource: "style", withExtension: "json", subdirectory: "Resources/BaseMap") {
            mapView.styleURL = styleURL
        }

        // Set initial camera
        mapView.setCenter(Self.defaultCenter, zoomLevel: Self.defaultZoom, animated: false)

        // Camera bounds (SF only)
        mapView.setVisibleCoordinateBounds(Self.sfBounds, animated: false)

        // Zoom limits (z10-16 equivalent)
        mapView.minimumZoomLevel = 10
        mapView.maximumZoomLevel = 16

        // UI settings
        mapView.compassView.isHidden = false
        mapView.showsScale = true
        mapView.showsUserLocation = false

        // Add tap gesture for feature selection
        let tapGesture = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        mapView.addGestureRecognizer(tapGesture)

        return mapView
    }

    func updateUIView(_ mapView: MLNMapView, context: Context) {
        context.coordinator.updateOverlays(on: mapView, mapState: mapState)
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(mapState: mapState)
    }

    class Coordinator: NSObject, MLNMapViewDelegate {
        private var mapState: MapState
        private var overlaySourcesAdded = false

        init(mapState: MapState) {
            self.mapState = mapState
        }

        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            guard let mapView = gesture.view as? MLNMapView else { return }
            let point = gesture.location(in: mapView)

            // Query features at tap point
            let features = mapView.visibleFeatures(at: point, styleLayerIdentifiers: ["overlay-segments", "overlay-areas", "overlay-pois"])

            if let feature = features.first {
                handleFeatureSelection(feature)
            } else {
                mapState.clearSelection()
            }
        }

        private func handleFeatureSelection(_ feature: MLNFeature) {
            // Feature selection will be implemented when overlays are added
            // For now, just clear selection on any tap
            mapState.clearSelection()
        }

        func updateOverlays(on mapView: MLNMapView, mapState: MapState) {
            self.mapState = mapState
            // Overlay rendering will be implemented in Task 5
        }

        // MARK: - MLNMapViewDelegate

        func mapView(_ mapView: MLNMapView, didFinishLoading style: MLNStyle) {
            // Style loaded, ready for overlays
        }
    }
}

#Preview {
    MapLibreMapView()
        .environment(MapState())
}
```

**Step 2: Verify build**

Run: `xcodebuild -project MapSF.xcodeproj -scheme MapSF -destination 'platform=iOS Simulator,name=iPhone 16' build -quiet`

Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add MapSF/Views/MapLibreMapView.swift
git commit -m "feat: add MapLibre UIViewRepresentable wrapper"
```

---

## Task 5: Implement Overlay Rendering

**Files:**
- Modify: `MapSF/Views/MapLibreMapView.swift`

**Step 1: Add overlay layer management**

Add these methods to the Coordinator class:

```swift
// Add after handleFeatureSelection method

private func addOverlayLayers(to style: MLNStyle) {
    guard !overlaySourcesAdded else { return }

    // Segments source and layer
    let segmentsSource = MLNShapeSource(identifier: "segments-source", shapes: [], options: nil)
    style.addSource(segmentsSource)

    let segmentsLayer = MLNLineStyleLayer(identifier: "overlay-segments", source: segmentsSource)
    segmentsLayer.lineWidth = NSExpression(forConstantValue: 4)
    segmentsLayer.lineColor = NSExpression(forConstantValue: UIColor.systemPink)
    segmentsLayer.lineCap = NSExpression(forConstantValue: "round")
    segmentsLayer.lineJoin = NSExpression(forConstantValue: "round")
    style.addLayer(segmentsLayer)

    // Areas source and layer
    let areasSource = MLNShapeSource(identifier: "areas-source", shapes: [], options: nil)
    style.addSource(areasSource)

    let areasFillLayer = MLNFillStyleLayer(identifier: "overlay-areas-fill", source: areasSource)
    areasFillLayer.fillColor = NSExpression(forConstantValue: UIColor(red: 230/255, green: 150/255, blue: 50/255, alpha: 0.2))
    style.addLayer(areasFillLayer)

    let areasStrokeLayer = MLNLineStyleLayer(identifier: "overlay-areas-stroke", source: areasSource)
    areasStrokeLayer.lineWidth = NSExpression(forConstantValue: 2)
    areasStrokeLayer.lineColor = NSExpression(forConstantValue: UIColor(red: 230/255, green: 150/255, blue: 50/255, alpha: 1.0))
    style.addLayer(areasStrokeLayer)

    overlaySourcesAdded = true
}

func updateSegments(_ segments: [SegmentData], color: UIColor, on mapView: MLNMapView) {
    guard let style = mapView.style,
          let source = style.source(withIdentifier: "segments-source") as? MLNShapeSource else { return }

    let features = segments.map { segment -> MLNPolylineFeature in
        let coords = segment.coordinates
        let feature = MLNPolylineFeature(coordinates: coords, count: UInt(coords.count))
        feature.identifier = segment.id.uuidString
        feature.attributes = ["name": segment.name]
        return feature
    }

    source.shape = MLNShapeCollectionFeature(shapes: features)

    // Update line color
    if let layer = style.layer(withIdentifier: "overlay-segments") as? MLNLineStyleLayer {
        layer.lineColor = NSExpression(forConstantValue: color)
    }
}

func updateAreas(_ areas: [AreaData], on mapView: MLNMapView) {
    guard let style = mapView.style,
          let source = style.source(withIdentifier: "areas-source") as? MLNShapeSource else { return }

    let features = areas.map { area -> MLNPolygonFeature in
        let coords = area.boundary
        let feature = MLNPolygonFeature(coordinates: coords, count: UInt(coords.count))
        feature.identifier = area.id.uuidString
        feature.attributes = ["name": area.name]
        return feature
    }

    source.shape = MLNShapeCollectionFeature(shapes: features)
}
```

**Step 2: Update the delegate method to initialize layers**

Replace the `mapView(_:didFinishLoading:)` method:

```swift
func mapView(_ mapView: MLNMapView, didFinishLoading style: MLNStyle) {
    addOverlayLayers(to: style)
    updateOverlays(on: mapView, mapState: mapState)
}
```

**Step 3: Verify build**

Run: `xcodebuild -project MapSF.xcodeproj -scheme MapSF -destination 'platform=iOS Simulator,name=iPhone 16' build -quiet`

Expected: BUILD SUCCEEDED

**Step 4: Commit**

```bash
git add MapSF/Views/MapLibreMapView.swift
git commit -m "feat: add segment and area overlay rendering"
```

---

## Task 6: Implement POI Markers

**Files:**
- Modify: `MapSF/Views/MapLibreMapView.swift`

**Step 1: Add POI annotation support**

Add these methods to the Coordinator class:

```swift
private var poiAnnotations: [MLNPointAnnotation] = []

func updatePOIs(_ pois: [POIData], color: UIColor, on mapView: MLNMapView) {
    // Remove existing annotations
    if !poiAnnotations.isEmpty {
        mapView.removeAnnotations(poiAnnotations)
        poiAnnotations.removeAll()
    }

    // Add new annotations
    for poi in pois {
        let annotation = MLNPointAnnotation()
        annotation.coordinate = poi.coordinate
        annotation.title = poi.name
        annotation.subtitle = poi.categories.first?.displayName
        poiAnnotations.append(annotation)
    }

    mapView.addAnnotations(poiAnnotations)
}

// Add to MLNMapViewDelegate
func mapView(_ mapView: MLNMapView, viewFor annotation: MLNAnnotation) -> MLNAnnotationView? {
    guard let pointAnnotation = annotation as? MLNPointAnnotation else { return nil }

    let reuseIdentifier = "poi-marker"
    var annotationView = mapView.dequeueReusableAnnotationView(withIdentifier: reuseIdentifier)

    if annotationView == nil {
        annotationView = MLNAnnotationView(reuseIdentifier: reuseIdentifier)
        annotationView?.frame = CGRect(x: 0, y: 0, width: 30, height: 30)
    }

    // Find POI for this annotation to get icon
    // For now, use a simple circle marker
    let marker = UIView(frame: CGRect(x: 0, y: 0, width: 30, height: 30))
    marker.backgroundColor = UIColor.systemPink.withAlphaComponent(0.8)
    marker.layer.cornerRadius = 15
    marker.layer.borderWidth = 2
    marker.layer.borderColor = UIColor.white.cgColor

    annotationView?.addSubview(marker)

    return annotationView
}

func mapView(_ mapView: MLNMapView, didSelect annotation: MLNAnnotation) {
    // Find and select the corresponding POI
    if let pointAnnotation = annotation as? MLNPointAnnotation {
        // Selection handling will connect to MapState
    }
}
```

**Step 2: Verify build**

Run: `xcodebuild -project MapSF.xcodeproj -scheme MapSF -destination 'platform=iOS Simulator,name=iPhone 16' build -quiet`

Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add MapSF/Views/MapLibreMapView.swift
git commit -m "feat: add POI marker annotations"
```

---

## Task 7: Wire Up AlbumLoader Data

**Files:**
- Modify: `MapSF/Views/MapLibreMapView.swift`

**Step 1: Add AlbumLoader environment and update method**

Update the struct to include AlbumLoader:

```swift
struct MapLibreMapView: UIViewRepresentable {
    @Environment(MapState.self) private var mapState
    @Environment(AlbumLoader.self) private var albumLoader

    // ... rest of properties ...

    func makeCoordinator() -> Coordinator {
        Coordinator(mapState: mapState, albumLoader: albumLoader)
    }
```

Update Coordinator:

```swift
class Coordinator: NSObject, MLNMapViewDelegate {
    private var mapState: MapState
    private var albumLoader: AlbumLoader
    // ... rest of properties ...

    init(mapState: MapState, albumLoader: AlbumLoader) {
        self.mapState = mapState
        self.albumLoader = albumLoader
    }

    func updateOverlays(on mapView: MLNMapView, mapState: MapState) {
        self.mapState = mapState

        guard mapView.style != nil else { return }

        // Get data from active albums
        for (index, album) in mapState.activeAlbums.enumerated() {
            let color = UIColor(mapState.color(for: index))

            let segments = albumLoader.segments(for: album)
            updateSegments(segments, color: color, on: mapView)

            let areas = albumLoader.areas(for: album)
            updateAreas(areas, on: mapView)

            let pois = albumLoader.pois(for: album)
            updatePOIs(pois, color: color, on: mapView)
        }
    }
}
```

**Step 2: Verify build**

Run: `xcodebuild -project MapSF.xcodeproj -scheme MapSF -destination 'platform=iOS Simulator,name=iPhone 16' build -quiet`

Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add MapSF/Views/MapLibreMapView.swift
git commit -m "feat: wire overlay rendering to AlbumLoader data"
```

---

## Task 8: Replace Map in MapExplorerView

**Files:**
- Modify: `MapSF/Views/MapExplorerView.swift`

**Step 1: Remove MapKit import and replace with MapLibre**

Replace:
```swift
import MapKit
```

With:
```swift
import MapLibre
```

**Step 2: Replace the mapContent computed property**

Replace the entire `mapContent` computed property (lines ~104-238) with:

```swift
private var mapContent: some View {
    MapLibreMapView()
        .id(initialAlbum.id) // Force recreation per album
}
```

**Step 3: Remove unused properties and code**

Delete:
- `cameraPosition` state
- `currentRegion` state
- `lastScale` state
- `zoomScale` computed property
- `cameraBounds` static property
- The `clamped(to:)` extension on Double

**Step 4: Verify build**

Run: `xcodebuild -project MapSF.xcodeproj -scheme MapSF -destination 'platform=iOS Simulator,name=iPhone 16' build -quiet`

Expected: BUILD SUCCEEDED

**Step 5: Commit**

```bash
git add MapSF/Views/MapExplorerView.swift
git commit -m "feat: replace MapKit with MapLibreMapView"
```

---

## Task 9: Implement Feature Selection

**Files:**
- Modify: `MapSF/Views/MapLibreMapView.swift`

**Step 1: Update handleFeatureSelection to set MapState**

Replace the `handleFeatureSelection` method:

```swift
private func handleFeatureSelection(_ feature: MLNFeature) {
    guard let identifier = feature.identifier as? String,
          let uuid = UUID(uuidString: identifier) else {
        mapState.clearSelection()
        return
    }

    // Determine feature type by layer
    // This is simplified - actual implementation needs to track which layer the feature came from

    // Try to find matching segment
    for album in mapState.activeAlbums {
        if let segment = albumLoader.segments(for: album).first(where: { $0.id == uuid }) {
            mapState.select(segment: segment)
            return
        }
        if let area = albumLoader.areas(for: album).first(where: { $0.id == uuid }) {
            mapState.select(area: area)
            return
        }
        if let poi = albumLoader.pois(for: album).first(where: { $0.id == uuid }) {
            mapState.select(poi: poi)
            return
        }
    }

    mapState.clearSelection()
}
```

**Step 2: Update handleTap to query correct layers**

```swift
@objc func handleTap(_ gesture: UITapGestureRecognizer) {
    guard let mapView = gesture.view as? MLNMapView else { return }
    let point = gesture.location(in: mapView)

    // Query features at tap point with tolerance for lines
    let rect = CGRect(x: point.x - 22, y: point.y - 22, width: 44, height: 44)
    let features = mapView.visibleFeatures(in: rect, styleLayerIdentifiers: ["overlay-segments", "overlay-areas-fill"])

    if let feature = features.first {
        handleFeatureSelection(feature)
    } else {
        mapState.clearSelection()
    }
}
```

**Step 3: Verify build**

Run: `xcodebuild -project MapSF.xcodeproj -scheme MapSF -destination 'platform=iOS Simulator,name=iPhone 16' build -quiet`

Expected: BUILD SUCCEEDED

**Step 4: Commit**

```bash
git add MapSF/Views/MapLibreMapView.swift
git commit -m "feat: implement tap-to-select for segments and areas"
```

---

## Task 10: Visual Polish and Selection Styling

**Files:**
- Modify: `MapSF/Views/MapLibreMapView.swift`

**Step 1: Add selection state to overlay rendering**

Update `updateOverlays` to handle selection styling:

```swift
func updateOverlays(on mapView: MLNMapView, mapState: MapState) {
    self.mapState = mapState

    guard let style = mapView.style else { return }

    // Update segment selection styling
    if let segmentsLayer = style.layer(withIdentifier: "overlay-segments") as? MLNLineStyleLayer {
        let selectedId = mapState.selectedSegment?.id.uuidString
        if let selectedId = selectedId {
            // Highlight selected, dim others
            segmentsLayer.lineWidth = NSExpression(format: "TERNARY(identifier == %@, 6, 4)", selectedId)
            segmentsLayer.lineOpacity = NSExpression(format: "TERNARY(identifier == %@, 1.0, 0.3)", selectedId)
        } else if mapState.hasSelection {
            // Something else selected, dim all segments
            segmentsLayer.lineOpacity = NSExpression(forConstantValue: 0.3)
            segmentsLayer.lineWidth = NSExpression(forConstantValue: 4)
        } else {
            // Nothing selected, full opacity
            segmentsLayer.lineOpacity = NSExpression(forConstantValue: 1.0)
            segmentsLayer.lineWidth = NSExpression(forConstantValue: 4)
        }
    }

    // Similar for areas
    if let areasFillLayer = style.layer(withIdentifier: "overlay-areas-fill") as? MLNFillStyleLayer {
        let selectedId = mapState.selectedArea?.id.uuidString
        if let selectedId = selectedId {
            areasFillLayer.fillOpacity = NSExpression(format: "TERNARY(identifier == %@, 0.3, 0.1)", selectedId)
        } else if mapState.hasSelection {
            areasFillLayer.fillOpacity = NSExpression(forConstantValue: 0.1)
        } else {
            areasFillLayer.fillOpacity = NSExpression(forConstantValue: 0.2)
        }
    }

    // Update data
    for (index, album) in mapState.activeAlbums.enumerated() {
        let color = UIColor(mapState.color(for: index))

        let segments = albumLoader.segments(for: album)
        updateSegments(segments, color: color, on: mapView)

        let areas = albumLoader.areas(for: album)
        updateAreas(areas, on: mapView)

        let pois = albumLoader.pois(for: album)
        updatePOIs(pois, color: color, on: mapView)
    }
}
```

**Step 2: Verify build**

Run: `xcodebuild -project MapSF.xcodeproj -scheme MapSF -destination 'platform=iOS Simulator,name=iPhone 16' build -quiet`

Expected: BUILD SUCCEEDED

**Step 3: Commit**

```bash
git add MapSF/Views/MapLibreMapView.swift
git commit -m "feat: add selection styling for overlays"
```

---

## Task 11: Manual Testing

**Step 1: Run app in simulator**

Run: `open MapSF.xcodeproj` then Cmd+R to run

**Step 2: Test checklist**

- [ ] App launches without crash
- [ ] Base map displays with muted styling
- [ ] Tiles load from local bundle (check network activity - should be none)
- [ ] Album overlays (segments, areas, POIs) render
- [ ] Tap on segment selects it
- [ ] Tap on area selects it
- [ ] Tap on POI selects it
- [ ] Tap on empty space clears selection
- [ ] Selected items highlight, others dim
- [ ] Pan and zoom work smoothly
- [ ] Zoom limits enforced (can't zoom past z16 or below z10)

**Step 3: Fix any issues discovered**

Address any bugs found during testing before proceeding.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```

---

## Task 12: Cleanup and Final Commit

**Files:**
- Review: All modified files

**Step 1: Remove any unused imports**

Check `MapExplorerView.swift` for unused MapKit types.

**Step 2: Remove debug code**

Remove any print statements or debug helpers added during development.

**Step 3: Final build verification**

Run: `xcodebuild -project MapSF.xcodeproj -scheme MapSF -destination 'platform=iOS Simulator,name=iPhone 16' build -quiet`

Expected: BUILD SUCCEEDED with no warnings

**Step 4: Commit cleanup**

```bash
git add -A
git commit -m "chore: cleanup unused code and imports"
```

---

## Summary

After completing all tasks:

**New files:**
- `MapSF/Services/PMTilesSource.swift`
- `MapSF/Resources/BaseMap/style.json`
- `MapSF/Views/MapLibreMapView.swift`

**Modified files:**
- `MapSF.xcodeproj/project.pbxproj` (MapLibre dependency)
- `MapSF/Views/MapExplorerView.swift` (simplified, uses MapLibreMapView)

**Removed code:**
- Custom area tap hit-testing (replaced by MapLibre's queryRenderedFeatures)
- MapKit-specific camera/zoom management (replaced by MapLibre equivalents)
