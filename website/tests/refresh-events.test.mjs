import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { refreshEvents } from '../scripts/refresh-events.mjs';

const EMPTY_MANUAL = { schemaVersion: 1, events: [], overrides: [] };

async function files(t, { manual = EMPTY_MANUAL, previous } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'mapsf-events-'));
  const manualPath = join(directory, 'manual.json');
  const previousPath = join(directory, 'previous.json');
  const outputPath = join(directory, 'output.json');
  await writeFile(manualPath, `${JSON.stringify(manual)}\n`);
  if (previous) await writeFile(previousPath, `${JSON.stringify(previous)}\n`);
  t.after(async () => {
    const { rm } = await import('node:fs/promises');
    await rm(directory, { recursive: true, force: true });
  });
  return { manualPath, previousPath, outputPath };
}

function priorEvent(overrides = {}) {
  return {
    id: 'demo:prior',
    title: 'Still upcoming',
    startAt: '2026-09-07T17:00:00-07:00',
    endAt: '2026-09-07T18:00:00-07:00',
    cost: { label: 'Cost not listed', isFree: false },
    source: { id: 'demo', name: 'Demo', url: 'https://example.org/prior' },
    curation: {
      type: 'Feature',
      properties: {
        name: 'Civic Center',
        layerType: 'poi',
        metadata: { address: 'Civic Center, San Francisco, CA' },
      },
      geometry: { type: 'Point', coordinates: [-122.4194, 37.7793] },
    },
    ...overrides,
  };
}

test('disabled sources never fetch and all-disabled refresh fabricates no events', async (t) => {
  const paths = await files(t);
  const snapshot = await refreshEvents({
    sources: [{
      id: 'disabled',
      name: 'Disabled',
      listingUrl: 'https://example.org/events',
      enabled: false,
      adapter: 'jsonld',
    }],
    fetchImpl: async () => { throw new Error('fetch must not run'); },
    now: new Date('2026-09-06T18:00:00Z'),
    ...paths,
  });

  assert.deepEqual(snapshot.sources, []);
  assert.deepEqual(snapshot.events, []);
  assert.equal(snapshot.generatedAt, null);
});

test('detail discovery is disabled unless an explicit page bound is configured', async (t) => {
  const paths = await files(t);
  let fetches = 0;
  const snapshot = await refreshEvents({
    sources: [{
      id: 'demo',
      name: 'Demo',
      listingUrl: 'https://example.org/events',
      approved: true, enabled: true,
      adapter: 'jsonld',
      detailPathPattern: /^\/events\//,
      maxEvents: 10,
    }],
    fetchImpl: async () => {
      fetches += 1;
      return new Response('<a href="/events/one">Event detail</a>');
    },
    now: new Date('2026-09-06T18:00:00Z'),
    ...paths,
  });

  assert.equal(fetches, 1);
  assert.equal(snapshot.sources[0].status, 'failed');
});

test('failed sources preserve unexpired events and original source freshness', async (t) => {
  const upcoming = priorEvent();
  const outside = priorEvent({
    id: 'demo:oakland',
    title: 'Across the bay',
    curation: {
      type: 'Feature',
      properties: {
        name: 'Oakland',
        layerType: 'poi',
        metadata: { address: 'Oakland, CA' },
      },
      geometry: { type: 'Point', coordinates: [-122.2712, 37.8044] },
    },
  });
  const expired = priorEvent({
    id: 'demo:expired',
    title: 'Already ended',
    startAt: '2026-09-05T17:00:00-07:00',
    endAt: '2026-09-05T18:00:00-07:00',
  });
  const previous = {
    schemaVersion: 1,
    generatedAt: '2026-09-05T18:00:00.000Z',
    sources: [{
      id: 'demo',
      name: 'Demo',
      url: 'https://example.org/events',
      status: 'ok',
      lastSuccessfulAt: '2026-09-05T18:00:00.000Z',
      eventCount: 3,
    }],
    events: [upcoming, outside, expired],
  };
  const paths = await files(t, { previous });

  const snapshot = await refreshEvents({
    sources: [{
      id: 'demo',
      name: 'Demo',
      listingUrl: 'https://example.org/events',
      approved: true, enabled: true,
      adapter: 'jsonld',
      maxEvents: 10,
    }],
    fetchImpl: async () => { throw new Error('upstream unavailable'); },
    now: new Date('2026-09-06T18:00:00Z'),
    ...paths,
  });

  assert.deepEqual(snapshot.events, [upcoming]);
  assert.deepEqual(snapshot.sources, [{
    id: 'demo',
    name: 'Demo',
    url: 'https://example.org/events',
    status: 'failed',
    lastSuccessfulAt: '2026-09-05T18:00:00.000Z',
    eventCount: 1,
    error: 'upstream unavailable',
  }]);
});

