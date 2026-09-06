import test from 'node:test';
import assert from 'node:assert/strict';
import { filterEvents, geometryBounds } from '../src/client/view-model.mjs';

const events = [
  { id: 'a', title: 'Garden walk', cost: { isFree: true }, curation: { properties: { name: 'Botanical Garden', layerType: 'area', metadata: { address: '1199 9th Avenue' } } } },
  { id: 'b', title: 'Waterfront run', cost: { isFree: false }, curation: { properties: { name: 'Embarcadero', layerType: 'segment' } } },
  { id: 'c', title: 'Reading', cost: { isFree: true }, curation: { properties: { name: 'Main Library', layerType: 'poi' } } },
];
test('search finds venue and address, ignores case and surrounding whitespace', () => {
  assert.deepEqual(filterEvents(events, { search: '  BOTANICAL ' }).map(e => e.id), ['a']);
  assert.deepEqual(filterEvents(events, { search: '9th Avenue' }).map(e => e.id), ['a']);
});
test('free and geometry filters combine with the search', () => {
  assert.deepEqual(filterEvents(events, { freeOnly: true, geometry: 'poi' }).map(e => e.id), ['c']);
  assert.deepEqual(filterEvents(events, { freeOnly: true, search: 'Waterfront' }), []);
});
test('geometry bounds include every route vertex and polygon ring', () => {
  assert.deepEqual(geometryBounds({ type: 'LineString', coordinates: [[-122.5, 37.7], [-122.4, 37.8], [-122.45, 37.9]] }), [[-122.5, 37.7], [-122.4, 37.9]]);
  assert.deepEqual(geometryBounds({ type: 'Polygon', coordinates: [[[-122.5, 37.7], [-122.4, 37.8], [-122.45, 37.9], [-122.5, 37.7]]] }), [[-122.5, 37.7], [-122.4, 37.9]]);
});
