# Source integration status

All eight publishers are approved by Yao in [SOURCE-REVIEW.md](SOURCE-REVIEW.md).
This file records collection evidence as of September 6, 2026. The operational
switches remain in [config/sources.mjs](config/sources.mjs).

| Source | Collection | Evidence or remaining work |
| --- | --- | --- |
| [SFPL](https://sfpl.org/events) | Enabled | Publisher event details + UTC ICS times; exact branch URL joins to the publisher's coordinates. Saved fixtures test missing data, cancellation, and request limits. Uses the current Pacific wall time as the listing cutoff, avoiding ended events. First listing page only; maximum 8 detail/calendar requests. |
| [SF Rec & Parks](https://sfrecpark.org/Calendar.aspx) | Enabled, limited venues | Calendar microdata supplies event dates and clock ranges. Currently accepts only Golden Gate Bandshell, matched to its exact official facility URL and verified coordinates. Unknown venues and ambiguous times are skipped. |
| [Mission Local](https://missionlocal.org/events/) | Enabled | Live calendar supplies JSON-LD Event records with explicit offsets, addresses, and coordinates. Saved fixture verifies the complete collector path. Reads the first calendar page without detail crawling. |
| [Funcheap](https://sf.funcheap.com/today/) | Pending geometry | Today's page and detail pages supply event times and costs. Sampled detail records supply addresses but no coordinates. Needs a verified venue mapping or geometry overrides before activation. The prior RSS URL redirects to FeedBurner; use the event-day page for future integration. |
| [SF Chronicle](https://www.sfchronicle.com/entertainment/events/) | Pending adapter | The event-specific page loads an Evvnt discovery plugin. The sampled HTML does not contain JSON-LD Event records. Needs a verified public calendar data adapter. |
| [The Ingleside Light](https://www.inglesidelight.com/tag/things-to-do/) | Pending adapter | Weekly editorial roundups need separate event extraction and verified venue coordinates. Article publication dates are not event dates. |
| [Richmond Review / Sunset Beacon](https://richmondsunsetnews.com/) | Pending scope and adapter | Homepage mixes articles and opinion. Identify specific community-event coverage and verify event details and geometry. Detail discovery remains zero. |
| [Marina Times](https://www.marinatimes.com/category/calendar) | Pending freshness and adapter | The inspected calendar archive includes older listings. Establish a current event endpoint and verify dates and geometry. Detail discovery remains zero. |

The collectors are intentionally bounded and do not promise complete publisher
coverage. Dates, prices, and coordinates are never filled with guesses. Missing
cost appears as “Cost not listed.” SFPL is marked free only when its listing
contains the explicit all-programs-free policy. Fetched records retain links and factual event
details, without reproducing publisher article bodies.

All supported feeds normalize into the same iOS-compatible GeoJSON contract.
These live adapters currently provide points; manually curated routes and areas
retain full LineString/Polygon geometry and use the same validation and rendering.

Run `npm run refresh` from `website/` for per-source results. Successful collection
updates `public/events.json`; source failures retain validated, unexpired prior
records and their original freshness timestamps. Saved fixtures are test inputs,
not fallback listings for the public site.
