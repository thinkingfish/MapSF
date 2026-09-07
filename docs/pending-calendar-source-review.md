# Pending calendar source review

Read-only publisher investigation and adapter verification, September 6, 2026.
No source approval or operational switch was changed by this review.

## SF Chronicle: verified public adapter

The [Chronicle events page](https://www.sfchronicle.com/entertainment/events/)
embeds Evvnt with publisher ID `6745`. Its publicly loaded
[plugin](https://discovery.evvnt.com/prd/evvnt_discovery_plugin-latest.min.js)
loads the calendar data from `https://discovery.evvnt.com/api`.
No credentials, private API access, or access-control workaround was needed.
The [publisher settings](https://discovery.evvnt.com/api/publisher/6745/publisher_settings)
identify the publisher as SF Chronicle and link back to its calendar.

The plugin's browser request implementation uses `publisher_id`, `fromDate`,
`toDate`, `multipleEventInstances`, `hitsPerPage`, and zero-based `page`.
An [example dated request](https://discovery.evvnt.com/api/events?publisher_id=6745&fromDate=2026-09-12&toDate=2026-09-12&multipleEventInstances=true&hitsPerPage=1000&page=0)
returns `{events:[...]}`. Each sampled occurrence supplies `objectID`,
`source_id`, `start_date`, offset-bearing `start_time`/`end_time`, venue
address and numeric latitude/longitude, and a price dictionary. The saved
reduced fixture records a September 7 dance class at Neck of the Woods,
406 Clement Street, coordinates `[-122.4637279,37.7831236]`, and USD 30.
Geometry is a publisher-provided venue point, not a guessed route or area.
No route/area geometry was verified.

### Pagination discovery and required safeguard

The API does not return totals, page metadata, or date-filter echoes. At the
widget's normal page size 30, September 10 pages returned 76 rows but only
73 unique records. Adjacent pages repeated object IDs `43126762`, `43815142`,
and `43313365`. All three were Bandsintown entries with equal start times
and scores, and no featured publisher IDs. A single page of size 100 returned
76 distinct records, including three records omitted entirely by the small
pages. This is evidence of unstable ordering at page boundaries, not proof
that repeated records are deliberate promotions. Deduplication cannot repair
those omissions.

A 30-day September 6–October 5 check with size 100 returned 2,240 occurrences
in 68 requests, with 7–156 events per date. On September 12, sizes 250 and
1,000 each returned all 156 records in one response. The production adapter
therefore requests 1,000 entries for each of the 30 Pacific dates, then
requires an empty page 1. Any nonempty continuation fails the entire source
refresh. This avoids the observed unstable boundary and catches growth or
server caps that require further pagination. Every occurrence must match
the requested date and have a unique identity; HTTP errors and limits fail
closed. A successful empty first page counts as a checked empty day.

The final size-1,000 collector passed the complete September 6–October 5 live
window: 2,240 unique records, 30 covered dates, and 60 successful requests.
Every page 1 was empty. The integration capture is saved at
`/tmp/mapsf-chronicle-live-capture.json` with `records`, `collectedAt`,
`coverageDates`, `coverageComplete`, and per-request URL/status/count evidence.

The API has no explicit completeness total, so these checks establish
completion under the observed public calendar contract, not an independent
inventory of all publisher events. A future provider change must fail closed
where detectable; an API that supplies stable ordering and totals would be
preferable.

### Integration contract

- Module: `website/scripts/adapters/chronicle.mjs`.
- Export: `collectChronicle(source, fetchImpl = fetch, now = new Date())`.
- Returns the shared array of `{pageUrl,record}`, with `coverageDates` and
  `coverageComplete` properties only after all thirty dates succeed.
- Configure adapter `chronicle`, `collectionWindowDays:30`,
  `maxRequestsPerDay:2`, `maxEvents:5000`, and the existing Chronicle listing URL.
- At most two requests per date; a nonempty second page is always an error.
- Unknown geometry remains missing. Virtual records have no point.
- A single unambiguous USD ticket rate is normalized; missing prices or
  differing ticket tiers remain unknown. This does not label mixed tiers free.
- Cancellation flags/titles retain the occurrence identity for shared removal.
- Article descriptions, contact details, and advertising fields are not copied.

The full integration capture is an ephemeral `/tmp` artifact, not a fixture or
fallback public dataset. Root integration is responsible for the registry,
operational source switch, shared normalization, publication bounds, and full
refresh verification.

## Funcheap: dated discovery works; geometry and termination remain pending

[September 6 archive](https://sf.funcheap.com/2026/09/06/) echoes its requested
event date. [September 7](https://sf.funcheap.com/2026/09/07/) exposes
`rel=next` to `/page/2/`; pages 2, 3, and 4 return HTTP 200 and continue
linking forward. The page-2 document title says “Page 2 of 46973”; this is
not a usable count of pages for that date. A complete daily terminal condition
has not been established. Do not treat the existence of `rel=next` alone as
proof of bounded, complete date pagination.

The [sample event detail](https://sf.funcheap.com/free-sunday-comedy-night-in-downtown-sf-14/)
provides an event date, start/end time, venue, cost conditions, and address.
Its map iframe is an address query for 1414 Market Street, not numeric venue
coordinates. No verified numeric geometry was found in that sampled detail.
An address-only Google map query is not evidence of an exact venue point.

The [RSS endpoint](https://sf.funcheap.com/feed/) redirects to FeedBurner and
was previously observed to contain ten recently added entries. It remains
useful discovery evidence, not a full rolling-month calendar.

Concrete remaining work:

1. Verify daily archive terminal behavior and separate event content from
   cross-date/popular/sidebar links before writing a 30-day collector.
2. Join an exact publisher venue identity and address to a separately verified
   venue point, or supply evidence-backed manual geometry overrides. Never
   use neighborhood centroids, inferred entrances, or copied display-map centers.
3. Preserve RSVP, minimum-purchase, and sliding-scale cost conditions. “FREE”
   with mandatory purchases must not silently become unconditional free entry.
4. Save fixtures for empty days, pagination termination, missing geometry,
   midnight/end-time handling, cancellation, and conditional prices; enable only
   after live collection and shared normalization pass.

No Funcheap adapter was implemented or source enabled.
