import SwiftUI
import MapLibre

struct MapLibreMapView: UIViewRepresentable {
    @Environment(MapState.self) private var mapState
    @Environment(AlbumLoader.self) private var albumLoader

    // Tile coverage bounds
    private static let sfBounds = MLNCoordinateBounds(
        sw: CLLocationCoordinate2D(latitude: 37.6896, longitude: -122.5525),
        ne: CLLocationCoordinate2D(latitude: 37.8662, longitude: -122.3438)
    )

    private static let defaultCenter = CLLocationCoordinate2D(latitude: 37.7648, longitude: -122.4378)
    private static let defaultZoom: Double = 10.7

    /// Create style URL with native mbtiles:// protocol
    private static func createStyleURL() -> URL? {
        // Find the mbtiles file
        guard let tilesURL = Bundle.main.url(forResource: "sf-tiles", withExtension: "mbtiles", subdirectory: "Resources/BaseMap")
                ?? Bundle.main.url(forResource: "sf-tiles", withExtension: "mbtiles", subdirectory: "BaseMap")
                ?? Bundle.main.url(forResource: "sf-tiles", withExtension: "mbtiles") else {
            print("[MapLibre] ERROR: Could not find sf-tiles.mbtiles")
            return nil
        }

        // Use native mbtiles:// protocol - MapLibre handles SQLite internally
        let tileURL = "mbtiles://\(tilesURL.path)"

        let styleJSON = """
        {
          "version": 8,
          "name": "MapSF Muted",
          "sources": {
            "protomaps": {
              "type": "vector",
              "tiles": ["\(tileURL)"],
              "minzoom": 10,
              "maxzoom": 15,
              "attribution": "© OpenStreetMap contributors"
            }
          },
          "glyphs": "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
          "layers": [
            {"id": "background", "type": "background", "paint": {"background-color": "#f0f0f0"}},
            {"id": "earth", "type": "fill", "source": "protomaps", "source-layer": "earth", "paint": {"fill-color": "#f0f0f0"}},
            {"id": "landuse-park", "type": "fill", "source": "protomaps", "source-layer": "landuse", "filter": ["==", "kind", "park"], "paint": {"fill-color": "#e0e8e0"}},
            {"id": "water", "type": "fill", "source": "protomaps", "source-layer": "water", "paint": {"fill-color": "#d4e4ec"}},
            {"id": "buildings", "type": "fill", "source": "protomaps", "source-layer": "buildings", "paint": {"fill-color": "#e8e8e8"}},
            {"id": "roads-minor", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["in", "kind", "minor_road", "other", "path"], "paint": {"line-color": "#fafafa", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.3, 14, 0.8, 16, 1.5]}},
            {"id": "roads-major-casing", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["in", "kind", "highway", "major_road"], "paint": {"line-color": "#e8e8e8", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 14, 4, 16, 8]}},
            {"id": "roads-major", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["in", "kind", "highway", "major_road"], "paint": {"line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 14, 2.5, 16, 5]}}
          ]
        }
        """

        // Write style JSON to temp file for MapLibre to load
        let tempDir = FileManager.default.temporaryDirectory
        let styleFile = tempDir.appendingPathComponent("mapstyle.json")

        do {
            try styleJSON.write(to: styleFile, atomically: true, encoding: .utf8)
            return styleFile
        } catch {
            print("[MapLibre] ERROR writing style: \(error)")
            return nil
        }
    }

    func makeUIView(context: Context) -> MLNMapView {
        let mapView = MLNMapView(frame: .zero)
        mapView.delegate = context.coordinator

        // Load style with tile server URL
        if let styleURL = Self.createStyleURL() {
            mapView.styleURL = styleURL
        } else {
            print("[MapLibre] ERROR: Could not create style!")
        }

        // Set initial camera
        mapView.setCenter(Self.defaultCenter, zoomLevel: Self.defaultZoom, animated: false)

        // Zoom limits (z10.7-16, matches default view)
        mapView.minimumZoomLevel = 10.7
        mapView.maximumZoomLevel = 16

        // Constrain panning/zooming to tile coverage area
        mapView.maximumScreenBounds = Self.sfBounds

        // UI settings
        mapView.compassView.isHidden = false
        mapView.showsScale = true
        mapView.showsUserLocation = false

        // Add tap gesture for feature selection
        let tapGesture = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        mapView.addGestureRecognizer(tapGesture)

        // Debug label for zoom/coordinates
        #if DEBUG
        let debugLabel = UILabel()
        debugLabel.tag = 999
        debugLabel.font = .monospacedSystemFont(ofSize: 11, weight: .medium)
        debugLabel.textColor = .darkGray
        debugLabel.backgroundColor = UIColor.white.withAlphaComponent(0.8)
        debugLabel.layer.cornerRadius = 4
        debugLabel.clipsToBounds = true
        debugLabel.textAlignment = .center
        debugLabel.translatesAutoresizingMaskIntoConstraints = false
        mapView.addSubview(debugLabel)
        NSLayoutConstraint.activate([
            debugLabel.topAnchor.constraint(equalTo: mapView.safeAreaLayoutGuide.topAnchor, constant: 8),
            debugLabel.centerXAnchor.constraint(equalTo: mapView.centerXAnchor)
        ])
        context.coordinator.updateDebugLabel(mapView)
        #endif

        return mapView
    }

