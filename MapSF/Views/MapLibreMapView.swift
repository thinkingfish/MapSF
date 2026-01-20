import SwiftUI
import MapLibre

struct MapLibreMapView: UIViewRepresentable {
    @Environment(MapState.self) private var mapState
    @Environment(AlbumLoader.self) private var albumLoader

    // SF bounds for camera constraints
    private static let sfBounds = MLNCoordinateBounds(
        sw: CLLocationCoordinate2D(latitude: 37.708, longitude: -122.5155),
        ne: CLLocationCoordinate2D(latitude: 37.8324, longitude: -122.357)
    )

    private static let defaultCenter = CLLocationCoordinate2D(latitude: 37.7610, longitude: -122.4410)
    private static let defaultZoom: Double = 12.0

    /// Create style URL with local HTTP server for tiles
    private static func createStyleURL() -> URL? {
        // Find the mbtiles file
        guard let tilesURL = Bundle.main.url(forResource: "sf-tiles", withExtension: "mbtiles", subdirectory: "Resources/BaseMap")
                ?? Bundle.main.url(forResource: "sf-tiles", withExtension: "mbtiles", subdirectory: "BaseMap")
                ?? Bundle.main.url(forResource: "sf-tiles", withExtension: "mbtiles") else {
            print("[MapLibre] ERROR: Could not find sf-tiles.mbtiles")
            return nil
        }

        let tilesPath = tilesURL.path

        // Start local tile server
        guard let serverURL = MBTilesServer.shared.start(mbtilesPath: tilesPath) else {
            print("[MapLibre] ERROR: Could not start tile server")
            return nil
        }

        // Build tile URL template using local HTTP server
        let tileURL = "\(serverURL)/{z}/{x}/{y}.pbf"

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
            {"id": "roads-minor", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["in", "kind", "minor_road", "other", "path"], "paint": {"line-color": "#fafafa", "line-width": 1}},
            {"id": "roads-major-casing", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["in", "kind", "highway", "major_road"], "paint": {"line-color": "#dedede", "line-width": 6}},
            {"id": "roads-major", "type": "line", "source": "protomaps", "source-layer": "roads", "filter": ["in", "kind", "highway", "major_road"], "paint": {"line-color": "#ffffff", "line-width": 4}}
          ]
        }
        """

        // Write style JSON to temp file (data URLs may not work reliably)
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
        Coordinator(mapState: mapState, albumLoader: albumLoader)
    }

    /// Custom annotation that stores POI data for icon lookup
    class POIAnnotation: MLNPointAnnotation {
        var poi: POIData?
    }

    class Coordinator: NSObject, MLNMapViewDelegate {
        private var mapState: MapState
        private var albumLoader: AlbumLoader
        private var overlaySourcesAdded = false
        private var poiAnnotations: [POIAnnotation] = []

        init(mapState: MapState, albumLoader: AlbumLoader) {
            self.mapState = mapState
            self.albumLoader = albumLoader
        }

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

        private func handleFeatureSelection(_ feature: MLNFeature) {
            guard let identifier = feature.identifier as? String,
                  let uuid = UUID(uuidString: identifier) else {
                mapState.clearSelection()
                return
            }

            // Try to find matching segment, area, or poi
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
                poiAnnotations.append(annotation)
            }

            mapView.addAnnotations(poiAnnotations)
        }

        func mapView(_ mapView: MLNMapView, viewFor annotation: MLNAnnotation) -> MLNAnnotationView? {
            guard let poiAnnotation = annotation as? POIAnnotation,
                  let poi = poiAnnotation.poi else { return nil }

            let reuseIdentifier = "poi-marker"
            var annotationView = mapView.dequeueReusableAnnotationView(withIdentifier: reuseIdentifier)

            if annotationView == nil {
                annotationView = MLNAnnotationView(reuseIdentifier: reuseIdentifier)
                annotationView?.frame = CGRect(x: 0, y: 0, width: 36, height: 36)
            }

            // Clear previous subviews
            annotationView?.subviews.forEach { $0.removeFromSuperview() }

            // Get icon from category
            let icon = poi.categories.first?.icon ?? "📍"

            // Create label for emoji or SF Symbol
            if icon.unicodeScalars.first?.properties.isEmoji == true && icon.count <= 2 {
                // It's an emoji - use UILabel
                let label = UILabel(frame: CGRect(x: 0, y: 0, width: 36, height: 36))
                label.text = icon
                label.font = .systemFont(ofSize: 28)
                label.textAlignment = .center
                annotationView?.addSubview(label)
            } else {
                // It's an SF Symbol - use UIImageView
                let config = UIImage.SymbolConfiguration(pointSize: 24, weight: .medium)
                if let image = UIImage(systemName: icon, withConfiguration: config) {
                    let imageView = UIImageView(image: image)
                    imageView.frame = CGRect(x: 0, y: 0, width: 36, height: 36)
                    imageView.contentMode = .center
                    imageView.tintColor = .systemPink
                    annotationView?.addSubview(imageView)
                }
            }

            return annotationView
        }

        func mapView(_ mapView: MLNMapView, didSelect annotation: MLNAnnotation) {
            // Selection handling placeholder
        }

        // MARK: - MLNMapViewDelegate

        func mapView(_ mapView: MLNMapView, didFinishLoading style: MLNStyle) {
            addOverlayLayers(to: style)
            updateOverlays(on: mapView, mapState: mapState)
        }

        func mapViewDidFailLoadingMap(_ mapView: MLNMapView, withError error: Error) {
            print("[MapLibre] ERROR: \(error)")
        }
    }
}

#Preview {
    MapLibreMapView()
        .environment(MapState())
        .environment(AlbumLoader())
}
