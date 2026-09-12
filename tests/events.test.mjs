import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dedupeEvents,
  eventsForDay,
  sfDate,
  validateEvent,
} from '../src/lib/events.mjs';

function event(overrides = {}) {
  return {
    id: 'source:event-1',
    title: 'Neighborhood walk',
    startAt: '2026-09-06T23:30:00-07:00',
    endAt: '2026-09-07T01:15:00-07:00',
    cost: { label: 'Cost not listed', isFree: false },
    source: {
      id: 'source',
      name: 'Source',
      url: 'https://example.org/events/1',
    },
    curation: {
      type: 'Feature',
      properties: {
        name: 'Starting point',
        layerType: 'poi',
        category: 'community',
        metadata: { address: '1 Market Street, San Francisco, CA' },
      },
      geometry: { type: 'Point', coordinates: [-122.394, 37.795] },
    },
    ...overrides,
  };
}

test('sfDate uses San Francisco midnight on DST transition dates', () => {
  assert.equal(sfDate(new Date('2026-03-08T07:59:59Z')), '2026-03-07');
  assert.equal(sfDate(new Date('2026-03-08T08:00:00Z')), '2026-03-08');
  assert.equal(sfDate(new Date('2026-11-01T06:59:59Z')), '2026-10-31');
  assert.equal(sfDate(new Date('2026-11-01T07:00:00Z')), '2026-11-01');
});

test('eventsForDay includes overnight intervals on both local dates', () => {
  const overnight = event();
  assert.deepEqual(eventsForDay([overnight], '2026-09-06'), [overnight]);
  assert.deepEqual(eventsForDay([overnight], '2026-09-07'), [overnight]);
});

test('eventsForDay treats an end exactly at midnight as exclusive', () => {
  const untilMidnight = event({
    startAt: '2026-09-06T22:00:00-07:00',
    endAt: '2026-09-07T00:00:00-07:00',
  });
  assert.deepEqual(eventsForDay([untilMidnight], '2026-09-07'), []);
});

test('validateEvent accepts iOS-compatible point, segment, and area curations', () => {
  const point = event();
  const segment = event({
    id: 'source:segment',
    curation: {
      type: 'Feature',
      properties: {
        name: 'Parade route',
        layerType: 'segment',
        metadata: { address: 'Market Street, San Francisco, CA' },
      },
      geometry: {
        type: 'LineString',
        coordinates: [[-122.419, 37.775], [-122.407, 37.785]],
      },
    },
  });
  const area = event({
    id: 'source:area',
    curation: {
      type: 'Feature',
      properties: {
        name: 'Festival grounds',
        layerType: 'area',
        metadata: { address: 'Civic Center Plaza, San Francisco, CA' },
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-122.419, 37.779],
          [-122.416, 37.779],
          [-122.416, 37.777],
          [-122.419, 37.779],
        ]],
      },
    },
  });

  assert.equal(validateEvent(point), true);
  assert.equal(validateEvent(segment), true);
  assert.equal(validateEvent(area), true);
});

test('validateEvent accepts iOS category arrays and requires string metadata values', () => {
  const categories = event({
    curation: {
      type: 'Feature',
      properties: {
        name: 'Library',
        layerType: 'poi',
        category: ['community', 'arts'],
        metadata: {
          address: '100 Larkin Street, San Francisco, CA',
          accessibility: 'Wheelchair accessible',
        },
      },
      geometry: { type: 'Point', coordinates: [-122.4158, 37.7793] },
    },
  });
  const nonStringMetadata = event({
    curation: {
      type: 'Feature',
      properties: {
        name: 'Library',
        layerType: 'poi',
        metadata: {
          address: '100 Larkin Street, San Francisco, CA',
          floor: 2,
        },
      },
      geometry: { type: 'Point', coordinates: [-122.4158, 37.7793] },
    },
  });

  assert.equal(validateEvent(categories), true);
  assert.equal(validateEvent(nonStringMetadata), false);
});

test('validateEvent rejects mismatched or malformed geometry', () => {
  const mismatch = event({
    curation: {
      type: 'Feature',
      properties: {
        name: 'Wrong type',
        layerType: 'poi',
        metadata: { address: 'San Francisco, CA' },
      },
      geometry: {
        type: 'LineString',
        coordinates: [[-122.42, 37.77], [-122.41, 37.78]],
      },
    },
  });
  const openPolygon = event({
    curation: {
      type: 'Feature',
      properties: {
        name: 'Open area',
        layerType: 'area',
        metadata: { address: 'San Francisco, CA' },
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-122.42, 37.77],
          [-122.41, 37.77],
          [-122.41, 37.78],
          [-122.42, 37.78],
        ]],
      },
    },
  });
  const badCoordinate = event({
    curation: {
      type: 'Feature',
      properties: {
        name: 'Outside Earth',
        layerType: 'poi',
        metadata: { address: 'San Francisco, CA' },
      },
      geometry: { type: 'Point', coordinates: [-222.4, 37.8] },
    },
  });

  assert.equal(validateEvent(mismatch), false);
  assert.equal(validateEvent(openPolygon), false);
  assert.equal(validateEvent(badCoordinate), false);
});

