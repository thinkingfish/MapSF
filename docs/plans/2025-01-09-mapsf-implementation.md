# MapSF Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a curated, layered map app for San Francisco with album-based overlays and proximity queries.

**Architecture:** SwiftUI app with NavigationStack, @Observable state management, MapKit for rendering. Data loaded from bundled JSON/GeoJSON files. No external dependencies.

**Tech Stack:** SwiftUI, MapKit, iOS 17+, Swift 5.9+

---

## Phase 1: Data Layer

### Task 1: Create POI Category Enum

**Files:**
- Create: `MapSF/Models/POICategory.swift`

**Step 1: Create the Models directory**

In Xcode, right-click on MapSF folder → New Group → name it "Models"

**Step 2: Create POICategory.swift with enum definition**

```swift
import SwiftUI

enum POICategory: String, CaseIterable, Codable {
    case bookstore
    case iceCream = "ice-cream"
    case burger
    case bathroom
    case coffee
    case bar
    case landmark

    var icon: String {
        switch self {
        case .bookstore: return "book.fill"
        case .iceCream: return "snowflake"
        case .burger: return "fork.knife"
        case .bathroom: return "toilet.fill"
        case .coffee: return "cup.and.saucer.fill"
        case .bar: return "wineglass.fill"
        case .landmark: return "star.fill"
        }
    }

    var displayName: String {
        switch self {
        case .bookstore: return "Bookstore"
        case .iceCream: return "Ice Cream"
        case .burger: return "Burger"
        case .bathroom: return "Bathroom"
        case .coffee: return "Coffee"
        case .bar: return "Bar"
        case .landmark: return "Landmark"
        }
    }
}
```

**Step 3: Build to verify no errors**

Run: Cmd+B in Xcode
Expected: Build Succeeded

**Step 4: Commit**

```bash
git add MapSF/Models/POICategory.swift
git commit -m "feat: add POICategory enum with icons and display names"
```

---

### Task 2: Create Core Data Models

**Files:**
- Create: `MapSF/Models/Album.swift`
- Create: `MapSF/Models/Feature.swift`
- Create: `MapSF/Models/POIData.swift`
- Create: `MapSF/Models/RouteData.swift`

**Step 1: Create Album.swift**

```swift
import Foundation

struct Album: Codable, Identifiable {
    let id: String
    let title: String
    let description: String
    let coverGraphic: String
    let coverImage: String
    let dataFile: String
    var features: [Feature]?
}

struct AlbumsContainer: Codable {
    let albums: [Album]
}
```

**Step 2: Create Feature.swift**

```swift
import Foundation
import CoreLocation

enum Feature {
    case route(RouteData)
    case poi(POIData)
}
```

**Step 3: Create RouteData.swift**

```swift
import Foundation
import CoreLocation

struct RouteData: Identifiable {
    let id: UUID
    let name: String
    let coordinates: [CLLocationCoordinate2D]

    init(id: UUID = UUID(), name: String, coordinates: [CLLocationCoordinate2D]) {
        self.id = id
        self.name = name
        self.coordinates = coordinates
    }
}
```

**Step 4: Create POIData.swift**

```swift
import Foundation
import CoreLocation

struct POIData: Identifiable {
    let id: UUID
    let name: String
    let coordinate: CLLocationCoordinate2D
    let categories: [POICategory]
    let metadata: [String: String]

    init(id: UUID = UUID(), name: String, coordinate: CLLocationCoordinate2D, categories: [POICategory] = [], metadata: [String: String] = [:]) {
        self.id = id
        self.name = name
        self.coordinate = coordinate
        self.categories = categories
        self.metadata = metadata
    }
}
```

**Step 5: Build to verify no errors**

Run: Cmd+B in Xcode
Expected: Build Succeeded

**Step 6: Commit**

```bash
git add MapSF/Models/
git commit -m "feat: add core data models (Album, Feature, POIData, RouteData)"
```

---

### Task 3: Create GeoJSON Parser

**Files:**
- Create: `MapSF/Services/GeoJSONParser.swift`

**Step 1: Create Services directory**

In Xcode, right-click on MapSF folder → New Group → name it "Services"

**Step 2: Create GeoJSONParser.swift**

