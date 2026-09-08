import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createBasemapStyle } from '../src/lib/basemap-style.mjs';

// Use the same style validator as the installed renderer.
const require = createRequire(import.meta.resolve('maplibre-gl'));
const { validateStyleMin } = require('@maplibre/maplibre-gl-style-spec');
const release = { version: '20260907-test', bounds: [-122.65, 37.6, -122.2, 37.95], minzoom: 8, maxzoom: 15 };

test('local vector style is valid for MapLibre and confines tile requests to the release', () => {
  const style = createBasemapStyle(release);
  assert.deepEqual(validateStyleMin(style), []);
  assert.equal(style.sources.basemap.type, 'vector');
  assert.deepEqual(style.sources.basemap.tiles, ['/basemap/20260907-test/{z}/{x}/{y}.pbf']);
  assert.deepEqual(style.sources.basemap.bounds, release.bounds);
  assert.equal(style.sources.basemap.minzoom, 8);
  assert.equal(style.sources.basemap.maxzoom, 15);
  assert.equal(style.glyphs, '/basemap/20260907-test/fonts/{fontstack}/{range}.pbf');
  assert.equal(style.sprite, undefined);
  assert.match(style.sources.basemap.attribution, /OpenStreetMap/);
  assert.match(style.sources.basemap.attribution, /Protomaps/);
});
