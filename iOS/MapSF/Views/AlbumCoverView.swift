import SwiftUI

// Simple cache for cover images - NSCache auto-evicts under memory pressure
private let coverImageCache = NSCache<NSString, UIImage>()

/// Clear cover image cache (called on memory warning)
func clearCoverImageCache() {
    coverImageCache.removeAllObjects()
}

struct AlbumCoverView: View {
    let album: Album
    let accentColor: Color

    private var coverImage: UIImage? {
        let filename = (album.coverImage as NSString).lastPathComponent
        let cacheKey = filename as NSString

        // Return cached image if available
        if let cached = coverImageCache.object(forKey: cacheKey) {
            return cached
        }

        // Load from bundle - try multiple locations
        var url: URL?
        if url == nil { url = Bundle.main.url(forResource: filename, withExtension: "png", subdirectory: "Data/covers") }
        if url == nil { url = Bundle.main.url(forResource: filename, withExtension: "png", subdirectory: "covers") }
        if url == nil { url = Bundle.main.url(forResource: filename, withExtension: "png") }

        guard let url, let image = UIImage(contentsOfFile: url.path) else {
            return nil
        }

        // Cache and return
        coverImageCache.setObject(image, forKey: cacheKey)
        return image
    }

    @ViewBuilder
    private var coverImageView: some View {
        if let uiImage = coverImage {
            Image(uiImage: uiImage)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .clipped()
        } else {
            placeholderView
        }
    }

    private var placeholderView: some View {
        Rectangle()
            .fill(accentColor.opacity(0.3))
            .overlay {
                Image(systemName: "photo")
                    .font(.title)
                    .foregroundStyle(accentColor)
            }
    }

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

            // Right: Cover image (coverImage is "covers/filename")
            coverImageView
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
