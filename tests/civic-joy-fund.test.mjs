import test from 'node:test';
import assert from 'node:assert/strict';
import {expandCivicCalendar, collectCivicJoy} from '../scripts/adapters/civic-joy-fund.mjs';
const now = new Date('2026-09-06T17:00:00Z');
const event = (extra = '') => `BEGIN:VEVENT\nUID:cleanup\nDTSTART:20260907T170000Z\nDTEND:20260907T180000Z\nSUMMARY:Cleanup\nLOCATION:Richmond Republic\, 642 Clement St\, San Francisco\nDESCRIPTION:https://www.mobilize.us/civicjoyfund/event/756136/\n${extra}END:VEVENT\n`;
const calendar = body => `BEGIN:VCALENDAR\nVERSION:2.0\nX-WR-CALNAME:Civic Joy Fund Events\n${body}END:VCALENDAR\n`;
const source = {listingUrl:'https://civicjoyfund.org/events',calendarUrl:'https://calendar.google.com/test.ics',maxDetailPages:10};
const organizer = {id:756136,sponsor:{id:40887},location:{venue:'Richmond Republic',address_lines:['642 Clement St'],locality:'San Francisco',region:'CA',location:{latitude:37.7830943,longitude:-122.4662435}}};
function mock(ics, entries = [organizer], free = true) {
 return async url => url === source.listingUrl ? new Response(free ? 'our free outdoor events across San Francisco' : '') : url === source.calendarUrl ? new Response(ics) : Response.json({data:entries,next:null});
}
test('Civic Joy recurrence respects exclusions and replaces moved exceptions', () => {
 const recurring=event('RRULE:FREQ=WEEKLY;COUNT=5\nEXDATE:20260914T170000Z\n');
 const exception=event('RECURRENCE-ID:20260921T170000Z\n').replace('DTSTART:20260907T170000Z','DTSTART:20260922T190000Z').replace('DTEND:20260907T180000Z','DTEND:20260922T200000Z');
 const rows=expandCivicCalendar(calendar(recurring+exception),now);
 assert.deepEqual(rows.map(r=>r.startDate).sort(),['2026-09-07T17:00:00.000Z','2026-09-22T19:00:00.000Z','2026-09-28T17:00:00.000Z','2026-10-05T17:00:00.000Z']);
});
test('Civic Joy validates a complete calendar, missing times, duplicates and limits', () => {
 assert.throws(()=>expandCivicCalendar(calendar(event()).replace('END:VCALENDAR',''),now),/Incomplete/);
 assert.throws(()=>expandCivicCalendar(calendar(event()+event()),now),/Duplicate/);
 assert.throws(()=>expandCivicCalendar(calendar(event('RRULE:FREQ=DAILY;COUNT=100\n')),now,2),/limit/);
 assert.equal(expandCivicCalendar(calendar(event().replace('DTEND:20260907T180000Z\n','')),now).length,0);
 assert.equal(expandCivicCalendar(calendar(''),now).length,0);
});
test('Civic Joy publishes verified organizer venues, explicit free policy and stable recurring identities', async () => {
 const rows=await collectCivicJoy(source,mock(calendar(event('RRULE:FREQ=WEEKLY;COUNT=2\n'))),now);
 assert.equal(rows.length,2);assert.equal(rows.coverageDates.length,30);
 assert.notEqual(rows[0].record.identifier,rows[1].record.identifier);
 assert.deepEqual(rows[0].record.location.geo,organizer.location.location);
 assert.equal(rows[0].record.isAccessibleForFree,true);
});
test('Civic Joy never borrows geometry for mismatched venues or infers free admission',async()=>{
 const rows=await collectCivicJoy(source,mock(calendar(event().replace('642 Clement','999 Clement')),[organizer],false),now);
 assert.equal(rows[0].record.location.geo,undefined);assert.equal(rows[0].record.isAccessibleForFree,undefined);
});
test('Civic Joy cancellation keeps its identity without venue data',async()=>{
 const rows=await collectCivicJoy(source,mock(calendar(event('STATUS:CANCELLED\n')),[]),now);
 assert.equal(rows[0].record.eventStatus,'https://schema.org/EventCancelled');
 assert.equal(rows[0].record.identifier,'cleanup:2026-09-07T17:00:00.000Z');
});
test('Civic Joy incomplete organizer pagination fails without claiming coverage',async()=>{
 await assert.rejects(collectCivicJoy({...source,maxDetailPages:1},async url=> url===source.listingUrl?new Response(''):url===source.calendarUrl?new Response(calendar(event())):Response.json({data:[organizer],next:'https://api.mobilize.us/v1/organizations/40887/events?cursor=next'}),now),/pagination/);
 await assert.rejects(collectCivicJoy(source,async()=>new Response('',{status:429}),now),/429/);
});

