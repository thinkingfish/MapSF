import SwiftUI

struct AlbumCoverView: View {
    let album: Album
    let accentColor: Color

    var body: some View {
        HStack(spacing: 0) {
            // Left: Stylized map graphic placeholder
            Rectangle()
                .fill(accentColor.opacity(0.2))
                .overlay {
                    Image(systemName: "map")
                        .font(.title)
                        .foregroundStyle(accentColor)
                }

            // Right: Cover image placeholder
            Rectangle()
                .fill(accentColor.opacity(0.3))
                .overlay {
                    Image(systemName: "photo")
                        .font(.title)
                        .foregroundStyle(accentColor)
                }
        }
        .aspectRatio(2, contentMode: .fit)
        .overlay(alignment: .topLeading) {
            Text(album.title)
                .font(.headline)
                .fontWeight(.bold)
                .foregroundStyle(.white)
                .shadow(color: .black.opacity(0.7), radius: 2, x: 0, y: 1)
                .padding(8)
        }
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay {
            RoundedRectangle(cornerRadius: 12)
                .stroke(accentColor, lineWidth: 2)
        }
    }
}

#Preview {
    AlbumCoverView(
        album: Album(
            id: "test",
            title: "Indie Bookstores",
            description: "Test",
            coverMap: "",
            coverImage: "",
            dataFile: ""
        ),
        accentColor: .purple
    )
    .padding()
}
