# Source integration status

Publisher approvals are recorded in [SOURCE-REVIEW.md](SOURCE-REVIEW.md).
The original checks date to September 6, 2026; KQED was added September 11. The operational
switches remain in [config/sources.mjs](config/sources.mjs).

| Source | Collection | Evidence or remaining work |
| --- | --- | --- |
| [KQED The Do List](https://www.kqed.org/thedolist) | Enabled, narrow editorial extraction; SF venues only | Public page supplies article records, publication dates and organizer links, rather than a uniform event calendar. The reviewed Chinatown summary format supplies explicit times; a verified MTC station point anchors the multi-venue listing, with other addresses in its description. Other articles are not automatically converted; headline geography is unreliable. The [regional Arts RSS](https://ww2.kqed.org/arts/feed/) works for direct subscription/discovery. [Evidence](docs/journal/2026-09-11-kqed-source.md). |
| [SFPL](https://sfpl.org/events) | Enabled | Publisher event details + UTC ICS times; exact branch URL joins to the publisher's coordinates. Saved fixtures test missing data, cancellation, and request limits. Queries all 30 Pacific dates with full wall-time bounds, validates echoed filters, follows pagination, and caches detail/ICS requests within the run. Two concurrent workers; a 200-request per-day guard prevents incomplete runs from claiming coverage. |
| [SF Rec & Parks](https://sfrecpark.org/Calendar.aspx) | Enabled, limited venues | Calendar microdata supplies event dates and clock ranges. Currently accepts only Golden Gate Bandshell, matched to its exact official facility URL and verified coordinates. Unknown venues and ambiguous times are skipped. Checks all 30 daily calendar views, validates the requested date, and handles empty days and pagination explicitly. |
| [Mission Local](https://missionlocal.org/events/) | Enabled | Public Events Calendar API supplies UTC timestamps, addresses, venue coordinates, and stable event IDs. A bounded date-range query follows every page, verifies the echoed range and totals, and records checked empty days only after full completion. |
| [Funcheap](https://sf.funcheap.com/today/) | Pending geometry | Today's page and detail pages supply event times and costs. Sampled detail records supply addresses but no coordinates. Needs a verified venue mapping or geometry overrides before activation. The prior RSS URL redirects to FeedBurner; use the event-day page for future integration. |
| [SF Chronicle](https://www.sfchronicle.com/entertainment/events/) | Enabled | Public Evvnt calendar queries each of 30 dates with verified timestamps and venue coordinates. A large single page plus an empty confirmation page avoids observed unstable smaller-page sorting; nonempty continuation fails the run. See docs/pending-calendar-source-review.md. |
| [The Ingleside Light](https://www.inglesidelight.com/tag/things-to-do/) | Pending adapter | Weekly editorial roundups need separate event extraction and verified venue coordinates. Article publication dates are not event dates. |
| [Richmond Review / Sunset Beacon](https://richmondsunsetnews.com/) | Pending scope and adapter | Homepage mixes articles and opinion. Identify specific community-event coverage and verify event details and geometry. Detail discovery remains zero. |
| [Marina Times](https://www.marinatimes.com/category/calendar) | Pending freshness and adapter | The inspected calendar archive includes older listings. Establish a current event endpoint and verify dates and geometry. Detail discovery remains zero. |
| [Civic Joy Fund](https://civicjoyfund.org/events) | Enabled, verified venues and extents | Public Google Calendar ICS behind the publisher widget supplies recurring occurrences, exclusions, exceptions, and explicit times. Batched Civic Joy Fund Mobilize listings verify matching cleanup addresses and coordinates. September/October 2026 ValenciaLIVE uses reviewed street centerlines from 18th to 21st. Festivals with verified intersection points are included even without full extents; missing locations remain unpublished. |

| [Mission Science Workshop](https://www.missionscienceworkshop.org/) | Curated Mission community days | Current 2026–27 flyer supplies explicit dates, hours, and public eligibility; venue coordinates verified separately. The Mission site appears with recurring places. Other sites and Tuesdays remain pending; see docs/mission-science-schedule-review.md. |

Calendar collectors check the entire rolling 30-day window. The new series and editorial collectors inspect bounded source pages and record only today plus explicit occurrence dates; they do not claim a complete 30-day search. Request guards fail
closed instead of silently truncating a source. Publication still requires verified
fields and supported venues; this does not promise every event in San Francisco. Dates, prices, and coordinates are never filled with guesses. Missing
cost appears as “Cost not listed.” SFPL is marked free only when its listing
contains the explicit all-programs-free policy. Fetched records retain links and factual event
details, without reproducing publisher article bodies.

All supported feeds normalize into the same iOS-compatible GeoJSON contract.
Civic Joy Fund supplies verified meeting points and a date-specific Valencia route; other curated routes and areas
retain full LineString/Polygon geometry and use the same validation and rendering.

Run `pnpm run refresh` from the repository root for per-source results. Successful collection
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

Current pending-source investigations: [editorial sources](docs/pending-editorial-source-review.md). Marina’s calendar RSS ends in May 2024; current Ingleside roundups and Richmond/Sunset street events still need exact event extraction and verified geometry.

## Direct series and source precedence

Sources now have explicit groups: publishers/calendars, venues/organizers, and
recurring series. Series also identify their kind (markets, street festivals, or
performances). Civic Joy Fund remains in calendars: funding or listing an event
does not establish that it is the original organizer. Free Places providers remain
separate from these event sources.

| Series | Collection | Evidence or remaining work |
| --- | --- | --- |
| [SF Shakes](https://sfshakes.org/performance/free-shakes/) | Enabled, reviewed 2026 season | Individual SF dates parsed from the production schedule, using city facility coordinates and approximately 90-minute runtime. Recognizes row cancellations. New seasons require review. |
| [From the E](https://www.fromtheesf.com/) | Enabled | Bounded discovery of individual Event JSON-LD pages, explicit offsets and cancellations, joined to the reviewed city Ocean/Mission intersection point. Only this verified SF location publishes. |
| [Sunday Streets SF](https://sundaystreetssf.com/) | Planned | Official homepage lists 2026 occurrences, including Excelsior October 18. Verify per-occurrence hours and geometry; this date is outside the September 11 rolling window. |

Duplicate selection now prefers a direct venue/organizer or series over a calendar
publisher, independent of collection order. The existing conservative identity is
normalized title + start instant + exact geometry. Different titles or geometries
are not yet resolved as aliases; uncertain matches stay visible. The preferred
record keeps its complete fields and source link, without mixing conflicting
prices or event details. See [investigation](docs/journal/2026-09-11-direct-series.md).
