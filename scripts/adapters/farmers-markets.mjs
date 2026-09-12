import { farmersMarkets } from '../../config/farmers-markets.mjs';
import { pacificTimestamp } from './direct-series.mjs';
import { pacificDay, lastCoverageDay } from '../coverage.mjs';

// Ignore page scripts/styles and presentation punctuation; guards are reviewed
// schedule/location phrases, not arbitrary event data or publisher instructions.
const comparable = value => value
  .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1),16) : Number(n)))
  .replace(/&(?:nbsp|amp|ndash|mdash|rsquo|lsquo|quot);/gi,' ')
  .toLowerCase().replace(/[^a-z0-9]/g,'');

export async function collectFarmersMarket(source, fetchImpl=fetch, now=new Date()) {
  const market = farmersMarkets.find(m=>source.id===`market-${m.id}`);
  if (!market) throw new Error('Unknown reviewed market');
  const today=pacificDay(now), last=lastCoverageDay(today);
  // Expired schedules must be reviewed, never extrapolated into a new season.
  if (today>market.validThrough) throw new Error('Market schedule review expired: ' + market.name);
  if (market.seasonThrough && today>market.seasonThrough) return [];
  const response=await fetchImpl(market.url,{signal:AbortSignal.timeout(20000),headers:{'user-agent':'MapSF-events/1.0 (+https://github.com/thinkingfish/MapSF)',accept:'text/html'}});
  if(!response.ok) throw new Error(`Market schedule HTTP ${response.status}`);
  const body=comparable(await response.text());
  if(!market.checks.every(check=>body.includes(comparable(check)))) throw new Error(`Schedule or location changed: ${market.name}; review required`);
  const records=[];
  for(let ms=Date.parse(`${today}T12:00:00Z`);ms<=Date.parse(`${last}T12:00:00Z`);ms+=86400000){
    const day=new Date(ms).toISOString().slice(0,10), weekday=new Date(ms).getUTCDay();
    if(day<market.validFrom||day>market.validThrough||(market.seasonThrough && day>market.seasonThrough)||market.excludedDates.includes(day))continue;
    for(const hours of market.schedule.filter(rule=>rule.weekdays.includes(weekday))){
      const summary='Weekly farmers market. Free entry; food and other purchases cost extra. Usual operator schedule, checked against the official page; confirm holiday hours and short-notice cancellations before visiting.';
      records.push({pageUrl:market.url,summary,record:{identifier:`${market.id}-${day}-${hours.start}`,name:market.name,url:market.url,
        startDate:pacificTimestamp(`${day}T${hours.start}:00`),endDate:pacificTimestamp(`${day}T${hours.end}:00`),isAccessibleForFree:true},
        curation:{type:'Feature',geometry:structuredClone(market.geometry),properties:{name:market.name,layerType:{Point:'poi',LineString:'segment',Polygon:'area'}[market.geometry.type],category:'farmers-market',metadata:{address:market.address,scheduleSource:market.url,scheduleReviewedAt:market.reviewedAt,scheduleValidThrough:market.validThrough,coordinateSource:market.geometrySource}}}});
    }
  }
  // This verifies the weekly schedule, not a complete calendar of exceptions.
  // Do not claim complete 30-day publisher coverage from recurrence expansion.
  return records;
}