test('cancelled ids are tombstones even when another active source record fails validation', async (t) => {
  const previous = {
    schemaVersion: 1,
    generatedAt: '2026-09-05T18:00:00.000Z',
    sources: [{
      id: 'demo',
      name: 'Demo',
      url: 'https://example.org/events',
      status: 'ok',
      lastSuccessfulAt: '2026-09-05T18:00:00.000Z',
      eventCount: 1,
    }],
    events: [priorEvent()],
  };
  const manual = {
    schemaVersion: 1,
    events: [priorEvent()],
    overrides: [],
  };
  const paths = await files(t, { previous, manual });
  const mixed = `<script type="application/ld+json">${JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'Event',
      identifier: 'prior',
      name: 'Still upcoming',
      startDate: '2026-09-07T17:00:00-07:00',
      endDate: '2026-09-07T18:00:00-07:00',
      eventStatus: 'https://schema.org/EventCancelled',
      url: 'https://example.org/prior',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Event',
      identifier: 'broken-active',
      name: 'Broken active listing',
      startDate: '2026-09-07T19:00:00-07:00',
      endDate: '2026-09-07T20:00:00-07:00',
      url: 'https://example.org/broken-active',
    },
  ])}</script>`;

  const snapshot = await refreshEvents({
    sources: [{
      id: 'demo',
      name: 'Demo',
      listingUrl: 'https://example.org/events',
      approved: true, enabled: true,
      adapter: 'jsonld',
      maxEvents: 10,
    }],
    fetchImpl: async () => new Response(mixed),
    now: new Date('2026-09-06T18:00:00Z'),
    ...paths,
  });

  assert.deepEqual(snapshot.events, []);
  assert.equal(snapshot.sources[0].status, 'failed');
  assert.equal(snapshot.sources[0].lastSuccessfulAt, '2026-09-05T18:00:00.000Z');
  assert.deepEqual(snapshot.sources[0].cancelledInstances, [{
    id: 'demo:prior',
    startAt: '2026-09-07T17:00:00-07:00',
    endAt: '2026-09-07T18:00:00-07:00',
  }]);
});

