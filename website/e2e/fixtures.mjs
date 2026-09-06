// Browser-only examples. This module is never imported into the public site/feed.
export const clock = new Date('2026-09-06T19:00:00Z');
const sample = (id, title, layerType, geometry, cost, name) => ({
  id, title, startAt: '2026-09-06T13:00:00-07:00', endAt: '2026-09-06T18:00:00-07:00',
  description: 'Example event used only for automated interface verification.',
  cost,
  source: { id: 'sfpl', name: 'SF Public Library', url: `https://sfpl.org/events/test-${id}` },
  curation: { type: 'Feature', geometry, properties: { name, layerType, metadata: { address: 'San Francisco, CA' } } },
});
export const feed = {
  schemaVersion: 1, generatedAt: '2026-09-06T13:17:00Z',
  sources: [{ id: 'sfpl', name: 'SF Public Library', url: 'https://sfpl.org/events', status: 'ok', lastSuccessfulAt: '2026-09-06T13:17:00Z', eventCount: 3 }],
  events: [
    sample('point-event', 'Example: Sunday at the library', 'poi', { type: 'Point', coordinates: [-122.4157,37.7793] }, { label: 'Free', isFree: true }, 'Main Library'),
    sample('route-event', 'Example: Waterfront history walk', 'segment', { type: 'LineString', coordinates: [[-122.3937,37.7955],[-122.399,37.802],[-122.409,37.808]] }, { label: '$12', isFree: false }, 'Embarcadero route'),
    sample('area-event', 'Example: An afternoon in the park', 'area', { type: 'Polygon', coordinates: [[[-122.433,37.769],[-122.424,37.769],[-122.424,37.776],[-122.433,37.776],[-122.433,37.769]]] }, { label: 'Cost not listed', isFree: false }, 'Neighborhood park'),
  ],
};
