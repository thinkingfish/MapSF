#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  publicationBounds as configuredPublicationBounds,
  sources as configuredSources,
} from '../config/sources.mjs';
import { dedupeEvents, validateEvent } from '../src/lib/events.mjs';

import { eventInCoverageWindow, pacificDay, priorCoverage, recordCoverageDates, usefulCoverageDates } from './coverage.mjs';

const WEBSITE_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MANUAL_PATH = resolve(WEBSITE_DIRECTORY, 'data/manual-events.json');
const DEFAULT_OUTPUT_PATH = resolve(WEBSITE_DIRECTORY, 'public/events.json');
const UNKNOWN_COST = Object.freeze({ label: 'Cost not listed', isFree: false });

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function absoluteHttpUrl(value, base) {
  try {
    const url = new URL(value, base);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function decodeMarkup(value) {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (match, value) => {
      const code = value[0].toLowerCase() === 'x' ? parseInt(value.slice(1), 16) : Number(value);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code) : match;
    });
}

function plainText(value) {
  return decodeMarkup(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function flattenJsonLd(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) flattenJsonLd(item, output);
    return output;
  }
  if (!isObject(value)) return output;
  if (Array.isArray(value['@graph'])) flattenJsonLd(value['@graph'], output);

  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  if (types.some((type) => String(type).split('/').at(-1) === 'Event')) {
    output.push(value);
  }
  return output;
}

export function parseJsonLdEvents(document) {
  const events = [];
  const scriptPattern = /<script\b[^>]*type\s*=\s*["']application\/ld\+json(?:;[^"']*)?["'][^>]*>([\s\S]*?)<\/script\s*>/gi;
  for (const match of document.matchAll(scriptPattern)) {
    try {
      flattenJsonLd(JSON.parse(match[1].trim()), events);
    } catch {
      // A page can contain unrelated malformed structured-data blocks.
    }
  }
  return events;
}

function discoveredLinks(document, source) {
  const configuredLimit = Number.isInteger(source.maxDetailPages) ? source.maxDetailPages : 0;
  const limit = Math.min(Math.max(configuredLimit, 0), 50);
  if (!(source.detailPathPattern instanceof RegExp) || limit === 0) return [];

  const candidates = [];
  for (const match of document.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    candidates.push(decodeMarkup(match[1]));
  }
  for (const match of document.matchAll(/<link\b[^>]*>(https?:\/\/[^<\s]+)<\/link>/gi)) {
    candidates.push(decodeMarkup(match[1]));
  }

  const links = [];
  const seen = new Set();
  const listingOrigin = new URL(source.listingUrl).origin;
  for (const candidate of candidates) {
    const href = absoluteHttpUrl(candidate, source.listingUrl);
    if (!href || seen.has(href)) continue;
    const url = new URL(href);
    if (url.origin !== listingOrigin) continue;
    source.detailPathPattern.lastIndex = 0;
    if (!source.detailPathPattern.test(`${url.pathname}${url.search}`)) continue;
    seen.add(href);
    links.push(href);
    if (links.length >= limit) break;
  }
  return links;
}

async function fetchDocument(url, source, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: {
      accept: 'text/html, application/xhtml+xml, application/xml;q=0.9',
      'user-agent': 'MapSF-events/1.0 (+https://github.com/thinkingfish/MapSF)',
    },
    signal: AbortSignal.timeout(source.timeoutMs ?? 15_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.text();
}

async function collectJsonLd(source, fetchImpl) {
  const listing = await fetchDocument(source.listingUrl, source, fetchImpl);
  const records = parseJsonLdEvents(listing).map((record) => ({
    record,
    pageUrl: source.listingUrl,
  }));

  if (records.length < (source.maxEvents ?? 100)) {
    const links = discoveredLinks(listing, source);
    for (const pageUrl of links) {
      const detail = await fetchDocument(pageUrl, source, fetchImpl);
      for (const record of parseJsonLdEvents(detail)) records.push({ record, pageUrl });
      if (records.length >= (source.maxEvents ?? 100)) break;
    }
  }
  if (records.length === 0 && source.allowEmpty !== true) {
    throw new Error('No JSON-LD Event records found');
  }
  return records.slice(0, source.maxEvents ?? 100);
}

function identifierValue(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (isObject(value)) return text(value.value ?? value['@value'] ?? value.name);
  return '';
}

function stableId(source, record, eventUrl) {
  const identifier = identifierValue(record.identifier);
  if (identifier) {
    const safe = identifier.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-|-$/g, '');
    if (safe) return `${source.id}:${safe}`;
  }
  const digest = createHash('sha256')
    .update(`${eventUrl}\u0000${record.startDate}\u0000${record.name}`)
    .digest('hex')
    .slice(0, 16);
  return `${source.id}:${digest}`;
}

