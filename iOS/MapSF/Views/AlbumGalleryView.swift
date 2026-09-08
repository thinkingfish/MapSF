import SwiftUI

struct AlbumGalleryView: View {
    @Environment(AlbumLoader.self) private var albumLoader
    @Environment(MapState.self) private var mapState

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    ForEach(Array(albumLoader.albums.enumerated()), id: \.element.id) { index, album in
                        NavigationLink(value: album) {
                            AlbumCoverView(
                                album: album,
                                accentColor: MapState.palette[index % MapState.palette.count]
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding()
            }
            .navigationTitle("MapSF")
            .navigationDestination(for: Album.self) { album in
                MapExplorerView(initialAlbum: album)
            }
        }
    }
}

#Preview {
    AlbumGalleryView()
        .environment(AlbumLoader())
        .environment(MapState())
}
