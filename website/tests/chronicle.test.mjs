import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {collectChronicle} from '../scripts/adapters/chronicle.mjs';
const fixture=JSON.parse(await readFile(new URL('./fixtures/chronicle/event.json',import.meta.url)));
const source={listingUrl:'https://www.sfchronicle.com/entertainment/events/',maxRequestsPerDay:10,maxEvents:2000};
const now=new Date('2026-09-06T18:00:00Z');
const response=events=>new Response(JSON.stringify({events}));
function fetcher(events, calls=[]){return async url=>{calls.push(url);const u=new URL(url);assert.equal(u.origin,'https://discovery.evvnt.com');assert.equal(u.searchParams.get('publisher_id'),'6745');assert.equal(u.searchParams.get('hitsPerPage'),'1000');assert.equal(u.searchParams.get('multipleEventInstances'),'true');assert.equal(u.searchParams.get('fromDate'),u.searchParams.get('toDate'));return response(u.searchParams.get('page')==='0'?events.filter(e=>e.start_date===u.searchParams.get('fromDate')):[]);};}
test('collects all thirty dates through explicit terminal pages and preserves publisher facts',async()=>{
 const calls=[];const last={...fixture,objectID:'last',source_id:123,start_date:'2026-10-05',start_time:'2026-10-05T18:30:00-07:00',end_time:'2026-10-05T23:30:00-07:00'};
 const result=await collectChronicle(source,fetcher([fixture,last],calls),now);
 assert.equal(result.length,2);assert.equal(result.coverageComplete,true);assert.equal(result.coverageDates.length,30);assert.equal(result.coverageDates.at(-1),'2026-10-05');assert.equal(calls.length,32);
 assert.equal(result[0].record.startDate,'2026-09-07T18:30:00-07:00');assert.deepEqual(result[0].record.location.geo,{latitude:37.7831236,longitude:-122.4637279});assert.equal(result[0].record.offers.price,'30.0');assert.equal(result[0].record.identifier,'41576771');assert.match(result[0].pageUrl,/_evDiscoveryPath=/);
});
test('rejects nonempty continuation pages because publisher sorting can omit events',async()=>{
 const calls=[];await assert.rejects(collectChronicle(source,async url=>{calls.push(url);const u=new URL(url),page=Number(u.searchParams.get('page'));return response(u.searchParams.get('fromDate')==='2026-09-07'&&page<2?[{...fixture,objectID:String(page)}]:[]);},now),/pagination|continuation/i);
 await assert.rejects(collectChronicle(source,async url=>response(new URL(url).searchParams.get('fromDate')==='2026-09-07'?[fixture]:[]),now),/pagination|continuation/i);
});
test('ignored date filters, malformed payloads, HTTP failures and request or event caps fail closed',async()=>{
 await assert.rejects(collectChronicle(source,async()=>response([fixture]),now),/date|range/i);
 await assert.rejects(collectChronicle(source,async()=>new Response('{}'),now),/invalid/i);
 await assert.rejects(collectChronicle(source,async()=>new Response('',{status:503}),now),/503/);
 await assert.rejects(collectChronicle({...source,maxRequestsPerDay:1},fetcher([fixture]),now),/limit/i);
 await assert.rejects(collectChronicle({...source,maxEvents:0},fetcher([fixture]),now),/limit/i);
});
test('missing coordinates or prices are not invented; cancellation identity remains',async()=>{
 const e={...fixture,title:'Cancelled: dance',prices:{},venue:{name:'Unknown'},source_status:'cancelled'};
 const result=await collectChronicle(source,fetcher([e]),now);assert.equal(result[0].record.location.geo,undefined);assert.equal(result[0].record.offers,undefined);assert.equal(result[0].record.isAccessibleForFree,undefined);assert.equal(result[0].record.eventStatus,'https://schema.org/EventCancelled');
});
test('DST window retains thirty Pacific dates and source offsets',async()=>{
 const e={...fixture,start_date:'2026-11-01',start_time:'2026-11-01T18:30:00-08:00',end_time:'2026-11-01T23:30:00-08:00',prices:{Admission:'USD 0.0'}};
 const result=await collectChronicle(source,fetcher([e]),new Date('2026-10-20T19:00:00Z'));assert.equal(result.coverageDates.at(-1),'2026-11-18');assert.equal(result[0].record.startDate,e.start_time);assert.equal(result[0].record.isAccessibleForFree,true);
});
test('duplicate identities and offset-less dates cannot claim coverage',async()=>{
 await assert.rejects(collectChronicle(source,fetcher([fixture,fixture]),now),/duplicate/i);
 await assert.rejects(collectChronicle(source,fetcher([{...fixture,start_time:'2026-09-07T18:30:00'}]),now),/date/i);
});
test('mixed ticket tiers do not become free and virtual venues do not become points',async()=>{
 const result=await collectChronicle(source,fetcher([{...fixture,online_only:true,prices:{Child:'USD 0.0',Adult:'USD 20.0'}}]),now);
 assert.equal(result[0].record.location.geo,undefined);assert.equal(result[0].record.isAccessibleForFree,undefined);assert.equal(result[0].record.offers,undefined);
});
