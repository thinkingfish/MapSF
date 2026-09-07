import ICAL from 'ical.js';
import {civicJoyPoints} from '../../config/civic-joy-points.mjs';
import {valenciaLiveRoute, valenciaLiveRouteDates} from '../../config/civic-joy-routes.mjs';
import { lastCoverageDay, pacificDay } from '../coverage.mjs';

const headers = { 'user-agent': 'MapSF/1.0 (public SF event collector)' };
async function request(url, fetchImpl, type = 'text') {
  const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Civic Joy request failed (${response.status})`);
  return response[type]();
}
function instant(time) {
  if (!time || time.isDate || time.zone?.tzid === 'floating') return null;
  return time.toJSDate().toISOString();
}
export function expandCivicCalendar(text, now = new Date(), limit = 1000) {
  if (!/^BEGIN:VCALENDAR\r?\n/.test(text) || !/END:VCALENDAR\s*$/.test(text)) throw new Error('Incomplete Civic Joy calendar');
  const calendar = new ICAL.Component(ICAL.parse(text));
  if (calendar.getFirstPropertyValue('x-wr-calname') !== 'Civic Joy Fund Events') throw new Error('Unexpected Civic Joy calendar');
  const components = calendar.getAllSubcomponents('vevent');
  if (components.length > 5000) throw new Error('Civic Joy calendar record limit exhausted');
  for (const timezone of calendar.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(timezone);
  const first = pacificDay(now), last = lastCoverageDay(first);
  // A cancelled recurrence may omit DTSTART/DTEND. Its recurrence ID and
  // master's duration still identify the original instance to suppress.
  for (const component of components) {
    if (!component.hasProperty('recurrence-id') || (component.hasProperty('dtstart') && (component.hasProperty('dtend') || component.hasProperty('duration'))) || component.getFirstPropertyValue('status') !== 'CANCELLED') continue;
    const master = components.find(c => !c.hasProperty('recurrence-id') && c.getFirstPropertyValue('uid') === component.getFirstPropertyValue('uid'));
    if (!master) throw new Error('Civic Joy cancellation has no recurrence master');
    const start = (component.getFirstPropertyValue('dtstart') || component.getFirstPropertyValue('recurrence-id')).clone();
    const end = start.clone();
    end.addDuration(new ICAL.Event(master, {exceptions: []}).duration);
    if (!component.hasProperty('dtstart')) component.addPropertyWithValue('dtstart', start);
    if (!component.hasProperty('dtend') && !component.hasProperty('duration')) component.addPropertyWithValue('dtend', end);
  }
  const results = [];
  const add = (item, start, end, recurrenceId) => {
    const startDate = instant(start), endDate = instant(end);
    if (!startDate || !endDate || endDate <= startDate) return;
    if (pacificDay(new Date(startDate)) > last || pacificDay(new Date(new Date(endDate).getTime() - 1)) < first) return;
    results.push({item, startDate, endDate, recurrenceId});
    if (results.length > limit) throw new Error('Civic Joy event limit exhausted');
  };
  const seen = new Set();
  for (const component of components) {
    if (component.hasProperty('recurrence-id')) continue;
    const item = new ICAL.Event(component, {exceptions: components.filter(c => c.hasProperty('recurrence-id') && c.getFirstPropertyValue('uid') === component.getFirstPropertyValue('uid'))});
    if (item.isRecurrenceException()) continue;
    if (!item.uid || seen.has(item.uid)) throw new Error('Duplicate or missing Civic Joy event UID');
    seen.add(item.uid);
    if (!component.hasProperty('dtstart') || (!component.hasProperty('dtend') && !component.hasProperty('duration'))) continue;
    if (!instant(item.startDate)) continue;
    if (!item.isRecurring()) { add(item, item.startDate, item.endDate, null); continue; }
    const iterator = item.iterator();
    let count = 0, next;
    while ((next = iterator.next())) {
      if (++count > 20000) throw new Error('Civic Joy recurrence limit exhausted');
      if (pacificDay(next.toJSDate()) > last) break;
      const occurrence = item.getOccurrenceDetails(next);
      add(occurrence.item, occurrence.startDate, occurrence.endDate, instant(next));
    }
  }
  // Detached exceptions can be moved into this window from an original date
  // outside it. Replace the matching generated instance or add the detached one.
  for (const component of components.filter(c => c.hasProperty('recurrence-id'))) {
    const item = new ICAL.Event(component, {exceptions: []});
    const recurrenceId = instant(item.recurrenceId);
    const index = results.findIndex(r => r.item.uid === item.uid && r.recurrenceId === recurrenceId);
    if (index >= 0) results.splice(index, 1);
    add(item, item.startDate, item.endDate, recurrenceId);
  }
  return results;
}
function organizerUrl(description) {
  const match = description?.match(/https:\/\/(?:www\.)?mobilize\.us\/civicjoyfund\/event\/(\d+)\/?/i);
  return match ? {url: `https://www.mobilize.us/civicjoyfund/event/${match[1]}/`, id: match[1]} : null;
}
function normalizedAddress(value = '') { return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
export async function collectCivicJoy(source, fetchImpl = fetch, now = new Date()) {
  const listing = await request(source.listingUrl, fetchImpl);
  const free = /our free outdoor events across San Francisco/i.test(listing);
  const calendar = await request(source.calendarUrl, fetchImpl);
  const occurrences = expandCivicCalendar(calendar, now, source.maxEvents ?? 1000);
  const venues = new Map(), output = [];
  if (occurrences.some(({item}) => organizerUrl(item.description))) {
    const base = 'https://api.mobilize.us/v1/organizations/40887/events';
    let next = base;
    const seenPages = new Set();
    while (next) {
      const url = new URL(next);
      if (url.origin !== 'https://api.mobilize.us' || url.pathname !== '/v1/organizations/40887/events' || seenPages.has(url.href) || seenPages.size >= (source.maxDetailPages ?? 10)) throw new Error('Invalid or exhausted Civic Joy organizer pagination');
      seenPages.add(url.href);
      const data = await request(url.href, fetchImpl, 'json');
      if (!Array.isArray(data.data) || !Object.hasOwn(data, 'next')) throw new Error('Unexpected Civic Joy organizer response');
      for (const event of data.data) {
        if (!Number.isInteger(event.id) || venues.has(String(event.id))) throw new Error('Duplicate or missing Civic Joy organizer identity');
        if (event.sponsor?.id === 40887) venues.set(String(event.id), event);
      }
      next = data.next;
    }
  }
  for (const occurrence of occurrences) {
    const {item, startDate, endDate} = occurrence;
    const linked = organizerUrl(item.description);
    const record = { '@type': 'Event', identifier: `${item.uid}:${occurrence.recurrenceId || startDate}`, name: item.summary,
      startDate, endDate, url: linked?.url ?? source.listingUrl,
      location: {name: item.summary, address: item.location},
    };
    if (item.component.getFirstPropertyValue('status') === 'CANCELLED' || /\bcancel(?:led|ed)\b/i.test(item.summary)) record.eventStatus = 'https://schema.org/EventCancelled';
    if (linked && !record.eventStatus) {
      const event = venues.get(linked.id), location = event?.location;
      // Match the linked organizer's address to the calendar occurrence before
      // using its coordinates. Changed or unrelated venues remain unpublished.
      if (!event?.is_virtual && location?.locality === 'San Francisco' && location.region === 'CA' && location.address_lines?.[0] && (` ${normalizedAddress(item.location)} `).includes(` ${normalizedAddress(location.address_lines[0])} `)) {
        record.location.name = location.venue || item.summary;
        record.location.geo = location.location;
      }
    }
    const point = civicJoyPoints.find(point => item.location?.startsWith(point.address + ','));
    if (!record.location.geo && point) record.location.geo = {longitude: point.coordinates[0], latitude: point.coordinates[1]};
    if (free) record.isAccessibleForFree = true;
    const day = pacificDay(new Date(startDate));
    const curation = /^Valencia\s*LIVE!?$/i.test(item.summary) && valenciaLiveRouteDates.has(day)
      && /visitvalenciastreet\.com\/live/i.test(item.description) && /Valencia Street & 18th Street/.test(item.location)
      ? structuredClone(valenciaLiveRoute) : undefined;
    output.push({pageUrl: source.listingUrl, record, ...(curation ? {curation} : {})});
  }
  output.coverageDates = Array.from({length: 30}, (_, i) => new Date(Date.parse(`${pacificDay(now)}T12:00:00Z`) + i * 86400000).toISOString().slice(0,10));
  output.coverageComplete = true;
  return output;
}
