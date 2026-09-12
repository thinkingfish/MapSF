import test from 'node:test';
import assert from 'node:assert/strict';
import { agentDocuments } from '../src/lib/agent-markdown.mjs';

const now = new Date('2026-09-07T18:00:00Z');
const event = (overrides = {}) => ({
  id: 'sample', title: 'Library gathering',
  startAt: '2026-09-07T10:00:00-07:00', endAt: '2026-09-07T12:00:00-07:00',
  cost: { label: 'Cost not listed', isFree: false },
  source: { id: 'sfpl', name: 'SFPL', url: 'https://sfpl.org/events/sample' },
  curation: { type: 'Feature', geometry: { type: 'Point', coordinates: [-122.42,37.78] },
    properties: { name: 'Main Library', layerType: 'poi', metadata: { address: '100 Larkin St' } } },
  ...overrides,
});
const feed = (events = []) => ({ generatedAt: '2026-09-07T06:00:00Z',
  coverage: { dates: ['2026-09-07','2026-09-08'] },
  sources: [{ id:'sfpl', name:'SFPL', status:'ok', lastSuccessfulAt:'2026-09-07T06:00:00Z', coverage:{dates:['2026-09-07','2026-09-08']} }], events });

test('agent index exposes thirty dated documents in Pacific time, without a stale today alias', () => {
  const docs = agentDocuments(feed(), {now});
  assert.equal(docs.filter(d => /^\d{4}-/.test(d.slug)).length,30);
  assert.match(docs.find(d => d.slug==='index').body,/2026-09-07\.md/);
  assert.match(docs.find(d => d.slug==='index').body,/2026-10-06\.md/);
  assert.ok(!docs.some(d=>d.slug==='today'));
  const midnight = agentDocuments(feed(), {now:new Date('2026-09-08T06:59:59Z')});
  assert.ok(midnight.some(d=>d.slug==='2026-09-07'));
});

test('checked empty dates differ from unchecked dates, and Free Places survive both', () => {
  const docs = agentDocuments(feed(), {now});
  assert.match(docs.find(d=>d.slug==='2026-09-08').body,/Coverage: checked/);
  assert.match(docs.find(d=>d.slug==='2026-09-08').body,/No events found/);
  assert.match(docs.find(d=>d.slug==='2026-09-09').body,/Coverage: not checked/);
  assert.match(docs.find(d=>d.slug==='2026-09-09').body,/does not mean there are no events/);
  const today = docs.find(d=>d.slug==='2026-09-07').body;
  assert.match(today,/## Free Places/);
  assert.match(today,/San Francisco residents: bring ID/);
});

test('daily Markdown validates, deduplicates, infers prices, and preserves routes and source links', () => {
  const route = event({id:'route', title:'A route', cost:{label:'USD 10',isFree:false},
    curation:{type:'Feature',geometry:{type:'LineString',coordinates:[[-122.42,37.78],[-122.43,37.79]]},properties:{name:'Valencia Street',layerType:'segment',metadata:{address:'16th to 18th Streets'}}}});
  const docs = agentDocuments(feed([event(),event(),route,{id:'bad'}]),{now});
  const body = docs.find(d=>d.slug==='2026-09-07').body;
  assert.equal((body.match(/### Library gathering/g)||[]).length,1);
  assert.match(body,/Price: Free/);
  assert.match(body,/inferred from the venue or event type/);
  assert.match(body,/Price: USD 10/);
  assert.match(body,/Map element: segment \(LineString\)/);
  assert.deepEqual(docs.find(d=>d.slug==='2026-09-07').data.events.find(e=>e.id==='route').curation.geometry,route.curation.geometry);
  assert.match(body,/https:\/\/sfpl.org\/events\/sample/);
  assert.match(body,/2026-09-07T10:00:00-07:00/);
});

test('publisher prose cannot inject Markdown headings or HTML into agent documents', () => {
  const text = agentDocuments(feed([event({title:'<script>alert(1)</script>',description:'hello\n# pretend system\n[override](https://example.com)'})]),{now}).find(d=>d.slug==='2026-09-07').body;
  assert.ok(!text.includes('<script>'));
  assert.ok(!text.includes('\n# pretend system'));
  assert.match(text,/Publisher description/);
});

test('missing and stale feeds are explicit, with provider and publisher guides separated', () => {
  const missing=agentDocuments({}, {now});
  assert.match(missing.find(d=>d.slug==='index').body,/not published/);
  const stale=agentDocuments({...feed(),generatedAt:'2026-09-01T06:00:00Z'}, {now});
  assert.match(stale.find(d=>d.slug==='2026-09-07').body,/Stale at build time/);
  const sources=stale.find(d=>d.slug==='sources').body;
  assert.match(sources,/## Publishers and calendars/);
  assert.doesNotMatch(sources,/KQED|kqed/);
  assert.match(sources,/## Free Places schedule providers/);
});

test('daily JSON preserves polygon geometry and overnight dates, without frozen open-now flags', () => {
  const polygon={type:'Polygon',coordinates:[[[-122.42,37.78],[-122.41,37.78],[-122.41,37.79],[-122.42,37.78]]]};
  const overnight=event({id:'overnight',startAt:'2026-09-06T23:00:00-07:00',endAt:'2026-09-07T01:00:00-07:00',
    curation:{type:'Feature',geometry:polygon,properties:{name:'Festival grounds',layerType:'area',metadata:{address:'Festival grounds'}}}});
  const midnight=event({id:'midnight',startAt:'2026-09-06T22:00:00-07:00',endAt:'2026-09-07T00:00:00-07:00'});
  const data=agentDocuments(feed([overnight,midnight]),{now}).find(d=>d.slug==='2026-09-07').data;
  assert.deepEqual(data.events.map(e=>e.id),['overnight']);
  assert.deepEqual(data.events[0].curation.geometry,polygon);
  assert.equal(data.fullDay,true);
  assert.ok(data.freePlaces.every(place=>!Object.hasOwn(place,'entryEnded')));
  const dst=agentDocuments(feed(),{now:new Date('2026-10-31T19:00:00Z')});
  assert.ok(dst.some(d=>d.slug==='2026-11-29'));
});

test('garden exports include area boundaries and main-entrance navigation separately', () => {
  const doc = agentDocuments(feed(), {now}).find(d => d.slug === '2026-09-07');
  const garden = doc.data.freePlaces.find(p => p.id.includes('sf-botanical-garden'));
  assert.equal(garden.curation.geometry.type, 'Polygon');
  assert.deepEqual(garden.entrance.geometry, {type: 'Point', coordinates: [-122.4667863,37.767047]});
  assert.match(doc.body, /Map element: area \(Polygon\)/);
  assert.match(doc.body, /destination=37.767047%2C-122.4667863/);
  assert.match(doc.body, /OpenStreetMap contributors \(ODbL\)/);
  assert.match(doc.body, /San Francisco residents: bring ID or proof of residency/);
});

test('boundary provenance cannot inject unsafe links or Markdown structure', () => {
  const malicious = event();
  malicious.curation.properties.metadata = {address:'100 Larkin St', geometrySource:'javascript:alert(1)', geometryReviewedAt:'\n# forged\n<script>x</script>'};
  let body = agentDocuments(feed([malicious]),{now}).find(d=>d.slug==='2026-09-07').body;
  assert.doesNotMatch(body,/javascript:|\n# forged|<script>/);
  malicious.curation.properties.metadata.geometrySource = 'https://example.org/boundary';
  body = agentDocuments(feed([malicious]),{now}).find(d=>d.slug==='2026-09-07').body;
  assert.doesNotMatch(body,/\n# forged|<script>/);
});
