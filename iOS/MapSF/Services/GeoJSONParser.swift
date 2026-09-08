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

    static func parse(data: Data) throws -> [Curation] {
        let collection = try JSONDecoder().decode(GeoJSONFeatureCollection.self, from: data)
        return collection.features.compactMap { parseCuration($0) }
    }

    private static func parseCuration(_ feature: GeoJSONFeature) -> Curation? {
        switch feature.properties.layerType {
        case "segment":
            guard let segment = parseSegment(feature) else { return nil }
            return .segment(segment)
        case "poi":
            guard let poi = parsePOI(feature) else { return nil }
            return .poi(poi)
        case "area":
            guard let area = parseArea(feature) else { return nil }
            return .area(area)
        default:
            return nil
        }
    }

    private static func parseSegment(_ feature: GeoJSONFeature) -> SegmentData? {
        guard feature.geometry.type == "LineString",
              let coordsArray = feature.geometry.coordinates.value as? [[Double]] else {
            return nil
        }

        let coords = coordsArray.map { coord in
            CLLocationCoordinate2D(latitude: coord[1], longitude: coord[0])
        }

        return SegmentData(
            name: feature.properties.name,
            coordinates: coords,
            metadata: feature.properties.metadata ?? [:]
        )
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

    private static func parseArea(_ feature: GeoJSONFeature) -> AreaData? {
        // Polygon: [[[lng, lat], ...]] - outer ring is first element
        guard feature.geometry.type == "Polygon",
              let rings = feature.geometry.coordinates.value as? [[[Double]]],
              let exteriorRing = rings.first else {
            return nil
        }

        let boundary = exteriorRing.map { coord in
            CLLocationCoordinate2D(latitude: coord[1], longitude: coord[0])
        }

        return AreaData(
            name: feature.properties.name,
            boundary: boundary,
            metadata: feature.properties.metadata ?? [:]
        )
    }
}

// Helper for decoding heterogeneous JSON arrays (GeoJSON coordinates)
struct AnyCodable: Codable {
    let value: Any

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        // Try from most nested to least nested
        if let tripleNested = try? container.decode([[[Double]]].self) {
            // MultiLineString or Polygon: [[[lng, lat], ...], ...]
            value = tripleNested
        } else if let doubleNested = try? container.decode([[Double]].self) {
            // LineString: [[lng, lat], ...]
            value = doubleNested
        } else if let singleArray = try? container.decode([Double].self) {
            // Point: [lng, lat]
            value = singleArray
        } else if let doubleValue = try? container.decode(Double.self) {
            value = doubleValue
        } else if let intValue = try? container.decode(Int.self) {
            value = intValue
        } else if let stringValue = try? container.decode(String.self) {
            value = stringValue
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unsupported GeoJSON coordinate type")
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        if let tripleNested = value as? [[[Double]]] {
            try container.encode(tripleNested)
        } else if let doubleNested = value as? [[Double]] {
            try container.encode(doubleNested)
        } else if let singleArray = value as? [Double] {
            try container.encode(singleArray)
        } else if let doubleValue = value as? Double {
            try container.encode(doubleValue)
        } else if let intValue = value as? Int {
            try container.encode(intValue)
        } else if let stringValue = value as? String {
            try container.encode(stringValue)
        }
    }
}