test('a date-less cancellation derives a persistent instance without blocking a later reused id', async (t) => {
  const cancelledEvent = priorEvent();
  const source = {
    id: 'demo',
    name: 'Demo',
    listingUrl: 'https://example.org/events',
    approved: true, enabled: true,
    adapter: 'jsonld',
    maxEvents: 10,
  };
  const paths = await files(t, {
    manual: {
      schemaVersion: 1,
      events: [cancelledEvent],
      overrides: [],
    },
  });
  const cancellation = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Event',
    identifier: 'prior',
    name: 'Still upcoming',
    eventStatus: 'https://schema.org/EventCancelled',
    url: cancelledEvent.source.url,
  })}</script>`;

  const first = await refreshEvents({
    sources: [source],
    fetchImpl: async () => new Response(cancellation),
    now: new Date('2026-09-06T18:00:00Z'),
    ...paths,
  });
  assert.deepEqual(first.events, []);
  assert.deepEqual(first.sources[0].cancelledInstances, [{
    id: cancelledEvent.id,
    startAt: cancelledEvent.startAt,
    endAt: cancelledEvent.endAt,
  }]);

  const secondOutput = `${paths.outputPath}.second`;
  const second = await refreshEvents({
    sources: [source],
    fetchImpl: async () => { throw new Error('upstream unavailable'); },
    now: new Date('2026-09-06T19:00:00Z'),
    manualPath: paths.manualPath,
    previousPath: paths.outputPath,
    outputPath: secondOutput,
  });
  assert.deepEqual(second.events, []);
  assert.equal(second.sources[0].status, 'failed');
  assert.deepEqual(second.sources[0].cancelledInstances, first.sources[0].cancelledInstances);

  const laterOccurrence = priorEvent({
    startAt: '2026-09-08T17:00:00-07:00',
    endAt: '2026-09-08T18:00:00-07:00',
  });
  await writeFile(paths.manualPath, `${JSON.stringify({
    schemaVersion: 1,
    events: [laterOccurrence],
    overrides: [],
  })}\n`);
  const third = await refreshEvents({
    sources: [source],
    fetchImpl: async () => { throw new Error('upstream unavailable'); },
    now: new Date('2026-09-08T18:00:00Z'),
    manualPath: paths.manualPath,
    previousPath: secondOutput,
    outputPath: `${paths.outputPath}.third`,
  });
  assert.deepEqual(third.events, [laterOccurrence]);
  assert.equal(third.sources[0].cancelledInstances, undefined);
});

test('a source result with no valid geometry preserves the previous good snapshot', async (t) => {
  const upcoming = priorEvent();
  const previous = {
    schemaVersion: 1,
    generatedAt: '2026-09-05T18:00:00.000Z',
    sources: [{
      id: 'demo',
      name: 'Demo',
      url: 'https://example.org/events',
      status: 'ok',
      lastSuccessfulAt: '2026-09-05T18:00:00.000Z',
      eventCount: 1,
    }],
    events: [upcoming],
  };
  const paths = await files(t, { previous });
  const malformed = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Event',
    identifier: 'bad-coordinates',
    name: 'Malformed location',
    startDate: '2026-09-07T19:00:00-07:00',
    endDate: '2026-09-07T20:00:00-07:00',
    url: 'https://example.org/events/bad-coordinates',
    location: {
      '@type': 'Place',
      name: 'Unknown',
      address: 'Unknown',
      geo: { latitude: '', longitude: '' },
    },
  })}</script>`;
  const snapshot = await refreshEvents({
    sources: [{
      id: 'demo',
      name: 'Demo',
      listingUrl: 'https://example.org/events',
      approved: true, enabled: true,
      adapter: 'jsonld',
      maxEvents: 10,
    }],
    fetchImpl: async () => new Response(malformed),
    now: new Date('2026-09-06T18:00:00Z'),
    ...paths,
  });

  assert.deepEqual(snapshot.events, [upcoming]);
  assert.equal(snapshot.sources[0].status, 'failed');
  assert.equal(snapshot.sources[0].lastSuccessfulAt, '2026-09-05T18:00:00.000Z');
});