```swift
import Foundation
import CoreLocation

struct GeoJSONParser {

    struct GeoJSONFeatureCollection: Codable {
        let type: String
        let features: [GeoJSONFeature]
    }

    struct GeoJSONFeature: Codable {
        let type: String
        let geometry: GeoJSONGeometry
        let properties: GeoJSONProperties
    }

    struct GeoJSONGeometry: Codable {
        let type: String
        let coordinates: AnyCodable // Can be [Double] for Point or [[Double]] for LineString
    }

    struct GeoJSONProperties: Codable {
        let name: String
        let layerType: String
        let category: CategoryValue?
        let metadata: [String: String]?

        enum CodingKeys: String, CodingKey {
            case name, layerType, category, metadata
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            name = try container.decode(String.self, forKey: .name)
            layerType = try container.decode(String.self, forKey: .layerType)
            category = try container.decodeIfPresent(CategoryValue.self, forKey: .category)
            metadata = try container.decodeIfPresent([String: String].self, forKey: .metadata)
        }
    }

    // Handles both single string and array of strings for category
    enum CategoryValue: Codable {
        case single(String)
        case multiple([String])

        init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            if let single = try? container.decode(String.self) {
                self = .single(single)
            } else if let multiple = try? container.decode([String].self) {
                self = .multiple(multiple)
            } else {
                throw DecodingError.typeMismatch(CategoryValue.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Expected String or [String]"))
            }
        }

        func encode(to encoder: Encoder) throws {
            var container = encoder.singleValueContainer()
            switch self {
            case .single(let value):
                try container.encode(value)
            case .multiple(let values):
                try container.encode(values)
            }
        }

        var strings: [String] {
            switch self {
            case .single(let s): return [s]
            case .multiple(let arr): return arr
            }
        }
    }

    static func parse(data: Data) throws -> [Feature] {
        let collection = try JSONDecoder().decode(GeoJSONFeatureCollection.self, from: data)
        return collection.features.compactMap { parseFeature($0) }
    }

    private static func parseFeature(_ feature: GeoJSONFeature) -> Feature? {
        switch feature.properties.layerType {
        case "route":
            guard let route = parseRoute(feature) else { return nil }
            return .route(route)
        case "poi":
            guard let poi = parsePOI(feature) else { return nil }
            return .poi(poi)
        default:
            return nil
        }
    }

    private static func parseRoute(_ feature: GeoJSONFeature) -> RouteData? {
        guard feature.geometry.type == "LineString",
              let coordsArray = feature.geometry.coordinates.value as? [[Double]] else {
            return nil
        }

        let coordinates = coordsArray.map { coord in
            CLLocationCoordinate2D(latitude: coord[1], longitude: coord[0]) // GeoJSON is [lng, lat]
        }

        return RouteData(name: feature.properties.name, coordinates: coordinates)
    }

    private static func parsePOI(_ feature: GeoJSONFeature) -> POIData? {
        guard feature.geometry.type == "Point",
              let coords = feature.geometry.coordinates.value as? [Double],
              coords.count >= 2 else {
            return nil
        }

        let coordinate = CLLocationCoordinate2D(latitude: coords[1], longitude: coords[0])

        let categories: [POICategory] = feature.properties.category?.strings.compactMap {
            POICategory(rawValue: $0)
        } ?? []

        return POIData(
            name: feature.properties.name,
            coordinate: coordinate,
            categories: categories,
            metadata: feature.properties.metadata ?? [:]
        )
    }
}

// Helper for decoding heterogeneous JSON arrays
struct AnyCodable: Codable {
    let value: Any

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let intValue = try? container.decode(Int.self) {
            value = intValue
        } else if let doubleValue = try? container.decode(Double.self) {
            value = doubleValue
        } else if let stringValue = try? container.decode(String.self) {
            value = stringValue
        } else if let arrayValue = try? container.decode([Double].self) {
            value = arrayValue
        } else if let nestedArray = try? container.decode([[Double]].self) {
            value = nestedArray
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unsupported type")
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        if let intValue = value as? Int {
            try container.encode(intValue)
        } else if let doubleValue = value as? Double {
            try container.encode(doubleValue)
        } else if let stringValue = value as? String {
            try container.encode(stringValue)
        } else if let arrayValue = value as? [Double] {
            try container.encode(arrayValue)
        } else if let nestedArray = value as? [[Double]] {
            try container.encode(nestedArray)
        }
    }
}
```

**Step 3: Build to verify no errors**

Run: Cmd+B in Xcode
Expected: Build Succeeded

**Step 4: Commit**

```bash
git add MapSF/Services/GeoJSONParser.swift
git commit -m "feat: add GeoJSON parser for routes and POIs"
```

---

### Task 4: Create Album Loader Service

**Files:**
- Create: `MapSF/Services/AlbumLoader.swift`

**Step 1: Create AlbumLoader.swift**

```swift
import Foundation

@Observable
class AlbumLoader {
    private(set) var albums: [Album] = []
    private var loadedFeatures: [String: [Feature]] = [:] // Cache by album id

    init() {
        loadAlbums()
    }

    private func loadAlbums() {
        guard let url = Bundle.main.url(forResource: "albums", withExtension: "json", subdirectory: "Data"),
              let data = try? Data(contentsOf: url),
              let container = try? JSONDecoder().decode(AlbumsContainer.self, from: data) else {
            print("Failed to load albums.json")
            return
        }
        albums = container.albums
    }

    func loadFeatures(for album: Album) -> [Feature] {
        if let cached = loadedFeatures[album.id] {
            return cached
        }

        guard let url = Bundle.main.url(forResource: album.dataFile, withExtension: nil, subdirectory: "Data"),
              let data = try? Data(contentsOf: url),
              let features = try? GeoJSONParser.parse(data: data) else {
            print("Failed to load features for album: \(album.id)")
            return []
        }

        loadedFeatures[album.id] = features
        return features
    }

    func routes(for album: Album) -> [RouteData] {
        loadFeatures(for: album).compactMap { feature in
            if case .route(let route) = feature { return route }
            return nil
        }
    }

    func pois(for album: Album) -> [POIData] {
        loadFeatures(for: album).compactMap { feature in
            if case .poi(let poi) = feature { return poi }
            return nil
        }
    }
}
```

