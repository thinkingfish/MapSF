import {pacificDay,validDay} from '../coverage.mjs';

// Mirrors Evvnt discovery's event-link encoding: numeric external IDs need
// their provider suffix; some providers instead use the calendar object ID.
const eventProviders = {
 evvnt: ['', false], migration: ['m', false], geotix: ['x', false],
 enmotive: ['e', true], goldstar: ['g', false], ticketmaster: ['t', true],
 bandsintown: ['n', false], eventbrite: ['b', false], axs: ['s', false],
 active_network: ['a', true], run_sign_up: ['r', false], ticket_sign_up: ['u', false],
 event_vesta: ['v', false], ticket_fairy: ['f', false], race_entry: ['c', false], meetup: ['p', false],
};
export function chronicleEventPath(event) {
 const provider = event.sources?.[0];
 if (!Object.hasOwn(eventProviders, provider)) throw new Error('Unknown Chronicle event source');
 const [suffix, useObjectId] = eventProviders[provider];
 const id = useObjectId ? event.objectID : (event.source_id_s ?? String(event.source_id));
 if (typeof id !== 'string' || !(useObjectId ? /^[a-zA-Z0-9_-]+$/ : /^\d+$/).test(id)) throw new Error('Invalid Chronicle detail identity');
 return `/event/${id}${suffix}`;
}

// Public browser API used by the Chronicle's Evvnt calendar (publisher 6745).
// It exposes neither totals nor filter echoes. Check each date independently,
// require a single large page and an empty confirmation page. Small pages
// demonstrably lose same-time events due to unstable publisher sorting.
function record(event, pageUrl) {
  const venue=event.venue || {};
  const output={
    '@type':'Event',identifier:event.objectID,name:event.title,url:pageUrl,
    startDate:event.start_time,endDate:event.end_time,
    location:{name:venue.name,address:{streetAddress:venue.address_1,addressLocality:venue.town,postalCode:venue.post_code,addressCountry:venue.country}},
  };
  if(typeof venue.latitude==='number' && typeof venue.longitude==='number' && Number.isFinite(venue.latitude) && Number.isFinite(venue.longitude)) output.location.geo={latitude:venue.latitude,longitude:venue.longitude};
  if(event.online_only) delete output.location.geo;
  if(/\bcancel(?:led|ed)\b/i.test(event.title || '') || /cancel(?:led|ed)/i.test(event.source_status || '')) output.eventStatus='https://schema.org/EventCancelled';
  // A single unambiguous published rate is representable by the shared contract.
  // Multiple differing ticket tiers remain unknown rather than claiming free.
  const prices=[...new Set(Object.values(event.prices || {}))];
  if (prices.length) output.hasExplicitPrice = true;
  const price=prices.length===1 && typeof prices[0]==='string' && /^USD (\d+(?:\.\d{1,2})?)$/.exec(prices[0]);
  if(price){output.offers={price:price[1],priceCurrency:'USD'};if(Number(price[1])===0)output.isAccessibleForFree=true;}
  return output;
}
function explicitTime(value) {
  return typeof value==='string' && validDay(value.slice(0,10)) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
}
export async function collectChronicle(source, fetchImpl=fetch, now=new Date()) {
  const first=pacificDay(now);
  const days=Array.from({length:30},(_,i)=>new Date(Date.parse(`${first}T00:00:00Z`)+i*86400000).toISOString().slice(0,10));
  const requestLimit=Math.min(100,Math.max(1,source.maxRequestsPerDay ?? 20));
  const eventLimit=Math.min(10000,Math.max(0,source.maxEvents ?? 5000));
  const output=[],seen=new Set();
  for(const day of days){
    for(let page=0;;page++){
      if(page>=requestLimit)throw new Error('Chronicle daily pagination limit exhausted');
      const url=new URL('https://discovery.evvnt.com/api/events');
      for(const [key,value] of Object.entries({publisher_id:'6745',fromDate:day,toDate:day,multipleEventInstances:'true',hitsPerPage:'1000',page:String(page)}))url.searchParams.set(key,value);
      const response=await fetchImpl(url.href,{signal:AbortSignal.timeout(source.timeoutMs ?? 20000),headers:{accept:'application/json','user-agent':'MapSF/1.0 (public SF event collector)'}});
      if(!response.ok)throw new Error(`Chronicle request failed (${response.status})`);
      const data=await response.json();
      if(!data || !Array.isArray(data.events))throw new Error('Invalid Chronicle events response');
      if(data.events.length===0)break;
      if(page>0)throw new Error('Chronicle unsafe pagination: nonempty continuation page');
      for(const event of data.events){
        if(!event || typeof event.objectID!=='string' || !event.objectID || !Number.isSafeInteger(event.source_id))throw new Error('Invalid Chronicle event identity');
        if(seen.has(event.objectID))throw new Error('Duplicate Chronicle event across pagination');
        if(event.start_date!==day || !explicitTime(event.start_time) || pacificDay(event.start_time)!==day)throw new Error('Chronicle date filter mismatch');
        seen.add(event.objectID);
        if(seen.size>eventLimit)throw new Error('Chronicle event collection limit exhausted');
        const pageUrl=new URL(source.listingUrl);
        pageUrl.searchParams.set('_evDiscoveryPath',chronicleEventPath(event));
        output.push({pageUrl:pageUrl.href,record:record(event,pageUrl.href)});
      }
    }
  }
  output.coverageDates=days;output.coverageComplete=true;
  return output;
}
