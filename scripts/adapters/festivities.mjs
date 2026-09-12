import { festivities } from '../../config/festivities.mjs';
import { pacificTimestamp } from './direct-series.mjs';
import { pacificDay, lastCoverageDay } from '../coverage.mjs';

const comparable = value => value
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1),16) : Number(n)))
  .replace(/&(?:nbsp|amp|ndash|mdash|rsquo|lsquo|quot);/gi,' ')
  .toLowerCase().replace(/[^a-z0-9]/g,'');

export async function collectFestivity(source, fetchImpl=fetch, now=new Date()) {
  const festival=festivities.find(f=>source.id===`festivity-${f.id}`);
  if (!festival || festival.status!=='reviewed') throw new Error('Unknown or unreviewed festivity');
  const today=pacificDay(now),last=lastCoverageDay(today);
  const dates=festival.occurrences.filter(o=>o.date>=today&&o.date<=last);
  if(!dates.length) return [];
  for(const page of festival.pages){
    const response=await fetchImpl(page.url,{signal:AbortSignal.timeout(20000),headers:{'user-agent':'MapSF-events/1.0 (+https://github.com/thinkingfish/MapSF)',accept:'text/html'}});
    if(!response.ok) throw new Error(`Festivity page HTTP ${response.status}`);
    const body=comparable(await response.text());
    if(!page.checks.every(check=>body.includes(comparable(check)))) throw new Error(`Festivity details changed: ${festival.name}; review required`);
  }
  return dates.map(o=>({pageUrl:festival.url,summary:festival.summary,cost:structuredClone(festival.cost),
    record:{identifier:`${festival.id}-${o.date}`,name:festival.name,url:festival.url,startDate:pacificTimestamp(`${o.date}T${o.start}:00`),endDate:pacificTimestamp(`${o.date}T${o.end}:00`),isAccessibleForFree:festival.cost.isFree},
    curation:{type:'Feature',geometry:structuredClone(festival.geometry),properties:{name:festival.name,layerType:{Point:'poi',LineString:'segment',Polygon:'area'}[festival.geometry.type],category:'festival',metadata:{address:festival.address,scheduleSource:festival.url,scheduleReviewedAt:festival.reviewedAt,edition:String(festival.edition),coordinateSource:festival.geometrySource,geometryNote:festival.geometryNote}}}
  }));
  // Explicit occurrences do not claim complete coverage of a publisher calendar.
}
