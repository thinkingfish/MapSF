# Map tiles

The website serves its own Protomaps vector basemap and Noto Sans glyphs through Cloudflare static assets. No R2 bucket, API key, runtime Worker code, external tile service, or Python dependency is needed. Browsers request only visible tiles; they do not download the complete regional archive.

The pinned September 7, 2026 snapshot provides:

| Profile | Bounds (west, south, east, north) | Stored zooms | Tiles | Size |
| --- | --- | --- | --- | --- |
| Website | -122.65, 37.60, -122.20, 37.95 | 8–15 | 2,341 | 58.8 MiB raw tile assets |
| iOS | -122.55, 37.70, -122.35, 37.85 | 10–15 | 501 | 12.9 MiB MBTiles |

The shared compressed source is 34.4 MiB. The website can zoom to 18 by overzooming the source's zoom-15 geometry; this does not create additional source detail. The iOS subset retains the same tile coverage and zoom range as before. Its existing native renderer/style and event overlays are unchanged.

## Files and builds

- `config/tiles.mjs`: coverage, zooms, budgets, and pinned font revision.
- `config/basemap-release.json`: reviewed snapshot, SHA-256 checksums, provenance, sizes and per-zoom counts.
- `../maps/basemap/sf-bay.pmtiles`: shared source; compressed once in Git rather than committing thousands of individual tile files.
- `../maps/basemap/fonts/`: the font ranges used by names in that source; SIL license alongside them.
- `../MapSF/Resources/BaseMap/sf-tiles.mbtiles`: generated iOS subset, with gzip-compressed MVT data and TMS tile rows.
- `src/lib/basemap-style.mjs`: muted website vector style and same-origin URLs.

`pnpm run dev` and `pnpm run build` prepare `public/basemap/VERSION/` from local, checksum-verified inputs. Generated web files are ignored by Git. Normal builds need no map/font downloads and no PMTiles CLI. Install dependencies with `pnpm install --frozen-lockfile`; Node 24 is pinned by the project.

The version hashes the complete release manifest, including source/font checksums, profiles, provenance and output inventories. Tiles and glyphs are served as raw PBF, with protobuf content type and a one-year immutable cache policy. Cloudflare handles transfer compression. OpenStreetMap/Protomaps attribution stays visible on the map; license/notice files ship with the assets. A refresh publishes a new version path. A tab left open across a deployment may need reloading to request the new version if it pans to tiles it has not cached.

## Refresh and review

Run from `website/`:

```sh
# Latest published build, or choose a date explicitly:
pnpm run tiles:refresh
pnpm run tiles:refresh --date 20260907 --output /tmp/mapsf-candidate
```

The command downloads the official checksum-pinned PMTiles CLI for Linux/macOS (x64/arm64), extracts only the configured region from Protomaps, and writes a candidate directory. No system PMTiles, SQLite CLI, or tile-join installation is needed. Candidates must use a new directory, so previous candidates cannot be accidentally overwritten. `scripts/update-tiles.sh [YYYYMMDD]` remains a compatibility wrapper.

Each candidate contains `basemap/`, `basemap-release.json`, and `sf-tiles.mbtiles`. Review the manifest's source date, coverage, sizes, checksums and per-zoom counts. Then adopt into a feature branch:

```sh
pnpm run tiles:refresh --adopt /tmp/mapsf-candidate
pnpm test
pnpm run test:browser
```

Adoption verifies source/font checksums and the complete web tile inventory, regenerates the iOS subset and compares its checksum, then copies the validated inputs into the repository. Open a PR containing the input data, release manifest and iOS archive together. Inspect the map at city and street scales and run the iOS app on macOS/Xcode before an app release. Linux tests validate the MBTiles database/data but cannot validate the native renderer.

The monthly `Prepare monthly map tiles` GitHub workflow runs at 12:43 UTC on the first day of each month; it can also be dispatched manually. It uploads a 35-day `mapsf-tile-candidate` artifact after extraction, validation and a production build. It does **not** commit, merge or deploy. Download/unzip that artifact and use the same adoption command to create a reviewed PR. Daily event refreshes keep using the last reviewed map snapshot.

A missing tile, corrupt input, unsupported Protomaps major schema, or exceeded budget stops the refresh. The current iOS ceiling is 20 MiB; the master ceiling is 90 MiB. Web tile preparation reserves headroom with an 18,000-file budget. The final build checks all site assets against Cloudflare's 20,000-file free-tier limit and 25 MiB per-file limit. Adjust profiles/budgets in code only with a newly reviewed snapshot. Committed binary history grows with refreshes; moving source snapshots to release storage/R2 is a future option if that becomes burdensome.

## Cloudflare deployment

Use the existing production build/deploy commands. From repository root:

```sh
pnpm --dir website install --frozen-lockfile
pnpm --dir website run build
pnpm --dir website exec wrangler deploy
```

Or use `pnpm run build` / `pnpm exec wrangler deploy` when Cloudflare's root directory is `website`. Wrangler uploads generated `dist/` assets, including the tile tree. No new account settings or bindings are required. The initial complete build has about 2,400 files and 68 MiB of assets, all below the individual-file limit. Merge/deploy normally; merely generating a candidate does not update mapsf.net.

## Verification and upstream references

Pipeline tests cover XYZ/TMS conversion, byte preservation, missing tiles, corrupt inputs, size limits, and preserving prior output on failure. Browser tests render the real local tiles/fonts with external requests blocked, including labels, event routes, mobile layout, geographic constraints and zoom-18 overzoom.

- [Protomaps downloads and licensing](https://docs.protomaps.com/basemaps/downloads)
- [PMTiles extraction CLI](https://docs.protomaps.com/pmtiles/cli)
- [Protomaps vector layer schema](https://docs.protomaps.com/basemaps/layers)
- [Cloudflare static asset limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare static asset billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)

The upstream planet BLAKE3 hash in the manifest is provenance only: extraction uses range requests, so we do not download or claim to verify the whole planet archive. SHA-256 checksums verify the exact extracted archive and font files committed here.