**Step 2: Build to verify no errors**

Run: Cmd+B in Xcode
Expected: Build Succeeded

**Step 3: Commit**

```bash
git add MapSF/Services/AlbumLoader.swift
git commit -m "feat: add AlbumLoader service with caching"
```

---

### Task 5: Create Sample Data Files

**Files:**
- Create: `MapSF/Data/albums.json`
- Create: `MapSF/Data/albums/sample-bookstores.geojson`

**Step 1: Create Data directory structure**

In Xcode:
1. Right-click MapSF folder → New Group → "Data"
2. Right-click Data folder → New Group → "albums"

**Step 2: Create albums.json**

Right-click Data folder → New File → Empty → name it "albums.json"

```json
{
  "albums": [
    {
      "id": "sample-bookstores",
      "title": "Indie Bookstores",
      "description": "San Francisco's beloved independent bookshops",
      "coverGraphic": "bookstores-graphic",
      "coverImage": "bookstores-photo",
      "dataFile": "albums/sample-bookstores.geojson"
    }
  ]
}
```

**Step 3: Create sample-bookstores.geojson**

Right-click albums folder → New File → Empty → name it "sample-bookstores.geojson"

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-122.4634, 37.7851]
      },
      "properties": {
        "name": "Green Apple Books",
        "layerType": "poi",
        "category": "bookstore",
        "metadata": {
          "hours": "10am-10pm",
          "notes": "SF institution since 1967"
        }
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-122.4224, 37.7599]
      },
      "properties": {
        "name": "Dog Eared Books",
        "layerType": "poi",
        "category": "bookstore",
        "metadata": {
          "hours": "10am-8pm",
          "notes": "Castro neighborhood favorite"
        }
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-122.4194, 37.7749]
      },
      "properties": {
        "name": "City Lights",
        "layerType": "poi",
        "category": ["bookstore", "landmark"],
        "metadata": {
          "hours": "10am-midnight",
          "notes": "Beat Generation landmark"
        }
      }
    }
  ]
}
```

**Step 4: Ensure files are added to bundle**

In Xcode, select both files → File Inspector (right panel) → Target Membership → check "MapSF"

**Step 5: Build to verify files are accessible**

Run: Cmd+B in Xcode
Expected: Build Succeeded

**Step 6: Commit**

```bash
git add MapSF/Data/
git commit -m "feat: add sample data files (albums.json, bookstores geojson)"
```

---

## Phase 2: State Management

### Task 6: Create MapState Observable

**Files:**
- Create: `MapSF/State/MapState.swift`

**Step 1: Create State directory**

In Xcode, right-click on MapSF folder → New Group → name it "State"

**Step 2: Create MapState.swift**

```swift
import Foundation
import CoreLocation
import MapKit

@Observable
class MapState {
    var activeAlbums: [Album] = []
    var selectedPOI: POIData? = nil

    // Query state
    var queryOrigin: QueryOrigin? = nil
    var queryRadius: QueryRadius = .threeBlocks
    var selectedCategories: Set<POICategory> = Set(POICategory.allCases)

    // Computed: is a query active?
    var isQueryActive: Bool {
        queryOrigin != nil
    }

    enum QueryOrigin {
        case userLocation
        case droppedPin(CLLocationCoordinate2D)
        case route(RouteData)
    }

    enum QueryRadius: Double, CaseIterable {
        case oneBlock = 100
        case threeBlocks = 300
        case fiveBlocks = 500

        var displayName: String {
            switch self {
            case .oneBlock: return "1 block"
            case .threeBlocks: return "3 blocks"
            case .fiveBlocks: return "5 blocks"
            }
        }
    }

    // Color palette for blending
    static let palette: [PlatformColor] = [
        .systemPurple,
        .systemOrange,
        .systemTeal,
        .systemPink,
        .systemIndigo,
        .systemMint,
        .brown,
        .cyan
    ]

    func color(for albumIndex: Int) -> PlatformColor {
        Self.palette[albumIndex % Self.palette.count]
    }

    func addAlbum(_ album: Album) {
        guard !activeAlbums.contains(where: { $0.id == album.id }) else { return }
        activeAlbums.append(album)
    }

    func removeAlbum(_ album: Album) {
        activeAlbums.removeAll { $0.id == album.id }
    }

    func clearQuery() {
        queryOrigin = nil
    }

