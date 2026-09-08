import Foundation
import CoreLocation

@Observable
class LocationManager: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    var userLocation: CLLocationCoordinate2D?
    var authorizationStatus: CLAuthorizationStatus = .notDetermined

    override init() {
        super.init()
        manager.delegate = self
        // Don't need GPS-level accuracy for a map overview
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        // Only update when user moves significantly (100m)
        manager.distanceFilter = 100
    }

    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }

    /// Request a single location update instead of continuous tracking
    func requestLocation() {
        manager.requestLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        userLocation = locations.last?.coordinate
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Required delegate method for requestLocation()
        print("Location error: \(error.localizedDescription)")
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
        if authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways {
            // Get one location, don't continuously track
            requestLocation()
        }
    }
}
