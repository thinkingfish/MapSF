import { lastCoverageDay, recordCoverageDates, validDay } from '../coverage.mjs';

// CivicPlus publishes local Pacific wall times. Geometry is an exact facility
// lookup, never a geocode of the calendar's imprecise street-only map link.
// Verified 2026-09-06 against hdn_MapSearchResults on the official facility page;
// its original coordinate payload is preserved in tests/fixtures/recpark/facility.html.
const BAND_SHELL = Object.freeze({
  name: 'Golden Gate Bandshell',
  path: '/Facilities/Facility/Details/Golden-Gate-Bandshell-436',
  latitude: 37.7696158329688,
  longitude: -122.467718633595,
});
function decode(value) {
  return String(value).replace(/&(?:amp|quot|apos|lt|gt|nbsp|thinsp);|&#(?:x[0-9a-f]+|\d+);/gi, (entity) => {
    const named = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ', '&thinsp;': ' ' };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const code = entity.slice(2, -1);
    const point = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
    return point <= 0x10ffff ? String.fromCodePoint(point) : '';
  });
}
const plain = (value = '') => decode(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
function property(html, key) {
  return plain(html.match(new RegExp(`<([a-z]+)\\b[^>]*itemprop=["']${key}["'][^>]*>([\\s\\S]*?)<\\/\\1>`, 'i'))?.[2]);
}
function pacificDateTime(wall) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(wall)) return null;
  const utc = Date.parse(`${wall}Z`);
  if (!Number.isFinite(utc)) return null;
  // Check both offsets: reject nonexistent and ambiguous DST wall times.
  const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const matches = ['-07:00', '-08:00'].filter((offset) => formatter.format(new Date(`${wall}${offset}`)).replace(' ', 'T') === wall);
  return matches.length === 1 ? `${wall}${matches[0]}` : null;
}
function clock(hour, minute, period) {
  if (Number(hour) < 1 || Number(hour) > 12 || Number(minute) > 59) return null;
  return `${String(Number(hour) % 12 + (period.toUpperCase() === 'PM' ? 12 : 0)).padStart(2, '0')}:${minute}:00`;
}
function parseDetail(html, pageUrl) {
  const name = plain(html.match(/<h2\b[^>]*id=["'][^"']*_eventTitle["'][^>]*>([\s\S]*?)<\/h2>/i)?.[1]);
  const wall = property(html, 'startDate');
  // Cancellation is actionable even after the publisher removes normal details.
  // The collector can reconcile this identity against its previous event instance.
  if (name && (/\bcancel(?:led|ed)\b/i.test(name) || /EventCancelled/.test(html))) {
    const startDate = pacificDateTime(wall);
    return { pageUrl, record: {
      '@type': 'Event', identifier: new URL(pageUrl).searchParams.get('EID'),
      name, url: pageUrl, eventStatus: 'https://schema.org/EventCancelled',
      ...(startDate ? { startDate } : {}),
    } };
  }
  const time = plain(html.match(/<div\b[^>]*class=["']specificDetailHeader["'][^>]*>Time:<\/div>\s*<div\b[^>]*class=["']specificDetailItem["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]);
  const range = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!name || !range) return null;
  const startClock = clock(...range.slice(1, 4));
  const endClock = clock(...range.slice(4, 7));
  if (!startClock || !endClock || wall.slice(11) !== startClock) return null;
  const startDate = pacificDateTime(wall);
  const endDate = pacificDateTime(`${wall.slice(0, 10)}T${endClock}`);
  // An overnight date cannot be established from a clock range alone.
  if (!startDate || !endDate || Date.parse(endDate) <= Date.parse(startDate)) return null;
  const locationHtml = html.split(/itemprop=["']location["']/i)[1]?.split(/itemprop=["']performer["']/i)[0] ?? '';
  const locationName = property(locationHtml, 'name');
  const facilityPath = decode(locationHtml.match(/href=["']([^"']*\/Facilities\/Facility\/Details\/[^"']+)["']/i)?.[1] ?? '');
  let facility;
  try { facility = new URL(facilityPath, pageUrl); } catch { return null; }
  if (locationName !== BAND_SHELL.name || facility.origin !== new URL(pageUrl).origin || facility.pathname !== BAND_SHELL.path) return null;
  const address = Object.fromEntries(['streetAddress', 'addressLocality', 'addressRegion', 'postalCode'].map((key) => [key, property(locationHtml, key)]));
  const record = {
    '@type': 'Event', identifier: new URL(pageUrl).searchParams.get('EID'), name, url: pageUrl, startDate, endDate,
    location: { name: locationName, address, geo: { latitude: BAND_SHELL.latitude, longitude: BAND_SHELL.longitude, sourceUrl: `https://sfrecpark.org${BAND_SHELL.path}` } },
  };
  if (/^free$/i.test(property(html, 'price'))) record.offers = { '@type': 'Offer', price: 0, priceCurrency: 'USD' };
  return { record, pageUrl };
}

// The public list view honors an explicit year/month/day. A month-only default
// response is not evidence that a day was checked, especially an empty day.
async function collectWindow(source, fetchHtml, now) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const records = [];
  records.coverageDates = [];
  records.coverageComplete = true;
  const seenDetails = new Set();
  const budget = (key, fallback, ceiling) => Math.min(ceiling, Math.max(0, Number.isInteger(source[key]) ? source[key] : fallback));
  const detailLimit = budget('maxDetailPages', 300, 1000);
  const listingLimit = budget('maxListingPages', 90, 300);
  const eventLimit = budget('maxEvents', 300, 1000);
  let listingCount = 0;
  const sameDay = (url, requested) => url.origin === requested.origin && url.pathname.toLowerCase() === '/calendar.aspx' && ['view', 'year', 'month', 'day'].every((key) => url.searchParams.get(key) === requested.searchParams.get(key));
  for (let offset = 0; offset < 30; offset++) {
    const day = new Date(Date.parse(today + 'T12:00:00Z') + offset * 86400000).toISOString().slice(0, 10);
    const requested = new URL(source.listingUrl);
    requested.search = new URLSearchParams({ view: 'list', year: day.slice(0, 4), month: String(Number(day.slice(5, 7))), day: String(Number(day.slice(8))) }).toString();
    const pages = [requested.href];
    const visited = new Set();
    while (pages.length) {
      const pageUrl = pages.shift();
      if (visited.has(pageUrl)) throw new Error('Rec & Parks calendar pagination loop');
      visited.add(pageUrl);
      if (++listingCount > listingLimit) throw new Error('Rec & Parks listing request budget exceeded');
      const html = await fetchHtml(pageUrl);
      const form = [...html.matchAll(/<form\b[^>]*>/gi)].find(([tag]) => /\bid=["']aspnetForm["']/i.test(tag))?.[0];
      const action = form?.match(/\baction=["']([^"']+)["']/i)?.[1];
      if (!action || !sameDay(new URL(decode(action), pageUrl), requested) || !/\bclass=["'][^"']*\blistView\b/.test(html) || !/<div\b[^>]*class=["']calendars["'][^>]*>/.test(html)) throw new Error('Rec & Parks calendar date response is unexpected');
      const anchors = [...html.matchAll(/<a\b[^>]*id=["']eventTitle_(\d+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi)];
      // An empty recognized container is the publisher's actual zero-results state.
      if (!anchors.length && !/<div\b[^>]*class=["']calendars["'][^>]*>\s*<\/div>/i.test(html)) throw new Error('Rec & Parks calendar entries were not recognized');
      for (const match of anchors) {
        const url = new URL(decode(match[2]), pageUrl);
        if (url.origin !== requested.origin || url.pathname.toLowerCase() !== '/calendar.aspx' || url.searchParams.get('EID') !== match[1]) throw new Error('Rec & Parks calendar event link is unexpected');
        const end = html.indexOf('More Details', match.index);
        if (end < 0) throw new Error('Rec & Parks calendar event markup is incomplete');
        const nearby = html.slice(match.index, end);
        const start = property(nearby, 'startDate');
        if (validDay(start.slice(0, 10)) && start.slice(0, 10) !== day) throw new Error('Rec & Parks calendar date filter was not honored');
        const venue = property(nearby.split(/itemprop=["']location["']/i)[1] ?? '', 'name');
        const cancelled = /cancel(?:led|ed)/i.test(plain(nearby));
        if (!cancelled && venue && venue !== 'Event Location' && venue !== BAND_SHELL.name) continue;
        const id = match[1];
        if (seenDetails.has(id)) continue;
        if (seenDetails.size >= detailLimit) throw new Error('Rec & Parks detail request budget exceeded');
        seenDetails.add(id);
        const detailUrl = requested.origin + '/Calendar.aspx?EID=' + id;
        const detail = await fetchHtml(detailUrl);
        if (!/<h2\b[^>]*id=["'][^"']*_eventTitle["']/i.test(detail)) throw new Error('Rec & Parks event detail markup is unexpected');
        const result = parseDetail(detail, detailUrl);
        if (result) {
          if (records.length >= eventLimit) throw new Error('Rec & Parks event limit exceeded');
          records.push(result);
        }
      }
      const next = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].filter(([, attrs, label]) => /\brel=["']next["']/i.test(attrs) || (/\b(?:page|pagination|pager)\b/i.test(attrs) && /^next\b/i.test(plain(label))));
      for (const [, attrs] of next) {
        const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];
        const url = href ? new URL(decode(href), pageUrl) : null;
        if (!url || !sameDay(url, requested) || url.href === pageUrl) throw new Error('Rec & Parks calendar pagination is unsupported');
        pages.push(url.href);
      }
      if (!next.length && /<(?:div|nav|ul)\b[^>]*class=["'][^"']*\b(?:pagination|pager)\b/i.test(html)) throw new Error('Rec & Parks calendar pagination is unexpected');
    }
    records.coverageDates.push(day);
  }
  return records;
}

export async function collectRecpark(source, fetchImpl, now = new Date()) {
  const fetchHtml = async (url) => {
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(source.timeoutMs ?? 15000),
      headers: { 'user-agent': 'MapSF-Today/1.0 (public SF event discovery)', accept: 'text/html' },
    });
    if (!response.ok) throw new Error(`Rec & Parks request failed: ${response.status ?? 'unknown status'} (${url})`);
    return response.text();
  };
  if (source.collectionWindowDays === 30) return collectWindow(source, fetchHtml, now);
  const html = await fetchHtml(source.listingUrl);
  const links = new Map();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const latest = lastCoverageDay(today);
  const origin = new URL(source.listingUrl).origin;
  // Calendar repeats each link twice; canonical event IDs avoid wasting the cap.
  for (const match of html.matchAll(/<a\b[^>]*id=["']eventTitle_(\d+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const url = new URL(decode(match[2]), source.listingUrl);
    if (url.origin !== origin || url.pathname.toLowerCase() !== '/calendar.aspx' || url.searchParams.get('EID') !== match[1]) continue;
    const nearby = html.slice(match.index, html.indexOf('More Details', match.index));
    links.set(match[1], { pageUrl: `${origin}/Calendar.aspx?EID=${match[1]}`, start: property(nearby, 'startDate') });
  }
  const limit = Math.min(50, Math.max(0, Number.isInteger(source.maxDetailPages) ? source.maxDetailPages : 20));
  const candidates = [...links.values()].filter(({ start }) => !validDay(start.slice(0, 10)) || (start.slice(0, 10) >= today && start.slice(0, 10) <= latest)).sort((a, b) => Number(!a.start.startsWith(today)) - Number(!b.start.startsWith(today)) || a.start.localeCompare(b.start)).slice(0, limit);
  const records = [];
  records.coverageDates = [];
  const maxEvents = Math.max(0, Number.isInteger(source.maxEvents) ? source.maxEvents : 100);
  for (const { pageUrl, start } of candidates) {
    if (records.length >= maxEvents) break;
    const detail = await fetchHtml(pageUrl);
    // A visited dated listing is still checked when its venue or price is rejected.
    records.coverageDates.push(...recordCoverageDates({ startDate: pacificDateTime(start) }));
    records.coverageDates.push(...recordCoverageDates({ startDate: pacificDateTime(property(detail, 'startDate')) }));
    const result = parseDetail(detail, pageUrl);
    if (result) records.push(result);
  }
  return records;
}
