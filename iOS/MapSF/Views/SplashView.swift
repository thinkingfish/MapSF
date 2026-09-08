import SwiftUI

struct SplashView: View {
    @Binding var isVisible: Bool
    @Binding var contentReady: Bool

    @State private var scale: CGFloat = 0.6
    @State private var opacity: Double = 0
    @State private var minimumTimePassed = false

    private let entryDuration: Double = 0.8
    private let exitDuration: Double = 0.5
    private let minimumDisplayTime: Double = 1.2

    // Warm cream color matching cover.png edges
    private let backgroundColor = Color(red: 249/255, green: 249/255, blue: 236/255)

    var body: some View {
        ZStack {
            backgroundColor
                .ignoresSafeArea()

            Image("Cover")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .padding(40)
                .scaleEffect(scale)
                .opacity(opacity)
        }
        .onAppear {
            // Entry animation: scale + fade
            withAnimation(.easeOut(duration: entryDuration)) {
                scale = 1.0
                opacity = 1.0
            }

            // Track minimum display time
            Task {
                try? await Task.sleep(for: .seconds(minimumDisplayTime))
                minimumTimePassed = true
                checkDismiss()
            }
        }
        .onChange(of: contentReady) { _, _ in
            checkDismiss()
        }
    }

    private func checkDismiss() {
        guard minimumTimePassed && contentReady else { return }

        withAnimation(.easeInOut(duration: exitDuration)) {
            isVisible = false
        }
    }
}

#Preview {
    SplashView(isVisible: .constant(true), contentReady: .constant(false))
}
