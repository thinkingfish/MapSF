import Foundation
import CoreLocation

enum Curation {
    case segment(SegmentData)
    case poi(POIData)
    case area(AreaData)
}
