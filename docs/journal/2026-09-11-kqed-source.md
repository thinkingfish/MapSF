---
status: open
opened: 2026-09-11
updated: 2026-09-11
---

# KQED The Do List: SF-only source feasibility

## Goal

Investigate the owner's request to add [KQED The Do List](https://www.kqed.org/thedolist?fr=navbar), restricted to events happening in San Francisco. Register the source and distinguish approval from automated collection readiness.

## Evidence

Read-only checks on September 11, 2026:

- The landing page embeds JSON in `window.__INITIAL_STATE__`. Its `listsReducer` entry `posts/?program=the-do-list&queryId=10de4df306e` requests `from: 0, size: 10` and reports 3,550 article results. These are article pagination totals, not events or date-window coverage. The sampled `eventsReducer` is empty.
- Article records have `publishDate`, `modified`, `content`, organizer links and taxonomy references. No uniform structured event start/end or venue-coordinate fields were found in the sampled records. Do not execute publisher scripts to read this JSON. Do not treat publication timestamps as event timestamps.
- The working [KQED Arts RSS](https://ww2.kqed.org/arts/feed/) returned HTTP 200, channel title `KQED Arts` and 30 article entries. It is regional arts coverage, not an SF event calendar or a full 30-day listing. The landing page's generic RSS auto-discovery advertises a News feed, which is not the appropriate Arts feed.
- Guessed dedicated endpoints `/arts/program/thedolist/feed/` and `/arts/program/the-do-list/feed/` on `ww2.kqed.org` both returned 404. This does not establish that no dedicated feed exists elsewhere.

Selected examples (factual summaries only):

| Article | Event facts | Integration consequence |
| --- | --- | --- |
| [SF CritterFest](https://www.kqed.org/arts/13993298/critterfest-san-francisco-documentary-film-festival-animals-4-star-theater) | September 17–20, 2026, primarily at 4 Star Theater, 2200 Clement St., SF. The article links individual screenings, a separate outdoor SF screening, and an online offering. | A festival date range is not a continuous opening-time range. Verify each session and venue; a pass price is not a per-session admission price. |
| [A Day of Public Art in Chinatown](https://www.kqed.org/arts/13993605/day-of-public-art-san-francisco-chinatown-ccc-cmac-sfac) | September 12, 2026, 11 a.m.–4 p.m.; three SF venues at 934 Stockton St., 667 Grant Ave. and 838 Grant Ave. | Candidate with explicit hours and multiple locations; verify geometry/organizer details. Three addresses alone do not establish a walking route. |
| [African Stew](https://www.kqed.org/arts/13993678/african-stew-lisa-b-thompson-oakland) | September 10–27 at the Magic Theatre space at Fort Mason in SF. The headline describes an Oakland setting. | Filtering headline/copy for “Oakland” would wrongly exclude an SF event. Individual performance times still need verification. |
| [The Cook](https://www.kqed.org/arts/13993790/the-cook-berkeley-rep-theater-review) | Berkeley Rep venue. | Exclude based on the out-of-SF venue. |

The linked Eventive screening page returned a client-rendered shell in the read-only reader; no screening-time/venue record was verified from that response. KQED Live has a separate program page and has not been silently substituted for The Do List.

## Implementation and decisions

- Register `kqed`, approved by the owner's request, with collection disabled and detail discovery capped at zero until an adapter is verified.
- The public Sources page describes the SF-only venue requirement and labels this integration Planned. Add the verified Arts RSS for direct subscriptions, explicitly labeled as Bay Area arts articles.
- No KQED events, fabricated coordinates, inferred performance hours, or new calendar coverage are added to `public/events.json`.
- A future extractor should discover editorial candidates, verify explicit physical venues in SF and actual occurrences through organizer details, and retain the KQED article link. Unknown cost stays unknown. Use POI/route/area only when that geometry is supported; retain a verified point when an extent is unavailable.

## Outcome

KQED is a useful editorial discovery source. The registry/public listing addition passed the production build, 136 unit tests and 34 browser tests; automatic event collection is still pending. The local browser executable was initially missing and was restored before browser verification. The sampled data does not justify enabling the existing generic JSON-LD adapter or claiming a complete 30-day window.

## Next steps

Implement and test an editorial candidate/review workflow plus verified organizer/venue joins before enabling collection. Include regression cases for article dates versus event dates, SF venues in non-SF headlines, mixed-city roundups, multi-venue programs, online screenings, multi-day performances and price/pass distinctions. Preserve the existing quality-over-quantity policy.

## Skills used

Bounded source investigation with the existing source approval/collection convention and local engineering journal. No live deployment is claimed.
