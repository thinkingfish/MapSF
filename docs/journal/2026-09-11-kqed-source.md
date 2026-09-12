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

- KQED is now enabled with a narrow editorial adapter. It reads JSON state safely with JSON.parse, inspects recent Do List articles, and accepts explicit event-summary paragraphs with a reviewed venue combination. The initial supported format is the three-venue Chinatown art event. Other articles are discovery material, not automatically published events.
- Actual event dates and hours come from the summary sentence, never publication timestamps or headline geography. Unknown prices remain unknown. No article bodies are republished.
- The station point is verified against [MTC’s 511 station page](https://511.org/travel/transit/centers/chinatown-rose-pak-station): latitude 37.794779100241, longitude -122.40807550785. It is a station pin, not an asserted entrance or route. All three addresses appear in an adapter-authored summary.
- The linked SF.gov organizer page presents a JavaScript verification challenge. It is not bypassed. The trusted KQED article supplies the event facts; the transit agency supplies location evidence.
- One landing-page request, bounded article count, explicit failure on missing state, and no full-month completeness claim. Publication is restricted to the 30-day window. Arts RSS remains available for direct subscription.

## Outcome

The live adapter returned one valid event: A Day of Public Art in Chinatown, September 12, 11am–4pm. Unit fixtures distinguish event dates from publication dates, reject unknown venue combinations and invalid dates, and preserve multi-venue context. Final admission validation is recorded in the direct-series journal.

## Next steps

Extend reviewed venue and summary formats as more explicit event examples are verified. Recent editorial discovery is not exhaustive; individual screening times, multi-day performances, and ticket/pass distinctions still need review. Sunday Streets admission is tracked separately. Merge/deployment is not claimed here.

## Skills used

Bounded source investigation with the existing source approval/collection convention and local engineering journal. No live deployment is claimed.
