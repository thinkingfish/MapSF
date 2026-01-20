import SwiftUI
import MapLibre

struct MapExplorerView: View {
    let initialAlbum: Album

    @Environment(AlbumLoader.self) private var albumLoader
    @Environment(MapState.self) private var mapState
    @Environment(LocationManager.self) private var locationManager

    @State private var showQuerySheet = false

    // All POIs from active albums
    private var allPOIs: [POIData] {
        mapState.activeAlbums.flatMap { albumLoader.pois(for: $0) }
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
            mapContent
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

    private var mapContent: some View {
        MapLibreMapView()
            .id(initialAlbum.id) // Force recreation per album
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
