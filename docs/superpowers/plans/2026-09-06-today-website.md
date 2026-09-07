# MapSF Today Implementation Plan

> Use subagent-driven-development for the independent data and UI tasks, followed by integration review.

**Goal:** An iOS-congruent Astro event map/list site, prepared for Cloudflare deployment.
**Architecture:** Static Astro UI consumes a versioned event JSON feed. Scheduled Node collection uses an owner-vetted source registry. GeoJSON follows existing iOS curation conventions.
**Tech Stack:** Astro, MapLibre GL JS, Node.js 22.12+, JavaScript, Cloudflare static assets.
**Spec:** docs/superpowers/specs/2026-09-06-today-website.md

## Global constraints

- No Python. Website code lives in website/ and does not alter iOS behavior.
- SF local day and DST determine today. Preserve Point, LineString, Polygon.
- Candidate sources disabled until owner approval; no fabricated public events.
- Owner handles Cloudflare deployment; provide runnable configuration.

## Task 1: Data and collection

Create website/src/lib/events.mjs (pure shared filtering/validation functions),
website/scripts/refresh-events.mjs, website/config/sources.mjs,
website/data/manual-events.json, website/public/events.json, and website/tests/.
Export `sfDate(now = new Date())`, `eventsForDay(events, day)`,
`validateEvent(event)`, and `dedupeEvents(events)` from events.mjs.
Use the spec's event shape. Write meaningful failing tests before implementation.
Implement source-enabled gate, bounded trusted collection and manual overrides,
validate geometry/dates/links, dedupe, atomic data snapshot, stale source preservation.
Do not edit package.json or UI. Report npm dependencies needed to coordinator.

## Task 2: Astro UI

Create website/src/pages/index.astro, website/src/styles/, website/src/client/,
website/astro.config.mjs. Consume /events.json and pure events.mjs exports above.
Implement responsive iOS-congruent design, linked selection, map/list controls,
search, Free only filter, geometry type filter, today/day selection, event details,
map errors and empty/stale states. Use maplibre-gl npm package. Render all three
geometry types. Do not edit data or package.json. Coordinator owns dependencies.

## Task 3: Integration and deployment

Coordinator owns website/package.json and lockfile, Cloudflare config, docs,
GitHub CI and scheduled refresh workflow. Verify dependency compatibility,
run Node tests and Astro build. Browser-test desktop/mobile with fixture feed
interception so demo content never becomes public data. Review data and UI jointly,
fix material findings, and report deploy instructions and source enablement gate.

## Progress

- Design incorporates owner requirements for sources, Cloudflare, iOS style, and all curation geometries.
- Tasks 1 and 2 share only the explicit event shape and pure-module exports; package ownership stays with Task 3.
- All three tasks agree on disabled candidates and empty public feed until source approval.

- Task 1 implemented: 24 data tests pass; disabled-source refresh preserves the initial empty feed byte-for-byte.
- Task 2 implemented: 3 UI unit tests and 4 production browser tests pass; MapLibre6 named exports and explicit worker bundling verified.
- Task 3 integrated: Cloudflare dry run passes; desktop/mobile previews inspected with test-only point/route/area fixtures and real map tiles.
- Whole-site review findings fixed: cancellation preservation, SF geometry coverage, card collapse, and strict calendar validation. Final regression suite: 27 unit tests and 4 production browser tests pass. Scoped rereview completed; its remaining cross-refresh cancellation finding is fixed with persisted, expiring occurrence metadata and a multi-refresh regression.

## Approved-source integration

- Owner approved all eight publishers in SOURCE-REVIEW.md, including Marina Times in conversation.
- Enabled three verified sources: SFPL (detail + UTC ICS + exact branch coordinates), Rec & Parks (verified Bandshell facility), Mission Local (calendar JSON-LD).
- Five approved sources remain pending specific extraction/geometry/freshness work; evidence and limits are in website/SOURCE-STATUS.md.
- Collector now enforces both approval and enabled status; publisher prose remains on source pages.
- Integration verification: 51 unit tests, 4 production browser tests, and existing architecture checks pass. Scoped review passed after fixing cancellation handling before publication-field validation and SFPL current-time filtering. Final live refresh succeeded for all three enabled sources (13 unexpired events; 3 shown for today at verification time). Production desktop/mobile preview passed with no page errors; Cloudflare deployment dry run passed.
