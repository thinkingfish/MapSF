import test from 'node:test';
import assert from 'node:assert/strict';
import { collectMissionLocal } from '../scripts/adapters/mission-local.mjs';
const source={listingUrl:'https://missionlocal.org/events/',maxListingPages:10,maxEvents:1000};
const now=new Date('2026-09-06T18:00:00Z');
const event=(id,day='2026-09-07',overrides={})=>({id,status:'publish',url:`https://missionlocal.org/event/example-${id}/`,title:`Example ${id}`,start_date:`${day} 13:00:00`,end_date:`${day} 15:00:00`,utc_start_date:`${day} 20:00:00`,utc_end_date:`${day} 22:00:00`,timezone:'America/Los_Angeles',cost:'',venue:{venue:'Park',address:'19th &amp; Dolores',city:'San Francisco',state:'CA',zip:'94110',geo_lat:37.7596,geo_lng:-122.4269},...overrides});
function page(url,events,total,total_pages,next=true){const u=new URL(url);return new Response(JSON.stringify({events,total,total_pages,rest_url:u.href,...(Number(u.searchParams.get('page'))<total_pages&&next?{next_rest_url:(()=>{const n=new URL(u);n.searchParams.set('page',Number(n.searchParams.get('page'))+1);return n.href;})()}:{})}));}
test('paginates the explicit full month, including empty days and last-day events',async()=>{
 const calls=[];const result=await collectMissionLocal(source,async url=>{calls.push(url);return calls.length===1?page(url,[event(1)],2,2):page(url,[event(2,'2026-10-05',{cost:'Free'})],2,2);},now);
 assert.equal(calls.length,2);assert.equal(new URL(calls[0]).searchParams.get('start_date'),'2026-09-06 00:00:00');assert.equal(new URL(calls[0]).searchParams.get('end_date'),'2026-10-05 23:59:59');
 assert.equal(result.length,2);assert.equal(result.coverageComplete,true);assert.equal(result.coverageDates.length,30);assert.ok(result.coverageDates.includes('2026-09-20'));assert.equal(result.at(-1).record.startDate,'2026-10-05T13:00:00-07:00');assert.equal(result[0].record.isAccessibleForFree,undefined);assert.equal(result[1].record.isAccessibleForFree,true);
});
test('zero-result successful query still covers thirty dates',async()=>{const result=await collectMissionLocal(source,async url=>page(url,[],0,0),now);assert.equal(result.length,0);assert.equal(result.coverageDates.length,30);});
test('bad pagination, ignored date filters, HTTP failures and caps never claim full coverage',async()=>{
 await assert.rejects(collectMissionLocal(source,async url=>page(url,[],2,2),now),/empty|pagination/i);
 await assert.rejects(collectMissionLocal(source,async url=>page(url.replace('2026-10-05','2026-09-08'),[],0,0),now),/range|filter/i);
 await assert.rejects(collectMissionLocal({...source,maxListingPages:1},async url=>page(url,[event(1)],2,2),now),/limit/i);
 let calls=0;await assert.rejects(collectMissionLocal(source,async url=>++calls===1?page(url,[event(1)],2,2):new Response('',{status:503}),now),/503/);
 await assert.rejects(collectMissionLocal({...source,maxEvents:1},async url=>page(url,[event(1),event(2)],2,1),now),/limit/i);
});
test('keeps explicit cancellation identities and does not invent geometry or times',async()=>{
 const result=await collectMissionLocal(source,async url=>page(url,[event(1,'2026-09-07',{title:'Canceled: workshop'}),event(2,'2026-09-07',{venue:{venue:'Unknown'}}),event(3,'2026-09-07',{utc_start_date:'bad'})],3,1),now);
 assert.equal(result[0].record.identifier,1);assert.equal(result[0].record.eventStatus,'https://schema.org/EventCancelled');assert.equal(result[1].record.location.geo,undefined);assert.equal(result[2].record.startDate,undefined);assert.equal(result.coverageDates.length,30);
});
test('Pacific DST transition uses publisher UTC evidence and a thirty-calendar-day query',async()=>{
 const result=await collectMissionLocal(source,async url=>page(url,[event(1,'2026-11-01',{utc_start_date:'2026-11-01 21:00:00',utc_end_date:'2026-11-01 23:00:00'})],1,1),new Date('2026-10-20T19:00:00Z'));
 assert.equal(result[0].record.startDate,'2026-11-01T13:00:00-08:00');assert.equal(result.coverageDates.at(-1),'2026-11-18');
});
