import Foundation
import CoreLocation
import MapKit
import SwiftUI

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
    static let palette: [Color] = [
        .purple,
        .orange,
        .teal,
        .pink,
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
