import SwiftUI

struct ContentView: View {
    var body: some View {
        AlbumGalleryView()
    }
}

#Preview {
    ContentView()
        .environment(AlbumLoader())
        .environment(MapState())
}
