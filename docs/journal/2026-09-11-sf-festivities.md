---
status: open
opened: 2026-09-11
updated: 2026-09-11
---

# San Francisco festivities

## Goal

Track notable annual San Francisco festivities using official organizers, with verified dates, admission and map geometry. Keep incomplete editions internal and individual festivities out of the broad-source dropdown. Add the requested feedback email to the shared footer.

## Evidence

Reviewed organizer pages on September 11, 2026. Dates below are explicit announcements, not inferred recurrence. Fleet Week dates describe the overall range, not a daily occurrence.

| Organizer | Announced dates | Publication / remaining evidence |
| --- | --- | --- |
| [Chinatown Autumn Moon Festival](https://www.moonfestival.org/) | 2026-09-19, 2026-09-20 | Verified occurrences; LineString |
| [Folsom Street Fair](https://www.folsomstreet.org/folsom-street-fair) | 2026-09-27 | Verified occurrences; Point |
| [Castro Street Fair](https://castrostreetfair.org/fair/) | 2026-10-04 | Verified occurrences; Point |
| [Hardly Strictly Bluegrass](https://hardlystrictlybluegrass.com/info-faq-2026/) | 2026-10-02, 2026-10-03, 2026-10-04 | Verified occurrences; Point |
| [Bay to Breakers](https://www.baytobreakers.com/12k) | 2027-05-16 | Verified occurrences; Point |
| [San Francisco Pride](https://sfpride.org/) | 2027-06-26, 2027-06-27 | Weekend announced. Parade detail page still describes June 28, 2026; await 2027 parade date, hours and route confirmation. |
| [Carnaval San Francisco](https://carnavalsanfrancisco.org/) | 2027-05-29, 2027-05-30 | Festival weekend and May 30 parade announced. Parade route: 24th/Bryant to Mission, then north to 15th. Parade hours are missing; festival page mixes 2026 details. Await edition-specific hours. |
| [San Francisco Fleet Week](https://fleetweeksf.org/) | 2026-10-04, 2026-10-12 | Overall date range, not daily occurrences. Parade of Ships October 9, 11am–noon; air show October 9–11, noon–4pm. Verify public viewing coordinates and distinguish free viewing from paid seating before publication. |
| [Italian Heritage Parade](https://sfitalianheritage.org/parade/) | 2026-10-11 | Free parade starts 12:30pm at Jefferson/Powell, along Columbus to Washington Square. Await end time; do not invent duration. |
| [Chinese New Year Parade](https://chineseparade.com/faq/) | 2027-02-20 | Starts 5:15pm. Free public viewing with optional paid bleachers. Await end time and edition-specific route verification. |
| [Northern California Cherry Blossom Festival](https://sfcherryblossom.org/) | 2026-04-11, 2026-04-12, 2026-04-18, 2026-04-19 | Past edition only. Await 2027 announcement; do not extrapolate April weekends. |
| [Nihonmachi Street Fair](https://www.nihonmachistreetfair.org/) | 2027-08-07, 2027-08-08 | Dates announced; await 2027 hours and verified venue geometry. |

Additional primary details: [Pride parade](https://sfpride.org/parade/) still has 2026 parade details beneath a 2027 header; [Carnaval parade](https://carnavalsanfrancisco.org/parade/) confirms May 30, 2027 but lacks hours, while [festival details](https://carnavalsanfrancisco.org/festival/) retain 2026 programming. [Folsom FAQ](https://www.folsomstreet.org/faq) supplies the 18+ policy and suggested donation; its [linked map](https://www.folsomstreet.org/2025-map) is still 2025. [Fleet Week air show](https://fleetweeksf.org/air-show/) and [Parade of Ships](https://fleetweeksf.org/events/parade-of-ships/) give separate event schedules; do not publish the umbrella date range as continuous programming.

Coordinates come from [SF city street centerlines](https://data.sfgov.org/resource/3psu-pn9h.json), retrieved September 11, 2026: Autumn Moon follows Grant from California to Broadway, CNN 6392000–6399000; Folsom/9th is the end of CNN 5678000; Castro/Market starts 3790000; HSB entrance JFK/Transverse ends 12674000; Bay to Breakers start Howard/Fremont starts 7032000. Exact city vertices are preserved. Point locations explicitly describe entrances or intersections, not full festival footprints. The old Bay to Breakers test route and synthetic fixture hours are not publication evidence.

## Implementation and decisions

- Explicit edition catalog in config/festivities.mjs, with ready occurrences and seven pending-detail records. The five ready sources enter the refresh pipeline; pending records remain internal.
- Daily refresh checks reviewed official page facts for occurrences entering the 30-day window. No yearly extrapolation or implied complete calendar coverage. Changed or inaccessible pages use the existing failure/last-good behavior.
- Multiple-day festivals have separate daily occurrences and their own hours. HSB times describe gates through performance end, not music start.
- Adapter-authored admission labels preserve optional donations, Folsom's 18+ restriction and paid race participation. Publisher JSON-LD cannot provide the trusted cost override.
- Exact reviewed names, same start instant and nearby geometry identify duplicates. Official festival sources take precedence over calendar copies, including Civic Joy Fund; related concerts, workshops and after-parties remain separate.
- Current snapshot refresh is restricted to the new organizers; unrelated source timestamps and listings are preserved.
- Shared footer links mapsf@yaoyue.org with the requested contact wording on both public pages.

## Outcome

Verified 156 unit tests with `pnpm exec node --test --test-isolation=none tests/*.test.mjs`, production build, and all 38 browser tests, including mobile festival details and both footer contact links. The live partial refresh published seven festival-day occurrences and replaced two Civic Joy Fund copies with the official Autumn Moon route, leaving 2,842 total events. Bay to Breakers is stored for May 2027 and is not shown early. No deployment performed.

## Next steps

Review the PR. Complete the explicitly documented pending editions when organizers publish missing details, and review new editions rather than shifting last year's dates. Before Bay to Breakers enters the window, verify its current course if route geometry is desired; its verified start pin remains a valid fallback.

## Skills used

Brainstorming (existing catalog design), test-driven development, engineering journal, parallel work (independent SF Public Space research), requesting code review, verification before completion.