    func startQuery(from origin: QueryOrigin) {
        queryOrigin = origin
    }
}

#if canImport(UIKit)
import UIKit
typealias PlatformColor = UIColor
#else
import AppKit
typealias PlatformColor = NSColor
#endif
```

**Step 3: Build to verify no errors**

Run: Cmd+B in Xcode
Expected: Build Succeeded

**Step 4: Commit**

```bash
git add MapSF/State/MapState.swift
git commit -m "feat: add MapState observable with query support"
```

---

### Task 7: Create Proximity Query Service

**Files:**
- Create: `MapSF/Services/ProximityQuery.swift`

**Step 1: Create ProximityQuery.swift**

```swift
import Foundation
import CoreLocation
import MapKit

struct ProximityQuery {

    /// Filter POIs by distance from a point
    static func pois(
        _ allPOIs: [POIData],
        near point: CLLocationCoordinate2D,
        radius: CLLocationDistance,
        categories: Set<POICategory>
    ) -> (inside: [POIData], outside: [POIData]) {
        let filtered = filterByCategory(allPOIs, categories: categories)

        var inside: [POIData] = []
        var outside: [POIData] = []

        for poi in filtered {
            let distance = point.distance(to: poi.coordinate)
            if distance <= radius {
                inside.append(poi)
            } else {
                outside.append(poi)
            }
        }

        return (inside, outside)
    }

    /// Filter POIs by distance from a route
    static func pois(
        _ allPOIs: [POIData],
        near route: [CLLocationCoordinate2D],
        radius: CLLocationDistance,
        categories: Set<POICategory>
    ) -> (inside: [POIData], outside: [POIData]) {
        let filtered = filterByCategory(allPOIs, categories: categories)

        var inside: [POIData] = []
        var outside: [POIData] = []

        for poi in filtered {
            let distance = minDistance(from: poi.coordinate, to: route)
            if distance <= radius {
                inside.append(poi)
            } else {
                outside.append(poi)
            }
        }

        return (inside, outside)
    }

    /// Filter to only POIs with at least one matching category
    private static func filterByCategory(_ pois: [POIData], categories: Set<POICategory>) -> [POIData] {
        if categories.isEmpty {
            return pois.filter { !$0.categories.isEmpty }
        }
        return pois.filter { poi in
            !poi.categories.isEmpty && !poi.categories.filter { categories.contains($0) }.isEmpty
        }
    }

    /// Minimum distance from point to polyline (iterating segments)
    private static func minDistance(from point: CLLocationCoordinate2D, to route: [CLLocationCoordinate2D]) -> CLLocationDistance {
        guard route.count >= 2 else {
            return route.first.map { point.distance(to: $0) } ?? .infinity
        }

        var minDist = CLLocationDistance.infinity

        for i in 0..<(route.count - 1) {
            let segmentStart = route[i]
            let segmentEnd = route[i + 1]
            let dist = distanceToSegment(point: point, segmentStart: segmentStart, segmentEnd: segmentEnd)
            minDist = min(minDist, dist)
        }

        return minDist
    }

    /// Distance from point to line segment
    private static func distanceToSegment(
        point: CLLocationCoordinate2D,
        segmentStart: CLLocationCoordinate2D,
        segmentEnd: CLLocationCoordinate2D
    ) -> CLLocationDistance {
        let px = point.longitude
        let py = point.latitude
        let ax = segmentStart.longitude
        let ay = segmentStart.latitude
        let bx = segmentEnd.longitude
        let by = segmentEnd.latitude

        let dx = bx - ax
        let dy = by - ay

        let lengthSquared = dx * dx + dy * dy

        var t: Double = 0
        if lengthSquared > 0 {
            t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared))
        }

        let nearestX = ax + t * dx
        let nearestY = ay + t * dy
        let nearest = CLLocationCoordinate2D(latitude: nearestY, longitude: nearestX)

        return point.distance(to: nearest)
    }
}

extension CLLocationCoordinate2D {
    func distance(to other: CLLocationCoordinate2D) -> CLLocationDistance {
        let loc1 = CLLocation(latitude: latitude, longitude: longitude)
        let loc2 = CLLocation(latitude: other.latitude, longitude: other.longitude)
        return loc1.distance(from: loc2)
    }
}
```

**Step 2: Build to verify no errors**

Run: Cmd+B in Xcode
Expected: Build Succeeded

**Step 3: Commit**

```bash
git add MapSF/Services/ProximityQuery.swift
git commit -m "feat: add ProximityQuery service with point and route distance"
```

---

## Phase 3: Views - Gallery

### Task 8: Create Album Cover View

**Files:**
- Create: `MapSF/Views/AlbumCoverView.swift`

**Step 1: Create Views directory**

In Xcode, right-click on MapSF folder → New Group → name it "Views"

**Step 2: Create AlbumCoverView.swift**

```swift
import SwiftUI

struct AlbumCoverView: View {
    let album: Album
    let accentColor: Color

