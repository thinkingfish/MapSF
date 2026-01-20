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
