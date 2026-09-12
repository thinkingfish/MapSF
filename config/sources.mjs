// Only explicitly opted-in broad calendars appear in the front-page source filter.
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
    id: 'sf-shakes',
    name: 'SF Shakes — Free Shakespeare in the Park',
    group: 'series',
    seriesKind: 'Performances',
    listingUrl: 'https://sfshakes.org/performance/free-shakes/',
    approved: true, // Requested by Yao, 2026-09-11.
    enabled: true,
    adapter: 'sf-shakes',
    productionUrl: 'https://sfshakes.org/performance/free-shakes/ac/',
    seasonYear: 2026,
    allowEmpty: true,
    maxDetailPages: 0,
    maxEvents: 60,
  },
  {
    id: 'from-the-e',
    name: 'From the E — Excelsior Night Market',
    group: 'series',
    seriesKind: 'Markets',
    listingUrl: 'https://www.fromtheesf.com/',
    approved: true, // Requested through the Excelsior column, 2026-09-11.
    enabled: true,
    adapter: 'from-the-e',
    allowEmpty: true,
    detailPathPattern: /^\/events\/[a-z0-9-]+\/?$/i,
    maxDetailPages: 8,
    maxEvents: 40,
  },
  {
    id: 'sunday-streets',
    name: 'Sunday Streets SF',
    group: 'series',
    seriesKind: 'Street festivals',
    listingUrl: 'https://sundaystreetssf.com/',
    approved: true, // Requested by Yao, 2026-09-11.
    enabled: false, // Verify each occurrence’s hours and point, route, or area.
    adapter: 'jsonld',
    maxDetailPages: 0,
    maxEvents: 40,
  },
  {
    id: 'sfpl',
    showInSourceFilter: true,
    group: 'organizers',
    name: 'San Francisco Public Library',
    listingUrl: 'https://sfpl.org/events',
    approved: true, // Yao, 2026-09-06; recorded in SOURCE-REVIEW.md.
    enabled: true, // Verified publisher fixtures and live collection.
    adapter: 'sfpl',
    collectionWindowDays: 30,
    maxRequestsPerDay: 200,
    detailPathPattern: /^\/events\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/?$/i,
    maxDetailPages: 8, // Legacy single-list mode only; monthly mode uses maxRequestsPerDay.
    maxEvents: 3000,
  },
  {
    id: 'sf-rec-park',
    showInSourceFilter: true,
    group: 'organizers',
    rss: { url: 'https://sfrecpark.org/RSSFeed.aspx?ModID=58&CID=All-calendar.xml', kind: 'Events' },
    name: 'San Francisco Recreation and Parks',
    listingUrl: 'https://sfrecpark.org/Calendar.aspx',
    approved: true, // Yao, 2026-09-06; recorded in SOURCE-REVIEW.md.
    enabled: true, // Verified publisher fixtures and live collection.
    adapter: 'recpark',
    collectionWindowDays: 30,
    maxListingPages: 90,
    detailPathPattern: /^\/Calendar\.aspx\?EID=\d+/i,
    maxDetailPages: 300,
    maxEvents: 1000,
  },
  {
    id: 'funcheap',
    group: 'publishers',
    rss: { url: 'https://sf.funcheap.com/feed/', kind: 'Recently added events' },
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
    showInSourceFilter: true,
    group: 'publishers',
    name: 'San Francisco Chronicle',
    listingUrl: 'https://www.sfchronicle.com/entertainment/events/',
    approved: true,
    enabled: true,
    adapter: 'chronicle',
    collectionWindowDays: 30,
    maxRequestsPerDay: 2,
    maxEvents: 5000,
  },
  {
    id: 'mission-local',
    showInSourceFilter: true,
    group: 'publishers',
    rss: { url: 'https://missionlocal.org/events/feed/', kind: 'Events' },
    name: 'Mission Local',
    listingUrl: 'https://missionlocal.org/events/',
    approved: true, // Recorded in SOURCE-REVIEW.md.
    enabled: true,
    adapter: 'mission-local',
    collectionWindowDays: 30,
    maxListingPages: 20,
    // Public date-range API supplies pagination, UTC times and venue coordinates.
    detailPathPattern: /^\/event\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/?$/i,
    maxDetailPages: 0,
    maxEvents: 1000,
  },
  {
    id: 'ingleside-light',
    group: 'publishers',
    rss: { url: 'https://www.inglesidelight.com/rss/', kind: 'Neighborhood news' },
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
    group: 'publishers',
    rss: { url: 'https://richmondsunsetnews.com/feed/', kind: 'Neighborhood news' },
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
    group: 'publishers',
    rss: { url: 'https://www.marinatimes.com/feed', kind: 'Neighborhood news' },
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
    showInSourceFilter: true,
    group: 'publishers',
    name: 'Civic Joy Fund',
    listingUrl: 'https://civicjoyfund.org/events',
    calendarUrl: 'https://calendar.google.com/calendar/ical/c_b0e78aa2d8125f99b281c06594c1e47e63f1bcb7c33e975f8b6d469204f6735f%40group.calendar.google.com/public/basic.ics',
    approved: true,
    enabled: true,
    adapter: 'civic-joy-fund',
    collectionWindowDays: 30,
    maxDetailPages: 10,
    maxEvents: 1000,
  },
  {
    id: 'mission-science-workshop',
    group: 'organizers',
    name: 'Mission Science Workshop',
    listingUrl: 'https://www.missionscienceworkshop.org/',
    approved: true, // Added at Yao's request in conversation.
    enabled: false,
    adapter: 'jsonld',
    // Verify school-year drop-in dates, closures, and each workshop's geometry.
    maxDetailPages: 0,
    maxEvents: 40,
  },
];