function addressText(location) {
  const address = location?.address;
  if (typeof address === 'string') return plainText(address);
  if (!isObject(address)) return '';
  return [address.streetAddress, address.addressLocality, address.addressRegion, address.postalCode]
    .map(plainText)
    .filter(Boolean)
    .join(', ');
}

function sourcePoint(location) {
  const geo = location?.geo;
  if (!isObject(geo)) return null;
  if ((typeof geo.latitude !== 'number' && !text(geo.latitude))
    || (typeof geo.longitude !== 'number' && !text(geo.longitude))) {
    return null;
  }
  const latitude = Number(geo.latitude);
  const longitude = Number(geo.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { type: 'Point', coordinates: [longitude, latitude] };
}

function explicitCost(record) {
  const offer = Array.isArray(record.offers) ? record.offers[0] : record.offers;
  const price = isObject(offer) ? offer.price : undefined;
  const normalized = text(price).toLowerCase();
  const numeric = typeof price === 'number'
    ? price
    : /^\$?\d+(?:\.\d+)?$/.test(normalized)
      ? Number(normalized.replace('$', ''))
      : null;
  const explicitlyFree = record.isAccessibleForFree === true
    || normalized === 'free'
    || numeric === 0;
  if (explicitlyFree) return { label: 'Free', isFree: true };
  if (numeric !== null && numeric > 0) {
    const currency = text(offer?.priceCurrency);
    return { label: currency ? `${currency} ${numeric}` : `$${numeric}`, isFree: false };
  }
  return { ...UNKNOWN_COST };
}

function imageUrl(record, pageUrl) {
  const image = Array.isArray(record.image) ? record.image[0] : record.image;
  const candidate = isObject(image) ? image.url ?? image.contentUrl : image;
  return candidate ? absoluteHttpUrl(candidate, pageUrl) : null;
}

function cancelled(record) {
  const status = text(record.eventStatus).toLowerCase();
  return record.cancelled === true || status.includes('cancelled') || status.includes('canceled');
}

function recordId(source, { record, pageUrl }) {
  const eventUrl = absoluteHttpUrl(record.url ?? record['@id'] ?? pageUrl, pageUrl);
  return eventUrl ? stableId(source, record, eventUrl) : null;
}

function cancellationInstance(source, item, now) {
  const id = recordId(source, item);
  const startAt = text(item.record.startDate);
  const endAt = text(item.record.endDate);
  const start = Date.parse(startAt);
  const end = Date.parse(endAt);
  if (!id
    || !Number.isFinite(start)
    || !Number.isFinite(end)
    || end <= start
    || end <= now.getTime()) {
    return null;
  }
  return { id, startAt, endAt };
}

function cancellationKey({ id, startAt, endAt }) {
  return `${id}\u0000${Date.parse(startAt)}\u0000${Date.parse(endAt)}`;
}

function knownCancellationInstances(id, sourceId, events, now) {
  const instances = new Map();
  for (const event of events) {
    if (event?.id !== id
      || event.source?.id !== sourceId
      || !validateEvent(event)
      || Date.parse(event.endAt) <= now.getTime()) {
      continue;
    }
    const instance = { id, startAt: event.startAt, endAt: event.endAt };
    instances.set(cancellationKey(instance), instance);
  }
  return [...instances.values()];
}

function previousCancellations(source, now) {
  if (!Array.isArray(source?.cancelledInstances)) return [];
  return source.cancelledInstances.filter((instance) => (
    isObject(instance)
    && text(instance.id)
    && Number.isFinite(Date.parse(instance.startAt))
    && Number.isFinite(Date.parse(instance.endAt))
    && Date.parse(instance.endAt) > Date.parse(instance.startAt)
    && Date.parse(instance.endAt) > now.getTime()
  ));
}

function cancellationMetadata(instances) {
  const values = [...instances.values()]
    .sort((left, right) => Date.parse(left.endAt) - Date.parse(right.endAt)
      || left.id.localeCompare(right.id));
  return values.length > 0 ? { cancelledInstances: values } : {};
}

function normalizeJsonLd(source, { record, pageUrl }) {
  if (cancelled(record)) return null;
  const title = plainText(record.name);
  const startAt = text(record.startDate);
  const endAt = text(record.endDate);
  const eventUrl = absoluteHttpUrl(record.url ?? record['@id'] ?? pageUrl, pageUrl);
  if (!title || !startAt || !endAt || !eventUrl) return null;

  const location = Array.isArray(record.location) ? record.location[0] : record.location;
  const geometry = sourcePoint(location);
  const address = addressText(location);
  const locationName = plainText(location?.name) || title;
  const category = Array.isArray(record.eventType) ? record.eventType[0] : record.eventType;
  // Keep publisher prose on its original page; manual curation may add a summary.
  const image = imageUrl(record, pageUrl);
  const event = {
    id: stableId(source, record, eventUrl),
    title,
    startAt,
    endAt,
    cost: explicitCost(record),
    source: { id: source.id, name: source.name, url: eventUrl },
  };
  if (geometry && address) {
    event.curation = {
      type: 'Feature',
      properties: {
        name: locationName,
        layerType: 'poi',
        ...(text(category) ? { category: text(category) } : {}),
        metadata: { address },
      },
      geometry,
    };
  }
  if (image) event.imageUrl = image;
  return event;
}

function pointInBounds([longitude, latitude], bounds) {
  return longitude >= bounds.west
    && longitude <= bounds.east
    && latitude >= bounds.south
    && latitude <= bounds.north;
}

function orientation([ax, ay], [bx, by], [cx, cy]) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function pointOnSegment([px, py], [ax, ay], [bx, by]) {
  const epsilon = 1e-12;
  return Math.abs(orientation([ax, ay], [bx, by], [px, py])) <= epsilon
    && px >= Math.min(ax, bx) - epsilon
    && px <= Math.max(ax, bx) + epsilon
    && py >= Math.min(ay, by) - epsilon
    && py <= Math.max(ay, by) + epsilon;
}

function segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd) {
  const firstA = orientation(firstStart, firstEnd, secondStart);
  const firstB = orientation(firstStart, firstEnd, secondEnd);
  const secondA = orientation(secondStart, secondEnd, firstStart);
  const secondB = orientation(secondStart, secondEnd, firstEnd);
  if (((firstA > 0 && firstB < 0) || (firstA < 0 && firstB > 0))
    && ((secondA > 0 && secondB < 0) || (secondA < 0 && secondB > 0))) {
    return true;
  }
  return pointOnSegment(secondStart, firstStart, firstEnd)
    || pointOnSegment(secondEnd, firstStart, firstEnd)
    || pointOnSegment(firstStart, secondStart, secondEnd)
    || pointOnSegment(firstEnd, secondStart, secondEnd);
}

