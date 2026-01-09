import SwiftUI
import MapKit

struct POIDetailSheet: View {
    let poi: POIData
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                VStack(alignment: .leading) {
                    Text(poi.name)
                        .font(.title2)
                        .fontWeight(.bold)

                    if !poi.categories.isEmpty {
                        Text(poi.categories.map(\.displayName).joined(separator: ", "))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
            }

            Divider()

            // Metadata
            if !poi.metadata.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(Array(poi.metadata.sorted(by: { $0.key < $1.key })), id: \.key) { key, value in
                        HStack(alignment: .top) {
                            Text(key.capitalized + ":")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .frame(width: 60, alignment: .leading)
                            Text(value)
                                .font(.subheadline)
                        }
                    }
                }
            }

            Spacer()

            // Actions
            Button {
                openInMaps()
            } label: {
                Label("Get Directions", systemImage: "arrow.triangle.turn.up.right.diamond")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }

    private func openInMaps() {
        let placemark = MKPlacemark(coordinate: poi.coordinate)
        let mapItem = MKMapItem(placemark: placemark)
        mapItem.name = poi.name
        mapItem.openInMaps(launchOptions: [
            MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking
        ])
    }
}

#Preview {
    POIDetailSheet(poi: POIData(
        name: "Green Apple Books",
        coordinate: CLLocationCoordinate2D(latitude: 37.7851, longitude: -122.4634),
        categories: [.bookstore],
        metadata: ["hours": "10am-10pm", "notes": "SF institution since 1967"]
    ))
}