    var body: some View {
        HStack(spacing: 0) {
            // Left: Stylized map graphic placeholder
            Rectangle()
                .fill(accentColor.opacity(0.2))
                .overlay {
                    Image(systemName: "map")
                        .font(.title)
                        .foregroundStyle(accentColor)
                }

            // Right: Cover image placeholder
            Rectangle()
                .fill(accentColor.opacity(0.3))
                .overlay {
                    Image(systemName: "photo")
                        .font(.title)
                        .foregroundStyle(accentColor)
                }
        }
        .aspectRatio(2, contentMode: .fit)
        .overlay(alignment: .topLeading) {
            Text(album.title)
                .font(.headline)
                .fontWeight(.bold)
                .foregroundStyle(.white)
                .shadow(color: .black.opacity(0.7), radius: 2, x: 0, y: 1)
                .padding(8)
        }
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay {
            RoundedRectangle(cornerRadius: 12)
                .stroke(accentColor, lineWidth: 2)
        }
    }
}

#Preview {
    AlbumCoverView(
        album: Album(
            id: "test",
            title: "Indie Bookstores",
            description: "Test",
            coverGraphic: "",
            coverImage: "",
            dataFile: ""
        ),
        accentColor: .purple
    )
    .padding()
}
```

**Step 3: Build and preview**

Run: Cmd+B, then open preview canvas (Cmd+Option+Enter)
Expected: Build Succeeded, preview shows diptych layout

**Step 4: Commit**

```bash
git add MapSF/Views/AlbumCoverView.swift
git commit -m "feat: add AlbumCoverView with diptych layout"
```

---

### Task 9: Create Album Gallery View

**Files:**
- Create: `MapSF/Views/AlbumGalleryView.swift`
- Modify: `MapSF/ContentView.swift`
- Modify: `MapSF/MapSFApp.swift`

**Step 1: Create AlbumGalleryView.swift**

```swift
import SwiftUI

struct AlbumGalleryView: View {
    @Environment(AlbumLoader.self) private var albumLoader
    @Environment(MapState.self) private var mapState

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    ForEach(Array(albumLoader.albums.enumerated()), id: \.element.id) { index, album in
                        NavigationLink(value: album) {
                            AlbumCoverView(
                                album: album,
                                accentColor: Color(MapState.palette[index % MapState.palette.count])
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding()
            }
            .navigationTitle("MapSF")
            .navigationDestination(for: Album.self) { album in
                MapExplorerView(initialAlbum: album)
            }
        }
    }
}

#Preview {
    AlbumGalleryView()
        .environment(AlbumLoader())
        .environment(MapState())
}
```

**Step 2: Create placeholder MapExplorerView.swift**

```swift
import SwiftUI

struct MapExplorerView: View {
    let initialAlbum: Album

    var body: some View {
        Text("Map for \(initialAlbum.title)")
            .navigationTitle(initialAlbum.title)
            .navigationBarTitleDisplayMode(.inline)
    }
}
```

**Step 3: Update ContentView.swift**

```swift
import SwiftUI

struct ContentView: View {
    var body: some View {
        AlbumGalleryView()
    }
}

#Preview {
    ContentView()
        .environment(AlbumLoader())
        .environment(MapState())
}
```

**Step 4: Update MapSFApp.swift to inject dependencies**

```swift
import SwiftUI

