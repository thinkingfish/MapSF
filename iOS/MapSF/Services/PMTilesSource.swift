import Foundation
import MapLibre

/// Provides access to bundled PMTiles for MapLibre
enum PMTilesSource {
    /// URL for the bundled SF tiles PMTiles file
    static var sfTilesURL: URL? {
        // Files are bundled at root level (not in subdirectory) due to Xcode file system sync
        Bundle.main.url(forResource: "sf-tiles", withExtension: "pmtiles")
    }

    /// Register the PMTiles URL scheme with MapLibre
    static func registerProtocol() {
        // MapLibre supports pmtiles:// URLs natively as of v6.0
        // No additional registration needed
    }
}
