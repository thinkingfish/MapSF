import SwiftUI

struct QuerySheet: View {
    @Environment(MapState.self) private var mapState

    var body: some View {
        @Bindable var state = mapState

        VStack(alignment: .leading, spacing: 20) {
            Text("What's nearby?")
                .font(.headline)

            // Distance picker
            VStack(alignment: .leading, spacing: 8) {
                Text("Distance")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Picker("Distance", selection: $state.queryRadius) {
                    ForEach(MapState.QueryRadius.allCases, id: \.self) { radius in
                        Text(radius.displayName).tag(radius)
                    }
                }
                .pickerStyle(.segmented)
            }

            // Category checkboxes
            VStack(alignment: .leading, spacing: 8) {
                Text("Show")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 8) {
                    ForEach(POICategory.allCases, id: \.self) { category in
                        CategoryToggle(
                            category: category,
                            isSelected: state.selectedCategories.contains(category)
                        ) {
                            if state.selectedCategories.contains(category) {
                                state.selectedCategories.remove(category)
                            } else {
                                state.selectedCategories.insert(category)
                            }
                        }
                    }
                }
            }

            Spacer()
        }
        .padding()
    }
}

struct CategoryToggle: View {
    let category: POICategory
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: isSelected ? "checkmark.square.fill" : "square")
                    .foregroundStyle(isSelected ? .blue : .secondary)
                Image(systemName: category.icon)
                Text(category.displayName)
                    .lineLimit(1)
                Spacer()
            }
            .font(.subheadline)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    QuerySheet()
        .environment(MapState())
        .presentationDetents([.medium])
}
