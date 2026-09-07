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
export async function collectRecpark(source, fetchImpl, now = new Date()) {
  const fetchHtml = async (url) => {
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(source.timeoutMs ?? 15000),
      headers: { 'user-agent': 'MapSF-Today/1.0 (public SF event discovery)', accept: 'text/html' },
    });
    if (!response.ok) throw new Error(`Rec & Parks request failed: ${response.status ?? 'unknown status'} (${url})`);
    return response.text();
  };
  const html = await fetchHtml(source.listingUrl);
  const links = new Map();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const origin = new URL(source.listingUrl).origin;
  // Calendar repeats each link twice; canonical event IDs avoid wasting the cap.
  for (const match of html.matchAll(/<a\b[^>]*id=["']eventTitle_(\d+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const url = new URL(decode(match[2]), source.listingUrl);
    if (url.origin !== origin || url.pathname.toLowerCase() !== '/calendar.aspx' || url.searchParams.get('EID') !== match[1]) continue;
    const nearby = html.slice(match.index, html.indexOf('More Details', match.index));
    links.set(match[1], { pageUrl: `${origin}/Calendar.aspx?EID=${match[1]}`, start: property(nearby, 'startDate') });
  }
  const limit = Math.min(50, Math.max(0, Number.isInteger(source.maxDetailPages) ? source.maxDetailPages : 20));
  const candidates = [...links.values()].filter(({ start }) => !/^\d{4}-\d{2}-\d{2}T/.test(start) || start.slice(0, 10) >= today).sort((a, b) => Number(!a.start.startsWith(today)) - Number(!b.start.startsWith(today)) || a.start.localeCompare(b.start)).slice(0, limit);
  const records = [];
  const maxEvents = Math.max(0, Number.isInteger(source.maxEvents) ? source.maxEvents : 100);
  for (const { pageUrl } of candidates) {
    if (records.length >= maxEvents) break;
    const result = parseDetail(await fetchHtml(pageUrl), pageUrl);
    if (result) records.push(result);
  }
  return records;
}
