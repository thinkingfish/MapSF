import SwiftUI
import MapKit

struct MapExplorerView: View {
    let initialAlbum: Album

    @Environment(AlbumLoader.self) private var albumLoader
    @Environment(MapState.self) private var mapState
    @Environment(LocationManager.self) private var locationManager

    // Map defaults
    private static let defaultCenter = CLLocationCoordinate2D(latitude: 37.7610, longitude: -122.4410)
    private static let defaultSpan = MKCoordinateSpan(latitudeDelta: 0.161, longitudeDelta: 0.161)

    @State private var cameraPosition: MapCameraPosition = .region(MKCoordinateRegion(
        center: defaultCenter,
        span: defaultSpan
    ))
    @State private var currentRegion = MKCoordinateRegion(center: defaultCenter, span: defaultSpan)
    @State private var showQuerySheet = false
    @State private var mapStyle: MapStyleOption = .standard
    @State private var lastScale: CGFloat = 1.0  // For pinch zoom gesture

    enum MapStyleOption: String, CaseIterable {
        case standard = "Explore"
        case transit = "Transit"

        var icon: String {
            switch self {
            case .standard: return "map"
            case .transit: return "tram"
            }
        }

        var style: MapStyle {
            switch self {
            case .standard: return .standard
            case .transit: return .standard(pointsOfInterest: .including([.publicTransport]), showsTraffic: true)
            }
        }
    }

    // All POIs from active albums
    private var allPOIs: [POIData] {
        mapState.activeAlbums.flatMap { albumLoader.pois(for: $0) }
    }

    // Zoom scale factor: larger when zoomed in (smaller span), clamped 0.5-2.5
    // Uses square root for gradual scaling - need 4x zoom to double line width
    private var zoomScale: CGFloat {
        let defaultSpan = Self.defaultSpan.latitudeDelta
        let currentSpan = currentRegion.span.latitudeDelta
        let rawScale = defaultSpan / currentSpan
        let scale = pow(rawScale, 0.5)  // Square root for more gradual scaling
        return CGFloat(scale.clamped(to: 0.5...2.5))
    }

