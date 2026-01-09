# MapSF Design Document

A curated, layered map of San Francisco with composable overlays.

## Core Concept

The app presents a "discography" of map overlays - each a thematic collection (trails, bookstores, scenic routes, etc.). Users browse albums in a gallery, activate one or more, and explore an interactive map with selected overlays rendered. The system supports proximity queries ("what's near this route?") with room to grow into richer spatial operations.

### Key Principles

- **Album-based curation**: Each overlay is a self-contained "album" with cover art and themed data
- **Blending**: Multiple albums can be active simultaneously, rendered with distinct colors from a runtime palette
- **Proximity queries**: Simple "what's within X of here/this route" queries (v1), extensible to set operations later
- **SF-locked**: Map camera constrained to San Francisco city/county bounds

## Data Model

### File Structure

```
MapSF/
├── Data/
│   ├── albums.json              // Album metadata for gallery
│   └── albums/
│       ├── crosstown-trail.geojson
│       ├── 49-mile-route.geojson
│       ├── indie-bookstores.geojson
│       └── ice-cream.geojson
```

### albums.json

```json
{
  "albums": [
    {
      "id": "crosstown-trail",
      "title": "Crosstown Trail",
      "description": "17 miles from Candlestick to Lands End",
      "coverGraphic": "crosstown-graphic",
      "coverImage": "crosstown-photo",
      "dataFile": "albums/crosstown-trail.geojson"
    }
  ]
}
```

### GeoJSON (per album)

Standard GeoJSON FeatureCollection. Each feature has a `layerType` property ("route" or "poi"):

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "LineString", "coordinates": [[lng, lat], ...] },
      "properties": { "name": "Main Trail", "layerType": "route" }
    },
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [lng, lat] },
      "properties": {
        "name": "Green Apple Books",
        "layerType": "poi",
        "category": "bookstore",
        "metadata": { "hours": "10am-10pm", "notes": "SF institution since 1967" }
      }
    }
  ]
}
```

### POI Categories

Categories are optional per-POI. If present and matching a predefined category, the POI becomes queryable via the filter sheet.

```json
"category": null                        // not queryable
"category": "bookstore"                 // single category
"category": ["landmark", "bathroom"]    // multiple categories
```

**Predefined categories** (app-level constant):

| Category | SF Symbol | Display Name |
|----------|-----------|--------------|
| `bookstore` | `book.fill` | Bookstore |
| `ice-cream` | `snowflake` | Ice Cream |
| `burger` | `fork.knife` | Burger |
| `bathroom` | `toilet.fill` | Bathroom |
| `coffee` | `cup.and.saucer.fill` | Coffee |
| `bar` | `wineglass.fill` | Bar |
| `landmark` | `star.fill` | Landmark |

POIs with `null` category or unrecognized strings render on the map but are excluded from query results.

## App Architecture

### Platform & Dependencies

- **Target**: iPhone only (iOS 17+)
- **Frameworks**: SwiftUI, MapKit
- **External dependencies**: None

### Screen Flow

```
┌─────────────────────────────────────────┐
│           Album Gallery                 │  <- Launch screen
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ ▢ │ img │ │ ▢ │ img │ │ ▢ │ img │   │  <- Diptych covers
│  │ Crosstwn│ │ 49 Mile │ │Bookstores│   │     (vertical scroll)
│  └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────┘
          │ tap album
          ▼
┌─────────────────────────────────────────┐
│  <- Back              [+ Add Layer]     │
│─────────────────────────────────────────│
│                                         │
│              MAP VIEW                   │  <- Full-screen map
│         (SF bounds locked)              │     with overlay rendered
│                                         │
│─────────────────────────────────────────│
│  Tap POI for details (bottom sheet)     │
└─────────────────────────────────────────┘
```

### Key Interactions

| Gesture | Target | Action |
|---------|--------|--------|
| Tap album cover | Gallery | Push to map view with album active |
| Tap [+ Add Layer] | Map view | Open layer picker to blend albums |
| Tap POI marker | Map | Show detail sheet |
| Tap blue dot | User location | "What's within X of me?" query |
| Long-press map | Arbitrary point | Drop pin, "What's within X?" query |
| Tap route | Route line | "What's within X of this route?" query |

### Album Cover Design

Side-by-side diptych:
- **Left**: Stylized/abstracted map graphic (not a live render - too small for detail)
- **Right**: Evocative photo capturing the album's spirit
- **Title**: Overlaid text with high-contrast color relative to background

## Map Behavior

### SF-Constrained Camera

```swift
let sfRegion = MKCoordinateRegion(
    center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
    span: MKCoordinateSpan(latitudeDelta: 0.15, longitudeDelta: 0.15)
)
map.cameraBoundary = MKMapView.CameraBoundary(coordinateRegion: sfRegion)
map.cameraZoomRange = MKMapView.CameraZoomRange(
    minCenterCoordinateDistance: 500,
    maxCenterCoordinateDistance: 50000
)
```

### Overlay Rendering

| Layer Type | MapKit Approach |
|------------|-----------------|
| Route | `MKPolyline` + `MKPolylineRenderer` (color, width, dash) |
| POI | `MKMarkerAnnotationView` with SF Symbol glyph |

### Color Palette for Blending

Colors assigned at runtime by activation order, not stored in album data:

```swift
let palette: [Color] = [
    .purple,    // First active album
    .orange,    // Second active album
    .teal,      // Third...
    .pink,
    .indigo,
    .mint,
    .brown,
    .cyan
]
```

When albums are blended, each gets the next color from the palette. This guarantees visual distinction without curator coordination.

### Marker Customization (v1)

Start with `MKMarkerAnnotationView`:
- `markerTintColor`: From runtime palette
- `glyphImage`: SF Symbol per category (book.fill, fork.knife, etc.)

Upgrade path: Custom SwiftUI `Annotation` views for richer visuals.

## Proximity Queries

### v1 Scope

Single-predicate proximity:
- POIs within X distance of a point (user location or dropped pin)
- POIs within X distance of a route

### Distance Options

- 1 block (~100m)
- 3 blocks (~300m)
- 5 blocks (~500m)

### Implementation

```swift
func poisNear(point: CLLocationCoordinate2D, radius: CLLocationDistance) -> [POIData] {
    activePOIs.filter { distance($0.coordinate, point) <= radius }
}

