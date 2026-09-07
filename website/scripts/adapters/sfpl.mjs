import { lastCoverageDay, pacificDay, recordCoverageDates, validDay } from '../coverage.mjs';

// Publisher-specific adapter. See tests/fixtures/sfpl/README.md for provenance.
// The HTML date range omits AM/PM: only the publisher's UTC ICS dates are used.
function plain(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => Number(n) <= 0x10ffff ? String.fromCodePoint(Number(n)) : '')
    .replace(/\s+/g, ' ').trim();
}
function branchMap(html) {
  const venues = new Map();
  // Scope each marker to the next marker: navigation/footer locations must not
  // accidentally supply the location of an unrelated event.
  for (const block of html.split(/(?=<div\b[^>]*data-views-row-index=)/)) {
    const opening = block.match(/^<div\b[^>]*>/)?.[0] ?? '';
    if (!opening.includes('geolocation-location')) continue;
    const lat = opening.match(/data-lat="(-?[\d.]+)"/)?.[1];
    const lng = opening.match(/data-lng="(-?[\d.]+)"/)?.[1];
    const path = block.match(/href="(\/locations\/[^"?#]+)"/)?.[1];
    const address = plain(block.match(/<p\b[^>]*class="address"[^>]*>([\s\S]*?)<\/p>/)?.[1]);
    if (path && lat && lng && address) venues.set(path, {address, geo: {latitude: Number(lat), longitude: Number(lng)}});
  }
  return venues;
}
function utcDate(value) {
  const match = value?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) return null;
  const [, y, m, d, h, min, s] = match;
  const iso = `${y}-${m}-${d}T${h}:${min}:${s}Z`;
  const parsed = new Date(iso);
  return Number.isFinite(+parsed) && parsed.toISOString() === iso.replace('Z', '.000Z') ? iso : null;
}
function calendarFields(ics) {
  const event = ics.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').match(/BEGIN:VEVENT\n([\s\S]*?)END:VEVENT/)?.[1];
  const fields = new Map();
  for (const line of (event ?? '').split('\n')) {
    const colon = line.indexOf(':');
    if (colon > 0) fields.set(line.slice(0, colon), line.slice(colon + 1));
  }
  return fields;
}
async function documentAt(url, fetchImpl) {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'MapSF/1.0 (public event listing collector)' } });
  if (!response.ok) throw new Error(`SFPL request failed (${response.status}): ${url}`);
  return response.text();
}
export async function collectSfpl(source, fetchImpl = fetch, now = new Date()) {
  if (source.collectionWindowDays === 30) return collectMonth(source, fetchImpl, now);
  const listingUrl = new URL(source.listingUrl);
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Los_Angeles', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'}).formatToParts(new Date(now));
  const part = (type) => parts.find(p => p.type === type).value;
  listingUrl.searchParams.set('date-end-after', `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}:${part('second')}`);
  const listing = await documentAt(listingUrl.href, fetchImpl);
  return collectListing(source, fetchImpl, now, listingUrl, listing);
}
async function collectListing(source, fetchImpl, now, listingUrl, listing) {
  const venues = branchMap(listing);
  const freePolicy = listing.includes('All programs and events are free and open to the public.');
  const links = [...new Set([...listing.matchAll(/href="(\/events\/\d{4}\/\d{2}\/\d{2}\/[^"?#]+)"/g)].map(m => new URL(m[1], listingUrl).href))];
  const latest = lastCoverageDay(pacificDay(now));
  const output = [];
  output.coverageDates = [];
  let remaining = Math.min(source.collectionWindowDays === 30 ? 2000 : 50, Math.max(0, Math.floor(source.maxDetailPages ?? 24)));
  for (const pageUrl of links) {
    const pathDate = new URL(pageUrl).pathname.match(/\/events\/(\d{4})\/(\d{2})\/(\d{2})\//);
    const listedDay = pathDate?.slice(1).join('-');
    if (validDay(listedDay) && listedDay > latest) continue;
    if (remaining < 2 || output.length >= (source.maxEvents ?? 100)) {
      if (source.collectionWindowDays === 30) throw new Error('SFPL detail processing limit reached');
      break;
    }
    remaining--;
    const html = await documentAt(pageUrl, fetchImpl);
    // Only visited detail pages count; links skipped by the request cap do not.
    if (pathDate) output.coverageDates.push(listedDay);
    const article = html.slice(html.search(/<article\b[^>]*class="event event--full/));
    if (!article.startsWith('<article')) {
      if (source.collectionWindowDays === 30) throw new Error('Unexpected SFPL event document');
      continue;
    }
    const name = plain(article.match(/<h1\b[^>]*class="event__title"[^>]*>([\s\S]*?)<\/h1>/)?.[1]);
    const locationField = article.slice(article.indexOf('field--name-field-event-location'));
    const locationPath = locationField.match(/class="location--address-link" href="(\/locations\/[^"?#]+)"/)?.[1];
    const venue = venues.get(locationPath);
    const locationName = plain(locationField.match(/field--name-name field__item">([\s\S]*?)<\/div>/)?.[1]);
    const calendarPath = article.match(/href="(\/sfpl-events\/add-to-calendar\/\d+)"/)?.[1];
    if (!name || !calendarPath) continue;
    // SFPL calendar node IDs map to UID <node>@sfpl.org (see provenance).
    // Preserve title cancellations even when removed fields no longer validate.
    if (/\bcancel(?:led|ed)\b/i.test(name)) {
      output.push({pageUrl, record: {'@type':'Event', name, url:pageUrl,
        identifier: calendarPath.split('/').at(-1) + '@sfpl.org',
        eventStatus:'https://schema.org/EventCancelled'}});
      continue;
    }
    remaining--;
    const calendar = await documentAt(new URL(calendarPath, listingUrl).href, fetchImpl);
    if (source.collectionWindowDays === 30 && !calendar.includes('BEGIN:VEVENT')) throw new Error('Unexpected SFPL calendar document');
    const fields = calendarFields(calendar);
    const startDate = utcDate(fields.get('DTSTART'));
    const endDate = utcDate(fields.get('DTEND'));
    output.coverageDates.push(...recordCoverageDates({ startDate, endDate }));
    if (fields.get('STATUS') === 'CANCELLED' && fields.get('UID')) {
      output.push({pageUrl, record: {'@type':'Event', name, url:pageUrl,
        identifier:fields.get('UID'), startDate, endDate,
        eventStatus:'https://schema.org/EventCancelled'}});
      continue;
    }
    if (!venue || !locationName || !startDate || !endDate || !fields.get('UID') || Date.parse(endDate) <= Date.parse(startDate) || Date.parse(endDate) <= +new Date(now)) continue;
    const cancelled = fields.get('STATUS') === 'CANCELLED' || /\bcancel(?:led|ed)\b/i.test(name);
    output.push({ pageUrl, record: {
      '@type': 'Event', identifier: fields.get('UID'), name, url: pageUrl,
      startDate, endDate, location: { name: locationName, ...venue },
      description: plain(fields.get('DESCRIPTION')),
      ...(freePolicy ? {isAccessibleForFree: true} : {}),
      ...(cancelled ? {eventStatus: 'https://schema.org/EventCancelled'} : {}),
    }});
  }
  return output;
}

// Date filters are publisher wall dates, so calendar arithmetic remains stable
// across DST. Each worker owns a day's budget: busy days cannot starve day 30.
async function collectMonth(source, fetchImpl, now) {
  const today = pacificDay(now);
  const days = Array.from({length: 30}, (_, index) => new Date(Date.parse(today + 'T00:00:00Z') + index * 86400000).toISOString().slice(0, 10));
  const results = new Array(days.length);
  const failures = [];
  const cache = new Map();
  let cursor = 0;
  async function worker() {
    while (cursor < days.length) {
      const index = cursor++;
      const day = days[index];
      let remaining = Math.min(2000, Math.max(1, Math.floor(source.maxRequestsPerDay ?? 200)));
      const request = async (url, options) => {
        const key = String(url);
        if (!cache.has(key)) {
          if (remaining-- <= 0) throw new Error('SFPL daily request limit reached');
          cache.set(key, (async () => {
            const response = await fetchImpl(url, options);
            const body = response.ok ? await response.text() : '';
            return {ok: response.ok, status: response.status, text: async () => body};
          })());
        }
        return cache.get(key);
      };
      try {
        const listingUrl = new URL(source.listingUrl);
        listingUrl.searchParams.delete('page');
        listingUrl.searchParams.delete('date-end-after');
        listingUrl.searchParams.set('date-from', day + ' 00:00:00');
        listingUrl.searchParams.set('date-to', day + ' 23:59:59');
        const visited = new Set();
        const listings = [];
        let next = listingUrl.href;
        while (next) {
          if (visited.has(next) || visited.size >= 30) throw new Error('SFPL pagination limit or cycle');
          visited.add(next);
          const html = await documentAt(next, request);
          for (const name of ['date-from', 'date-to']) {
            const input = [...html.matchAll(/<input\b[^>]*>/g)].map(match => match[0]).find(tag => tag.includes('name="' + name + '"'));
            if (plain(input?.match(/value="([^"]*)"/)?.[1]) !== listingUrl.searchParams.get(name)) throw new Error('Unexpected SFPL listing: did not confirm requested date scope');
          }
          if (!/class="[^"]*\bview-id-events\b/.test(html)
            || (!/href="\/events\/\d{4}\/\d{2}\/\d{2}\//.test(html) && !/class="view-empty"[\s\S]*?No events found/.test(html))) throw new Error('Unexpected SFPL listing document');
          listings.push(html);
          const nextTag = [...html.matchAll(/<a\b[^>]*>/g)].map(match => match[0]).find(tag => /rel="next"/.test(tag));
          const href = nextTag?.match(/href="([^"]+)"/)?.[1];
          next = null;
          if (nextTag) {
            if (!href) throw new Error('Invalid SFPL next page');
            const url = new URL(href.replaceAll('&amp;', '&'), listingUrl);
            if (url.origin !== listingUrl.origin || url.pathname !== listingUrl.pathname
              || url.searchParams.get('date-from') !== listingUrl.searchParams.get('date-from')
              || url.searchParams.get('date-to') !== listingUrl.searchParams.get('date-to')) throw new Error('SFPL pagination changed date scope');
            next = url.href;
          }
        }
        results[index] = await collectListing({...source, maxDetailPages: 2000}, request, now, listingUrl, listings.join('\n'));
      } catch (error) {
        failures.push(day + ': ' + error.message);
      }
    }
  }
  await Promise.all([worker(), worker()]);
  if (failures.length) throw new Error('SFPL monthly collection incomplete: ' + failures.join('; '));
  const output = results.flat();
  if (output.length > (source.maxEvents ?? 3000)) throw new Error('SFPL monthly event limit reached');
  output.coverageDates = days;
  output.coverageComplete = true;
  return output;
}
