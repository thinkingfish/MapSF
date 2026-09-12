import test from 'node:test';
import assert from 'node:assert/strict';
import { farmersMarkets } from '../config/farmers-markets.mjs';
import { collectFarmersMarket } from '../scripts/adapters/farmers-markets.mjs';
import { normalizeJsonLd } from '../scripts/refresh-events.mjs';
import { sources } from '../config/sources.mjs';
import { validateEvent, dedupeEvents } from '../src/lib/events.mjs';
const source = id => sources.find(s=>s.id===`market-${id}`);
const html = m => `<main>${m.checks.join(' | ')}</main>`;
const fetcher = m => async()=>({ok:true,text:async()=>html(m)});
const now = new Date('2026-09-11T19:00:00Z');
const collect = (id, date=now) => {const m=farmersMarkets.find(m=>m.id===id);return collectFarmersMarket(source(id),fetcher(m),date);};

test('verified market catalog produces validated Events in the 30-day window', async()=>{
 assert.equal(farmersMarkets.length,14);
 for(const m of farmersMarkets){
  assert.equal(source(m.id).showInSourceFilter,undefined);
  const rows=await collect(m.id);assert.ok(rows.length>0,m.id);
  for(const row of rows){const e=normalizeJsonLd(source(m.id),row);assert.ok(validateEvent(e),m.id);assert.ok(e.startAt.slice(0,10)>='2026-09-11'&&e.startAt.slice(0,10)<='2026-10-10');assert.equal(e.recurring,undefined);assert.equal(e.cost.isFree,true);assert.match(e.description,/purchases cost extra/i);}
 }
 const ferry=await collect('ferry-plaza');assert.equal(ferry.length,13);
 assert.equal(ferry[0].record.startDate,'2026-09-12T08:00:00-07:00');
 assert.equal(ferry[1].record.startDate,'2026-09-15T10:00:00-07:00');
 assert.equal((await collect('alemany'))[0].record.startDate,'2026-09-12T07:00:00-07:00');
});

test('market seasons, expiry, holiday exclusions and Pacific DST are bounded',async()=>{
 assert.equal((await collect('castro',new Date('2026-11-19T18:00:00Z'))).length,0);
 assert.equal((await collect('mission',new Date('2026-11-13T18:00:00Z'))).length,0);
 await assert.rejects(collect('ferry-plaza',new Date('2027-01-01T18:00:00Z')), /expired/);
 const heart=await collect('heart-of-city',new Date('2026-12-01T18:00:00Z'));
 assert.ok(heart.every(x=>x.record.startDate.endsWith('-08:00')));
 assert.ok(!heart.some(x=>['2026-12-24','2026-12-25'].includes(x.record.startDate.slice(0,10))));
 const dst=await collect('outer-sunset',new Date('2026-10-30T18:00:00Z'));
 assert.equal(dst[0].record.startDate,'2026-11-01T09:00:00-08:00');
});

test('market collector rejects failed or changed schedule pages',async()=>{
 const m=farmersMarkets[0];
 await assert.rejects(collectFarmersMarket(source(m.id),async()=>({ok:false,status:503}),now));
 await assert.rejects(collectFarmersMarket(source(m.id),async()=>({ok:true,text:async()=>'<html>Challenge</html>'}),now));
 await assert.rejects(collectFarmersMarket(source(m.id),async()=>({ok:true,text:async()=>html(m).replace(m.checks.at(-1),'Changed')}),now));
});

test('street markets preserve routes and mapped Alemany grounds are an area',async()=>{
 for(const id of ['mission','outer-sunset','heart-of-city','castro']) assert.equal((await collect(id))[0].curation.geometry.type,'LineString');
 assert.equal((await collect('alemany'))[0].curation.geometry.type,'Polygon');
});

test('matching syndicated market occurrences prefer the operator, but concerts remain separate',async()=>{
 const original=normalizeJsonLd(source('outer-sunset'),(await collect('outer-sunset'))[0]);
 const publisher={...structuredClone(original),id:'sf-chronicle:copy',source:{id:'sf-chronicle',name:'SF Chronicle',url:'https://example.org/event'}};
 publisher.title='Outer Sunset Farmers Market';publisher.curation.geometry={type:'Point',coordinates:[-122.4955,37.74966]};publisher.curation.properties.layerType='poi';
 const concert={...structuredClone(publisher),id:'sf-chronicle:concert',title:'Syd and I live at the Outer Sunset Farmers Market'};
 assert.deepEqual(dedupeEvents([publisher,concert,original]).map(e=>e.id).sort(),[original.id,concert.id].sort());
 assert.equal(dedupeEvents([original,{...publisher,startAt:original.startAt.replace('09:00','10:00')}]).length,2);
});

test('market deduplication retains a same-name event at a different venue',async()=>{
 const original=normalizeJsonLd(source('outer-sunset'),(await collect('outer-sunset'))[0]);
 const elsewhere={...structuredClone(original),id:'sf-chronicle:elsewhere',source:{id:'sf-chronicle',name:'Chronicle',url:'https://example.org/elsewhere'}};
 elsewhere.curation.geometry={type:'Point',coordinates:[-122.42,37.77]};elsewhere.curation.properties.layerType='poi';
 assert.equal(dedupeEvents([original,elsewhere]).length,2);
});
