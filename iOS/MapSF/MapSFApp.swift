import SwiftUI

@main
struct MapSFApp: App {
    @State private var albumLoader = AlbumLoader()
    @State private var mapState = MapState()
    @State private var locationManager = LocationManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(albumLoader)
                .environment(mapState)
                .environment(locationManager)
                .onAppear {
                    locationManager.requestPermission()
                }
                .onReceive(NotificationCenter.default.publisher(for: UIApplication.didReceiveMemoryWarningNotification)) { _ in
                    // Evict all caches on memory warning
                    albumLoader.evictAllCaches()
                    mapState.clearAll()
                    clearCoverImageCache()
                }
        }
    }
}