function boundsEdges(bounds) {
  const southwest = [bounds.west, bounds.south];
  const southeast = [bounds.east, bounds.south];
  const northeast = [bounds.east, bounds.north];
  const northwest = [bounds.west, bounds.north];
  return [
    [southwest, southeast],
    [southeast, northeast],
    [northeast, northwest],
    [northwest, southwest],
  ];
}

function lineIntersectsBounds(coordinates, bounds) {
  if (coordinates.some((point) => pointInBounds(point, bounds))) return true;
  const edges = boundsEdges(bounds);
  for (let index = 1; index < coordinates.length; index += 1) {
    if (edges.some(([start, end]) => (
      segmentsIntersect(coordinates[index - 1], coordinates[index], start, end)
    ))) {
      return true;
    }
  }
  return false;
}

function pointInRing(point, ring) {
  if (ring.some((start, index) => pointOnSegment(point, start, ring[(index + 1) % ring.length]))) {
    return true;
  }
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [x, y] = ring[index];
    const [previousX, previousY] = ring[previous];
    const crosses = (y > point[1]) !== (previousY > point[1])
      && point[0] < ((previousX - x) * (point[1] - y)) / (previousY - y) + x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, rings) {
  return pointInRing(point, rings[0])
    && !rings.slice(1).some((ring) => pointInRing(point, ring));
}

