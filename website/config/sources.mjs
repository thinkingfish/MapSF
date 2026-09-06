// Owner approval is represented only by changing enabled to true in this file.
// The generic adapter publishes verified JSON-LD Event records with explicit
// offsets and source-provided geometry, or records completed by manual overrides.
// Keep detail discovery bounded and verify a candidate against saved fixtures
// before enabling it.
// This configurable rectangle matches the public map's useful viewing area; it
// is a publication boundary, not San Francisco's precise legal border.
export const publicationBounds = Object.freeze({
  west: -122.53,
  south: 37.70,
  east: -122.348,
  north: 37.835,
});

export const sources = [
  {
    id: 'sfpl',
    name: 'San Francisco Public Library',
    listingUrl: 'https://sfpl.org/events',
    enabled: false,
    adapter: 'jsonld',
    detailPathPattern: /^\/events\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/?$/i,
    maxDetailPages: 24,
    maxEvents: 100,
  },
  {
    id: 'sf-rec-park',
    name: 'San Francisco Recreation and Parks',
    listingUrl: 'https://sfrecpark.org/Calendar.aspx',
    enabled: false,
    adapter: 'jsonld',
    detailPathPattern: /^\/Calendar\.aspx\?EID=\d+/i,
    maxDetailPages: 24,
    maxEvents: 100,
  },
  {
    id: 'funcheap',
    name: 'Funcheap',
    listingUrl: 'https://sf.funcheap.com/feed/',
    enabled: false,
    adapter: 'jsonld',
    detailPathPattern: /^\/[a-z0-9][a-z0-9-]+\/?$/i,
    maxDetailPages: 24,
    maxEvents: 100,
  },
  {
    id: 'sf-chronicle',
    name: 'San Francisco Chronicle',
    listingUrl: 'https://www.sfchronicle.com/entertainment/',
    enabled: false,
    adapter: 'jsonld',
    detailPathPattern: /^\/entertainment\/[a-z0-9/-]+/i,
    maxDetailPages: 12,
    maxEvents: 50,
  },
];
