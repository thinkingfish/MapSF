import { lastCoverageDay, pacificDay, validDay } from '../coverage.mjs';

// The publisher's public Events Calendar API supplies UTC timestamps, venue
// geometry and explicit date-scoped pagination. No article bodies are copied.
function utc(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) || !validDay(value.slice(0,10))) return null;
  const iso = value.replace(' ', 'T') + 'Z';
  const parsed = new Date(iso);
  return Number.isFinite(+parsed) && parsed.toISOString() === iso.replace('Z','.000Z') ? parsed : null;
}
function publisherTime(local, universal) {
  const wall = utc(local), instant = utc(universal);
  if (!wall || !instant) return undefined;
  const minutes = (+wall - +instant) / 60000;
  if (!Number.isInteger(minutes) || Math.abs(minutes) > 14*60) return undefined;
  // Preserve the publisher's original local-offset form, and hence existing IDs.
  const magnitude = Math.abs(minutes);
  return `${local.replace(' ','T')}${minutes < 0 ? '-' : '+'}${String(Math.floor(magnitude/60)).padStart(2,'0')}:${String(magnitude%60).padStart(2,'0')}`;
}
function eventRecord(event) {
  const venue = event.venue || {};
  const title = typeof event.title === 'string' ? event.title : '';
  const record = {
    '@type':'Event', identifier:event.id, name:title, url:event.url,
    startDate:publisherTime(event.start_date, event.utc_start_date),
    endDate:publisherTime(event.end_date, event.utc_end_date),
    location:{name:venue.venue,address:{streetAddress:venue.address,addressLocality:venue.city,addressRegion:venue.stateprovince || venue.state,postalCode:venue.zip}},
  };
  if (venue.geo_lat !== undefined && venue.geo_lng !== undefined) record.location.geo={latitude:venue.geo_lat,longitude:venue.geo_lng};
  if (/\bcancel(?:led|ed)\b/i.test(title) || /cancel(?:led|ed)/i.test(event.event_status || '')) record.eventStatus='https://schema.org/EventCancelled';
  if (/^(?:free|\$?0(?:\.00)?)$/i.test(String(event.cost ?? '').trim())) record.isAccessibleForFree=true;
  else if (/^\$?\d+(?:\.\d{1,2})?$/.test(String(event.cost ?? '').trim())) record.offers={price:String(event.cost).trim().replace(/^\$/,''),priceCurrency:'USD'};
  if (event.image?.url) record.image=event.image.url;
  return record;
}
export async function collectMissionLocal(source, fetchImpl = fetch, now = new Date()) {
  const first = pacificDay(now), last = lastCoverageDay(first);
  const base = new URL('/wp-json/tribe/events/v1/events/', source.listingUrl);
  base.searchParams.set('start_date', `${first} 00:00:00`);
  base.searchParams.set('end_date', `${last} 23:59:59`);
  base.searchParams.set('per_page','50');
  base.searchParams.set('status','publish');
  const maxPages=Math.min(100, Math.max(1, source.maxListingPages ?? 20));
  const maxEvents=Math.min(5000, Math.max(0, source.maxEvents ?? 1000));
  const output=[], seen=new Set();
  let total, pages;
  for (let page=1; ;page++) {
    if (page>maxPages) throw new Error('Mission Local pagination limit exhausted');
    const url=new URL(base);url.searchParams.set('page',String(page));
    const response=await fetchImpl(url.href,{signal:AbortSignal.timeout(source.timeoutMs ?? 20000),headers:{accept:'application/json','user-agent':'MapSF/1.0 (public SF event collector)'}});
    if (!response.ok) throw new Error(`Mission Local request failed (${response.status})`);
    const data=await response.json();
    if (!Array.isArray(data.events) || !Number.isInteger(data.total) || data.total<0 || !Number.isInteger(data.total_pages) || data.total_pages<0) throw new Error('Invalid Mission Local pagination');
    const echo=new URL(data.rest_url);
    if (echo.origin!==base.origin || echo.pathname.replace(/\/$/,'')!==base.pathname.replace(/\/$/,'') || echo.searchParams.get('start_date')!==base.searchParams.get('start_date') || echo.searchParams.get('end_date')!==base.searchParams.get('end_date') || Number(echo.searchParams.get('page'))!==page) throw new Error('Mission Local date filter or page mismatch');
    if (page===1) {total=data.total;pages=data.total_pages;}
    if (data.total!==total || data.total_pages!==pages || (total>0 && pages<1)) throw new Error('Mission Local pagination changed during collection');
    if (total>maxEvents || pages>maxPages) throw new Error('Mission Local collection limit exhausted');
    if (total>0 && data.events.length===0) throw new Error('Empty Mission Local pagination page');
    for (const event of data.events) {
      if (!Number.isInteger(event.id) || seen.has(event.id)) throw new Error('Duplicate or missing Mission Local event identity');
      seen.add(event.id);
      if (event.status!=='publish') continue;
      output.push({pageUrl:event.url,record:eventRecord(event)});
    }
    if (page>=pages) {
      if (seen.size!==total || data.next_rest_url) throw new Error('Incomplete Mission Local pagination');
      break;
    }
    const next=new URL(data.next_rest_url);
    if(next.origin!==base.origin || next.pathname.replace(/\/$/,'')!==base.pathname.replace(/\/$/,'') || next.searchParams.get('start_date')!==base.searchParams.get('start_date') || next.searchParams.get('end_date')!==base.searchParams.get('end_date') || Number(next.searchParams.get('page'))!==page+1) throw new Error('Invalid Mission Local next pagination page');
  }
  output.coverageDates=Array.from({length:30},(_,i)=>new Date(Date.parse(`${first}T00:00:00Z`)+i*86400000).toISOString().slice(0,10));
  output.coverageComplete=true;
  return output;
}