test('validateEvent requires explicit offsets, ordered times, and safe source links', () => {
  assert.equal(validateEvent(event({ startAt: '2026-09-06T23:30:00' })), false);
  assert.equal(validateEvent(event({ endAt: '2026-09-06T23:00:00-07:00' })), false);
  assert.equal(validateEvent(event({
    source: { id: 'source', name: 'Source', url: 'javascript:alert(1)' },
  })), false);
});

test('validateEvent rejects impossible calendar components and accepts leap day', () => {
  assert.equal(validateEvent(event({
    startAt: '2026-02-30T13:00:00-08:00',
    endAt: '2026-02-30T18:00:00-08:00',
  })), false);
  assert.equal(validateEvent(event({
    startAt: '2027-02-29T13:00:00-08:00',
    endAt: '2027-02-29T18:00:00-08:00',
  })), false);
  assert.equal(validateEvent(event({
    startAt: '2028-02-29T13:00:00-08:00',
    endAt: '2028-02-29T18:00:00-08:00',
  })), true);
  assert.equal(validateEvent(event({
    startAt: '2026-09-06T24:00:00-07:00',
    endAt: '2026-09-07T01:00:00-07:00',
  })), false);
  assert.equal(validateEvent(event({
    startAt: '2026-09-06T13:00:00+14:30',
    endAt: '2026-09-06T14:00:00+14:30',
  })), false);
});

test('dedupeEvents removes same-id and cross-source duplicate listings deterministically', () => {
  const first = event();
  const sameId = event();
  const crossSource = event({
    id: 'other:event-9',
    source: { id: 'other', name: 'Other', url: 'https://other.example/events/9' },
  });
  const later = event({
    id: 'source:event-2',
    title: 'Later event',
    startAt: '2026-09-07T12:00:00-07:00',
    endAt: '2026-09-07T13:00:00-07:00',
  });

  assert.deepEqual(dedupeEvents([later, sameId, crossSource, first]), [sameId, later]);
});

test('dedupeEvents compares and sorts timestamps by instant rather than offset text', () => {
  const original = event();
  const sameInstants = event({
    id: 'other:event-9',
    startAt: '2026-09-07T00:30:00-06:00',
    endAt: '2026-09-07T02:15:00-06:00',
    source: { id: 'other', name: 'Other', url: 'https://other.example/events/9' },
  });
  assert.deepEqual(dedupeEvents([sameInstants, original]), [sameInstants]);

  const earlier = event({
    id: 'source:earlier',
    title: 'Earlier in absolute time',
    startAt: '2026-09-07T00:00:00+01:00',
    endAt: '2026-09-07T00:30:00+01:00',
  });
  assert.deepEqual(dedupeEvents([original, earlier]), [earlier, original]);
});

test('direct sources win duplicate occurrences regardless of collection order', () => {
  const publisher = event({id: 'mission-local:show', source: {id:'mission-local',name:'Mission Local',url:'https://missionlocal.org/event/show/'}});
  const direct = event({id:'sf-shakes:show', source:{id:'sf-shakes',name:'SF Shakes',url:'https://sfshakes.org/performance/free-shakes/ac/'}});
  assert.deepEqual(dedupeEvents([publisher,direct]), [direct]);
  assert.deepEqual(dedupeEvents([direct,publisher]), [direct]);
  const secondShow = {...direct,id:'sf-shakes:second',startAt:'2026-09-07T23:30:00-07:00',endAt:'2026-09-08T01:15:00-07:00'};
  assert.deepEqual(dedupeEvents([publisher,direct,secondShow]), [direct,secondShow]);
  const otherVenue = event({id:'mission-local:elsewhere',source:publisher.source,curation:{...publisher.curation,geometry:{type:'Point',coordinates:[-122.42,37.76]}}});
  assert.equal(dedupeEvents([direct,otherVenue]).length,2);
  assert.deepEqual(dedupeEvents([publisher,{...direct,startAt:'bad'}]),[publisher]);
});