    func updateUIView(_ mapView: MLNMapView, context: Context) {
        context.coordinator.updateOverlays(on: mapView, mapState: mapState)
    }

    static func dismantleUIView(_ mapView: MLNMapView, coordinator: Coordinator) {
        coordinator.cleanup(mapView: mapView)
        // Remove gesture recognizers to break retain cycle with coordinator
        mapView.gestureRecognizers?.forEach { gesture in
            if gesture is UITapGestureRecognizer {
                mapView.removeGestureRecognizer(gesture)
            }
        }
        mapView.delegate = nil
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(mapState: mapState, albumLoader: albumLoader)
    }

    /// Custom annotation that stores POI data for icon lookup
    class POIAnnotation: MLNPointAnnotation {
        var poi: POIData?
        var color: UIColor = .systemPink
    }

    class Coordinator: NSObject, MLNMapViewDelegate {
        private var mapState: MapState
        private var albumLoader: AlbumLoader
        private var overlaySourcesAdded = false
        private var poiAnnotations: [POIAnnotation] = []

        // Track last state to avoid redundant updates
        private var lastActiveAlbumIds: Set<String> = []
        private var lastSelectedSegmentId: UUID?
        private var lastSelectedAreaId: UUID?
        private var lastSelectedPOIId: UUID?

        init(mapState: MapState, albumLoader: AlbumLoader) {
            self.mapState = mapState
            self.albumLoader = albumLoader
        }

        func cleanup(mapView: MLNMapView) {
            // Remove all annotations to break retain cycles
            if !poiAnnotations.isEmpty {
                mapView.removeAnnotations(poiAnnotations)
                poiAnnotations.removeAll()
            }
            overlaySourcesAdded = false
        }

        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            guard let mapView = gesture.view as? MLNMapView else { return }
            let point = gesture.location(in: mapView)

            // Check if tap hit a POI annotation
            for annotation in poiAnnotations {
                if let view = mapView.view(for: annotation) {
                    let viewPoint = gesture.location(in: view)
                    if view.bounds.contains(viewPoint) {
                        if let poi = annotation.poi {
                            // Toggle: deselect if already selected
                            if mapState.selectedPOI?.id == poi.id {
                                mapState.clearSelection()
                            } else {
                                mapState.select(poi: poi)
                            }
                            refreshOverlaysAfterSelection(on: mapView)
                        }
                        return
                    }
                }
            }

            // Query features at tap point with tolerance for lines
            let rect = CGRect(x: point.x - 22, y: point.y - 22, width: 44, height: 44)
            let features = mapView.visibleFeatures(in: rect, styleLayerIdentifiers: ["overlay-segments", "overlay-areas-fill"])

            if let feature = features.first {
                handleFeatureSelection(feature, mapView: mapView)
            } else {
                mapState.clearSelection()
                refreshOverlaysAfterSelection(on: mapView)
            }
        }

        private func handleFeatureSelection(_ feature: MLNFeature, mapView: MLNMapView) {
            guard let identifier = feature.identifier as? String,
                  let uuid = UUID(uuidString: identifier) else {
                mapState.clearSelection()
                refreshOverlaysAfterSelection(on: mapView)
                return
            }

            // Try to find matching segment, area, or poi
            for album in mapState.activeAlbums {
                if let segment = albumLoader.segments(for: album).first(where: { $0.id == uuid }) {
                    mapState.select(segment: segment)
                    refreshOverlaysAfterSelection(on: mapView)
                    return
                }
                if let area = albumLoader.areas(for: album).first(where: { $0.id == uuid }) {
                    mapState.select(area: area)
                    refreshOverlaysAfterSelection(on: mapView)
                    return
                }
                if let poi = albumLoader.pois(for: album).first(where: { $0.id == uuid }) {
                    mapState.select(poi: poi)
                    refreshOverlaysAfterSelection(on: mapView)
                    return
                }
            }

            mapState.clearSelection()
            refreshOverlaysAfterSelection(on: mapView)
        }