test('collected events outside the SF publication bounds are excluded without source failure', async (t) => {
  const paths = await files(t);
  const oakland = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Event',
    identifier: 'oakland',
    name: 'Oakland event',
    startDate: '2026-09-07T17:00:00-07:00',
    endDate: '2026-09-07T18:00:00-07:00',
    url: 'https://example.org/oakland',
    location: {
      '@type': 'Place',
      name: 'Oakland',
      address: 'Oakland, CA',
      geo: { longitude: -122.2712, latitude: 37.8044 },
    },
  })}</script>`;

  const snapshot = await refreshEvents({
    sources: [{
      id: 'demo',
      name: 'Demo',
      listingUrl: 'https://example.org/events',
      approved: true, enabled: true,
      adapter: 'jsonld',
      maxEvents: 10,
    }],
    fetchImpl: async () => new Response(oakland),
    now: new Date('2026-09-06T18:00:00Z'),
    ...paths,
  });

  assert.deepEqual(snapshot.events, []);
  assert.equal(snapshot.sources[0].status, 'ok');
});

test('manual overrides supply trusted geometry and explicit unknown cost labels', async (t) => {
  const manual = {
    schemaVersion: 1,
    events: [],
    overrides: [{
      id: 'demo:abc-123',
      cost: { label: 'Price not published', isFree: false },
      curation: {
        type: 'Feature',
        properties: {
          name: 'Main Library',
          layerType: 'poi',
          metadata: { address: '100 Larkin Street, San Francisco, CA' },
        },
        geometry: { type: 'Point', coordinates: [-122.4158, 37.7793] },
      },
    }],
  };
  const paths = await files(t, { manual });
  const html = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Event',
    identifier: 'abc-123',
    name: 'Author talk',
    startDate: '2026-09-06T19:00:00-07:00',
    endDate: '2026-09-06T20:00:00-07:00',
    url: 'https://example.org/events/abc-123',
    location: { '@type': 'Place', name: 'Main Library' },
  })}</script>`;
  const snapshot = await refreshEvents({
    sources: [{
      id: 'demo',
      name: 'Demo',
      listingUrl: 'https://example.org/events',
      approved: true, enabled: true,
      adapter: 'jsonld',
      maxEvents: 10,
    }],
    fetchImpl: async () => new Response(html, { status: 200 }),
    now: new Date('2026-09-06T18:00:00Z'),
    ...paths,
  });

  assert.equal(snapshot.events.length, 1);
  assert.equal(snapshot.events[0].id, 'demo:abc-123');
  assert.deepEqual(snapshot.events[0].cost, {
    label: 'Price not published',
    isFree: false,
  });
  assert.deepEqual(snapshot.events[0].curation.geometry, {
    type: 'Point',
    coordinates: [-122.4158, 37.7793],
  });
});

test('a manual event must reference an enabled source', async (t) => {
  const route = priorEvent({
    id: 'manual:parade-route',
    source: {
      id: 'manual',
      name: 'Owner curated',
      url: 'https://example.org/parade',
    },
  });
  const paths = await files(t, {
    manual: { schemaVersion: 1, events: [route], overrides: [] },
  });

  await assert.rejects(
    refreshEvents({
      sources: [],
      fetchImpl: async () => { throw new Error('fetch must not run'); },
      now: new Date('2026-09-06T18:00:00Z'),
      ...paths,
    }),
    /source is not enabled: manual/,
  );
});

test('an approved manual event retains full route geometry', async (t) => {
  const route = priorEvent({
    id: 'manual:parade-route',
    source: {
      id: 'manual',
      name: 'Owner curated',
      url: 'https://example.org/parade',
    },
    curation: {
      type: 'Feature',
      properties: {
        name: 'Parade route',
        layerType: 'segment',
        metadata: { address: 'Market Street, San Francisco, CA' },
      },
      geometry: {
        type: 'LineString',
        coordinates: [[-122.4194, 37.7749], [-122.4075, 37.7847]],
      },
    },
  });
  const paths = await files(t, {
    manual: { schemaVersion: 1, events: [route], overrides: [] },
  });

  const snapshot = await refreshEvents({
    sources: [{
      id: 'manual',
      name: 'Owner curated',
      listingUrl: 'https://example.org/events',
      approved: true, enabled: true,
      adapter: 'jsonld',
      allowEmpty: true,
      maxEvents: 10,
    }],
    fetchImpl: async () => new Response('<html><body>No automated listings</body></html>'),
    now: new Date('2026-09-06T18:00:00Z'),
    ...paths,
  });

  assert.deepEqual(snapshot.events[0].curation.geometry, route.curation.geometry);
});

