# Recurring free places

Gardens live in [config/places.mjs](config/places.mjs). Museums have their own curated [config/museums.mjs](config/museums.mjs) and [review record](MUSEUM-REVIEW.md). These are repository-maintained records, independent of one-off event ingestion. The generator is `scheduledPlacesForDay(day, { now = new Date(), places = configuredPlaces } = {})` in `src/lib/places.mjs`; its default catalog combines both lists.

Each record supplies an ID, venue name, category, address, verified point coordinates or area geometry and their source URL, official admission source, review date, validity window, hours, public free rules, optional SF resident admission, early free windows, and closure exceptions. Rules use JavaScript weekday numbers (Sunday 0); `nth` counts that weekday within its month. `month` and `day` support fixed annual dates. Closure date ranges are inclusive.

The generator produces at most one `place:<venue>:<YYYY-MM-DD>` card per venue per day. Every card passes the regular event validator and includes full GeoJSON Point or Polygon curation plus `recurring`, `eligibility`, `admissionNote`, `hoursLabel`, and `entryEnded`. A public free day takes precedence over the resident label. Resident-only free admission is explicitly conditional; early public admission is explained separately. Museum admission excludes paid special exhibitions. No arbitrary polygons or city-center fallback coordinates are used.

The day is a San Francisco calendar date. Generated timestamps contain the actual SF UTC offset, including DST. Garden start/end timestamps are entry windows: `endAt` is last entry, which can be earlier than closing. `entryEnded` becomes true at that cutoff when viewing the current SF day; the card remains for planning. It does not assert live opening status. All current windows begin after the DST clock transition.

Reviewed 2026-09-06 against [operator hours](https://gggp.org/visit/admissions-hours/), [resident admission](https://gggp.org/tickets/), and [operator map links](https://gggp.org/visit/getting-here/). Botanical Garden includes daily early entry, second Tuesdays and its three stated holidays. Tea Garden includes Monday/Wednesday/Friday early entry. Conservatory includes first Tuesdays, Wednesday closure, and its January 21–February 4, 2026 maintenance closure. Coordinates are the linked map place targets, not map viewport centers.

Records expire after 2026-12-31 and produce no cards outside the configured validity window. This bounds the known annual closure data; it is not a guarantee of future availability. Review official hours, admission requirements, seasonal cutoffs, announced closures, map positions, and exceptions before extending dates. Unexpected closures, sold-out tickets, and special events are not a live feed. The small catalog guarantees no particular number of options for every date or visitor's eligibility.

Run `pnpm exec node --test tests/places.test.mjs` from the repository root to check monthly/holiday rules, SF midnight and DST, seasonal last entry, resident labels, closures, review expiry, duplicate suppression, and complete curation geometry.

## Community science workshops

Mission Science Workshop’s Mission site uses explicit 2026–27 public community-day
dates from the current operator flyer in `config/science-workshops.mjs`. It appears
after one-off events alongside gardens and museums. These are public drop-in days;
field trips and enrolled programs are excluded. See
[verification and pending sites](docs/mission-science-schedule-review.md).

## Garden boundaries and entrances

Botanical Garden and Japanese Tea Garden use reviewed OSM Polygon boundaries in [config/garden-geometry.mjs](config/garden-geometry.mjs). Other venues remain points. Each garden has a separate validated `entrance` object (`name`, Point `geometry`, and source URL); details links and agent Markdown navigate to this point. Daily JSON retains both the full area and entrance. Geometry provenance and review dates are separate from admission review dates. Grounds outlines do not imply that service areas or temporarily closed sections are accessible. See [geometry evidence](docs/journal/2026-09-11-garden-areas.md).
