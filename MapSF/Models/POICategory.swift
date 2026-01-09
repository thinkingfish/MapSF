import SwiftUI

enum POICategory: String, CaseIterable, Codable {
    case bookstore
    case iceCream = "ice-cream"
    case burger
    case bathroom
    case coffee
    case bar
    case landmark

    var icon: String {
        switch self {
        case .bookstore: return "book.fill"
        case .iceCream: return "snowflake"
        case .burger: return "fork.knife"
        case .bathroom: return "toilet.fill"
        case .coffee: return "cup.and.saucer.fill"
        case .bar: return "wineglass.fill"
        case .landmark: return "star.fill"
        }
    }

    var displayName: String {
        switch self {
        case .bookstore: return "Bookstore"
        case .iceCream: return "Ice Cream"
        case .burger: return "Burger"
        case .bathroom: return "Bathroom"
        case .coffee: return "Coffee"
        case .bar: return "Bar"
        case .landmark: return "Landmark"
        }
    }
}
