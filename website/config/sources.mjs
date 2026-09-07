// approved records the owner's source decision; enabled controls collection.
// Enable only after approval and publisher-specific extraction verification.
// See ../SOURCE-REVIEW.md for the saved owner decisions and review notes.
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
    approved: true, // Yao, 2026-09-06; recorded in SOURCE-REVIEW.md.
    enabled: true, // Verified publisher fixtures and live collection.
    adapter: 'sfpl',
    detailPathPattern: /^\/events\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/?$/i,
    maxDetailPages: 8,
    maxEvents: 100,
  },
  {
    id: 'sf-rec-park',
    name: 'San Francisco Recreation and Parks',
    listingUrl: 'https://sfrecpark.org/Calendar.aspx',
    approved: true, // Yao, 2026-09-06; recorded in SOURCE-REVIEW.md.
    enabled: true, // Verified publisher fixtures and live collection.
    adapter: 'recpark',
    detailPathPattern: /^\/Calendar\.aspx\?EID=\d+/i,
    maxDetailPages: 12,
    maxEvents: 100,
  },
  {
    id: 'funcheap',
    name: 'Funcheap',
    listingUrl: 'https://sf.funcheap.com/today/',
    approved: true, // Yao, 2026-09-06; recorded in SOURCE-REVIEW.md.
    enabled: false, // Publisher-specific extraction verification is pending.
    adapter: 'jsonld',
    detailPathPattern: /^\/[a-z0-9][a-z0-9-]+\/?$/i,
    maxDetailPages: 24,
    maxEvents: 100,
  },
  {
    id: 'sf-chronicle',
    name: 'San Francisco Chronicle',
    listingUrl: 'https://www.sfchronicle.com/entertainment/events/',
    approved: true, // Yao, 2026-09-06; recorded in SOURCE-REVIEW.md.
    enabled: false, // Publisher-specific extraction verification is pending.
    adapter: 'jsonld',
    detailPathPattern: /^\/entertainment\/[a-z0-9/-]+/i,
    maxDetailPages: 12,
    maxEvents: 50,
  },
  {
    id: 'mission-local',
    name: 'Mission Local',
    listingUrl: 'https://missionlocal.org/events/',
    approved: true, // Recorded in SOURCE-REVIEW.md.
    enabled: true,
    adapter: 'jsonld',
    // Verified live JSON-LD calendar; listing already contains event and venue data.
    detailPathPattern: /^\/event\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/?$/i,
    maxDetailPages: 0,
    maxEvents: 50,
  },
  {
    id: 'ingleside-light',
    name: 'The Ingleside Light',
    listingUrl: 'https://www.inglesidelight.com/tag/things-to-do/',
    approved: true, // Recorded in SOURCE-REVIEW.md.
    enabled: false,
    adapter: 'jsonld',
    // Editorial roundups need per-event extraction; generic JSON-LD is unverified.
    detailPathPattern: /^\/[a-z0-9-]*greater-ingleside-events[a-z0-9-]*\/?$/i,
    maxDetailPages: 8,
    maxEvents: 40,
  },
  {
    id: 'richmond-sunset-news',
    name: 'Richmond Review / Sunset Beacon',
    listingUrl: 'https://richmondsunsetnews.com/',
    approved: true, // Recorded in SOURCE-REVIEW.md.
    enabled: false,
    adapter: 'jsonld',
    // Discovery-only starting point. Identify an event section before enabling.
    maxDetailPages: 0,
    maxEvents: 40,
  },
  {
    id: 'marina-times',
    name: 'Marina Times',
    listingUrl: 'https://www.marinatimes.com/category/calendar',
    approved: true, // Approved by Yao in conversation; recorded in SOURCE-REVIEW.md.
    enabled: false,
    adapter: 'jsonld',
    // Calendar archive: verify freshness and current event pages before discovery.
    maxDetailPages: 0,
    maxEvents: 40,
  },
  {
    id: 'civic-joy-fund',
    name: 'Civic Joy Fund',
    listingUrl: 'https://civicjoyfund.org/events',
    approved: true, // Added at Yao's request; recorded in SOURCE-REVIEW.md.
    enabled: false,
    adapter: 'jsonld',
    // Provided page has no JSON-LD Event records; verify its event data adapter.
    maxDetailPages: 0,
    maxEvents: 40,
  },
];
