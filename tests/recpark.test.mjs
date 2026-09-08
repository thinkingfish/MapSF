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
    const { result } = await collect(modified, await fixture('listing'));
    assert.equal(result.length, 0);
    assert.ok(result.coverageDates.includes('2026-09-06'));
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
    const { result } = await collect(modified, await fixture('listing'));
    assert.equal(result.length, 0);
    assert.ok(result.coverageDates.includes('2026-09-06'));
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
  assert.equal(result.length, 0);
  assert.deepEqual(result.coverageDates, []);
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

test('coverage excludes dated links skipped by request and event budgets', async () => {
  const listing = await fixture('listing');
  const future = listing.replaceAll('10445', '10446').replaceAll('2026-09-06', '2026-09-17');
  for (const budget of [{ maxDetailPages: 1 }, { maxEvents: 1 }]) {
    const { result } = await collect(await fixture('detail'), listing + future, { ...source, ...budget });
    assert.deepEqual([...new Set(result.coverageDates)], ['2026-09-06']);
  }
});
test('Rec & Parks skips details beyond day 30 but requests the final included day', async () => {
  const listing = await fixture('listing');
  const inside = listing.replaceAll('2026-09-06', '2026-10-05');
  const outside = listing.replaceAll('10445', '10446').replaceAll('2026-09-06', '2026-10-06');
  const { calls } = await collect(await fixture('detail'), outside + inside);
  assert.equal(calls.length, 2);
  assert.equal(calls[1], 'https://sfrecpark.org/Calendar.aspx?EID=10445');
});

const fullSource = { ...source, collectionWindowDays: 30, maxDetailPages: 300 };
function dailyPage(url, entries = '', next = '') {
  return '<form id="aspnetForm" action="' + new URL(url).pathname + new URL(url).search.replaceAll('&', '&amp;') + '"><div id="contentDiv" class="contentMain listView selfClear"><div class="calendars">' + entries + '</div>' + next + '</div></form>';
}
test('full collection checks every day across month boundary, including empty days and final-day events', async () => {
  const calls = [];
  const listing = (await fixture('listing')).replaceAll('2026-09-06', '2026-10-05');
  const detail = (await fixture('detail')).replaceAll('2026-09-06', '2026-10-05');
  const result = await collectRecpark(fullSource, async (url) => {
    calls.push(url);
    const query = new URL(url).searchParams;
    return new Response(query.has('EID') ? detail : dailyPage(url, query.get('month') === '10' && query.get('day') === '5' ? listing : ''));
  }, now);
  assert.equal(calls.length, 31);
  assert.equal(result.length, 1);
  assert.equal(result[0].record.startDate, '2026-10-05T16:30:00-07:00');
  assert.equal(result.coverageComplete, true);
  assert.equal(result.coverageDates.length, 30);
  assert.equal(result.coverageDates[0], '2026-09-06');
  assert.equal(result.coverageDates.at(-1), '2026-10-05');
});
test('full collection rejects ignored date queries and unexpected HTML instead of claiming empty days', async () => {
  for (const page of ['<html>unavailable</html>', dailyPage('https://sfrecpark.org/Calendar.aspx?view=list&year=2026&month=9&day=1')]) {
    await assert.rejects(collectRecpark(fullSource, async () => new Response(page), now), /calendar|date/i);
  }
});
test('full collection follows same-day pagination before recording coverage', async () => {
  const listing = await fixture('listing');
  const detail = await fixture('detail');
  const calls = [];
  const result = await collectRecpark(fullSource, async (url) => {
    calls.push(url);
    const query = new URL(url).searchParams;
    if (query.has('EID')) return new Response(detail);
    const firstDay = query.get('month') === '9' && query.get('day') === '6';
    return new Response(dailyPage(url, firstDay && query.has('page') ? listing : '', firstDay && !query.has('page') ? '<a rel="next" href="' + url + '&page=2">Next</a>' : ''));
  }, now);
  assert.equal(result.length, 1);
  assert.equal(calls.length, 32);
  assert.equal(result.coverageDates.length, 30);
});
test('full collection fails closed on detail, event, listing budgets and HTTP failure', async () => {
  const listing = await fixture('listing');
  const detail = await fixture('detail');
  for (const config of [{ maxDetailPages: 0 }, { maxEvents: 0 }, { maxListingPages: 1 }]) {
    await assert.rejects(collectRecpark({ ...fullSource, ...config }, async (url) => new Response(new URL(url).searchParams.has('EID') ? detail : dailyPage(url, listing)), now), /limit|budget/i);
  }
  await assert.rejects(collectRecpark(fullSource, async (url) => new URL(url).searchParams.get('day') === '7' ? new Response('', { status: 503 }) : new Response(dailyPage(url)), now), /503/);
});

test('verbatim publisher daily and empty calendar excerpts are recognized', async () => {
  for (const [name, date] of [['daily', '2026-10-05'], ['daily-empty', '2027-01-05']]) {
    const html = await fixture(name);
    const detail = (await fixture('detail')).replaceAll('Golden Gate Bandshell', 'Unknown park');
    let first = true;
    const result = await collectRecpark(fullSource, async (url) => {
      if (new URL(url).searchParams.has('EID')) return new Response(detail);
      const body = first ? html : dailyPage(url);
      first = false;
      return new Response(body);
    }, new Date(date + 'T17:00:00Z'));
    assert.equal(result.coverageDates.length, 30);
    assert.equal(result.coverageDates[0], date);
    assert.equal(result.length, 0);
  }
});
test('full collection rejects pagination loops, external next links and unrecognized detail responses', async () => {
  for (const next of [(url) => '<a rel="next" href="' + url + '">Next</a>', () => '<a rel="next" href="https://example.com/Calendar.aspx">Next</a>', () => '<nav class="pagination">unrecognized paging</nav>']) {
    await assert.rejects(collectRecpark(fullSource, async (url) => new Response(dailyPage(url, '', next(url))), now), /pagination/);
  }
  const listing = await fixture('listing');
  await assert.rejects(collectRecpark(fullSource, async (url) => new Response(new URL(url).searchParams.has('EID') ? '<html>temporary error</html>' : dailyPage(url, listing)), now), /detail markup/);
});
