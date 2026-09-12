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

- `config/sources.mjs` records approved, disabled entries for the three series.
  All registered sources have explicit groups; series have a kind. SFPL and Rec
  & Parks are venue/organizer sources. Civic Joy Fund is classified as a calendar
  because support for an event does not establish original authorship.
- Source page, footer, and agent Markdown use the same three groups. Free Places
  schedule providers remain independent. New series are clearly marked Planned.
- Shared `dedupeEvents` prefers reviewed direct-source IDs before applying the
  existing normalized-title/start-instant/exact-geometry identity. This reaches
  collection, website, and agent output. Equal-priority records retain existing
  first-seen selection. Caller arrays are not mutated. Invalid records cannot
  displace a valid publisher listing. Distinct dates and locations stay distinct.
- No fuzzy title matching, inferred schedule, fake geometry, live feed refresh,
  or newly claimed coverage. A verified intersection point is enough to publish
  the market later; a route is not a prerequisite.

## Outcome

Implementation is included with KQED in PR #11. New source collection remains
planned. Verification: production build passed, 137 unit tests passed, and 34 browser tests passed. The organizer-precedence regression failed before the fix and passed afterward.

## Next steps

Verify source-specific seasonal extraction/cancellations and venue coordinates
before enabling collection. Add reviewed occurrence aliases if real duplicate
examples differ in titles or geometry; do not collapse an entire series or nearby
unrelated events. Merge and deployment remain the owner's steps.

## Skills used

Brainstorming, test-driven development, verification-before-completion, and the local engineering-journal skill.