test('SF bounds include crossing routes and enclosing areas but exclude an Oakland point', async (t) => {
  const route = priorEvent({
    id: 'manual:crossing-route',
    title: 'Crossing route',
    source: { id: 'manual', name: 'Owner curated', url: 'https://example.org/route' },
    curation: {
      type: 'Feature',
      properties: {
        name: 'Cross-city route',
        layerType: 'segment',
        metadata: { address: 'San Francisco, CA' },
      },
      geometry: {
        type: 'LineString',
        coordinates: [[-122.6, 37.77], [-122.3, 37.77]],
      },
    },
  });
  const area = priorEvent({
    id: 'manual:enclosing-area',
    title: 'Enclosing area',
    source: { id: 'manual', name: 'Owner curated', url: 'https://example.org/area' },
    curation: {
      type: 'Feature',
      properties: {
        name: 'Enclosing area',
        layerType: 'area',
        metadata: { address: 'San Francisco, CA' },
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-122.6, 37.65],
          [-122.3, 37.65],
          [-122.3, 37.9],
          [-122.6, 37.9],
          [-122.6, 37.65],
        ]],
      },
    },
  });
  const oakland = priorEvent({
    id: 'manual:oakland',
    title: 'Oakland point',
    source: { id: 'manual', name: 'Owner curated', url: 'https://example.org/oakland' },
    curation: {
      type: 'Feature',
      properties: {
        name: 'Oakland',
        layerType: 'poi',
        metadata: { address: 'Oakland, CA' },
      },
      geometry: { type: 'Point', coordinates: [-122.2712, 37.8044] },
    },
  });
  const paths = await files(t, {
    manual: { schemaVersion: 1, events: [route, area, oakland], overrides: [] },
  });

  const snapshot = await refreshEvents({
    sources: [{
      id: 'manual',
      name: 'Owner curated',
      listingUrl: 'https://example.org/events',
      approved: true, enabled: true,
      adapter: 'jsonld',
      allowEmpty: true,
      maxEvents: 10,
    }],
    fetchImpl: async () => new Response('<html><body>No automated listings</body></html>'),
    now: new Date('2026-09-06T18:00:00Z'),
    ...paths,
  });

  assert.deepEqual(new Set(snapshot.events.map((event) => event.id)), new Set([
    'manual:crossing-route',
    'manual:enclosing-area',
  ]));
  assert.deepEqual(snapshot.events.find((event) => event.id === route.id).curation.geometry, route.curation.geometry);
  assert.deepEqual(snapshot.events.find((event) => event.id === area.id).curation.geometry, area.curation.geometry);
});

test('manual overrides cannot change source attribution', async (t) => {
  const paths = await files(t, {
    manual: {
      schemaVersion: 1,
      events: [],
      overrides: [{
        id: 'demo:abc-123',
        source: {
          id: 'unapproved',
          name: 'Unapproved',
          url: 'https://unapproved.example/event',
        },
      }],
    },
  });

  await assert.rejects(
    refreshEvents({
      sources: [{
        id: 'demo',
        name: 'Demo',
        listingUrl: 'https://example.org/events',
        approved: true, enabled: true,
        adapter: 'jsonld',
      }],
      fetchImpl: async () => { throw new Error('fetch must not run'); },
      now: new Date('2026-09-06T18:00:00Z'),
      ...paths,
    }),
    /cannot change source attribution/,
  );
});

