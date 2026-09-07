# Source integration status

All ten publishers are approved by Yao in [SOURCE-REVIEW.md](SOURCE-REVIEW.md).
This file records collection evidence as of September 6, 2026. The operational
switches remain in [config/sources.mjs](config/sources.mjs).

| Source | Collection | Evidence or remaining work |
| --- | --- | --- |
| [SFPL](https://sfpl.org/events) | Enabled | Publisher event details + UTC ICS times; exact branch URL joins to the publisher's coordinates. Saved fixtures test missing data, cancellation, and request limits. Queries all 30 Pacific dates with full wall-time bounds, validates echoed filters, follows pagination, and caches detail/ICS requests within the run. Two concurrent workers; a 200-request per-day guard prevents incomplete runs from claiming coverage. |
| [SF Rec & Parks](https://sfrecpark.org/Calendar.aspx) | Enabled, limited venues | Calendar microdata supplies event dates and clock ranges. Currently accepts only Golden Gate Bandshell, matched to its exact official facility URL and verified coordinates. Unknown venues and ambiguous times are skipped. Checks all 30 daily calendar views, validates the requested date, and handles empty days and pagination explicitly. |
| [Mission Local](https://missionlocal.org/events/) | Enabled | Public Events Calendar API supplies UTC timestamps, addresses, venue coordinates, and stable event IDs. A bounded date-range query follows every page, verifies the echoed range and totals, and records checked empty days only after full completion. |
| [Funcheap](https://sf.funcheap.com/today/) | Pending geometry | Today's page and detail pages supply event times and costs. Sampled detail records supply addresses but no coordinates. Needs a verified venue mapping or geometry overrides before activation. The prior RSS URL redirects to FeedBurner; use the event-day page for future integration. |
| [SF Chronicle](https://www.sfchronicle.com/entertainment/events/) | Pending adapter | The event-specific page loads an Evvnt discovery plugin. The sampled HTML does not contain JSON-LD Event records. Needs a verified public calendar data adapter. |
| [The Ingleside Light](https://www.inglesidelight.com/tag/things-to-do/) | Pending adapter | Weekly editorial roundups need separate event extraction and verified venue coordinates. Article publication dates are not event dates. |
| [Richmond Review / Sunset Beacon](https://richmondsunsetnews.com/) | Pending scope and adapter | Homepage mixes articles and opinion. Identify specific community-event coverage and verify event details and geometry. Detail discovery remains zero. |
| [Marina Times](https://www.marinatimes.com/category/calendar) | Pending freshness and adapter | The inspected calendar archive includes older listings. Establish a current event endpoint and verify dates and geometry. Detail discovery remains zero. |
| [Civic Joy Fund](https://civicjoyfund.org/events) | Pending adapter | User-provided community events page. Its calendar uses an Elfsight widget; sampled structured data contains WebSite/LocalBusiness but no Event records. Verify calendar extraction and location geometry before enabling. |

| [Mission Science Workshop](https://www.missionscienceworkshop.org/) | Pending schedule and geometry | Official programs page describes free community drop-in days at Mission, Excelsior, and Bayview workshops during the school year. Verify current dates, holiday exceptions, and each venue before publishing occurrences. |

Enabled collectors check the entire rolling 30-day window. Request guards fail
closed instead of silently truncating a source. Publication still requires verified
fields and supported venues; this does not promise every event in San Francisco. Dates, prices, and coordinates are never filled with guesses. Missing
cost appears as “Cost not listed.” SFPL is marked free only when its listing
contains the explicit all-programs-free policy. Fetched records retain links and factual event
details, without reproducing publisher article bodies.

All supported feeds normalize into the same iOS-compatible GeoJSON contract.
These live adapters currently provide points; manually curated routes and areas
retain full LineString/Polygon geometry and use the same validation and rendering.

Run `pnpm run refresh` from `website/` for per-source results. Successful collection
updates `public/events.json`; source failures retain validated, unexpired prior
records and their original freshness timestamps. Saved fixtures are test inputs,
not fallback listings for the public site.

## RSS discovery

Read-only checks on September 6, 2026 confirmed these RSS endpoints. They are
candidates for discovery; existing collectors have not been switched to RSS.

| Source | Feed | Observed scope |
| --- | --- | --- |
| SF Rec & Parks | [Calendar RSS](https://sfrecpark.org/RSSFeed.aspx?ModID=58&CID=All-calendar.xml) | 65 entries in the checked response, with calendar-specific date, time, and location fields. Category feeds are listed on the official RSS page. Verify full-window coverage before replacing dated queries. |
| Mission Local | [Events RSS](https://missionlocal.org/events/feed/) | 31 event entries in the checked response. Keep the date-range API for verified full-month coverage. |
| Funcheap | [RSS](https://sf.funcheap.com/feed/) | Redirects to FeedBurner; 10 recently added event entries in the checked response. Does not establish full-month coverage or verified geometry. |
| The Ingleside Light | [RSS](https://www.inglesidelight.com/rss/) | News/roundup discovery; 15 entries in the checked response. Article publication dates are not event dates. |
| Richmond Review / Sunset Beacon | [RSS](https://richmondsunsetnews.com/feed/) | News discovery; 15 entries in the checked response. Individual activities still need event extraction. |
| Marina Times | [RSS](https://www.marinatimes.com/feed) | News discovery; 15 entries in the checked response. Verify freshness and individual event details. |

No RSS auto-discovery link was found on the checked SFPL events, Chronicle events,
Civic Joy Fund events, or Mission Science Workshop homepage. This is not evidence
that those organizations have no feeds elsewhere. SFPL's current collector uses
per-event ICS calendar files.