@main
struct MapSFApp: App {
    @State private var albumLoader = AlbumLoader()
    @State private var mapState = MapState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(albumLoader)
                .environment(mapState)
        }
    }
}
```

**Step 5: Build and run**

Run: Cmd+R to run in simulator
Expected: App launches showing album gallery with sample bookstores album

**Step 6: Commit**

```bash
git add MapSF/Views/ MapSF/ContentView.swift MapSF/MapSFApp.swift
git commit -m "feat: add AlbumGalleryView with navigation to map"
```

---

## Phase 4: Views - Map Explorer

### Task 10: Create Basic Map Explorer View

**Files:**
- Modify: `MapSF/Views/MapExplorerView.swift`

**Step 1: Replace MapExplorerView with full implementation**

```swift
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

    var body: some View {
        Map(position: $cameraPosition) {
            ForEach(Array(mapState.activeAlbums.enumerated()), id: \.element.id) { albumIndex, album in
                let color = Color(mapState.color(for: albumIndex))

                // Routes
                ForEach(albumLoader.routes(for: album)) { route in
                    MapPolyline(coordinates: route.coordinates)
                        .stroke(color, lineWidth: 4)
                }

                // POIs
                ForEach(albumLoader.pois(for: album)) { poi in
                    Annotation(poi.name, coordinate: poi.coordinate) {
                        Image(systemName: poi.categories.first?.icon ?? "mappin")
                            .foregroundStyle(.white)
                            .padding(6)
                            .background(color)
                            .clipShape(Circle())
                    }
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
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    // TODO: Layer picker
                } label: {
                    Label("Add Layer", systemImage: "plus.square.on.square")
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        MapExplorerView(initialAlbum: Album(
            id: "test",
            title: "Test",
            description: "",
            coverGraphic: "",
            coverImage: "",
            dataFile: "albums/sample-bookstores.geojson"
        ))
    }
    .environment(AlbumLoader())
    .environment(MapState())
}
```

**Step 2: Build and run**

Run: Cmd+R
Expected: Tapping album navigates to map showing POI markers

**Step 3: Commit**

```bash
git add MapSF/Views/MapExplorerView.swift
git commit -m "feat: add MapExplorerView with route and POI rendering"
```

---

### Task 11: Add Layer Picker Sheet

**Files:**
- Create: `MapSF/Views/LayerPickerSheet.swift`
- Modify: `MapSF/Views/MapExplorerView.swift`

**Step 1: Create LayerPickerSheet.swift**

```swift
import SwiftUI

struct LayerPickerSheet: View {
    @Environment(AlbumLoader.self) private var albumLoader
    @Environment(MapState.self) private var mapState
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(Array(albumLoader.albums.enumerated()), id: \.element.id) { index, album in
                    let isActive = mapState.activeAlbums.contains { $0.id == album.id }
                    let color = Color(MapState.palette[index % MapState.palette.count])

                    Button {
                        if isActive {
                            mapState.removeAlbum(album)
                        } else {
                            mapState.addAlbum(album)
                        }
                    } label: {
                        HStack {
                            Circle()
                                .fill(color)
                                .frame(width: 12, height: 12)

                            VStack(alignment: .leading) {
                                Text(album.title)
                                    .font(.headline)
                                Text(album.description)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            if isActive {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(color)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .navigationTitle("Layers")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    LayerPickerSheet()
        .environment(AlbumLoader())
        .environment(MapState())
}
```

**Step 2: Update MapExplorerView to show sheet**

Add state and modify toolbar button in MapExplorerView:

```swift
// Add to MapExplorerView, after @State private var cameraPosition:
@State private var showLayerPicker = false

// Replace toolbar content:
.toolbar {
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
```

**Step 3: Build and run**

Run: Cmd+R
Expected: + button shows layer picker, can toggle albums on/off

**Step 4: Commit**

```bash
git add MapSF/Views/
git commit -m "feat: add LayerPickerSheet for blending albums"
```

---

### Task 12: Add POI Detail Sheet

**Files:**
- Create: `MapSF/Views/POIDetailSheet.swift`
- Modify: `MapSF/Views/MapExplorerView.swift`

**Step 1: Create POIDetailSheet.swift**

```swift
import SwiftUI
import MapKit

struct POIDetailSheet: View {
    let poi: POIData
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                VStack(alignment: .leading) {
                    Text(poi.name)
                        .font(.title2)
                        .fontWeight(.bold)

                    if !poi.categories.isEmpty {
                        Text(poi.categories.map(\.displayName).joined(separator: ", "))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
            }

            Divider()

            // Metadata
            if !poi.metadata.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(Array(poi.metadata.sorted(by: { $0.key < $1.key })), id: \.key) { key, value in
                        HStack(alignment: .top) {
                            Text(key.capitalized + ":")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .frame(width: 60, alignment: .leading)
                            Text(value)
                                .font(.subheadline)
                        }
                    }
                }
            }

            Spacer()

            // Actions
            Button {
                openInMaps()
            } label: {
                Label("Get Directions", systemImage: "arrow.triangle.turn.up.right.diamond")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }

    private func openInMaps() {
        let placemark = MKPlacemark(coordinate: poi.coordinate)
        let mapItem = MKMapItem(placemark: placemark)
        mapItem.name = poi.name
        mapItem.openInMaps(launchOptions: [
            MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking
        ])
    }
}

#Preview {
    POIDetailSheet(poi: POIData(
        name: "Green Apple Books",
        coordinate: CLLocationCoordinate2D(latitude: 37.7851, longitude: -122.4634),
        categories: [.bookstore],
        metadata: ["hours": "10am-10pm", "notes": "SF institution since 1967"]
    ))
}
```

**Step 2: Update MapExplorerView to handle POI taps**

Replace the POI Annotation in MapExplorerView with tappable version:

```swift
// Replace the POI ForEach with:
ForEach(albumLoader.pois(for: album)) { poi in
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
}

// Add sheet after .sheet(isPresented: $showLayerPicker):
.sheet(item: $mapState.selectedPOI) { poi in
    POIDetailSheet(poi: poi)
        .presentationDetents([.medium])
}
```

**Step 3: Make POIData conform to Identifiable properly for sheet**

In POIData.swift, it already conforms via `let id: UUID`. No changes needed.

**Step 4: Build and run**

Run: Cmd+R
Expected: Tapping POI marker shows detail sheet with directions button

**Step 5: Commit**

```bash
git add MapSF/Views/
git commit -m "feat: add POIDetailSheet with metadata and directions"
```

---

## Phase 5: Proximity Queries

### Task 13: Add Query Sheet

**Files:**
- Create: `MapSF/Views/QuerySheet.swift`

**Step 1: Create QuerySheet.swift**

```swift
import SwiftUI

struct QuerySheet: View {
    @Environment(MapState.self) private var mapState

    var body: some View {
        @Bindable var state = mapState

        VStack(alignment: .leading, spacing: 20) {
            Text("What's nearby?")
                .font(.headline)

            // Distance picker
            VStack(alignment: .leading, spacing: 8) {
                Text("Distance")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Picker("Distance", selection: $state.queryRadius) {
                    ForEach(MapState.QueryRadius.allCases, id: \.self) { radius in
                        Text(radius.displayName).tag(radius)
                    }
                }
                .pickerStyle(.segmented)
            }

            // Category checkboxes
            VStack(alignment: .leading, spacing: 8) {
                Text("Show")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 8) {
                    ForEach(POICategory.allCases, id: \.self) { category in
                        CategoryToggle(
                            category: category,
                            isSelected: state.selectedCategories.contains(category)
                        ) {
                            if state.selectedCategories.contains(category) {
                                state.selectedCategories.remove(category)
                            } else {
                                state.selectedCategories.insert(category)
                            }
                        }
                    }
                }
            }

            Spacer()
        }
        .padding()
    }
}

struct CategoryToggle: View {
    let category: POICategory
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: isSelected ? "checkmark.square.fill" : "square")
                    .foregroundStyle(isSelected ? .blue : .secondary)
                Image(systemName: category.icon)
                Text(category.displayName)
                    .lineLimit(1)
                Spacer()
            }
            .font(.subheadline)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    QuerySheet()
        .environment(MapState())
        .presentationDetents([.medium])
}
```

**Step 2: Build to verify**

Run: Cmd+B
Expected: Build Succeeded

**Step 3: Commit**

```bash
git add MapSF/Views/QuerySheet.swift
git commit -m "feat: add QuerySheet with radius and category selection"
```

---

### Task 14: Integrate Query UI into Map Explorer

**Files:**
- Modify: `MapSF/Views/MapExplorerView.swift`

**Step 1: Add query state and triggers to MapExplorerView**

Replace the entire MapExplorerView with:

```swift
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

    // Computed: all POIs from active albums
    private var allPOIs: [POIData] {
        mapState.activeAlbums.flatMap { albumLoader.pois(for: $0) }
    }

    // Computed: filtered POIs based on query
    private var filteredPOIs: (inside: [POIData], outside: [POIData], hidden: [POIData]) {
        guard let origin = mapState.queryOrigin else {
            return (allPOIs, [], [])
        }

        let radius = mapState.queryRadius.rawValue
        let categories = mapState.selectedCategories

        // Get matching/non-matching by category first
        let matching = allPOIs.filter { poi in
            !poi.categories.isEmpty && (categories.isEmpty || !poi.categories.filter { categories.contains($0) }.isEmpty)
        }
        let hidden = allPOIs.filter { poi in
            poi.categories.isEmpty || (!categories.isEmpty && poi.categories.filter { categories.contains($0) }.isEmpty)
        }

        // Then filter by distance
        switch origin {
        case .userLocation:
            // TODO: Get actual user location
            let center = CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194)
            let result = ProximityQuery.pois(matching, near: center, radius: radius, categories: categories)
            return (result.inside, result.outside, hidden)

        case .droppedPin(let coord):
            let result = ProximityQuery.pois(matching, near: coord, radius: radius, categories: categories)
            return (result.inside, result.outside, hidden)

        case .route(let route):
            let result = ProximityQuery.pois(matching, near: route.coordinates, radius: radius, categories: categories)
            return (result.inside, result.outside, hidden)
        }
    }

    var body: some View {
        Map(position: $cameraPosition) {
            // Routes (always visible)
            ForEach(Array(mapState.activeAlbums.enumerated()), id: \.element.id) { albumIndex, album in
                let color = Color(mapState.color(for: albumIndex))

                ForEach(albumLoader.routes(for: album)) { route in
                    MapPolyline(coordinates: route.coordinates)
                        .stroke(color, lineWidth: 4)
                }
            }

            // POIs - inside radius (full opacity)
            ForEach(filteredPOIs.inside) { poi in
                poiAnnotation(for: poi, opacity: 1.0)
            }

            // POIs - outside radius (dimmed)
            ForEach(filteredPOIs.outside) { poi in
                poiAnnotation(for: poi, opacity: 0.3)
            }

            // Query radius circle
            if let origin = mapState.queryOrigin {
                if case .droppedPin(let coord) = origin {
                    MapCircle(center: coord, radius: mapState.queryRadius.rawValue)
                        .stroke(.blue, style: StrokeStyle(lineWidth: 2, dash: [8, 4]))
                        .foregroundStyle(.blue.opacity(0.1))
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
        .onLongPressGesture(minimumDuration: 0.5) { location in
            // Note: Getting coordinate from screen position requires UIKit integration
            // For now, show query sheet centered on SF
            mapState.startQuery(from: .droppedPin(CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194)))
            showQuerySheet = true
        }
        .navigationTitle(initialAlbum.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
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
        .sheet(item: $mapState.selectedPOI) { poi in
            POIDetailSheet(poi: poi)
                .presentationDetents([.medium])
        }
        .sheet(isPresented: $showQuerySheet, onDismiss: {
            mapState.clearQuery()
        }) {
            QuerySheet()
                .presentationDetents([.medium])
        }
    }

    @MapContentBuilder
    private func poiAnnotation(for poi: POIData, opacity: Double) -> some MapContent {
        let albumIndex = mapState.activeAlbums.firstIndex { album in
            albumLoader.pois(for: album).contains { $0.id == poi.id }
        } ?? 0
        let color = Color(mapState.color(for: albumIndex))

        Annotation(poi.name, coordinate: poi.coordinate) {
            Button {
                mapState.selectedPOI = poi
            } label: {
                Image(systemName: poi.categories.first?.icon ?? "mappin")
                    .foregroundStyle(.white)
                    .padding(6)
                    .background(color.opacity(opacity))
                    .clipShape(Circle())
            }
            .opacity(opacity)
        }
    }
}

#Preview {
    NavigationStack {
        MapExplorerView(initialAlbum: Album(
            id: "test",
            title: "Test",
            description: "",
            coverGraphic: "",
            coverImage: "",
            dataFile: "albums/sample-bookstores.geojson"
        ))
    }
    .environment(AlbumLoader())
    .environment(MapState())
}
```

**Step 2: Build and run**

Run: Cmd+R
Expected: Long-press shows query sheet, POIs dim based on filters

**Step 3: Commit**

```bash
git add MapSF/Views/MapExplorerView.swift
git commit -m "feat: integrate proximity query with live filtering"
```

---

## Phase 6: Polish

### Task 15: Add Location Permissions

**Files:**
- Modify: `MapSF/Info.plist` (via Xcode)
- Create: `MapSF/Services/LocationManager.swift`

**Step 1: Add location usage description**

In Xcode:
1. Select MapSF target → Info tab
2. Add row: "Privacy - Location When In Use Usage Description"
3. Value: "MapSF uses your location to show what's nearby"

**Step 2: Create LocationManager.swift**

```swift
import Foundation
import CoreLocation

@Observable
class LocationManager: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    var userLocation: CLLocationCoordinate2D?
    var authorizationStatus: CLAuthorizationStatus = .notDetermined

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
    }

    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }

    func startUpdating() {
        manager.startUpdatingLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        userLocation = locations.last?.coordinate
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
        if authorizationStatus == .authorizedWhenInUse {
            startUpdating()
        }
    }
}
```

**Step 3: Build to verify**

Run: Cmd+B
Expected: Build Succeeded

**Step 4: Commit**

```bash
git add MapSF/Services/LocationManager.swift
git commit -m "feat: add LocationManager for user location"
```

---

### Task 16: Final Integration and Testing

**Files:**
- Modify: `MapSF/MapSFApp.swift`

**Step 1: Add LocationManager to app**

```swift
import SwiftUI

