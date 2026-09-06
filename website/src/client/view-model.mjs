export function filterEvents(
  events,
  { search = "", freeOnly = false, geometry = "all" } = {},
) {
  const query = search.trim().toLocaleLowerCase();
  return events.filter((event) => {
    const properties = event.curation.properties;
    const searchable = [
      event.title,
      event.description,
      properties.name,
      properties.metadata?.address,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return (
      (!freeOnly || event.cost.isFree) &&
      (geometry === "all" || properties.layerType === geometry) &&
      (!query || searchable.includes(query))
    );
  });
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
