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
