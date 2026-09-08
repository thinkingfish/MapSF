import Foundation
import CoreLocation

struct SegmentData: Identifiable {
    let id: UUID
    let name: String
    let coordinates: [CLLocationCoordinate2D]
    let metadata: [String: String]

    init(id: UUID = UUID(), name: String, coordinates: [CLLocationCoordinate2D], metadata: [String: String] = [:]) {
        self.id = id
        self.name = name
        self.coordinates = coordinates
        self.metadata = metadata
    }
}