func poisNear(route: MKPolyline, radius: CLLocationDistance) -> [POIData] {
    activePOIs.filter { minDistance($0.coordinate, route) <= radius }
}
```

For routes, iterate segments and find minimum perpendicular distance. With curated data (hundreds of POIs, not thousands), no spatial index needed.

### Future Extensions (v2+)

- Set operations: union, intersection of query results
- "Plan a walk" route optimization
- Crowdsourced POI submissions

## Swift Types

### Models

```swift
struct Album: Codable, Identifiable {
    let id: String
    let title: String
    let description: String
    let coverGraphic: String
    let coverImage: String
    let dataFile: String
    var features: [Feature]?  // Lazy-loaded from GeoJSON
}

enum Feature {
    case route(RouteData)
    case poi(POIData)
}

struct RouteData {
    let name: String
    let coordinates: [CLLocationCoordinate2D]
}

struct POIData: Identifiable {
    let id: UUID
    let name: String
    let coordinate: CLLocationCoordinate2D
    let categories: [POICategory]  // normalized from string/array, empty if null/unrecognized
    let metadata: [String: String]
}
```

### Views

```
Views/
├── AlbumGalleryView.swift      // LazyVGrid of album covers
├── AlbumCoverView.swift        // Diptych component
├── MapExplorerView.swift       // Map + overlay rendering
├── LayerPickerSheet.swift      // Add/remove blended albums
├── POIDetailSheet.swift        // Bottom sheet for tapped POI
├── QuerySheet.swift            // "What's nearby" radius picker
```

### Services

```
Services/
├── AlbumLoader.swift           // JSON parsing, caching
├── ProximityQuery.swift        // Distance calculations
```

### State Management

```swift
@Observable class MapState {
    var activeAlbums: [Album] = []
    var queryResult: [POIData]? = nil   // nil = show all, non-nil = filtered
    var selectedPOI: POIData? = nil
}
```

Simple `@Observable` - no external state management needed at this scale.

## Open Questions / Future Work

- iPad layout (split view) - intentionally deferred
- Custom map styling (Mapbox migration if Apple's cartography doesn't fit the vibe)
- Crowdsourced contributions (moderation flow, data validation)
- Offline support (album data is local, but base map tiles need network)

## Technical Notes

### Query Sheet UI

The query sheet uses:
- **Radio buttons** for distance selection (1 / 3 / 5 blocks) - single select
- **Checkboxes** for category filtering - multi-select from predefined categories

**Live filtering:** Changes apply instantly - no "Show Results" button. As the user adjusts radius or toggles categories, the map updates in real-time.

**Visual feedback during query:**
- A dotted circle appears on the map showing the selected radius
- POIs filter dynamically based on selections

**POI visibility during active query:**

| Condition | Visibility |
|-----------|------------|
| Matches selected category AND inside radius | Full color, full opacity |
| Matches selected category AND outside radius | Dimmed (30% opacity) |
| Does NOT match any selected category | Hidden |
| No categories selected | All categorized POIs visible (inside = full, outside = dimmed) |

POIs without categories (or with unrecognized categories) are always hidden during queries.

**Dismissing query:** Swipe down the sheet or tap outside → circle disappears, all POIs return to normal visibility.

### Data Storage Strategy

**v1: In-memory arrays.** With curated data (hundreds of POIs, not thousands), simple array filtering is fast enough - microseconds per query.

**Future upgrade path:** If performance becomes an issue or richer queries are needed:
1. Abstract behind a `POIStore` protocol
2. Swap to SQLite with R-tree spatial index (via GRDB.swift)
3. Enables efficient spatial queries without scanning all POIs

Don't optimize until it hurts.
