---
status: open
opened: 2026-09-11
updated: 2026-09-11
---

# San Francisco farmers markets

## Goal

Add operator-verified SF farmers markets as recurring Events, with schedules in code and automatic 30-day expansion during the existing daily refresh. Preserve the separate Free Places collection and keep individual market series out of the source dropdown. User requested research and admission of these markets on September 11.

## Evidence

The [SF Environment directory](https://www.sfenvironment.org/farmers-markets-in-sf) provided discovery, not final hours: it contains conflicting evening hours and older locations. Each admitted market below was checked on its operator’s page. The catalog in `config/farmers-markets.mjs` is the editable database; URLs, review dates, geometry provenance, aliases, exceptions and schedule checks live with each record.

| Market | Usual hours | Official operator evidence |
| --- | --- | --- |
| Ferry Plaza | Tue/Thu 10–2; Sat 8–2 | [Foodwise](https://foodwise.org/markets/ferry-plaza-farmers-market/) |
| Alemany | Sat 7–2 | [Foodwise](https://foodwise.org/markets/alemany-farmers-market/) |
| Mission Community | Thu 3–7 | [Foodwise](https://foodwise.org/markets/mission-community-market/) |
| Heart of the City | Wed/Sun 7–4 | [Market operator](https://hotcfarmersmarket.org/find-us) |
| Clement Street | Sun 9–2 | [AIM](https://www.agriculturalinstitute.org/clement-st) |
| Stonestown | Sun 9–1 | [AIM](https://www.agriculturalinstitute.org/stonestown) |
| Fort Mason | Sun 9:30–1:30 | [CFMA](https://www.cafarmersmkts.com/fort-mason-center-farmers-market) |
| Noe Valley | Sat 8–1 | [Market operator](https://www.noevalleyfarmersmarket.com/) |
| Outer Sunset | Sun 9–2 | [Sunset Mercantile](https://sunsetmercantilesf.com/osfmm/) |
| Castro | Wed 3–7 | [PCFMA](https://www.pcfma.org/castro) |
| Fillmore | Sat 9–1 | [PCFMA](https://www.pcfma.org/market/fillmore-farmers-market) |
| Inner Sunset | Sun 9–1 | [PCFMA](https://www.pcfma.org/innersunset) |
| Divisadero | Sun 9–1 | [PCFMA](https://www.pcfma.org/divisadero) |
| Hayes Valley | Sat 10–2 | [PCFMA](https://www.pcfma.org/hayesvalley) |

Times are San Francisco local time; afternoon closing times are PM. Foodwise became Alemany’s operator in February 2026; its current 7 AM–2 PM hours supersede the discovery directory’s older 6 AM–3 PM entry. Mission’s [last 2026 market is November 12](https://foodwise.org/events/mission-community-market-last-day-of-the-season/); Castro’s operator gives November 18. Heart of the City lists Pride Sunday, Christmas Eve/Day and New Year’s Day closures. The catalog begins September 11, excludes the remaining applicable dates, and expires December 31, 2026; it must be reviewed before extending to 2027. Other last-minute and holiday exceptions are not a comprehensive feed.

North Beach, SOMA West, Dragonspunk and SF State remain discovery candidates: this change does not claim their current season, hours and venue have been verified. No listings outside SF were admitted. Quality and direct operator evidence take precedence over completeness.

### Geometry

- Outer Sunset: 37th Avenue from Ortega through Pacheco to Quintara, matching the operator’s current two-block description. SF city centerlines 1833000 and 1834000.
- Mission: 22nd Street between Mission and Valencia, through Bartlett, per the operator’s [visitor guide](https://foodwise.org/markets/mission-community-market/visitor-info). Centerlines 1191000 and 1192000.
- Castro: Noe between Market and Beaver, matching the [California certified-market listing](https://www.cdfa.ca.gov/is/docs/CurrentMrktsCounty.pdf), with PCFMA confirming 270 Noe. Centerline 9611000.
- Heart of the City: Fulton Plaza between Hyde and Larkin (centerline 5881000), matching the operator’s library/Asian Art Museum location. The embedded old map coordinates were not used.
- Centerlines were retrieved from [SF Streets – Active and Retired](https://data.sfgov.org/resource/3psu-pn9h.json), filtering active 37TH, 22ND, NOE, FULTON and CLEMENT. Joined endpoints match exactly.
- Alemany: full mapped marketplace outline from [OSM way 367586034](https://www.openstreetmap.org/way/367586034), matched to the operator’s 100 Alemany location. This is the market grounds, not a survey of individual stalls.
- Ferry Plaza and Fort Mason use named OSM market nodes. Clement uses the named marketplace way’s center as a venue pin; its current stall extent has not been independently confirmed. Noe uses the center of the mapped Town Square at the operator’s address. Stonestown uses the operator-linked Google Maps place target, not its viewport. Remaining PCFMA pins use the operator page’s embedded marker coordinates, not its office address. Exact source links are in the catalog.
- OSM-derived geometry is © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright). Existing map attribution remains. No map-provider, cache, iOS, or automatic zoom behavior changes.

## Implementation and decisions

Each market is a direct `series` source. `collectFarmersMarket` makes one bounded HTTP request to its official page while in season, checks reviewed schedule/location phrases, and expands only matching weekdays in the next 30 SF calendar dates. It preserves Pacific DST offsets, stable per-occurrence IDs, seasonal ends, known exclusions and review expiry. Expiry fails visibly rather than silently extending a season. Failed/changed pages use the existing failed-source and previous-event retention behavior. Retained records keep the previous successful timestamp.

This is weekly schedule verification, not automatic extraction of every exception. The adapter does not claim complete 30-day calendar coverage. Source descriptions and listing summaries explain this limitation. Inactive seasonal sources emit no occurrences. Free means entry, not free groceries; every summary says purchases cost extra.

Normal event deduplication still prefers direct organizers. Reviewed market names/aliases may match a nearby point to the original route/area at the same start instant, within the known extent plus approximately 100 metres. Different times, distant venues and separately titled concerts or workshops stay distinct. The existing Chronicle listing “Syd and I live at the Outer Sunset Farmers Market” is not the market occurrence and is preserved.

The initial publication refreshes only these new sources, preserving other publishers’ records and individual freshness timestamps. Subsequent normal daily refreshes include all enabled sources automatically.

## Outcome

Live refresh succeeded for all 14 official pages at 2026-09-12T03:22:04.372Z (September 11 in SF), publishing 73 occurrences and bringing the snapshot to 2,837 events. Other publishers’ records and timestamps were preserved. All 150 unit tests and 37 browser tests pass, including the production Astro build and asset validation. The new 390 × 844 mobile test covers Event placement, entry-cost wording, route labeling, official links, and exclusion from the source dropdown. Independent code review found no actionable issues.

## Next steps

Open and review the implementation PR. Review all schedules before the 2027 expiry; add operator-confirmed cancellations and holiday exceptions as they are announced. No deployment is claimed.

## Skills used

Brainstorming, using git worktrees (existing isolated checkout), test-driven development, engineering journal, requesting code review, verification before completion.
