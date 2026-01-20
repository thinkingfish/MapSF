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
            // Overlay rendering will be implemented in Task 5
        }

        // MARK: - MLNMapViewDelegate

        func mapView(_ mapView: MLNMapView, didFinishLoading style: MLNStyle) {
            addOverlayLayers(to: style)
            updateOverlays(on: mapView, mapState: mapState)
        }
    }
}

#Preview {
    MapLibreMapView()
        .environment(MapState())
}