@main
struct MapSFApp: App {
    @State private var albumLoader = AlbumLoader()
    @State private var mapState = MapState()
    @State private var locationManager = LocationManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(albumLoader)
                .environment(mapState)
                .environment(locationManager)
                .onAppear {
                    locationManager.requestPermission()
                }
        }
    }
}
```

**Step 2: Build and run full test**

Run: Cmd+R

Test checklist:
- [ ] Gallery shows album covers
- [ ] Tapping album navigates to map
- [ ] POI markers display on map
- [ ] Layer picker toggles albums
- [ ] POI tap shows detail sheet
- [ ] Directions button opens Maps
- [ ] Long-press shows query sheet
- [ ] Radius picker updates circle
- [ ] Category toggles filter POIs

**Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete v1 MapSF implementation"
```

---

## Summary

**Phases completed:**
1. Data Layer - Models, GeoJSON parsing, sample data
2. State Management - MapState, ProximityQuery service
3. Views - Gallery - Album covers, navigation
4. Views - Map Explorer - MapKit integration, overlays
5. Proximity Queries - Query sheet, live filtering
6. Polish - Location permissions

**What's NOT included (intentionally deferred):**
- Custom album cover images (using placeholders)
- User location query trigger (tapping blue dot)
- Route tap query trigger
- iPad layout
- Actual curated SF data beyond sample

**Next steps after v1:**
- Add real album data (Crosstown Trail, 49 Mile Route, etc.)
- Design and add album cover artwork
- Implement user location tap → query flow
- Add route tap → query flow

---

Plan complete and saved to `docs/plans/2025-01-09-mapsf-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
