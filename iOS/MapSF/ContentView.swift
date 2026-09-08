import SwiftUI

struct ContentView: View {
    @State private var showSplash = true
    @State private var contentReady = false

    var body: some View {
        ZStack {
            AlbumGalleryView()
                .onAppear {
                    contentReady = true
                }

            if showSplash {
                SplashView(isVisible: $showSplash, contentReady: $contentReady)
                    .transition(.move(edge: .top))
                    .zIndex(1)
            }
        }
    }
}

#Preview {
    ContentView()
        .environment(AlbumLoader())
        .environment(MapState())
}
