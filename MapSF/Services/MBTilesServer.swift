import Foundation
import Network
import SQLite3

/// Local HTTP server that serves vector tiles from an MBTiles file
/// MapLibre Native bypasses NSURLProtocol, so we need an actual HTTP server
final class MBTilesServer {
    static let shared = MBTilesServer()

    private var listener: NWListener?
    private var db: OpaquePointer?
    private let queue = DispatchQueue(label: "com.mapsf.tileserver")
    private(set) var port: UInt16 = 0

    private init() {}

    /// Start the server with the given mbtiles file
    /// Returns the base URL for tile requests (e.g., "http://localhost:8765")
    func start(mbtilesPath: String) -> String? {
        // Open database
        guard openDatabase(at: mbtilesPath) else {
            print("[TileServer] Failed to open database")
            return nil
        }

        // Create listener on random available port
        do {
            let params = NWParameters.tcp
            params.allowLocalEndpointReuse = true

            listener = try NWListener(using: params, on: .any)
        } catch {
            print("[TileServer] Failed to create listener: \(error)")
            return nil
        }

        listener?.stateUpdateHandler = { [weak self] state in
            switch state {
            case .ready:
                if let port = self?.listener?.port?.rawValue {
                    self?.port = port
                }
            case .failed(let error):
                print("[TileServer] Failed: \(error)")
            default:
                break
            }
        }

        listener?.newConnectionHandler = { [weak self] connection in
            self?.handleConnection(connection)
        }

        listener?.start(queue: queue)

        // Wait briefly for port assignment
        Thread.sleep(forTimeInterval: 0.1)

        guard port > 0 else {
            print("[TileServer] Port not assigned")
            return nil
        }

        return "http://127.0.0.1:\(port)"
    }

    func stop() {
        listener?.cancel()
        listener = nil

        if let db = db {
            sqlite3_close(db)
            self.db = nil
        }
    }

    // MARK: - Database

    private func openDatabase(at path: String) -> Bool {
        let flags = SQLITE_OPEN_READONLY | SQLITE_OPEN_NOMUTEX
        guard sqlite3_open_v2(path, &db, flags, nil) == SQLITE_OK else {
            print("[TileServer] Cannot open: \(path)")
            return false
        }
        return true
    }

    // MARK: - Connection Handling

    private func handleConnection(_ connection: NWConnection) {
        connection.start(queue: queue)

        // Read request
        connection.receive(minimumIncompleteLength: 1, maximumLength: 4096) { [weak self] data, _, _, error in
            guard let self = self, let data = data, error == nil else {
                connection.cancel()
                return
            }

            guard let request = String(data: data, encoding: .utf8) else {
                self.sendError(connection, status: 400, message: "Bad Request")
                return
            }

            self.handleRequest(request, connection: connection)
        }
    }

    private func handleRequest(_ request: String, connection: NWConnection) {
        // Parse GET /z/x/y HTTP/1.1
        let lines = request.split(separator: "\r\n")
        guard let requestLine = lines.first else {
            sendError(connection, status: 400, message: "Bad Request")
            return
        }

        let parts = requestLine.split(separator: " ")
        guard parts.count >= 2, parts[0] == "GET" else {
            sendError(connection, status: 400, message: "Bad Request")
            return
        }

        let path = String(parts[1])

        // Parse /z/x/y or /z/x/y.pbf
        let pathParts = path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            .replacingOccurrences(of: ".pbf", with: "")
            .split(separator: "/")

        guard pathParts.count == 3,
              let z = Int(pathParts[0]),
              let x = Int(pathParts[1]),
              let y = Int(pathParts[2]) else {
            sendError(connection, status: 400, message: "Invalid path")
            return
        }

        // Fetch and send tile
        if let tileData = fetchTile(z: z, x: x, y: y) {
            sendTile(connection, data: tileData)
        } else {
            sendEmpty(connection)
        }
    }

    // MARK: - Tile Fetching

    private func fetchTile(z: Int, x: Int, y: Int) -> Data? {
        guard let db = db else { return nil }

        // MBTiles uses TMS coordinate system (y is flipped)
        let tmsY = (1 << z) - 1 - y

        let query = "SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?"
        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, query, -1, &statement, nil) == SQLITE_OK else {
            return nil
        }

        defer { sqlite3_finalize(statement) }

        sqlite3_bind_int(statement, 1, Int32(z))
        sqlite3_bind_int(statement, 2, Int32(x))
        sqlite3_bind_int(statement, 3, Int32(tmsY))

        if sqlite3_step(statement) == SQLITE_ROW {
            guard let blob = sqlite3_column_blob(statement, 0) else {
                return nil
            }
            let blobSize = sqlite3_column_bytes(statement, 0)
            return Data(bytes: blob, count: Int(blobSize))
        }

        return nil
    }

    // MARK: - Response Helpers

    private func sendTile(_ connection: NWConnection, data: Data) {
        // Check if data is gzip compressed (starts with 0x1f 0x8b)
        let isGzipped = data.count >= 2 && data[0] == 0x1f && data[1] == 0x8b

        var header = "HTTP/1.1 200 OK\r\n"
        header += "Content-Type: application/x-protobuf\r\n"
        if isGzipped {
            header += "Content-Encoding: gzip\r\n"
        }
        header += "Content-Length: \(data.count)\r\n"
        header += "Access-Control-Allow-Origin: *\r\n"
        header += "Cache-Control: max-age=86400\r\n"
        header += "\r\n"

        var response = header.data(using: .utf8)!
        response.append(data)

        connection.send(content: response, completion: .contentProcessed { _ in
            connection.cancel()
        })
    }

    private func sendEmpty(_ connection: NWConnection) {
        let response = "HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\n\r\n"

        connection.send(content: response.data(using: .utf8), completion: .contentProcessed { _ in
            connection.cancel()
        })
    }

    private func sendError(_ connection: NWConnection, status: Int, message: String) {
        var response = "HTTP/1.1 \(status) \(message)\r\n"
        response += "Content-Type: text/plain\r\n"
        response += "Content-Length: \(message.count)\r\n"
        response += "\r\n"
        response += message

        connection.send(content: response.data(using: .utf8), completion: .contentProcessed { _ in
            connection.cancel()
        })
    }
}
