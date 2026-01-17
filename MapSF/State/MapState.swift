import Foundation
import CoreLocation
import MapKit
import SwiftUI

@Observable
class MapState {
    var activeAlbums: [Album] = []

    // Selection state - only one can be selected at a time
    var selectedPOI: POIData? = nil
    var selectedSegment: SegmentData? = nil
    var selectedArea: AreaData? = nil

    // Computed: is anything selected?
    var hasSelection: Bool {
        selectedPOI != nil || selectedSegment != nil || selectedArea != nil
    }

    func clearSelection() {
        selectedPOI = nil
        selectedSegment = nil
        selectedArea = nil
    }

    func select(poi: POIData) {
        clearSelection()
        selectedPOI = poi
    }

    func select(segment: SegmentData) {
        clearSelection()
        selectedSegment = segment
    }

    func select(area: AreaData) {
        clearSelection()
        selectedArea = area
    }

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
        case segment(SegmentData)
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

    // Color palette for blending layers
    // First color is pink matching streetcar.live F-line
    static let streetcarPink = Color(red: 242/255, green: 120/255, blue: 144/255)  // RGB(242, 120, 144)
    // Warm amber/orange for areas - visible on map backgrounds
    static let areaColor = Color(red: 230/255, green: 150/255, blue: 50/255)  // Golden amber
    static let palette: [Color] = [
        streetcarPink,
        .orange,
        .teal,
        .purple,
        .indigo,
        .mint,
        .brown,
        .cyan
    ]

    func color(for albumIndex: Int) -> Color {
        Self.palette[albumIndex % Self.palette.count]
    }

    func addAlbum(_ album: Album) {
        guard !activeAlbums.contains(where: { $0.id == album.id }) else { return }
        activeAlbums.append(album)
    }

    func setAlbum(_ album: Album) {
        activeAlbums = [album]
        clearSelection()
        clearQuery()
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

    /// Clear all state to release memory when leaving map view
    func clearAll() {
        activeAlbums = []
        clearSelection()
        clearQuery()
    }
}