test('all explicitly cancelled source records may replace previous events with empty data', async (t) => {
  const previous = {
    schemaVersion: 1,
    generatedAt: '2026-09-05T18:00:00.000Z',
    sources: [{
      id: 'demo',
      name: 'Demo',
      url: 'https://example.org/events',
      status: 'ok',
      lastSuccessfulAt: '2026-09-05T18:00:00.000Z',
      eventCount: 1,
    }],
    events: [priorEvent()],
  };
  const paths = await files(t, { previous });
  const cancelled = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Event',
    identifier: 'prior',
    name: 'Still upcoming',
    startDate: '2026-09-07T17:00:00-07:00',
    endDate: '2026-09-07T18:00:00-07:00',
    eventStatus: 'https://schema.org/EventCancelled',
    url: 'https://example.org/prior',
  })}</script>`;

  const snapshot = await refreshEvents({
    sources: [{
      id: 'demo',
      name: 'Demo',
      listingUrl: 'https://example.org/events',
      approved: true, enabled: true,
      adapter: 'jsonld',
      maxEvents: 10,
    }],
    fetchImpl: async () => new Response(cancelled),
    now: new Date('2026-09-06T18:00:00Z'),
    ...paths,
  });

  assert.deepEqual(snapshot.events, []);
  assert.equal(snapshot.sources[0].status, 'ok');
  assert.equal(snapshot.sources[0].lastSuccessfulAt, '2026-09-06T18:00:00.000Z');
});

test('invalid manual data leaves the previous output file untouched', async (t) => {
  const previous = {
    schemaVersion: 1,
    generatedAt: null,
    sources: [],
    events: [],
  };
  const paths = await files(t, {
    manual: {
      schemaVersion: 1,
      events: [priorEvent({ startAt: '2026-09-07T17:00:00' })],
      overrides: [],
    },
  });
  await writeFile(paths.outputPath, `${JSON.stringify(previous)}\n`);

  await assert.rejects(
    refreshEvents({ sources: [], now: new Date('2026-09-06T18:00:00Z'), ...paths }),
    /Invalid manual event/,
  );

  assert.deepEqual(JSON.parse(await readFile(paths.outputPath, 'utf8')), previous);
});

const COVERAGE_SOURCE = { id: 'demo', name: 'Demo', listingUrl: 'https://example.org/events', approved: true, enabled: true, adapter: 'jsonld', allowEmpty: true };
const COVERAGE_NOW = new Date('2026-09-07T02:00:00Z');
async function coverageSnapshot(t, records = [], options = {}) {
  const paths = await files(t, options);
  return refreshEvents({ ...paths, sources: [COVERAGE_SOURCE], now: COVERAGE_NOW,
    fetchImpl: async () => new Response('<script type="application/ld+json">' + JSON.stringify(records) + '</script>'),
    ...options.refresh });
}
test('successful empty listing covers SF today, with explicit source check provenance', async (t) => {
  const snapshot = await coverageSnapshot(t);
  assert.deepEqual(snapshot.coverage, { dates: ['2026-09-06'] });
  assert.deepEqual(snapshot.sources[0].coverage, { dates: ['2026-09-06'], checkedAt: COVERAGE_NOW.toISOString() });
});
test('coverage tracks rejected and cancelled raw dates without filling future holes', async (t) => {
  const snapshot = await coverageSnapshot(t, [
    { '@type': 'Event', name: 'Missing geometry', startDate: '2026-09-08T19:00:00-07:00', endDate: '2026-09-08T20:00:00-07:00' },
    { '@type': 'Event', name: 'Cancelled', eventStatus: 'EventCancelled', startDate: '2026-09-10T19:00:00-07:00' },
    { '@type': 'Event', startDate: '2026-02-30T12:00:00Z' },
  ]);
  assert.deepEqual(snapshot.events, []);
  assert.deepEqual(snapshot.coverage.dates, ['2026-09-06', '2026-09-08', '2026-09-10']);
});
test('coverage expands overnight records in Pacific time with exclusive midnight ends', async (t) => {
  const snapshot = await coverageSnapshot(t, [
    { '@type': 'Event', startDate: '2026-09-09T06:00:00Z', endDate: '2026-09-09T09:00:00Z' },
    { '@type': 'Event', startDate: '2026-09-12T06:00:00Z', endDate: '2026-09-12T07:00:00Z' },
  ]);
  assert.deepEqual(snapshot.coverage.dates, ['2026-09-06', '2026-09-08', '2026-09-09', '2026-09-11']);
});
test('failed refresh preserves only active prior coverage with original check time and drops past days', async (t) => {
  const previous = { schemaVersion: 1, generatedAt: '2026-09-05T18:00:00Z', events: [], sources: [
    { id: 'demo', coverage: { dates: ['2026-09-05', '2026-09-08', 'invalid'], checkedAt: '2026-09-05T18:00:00Z' } },
    { id: 'disabled', coverage: { dates: ['2026-09-10'], checkedAt: '2026-09-05T18:00:00Z' } },
  ] };
  const snapshot = await coverageSnapshot(t, [], { previous, refresh: { fetchImpl: async () => { throw Error('unavailable'); } } });
  assert.deepEqual(snapshot.coverage, { dates: ['2026-09-08'] });
  assert.deepEqual(snapshot.sources[0].coverage, { dates: ['2026-09-08'], checkedAt: '2026-09-05T18:00:00Z' });
});
test('legacy snapshots, failed first fetches and all-disabled sources invent no coverage', async (t) => {
  const previous = { schemaVersion: 1, generatedAt: null, events: [priorEvent()], sources: [{ id: 'demo' }] };
  const failed = await coverageSnapshot(t, [], { previous, refresh: { fetchImpl: async () => { throw Error('unavailable'); } } });
  assert.deepEqual(failed.coverage, { dates: [] });
  const disabled = await coverageSnapshot(t, [], { previous, refresh: { sources: [] } });
  assert.deepEqual(disabled.coverage, { dates: [] });
});
test('coverage rejects invalid and distant dates and bounds unreasonable spans', async (t) => {
  const snapshot = await coverageSnapshot(t, [
    { '@type': 'Event', startDate: '2027-02-30T12:00:00Z' },
    { '@type': 'Event', startDate: '2099-09-06T12:00:00Z' },
    { '@type': 'Event', startDate: '2026-09-08T12:00:00Z', endDate: '2099-09-08T12:00:00Z' },
    { '@type': 'Event', startDate: '2026-09-09T12:00:00' },
  ]);
  assert.deepEqual(snapshot.coverage.dates, ['2026-09-06', '2026-09-08']);
});
test('a later detail failure discards partial newly checked coverage', async (t) => {
  const snapshot = await coverageSnapshot(t, [], { refresh: {
    sources: [{ ...COVERAGE_SOURCE, detailPathPattern: /^\/events\//, maxDetailPages: 2 }],
    fetchImpl: async (url) => {
      if (url.endsWith('/events')) return new Response('<a href="/events/first">First</a><a href="/events/second">Second</a>');
      if (url.endsWith('/first')) return new Response('<script type="application/ld+json">{"@type":"Event","startDate":"2026-09-08T12:00:00Z"}</script>');
      throw Error('second detail unavailable');
    },
  } });
  assert.equal(snapshot.sources[0].status, 'failed');
  assert.deepEqual(snapshot.coverage.dates, []);
});
test('a completed publisher check keeps fresh coverage when all events fail validation', async (t) => {
  const snapshot = await coverageSnapshot(t, [{ '@type': 'Event', name: 'No geometry', startDate: '2026-09-09T12:00:00-07:00' }], {
    refresh: { sources: [{ ...COVERAGE_SOURCE, allowEmpty: false }] },
  });
  assert.equal(snapshot.sources[0].status, 'failed');
  assert.equal(snapshot.sources[0].error, 'No valid events after validation');
  assert.deepEqual(snapshot.sources[0].coverage, { dates: ['2026-09-06', '2026-09-09'], checkedAt: COVERAGE_NOW.toISOString() });
});
test('30 Pacific calendar days bound published events and coverage across fall DST', async (t) => {
  const now = new Date('2026-10-15T18:00:00Z');
  const manual = { schemaVersion: 1, overrides: [], events: [
    priorEvent({ id: 'demo:last', startAt: '2026-11-13T23:30:00-08:00', endAt: '2026-11-14T00:30:00-08:00' }),
    priorEvent({ id: 'demo:outside', startAt: '2026-11-14T00:00:00-08:00', endAt: '2026-11-14T01:00:00-08:00' }),
  ] };
  const snapshot = await coverageSnapshot(t, [
    { '@type': 'Event', startDate: '2026-11-13T23:30:00-08:00', endDate: '2026-11-14T00:30:00-08:00' },
    { '@type': 'Event', startDate: '2026-11-14T00:00:00-08:00' },
  ], { manual, refresh: { now } });
  assert.deepEqual(snapshot.events.map(event => event.id), ['demo:last']);
  assert.deepEqual(snapshot.coverage.dates, ['2026-10-15', '2026-11-13']);
});
test('spring DST keeps the entire final Pacific calendar date inside the 30-day window', async (t) => {
  const now = new Date('2027-02-15T18:00:00Z');
  const snapshot = await coverageSnapshot(t, [
    { '@type': 'Event', startDate: '2027-03-17T06:30:00Z', endDate: '2027-03-17T07:30:00Z' },
    { '@type': 'Event', startDate: '2027-03-17T07:30:00Z' },
  ], { refresh: { now } });
  assert.deepEqual(snapshot.coverage.dates, ['2027-02-15', '2027-03-16']);
});

test('publisher addresses decode markup in both string and PostalAddress forms', async (t) => {
  for (const address of [
    '19th &amp; Dolores St, San Francisco, CA, 94110',
    { streetAddress: '19th &amp; Dolores St', addressLocality: 'San Francisco', addressRegion: 'CA', postalCode: '94110' },
  ]) {
    const paths = await files(t);
    const record = { '@type': 'Event', name: 'Park &amp; neighborhood event',
      url: 'https://example.org/events/park', startDate: '2026-09-07T13:00:00-07:00', endDate: '2026-09-07T15:00:00-07:00',
      location: {name: 'Dolores &#80;ark', address, geo: {latitude:37.7596,longitude:-122.4269}},
    };
    const snapshot = await refreshEvents({...paths,
      sources:[{id:'demo',name:'Demo',listingUrl:'https://example.org/events',approved:true,enabled:true,adapter:'jsonld',maxDetailPages:0}],
      now: new Date('2026-09-06T18:00:00Z'),
      fetchImpl: async () => new Response(`<script type="application/ld+json">${JSON.stringify(record)}</script>`),
    });
    assert.equal(snapshot.events.length, 1);
    assert.equal(snapshot.events[0].curation.properties.metadata.address, '19th & Dolores St, San Francisco, CA, 94110');
    assert.equal(snapshot.events[0].title, 'Park & neighborhood event');
    assert.equal(snapshot.events[0].curation.properties.name, 'Dolores Park');
  }
});

test('Mission Local stable API identity reconciles legacy cancellation before validation fallback', async t => {
  const legacy = priorEvent({id:'mission-local:legacy-hash',title:'Workshop',startAt:'2026-09-07T13:00:00-07:00',endAt:'2026-09-07T15:00:00-07:00',source:{id:'mission-local',name:'Mission Local',url:'https://missionlocal.org/event/workshop/'}});
  const paths=await files(t,{previous:{schemaVersion:1,generatedAt:'2026-09-06T17:00:00Z',sources:[{id:'mission-local',lastSuccessfulAt:'2026-09-06T17:00:00Z'}],events:[legacy]}});
  const sample=(id,title,url)=>({id,status:'publish',title,url,start_date:'2026-09-07 13:00:00',end_date:'2026-09-07 15:00:00',utc_start_date:'2026-09-07 20:00:00',utc_end_date:'2026-09-07 22:00:00',venue:{}});
  const snapshot=await refreshEvents({...paths,now:new Date('2026-09-06T18:00:00Z'),sources:[{id:'mission-local',name:'Mission Local',listingUrl:'https://missionlocal.org/events/',approved:true,enabled:true,adapter:'mission-local',collectionWindowDays:30}],fetchImpl:async url=>new Response(JSON.stringify({rest_url:url,total:2,total_pages:1,events:[sample(100,'Canceled: Workshop',legacy.source.url),sample(101,'Missing venue','https://missionlocal.org/event/unknown/')]}))});
  assert.equal(snapshot.events.length,0);
  assert.equal(snapshot.sources[0].cancelledInstances[0].id,'mission-local:100');
});
