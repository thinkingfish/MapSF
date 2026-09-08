# MapSF Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a curated, layered map app for San Francisco with album-based overlays and proximity queries.

**Architecture:** SwiftUI app with NavigationStack, @Observable state management, MapKit for rendering. Data loaded from bundled JSON/GeoJSON files. No external dependencies.

**Tech Stack:** SwiftUI, MapKit, iOS 17+, Swift 5.9+

---

## Naming Conventions (Updated)

| Concept | Type Name | GeoJSON `layerType` |
|---------|-----------|---------------------|
| Polyline (route segment) | `SegmentData` | `"segment"` |
| Point of Interest | `POIData` | `"poi"` |
| Polygon (park, area) | `AreaData` | `"area"` |
| Wrapper enum | `Curation` | — |
| Album cover left half | `coverMap` | — |

---

## Phase 1: Data Layer (COMPLETED)

### Task 1: Create POI Category Enum ✓
### Task 2: Create Core Data Models ✓
### Task 3: Create GeoJSON Parser ✓
### Task 4: Create Album Loader Service ✓
### Task 5: Create Sample Data Files ✓

---

## Phase 2: State Management (COMPLETED)

### Task 6: Create MapState Observable ✓

---

## Phase 3: Proximity Query & Views

### Task 7: Create Proximity Query Service

**Files:**
- Create: `MapSF/Services/ProximityQuery.swift`

**Step 1: Create ProximityQuery.swift**

```swift
import Foundation
import CoreLocation

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

    /// Filter POIs by distance from a segment
    static func pois(
        _ allPOIs: [POIData],
        near segment: [CLLocationCoordinate2D],
        radius: CLLocationDistance,
        categories: Set<POICategory>
    ) -> (inside: [POIData], outside: [POIData]) {
        let filtered = filterByCategory(allPOIs, categories: categories)

        var inside: [POIData] = []
        var outside: [POIData] = []

        for poi in filtered {
            let distance = minDistance(from: poi.coordinate, to: segment)
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

    /// Minimum distance from point to polyline (iterating line segments)
    private static func minDistance(from point: CLLocationCoordinate2D, to polyline: [CLLocationCoordinate2D]) -> CLLocationDistance {
        guard polyline.count >= 2 else {
            return polyline.first.map { point.distance(to: $0) } ?? .infinity
        }

        var minDist = CLLocationDistance.infinity

        for i in 0..<(polyline.count - 1) {
            let segmentStart = polyline[i]
            let segmentEnd = polyline[i + 1]
            let dist = distanceToLineSegment(point: point, segmentStart: segmentStart, segmentEnd: segmentEnd)
            minDist = min(minDist, dist)
        }

        return minDist
    }

    /// Distance from point to line segment
    private static func distanceToLineSegment(
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

---

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
            coverMap: "",
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

---

### Task 9: Create Album Gallery View

**Files:**
- Create: `MapSF/Views/AlbumGalleryView.swift`
- Create: `MapSF/Views/MapExplorerView.swift` (placeholder)
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
                                accentColor: MapState.palette[index % MapState.palette.count]
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
                let color = mapState.color(for: albumIndex)

                // Segments
                ForEach(albumLoader.segments(for: album)) { segment in
                    MapPolyline(coordinates: segment.coordinates)
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

                // Areas
                ForEach(albumLoader.areas(for: album)) { area in
                    MapPolygon(coordinates: area.boundary)
                        .foregroundStyle(color.opacity(0.2))
                        .stroke(color, lineWidth: 2)
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
            coverMap: "",
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
                    let color = MapState.palette[index % MapState.palette.count]

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

**Step 3: Build and run**

Run: Cmd+R
Expected: Tapping POI marker shows detail sheet with directions button

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

---

### Task 14: Integrate Query UI into Map Explorer

**Files:**
- Modify: `MapSF/Views/MapExplorerView.swift`

**Step 1: Add query state and triggers to MapExplorerView**

Add these properties and computed vars:

```swift
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

    case .segment(let segment):
        let result = ProximityQuery.pois(matching, near: segment.coordinates, radius: radius, categories: categories)
        return (result.inside, result.outside, hidden)
    }
}
```

**Step 2: Update Map content to use filtered POIs**

Replace POI rendering with filtered version, add query sheet.

**Step 3: Build and run**

Run: Cmd+R
Expected: Query sheet filters POIs, dimmed outside radius, hidden non-matching categories

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
- [ ] Segments render as polylines
- [ ] Areas render as polygons
- [ ] Layer picker toggles albums
- [ ] POI tap shows detail sheet
- [ ] Directions button opens Maps
- [ ] Query sheet filters POIs
- [ ] Category toggles filter POIs

---

## Summary

**Curation Types:**
- `segment` - polyline (LineString geometry)
- `poi` - point (Point geometry)
- `area` - polygon (Polygon geometry)

**What's NOT included (intentionally deferred):**
- Custom album cover images (using placeholders)
- User location query trigger (tapping blue dot)
- Segment tap query trigger
- iPad layout
- Actual curated SF data beyond sample

**Next steps after v1:**
- Add real album data (Crosstown Trail, 49 Mile Route, etc.)
- Design and add album cover artwork
- Implement user location tap → query flow
- Add segment tap → query flow
