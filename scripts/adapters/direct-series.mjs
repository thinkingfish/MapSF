import {parseJsonLdEvents} from '../refresh-events.mjs';
import {eventInCoverageWindow} from '../coverage.mjs';
import {civicJoyPoints} from '../../config/civic-joy-points.mjs';

// Organizer venue names joined to the city's official facility records, reviewed
// 2026-09-11. These are venue pins, not claimed performance-area boundaries.
const venues = [
  {heading:'san francisco mclaren park', name:'Jerry Garcia Amphitheater', address:'McLaren Park, John F. Shelley Drive, San Francisco, CA', coordinates:[-122.414369024704,37.7199305859824], evidence:'https://sfrecpark.org/Facilities/Facility/Details/Jerry-Garcia-Amphitheater-421'},
  {heading:'san francisco sue bierman park', name:'Sue Bierman Park', address:'Washington and Drumm Streets, San Francisco, CA', coordinates:[-122.39675999997,37.796417999991], evidence:'https://sfrecpark.org/Facilities/Facility/Details/Sue-Bierman-Park-378'},
];
const decode = s => s.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&amp;/g,'&').replace(/&nbsp;/g,' ');
const plain = s => decode(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
async function document(url, source, fetchImpl) {
  const response=await fetchImpl(url,{signal:AbortSignal.timeout(source.timeoutMs ?? 20000),headers:{'user-agent':'MapSF/1.0 (public SF event collector)',accept:'text/html'}});
  if(!response.ok) throw new Error(`${source.id}: HTTP ${response.status}`);
  return response.text();
}
const inWindow=(record,now)=>eventInCoverageWindow({startAt:record.startDate,endAt:record.endDate},new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles'}).format(now));
export function pacificTimestamp(wall) {
  const fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  const offsets=['-07:00','-08:00'].filter(offset=>{const d=new Date(wall+offset);return Number.isFinite(+d)&&fmt.format(d).replace(' ','T')===wall;});
  if(offsets.length!==1)throw new Error('Invalid or ambiguous performance time');
  return wall+offsets[0];
}
export async function collectShakes(source, fetchImpl=fetch, now=new Date()) {
  const pageUrl=source.productionUrl;
  const html=await document(pageUrl,source,fetchImpl), text=plain(html);
  const year=Number(text.match(/Free Shakespeare in the Park (\d{4})/i)?.[1]);
  const title=plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '');
  const duration=Number(text.match(/show runs approximately (\d+) minutes/i)?.[1]);
  if(year!==source.seasonYear || !title || !duration || duration>300)throw new Error('Unrecognized Shakespeare season or duration');
  const sections=[...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2\b|$)/gi)];
  const records=[];
  for(const venue of venues) {
    const matches=sections.filter(section=>plain(section[1]).toLowerCase()===venue.heading);
    if(matches.length!==1)throw new Error(`Missing or ambiguous schedule for ${venue.name}`);
    const schedule=matches[0][2].match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1];
    if(!schedule)throw new Error(`Missing dates for ${venue.name}`);
    for(const row of schedule.split(/<br\b[^>]*>/i).map(plain).filter(Boolean)) {
      const m=row.match(/^[*+]?\s*(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\s+(\d{1,2})\s*[–—-]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)(.*)$/i);
      if(!m)throw new Error(`Unrecognized performance date: ${row}`);
      const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[2].toLowerCase().slice(0,3))+1;
      const hour=Number(m[4]), minute=Number(m[5] ?? 0);
      if(hour<1||hour>12||minute>59)throw new Error('Invalid performance clock');
      const day=`${year}-${String(month).padStart(2,'0')}-${m[3].padStart(2,'0')}`;
      const weekday=new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short'}).format(new Date(`${day}T12:00:00Z`));
      if(weekday.toLowerCase()!==m[1].toLowerCase())throw new Error('Performance weekday mismatch');
      const startDate=pacificTimestamp(`${day}T${String(hour%12+(m[6].toLowerCase()==='pm'?12:0)).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00`);
      const endDate=new Date(Date.parse(startDate)+duration*60000).toISOString();
      const record={name:`Free Shakespeare in the Park: ${title}`,identifier:`${year}-${venue.heading.replaceAll(' ','-')}-${day}`,url:pageUrl,startDate,endDate,
        isAccessibleForFree:true,description:`Outdoor Shakespeare. Approximate running time: ${duration} minutes; check the organizer for changes.`,
        location:{name:venue.name,address:venue.address,geo:{longitude:venue.coordinates[0],latitude:venue.coordinates[1]}}};
      if(/cancel(?:led|ed)/i.test(m[7]))record.eventStatus='https://schema.org/EventCancelled';
      else if(m[7].trim())throw new Error('Unrecognized performance schedule annotation');
      if(inWindow(record,now))records.push({pageUrl,record,summary:record.description});
    }
  }
  if(records.length>(source.maxEvents ?? 60))throw new Error('Shakespeare event limit exceeded');
  return records;
}
export async function collectFromTheE(source, fetchImpl=fetch, now=new Date()) {
  const html=await document(source.listingUrl,source,fetchImpl);
  const links=new Set();
  for(const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
    let url;try{url=new URL(decode(m[1]),source.listingUrl);}catch{continue;}
    if(url.origin===new URL(source.listingUrl).origin && /^\/events\/[a-z0-9-]+\/?$/i.test(url.pathname)){url.hash='';url.search='';links.add(url.href);}
  }
  if(!links.size)throw new Error('No night-market detail links found');
  if(links.size>(source.maxDetailPages ?? 8))throw new Error('Night-market discovery limit exceeded');
  const point=civicJoyPoints.find(p=>p.address==='Mission Street & Ocean Avenue');
  const records=[];
  for(const pageUrl of links) {
    const items=parseJsonLdEvents(await document(pageUrl,source,fetchImpl));
    if(!items.length)throw new Error('Night-market detail has no Event data');
    for(const record of items) {
      const location=record.location;
      if(location?.name!=='Ocean Ave & Mission St' || !/San Francisco/i.test(String(location.address)))continue;
      if(!/T.*(?:Z|[+-]\d\d:\d\d)$/.test(record.startDate ?? '') || !/T.*(?:Z|[+-]\d\d:\d\d)$/.test(record.endDate ?? '') || !(Date.parse(record.endDate)>Date.parse(record.startDate)))throw new Error('Invalid night-market event time');
      record.url=pageUrl;
      record.location={...location,geo:{longitude:point.coordinates[0],latitude:point.coordinates[1]}};
      if(record.offers === undefined && record.isAccessibleForFree !== false && /\bFREE COMMUNITY FUN\b/i.test(record.description ?? ''))record.isAccessibleForFree=true;
      if(inWindow(record,now))records.push({pageUrl,record});
    }
  }
  if(records.length>(source.maxEvents ?? 40))throw new Error('Night-market event limit exceeded');
  return records;
}
