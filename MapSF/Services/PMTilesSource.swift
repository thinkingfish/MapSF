import Foundation
import MapLibre

/// Provides access to bundled PMTiles for MapLibre
enum PMTilesSource {
    /// URL for the bundled SF tiles PMTiles file
    static var sfTilesURL: URL? {
        Bundle.main.url(forResource: "sf-tiles", withExtension: "pmtiles", subdirectory: "Resources/BaseMap")
    }

    /// Register the PMTiles URL scheme with MapLibre
    static func registerProtocol() {
        // MapLibre supports pmtiles:// URLs natively as of v6.0
        // No additional registration needed
    }
}
