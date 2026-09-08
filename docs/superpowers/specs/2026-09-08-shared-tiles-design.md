# Shared MapSF vector tiles

Implement the approved shared tile design. A pinned Protomaps regional PMTiles archive supplies the website and a smaller iOS MBTiles export. No Python, tile server, R2 account, or runtime third-party map requests are required.

The website serves decompressed XYZ vector tiles and locally bundled font glyphs as versioned Cloudflare static assets. Node 24 prepares these assets before Astro dev/build. Normal builds verify and read committed inputs without fetching map data. The map uses a muted vector style congruent with iOS, street/neighborhood labels, existing event overlays, and OpenStreetMap/Protomaps attribution. Browser zoom may overzoom the source's maximum detail.

Profiles are code: web zooms 8–15, bounds [-122.65,37.60,-122.20,37.95]; iOS zooms 10–15, bounds [-122.55,37.70,-122.35,37.85]. iOS has a 20 MiB archive ceiling; website generated assets have a 18,000-file ceiling (leaving room below Cloudflare's 20,000 free-tier files), 25 MiB individual file ceiling, and master archive 90 MiB ceiling. Fail before replacing published inputs when limits, integrity, or required coverage fail. Reports include actual byte sizes and tile counts per zoom.

A refresh explicitly downloads a dated official Protomaps extract using the checksum-pinned PMTiles CLI. Node reads that local archive, writes iOS tiles with TMS rows, and inventories required label glyph ranges. Inputs and manifests are committed together. A monthly workflow prepares a candidate as an artifact for review; no automatic merge or live publication. Manual local refresh can promote the validated candidate into the repo for a PR. The upstream planet hash is provenance, not a claim that the entire planet was downloaded or verified; local extracts and font inputs carry SHA-256 checksums.

The iOS renderer continues using its existing offline MBTiles path and style. The refreshed subset keeps the existing geometry layers and zoom range compatible. iOS native compilation requires macOS/Xcode and must be reported separately from data validation on Linux.

Validate with synthetic vector tiles (XYZ/TMS conversion, missing coverage, byte budgets, checksums), a real source extraction, MBTiles integrity and row comparison, style validation and browser tests that render local tiles/labels with all external map requests blocked. Include local Cloudflare HTTP cache/content-type checks and deployment instructions.
