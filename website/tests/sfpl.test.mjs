import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { collectSfpl } from '../scripts/adapters/sfpl.mjs';
const fixture = async (name) => readFile(new URL(`./fixtures/sfpl/${name}`, import.meta.url), 'utf8');
const source = { listingUrl: 'https://sfpl.org/events', maxDetailPages: 4, maxEvents: 100 };
async function run(change = {}, options = {}) {
  const pages = { listing: await fixture('listing.html'), detail: await fixture('detail.html'), calendar: await fixture('calendar.ics'), ...change };
  const calls = [];
  const fetch = async (url) => {
    calls.push(String(url));
    const kind = String(url).includes('add-to-calendar') ? 'calendar' : new URL(url).pathname === '/events' ? 'listing' : 'detail';
    return { ok: true, text: async () => pages[kind] };
  };
  return { events: await collectSfpl({ ...source, ...options }, fetch, new Date('2026-09-06T02:00:00Z')), calls };
}
test('SFPL joins exact source branch coordinates and uses UTC calendar times over ambiguous display', async () => {
  const { events, calls } = await run();
  assert.equal(events.length, 1);
  const {record, pageUrl} = events[0];
  assert.equal(record.startDate, '2026-09-08T16:00:00Z');
  assert.equal(record.endDate, '2026-09-09T00:00:00Z');
  assert.equal(record.location.name, 'Main Library');
  assert.deepEqual(record.location.geo, { latitude: 37.779081, longitude: -122.415771 });
  assert.match(record.location.address, /100 Larkin Street/);
  assert.equal(record.identifier, '162171@sfpl.org');
  assert.equal(record.url, pageUrl);
  assert.equal(record.offers, undefined);
  assert.match(calls[0], /date-end-after=2026-09-05/);
});
test('missing dates, geometry, and non-UTC timestamps are rejected without inference', async () => {
  const calendar = await fixture('calendar.ics');
  assert.equal((await run({ calendar: calendar.replace(/^DTSTART:.*\n/m, '') })).events.length, 0);
  assert.equal((await run({ calendar: calendar.replace('DTSTART:20260908T160000Z', 'DTSTART:20260908T160000') })).events.length, 0);
  assert.equal((await run({ listing: (await fixture('listing.html')).replace('data-lat="37.779081"', '') })).events.length, 0);
});
test('cancelled publisher calendar is retained as cancelled for normalization', async () => {
  const { events } = await run({calendar: (await fixture('calendar.ics')).replace('BEGIN:VEVENT', 'BEGIN:VEVENT\nSTATUS:CANCELLED')});
  assert.equal(events[0].record.eventStatus, 'https://schema.org/EventCancelled');
});
test('request budget covers both detail and calendar requests; ended events omitted', async () => {
  assert.equal((await run({}, {maxDetailPages:1})).calls.length, 1);
  assert.equal((await run({}, {maxDetailPages:2})).calls.length, 3);
  const calendar = (await fixture('calendar.ics')).replaceAll('20260908', '20260901').replaceAll('20260909', '20260902');
  assert.equal((await run({calendar})).events.length, 0);
});
test('actual SFPL Canceled title convention marks cancellation even without ICS STATUS', async () => {
  const detail = (await fixture('detail.html')).replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/, await fixture('cancelled-title.html'));
  const { events } = await run({detail});
  assert.equal(events[0].record.eventStatus, 'https://schema.org/EventCancelled');
});
test('listing starts at current SF wall time so ended daytime events cannot exhaust request budget', async () => {
  const { calls } = await run();
  assert.equal(new URL(calls[0]).searchParams.get('date-end-after'), '2026-09-05 19:00:00');
});
test('cancelled titles produce stable tombstones when venue and calendar dates are missing', async () => {
  const detail = (await fixture('detail.html')).replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/, await fixture('cancelled-title.html'));
  const { events } = await run({detail, listing: (await fixture('listing.html')).replace('data-lat="37.779081"', ''), calendar:''});
  assert.equal(events[0].record.identifier, '162171@sfpl.org');
  assert.equal(events[0].record.eventStatus, 'https://schema.org/EventCancelled');
});
test('ICS cancellation survives missing geometry', async () => {
  const { events } = await run({listing:(await fixture('listing.html')).replace('data-lat="37.779081"',''), calendar:(await fixture('calendar.ics')).replace('BEGIN:VEVENT','BEGIN:VEVENT\nSTATUS:CANCELLED')});
  assert.equal(events[0].record.identifier, '162171@sfpl.org');
  assert.equal(events[0].record.eventStatus, 'https://schema.org/EventCancelled');
});
test('free cost requires the explicit publisher listing policy', async () => {
  const { events } = await run({listing:(await fixture('listing.html')) + await fixture('free-policy.html')});
  assert.equal(events[0].record.isAccessibleForFree, true);
  assert.equal((await run()).events[0].record.isAccessibleForFree, undefined);
});
