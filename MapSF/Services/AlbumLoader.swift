import Foundation

@Observable
class AlbumLoader {
    private(set) var albums: [Album] = []
    private var loadedCurations: [String: [Curation]] = [:] // Cache by album id

    init() {
        loadAlbums()
    }

    private func loadAlbums() {
        guard let url = Bundle.main.url(forResource: "albums", withExtension: "json"),
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

        // dataFile is like "albums/sample-bookstores.geojson" - extract just the filename
        let filename = (album.dataFile as NSString).lastPathComponent
        let name = (filename as NSString).deletingPathExtension
        let ext = (filename as NSString).pathExtension

        guard let url = Bundle.main.url(forResource: name, withExtension: ext),
              let data = try? Data(contentsOf: url),
              let curations = try? GeoJSONParser.parse(data: data) else {
            print("Failed to load curations for album: \(album.id)")
            return []
        }

        loadedCurations[album.id] = curations
        return curations
    }

    func segments(for album: Album) -> [SegmentData] {
        loadCurations(for: album).compactMap { curation in
            if case .segment(let segment) = curation { return segment }
            return nil
        }
    }

    func pois(for album: Album) -> [POIData] {
        loadCurations(for: album).compactMap { curation in
            if case .poi(let poi) = curation { return poi }
            return nil
        }
    }

    func areas(for album: Album) -> [AreaData] {
        loadCurations(for: album).compactMap { curation in
            if case .area(let area) = curation { return area }
            return nil
        }
    }
}
