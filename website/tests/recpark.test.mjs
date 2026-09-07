import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { collectRecpark } from '../scripts/adapters/recpark.mjs';
const fixture = (name) => readFile(new URL(`./fixtures/recpark/${name}.html`, import.meta.url), 'utf8');
const source = { listingUrl: 'https://sfrecpark.org/Calendar.aspx', maxDetailPages: 4 };
const now = new Date('2026-09-06T17:00:00Z');
async function collect(detail, listing, config = source) {
  const calls = [];
  const result = await collectRecpark(config, async (url) => {
    calls.push(String(url));
    return { ok: true, text: async () => String(url).includes('EID=') ? detail : listing };
  }, now);
  return { result, calls };
}
test('actual CivicPlus markup yields exact times, free cost and verified facility geometry', async () => {
  const { result, calls } = await collect(await fixture('detail'), await fixture('listing'));
  assert.equal(calls.length, 2);
  assert.equal(result.length, 1);
  const { record, pageUrl } = result[0];
  assert.equal(pageUrl, 'https://sfrecpark.org/Calendar.aspx?EID=10445');
  assert.equal(record.name, 'Golden Gate Bandshell: Crucial Reggae Sunday');
  assert.equal(record.startDate, '2026-09-06T16:30:00-07:00');
  assert.equal(record.endDate, '2026-09-06T19:30:00-07:00');
  assert.equal(record.offers.price, 0);
  const official = JSON.parse((await fixture('facility')).match(/value="([^"]+)"/)[1].replaceAll('&quot;', '"'))[0];
  assert.equal(record.location.geo.latitude, Number(official.Latitude));
  assert.equal(record.location.geo.longitude, Number(official.Longitude));
  assert.equal(record.location.geo.sourceUrl, 'https://sfrecpark.org/Facilities/Facility/Details/Golden-Gate-Bandshell-436');
});
test('missing time, unknown venue, or missing facility identity are omitted', async () => {
  const detail = await fixture('detail');
  for (const modified of [detail.replace('4:30 PM&thinsp;-&thinsp;7:30 PM', 'All Day'), detail.replaceAll('Golden Gate Bandshell', 'Unknown park'), detail.replace('Golden-Gate-Bandshell-436', 'Another-Park-999')]) {
    assert.deepEqual((await collect(modified, await fixture('listing'))).result, []);
  }
});
test('cancelled events retain cancellation status for collector rejection', async () => {
  const detail = (await fixture('detail')).replace('>Golden Gate Bandshell: Crucial Reggae Sunday</h2>', '>CANCELLED: Golden Gate Bandshell: Crucial Reggae Sunday</h2>');
  assert.equal((await collect(detail, await fixture('listing'))).result[0].record.eventStatus, 'https://schema.org/EventCancelled');
});
test('detail fetches are bounded and duplicate links collapse', async () => {
  const listing = await fixture('listing');
  const { calls } = await collect(await fixture('detail'), listing + listing + listing.replaceAll('10445', '10446'), { ...source, maxDetailPages: 1 });
  assert.equal(calls.length, 2);
});
test('winter dates use Pacific standard time', async () => {
  const detail = (await fixture('detail')).replaceAll('2026-09-06', '2026-12-06');
  assert.equal((await collect(detail, await fixture('listing'))).result[0].record.startDate, '2026-12-06T16:30:00-08:00');
});
test('missing start and conflicting displayed time do not acquire invented timestamps', async () => {
  const detail = await fixture('detail');
  for (const modified of [detail.replace('2026-09-06T16:30:00', ''), detail.replace('2026-09-06T16:30:00', '2026-09-06T15:30:00')]) {
    assert.deepEqual((await collect(modified, await fixture('listing'))).result, []);
  }
});
test('an earlier future listing cannot consume the cap ahead of today', async () => {
  const listing = await fixture('listing');
  const future = listing.replaceAll('10445', '10446').replaceAll('2026-09-06', '2026-09-17');
  const { calls } = await collect(await fixture('detail'), future + listing, { ...source, maxDetailPages: 1 });
  assert.equal(calls[1], 'https://sfrecpark.org/Calendar.aspx?EID=10445');
});
test('publisher HTTP failure fails the collection instead of claiming an empty day', async () => {
  await assert.rejects(collectRecpark(source, async () => ({ ok: false, status: 503 }), now), /503/);
});
test('past events consume no detail requests', async () => {
  const { calls, result } = await collect(await fixture('detail'), (await fixture('listing')).replaceAll('2026-09-06', '2026-09-05'));
  assert.equal(calls.length, 1);
  assert.deepEqual(result, []);
});
test('all publisher requests identify the collector and have an abort deadline', async () => {
  await collectRecpark(source, async (url, options) => {
    assert.match(options.headers['user-agent'], /MapSF/);
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: true, text: async () => '' };
  }, now);
});
test('refresh removes a previous event when cancellation loses time and location', async (t) => {
  const { refreshEvents } = await import('../scripts/refresh-events.mjs');
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const directory = await mkdtemp('/tmp/mapsf-recpark-cancel-');
  t.after(() => rm(directory, { recursive: true, force: true }));
  const manualPath = `${directory}/manual.json`;
  const outputPath = `${directory}/events.json`;
  await writeFile(manualPath, JSON.stringify({ schemaVersion: 1, events: [], overrides: [] }));
  const listing = await fixture('listing');
  let detail = await fixture('detail');
  const options = {
    sources: [{ ...source, id: 'recpark', name: 'SF Recreation & Parks', adapter: 'recpark', enabled: true, approved: true }],
    manualPath, outputPath, now,
    fetchImpl: async (url) => new Response(String(url).includes('EID=') ? detail : listing),
  };
  const first = await refreshEvents(options);
  assert.equal(first.events.length, 1);
  detail = detail.replace('>Golden Gate Bandshell: Crucial Reggae Sunday</h2>', '>CANCELLED: Golden Gate Bandshell: Crucial Reggae Sunday</h2>')
    .replace('4:30 PM&thinsp;-&thinsp;7:30 PM', 'Cancelled')
    .replace('2026-09-06T16:30:00', '')
    .replaceAll('Golden-Gate-Bandshell-436', 'removed');
  const second = await refreshEvents({ ...options, previousPath: outputPath });
  assert.deepEqual(second.events, []);
  assert.equal(second.sources[0].cancelledInstances[0].id, first.events[0].id);
});
test('maxEvents limits emitted records and stops further detail fetches', async () => {
  const listing = await fixture('listing');
  const { result, calls } = await collect(await fixture('detail'), listing + listing.replaceAll('10445', '10446'), { ...source, maxEvents: 1 });
  assert.equal(result.length, 1);
  assert.equal(calls.length, 2);
});
