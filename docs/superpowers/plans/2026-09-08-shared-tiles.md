# Shared Tiles Implementation Plan

> Execute the approved design in the existing isolated worktree; independent style work may run alongside the data pipeline. Use test-driven-development and verification-before-completion.

**Goal:** Serve local vector maps on the website and refresh a size-limited iOS subset from the same source.
**Architecture:** Committed PMTiles and font inputs; Node 24 preparation; Astro static XYZ assets; separate iOS MBTiles export.
**Tech Stack:** Node 24, pnpm, pmtiles JS/CLI, node:sqlite, MapLibre, Cloudflare static assets.
**Spec:** docs/superpowers/specs/2026-09-08-shared-tiles-design.md

## Constraints

No Python or runtime third-party map service. Profiles and input hashes in code. Fail closed on incomplete coverage, corruption, or size limits. Preserve event map interactions and iOS source identifiers.

## Tasks

- [x] Data pipeline: add `website/config/tiles.mjs`, `website/scripts/tiles/*.mjs`, synthetic tests in `website/tests/tiles.test.mjs`. Define `tileRange(bounds,z)`, local PMTiles reader, web preparation and iOS export; verify coverage, budgets, checksums and deterministic output. Use `node:sqlite` for MBTiles and TMS conversion. Read-only source; staged output before replacement.
- [x] Refresh: checksum-pin PMTiles CLI; extract September 7 regional source into `maps/basemap/`; record `website/config/basemap-release.json` with `version`, `bounds`, `minzoom`, `maxzoom`, source SHA-256, tile reports and glyph input inventory. Collect glyph ranges required by English/default labels. Refresh iOS within size ceiling. Replace legacy Python shell script with a Node entry point wrapper.
- [x] Website style: implement `createBasemapStyle(release)` in `website/src/lib/basemap-style.mjs` and import release config in `app.mjs`. Source paths `/basemap/${release.version}/{z}/{x}/{y}.pbf`, glyphs `/basemap/${release.version}/fonts/{fontstack}/{range}.pbf`, fontstack `Noto Sans Regular`. Use explicit source bounds/zoom and preserve event overlay behavior. Validate style and render local assets in browser regression.
- [x] Build/deploy: wire preparation into `dev`/`build`, ignore generated public assets, set immutable cache/MVT headers, enforce final Cloudflare limits, update CI path triggers, add monthly candidate workflow and operator docs. Normal build must work without external tile fetches.
- [x] Verify: run unit suite, browser suite, production build, local Wrangler HTTP checks, source/iOS checksum and SQLite integrity checks. Inspect rendered desktop/mobile screenshots. Review complete diff; fix findings; create PR with actual sizes and native verification limitation.

## Verification results

136 unit tests and 34 browser tests passed. The full refresh command reproduced source and iOS checksums. Local Wrangler returned matching PBF bytes, immutable cache headers, ETags/304 responses and 404 for missing tiles. Architecture checks passed. City/street/mobile screenshots inspected. Independent review found no blockers. Native iOS execution remains a macOS/Xcode release check.
