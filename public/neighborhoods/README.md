# SF neighborhood overlay sources

Retrieved 2026-09-11. Public default: 15 MapSF event areas, grouped from Analysis Neighborhoods. Original layouts are retained for future uses and are not choices in the public filter.

- Analysis Neighborhoods: City and County of San Francisco / DataSF / SF Planning, Department of Public Health, Mayor’s Office of Housing and Community Development. https://data.sfgov.org/d/j2bu-swwd . DataSF license: Open Data Commons Public Domain Dedication and License (PDDL), https://opendatacommons.org/licenses/pddl/1.0/ . 41 neighborhoods, aggregated from 2010 census tracts; not legally codified neighborhood boundaries.
- Notification neighborhoods (Planning Neighborhood Groups Map): City and County of San Francisco / SF Planning. https://data.sfgov.org/d/mw29-m2za . DataSF license: PDDL, https://opendatacommons.org/licenses/pddl/1.0/ . 37 neighborhoods designed for planning project notifications.
- SF Find / 311 neighborhoods: City and County of San Francisco / Mayor’s Office of Neighborhood Services / SF Planning. https://data.sfgov.org/d/gfpk-269f . DataSF metadata explicitly marks USGOV_WORKS (Public Domain U.S. Government). 117 general neighborhood locations established in 2006. This classification is reported from DataSF metadata, not independently inferred from the agency being governmental.

The first three normalized GeoJSON layouts preserve source geometry exactly. Only properties are reduced to id/name and stable layout-prefixed slug IDs are added. Coordinates are longitude,latitude / WGS84. Source metadata and licenses are recorded in the manifest.

- Election neighborhoods (historical 2012 precinct definitions): City and County of San Francisco / Department of Elections / DataSF. https://data.sfgov.org/d/bsfq-aeyw . DataSF license: PDDL, https://opendatacommons.org/licenses/pddl/1.0/ . Produced by dissolving all 600 precincts with a named official `neighrep` assignment; five `NA` source polygons remain unassigned. No simplification. Readable neighborhood names were verified against the 2020-11-03 Election Map SF metadata (https://data.electionmapsf.com/prod/san_francisco/2020-11-03/details.json), with one-to-one agreement for all 26 official neighborhood codes. Election Map SF by Chris Arvin explicitly attributes neighborhood definitions to Department of Elections and boundary data to DataSF (https://electionmapsf.com/about). No geometry copied from Election Map SF or Chronicle. This is a historical layout, not a claim about current election boundaries.

Context: The Chronicle article https://www.sfchronicle.com/projects/2022/san-francisco-neighborhoods/ compares these four layouts. Historical election reference PDF: https://sfelections.sfgov.org/sites/default/files/Documents/Maps/NeighborhoodPctMap2019.pdf . The 26 election groups match its names, but derived boundaries are sourced from the published 2012 precinct dataset and are not asserted to be identical to every later historical map revision.

## Reproduction

The source manifest lists each DataSF download endpoint and its source name field. Fetch each GeoJSON FeatureCollection with `$limit=1000`; verify the response is complete against source metadata. Keep all Polygon/MultiPolygon coordinates unchanged. Set the feature ID and properties.id to `layout + '-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')`, properties.name to the original name, and remove other properties. Runtime paths use `311.geojson` for the SF Find dataset. Normalization performs no independent ring simplification; doing so could create gaps along shared boundaries. These are separate definitions, not interchangeable administrative districts.

Files here are normalized snapshots. The manifest distinguishes source hashes from runtime hashes and sizes. DataSF may update boundaries; refresh deliberately, validate names/counts/geometry, and review changes before publication. This is a static asset release, not part of daily event collection.

### Election dissolve

The property-only normalization above applies directly to Analysis, Notification and 311. For Election, download the manifest's `bsfq-aeyw` precinct GeoJSON, exclude the five `neighrep === "NA"` features, and set each retained feature's properties to `{neighrep, name: crosswalk[neighrep]}` using `election-name-crosswalk.json`. Fail if any named code is missing from the crosswalk. Save this as `election-precincts.named.geojson`, then run the same pinned tool used for this snapshot:

```sh
pnpm dlx mapshaper@0.7.61 election-precincts.named.geojson \
  -dissolve neighrep copy-fields=name \
  -o election.dissolved.geojson format=geojson
```

Normalize the dissolved features to `election-*` IDs and id/name properties as above. No simplification, rounding or repair was applied. Check 26 groups, all 600 assigned precincts, three retained holes and each group's area against its source precinct sum. The five exclusions are recorded in `election-excluded-unassigned.json`; these are not reassigned to adjacent neighborhoods. Mapshaper is a one-time data preparation tool, not a runtime dependency.

## MapSF event areas

The approved 15-area assignment is maintained in `config/event-areas.json`. Every Analysis Neighborhood belongs to exactly one group. Bayview–Hunters Point stays separate; Glen Park / Outer Mission / Excelsior and Portola / McLaren Park / Visitacion Valley form separate southern groups. Treasure Island remains its own area. These are browsing groups, not official neighborhood names.

Regenerate from the repository root with `pnpm exec node scripts/build-event-areas.mjs`. It uses pinned Mapshaper 0.7.61 through `pnpm dlx` only during data preparation. For an existing installation, set `MAPSHAPER_BIN` to its executable. The script dissolves shared internal boundaries without simplification and validates complete, unique assignments. The unit suite also compares each result’s area against its source neighborhoods. Update the runtime hash in the source manifest after a reviewed change. No runtime dependency is added.
