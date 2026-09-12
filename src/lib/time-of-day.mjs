const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
const hour = 60 * 60 * 1000;
const periods = { morning: [0, 12 * hour], afternoon: [12 * hour, 18 * hour], evening: [18 * hour, 24 * hour] };

function positionOnDay(date, day) {
  const p = Object.fromEntries(formatter.formatToParts(date).map(({type,value}) => [type,value]));
  const localDay = `${p.year}-${p.month}-${p.day}`;
  if (localDay < day) return -Infinity;
  if (localDay > day) return Infinity;
  return Number(p.hour) * hour + Number(p.minute) * 60000 + Number(p.second) * 1000 + date.getUTCMilliseconds();
}

// Half-open intervals: finishing at noon does not count as afternoon.
// Compare SF wall-clock positions; none of the cutoffs fall in a DST clock change.
export function matchesTimeOfDay(event, day, timeOfDay) {
  if (!timeOfDay) return true;
  const period = periods[timeOfDay];
  const start = new Date(event.startAt), end = new Date(event.endAt);
  if (!period || !day || !(end > start)) return false;
  return positionOnDay(start, day) < period[1] && positionOnDay(end, day) > period[0];
}
