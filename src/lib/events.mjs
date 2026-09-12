import { sources } from '../../config/sources.mjs';

// Only reviewed source roles determine precedence, never event-supplied claims.
const directSources = new Set(sources.filter(source => source.group === 'organizers' || source.group === 'series').map(source => source.id));

const SF_TIME_ZONE = 'America/Los_Angeles';
const ISO_WITH_OFFSET = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|([+-])(\d{2}):(\d{2}))$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const LAYER_GEOMETRY = {
  poi: 'Point',
  segment: 'LineString',
  area: 'Polygon',
};

const sfDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: SF_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function safeHttpUrl(value) {
  if (!nonEmptyString(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function validInstant(value) {
  if (!nonEmptyString(value)) return false;
  const match = ISO_WITH_OFFSET.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] === undefined ? 0 : Number(match[6]);
  const offsetHour = match[10] === undefined ? 0 : Number(match[10]);
  const offsetMinute = match[11] === undefined ? 0 : Number(match[11]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    0,
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return year >= 1
    && month >= 1
    && month <= 12
    && day >= 1
    && day <= daysInMonth[month]
    && hour <= 23
    && minute <= 59
    && second <= 59
    && offsetHour <= 14
    && offsetMinute <= 59
    && (offsetHour < 14 || offsetMinute === 0)
    && Number.isFinite(Date.parse(value));
}

function validPosition(position) {
  return Array.isArray(position)
    && position.length === 2
    && Number.isFinite(position[0])
    && Number.isFinite(position[1])
    && position[0] >= -180
    && position[0] <= 180
    && position[1] >= -90
    && position[1] <= 90;
}

function positionsEqual(left, right) {
  return left[0] === right[0] && left[1] === right[1];
}

function validGeometry(geometry) {
  if (!isObject(geometry)) return false;

  if (geometry.type === 'Point') {
    return validPosition(geometry.coordinates);
  }

  if (geometry.type === 'LineString') {
    return Array.isArray(geometry.coordinates)
      && geometry.coordinates.length >= 2
      && geometry.coordinates.every(validPosition);
  }

  if (geometry.type === 'Polygon') {
    return Array.isArray(geometry.coordinates)
      && geometry.coordinates.length >= 1
      && geometry.coordinates.every((ring) => (
        Array.isArray(ring)
        && ring.length >= 4
        && ring.every(validPosition)
        && positionsEqual(ring[0], ring.at(-1))
      ));
  }

  return false;
}

function validCuration(curation) {
  if (!isObject(curation)
    || curation.type !== 'Feature'
    || !isObject(curation.properties)
    || !isObject(curation.properties.metadata)) {
    return false;
  }

  const { properties, geometry } = curation;
  const categoryIsValid = properties.category === undefined
    || nonEmptyString(properties.category)
    || (Array.isArray(properties.category)
      && properties.category.length > 0
      && properties.category.every(nonEmptyString));
  if (!nonEmptyString(properties.name)
    || !Object.hasOwn(LAYER_GEOMETRY, properties.layerType)
    || !nonEmptyString(properties.metadata.address)
    || !Object.values(properties.metadata).every((value) => typeof value === 'string')
    || !categoryIsValid
    || !validGeometry(geometry)) {
    return false;
  }

  return LAYER_GEOMETRY[properties.layerType] === geometry.type;
}

function semanticKey(event) {
  return [
    event.title.trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' '),
    Date.parse(event.startAt),
    JSON.stringify(event.curation.geometry),
  ].join('\u0000');
}

function eventOrder(left, right) {
  return Date.parse(left.startAt) - Date.parse(right.startAt)
    || left.title.localeCompare(right.title, 'en-US')
    || left.id.localeCompare(right.id);
}

export function sfDate(now = new Date()) {
  const instant = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(instant.getTime())) {
    throw new TypeError('sfDate requires a valid date');
  }

  const parts = Object.fromEntries(
    sfDateFormatter.formatToParts(instant)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function eventsForDay(events, day) {
  if (!Array.isArray(events) || !DAY.test(day)) return [];

  return events.filter((event) => {
    if (!validInstant(event?.startAt) || !validInstant(event?.endAt)) return false;
    const start = Date.parse(event.startAt);
    const end = Date.parse(event.endAt);
    if (end <= start) return false;
    return sfDate(new Date(start)) <= day && sfDate(new Date(end - 1)) >= day;
  });
}

export function validateEvent(event) {
  if (!isObject(event)
    || !nonEmptyString(event.id)
    || !nonEmptyString(event.title)
    || !validInstant(event.startAt)
    || !validInstant(event.endAt)
    || Date.parse(event.endAt) <= Date.parse(event.startAt)
    || !isObject(event.cost)
    || !nonEmptyString(event.cost.label)
    || typeof event.cost.isFree !== 'boolean'
    || !isObject(event.source)
    || !nonEmptyString(event.source.id)
    || !nonEmptyString(event.source.name)
    || !safeHttpUrl(event.source.url)
    || !validCuration(event.curation)) {
    return false;
  }

  if (event.description !== undefined && typeof event.description !== 'string') return false;
  if (event.imageUrl !== undefined && !safeHttpUrl(event.imageUrl)) return false;
  return true;
}

export function dedupeEvents(events) {
  if (!Array.isArray(events)) return [];

  const ids = new Set();
  const listings = new Set();
  const unique = [];
  // Stable sorting preserves existing first-seen behavior within each role.
  const candidates = events.filter(validateEvent).sort((a, b) =>
    Number(directSources.has(b.source.id)) - Number(directSources.has(a.source.id)));
  for (const event of candidates) {
    const listing = semanticKey(event);
    if (ids.has(event.id) || listings.has(listing)) continue;
    ids.add(event.id);
    listings.add(listing);
    unique.push(event);
  }

  return unique.sort(eventOrder);
}
