export function filterEvents(events, { freeOnly = false, excludedSourceIds = [], mapBounds = null } = {}) {
  return events.filter(event => (!freeOnly || event.cost.isFree)
    && (!excludedSourceIds.length || event.recurring || !excludedSourceIds.includes(event.source.id))
    && (!mapBounds || geometryIntersectsBounds(event.curation.geometry, mapBounds)));
}

// Clip each segment against the viewport; a bounding-box overlap alone can
// include a route that never actually enters the visible region.
function segmentIntersectsBounds(a, b, [[west, south], [east, north]]) {
  let start = 0, end = 1;
  for (const [origin, delta, low, high] of [
    [a[0], b[0] - a[0], west, east], [a[1], b[1] - a[1], south, north],
  ]) {
    if (delta === 0) { if (origin < low || origin > high) return false; }
    else {
      const first = (low - origin) / delta, last = (high - origin) / delta;
      start = Math.max(start, Math.min(first, last));
      end = Math.min(end, Math.max(first, last));
      if (start > end) return false;
    }
  }
  return true;
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i], [bx, by] = ring[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

export function geometryIntersectsBounds(geometry, bounds) {
  const [[west, south], [east, north]] = bounds;
  const contains = ([x, y]) => x >= west && x <= east && y >= south && y <= north;
  if (geometry.type === "Point") return contains(geometry.coordinates);
  const paths = geometry.type === "LineString" ? [geometry.coordinates] : geometry.coordinates;
  if (paths.some(path => path.some(contains)
    || path.some((point, index) => index > 0 && segmentIntersectsBounds(path[index - 1], point, bounds)))) return true;
  if (geometry.type !== "Polygon") return false;
  // With no edge intersection, the viewport can still lie inside the area.
  return pointInRing([west, south], paths[0]) && !paths.slice(1).some(ring => pointInRing([west, south], ring));
}

export function geometryBounds(geometry) {
  const points =
    geometry.type === "Point"
      ? [geometry.coordinates]
      : geometry.type === "LineString"
        ? geometry.coordinates
        : geometry.coordinates.flat();
  return points.reduce(
    ([min, max], [x, y]) => [
      [Math.min(min[0], x), Math.min(min[1], y)],
      [Math.max(max[0], x), Math.max(max[1], y)],
    ],
    [
      [Infinity, Infinity],
      [-Infinity, -Infinity],
    ],
  );
}
