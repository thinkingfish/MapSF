---
status: open
opened: 2026-09-11
updated: 2026-09-11
---

# Neighborhood overlays and filter

## Goal

Provide the approved 15 MapSF browsing areas, derived from Analysis Neighborhoods, and filter and focus the map on one area at a time. Retain the four researched original boundary layouts in the repository for future uses. Web only; iOS unchanged.

## Evidence

A user-requested research subagent downloaded official DataSF datasets: Analysis (j2bu-swwd, 41), Notification (mw29-m2za, 37), and SF Find/311 (gfpk-269f, 117). See public/neighborhoods/README.md and source-manifest.json for URLs, public-domain metadata, counts and raw-source hashes. WGS84 MultiPolygon geometry is preserved exactly, including islands and holes; properties are reduced to stable layout-prefixed IDs and names.

Following the user’s [Election Map SF](https://electionmapsf.com/) suggestion, the subagent found official DataSF historical precincts (bsfq-aeyw, PDDL) with their own `neighrep` assignments. Dissolving 600 named precincts produces 26 historical Election neighborhoods; five unassigned polygons remain excluded. Readable names are corroborated by Election Map SF’s 2020 metadata. The selector explicitly labels 2012 precinct definitions. These match the historical group names in the Chronicle article, without asserting exact equivalence to every subsequent map revision. No Chronicle or Election Map SF geometry was copied. Source crosswalk, excluded features and per-group area checks are shipped with the manifest.

## Implementation and decisions

- User reviewed 13-, 14- and 15-area previews and approved the 15-area variant. `config/event-areas.json` records the complete grouping; Bayview is separate and the southern group is split in two.
- Native single-select Area control, default All areas. The boundary-map selector is removed. All four original layouts remain stored, with no public selection control.
- A reproducible build script dissolves the 41 Analysis Neighborhoods into 15 areas without simplifying boundaries. Tests verify each source belongs to exactly one group and preserve combined area.
- Background boundary lines sit under event layers; the selected polygon has a subtle teal fill and stronger outline. Events retain their existing pink map styling.
- Selection intersects actual Point/LineString/Polygon geometry with the neighborhood, including holes, shared boundaries and disconnected parts. A route crossing the neighborhood counts even if both endpoints are outside. Free Places are also filtered geographically; source filters retain their existing Events-only behavior.
- Selecting a neighborhood fits all of its parts; subsequent map movements further restrict visible listings. Clearing the selection or Show all of San Francisco restores the city view. Date/source/price changes preserve the selected neighborhood.
- The event-area GeoJSON is fetched locally and cached for the page lifetime. Failed downloads leave the other filters usable and expose a retry control. List use does not depend on WebGL availability.
- Overlay attribution links to the Sources page. No background tile provider or caching change. Automated browser tests use local tiles.

## Outcome

The approved 15-area implementation passes 168 unit tests, production build and asset checks, and 42 browser tests. Browser checks verify the Area label, 15 choices, absence of the boundary selector, desktop/mobile fit and reset, and recovery after a failed area download. Independent review found no actionable issues; it verified all source exterior vertices remain within their assigned merged area and the generated artifact matches its manifest hash. A full-snapshot filter check over 2,837 records took 18 ms for Mission, 1 ms for Golden Gate Park and 15 ms for Bayview Hunters Point on this development host; these are local observations, not mobile performance guarantees. PR #14 is merged; PR #15 targets main. No deployment performed.

## Next steps

Review the 15-area update to PR #15. Preserve the approved grouping and original source overlays. Refresh source snapshots deliberately when city definitions change.

## Skills used

Brainstorming for the existing filter flow; user-requested parallel dataset research; test-driven development; engineering journal; independent code review; verification before completion.
