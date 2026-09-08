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

    /// Centroid of the polygon (average of all vertices)
    var centroid: CLLocationCoordinate2D {
        guard !boundary.isEmpty else {
            return CLLocationCoordinate2D(latitude: 0, longitude: 0)
        }
        let sumLat = boundary.reduce(0.0) { $0 + $1.latitude }
        let sumLon = boundary.reduce(0.0) { $0 + $1.longitude }
        return CLLocationCoordinate2D(
            latitude: sumLat / Double(boundary.count),
            longitude: sumLon / Double(boundary.count)
        )
    }
}
