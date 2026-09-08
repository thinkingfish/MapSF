import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduledPlacesForDay } from '../src/lib/places.mjs';
import { places } from '../config/places.mjs';
import { museums } from '../config/museums.mjs';
import { validateEvent } from '../src/lib/events.mjs';
const on = (day, id, now = `${day}T12:00:00-08:00`) => scheduledPlacesForDay(day, { now: new Date(now) }).find(e => e.id === `place:${id}:${day}`);

test('first Sunday museum and nth Tuesday garden rules produce only one card per venue', () => {
  assert.equal(on('2026-09-06', 'asian-art-museum').cost.label, 'Free general admission');
  assert.equal(on('2026-09-13', 'asian-art-museum'), undefined);
  assert.equal(on('2026-09-08', 'sf-botanical-garden').cost.label, 'Free general admission');
  assert.equal(on('2026-09-01', 'conservatory-of-flowers').cost.label, 'Free general admission');
  assert.equal(on('2026-09-08', 'conservatory-of-flowers').cost.label, 'Free for SF residents');
  const events = scheduledPlacesForDay('2026-09-08');
  assert.equal(new Set(events.map(e => e.id)).size, events.length);
});
test('resident admission stays all day while public early entry is explicit', () => {
  const garden = on('2026-09-07', 'sf-botanical-garden');
  assert.equal(garden.cost.label, 'Free for SF residents');
  assert.match(garden.eligibility, /ID|proof/);
  assert.match(garden.admissionNote, /7:30 AM–9 AM/);
  assert.match(garden.endAt, /18:00:00-07:00$/);
  assert.match(on('2026-09-07', 'japanese-tea-garden').admissionNote, /9 AM–10 AM/);
  assert.doesNotMatch(on('2026-09-08', 'japanese-tea-garden').admissionNote, /9 AM–10 AM/);
});
test('seasonal hours and explicit San Francisco DST offsets', () => {
  for (const [day, end] of [['2026-01-10','16:00:00-08:00'],['2026-02-10','17:00:00-08:00'],['2026-03-07','17:00:00-08:00'],['2026-03-08','18:00:00-07:00'],['2026-09-30','18:00:00-07:00'],['2026-10-31','17:00:00-07:00'],['2026-11-01','16:00:00-08:00']]) {
    assert.equal(on(day,'sf-botanical-garden').endAt, `${day}T${end}`);
  }
  assert.match(on('2026-02-10','japanese-tea-garden').endAt, /16:30:00-08:00$/);
  assert.match(on('2026-03-01','japanese-tea-garden').endAt, /17:30:00-08:00$/);
});
test('closures, public holidays, and bounded annual review', () => {
  for (const day of ['2026-09-09','2026-01-21','2026-02-03','2026-02-04']) assert.equal(on(day,'conservatory-of-flowers'), undefined);
  assert.ok(on('2026-02-05','conservatory-of-flowers'));
  assert.ok(on('2026-09-07','conservatory-of-flowers'));
  for (const day of ['2026-01-01','2026-11-26','2026-12-25']) assert.equal(on(day,'sf-botanical-garden').cost.label,'Free general admission');
  assert.deepEqual(scheduledPlacesForDay('2027-01-01'), []);
  assert.deepEqual(scheduledPlacesForDay('2026-02-30'), []);
});
test('last entry cutoff uses the SF day even after UTC midnight and retains planning card', () => {
  assert.equal(on('2026-09-06','sf-botanical-garden','2026-09-07T00:59:59Z').entryEnded,false);
  assert.equal(on('2026-09-06','sf-botanical-garden','2026-09-07T01:00:00Z').entryEnded,true);
  assert.equal(on('2026-09-07','sf-botanical-garden','2026-09-07T01:00:00Z').entryEnded,false);
  assert.match(on('2026-09-06','conservatory-of-flowers').hoursLabel, /last entry/);
});
test('each generated card contains full validated point curation with provenance', () => {
  assert.equal(museums.length,1);
  assert.equal(places.length,3);
  for (const event of scheduledPlacesForDay('2026-09-06')) {
    assert.equal(validateEvent(event),true, event.id);
    assert.equal(event.recurring,true);
    assert.equal(event.curation.geometry.type,'Point');
    assert.match(event.curation.properties.metadata.coordinateSource,/^https:/);
    assert.equal(event.curation.properties.metadata.verifiedAt,'2026-09-06');
  }
  assert.deepEqual(scheduledPlacesForDay('2026-09-06',{places:[]}),[]);
  assert.equal(scheduledPlacesForDay('2026-09-06',{places:[places[0],places[0]]}).length,1);
});