    // Set of POI IDs that pass the query filter (for O(1) lookup)
    private var insidePOIIds: Set<UUID> {
        guard let origin = mapState.queryOrigin else {
            return Set(allPOIs.map(\.id))
        }

        let radius = mapState.queryRadius.rawValue
        let categories = mapState.selectedCategories

        let result: (inside: [POIData], outside: [POIData])
        switch origin {
        case .userLocation:
            let center = CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194)
            result = ProximityQuery.pois(allPOIs, near: center, radius: radius, categories: categories)
        case .droppedPin(let coord):
            result = ProximityQuery.pois(allPOIs, near: coord, radius: radius, categories: categories)
        case .segment(let segment):
            result = ProximityQuery.pois(allPOIs, near: segment.coordinates, radius: radius, categories: categories)
        }
        return Set(result.inside.map(\.id))
    }

    var body: some View {
        VStack(spacing: 0) {
            // Map with fixed aspect ratio (height = 1.1 × screen width)
            ZStack(alignment: .trailing) {
                mapContent

                // Floating map control buttons - positioned 25% down from top
                VStack(spacing: 12) {
                    // Map style picker
                    Menu {
                        ForEach(MapStyleOption.allCases, id: \.self) { option in
                            Button {
                                mapStyle = option
                            } label: {
                                Label(option.rawValue, systemImage: option.icon)
                            }
                        }
                    } label: {
                        Image(systemName: mapStyle.icon)
                            .font(.system(size: 18))
                            .frame(width: 44, height: 44)
                            .background(.regularMaterial)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
                .padding(.trailing, 12)
                .padding(.top, UIScreen.main.bounds.width * 0.25)
                .frame(maxHeight: .infinity, alignment: .top)
            }
            .frame(height: UIScreen.main.bounds.width * 1.1)

            // Bottom info panel fills remaining space
            CurationInfoPanel()
        }
        .ignoresSafeArea(edges: .bottom)
        .onAppear {
            mapState.setAlbum(initialAlbum)
        }
        .onDisappear {
            // Clear state and evict cache to release memory
            let albumId = initialAlbum.id
            mapState.clearAll()
            albumLoader.evictCache(for: albumId)
        }
        .navigationTitle(initialAlbum.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    showQuerySheet = true
                } label: {
                    Label("Query", systemImage: mapState.isQueryActive ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
                }
            }
        }
        .sheet(isPresented: $showQuerySheet) {
            QuerySheet()
                .presentationDetents([.medium])
        }
    }

    // MARK: - Map Content

    // Limit zoom to reduce tile memory usage
    private static let cameraBounds = MapCameraBounds(
        minimumDistance: 500,    // Can't zoom closer than 500m altitude
        maximumDistance: 50000   // 50km - see Bay Area
    )

    private var mapContent: some View {
        Map(position: $cameraPosition, bounds: Self.cameraBounds, interactionModes: [.pan, .rotate]) {
            ForEach(Array(mapState.activeAlbums.enumerated()), id: \.element.id) { albumIndex, album in
                let color = mapState.color(for: albumIndex)

                // Segments - line width scales with zoom
                let lineWidth = 4 * zoomScale
                ForEach(albumLoader.segments(for: album)) { segment in
                    let isSelected = mapState.selectedSegment?.id == segment.id
                    let dimmed = mapState.hasSelection && !isSelected
                    MapPolyline(coordinates: segment.coordinates)
                        .stroke(color.opacity(dimmed ? 0.3 : 1.0), lineWidth: isSelected ? lineWidth * 1.5 : lineWidth)
                }

                // Areas - use amber/orange for visibility
                let areaColor = MapState.areaColor
                ForEach(albumLoader.areas(for: album)) { area in
                    let isSelected = mapState.selectedArea?.id == area.id
                    let dimmed = mapState.hasSelection && !isSelected
                    MapPolygon(coordinates: area.boundary)
                        .foregroundStyle(areaColor.opacity(dimmed ? 0.1 : 0.2))
                        .stroke(areaColor.opacity(dimmed ? 0.3 : 1.0), lineWidth: isSelected ? 3 : 2)

                    // Tappable annotation at centroid
                    Annotation("", coordinate: area.centroid) {
                        Button {
                            if isSelected {
                                mapState.clearSelection()
                            } else {
                                mapState.select(area: area)
                            }
                        } label: {
                            // Large invisible tap target
                            Color.clear
                                .frame(width: 60, height: 60)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            // POIs - rendered with query filtering
            // Non-selected POIs first, then selected POI last (renders on top)
            let insideIds = insidePOIIds
            let selectedId = mapState.selectedPOI?.id
            let queryActive = mapState.isQueryActive
            let hasSelection = mapState.hasSelection

            // First pass: non-selected POIs
            let poiLineWidth = 4 * zoomScale
            ForEach(Array(mapState.activeAlbums.enumerated()), id: \.element.id) { albumIndex, album in
                let color = mapState.color(for: albumIndex)

                ForEach(albumLoader.pois(for: album)) { poi in
                    if poi.id != selectedId {
                        let isInside = insideIds.contains(poi.id)
                        let isStreetcarStop = poi.categories.contains(.streetcarStop)
                        // Streetcar stops are never dimmed by selection
                        let shouldDim = (queryActive && !isInside) || (hasSelection && !isStreetcarStop)

                        Annotation("", coordinate: poi.coordinate) {
                            POIMarker(poi: poi, color: color, isSelected: false, dimmed: shouldDim, lineWidth: poiLineWidth) {
                                mapState.select(poi: poi)
                            }
                        }
                    }
                }
            }

            // Second pass: selected POI (renders on top)
            if let selectedPOI = mapState.selectedPOI {
                ForEach(Array(mapState.activeAlbums.enumerated()), id: \.element.id) { albumIndex, album in
                    let color = mapState.color(for: albumIndex)
                    let pois = albumLoader.pois(for: album)

                    if pois.contains(where: { $0.id == selectedPOI.id }) {
                        Annotation("", coordinate: selectedPOI.coordinate) {
                            POIMarker(poi: selectedPOI, color: color, isSelected: true, dimmed: false, lineWidth: poiLineWidth) {
                                mapState.select(poi: selectedPOI)
                            }
                        }
                    }
                }
            }
        }
        .mapStyle(mapStyle.style)
        .mapControls {
                MapCompass()
            MapScaleView()
        }
        .gesture(
            MagnificationGesture()
                .onChanged { scale in
                    // Pinch to zoom - adjust span based on gesture scale
                    let delta = scale / lastScale
                    lastScale = scale

                    // Smaller span = zoomed in, larger span = zoomed out
                    // Invert delta: pinch out (scale > 1) should zoom in (smaller span)
                    let newLatDelta = currentRegion.span.latitudeDelta / delta
                    let newLonDelta = currentRegion.span.longitudeDelta / delta

                    let newRegion = MKCoordinateRegion(
                        center: currentRegion.center,
                        span: MKCoordinateSpan(
                            latitudeDelta: newLatDelta.clamped(to: 0.005...0.5),
                            longitudeDelta: newLonDelta.clamped(to: 0.005...0.5)
                        )
                    )
                    currentRegion = newRegion
                    cameraPosition = .region(newRegion)
                }
                .onEnded { _ in
                    lastScale = 1.0
                }
        )
        .onTapGesture(count: 2) {
            // Double-tap restores initial view
            let defaultRegion = MKCoordinateRegion(center: Self.defaultCenter, span: Self.defaultSpan)
            currentRegion = defaultRegion
            withAnimation {
                cameraPosition = .region(defaultRegion)
            }
        }
        .onTapGesture(count: 1) {
            // Single tap on empty space clears selection
            mapState.clearSelection()
        }
        .onMapCameraChange(frequency: .onEnd) { context in
            // Keep currentRegion in sync with user panning (only on end to reduce churn)
            currentRegion = context.region
        }
        .id(initialAlbum.id) // Force Map recreation per album, releases old tile cache
    }
}

// MARK: - Helpers

private extension Double {
    func clamped(to range: ClosedRange<Double>) -> Double {
        min(max(self, range.lowerBound), range.upperBound)
    }
}

// MARK: - POI Marker

private struct POIMarker: View {
    let poi: POIData
    let color: Color
    let isSelected: Bool
    let dimmed: Bool
    let lineWidth: CGFloat  // For scaling streetcar stops to match route
    let onTap: () -> Void

    private var icon: String { poi.categories.first?.icon ?? "mappin" }
    private var isEmoji: Bool { !icon.contains(".") && icon.count <= 2 }
    private var isStreetcarStop: Bool { poi.categories.contains(.streetcarStop) }

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 4) {
                if isStreetcarStop {
                    // Streetcar stops: white circle with colored border, sized to match route
                    // 4pt line → 4pt/1pt, 6pt → 7pt/2pt, 8pt → 10pt/4pt
                    let circleSize = lineWidth * 1.5 - 2
                    let strokeWidth = lineWidth * lineWidth / 16
                    Circle()
                        .fill(.white)
                        .frame(width: isSelected ? circleSize * 1.5 : circleSize,
                               height: isSelected ? circleSize * 1.5 : circleSize)
                        .overlay {
                            Circle()
                                .stroke(dimmed ? color.opacity(0.3) : color,
                                        lineWidth: isSelected ? strokeWidth * 1.5 : strokeWidth)
                        }
                        .opacity(dimmed ? 0.5 : 1.0)
                } else if isEmoji {
                    Text(icon)
                        .font(.system(size: isSelected ? 32 : 22))
                        .opacity(dimmed ? 0.4 : 1.0)
                        .frame(minWidth: 44, minHeight: 44)
                        .contentShape(Rectangle())
                } else {
                    Image(systemName: icon)
                        .font(.system(size: isSelected ? 18 : 14))
                        .foregroundStyle(dimmed ? .white.opacity(0.5) : .white)
                        .padding(isSelected ? 8 : 6)
                        .background(dimmed ? color.opacity(0.3) : (isSelected ? color.opacity(0.8) : color))
                        .clipShape(Circle())
                        .overlay {
                            if isSelected {
                                Circle()
                                    .stroke(color, lineWidth: 3)
                            }
                        }
                }

                // Show name label when selected
                if isSelected {
                    Text(poi.name)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.primary)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    NavigationStack {
        MapExplorerView(initialAlbum: Album(
            id: "test",
            title: "Test",
            description: "",
            coverMap: "",
            coverImage: "",
            dataFile: "albums/sf-bookstores.geojson"
        ))
    }
    .environment(AlbumLoader())
    .environment(MapState())
    .environment(LocationManager())
}