        private func refreshOverlaysAfterSelection(on mapView: MLNMapView) {
            // Refresh POI annotations to update opacity
            guard !poiAnnotations.isEmpty else { return }
            mapView.removeAnnotations(poiAnnotations)
            mapView.addAnnotations(poiAnnotations)
        }

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
            areasFillLayer.fillColor = NSExpression(forConstantValue: UIColor(red: 34/255, green: 120/255, blue: 60/255, alpha: 0.15))
            style.addLayer(areasFillLayer)

            let areasStrokeLayer = MLNLineStyleLayer(identifier: "overlay-areas-stroke", source: areasSource)
            areasStrokeLayer.lineWidth = NSExpression(forConstantValue: 2)
            areasStrokeLayer.lineColor = NSExpression(forConstantValue: UIColor(red: 34/255, green: 120/255, blue: 60/255, alpha: 1.0))
            style.addLayer(areasStrokeLayer)

            overlaySourcesAdded = true
        }

        func updateSegments(_ segments: [SegmentData], color: UIColor, on mapView: MLNMapView) {
            guard let style = mapView.style,
                  let source = style.source(withIdentifier: "segments-source") as? MLNShapeSource else { return }

            let features = segments.map { segment -> MLNPolylineFeature in
                var coords = segment.coordinates
                let feature = MLNPolylineFeature(coordinates: &coords, count: UInt(coords.count))
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
                var coords = area.boundary
                let feature = MLNPolygonFeature(coordinates: &coords, count: UInt(coords.count))
                feature.identifier = area.id.uuidString
                feature.attributes = ["name": area.name]
                return feature
            }

            source.shape = MLNShapeCollectionFeature(shapes: features)
        }

        func updateOverlays(on mapView: MLNMapView, mapState: MapState) {
            self.mapState = mapState

            guard let style = mapView.style else { return }

            let currentAlbumIds = Set(mapState.activeAlbums.map { $0.id })
            let currentSegmentId = mapState.selectedSegment?.id
            let currentAreaId = mapState.selectedArea?.id
            let currentPOIId = mapState.selectedPOI?.id

            // Only update selection styling if selection changed
            let selectionChanged = currentSegmentId != lastSelectedSegmentId ||
                                   currentAreaId != lastSelectedAreaId ||
                                   currentPOIId != lastSelectedPOIId

            if selectionChanged {
                // Update POI annotation opacity
                updatePOIOpacity(on: mapView, selectedPOIId: currentPOIId, hasSelection: mapState.hasSelection)

                lastSelectedSegmentId = currentSegmentId
                lastSelectedAreaId = currentAreaId
                lastSelectedPOIId = currentPOIId
            }

            // Only update data if albums changed
            if currentAlbumIds != lastActiveAlbumIds {
                for (index, album) in mapState.activeAlbums.enumerated() {
                    let color = UIColor(mapState.color(for: index))

                    let segments = albumLoader.segments(for: album)
                    updateSegments(segments, color: color, on: mapView)

                    let areas = albumLoader.areas(for: album)
                    updateAreas(areas, on: mapView)

                    let pois = albumLoader.pois(for: album)
                    updatePOIs(pois, color: color, on: mapView)
                }

                lastActiveAlbumIds = currentAlbumIds
            }
        }

        func updatePOIs(_ pois: [POIData], color: UIColor, on mapView: MLNMapView) {
            // Remove existing annotations
            if !poiAnnotations.isEmpty {
                mapView.removeAnnotations(poiAnnotations)
                poiAnnotations.removeAll()
            }

            // Add new annotations
            for poi in pois {
                let annotation = POIAnnotation()
                annotation.coordinate = poi.coordinate
                annotation.title = poi.name
                annotation.subtitle = poi.categories.first?.displayName
                annotation.poi = poi
                annotation.color = color
                poiAnnotations.append(annotation)
            }

            mapView.addAnnotations(poiAnnotations)
        }

        func updatePOIOpacity(on mapView: MLNMapView, selectedPOIId: UUID?, hasSelection: Bool) {
            // Force MapLibre to recreate annotation views by removing and re-adding
            // This ensures the alpha is applied via mapView(_:viewFor:)
            guard !poiAnnotations.isEmpty else { return }
            mapView.removeAnnotations(poiAnnotations)
            mapView.addAnnotations(poiAnnotations)
        }

        func mapView(_ mapView: MLNMapView, viewFor annotation: MLNAnnotation) -> MLNAnnotationView? {
            guard let poiAnnotation = annotation as? POIAnnotation,
                  let poi = poiAnnotation.poi else { return nil }

            let icon = poi.categories.first?.icon ?? "📍"
            let isEmoji = icon.unicodeScalars.first?.properties.isEmoji == true && icon.count <= 2
            let isCircle = icon == "circle.fill"

            let reuseIdentifier: String
            if isCircle {
                reuseIdentifier = "poi-circle"
            } else if isEmoji {
                reuseIdentifier = "poi-emoji"
            } else {
                reuseIdentifier = "poi-symbol"
            }

            var annotationView = mapView.dequeueReusableAnnotationView(withIdentifier: reuseIdentifier)

            if annotationView == nil {
                annotationView = MLNAnnotationView(reuseIdentifier: reuseIdentifier)
                annotationView?.isEnabled = true

                if isCircle {
                    // Circle markers: slightly larger than line width (4pt line → 8pt circle)
                    annotationView?.frame = CGRect(x: 0, y: 0, width: 12, height: 12)
                    let imageView = UIImageView(frame: CGRect(x: 0, y: 0, width: 12, height: 12))
                    imageView.tag = 100
                    imageView.contentMode = .center
                    imageView.tintColor = .systemPink
                    annotationView?.addSubview(imageView)
                } else if isEmoji {
                    annotationView?.frame = CGRect(x: 0, y: 0, width: 36, height: 36)
                    let label = UILabel(frame: CGRect(x: 0, y: 0, width: 36, height: 36))
                    label.tag = 100
                    label.font = .systemFont(ofSize: 28)
                    label.textAlignment = .center
                    annotationView?.addSubview(label)
                } else {
                    annotationView?.frame = CGRect(x: 0, y: 0, width: 36, height: 36)
                    let imageView = UIImageView(frame: CGRect(x: 0, y: 0, width: 36, height: 36))
                    imageView.tag = 100
                    imageView.contentMode = .center
                    imageView.tintColor = .systemPink
                    annotationView?.addSubview(imageView)
                }
            }

            // Update content without recreating views
            if isCircle {
                if let imageView = annotationView?.viewWithTag(100) as? UIImageView {
                    let config = UIImage.SymbolConfiguration(pointSize: 8, weight: .bold)
                    let image = UIImage(systemName: icon, withConfiguration: config)?
                        .withTintColor(poiAnnotation.color, renderingMode: .alwaysOriginal)
                    imageView.image = image
                }
            } else if isEmoji {
                if let label = annotationView?.viewWithTag(100) as? UILabel {
                    label.text = icon
                }
            } else {
                if let imageView = annotationView?.viewWithTag(100) as? UIImageView {
                    let config = UIImage.SymbolConfiguration(pointSize: 24, weight: .medium)
                    let image = UIImage(systemName: icon, withConfiguration: config)?
                        .withTintColor(poiAnnotation.color, renderingMode: .alwaysOriginal)
                    imageView.image = image
                }
            }

            // Set alpha based on current selection state
            let isSelected = poi.id == mapState.selectedPOI?.id
            if isSelected {
                annotationView?.alpha = 1.0
            } else if mapState.hasSelection {
                annotationView?.alpha = 0.3
            } else {
                annotationView?.alpha = 1.0
            }

            return annotationView
        }

        func mapView(_ mapView: MLNMapView, didSelect annotation: MLNAnnotation) {
            guard let poiAnnotation = annotation as? POIAnnotation,
                  let poi = poiAnnotation.poi else { return }
            // Toggle: deselect if already selected
            if mapState.selectedPOI?.id == poi.id {
                mapState.clearSelection()
            } else {
                mapState.select(poi: poi)
            }
            mapView.deselectAnnotation(annotation, animated: false)
            refreshOverlaysAfterSelection(on: mapView)
        }

        // MARK: - MLNMapViewDelegate

        func mapView(_ mapView: MLNMapView, didFinishLoading style: MLNStyle) {
            addOverlayLayers(to: style)
            updateOverlays(on: mapView, mapState: mapState)
        }

        func mapViewDidFailLoadingMap(_ mapView: MLNMapView, withError error: Error) {
            print("[MapLibre] ERROR: \(error)")
        }

        func mapView(_ mapView: MLNMapView, regionDidChangeAnimated animated: Bool) {
            #if DEBUG
            updateDebugLabel(mapView)
            #endif
        }

        func updateDebugLabel(_ mapView: MLNMapView) {
            #if DEBUG
            guard let label = mapView.viewWithTag(999) as? UILabel else { return }
            let center = mapView.centerCoordinate
            let zoom = mapView.zoomLevel
            label.text = String(format: " z%.1f  (%.4f, %.4f) ", zoom, center.latitude, center.longitude)
            #endif
        }

    }
}

#Preview {
    MapLibreMapView()
        .environment(MapState())
        .environment(AlbumLoader())
}
