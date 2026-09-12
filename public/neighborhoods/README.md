# SF neighborhood overlay sources

Retrieved 2026-09-11. Default: Analysis Neighborhoods.

- Analysis Neighborhoods: City and County of San Francisco / DataSF / SF Planning, Department of Public Health, Mayor’s Office of Housing and Community Development. https://data.sfgov.org/d/j2bu-swwd . DataSF license: Open Data Commons Public Domain Dedication and License (PDDL), https://opendatacommons.org/licenses/pddl/1.0/ . 41 neighborhoods, aggregated from 2010 census tracts; not legally codified neighborhood boundaries.
- Notification neighborhoods (Planning Neighborhood Groups Map): City and County of San Francisco / SF Planning. https://data.sfgov.org/d/mw29-m2za . DataSF license: PDDL, https://opendatacommons.org/licenses/pddl/1.0/ . 37 neighborhoods designed for planning project notifications.
- SF Find / 311 neighborhoods: City and County of San Francisco / Mayor’s Office of Neighborhood Services / SF Planning. https://data.sfgov.org/d/gfpk-269f . DataSF metadata explicitly marks USGOV_WORKS (Public Domain U.S. Government). 117 general neighborhood locations established in 2006. This classification is reported from DataSF metadata, not independently inferred from the agency being governmental.

Normalized GeoJSON preserves source geometry exactly. Only properties are reduced to id/name and stable layout-prefixed slug IDs are added. Coordinates are longitude,latitude / WGS84. Source license identifiers and metadata URLs are recorded in the manifest.

Context: The Chronicle article https://www.sfchronicle.com/projects/2022/san-francisco-neighborhoods/ compares four layouts. The historical Election layout is not supplied here as GeoJSON because no official machine-readable source was verified. Reference PDF: https://sfelections.sfgov.org/sites/default/files/Documents/Maps/NeighborhoodPctMap2019.pdf . Chronicle repository https://github.com/sfchronicle/sf-shapefiles has no license in retrieved repository metadata; no Chronicle geometry was copied.

## Reproduction

The source manifest lists each DataSF download endpoint and its source name field. Fetch each GeoJSON FeatureCollection with `$limit=1000`; verify the response is complete against source metadata. Keep all Polygon/MultiPolygon coordinates unchanged. Set the feature ID and properties.id to `layout + '-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')`, properties.name to the original name, and remove other properties. Runtime paths use `311.geojson` for the SF Find dataset. Normalization performs no independent ring simplification; doing so could create gaps along shared boundaries. These are separate definitions, not interchangeable administrative districts.

Files here are normalized snapshots; the source hashes and byte sizes in the manifest refer to downloaded originals. DataSF may update boundaries; refresh deliberately, validate names/counts/geometry, and review changes before publication. This is a static asset release, not part of daily event collection.
