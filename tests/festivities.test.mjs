import test from 'node:test';
import assert from 'node:assert/strict';
import { festivities } from '../config/festivities.mjs';
import { collectFestivity } from '../scripts/adapters/festivities.mjs';
import { sources } from '../config/sources.mjs';
import { normalizeJsonLd } from '../scripts/refresh-events.mjs';
import { validateEvent } from '../src/lib/events.mjs';
const now=new Date('2026-09-11T19:00:00Z');
const source=id=>sources.find(s=>s.id==='festivity-'+id);
const fetcher=f=>async url=>({ok:true,text:async()=>f.pages.find(p=>p.url===url).checks.join(' | ')});
const collect=(id,date=now)=>{const f=festivities.find(f=>f.id===id);return collectFestivity(source(id),fetcher(f),date);};
test('HSB publishes three separate meadow areas with a reviewed directions entrance',async()=>{
 const event=normalizeJsonLd(source('hardly-strictly'),(await collect('hardly-strictly'))[0]);
 assert.equal(event.curation.geometry.type,'MultiPolygon');
 assert.equal(event.curation.geometry.coordinates.length,3);
 assert.equal(event.curation.properties.layerType,'area');
 assert.ok(validateEvent(event));
 const {entranceDirectionsUrl}=await import('../src/lib/navigation.mjs');
 assert.match(entranceDirectionsUrl(event),/37.770495879/);
 const broken=structuredClone(event);broken.curation.geometry.coordinates[1][0].pop();
 assert.equal(validateEvent(broken),false);
 const empty=structuredClone(event);empty.curation.geometry.coordinates=[];
 assert.equal(validateEvent(empty),false);
 const {agentDocuments}=await import('../src/lib/agent-markdown.mjs');
 const doc=agentDocuments({schemaVersion:1,sources:[],events:[event]},{now}).find(d=>d.slug==='2026-10-02');
 assert.deepEqual(doc.data.events[0].curation.geometry,event.curation.geometry);
 assert.match(doc.body,/area \(MultiPolygon\)/);
 assert.match(doc.body,/OpenStreetMap contributors \(ODbL\)/);
 const {dedupeEvents}=await import('../src/lib/events.mjs');
 const entranceCopy=structuredClone(event);
 entranceCopy.id='civic-joy-fund:hsb-entrance';entranceCopy.source.id='civic-joy-fund';
 entranceCopy.curation.geometry=event.entrance.geometry;entranceCopy.curation.properties.layerType='poi';
 assert.deepEqual(dedupeEvents([entranceCopy,event]).map(e=>e.id),[event.id]);
});
test('refresh keeps meadow areas within SF publication bounds',async t=>{
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const {refreshEvents}=await import('../scripts/refresh-events.mjs');
 const dir=await mkdtemp(join(tmpdir(),'mapsf-meadows-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const manualPath=join(dir,'manual.json');
 await writeFile(manualPath,JSON.stringify({schemaVersion:1,events:[],overrides:[]}));
 const f=festivities.find(f=>f.id==='hardly-strictly');
 const snapshot=await refreshEvents({sources:[source(f.id)],manualPath,previousPath:join(dir,'previous.json'),outputPath:join(dir,'events.json'),fetchImpl:fetcher(f),now});
 assert.equal(snapshot.events.length,3);
 assert.ok(snapshot.events.every(e=>e.curation.geometry.type==='MultiPolygon'&&e.entrance));
});
test('annual editions publish only reviewed occurrences within thirty days',async()=>{
 let count=0;
 for(const f of festivities.filter(f=>f.occurrences.length)){
  assert.equal(source(f.id).showInSourceFilter,undefined);
  for(const row of await collect(f.id)){
   const event=normalizeJsonLd(source(f.id),row);
   assert.ok(validateEvent(event),f.id);assert.equal(event.recurring,undefined);
   assert.ok(event.startAt.slice(0,10)>='2026-09-11'&&event.startAt.slice(0,10)<='2026-10-10');count++;
  }
 }
 assert.equal(count,7);
 assert.equal((await collect('autumn-moon'))[0].curation.geometry.type,'LineString');
 assert.equal((await collect('folsom'))[0].curation.geometry.type,'Point');
 assert.equal((await collect('hardly-strictly'))[1].record.startDate,'2026-10-03T09:00:00-07:00');
});
test('incomplete editions are tracked internally and never extrapolated',async()=>{
 for(const f of festivities.filter(f=>!f.occurrences.length)) assert.equal(source(f.id),undefined);
 assert.equal((await collect('autumn-moon',new Date('2027-09-11T19:00:00Z'))).length,0);
 assert.equal((await collect('bay-to-breakers')).length,0);
});
test('festival costs preserve donation and age details and paid race registration',async()=>{
 const folsom=normalizeJsonLd(source('folsom'),(await collect('folsom'))[0]);
 assert.equal(folsom.cost.isFree,true);assert.match(folsom.cost.label,/donation/i);assert.match(folsom.description,/18\+/);
 const race=normalizeJsonLd(source('bay-to-breakers'),(await collect('bay-to-breakers',new Date('2027-05-01T19:00:00Z')))[0]);
 assert.equal(race.cost.isFree,false);assert.match(race.cost.label,/registration/i);
});
test('changed or unavailable official pages fail instead of silently confirming dates',async()=>{
 await assert.rejects(collectFestivity(source('autumn-moon'),async()=>({ok:false,status:503}),now),/HTTP/);
 await assert.rejects(collectFestivity(source('autumn-moon'),async()=>({ok:true,text:async()=>'<script>2026</script>Challenge'}),now),/review/);
});

test('original festival route replaces a calendar pin while associated workshops remain',async()=>{
 const {dedupeEvents}=await import('../src/lib/events.mjs');
 const original=normalizeJsonLd(source('autumn-moon'),(await collect('autumn-moon'))[0]);
 const copy={...structuredClone(original),id:'civic-joy-fund:copy',title:'Autumn Moon Festival',source:{id:'civic-joy-fund',name:'Civic Joy Fund',url:'https://example.org/event'}};
 copy.curation.geometry={type:'Point',coordinates:[-122.4064,37.795]};copy.curation.properties.layerType='poi';
 const workshop={...structuredClone(copy),id:'sfpl:workshop',title:'Workshop: Autumn Moon Festival lanterns'};
 assert.deepEqual(dedupeEvents([copy,workshop,original]).map(e=>e.id).sort(),[original.id,workshop.id].sort());
 assert.equal(dedupeEvents([original,{...copy,startAt:original.startAt.replace('11:00','12:00')}]).length,2);
});

test('publisher JSON-LD cannot spoof curated admission costs',async()=>{
 const raw=(await collect('folsom'))[0];delete raw.cost;
 raw.record.cost={label:'Paid entry',isFree:false};
 assert.equal(normalizeJsonLd(source('folsom'),raw).cost.isFree,true);
 const {applyVenuePriceHint}=await import('../src/lib/venue-pricing.mjs');
 const race=normalizeJsonLd(source('bay-to-breakers'),(await collect('bay-to-breakers',new Date('2027-05-01T19:00:00Z')))[0]);
 assert.equal(applyVenuePriceHint(race).cost.isFree,false);
});
