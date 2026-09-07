export function filterEvents(events, { freeOnly = false } = {}) {
  return events.filter(event => !freeOnly || event.cost.isFree);
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
