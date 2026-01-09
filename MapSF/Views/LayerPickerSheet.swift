import SwiftUI

struct LayerPickerSheet: View {
    @Environment(AlbumLoader.self) private var albumLoader
    @Environment(MapState.self) private var mapState
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(Array(albumLoader.albums.enumerated()), id: \.element.id) { index, album in
                    let isActive = mapState.activeAlbums.contains { $0.id == album.id }
                    let color = MapState.palette[index % MapState.palette.count]

                    Button {
                        if isActive {
                            mapState.removeAlbum(album)
                        } else {
                            mapState.addAlbum(album)
                        }
                    } label: {
                        HStack {
                            Circle()
                                .fill(color)
                                .frame(width: 12, height: 12)

                            VStack(alignment: .leading) {
                                Text(album.title)
                                    .font(.headline)
                                Text(album.description)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            if isActive {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(color)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .navigationTitle("Layers")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    LayerPickerSheet()
        .environment(AlbumLoader())
        .environment(MapState())
}
