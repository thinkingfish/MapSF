import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesTimeOfDay } from '../src/lib/time-of-day.mjs';
import { filterEvents } from '../src/client/view-model.mjs';
const day = '2026-09-12';
const event = (start, end) => ({ startAt: `${day}T${start}:00-07:00`, endAt: `${day}T${end}:00-07:00` });
const slots = e => ['morning', 'afternoon', 'evening'].filter(slot => matchesTimeOfDay(e, day, slot));
test('cutoffs are exclusive ends and inclusive starts', () => {
  assert.deepEqual(slots(event('09:00','12:00')), ['morning']);
  assert.deepEqual(slots(event('12:00','18:00')), ['afternoon']);
  assert.deepEqual(slots(event('18:00','23:00')), ['evening']);
});
test('events spanning cutoffs match every overlapping period', () => {
  assert.deepEqual(slots(event('11:00','13:00')), ['morning','afternoon']);
  assert.deepEqual(slots(event('17:00','19:00')), ['afternoon','evening']);
  assert.deepEqual(slots(event('09:00','20:00')), ['morning','afternoon','evening']);
});
test('overnight and multiday events are clipped to the selected day', () => {
  assert.deepEqual(slots({startAt:'2026-09-11T22:00:00-07:00',endAt:`${day}T02:00:00-07:00`}), ['morning']);
  assert.deepEqual(slots({startAt:`${day}T22:00:00-07:00`,endAt:'2026-09-13T02:00:00-07:00'}), ['evening']);
  assert.deepEqual(slots({startAt:`${day}T00:00:00-07:00`,endAt:'2026-09-13T00:00:00-07:00'}), ['morning','afternoon','evening']);
  assert.deepEqual(slots({startAt:'2026-09-11T22:00:00-07:00',endAt:`${day}T00:00:00-07:00`}), []);
});
test('timestamps are interpreted in San Francisco, including DST transitions', () => {
  assert.deepEqual(slots({startAt:'2026-09-12T18:30:00Z',endAt:'2026-09-12T19:30:00Z'}), ['morning','afternoon']);
  for (const [date, startAt, endAt] of [
    ['2026-03-08','2026-03-08T01:30:00-08:00','2026-03-08T03:30:00-07:00'],
    ['2026-11-01','2026-11-01T01:45:00-07:00','2026-11-01T01:15:00-08:00'],
  ]) assert.equal(matchesTimeOfDay({startAt,endAt},date,'morning'),true);
});
test('time filtering composes with price/source and recurring place hours', () => {
  const events = [
    {...event('11:00','13:00'),id:'paid',cost:{isFree:false},source:{id:'one'}},
    {...event('17:00','19:00'),id:'place',cost:{isFree:true},source:{id:'one'},recurring:true},
  ];
  assert.deepEqual(filterEvents(events,{day,timeOfDay:'evening',freeOnly:true,excludedSourceIds:['one']}).map(e=>e.id),['place']);
  assert.equal(filterEvents(events,{day,timeOfDay:'morning',freeOnly:true}).length,0);
  assert.equal(filterEvents(events).length,2);
});
