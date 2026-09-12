# Garden areas implementation plan

Goal: show Botanical Garden and Japanese Tea Garden as areas after PR #11, with independent main-entrance points for directions. Keep admission rules and the other Free Places unchanged.

1. Verify OSM garden ways and entrance nodes against the operator’s current visitor maps; retain geometry provenance and ODbL attribution.
2. Add regression tests for two polygons, independent entrance points, malformed entrances, and unchanged point venues/admission schedules.
3. Store reviewed geometry in config; generate area curations and validated optional entrance points; expose entrance directions in details and agent Markdown/JSON.
4. Verify real map rendering and directions in Playwright, run unit/build/browser checks, document evidence, and open a PR.

No new dependencies, live event refresh, admission changes, or iOS changes are needed.
