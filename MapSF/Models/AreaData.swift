import Foundation
import CoreLocation

struct AreaData: Identifiable {
    let id: UUID
    let name: String
    let boundary: [CLLocationCoordinate2D]  // Polygon exterior ring (closed)
    let metadata: [String: String]

    init(id: UUID = UUID(), name: String, boundary: [CLLocationCoordinate2D], metadata: [String: String] = [:]) {
        self.id = id
        self.name = name
        self.boundary = boundary
        self.metadata = metadata
    }
}
