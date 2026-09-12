---
status: open
opened: 2026-09-11
updated: 2026-09-11
---

# Free Places garden areas

## Goal

After PR #11 merged, convert Botanical Garden and Japanese Tea Garden to areas, with separate main-entrance points for navigation. Web only; preserve admission schedules and other Free Places.

## Evidence

- Downloaded bounded Overpass geometry on September 11: [Botanical way 120480164](https://www.openstreetmap.org/way/120480164), version 20 (2023-08-29), 125 positions; [Tea Garden way 30900516](https://www.openstreetmap.org/way/30900516), version 20 (2026-04-23), 11 positions. Both rings are closed. Ticket buildings with matching names were excluded.
- Visually checked the operator’s [Botanical visitor map](https://gggp.org/wp-content/uploads/2026/05/GGGP-SFBotanicalGarden-Map-8.5x11-260429.pdf) and [Tea Garden visitor map](https://gggp.org/wp-content/uploads/2026/05/20260315-JapaneseTeaGarden-Map-11x8-v4-FINAL-1.pdf), linked from [Garden Maps](https://gggp.org/visit/garden-maps/). These establish garden identity, general extent, and main entrance locations; precise coordinates come from OSM, not a survey of these illustrative PDFs.
- Botanical Main Gate: [node 7838369891](https://www.openstreetmap.org/node/7838369891), longitude -122.4667863, latitude 37.767047, near 9th Avenue. Tea Garden Main Gate: [node 392430963](https://www.openstreetmap.org/node/392430963), longitude -122.4695479, latitude 37.7702263, on Hagiwara Tea Garden Drive. Neither is a polygon centroid or an exit gate.
- Geometry is © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright). Existing basemap attribution remains visible. OSM hours and prices were not imported.

## Implementation and decisions

`config/garden-geometry.mjs` stores full rings, OSM way versions, review date, and independent entrance Point geometry. Generated curations use `area`/Polygon for these two gardens; other venues keep `poi`/Point. Optional entrance data is validated and exposed in daily JSON and Markdown, with a directions link in expanded cards. Directions never infer an entrance from the shape.

The outlines describe garden grounds, including service areas and spaces that may be closed to the public. They do not grant access to every enclosed space. Operator maps remain the authority for visitor paths and temporary closures. Admission verification remains dated September 6, distinct from September 11 geometry review. Local vector tiles and map viewport behavior are unchanged.

## Outcome

Verified locally: 144 unit tests and 36 browser tests pass; the browser command includes the production Astro build and tile asset checks. The new browser case checks both rendered area features and exact entrance direction URLs. Visually inspected the resulting map at the default 1280 × 720 browser viewport, with the map zoomed to the gardens. Existing mobile map/accordion tests also pass. Code review identified an unsafe boundary-provenance Markdown path; added URL validation, escaping, and an adversarial regression test.

## Next steps

Open and review the garden-area PR, then merge. No deployment is claimed.

## Skills used

Writing plans, test-driven development, engineering journal, requesting code review, systematic debugging, verification before completion, finishing a development branch.
