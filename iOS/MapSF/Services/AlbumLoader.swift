import Foundation

@Observable
class AlbumLoader {
    private(set) var albums: [Album] = []
    private var loadedCurations: [String: [Curation]] = [:] // Cache by album id

    // Cached filtered results to avoid repeated iteration
    private var cachedSegments: [String: [SegmentData]] = [:]
    private var cachedPOIs: [String: [POIData]] = [:]
    private var cachedAreas: [String: [AreaData]] = [:]

    /// Evict cached curations for an album to free memory
    func evictCache(for albumId: String) {
        loadedCurations.removeValue(forKey: albumId)
        cachedSegments.removeValue(forKey: albumId)
        cachedPOIs.removeValue(forKey: albumId)
        cachedAreas.removeValue(forKey: albumId)
    }

    /// Evict all cached curations
    func evictAllCaches() {
        loadedCurations.removeAll()
        cachedSegments.removeAll()
        cachedPOIs.removeAll()
        cachedAreas.removeAll()
    }

    init() {
        loadAlbums()
    }

    private func loadAlbums() {
        // Try folder reference path first, then root bundle
        let url = Bundle.main.url(forResource: "albums", withExtension: "json", subdirectory: "Data")
               ?? Bundle.main.url(forResource: "albums", withExtension: "json")

        guard let url,
              let data = try? Data(contentsOf: url),
              let container = try? JSONDecoder().decode(AlbumsContainer.self, from: data) else {
            print("Failed to load albums.json")
            return
        }
        albums = container.albums
    }

    func loadCurations(for album: Album) -> [Curation] {
        if let cached = loadedCurations[album.id] {
            return cached
        }

        // dataFile is like "albums/sf-bookstores.geojson"
        let pathWithoutExt = (album.dataFile as NSString).deletingPathExtension
        let ext = (album.dataFile as NSString).pathExtension
        let filename = (album.dataFile as NSString).lastPathComponent
        let nameOnly = (filename as NSString).deletingPathExtension

        // Try folder reference path first, then just filename in root
        let url = Bundle.main.url(forResource: pathWithoutExt, withExtension: ext, subdirectory: "Data")
               ?? Bundle.main.url(forResource: nameOnly, withExtension: ext)

        guard let url else {
            print("Failed to find file for album: \(album.id), tried: \(pathWithoutExt).\(ext) and \(nameOnly).\(ext)")
            return []
        }

        guard let data = try? Data(contentsOf: url) else {
            print("Failed to read data from: \(url)")
            return []
        }

        guard let curations = try? GeoJSONParser.parse(data: data) else {
            print("Failed to parse GeoJSON for album: \(album.id)")
            return []
        }

        loadedCurations[album.id] = curations
        return curations
    }

    func segments(for album: Album) -> [SegmentData] {
        if let cached = cachedSegments[album.id] {
            return cached
        }
        let result = loadCurations(for: album).compactMap { curation in
            if case .segment(let segment) = curation { return segment }
            return nil
        }
        cachedSegments[album.id] = result
        return result
    }

    func pois(for album: Album) -> [POIData] {
        if let cached = cachedPOIs[album.id] {
            return cached
        }
        let result = loadCurations(for: album).compactMap { curation in
            if case .poi(let poi) = curation { return poi }
            return nil
        }
        cachedPOIs[album.id] = result
        return result
    }

    func areas(for album: Album) -> [AreaData] {
        if let cached = cachedAreas[album.id] {
            return cached
        }
        let result = loadCurations(for: album).compactMap { curation in
            if case .area(let area) = curation { return area }
            return nil
        }
        cachedAreas[album.id] = result
        return result
    }
}
