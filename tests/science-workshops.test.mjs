import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduledPlacesForDay } from '../src/lib/places.mjs';
import { scienceWorkshops } from '../config/science-workshops.mjs';
import { validateEvent } from '../src/lib/events.mjs';

const on = day => scheduledPlacesForDay(day, { places: scienceWorkshops });

test('Mission community days follow the current flyer across the school-year boundary', () => {
  for (const day of ['2026-09-12', '2026-10-10', '2026-11-14', '2026-12-12', '2027-01-09', '2027-02-13', '2027-03-13', '2027-04-10', '2027-05-08', '2027-06-12']) {
    const [event] = on(day);
    assert.equal(on(day).length, 1, day);
    assert.equal(validateEvent(event), true);
    assert.equal(event.source.id, 'mission-science-workshop');
    assert.match(event.title, /Mission site/);
    assert.equal(event.hoursLabel, '10 AM–3 PM');
    assert.match(event.admissionNote, /drop-in/i);
    assert.match(event.admissionNote, /Church Street/);
    assert.equal(event.curation.geometry.type, 'Point');
    assert.deepEqual(event.curation.geometry.coordinates, [-122.4271766, 37.7617582]);
  }
});

test('unlisted dates, summer, Tuesdays, and other sites cannot become invented drop-in days', () => {
  for (const day of ['2026-08-08', '2026-09-08', '2026-09-19', '2026-10-03', '2026-10-18', '2027-06-19', '2027-07-10', '2027-09-12', '2026-01-09']) {
    assert.deepEqual(on(day), [], day);
  }
});

test('drop-in times use the correct SF offset and expire after the last published date', () => {
  assert.equal(on('2026-09-12')[0].startAt, '2026-09-12T10:00:00-07:00');
  assert.equal(on('2027-01-09')[0].endAt, '2027-01-09T15:00:00-08:00');
  assert.equal(on('2027-06-12')[0].curation.properties.metadata.validThrough, '2027-06-12');
  assert.deepEqual(on('2028-01-09'), []);
});
