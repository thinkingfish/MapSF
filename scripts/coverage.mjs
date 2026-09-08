// Coverage records dates checked at a publisher, independent of publishability.
const DAY = 86_400_000;
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
});
export const pacificDay = (value) => formatter.format(new Date(value));
export function validDay(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
function instant(value) {
  if (typeof value !== 'string' || !validDay(value.slice(0, 10))
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}
export function recordCoverageDates(record) {
  const start = instant(record.startDate);
  if (start === null) return validDay(record.startDate) ? [record.startDate] : [];
  const first = pacificDay(start);
  const end = instant(record.endDate);
  if (end === null || end <= start || end - start > 366 * DAY) return [first];
  // The ending instant is exclusive: midnight does not cover the following day.
  const last = pacificDay(end - 1);
  const dates = [];
  for (let day = Date.parse(`${first}T00:00:00Z`); day <= Date.parse(`${last}T00:00:00Z`); day += DAY) {
    dates.push(new Date(day).toISOString().slice(0, 10));
  }
  return dates;
}
// Add calendar dates in UTC only after converting now to its Pacific day; this
// avoids a fixed-hour window drifting across a DST transition.
export function lastCoverageDay(today) {
  return new Date(Date.parse(`${today}T00:00:00Z`) + 29 * DAY).toISOString().slice(0, 10);
}
export function eventInCoverageWindow(event, today) {
  return pacificDay(event.startAt) <= lastCoverageDay(today)
    && pacificDay(Date.parse(event.endAt) - 1) >= today;
}
export function usefulCoverageDates(dates, today) {
  const latest = lastCoverageDay(today);
  return [...new Set((Array.isArray(dates) ? dates : [])
    .filter((day) => validDay(day) && day >= today && day <= latest))].sort();
}
export function priorCoverage(source, today) {
  const coverage = source?.coverage;
  if (!coverage || instant(coverage.checkedAt) === null) return {};
  return { coverage: { dates: usefulCoverageDates(coverage.dates, today), checkedAt: coverage.checkedAt } };
}
