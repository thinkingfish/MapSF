import SwiftUI
import MapKit

/// Bottom panel showing album summary with clickable list and inline selection details.
struct CurationInfoPanel: View {
    @Environment(AlbumLoader.self) private var albumLoader
    @Environment(MapState.self) private var mapState

    var body: some View {
        VStack(spacing: 0) {
            // Drag handle hint
            RoundedRectangle(cornerRadius: 2)
                .fill(Color.secondary.opacity(0.4))
                .frame(width: 36, height: 4)
                .padding(.top, 8)

            AlbumSummaryContent()

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.regularMaterial)
    }
}

// MARK: - Album Summary with Clickable List

private struct AlbumSummaryContent: View {
    @Environment(AlbumLoader.self) private var albumLoader
    @Environment(MapState.self) private var mapState

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let album = mapState.activeAlbums.first {
                let pois = albumLoader.pois(for: album)
                let segments = albumLoader.segments(for: album)
                let areas = albumLoader.areas(for: album)

                // List curation names - tappable with inline detail card
                ScrollViewReader { proxy in
                    ScrollView {
                        VStack(alignment: .leading, spacing: 4) {
                            if !areas.isEmpty {
                                ForEach(areas) { area in
                                    let isSelected = mapState.selectedArea?.id == area.id
                                    VStack(alignment: .leading, spacing: 4) {
                                        CurationListRow(
                                            name: area.name,
                                            icon: "square.on.square.dashed",
                                            isSelected: isSelected,
                                            hasSelection: mapState.hasSelection
                                        ) {
                                            if isSelected {
                                                mapState.clearSelection()
                                            } else {
                                                mapState.select(area: area)
                                            }
                                        }
                                        if isSelected {
                                            InlineDetailCard(
                                                subtitle: "",
                                                metadata: area.metadata,
                                                coordinate: nil,
                                                name: area.name
                                            )
                                        }
                                    }
                                    .id(area.id)
                                }
                            } else if !segments.isEmpty {
                                // If only one segment, always show its card (no selection UI)
                                let isSingleSegment = segments.count == 1
                                ForEach(segments) { segment in
                                    let isSelected = mapState.selectedSegment?.id == segment.id
                                    let showCard = isSingleSegment || isSelected
                                    VStack(alignment: .leading, spacing: 4) {
                                        CurationListRow(
                                            name: segment.name,
                                            icon: "point.topleft.down.to.point.bottomright.curvepath",
                                            isSelected: isSingleSegment ? false : isSelected,
                                            hasSelection: isSingleSegment ? false : mapState.hasSelection
                                        ) {
                                            if !isSingleSegment {
                                                if isSelected {
                                                    mapState.clearSelection()
                                                } else {
                                                    mapState.select(segment: segment)
                                                }
                                            }
                                        }
                                        if showCard {
                                            InlineDetailCard(
                                                subtitle: "",
                                                metadata: segment.metadata,
                                                coordinate: nil,
                                                name: segment.name
                                            )
                                        }
                                    }
                                    .id(segment.id)
                                }

                                // Show non-stop POIs alongside segments (filter out streetcar stops)
                                let nonStopPOIs = pois.filter { !$0.categories.contains(.streetcarStop) }
                                if !nonStopPOIs.isEmpty {
                                    Divider()
                                        .padding(.vertical, 8)

                                    ForEach(nonStopPOIs) { poi in
                                        let isSelected = mapState.selectedPOI?.id == poi.id
                                        VStack(alignment: .leading, spacing: 4) {
                                            CurationListRow(
                                                name: poi.name,
                                                icon: poi.categories.first?.icon ?? "mappin",
                                                isSelected: isSelected,
                                                hasSelection: mapState.hasSelection
                                            ) {
                                                if isSelected {
                                                    mapState.clearSelection()
                                                } else {
                                                    mapState.select(poi: poi)
                                                }
                                            }
                                            if isSelected {
                                                InlineDetailCard(
                                                    subtitle: "",
                                                    metadata: poi.metadata,
                                                    coordinate: poi.coordinate,
                                                    name: poi.name
                                                )
                                            }
                                        }
                                        .id(poi.id)
                                    }
                                }
                            } else {
                                // Filter out streetcar stops from POI list
                                let displayPOIs = pois.filter { !$0.categories.contains(.streetcarStop) }
                                ForEach(displayPOIs) { poi in
                                    let isSelected = mapState.selectedPOI?.id == poi.id
                                    VStack(alignment: .leading, spacing: 4) {
                                        CurationListRow(
                                            name: poi.name,
                                            icon: poi.categories.first?.icon ?? "mappin",
                                            isSelected: isSelected,
                                            hasSelection: mapState.hasSelection
                                        ) {
                                            if isSelected {
                                                mapState.clearSelection()
                                            } else {
                                                mapState.select(poi: poi)
                                            }
                                        }
                                        if isSelected {
                                            InlineDetailCard(
                                                subtitle: "",
                                                metadata: poi.metadata,
                                                coordinate: poi.coordinate,
                                                name: poi.name
                                            )
                                        }
                                    }
                                    .id(poi.id)
                                }
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .onChange(of: mapState.selectedPOI?.id) { _, newId in
                        if let id = newId {
                            withAnimation {
                                proxy.scrollTo(id, anchor: .top)
                            }
                        }
                    }
                    .onChange(of: mapState.selectedSegment?.id) { _, newId in
                        if let id = newId {
                            withAnimation {
                                proxy.scrollTo(id, anchor: .top)
                            }
                        }
                    }
                    .onChange(of: mapState.selectedArea?.id) { _, newId in
                        if let id = newId {
                            withAnimation {
                                proxy.scrollTo(id, anchor: .top)
                            }
                        }
                    }
                }
            } else {
                Text("No album selected")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Curation List Row

private struct CurationListRow: View {
    let name: String
    let icon: String
    let isSelected: Bool
    let hasSelection: Bool
    let onTap: () -> Void

    // SF Symbols contain ".", emojis don't
    private var isEmoji: Bool { !icon.contains(".") && icon.count <= 2 }

    var body: some View {
        Button(action: onTap) {
            HStack {
                if isEmoji {
                    Text(icon)
                    Text(name)
                        .font(.subheadline)
                } else {
                    Label(name, systemImage: icon)
                        .font(.subheadline)
                }
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.vertical, 4)
            .padding(.horizontal, 8)
            .background(isSelected ? Color.accentColor.opacity(0.1) : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain)
        .opacity(hasSelection && !isSelected ? 0.5 : 1.0)
    }
}

// MARK: - Labeled Field

private struct LabeledField: View {
    let label: String
    let value: String

    var body: some View {
        HStack(spacing: 4) {
            Text("\(label):")
                .font(.caption)
                .fontWeight(.semibold)
            Text(value)
                .font(.caption)
        }
    }
}

// MARK: - Inline Detail Card

private struct InlineDetailCard: View {
    let subtitle: String
    let metadata: [String: String]
    let coordinate: CLLocationCoordinate2D?
    let name: String

    var body: some View {
        HStack(alignment: .center, spacing: 8) {
            VStack(alignment: .leading, spacing: 4) {
                // Address
                if let address = metadata["address"] {
                    LabeledField(label: "Address", value: address)
                }

                // Neighborhood
                if let hood = metadata["neighborhood"] {
                    LabeledField(label: "Neighborhood", value: hood)
                }

                // Acres (for areas)
                if let acres = metadata["acres"] {
                    LabeledField(label: "Acres", value: acres)
                }

                // Route (for segments)
                if let route = metadata["route"] {
                    LabeledField(label: "Route", value: route)
                }

                // Link (clickable)
                if let link = metadata["link"], let url = URL(string: link) {
                    HStack(spacing: 4) {
                        Text("Link:")
                            .font(.caption)
                            .fontWeight(.semibold)
                        Link(url.host ?? link, destination: url)
                            .font(.caption)
                    }
                }

                // Note (check both singular and plural keys)
                if let note = metadata["note"] ?? metadata["notes"] {
                    LabeledField(label: "Note", value: note)
                }

                // Subtitle for non-POI items
                if !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer()

            // Directions button - square icon only
            if coordinate != nil || metadata["address"] != nil {
                Button {
                    if let coord = coordinate {
                        openInMaps(name: name, coordinate: coord)
                    } else if let address = metadata["address"] {
                        openInMaps(address: address)
                    }
                } label: {
                    Image(systemName: "arrow.triangle.turn.up.right.diamond.fill")
                        .font(.system(size: 16))
                        .frame(width: 36, height: 36)
                        .background(Color.accentColor.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.accentColor.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .padding(.leading, 24)
    }

    private func openInMaps(name: String, coordinate: CLLocationCoordinate2D) {
        let placemark = MKPlacemark(coordinate: coordinate)
        let mapItem = MKMapItem(placemark: placemark)
        mapItem.name = name
        mapItem.openInMaps(launchOptions: [
            MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking
        ])
    }

    private func openInMaps(address: String) {
        let encoded = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? address
        if let url = URL(string: "maps://?daddr=\(encoded)") {
            UIApplication.shared.open(url)
        }
    }
}

#Preview {
    VStack {
        Spacer()
        CurationInfoPanel()
    }
    .environment(AlbumLoader())
    .environment(MapState())
}
