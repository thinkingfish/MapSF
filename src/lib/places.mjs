import { places as gardenPlaces } from '../../config/places.mjs';
import { scienceWorkshops } from '../../config/science-workshops.mjs';
import { museums } from '../../config/museums.mjs';
import { sfDate, validateEvent } from './events.mjs';

const configuredPlaces = [...gardenPlaces, ...museums, ...scienceWorkshops];
const offsetFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', timeZoneName: 'longOffset', hour: '2-digit',
});

function calendarDay(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) return null;
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), weekday: date.getUTCDay() };
}
function matches(rule, date) {
  return (rule.month === undefined || rule.month === date.month)
    && (rule.day === undefined || rule.day === date.day)
    && (rule.weekday === undefined || rule.weekday === date.weekday)
    && (rule.nth === undefined || rule.nth === Math.ceil(date.day / 7));
}
function nthSunday(year, month, nth) {
  return 1 + (7 - new Date(Date.UTC(year, month - 1, 1)).getUTCDay()) % 7 + (nth - 1) * 7;
}
function lastEntry(hours, date) {
  const { year, month, day } = date;
  if (hours.end === 'tea-seasonal') return month >= 3 && month <= 10 ? '17:30' : '16:30';
  if (hours.end !== 'botanical-seasonal') return hours.end;
  if ((month === 3 && day >= nthSunday(year, 3, 2)) || (month >= 4 && month <= 9)) return '18:00';
  if (month === 1 || month === 12 || (month === 11 && day >= nthSunday(year, 11, 1))) return '16:00';
  return '17:00';
}
function timeLabel(time) {
  const [hour, minute] = time.split(':').map(Number);
  return `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, '0')}` : ''} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** Generate one free-admission planning card per eligible venue for a SF calendar day.
 * startAt/endAt are the admission window (last entry for gardens), never an open-now claim.
 * The catalog is deliberately bounded and must be reviewed before extending validThrough.
 */
export function scheduledPlacesForDay(day, { now = new Date(), places = configuredPlaces } = {}) {
  const date = calendarDay(day);
  if (!date || !Array.isArray(places)) return [];
  const today = sfDate(now);
  const nowMs = new Date(now).getTime();
  // All catalog admission windows are after 07:00, beyond DST's 02:00 transition.
  // SF noon is safely on the requested calendar day under either UTC offset.
  const offset = offsetFormatter.formatToParts(new Date(`${day}T20:00:00Z`))
    .find(part => part.type === 'timeZoneName').value.replace('GMT', '');
  const seen = new Set();
  return places.flatMap(place => {
    if (seen.has(place.id) || day < place.validFrom || day > place.validThrough
      || place.closedWeekdays?.includes(date.weekday)
      || place.closedDates?.some(range => day >= range.from && day <= range.through)) return [];
    const publicFree = place.publicFreeRules.some(rule => matches(rule, date));
    if (!publicFree && !place.residentFree) return [];
    const start = place.hours.start;
    const end = lastEntry(place.hours, date);
    const endAt = `${day}T${end}:00${offset}`;
    const early = place.earlyFree;
    const earlyToday = early && (!early.weekdays || early.weekdays.includes(date.weekday));
    const eligibility = publicFree
      ? 'Free general admission for everyone.'
      : 'San Francisco residents: bring ID or proof of residency.';
    const admissionNote = [
      place.admissionNote,
      !publicFree && earlyToday ? `Everyone can also enter free ${timeLabel(early.start)}–${timeLabel(early.end)}; outside that window, other visitors may need paid admission.` : '',
      !publicFree && !earlyToday ? 'Other visitors may need paid admission; additional free-admission programs may apply.' : '',
      place.hours.closingNote,
      'Check the official site for closures and admission details.',
    ].filter(Boolean).join(' ');
    const hoursLabel = place.category === 'garden'
      ? `Entry ${timeLabel(start)}–${timeLabel(end)} (last entry)`
      : `${timeLabel(start)}–${timeLabel(end)}`;
    const event = {
      id: `place:${place.id}:${day}`, title: place.name,
      startAt: `${day}T${start}:00${offset}`, endAt,
      cost: { label: publicFree ? 'Free general admission' : 'Free for SF residents', isFree: true },
      source: { ...place.source }, description: `${eligibility} ${admissionNote}`,
      recurring: true, eligibility, admissionNote, hoursLabel,
      entryEnded: today === day && nowMs >= Date.parse(endAt),
      curation: {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [...place.coordinates] },
        properties: {
          name: place.name, layerType: 'poi', category: place.category,
          metadata: {
            address: place.address, source: place.source.url,
            coordinateSource: place.coordinateSource, verifiedAt: place.verifiedAt,
            validThrough: place.validThrough,
          },
        },
      },
    };
    if (!validateEvent(event)) return [];
    seen.add(place.id);
    return [event];
  });
}
