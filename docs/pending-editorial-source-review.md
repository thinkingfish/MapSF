# Pending editorial source review

Reviewed September 6, 2026 for the rolling September 6–October 5 window. This is
bounded discovery evidence, not an enabled collector or a promise of complete
publisher coverage. Publisher approval is already recorded in
[the source review](../website/SOURCE-REVIEW.md).

Live Node fetches returned HTTP 200 for all three general RSS feeds, the sampled
articles, and the category pages below. Each general feed contained 15 entries.
Search-engine snapshots lagged the live Ingleside page, so freshness conclusions
below use the direct publisher responses. No protection bypass, account access,
or publisher contact was used. Full article bodies were not added to the repo.

## The Ingleside Light

**Assessment: current, promising structured editorial extraction; geometry and
coverage verification still required.**

- [General RSS](https://www.inglesidelight.com/rss/) had a newest publication of
  September 3, 2026 and included the September 1 roundup.
- [Things To Do](https://www.inglesidelight.com/tag/things-to-do/) is the appropriate
  discovery scope, rather than every article in the general feed.
- [September 1–7 roundup](https://www.inglesidelight.com/projeto-novo-sf-show-and-other-greater-ingleside-events-for-sept-1-7-2026/)
  actually includes dated headings through September 14. Sample September 6
  listings include Glen Park library karaoke (14:00–15:30, free), Ingleside library
  chess (14:30–16:00, free), and an Ocean Ale House performance (18:00, no cover,
  no end time). The coffee tour gives a meeting venue and price, not a full route.
  The September 13 roundup section includes Lakeside Landing jazz, 13:00–15:00,
  free. Each sample links to an organizer/calendar/booking page.

Technical observations: article JSON-LD describes `Article`, `Organization`,
`Person`, and images, not `Event`. Event headings are `h3` elements such as
`sunday-sept-6`. Individual paragraphs usually contain an organizer link followed
by pipe-separated venue, time, price, and neighborhood. Featured entries instead
put the title and venue on separate lines within one paragraph. The sampled
article has no latitude/longitude, GeoCoordinates, or Google Maps URL markers.

A conservative adapter is feasible: discover only roundup URLs; scope extraction
to the article body; validate each heading against an explicit article-year
context and weekday; parse both demonstrated paragraph shapes; retain the article
URL as provenance and the organizer URL separately; convert explicit local times
using America/Los_Angeles. Reject ambiguous dates, missing time ranges, virtual
listings, and unresolved venues. Never treat an article publication timestamp as
an event start. Price handling must preserve qualifiers such as student rates,
RSVP, and sliding scale instead of silently choosing a minimum.

For a first verified subset, SFPL organizer-event links can be resolved through
its existing detail/ICS and exact branch-URL coordinate workflow. That is likely
to overlap the enabled SFPL feed; deduplication needs testing. Independent venues
need exact authoritative POI joins. A coffee tour or multi-site cleanup needs its
actual route/area verified; its meeting location cannot stand in for that geometry.

This one roundup only establishes explicit occurrences through September 14.
An adapter may publish validated records without claiming September 15–October 5
were checked empty. Full monthly completeness is not supported by a 15-item news
RSS or a bounded number of weekly articles. Test malformed heading years,
month/year transitions, noon, shared meridiems, cancellations, featured paragraphs,
paid qualifiers, missing end times, unsupported geometry, duplicate organizer URLs,
and exhausted pagination/request guards before activation.

## Richmond Review / Sunset Beacon

**Assessment: event scope identified; monthly editorial extraction and geometry
remain unverified. No need to ask the owner to approve the publisher again.**

- [General RSS](https://richmondsunsetnews.com/feed/) was current through September
  5, but it mixes sponsored content, opinion, business, and news.
- [Announcements category](https://richmondsunsetnews.com/category/announcements/)
  provides a specific candidate discovery scope and advertises a
  [category RSS](https://richmondsunsetnews.com/category/announcements/feed/).
  The latest category article observed was August 7; the category RSS itself was
  discovered but not fetched in this review.
- [August 2026 announcements](https://richmondsunsetnews.com/2026/08/07/announcements-august-2026/)
  mixes dated events, recurring activities, virtual programs, business hours,
  birthdays, and editorial notices. A library performance is described as
  Thursday, August 8, although August 8, 2026 is Saturday. Walking-group entries
  give starts and general destinations, variable durations and holiday/rain
  exceptions, not complete route geometry.
- [September 2 editorial](https://richmondsunsetnews.com/2026/09/02/from-the-editor-content-expansion-and-neutrality/)
  gives two current occurrences: Autumn Moon Festival, September 12, 11:00–15:00,
  Clement between Eighth and 11th avenues; and Sunset Night Market's Autumn Moon
  Festival, September 25, 17:00–22:00, Irving between 20th and 25th avenues.
  The cited paragraph does not give admission costs or coordinate geometry.

The homepage and sampled August article contain no JSON-LD Event records. A
simple category switch would therefore still yield no events under the current
`jsonld` adapter. Scope an eventual adapter to Announcements and explicitly dated
community-event blocks, with a separate editorial discovery rule only if tested.
Require per-event date/year/weekday consistency, explicit clock ranges, and actual
location evidence. Missing cost may remain `Cost not listed`; store hours and
undated recurrence must not become automatic current events.

The September festivals are good manual-curation candidates after organizer
confirmation and complete street geometry verification. Their stated extents
should be represented with a reviewed LineString or Polygon, according to the
actual event footprint, rather than a guessed center point. The August article
cannot establish a current September recurring schedule or 30-day coverage.
The source's daily page masthead must not be mistaken for the article or event date.

## Marina Times

**Assessment: confirmed stale event channel; keep collection disabled.**

- [General RSS](https://www.marinatimes.com/feed) had a newest publication of July
  28, 2026, but recent items were dating/sponsored material rather than community
  event listings. General-feed freshness does not establish calendar freshness.
- [Calendar archive](https://www.marinatimes.com/category/calendar) advertises a
  [calendar RSS](https://www.marinatimes.com/category/calendar/feed). The live
  category feed's newest item was published May 3, 2024, describing that year's
  June 1–2 Union Street Festival. Subsequent sampled entries were March/February
  2024. The feed's `lastBuildDate` was also May 3, 2024.
- [Calendar Events](https://www.marinatimes.com/events/) returned HTML but exposed
  no `/event/` detail links in this inspection. It did not establish current
  occurrences. The page footer advertised the August 2025 issue.
- [Broder Rock event](https://www.marinatimes.com/event/the-broder-rock-social-distance-street-band)
  explicitly states March 24, 2024, 15:00, free, on Broderick between Bay and North
  Point. It has no explicit end time or verified event geometry.

Do not advance 2024 dates to 2026 or indefinitely expand archived “ongoing” jazz
listings. A future adapter needs a demonstrably current public event endpoint,
explicit occurrence years and time ranges, and authoritative venue/footprint
geometry. Calendar category RSS is a better freshness probe than the general
feed, but it is currently evidence of a blocker, not an ingestion solution.

## Integration implications

No source switch or adapter was changed by this review. The most concrete next
implementation is a strict Ingleside parser with verified POI joins and honest
partial coverage, followed by fixture and live-output review. Richmond's
Announcements scope is now concrete; its free-form mixed content still needs a
publisher-specific parser and strong rejection rules. Marina needs fresh source
data before adapter development is useful.

The existing adapter contract returns `{ pageUrl, record }` entries; complete
coverage metadata must only be set when the entire claimed interval was checked.
All resulting records must pass the shared event validator and publication bounds,
retain original provenance/freshness, and satisfy point/route/area geometry
requirements. None of these news feeds proves an empty day or an empty month.
