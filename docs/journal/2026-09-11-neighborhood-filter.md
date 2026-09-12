---
status: open
opened: 2026-09-11
updated: 2026-09-11
---

# Neighborhood overlays and filter

## Goal

Add the neighborhood layouts described in the Chronicle's February 2022 comparison, default to Analysis Neighborhoods, and filter and focus the map on one neighborhood at a time. Web only; iOS unchanged.

## Evidence

A user-requested research subagent downloaded official DataSF datasets: Analysis (j2bu-swwd, 41), Notification (mw29-m2za, 37), and SF Find/311 (gfpk-269f, 117). See public/neighborhoods/README.md and source-manifest.json for URLs, public-domain metadata, counts and raw-source hashes. WGS84 MultiPolygon geometry is preserved exactly, including islands and holes; properties are reduced to stable layout-prefixed IDs and names.

Following the user’s [Election Map SF](https://electionmapsf.com/) suggestion, the subagent found official DataSF historical precincts (bsfq-aeyw, PDDL) with their own `neighrep` assignments. Dissolving 600 named precincts produces 26 historical Election neighborhoods; five unassigned polygons remain excluded. Readable names are corroborated by Election Map SF’s 2020 metadata. The selector explicitly labels 2012 precinct definitions. These match the historical group names in the Chronicle article, without asserting exact equivalence to every subsequent map revision. No Chronicle or Election Map SF geometry was copied. Source crosswalk, excluded features and per-group area checks are shipped with the manifest.

## Implementation and decisions

- Native single-select Neighborhood control, default All neighborhoods, with a secondary Boundary map selector. Analysis is the default layout. Controls wrap on narrow screens and remain keyboard accessible.
- Background boundary lines sit under event layers; the selected polygon has a subtle teal fill and stronger outline. Events retain their existing pink map styling.
- Selection intersects actual Point/LineString/Polygon geometry with the neighborhood, including holes, shared boundaries and disconnected parts. A route crossing the neighborhood counts even if both endpoints are outside. Free Places are also filtered geographically; source filters retain their existing Events-only behavior.
- Selecting a neighborhood fits all of its parts; subsequent map movements further restrict visible listings. Clearing the selection or Show all of San Francisco restores the city view. Date/source/price changes preserve the selected neighborhood.
- Static GeoJSON is fetched locally on demand and cached per layout for the page lifetime. Failed loads retain prior geometry and filters with a retry control. Request sequencing prevents an older response replacing a newer layout. List use does not depend on WebGL availability.
- Overlay attribution links to the Sources page. No background tile provider or caching change. Automated browser tests use local tiles.

## Outcome

The combined four-layout implementation and PR #14 meadow support pass 166 unit tests and 42 browser tests, plus the production build and asset checks. Browser checks include all four layout switches, failed-download recovery, and visual assertions that the selected boundary fits the map on desktop and mobile. Independent code review found no actionable issues. A full-snapshot filter check over 2,837 records took 18 ms for Mission, 1 ms for Golden Gate Park and 15 ms for Bayview Hunters Point on this development host; these are local observations, not mobile performance guarantees. This branch is based on PR #14 so the shared multipart-area implementation is reviewed once. No deployment performed.

## Next steps

Review the implementation PR. Keep the historical Election label explicit; do not substitute current precincts without reviewing neighborhood assignments. Refresh source snapshots deliberately when city definitions change; do not infer that all four systems agree.

## Skills used

Brainstorming for the existing filter flow; user-requested parallel dataset research; test-driven development; engineering journal; independent code review; verification before completion.
