import SwiftUI
import MapKit

struct MapExplorerView: View {
    let initialAlbum: Album

    @Environment(AlbumLoader.self) private var albumLoader
    @Environment(MapState.self) private var mapState

    @State private var cameraPosition: MapCameraPosition = .region(MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
        span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
    ))
    @State private var showLayerPicker = false
    @State private var showQuerySheet = false

    // All POIs from active albums
    private var allPOIs: [POIData] {
        mapState.activeAlbums.flatMap { albumLoader.pois(for: $0) }
    }

    // Filtered POIs based on query
    private var filteredPOIs: (inside: [POIData], outside: [POIData]) {
        guard let origin = mapState.queryOrigin else {
            return (allPOIs, [])
        }

        let radius = mapState.queryRadius.rawValue
        let categories = mapState.selectedCategories

        switch origin {
        case .userLocation:
            // Default to SF center if no user location
            let center = CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194)
            return ProximityQuery.pois(allPOIs, near: center, radius: radius, categories: categories)

        case .droppedPin(let coord):
            return ProximityQuery.pois(allPOIs, near: coord, radius: radius, categories: categories)

        case .segment(let segment):
            return ProximityQuery.pois(allPOIs, near: segment.coordinates, radius: radius, categories: categories)
        }
    }

    var body: some View {
        Map(position: $cameraPosition) {
            ForEach(Array(mapState.activeAlbums.enumerated()), id: \.element.id) { albumIndex, album in
                let color = mapState.color(for: albumIndex)

                // Segments
                ForEach(albumLoader.segments(for: album)) { segment in
                    MapPolyline(coordinates: segment.coordinates)
                        .stroke(color, lineWidth: 4)
                }

                // Areas
                ForEach(albumLoader.areas(for: album)) { area in
                    MapPolygon(coordinates: area.boundary)
                        .foregroundStyle(color.opacity(0.2))
                        .stroke(color, lineWidth: 2)
                }
            }

            // POIs - rendered with query filtering
            ForEach(Array(mapState.activeAlbums.enumerated()), id: \.element.id) { albumIndex, album in
                let color = mapState.color(for: albumIndex)
                let albumPOIs = albumLoader.pois(for: album)

                ForEach(albumPOIs) { poi in
                    let isInside = filteredPOIs.inside.contains { $0.id == poi.id }
                    let isOutside = filteredPOIs.outside.contains { $0.id == poi.id }

                    if isInside || (!mapState.isQueryActive) {
                        // Full opacity for inside or no query
                        Annotation(poi.name, coordinate: poi.coordinate) {
                            Button {
                                mapState.selectedPOI = poi
                            } label: {
                                Image(systemName: poi.categories.first?.icon ?? "mappin")
                                    .foregroundStyle(.white)
                                    .padding(6)
                                    .background(color)
                                    .clipShape(Circle())
                            }
                        }
                    } else if isOutside {
                        // Dimmed for outside query radius
                        Annotation(poi.name, coordinate: poi.coordinate) {
                            Button {
                                mapState.selectedPOI = poi
                            } label: {
                                Image(systemName: poi.categories.first?.icon ?? "mappin")
                                    .foregroundStyle(.white.opacity(0.5))
                                    .padding(6)
                                    .background(color.opacity(0.3))
                                    .clipShape(Circle())
                            }
                        }
                    }
                    // Hidden POIs (wrong category) are not rendered
                }
            }
        }
        .mapStyle(.standard)
        .mapControls {
            MapUserLocationButton()
            MapCompass()
            MapScaleView()
        }
        .onAppear {
            mapState.addAlbum(initialAlbum)
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
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showLayerPicker = true
                } label: {
                    Label("Add Layer", systemImage: "plus.square.on.square")
                }
            }
        }
        .sheet(isPresented: $showLayerPicker) {
            LayerPickerSheet()
                .presentationDetents([.medium])
        }
        .sheet(isPresented: $showQuerySheet) {
            QuerySheet()
                .presentationDetents([.medium])
        }
        .sheet(item: Binding(
            get: { mapState.selectedPOI },
            set: { mapState.selectedPOI = $0 }
        )) { poi in
            POIDetailSheet(poi: poi)
                .presentationDetents([.medium])
        }
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
            dataFile: "albums/sample-bookstores.geojson"
        ))
    }
    .environment(AlbumLoader())
    .environment(MapState())
}
