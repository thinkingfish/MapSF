import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseJsonLdEvents, refreshEvents } from '../scripts/refresh-events.mjs';
import { sources } from '../config/sources.mjs';

test('approved Mission Local calendar publishes its real geometry and explicit event times', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'mapsf-publisher-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const manualPath = join(directory, 'manual.json');
  await writeFile(manualPath, JSON.stringify({ schemaVersion: 1, events: [], overrides: [] }));
  const fixture = await readFile(new URL('./fixtures/mission-local/event.html', import.meta.url), 'utf8');
  const source = sources.find((source) => source.id === 'mission-local');
  assert.equal(source.approved, true);
  assert.equal(source.enabled, true);
  const snapshot = await refreshEvents({
    sources: [source], manualPath, previousPath: join(directory, 'previous.json'),
    outputPath: join(directory, 'events.json'), now: new Date('2026-09-06T16:00:00Z'),
    fetchImpl: async (url) => {
      assert.equal(url, 'https://missionlocal.org/events/');
      return new Response(fixture);
    },
  });
  assert.equal(snapshot.events.length, 1);
  assert.equal(snapshot.sources[0].status, 'ok');
  const event = snapshot.events[0];
  assert.equal(event.startAt, '2026-09-06T10:00:00-07:00');
  assert.equal(event.endAt, '2026-09-06T12:00:00-07:00');
  assert.deepEqual(event.curation.geometry, { type: 'Point', coordinates: [-122.4182226, 37.7579453] });
  assert.equal(event.cost.isFree, false);
  assert.equal(event.source.url, parseJsonLdEvents(fixture)[0].url);
});

test('JSON-LD preserves embedded HTML entities until after parsing', () => {
  const raw = '<script type="application/ld+json">'+JSON.stringify({ '@type': 'Event', name: 'An &quot;evening&quot; of music' })+'</script>';
  assert.equal(parseJsonLdEvents(raw).length, 1);
});

test('an enabled but unapproved source never fetches', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'mapsf-approval-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const manualPath = join(directory, 'manual.json');
  await writeFile(manualPath, JSON.stringify({ schemaVersion: 1, events: [], overrides: [] }));
  const snapshot = await refreshEvents({
    sources: [{ id: 'unapproved', approved: false, enabled: true, adapter: 'jsonld', listingUrl: 'https://example.org/events' }],
    manualPath, previousPath: join(directory, 'previous.json'), outputPath: join(directory, 'events.json'),
    fetchImpl: async () => { throw new Error('must not fetch'); },
  });
  assert.deepEqual(snapshot.sources, []);
});
