---
status: open
opened: 2026-09-11
updated: 2026-09-11
---

# Direct event series and source grouping

## Goal

Add SF Shakes and the recurring market/street-festival sources identified by the
owner, distinguish these from high-volume calendars, and prefer original sources
when matching listings overlap.

## Evidence

Read-only checks on September 11:

- [SF Shakes overview](https://sfshakes.org/performance/free-shakes/) links the
  [2026 production](https://sfshakes.org/performance/free-shakes/ac/). Its visible
  schedule lists McLaren Park September 5/6/7/12/13 and Sue Bierman Park
  September 19/20/26/27, all at 2pm. It describes the duration as approximately
  90 minutes. The HTML JSON-LD describes a WebPage, not Event occurrences.
  Cupertino/Redwood City dates must not enter the SF feed. The raw HTML also
  contains an Orinda block whose weekdays do not match 2026; do not parse every
  date-looking string indiscriminately or expand the season into daily events.
- The owner's [Mission Local column](https://missionlocal.org/2026/09/excelsior-buzz-shakespeare-mclaren-park/)
  links [From the E](https://www.fromtheesf.com/) and Sunday Streets. The column
  is discovery evidence, not another calendar endpoint for the existing Mission
  Local API collector. It contains conflicting October dates and weekday labels
  around Salvadoran Soul Encuentro; do not publish those as verified occurrences.
- [From the E's September listing](https://www.fromtheesf.com/events/from-the-e-latino-heritage-month-night-market)
  publishes September 18, 2026, 4:30–8:30pm and free community admission. Raw Event
  JSON-LD supplies start/end offsets and scheduled status, but no geo coordinates
  or offer price. Location is Ocean Avenue and Mission Street. Registration's
  7pm cutoff is not the event end time. The homepage also names October 23,
  November 20 and December 11: these are explicit dates, not a monthly rule.
- [Sunday Streets](https://sundaystreetssf.com/) lists its 2026 neighborhood
  occurrences, including Excelsior October 18. Its operator is Livable City.
  The Excelsior link resolved to `/www.livablecity.org` and failed in the web
  reader; current per-occurrence hours and route still need verification.
  Salvadoran Soul Encuentro is a separate program, not interchangeable with a
  Sunday Streets occurrence. October 18 is outside today's 30-day window.

## Implementation and decisions

- `config/sources.mjs` records approved entries for the three series. SF Shakes and From the E are now enabled; Sunday Streets remains disabled.
  All registered sources have explicit groups; series have a kind. SFPL and Rec
  & Parks are venue/organizer sources. Civic Joy Fund is classified as a calendar
  because support for an event does not establish original authorship.
- Source page, footer, and agent Markdown use the same three groups. Free Places
  schedule providers remain independent. Source status distinguishes connected series from Sunday Streets, which remains Planned.
- Shared `dedupeEvents` prefers reviewed direct-source IDs before applying the
  existing normalized-title/start-instant/exact-geometry identity. This reaches
  collection, website, and agent output. Equal-priority records retain existing
  first-seen selection. Caller arrays are not mutated. Invalid records cannot
  displace a valid publisher listing. Distinct dates and locations stay distinct.
- The direct-series adapters collect published individual dates, not inferred recurrence. SF Shakes uses the city’s Jerry Garcia Amphitheater and Sue Bierman Park facility coordinates; From the E reuses the reviewed city Ocean/Mission intersection. Both restrict output to the 30-day publication window without claiming complete window coverage.
- Live probes returned six SF Shakes performances and one night market. The Shakespeare parser recognizes row cancellation annotations and rejects missing sections, changed seasons, invalid dates and unknown annotations. Market JSON-LD preserves cancellation status and explicit offsets.
- The map reset control now uses a small inline SF outline SVG; accessible label and reset behavior remain unchanged.

## Outcome

Implementation is included with KQED in PR #11. SF Shakes and From the E are connected; Sunday Streets still needs current occurrence details. Final admission validation and refresh results are recorded below.

## Next steps

Verify Sunday Streets current hours and location before enabling it. The organizer’s Excelsior page returned HTTP 500; indexed content describes 2025, so its hours/route are not reused for 2026. Review each new Shakespeare season before changing the pinned production URL/year. Add reviewed occurrence aliases if real duplicate
examples differ in titles or geometry; do not collapse an entire series or nearby
unrelated events. Merge and deployment remain the owner's steps.

## Skills used

Brainstorming, test-driven development, verification-before-completion, and the local engineering-journal skill.

## Venue provenance

- Jerry Garcia Amphitheater: https://sfrecpark.org/Facilities/Facility/Details/Jerry-Garcia-Amphitheater-421 — city map record latitude 37.7199305859824, longitude -122.414369024704.
- Sue Bierman Park: https://sfrecpark.org/Facilities/Facility/Details/Sue-Bierman-Park-378 — city map record latitude 37.796417999991, longitude -122.39675999997.
- Ocean/Mission: existing city-centerline provenance in `config/civic-joy-points.mjs`.

## Admission verification

- Final unit suite: 143 tests passed. Browser suite: 34 tests passed. Production build passed with the refreshed snapshot; final control inspected at mobile size. The last UI change after browser tests only simplified the SVG path; the built result was visually checked.
- Source pipeline checks returned status `ok` and 6 SF Shakes / 1 From the E / 1 KQED events. These eight were merged into today's existing successful calendar snapshot, preserving each existing source's timestamps and coverage. Ended records were removed and counts recomputed; resulting snapshot has 2,765 events.
- A redundant full-calendar crawl was stopped before it wrote output. Its incomplete requests are not claimed as a successful refresh. The new-source pipeline wrote a separate temporary snapshot for validation before inclusion.
- Independent review found no blocking issues. A subsequent KQED headline-cancellation regression was added and verified red/green; changed-format and unknown-venue articles stay unpublished.
- Outline geometry: [DataSF SF Shoreline and Islands](https://data.sfgov.org/resource/txuc-3kzm.geojson), public-domain dedication. Largest exterior land ring projected to a 20-unit icon and simplified to 23 points. The mainland shoreline and southern county line are represented; remote islands and piers are omitted at this size.
- No merge or deployment performed. Sunday Streets remains the outstanding admission: October 18 date confirmed, current organizer hours and exact location not verified.