test('live Valencia fixture uses only the verified September extent and preserves the full route',async()=>{
 const {readFile}=await import('node:fs/promises');
 const ics=await readFile(new URL('./fixtures/civic-joy-fund/valencia.ics',import.meta.url),'utf8');
 const rows=await collectCivicJoy(source,mock(ics),now);
 assert.equal(rows.length,1);assert.equal(rows[0].record.startDate,'2026-09-11T00:00:00.000Z');
 assert.equal(rows[0].curation.geometry.type,'LineString');assert.equal(rows[0].curation.geometry.coordinates.length,6);
 const earlier=await collectCivicJoy(source,mock(ics),new Date('2026-08-01T17:00:00Z'));
 assert.equal(earlier[0].curation,undefined);
});
test('a missing calendar address cannot borrow the organizer location',async()=>{
 const rows=await collectCivicJoy(source,mock(calendar(event().replace(/^LOCATION:.*\n/m,''))),now);
 assert.equal(rows[0].record.location.geo,undefined);
});

test('recurrence exceptions affect only their own UID',()=>{
 const first=event('RRULE:FREQ=WEEKLY;COUNT=3\n');
 const second=first.replace('UID:cleanup','UID:other');
 const moved=event('RECURRENCE-ID:20260914T170000Z\n').replace('UID:cleanup','UID:other').replace('DTSTART:20260907T170000Z','DTSTART:20260915T170000Z').replace('DTEND:20260907T180000Z','DTEND:20260915T180000Z');
 const rows=expandCivicCalendar(calendar(first+second+moved),now);
 assert.equal(rows.length,6);assert.equal(rows.filter(r=>r.item.uid==='cleanup').length,3);
 assert.ok(rows.some(r=>r.item.uid==='cleanup'&&r.startDate==='2026-09-14T17:00:00.000Z'));
});
test('street numbers must match completely when verifying venue coordinates',async()=>{
 const rows=await collectCivicJoy(source,mock(calendar(event().replace('642 Clement','1642 Clement'))),now);
 assert.equal(rows[0].record.location.geo,undefined);
});
test('cancelled recurrence without explicit times retains the original instance',async()=>{
 const master=event('RRULE:FREQ=WEEKLY;COUNT=2\n');
 const cancelled='BEGIN:VEVENT\nUID:cleanup\nRECURRENCE-ID:20260914T170000Z\nSTATUS:CANCELLED\nSUMMARY:Cleanup\nEND:VEVENT\n';
 const rows=await collectCivicJoy(source,mock(calendar(master+cancelled)),now);
 const item=rows.find(r=>r.record.eventStatus);
 assert.equal(item.record.startDate,'2026-09-14T17:00:00.000Z');
 assert.equal(item.record.endDate,'2026-09-14T18:00:00.000Z');
});

test('a festival with a verified intersection publishes as a point without invented boundaries',async()=>{
 const ics=calendar(event().replace('SUMMARY:Cleanup','SUMMARY:Chinatown Night Market').replace(/^LOCATION:.*$/m,'LOCATION:Grant Avenue & California Street, Grant Ave & California St, San Francisco, CA 94108, USA').replace(/^DESCRIPTION:.*$/m,''));
 const rows=await collectCivicJoy(source,mock(ics),now);
 assert.ok(rows[0].record.location.geo);assert.equal(rows[0].curation,undefined);
});

test('cancelled recurrence with a start but missing end retains a cancellation record',async()=>{
 const master=event('RRULE:FREQ=WEEKLY;COUNT=2\n');
 const cancelled='BEGIN:VEVENT\nUID:cleanup\nRECURRENCE-ID:20260914T170000Z\nDTSTART:20260914T170000Z\nSTATUS:CANCELLED\nSUMMARY:Cleanup\nEND:VEVENT\n';
 const rows=await collectCivicJoy(source,mock(calendar(master+cancelled)),now);
 assert.equal(rows.find(r=>r.record.eventStatus)?.record.endDate,'2026-09-14T18:00:00.000Z');
});
