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