function geometryIntersectsBounds(geometry, bounds) {
  if (geometry.type === 'Point') return pointInBounds(geometry.coordinates, bounds);
  if (geometry.type === 'LineString') return lineIntersectsBounds(geometry.coordinates, bounds);
  if (geometry.type !== 'Polygon') return false;
  if (geometry.coordinates.some((ring) => lineIntersectsBounds(ring, bounds))) return true;
  return [
    [bounds.west, bounds.south],
    [bounds.east, bounds.south],
    [bounds.east, bounds.north],
    [bounds.west, bounds.north],
  ].some((corner) => pointInPolygon(corner, geometry.coordinates));
}

function eventInPublicationBounds(event, bounds) {
  return geometryIntersectsBounds(event.curation.geometry, bounds);
}

function validPublicationBounds(bounds) {
  return isObject(bounds)
    && [bounds.west, bounds.south, bounds.east, bounds.north].every(Number.isFinite)
    && bounds.west < bounds.east
    && bounds.south < bounds.north;
}

function applyOverrides(events, overrides) {
  const byId = new Map(overrides.map((override) => [override.id, override]));
  return events.map((event) => {
    const override = byId.get(event.id);
    if (!override) return event;
    const { id: _id, ...changes } = override;
    return { ...event, ...changes, id: event.id };
  });
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

function validManual(manual) {
  return isObject(manual)
    && manual.schemaVersion === 1
    && Array.isArray(manual.events)
    && Array.isArray(manual.overrides)
    && manual.overrides.every((override) => isObject(override) && text(override.id));
}

function validPrevious(previous) {
  return isObject(previous)
    && previous.schemaVersion === 1
    && (previous.generatedAt === null || typeof previous.generatedAt === 'string')
    && Array.isArray(previous.sources)
    && Array.isArray(previous.events);
}

async function writeSnapshot(path, snapshot) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

function sourceMetadata(source, details) {
  return {
    id: source.id,
    name: source.name,
    url: source.listingUrl,
    ...details,
  };
}

// Migrate the former JSON-LD hashes to the publisher's stable API IDs, including
// stored cancellations and owner overrides. Date/URL matches avoid title drift.
function reconcileMissionLocalIds(source, raw, previous, manual, cancellations) {
  const aliases = new Map();
  for (const {record, pageUrl} of raw) {
    const url = absoluteHttpUrl(record.url, pageUrl);
    if (!url || !identifierValue(record.identifier)) continue;
    const canonical = stableId(source, record, url);
    aliases.set(stableId(source, {...record, identifier: undefined}, url), canonical);
    const matches = [...previous.events, ...manual.events].filter(event => event.source?.id === source.id && event.source.url === url);
    const dated = matches.filter(event => Date.parse(event.startAt) === Date.parse(record.startDate) && Date.parse(event.endAt) === Date.parse(record.endDate));
    for (const event of dated.length ? dated : !record.startDate && matches.length === 1 ? matches : []) aliases.set(event.id, canonical);
  }
  const migrate = event => aliases.has(event.id) ? {...event, id: aliases.get(event.id)} : event;
  previous.events = previous.events.map(migrate);
  manual.events = manual.events.map(migrate);
  manual.overrides = manual.overrides.map(migrate);
  const migrated = [...cancellations.values()].map(migrate);
  cancellations.clear();
  for (const instance of migrated) cancellations.set(cancellationKey(instance), instance);
}

export async function refreshEvents({
  sources = configuredSources,
  manualPath = DEFAULT_MANUAL_PATH,
  previousPath = DEFAULT_OUTPUT_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
  fetchImpl = globalThis.fetch,
  now = new Date(),
  publicationBounds = configuredPublicationBounds,
} = {}) {
  if (!validPublicationBounds(publicationBounds)) throw new Error('Invalid publication bounds');
  const generatedAt = now.toISOString();
  const today = pacificDay(now);
  const empty = { schemaVersion: 1, generatedAt: null, sources: [], events: [] };
  const previousCandidate = await readJson(previousPath, empty);
  const previous = validPrevious(previousCandidate) ? previousCandidate : empty;
  const manual = await readJson(manualPath, null);
  if (!validManual(manual)) throw new Error('Invalid manual events file');
  const enabled = sources.filter((source) => source.approved === true && source.enabled === true);
  const enabledSourceIds = new Set(enabled.map((source) => source.id));
  for (const event of manual.events) {
    if (!validateEvent(event)) throw new Error(`Invalid manual event: ${event?.id ?? '(missing id)'}`);
    if (!enabledSourceIds.has(event.source.id)) {
      throw new Error(`Manual event source is not enabled: ${event.source.id}`);
    }
  }
  for (const override of manual.overrides) {
    if (Object.hasOwn(override, 'source')) {
      throw new Error(`Manual override cannot change source attribution: ${override.id}`);
    }
    const sourceId = override.id.split(':', 1)[0];
    if (!enabledSourceIds.has(sourceId)) {
      throw new Error(`Manual override source is not enabled: ${sourceId}`);
    }
  }

  const previousSources = new Map(previous.sources.map((source) => [source.id, source]));
  const sourceEvents = [];
  const sourceResults = [];
  const cancellationInstances = new Map();
  const unscopedCancellationIds = new Set();

  for (const source of enabled) {
    const priorSource = previousSources.get(source.id);
    const sourceCancellations = new Map(
      previousCancellations(priorSource, now)
        .map((instance) => [cancellationKey(instance), instance]),
    );
    const currentCancellationKeys = new Set();
    const sourceUnscopedCancellationIds = new Set();
    let checkedCoverage;
    try {
      let raw;
      if (source.adapter === 'jsonld') raw = await collectJsonLd(source, fetchImpl);
      else if (source.adapter === 'sfpl') {
        const { collectSfpl } = await import('./adapters/sfpl.mjs');
        raw = await collectSfpl(source, fetchImpl, now);
      } else if (source.adapter === 'recpark') {
        const { collectRecpark } = await import('./adapters/recpark.mjs');
        raw = await collectRecpark(source, fetchImpl, now);
      } else if (source.adapter === 'mission-local') {
        const { collectMissionLocal } = await import('./adapters/mission-local.mjs');
        raw = await collectMissionLocal(source, fetchImpl, now);
      } else throw new Error(`Unsupported adapter: ${source.adapter}`);
      if (source.collectionWindowDays === 30 && (raw.coverageComplete !== true || usefulCoverageDates(raw.coverageDates, today).length !== 30)) throw new Error('Incomplete 30-day source collection');
      if (source.adapter === 'mission-local') reconcileMissionLocalIds(source, raw, previous, manual, sourceCancellations);
      // Collection completed: publication validation may still fail, but the
      // publisher check itself is fresh. Partial HTTP failures never reach here.
      checkedCoverage = {
        dates: usefulCoverageDates(raw.coverageComplete === true ? raw.coverageDates : [today, ...(raw.coverageDates ?? []), ...raw.flatMap(({ record }) => recordCoverageDates(record))], today),
        checkedAt: generatedAt,
      };
      for (const item of raw) {
        if (!cancelled(item.record)) continue;
        const id = recordId(source, item);
        const directInstance = cancellationInstance(source, item, now);
        const instances = directInstance
          ? [directInstance]
          : knownCancellationInstances(
            id,
            source.id,
            [...previous.events, ...manual.events],
            now,
          );
        if (instances.length > 0) {
          for (const instance of instances) {
            const key = cancellationKey(instance);
            sourceCancellations.set(key, instance);
            currentCancellationKeys.add(key);
          }
        } else if (id) {
          sourceUnscopedCancellationIds.add(id);
          unscopedCancellationIds.add(id);
        }
      }
      const normalized = raw.map((item) => normalizeJsonLd(source, item)).filter(Boolean);
      const overridden = applyOverrides(normalized, manual.overrides);
      const structurallyValid = dedupeEvents(overridden.filter(validateEvent));
      for (const event of structurallyValid) {
        const key = cancellationKey(event);
        if (!currentCancellationKeys.has(key)) sourceCancellations.delete(key);
      }
      const valid = structurallyValid.filter((event) => (
        !sourceUnscopedCancellationIds.has(event.id)
        && !sourceCancellations.has(cancellationKey(event))
      ));
      const allCancelled = raw.length > 0 && raw.every(({ record }) => cancelled(record));
      if (valid.length === 0 && source.allowEmpty !== true && !allCancelled && !(raw.coverageComplete === true && raw.length === 0)) {
        throw new Error('No valid events after validation');
      }
      const publishable = valid.filter((event) => eventInPublicationBounds(event, publicationBounds));
      sourceEvents.push(...publishable);
      sourceResults.push(sourceMetadata(source, {
        status: 'ok',
        coverage: checkedCoverage,
        lastSuccessfulAt: generatedAt,
        eventCount: publishable.length,
        ...cancellationMetadata(sourceCancellations),
      }));
    } catch (error) {
      const preserved = previous.events.filter((event) => (
        event.source?.id === source.id
        && validateEvent(event)
        && Date.parse(event.endAt) > now.getTime()
        && !sourceUnscopedCancellationIds.has(event.id)
        && !sourceCancellations.has(cancellationKey(event))
        && eventInPublicationBounds(event, publicationBounds)
      ));
      sourceEvents.push(...preserved);
      sourceResults.push(sourceMetadata(source, {
        status: 'failed',
        ...(checkedCoverage ? { coverage: checkedCoverage } : priorCoverage(priorSource, today)),
        lastSuccessfulAt: previousSources.get(source.id)?.lastSuccessfulAt ?? null,
        eventCount: preserved.length,
        error: error instanceof Error ? error.message : String(error),
        ...cancellationMetadata(sourceCancellations),
      }));
    }
    for (const [key, instance] of sourceCancellations) {
      cancellationInstances.set(key, instance);
    }
  }

  const manualEvents = manual.events.filter((event) => (
    !unscopedCancellationIds.has(event.id)
    && !cancellationInstances.has(cancellationKey(event))
  ));
  const events = dedupeEvents([...manualEvents, ...sourceEvents])
    .filter((event) => Date.parse(event.endAt) > now.getTime())
    .filter((event) => eventInCoverageWindow(event, today))
    .filter((event) => eventInPublicationBounds(event, publicationBounds));
  const didWork = enabled.length > 0
    || manual.events.length > 0
    || previous.events.length > 0
    || previous.sources.length > 0;
  const countedSources = sourceResults.map((source) => ({
    ...source,
    eventCount: events.filter((event) => event.source.id === source.id).length,
  }));
  const snapshot = {
    schemaVersion: 1,
    generatedAt: didWork ? generatedAt : previous.generatedAt,
    sources: countedSources,
    coverage: { dates: usefulCoverageDates(countedSources.flatMap((source) => source.coverage?.dates ?? []), today) },
    events,
  };
  await writeSnapshot(outputPath, snapshot);
  return snapshot;
}

function parseArguments(arguments_) {
  const options = {};
  const names = {
    '--manual': 'manualPath',
    '--previous': 'previousPath',
    '--output': 'outputPath',
  };
  for (let index = 0; index < arguments_.length; index += 1) {
    const name = names[arguments_[index]];
    const value = arguments_[index + 1];
    if (!name || !value) throw new Error(`Unknown or incomplete argument: ${arguments_[index]}`);
    options[name] = resolve(value);
    index += 1;
  }
  return options;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  refreshEvents(parseArguments(process.argv.slice(2))).then((snapshot) => {
    for (const source of snapshot.sources) {
      console.log(`${source.name}: ${source.status}, ${source.eventCount} events${source.error ? ' (' + source.error + ')' : ''}`);
    }
    console.log(`Published ${snapshot.events.length} verified events.`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
