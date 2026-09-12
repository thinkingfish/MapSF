import {eventInCoverageWindow, pacificDay} from '../coverage.mjs';
import {pacificTimestamp} from './direct-series.mjs';

// Reviewed station point from the Metropolitan Transportation Commission's 511
// station page, not a claimed entrance or a route connecting all three venues:
// https://511.org/travel/transit/centers/chinatown-rose-pak-station
const station = {name:'Chinatown–Rose Pak Station',address:'934 Stockton Street, San Francisco, CA',geo:{latitude:37.794779100241,longitude:-122.40807550785}};
const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#8211;|&ndash;/g,'–').replace(/&#8217;/g,'’').replace(/\s+/g,' ').trim();
const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
export async function collectKqed(source,fetchImpl=fetch,now=new Date()) {
  const response=await fetchImpl(source.listingUrl,{signal:AbortSignal.timeout(source.timeoutMs ?? 20000),headers:{'user-agent':'MapSF/1.0 (public SF event collector)',accept:'text/html'}});
  if(!response.ok)throw new Error(`KQED HTTP ${response.status}`);
  const html=await response.text();
  const assignment=html.match(/window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)<\/script>/)?.[1];
  if(!assignment)throw new Error('KQED article state missing');
  const state=JSON.parse(assignment.trim().replace(/;$/,''));
  if(!state.postsReducer || typeof state.postsReducer!=='object')throw new Error('KQED article records missing');
  const articles=Object.values(state.postsReducer).filter(article=>article?.status==='publish' && article.source==='The Do List');
  if(!articles.length)throw new Error('KQED Do List articles missing');
  if(articles.length>(source.maxArticles ?? 20))throw new Error('KQED article limit exceeded');
  const output=[];
  for(const article of articles) {
    if(/\b(?:cancelled|canceled|postponed)\b/i.test(article.title ?? article.headData?.schema?.headline ?? ''))continue;
    // Only explicit event-summary paragraphs with a reviewed SF venue qualify.
    // Do not parse the publication date, headline, or a season-long date range.
    for(const paragraph of String(article.content ?? '').matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
      const summary=plain(paragraph[1]);
      const match=summary.match(/^(.+?) takes place (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.?\s+(\d{1,2}),\s+(\d{4}),\s+(\d{1,2})(?::(\d{2}))?\s*([ap])\.m\.[–—-]\s*(\d{1,2})(?::(\d{2}))?\s*([ap])\.m\.\s+at\s+(.+)$/i);
      if(!match || !/Chinatown-Rose Pak Station \(934 Stockton St\.\)/.test(match[11]))continue;
      // This reviewed multi-venue summary format names all three actual venues.
      // Unknown venue combinations require review rather than a misleading pin.
      if(!/CCC Art Center & Design Store \(667 Grant Ave\.\) and Empress of China \(838 Grant Ave\.\)\.$/.test(match[11]))continue;
      const day=`${match[4]}-${String(months.indexOf(match[2].slice(0,3).toLowerCase())+1).padStart(2,'0')}-${match[3].padStart(2,'0')}`;
      const clock=(h,m,period)=>{if(+h<1||+h>12||+(m??0)>59)throw new Error('Invalid clock');return `${String(+h%12+(period.toLowerCase()==='p'?12:0)).padStart(2,'0')}:${(m??'00').padStart(2,'0')}:00`;};
      let startDate,endDate;
      try{startDate=pacificTimestamp(`${day}T${clock(match[5],match[6],match[7])}`);endDate=pacificTimestamp(`${day}T${clock(match[8],match[9],match[10])}`);}catch{continue;}
      if(Date.parse(endDate)<=Date.parse(startDate))continue;
      let url;try{url=new URL(article.link,source.listingUrl);}catch{continue;}
      if(url.origin!==new URL(source.listingUrl).origin || !/^\/arts\/\d+\//.test(url.pathname))continue;
      const record={name:match[1],url:url.href,startDate,endDate,location:station,
        description:'Multiple venues: the map pin marks Chinatown–Rose Pak Station, 934 Stockton Street. Also at CCC Art Center & Design Store, 667 Grant Avenue, and Empress of China, 838 Grant Avenue. Check the article for individual activities.'};
      if(eventInCoverageWindow({startAt:startDate,endAt:endDate},pacificDay(now)))output.push({pageUrl:url.href,record,summary:record.description});
    }
  }
  if(output.length>(source.maxEvents ?? 40))throw new Error('KQED event limit exceeded');
  return output;
}
