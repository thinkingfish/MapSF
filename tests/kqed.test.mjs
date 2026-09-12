import test from 'node:test';
import assert from 'node:assert/strict';
import {collectKqed} from '../scripts/adapters/kqed.mjs';
import {sources} from '../config/sources.mjs';
import {normalizeJsonLd} from '../scripts/refresh-events.mjs';
import {validateEvent} from '../src/lib/events.mjs';
const source=sources.find(s=>s.id==='kqed');
const article={status:'publish',source:'The Do List',link:'/arts/13993605/day-of-public-art-san-francisco-chinatown-ccc-cmac-sfac',content:'<p><em><a href="https://www.sf.gov/event-a-day-of-public-art-in-chinatown">A Day of Public Art in Chinatown</a> takes place Sept. 12, 2026, 11 a.m.–4 p.m. at the Chinatown-Rose Pak Station (934 Stockton St.), CCC Art Center &amp; Design Store (667 Grant Ave.) and Empress of China (838 Grant Ave.).</em></p>'};
const fetcher=articles=>async()=>({ok:true,text:async()=>`<script id='initial-state'>window.__IS_SSR__=true\nwindow.__INITIAL_STATE__=${JSON.stringify({postsReducer:articles})}</script>`});
const now=new Date('2026-09-11T12:00:00-07:00');
test('KQED uses explicit event summaries and reviewed SF venues, not article dates or headline geography',async()=>{
 const records=await collectKqed(source,fetcher({one:article}),now);
 assert.equal(records.length,1);assert.equal(records[0].record.startDate,'2026-09-12T11:00:00-07:00');
 assert.equal(records[0].record.name,'A Day of Public Art in Chinatown');
 const event=normalizeJsonLd(source,records[0]);assert.ok(validateEvent(event));assert.equal(event.cost.label,'Cost not listed');
 assert.equal(event.curation.geometry.type,'Point');assert.match(event.description,/Multiple venues/);
 for(const content of [article.content.replace('934 Stockton St.','1 Main St., Oakland'),article.content.replace('takes place','was published'),article.content.replace('Sept. 12','Sept. 32')]) {
  assert.equal((await collectKqed(source,fetcher({one:{...article,content,publishDate:'2026-09-12'}}),now)).length,0);
 }
});
test('KQED rejects missing article data and keeps empty discovery distinct from full-month coverage',async()=>{
 await assert.rejects(collectKqed(source,async()=>({ok:true,text:async()=>'<html>Challenge</html>'}),now));
 const records=await collectKqed(source,fetcher({one:{...article,content:'<p>Restaurant review in San Francisco</p>'}}),now);
 assert.deepEqual(records,[]);assert.equal(records.coverageComplete,undefined);
});
test('KQED does not retain an old summary when the article headline announces cancellation',async()=>{
 const records=await collectKqed(source,fetcher({one:{...article,title:'Cancelled: A Day of Public Art in Chinatown'}}),now);
 assert.deepEqual(records,[]);
});
