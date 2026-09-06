# MapSF Today website

A separate Astro website in `website/` serves public SF events for today, ready
for the owner to deploy on Cloudflare. No changes to the iOS application.

## Product

Use the iOS design vocabulary: system sans-serif, streetcar pink #F27890, white
and muted gray surfaces, 12px rounded cards, subtle separators, map with selected
item details. Desktop map/list split; mobile map above list with Map/List controls.
Plain-language filters, keyboard-accessible list, linked selection, event cards
with time, venue/address, cost, original source link, optional small banner.
Use San Francisco local dates (America/Los_Angeles), including DST and overnight
intervals. Today is evaluated at view time and updated across midnight. Never
present example events as live. Empty and stale-data states must be honest.

## Data contract

`website/public/events.json` is a versioned feed:
`{ schemaVersion: 1, generatedAt: ISO timestamp|null, sources: [], events: [] }`.
Each event has `id`, `title`, `startAt` and `endAt` (ISO with explicit offset),
`cost: { label, isFree }`, `source: { id, name, url }`, `curation` (GeoJSON Feature),
and optional `description`, `imageUrl`. Curation properties include `name`,
`layerType: poi|segment|area`, optional `category`, `metadata: { address, ... }`.
Point / LineString / Polygon map to existing Swift Curation and GeoJSONParser.
Routes and areas retain full geometry; no centroid-only fallback. Coordinates
are [longitude, latitude]. Validate geometry/type consistency and closed polygons.
This feed can be consumed by iOS later without coupling the two UI implementations.

## Sources and refresh

The owner vets sources; a repository-owned JavaScript registry contains candidates
SF Rec & Parks, SFPL, Funcheap, SF Chronicle. Candidates start disabled. Only
explicitly enabled sources are fetched. Quality over quantity: bounded collection,
source attribution, explicit times, actual geometry, no guessing free admission,
no fabricated geocoding. Incomplete or cancelled events are excluded. Allow manual
curation for trusted listings and geometry where feeds cannot provide it. Keep
source listing URLs and adapters configurable in code. Record per-source results.
Daily GitHub Actions refresh (manual dispatch too); changing cron permits weekly.
Only validated data replaces a previous good snapshot. Preserve previous source
entries on source failure with original freshness dates; never mark failed data
fresh. Expired events are hidden even if refresh fails. No enabled sources is an
intentional setup state, not permission to fetch everything.

## Deployment and scope

Static Astro output, Cloudflare static assets/Workers config and clear commands.
Owner deploys; no Cloudflare account changes in this task. No Python dependencies.
No login, payments, newsletter, database, or moderation dashboard in v1.
MapLibre web renderer with light map style. Map load failure preserves usable list.
Automated tests cover SF date boundaries, filters, source gate, validation/dedupe,
and failure preservation; production build plus desktop/mobile browser verification.
