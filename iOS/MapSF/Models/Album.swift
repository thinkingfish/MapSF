import Foundation

struct Album: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let description: String
    let coverMap: String
    let coverImage: String
    let dataFile: String
}

struct AlbumsContainer: Codable {
    let albums: [Album]
}
