# MapSF Today

An Astro companion to the MapSF iOS app: today's San Francisco events on a map
and in a list, with places, routes, and areas. It builds to a static site for
Cloudflare. All application and collection code is JavaScript; no Python required.

## Run locally

Requires Node.js 22.12 or later (the repository pins 22.23.2).

```sh
cd website
npm ci
npm run dev
```

Open the URL printed by Astro. Verify and build with:

```sh
npm test
npm run build
npm run preview
```

Browser checks use test-only fixtures (never public event data):

```sh
npx playwright install chromium
npm run test:browser
```

## Choose the sources

Edit [config/sources.mjs](config/sources.mjs). SF Rec & Parks, SFPL, Funcheap, and
SF Chronicle are candidates, **disabled until you vet and enable them**. Review
collection URLs and adapter settings as well as the publisher: an editorial
homepage or RSS publication timestamp is not necessarily an event date.

Only enabled sources are collected. Incomplete or cancelled listings are excluded.
Collection preserves source attribution and explicit time ranges. Unknown cost
appears as “Cost not listed”; it never silently becomes free. Missing coordinates,
route paths, or area boundaries need source-provided geometry or your manual
curation, not an invented location. A new source's adapter needs a validated
fixture before enabling it; the candidate registry does not imply complete site
coverage or a universal scraper.

The refresh also applies the configurable `publicationBounds` in
[config/sources.mjs](config/sources.mjs). This rectangle matches the useful map
area (`west -122.53, south 37.70, east -122.348, north 37.835`); it is not a
precise legal boundary for the City and County of San Francisco. Points must be
inside it. Routes and areas are included when their full geometry intersects it,
including paths that cross the rectangle and polygons that enclose it. The feed
retains the original full route or area instead of clipping it. The same gate
applies to collected, manually curated, and failure-preserved events.

Run a refresh after editing the registry or manual events:

```sh
npm run refresh
npm test
npm run build
```

With no enabled sources and no approved content, the public feed stays empty.
This is intentional. There are no made-up listings disguised as today's events.

## Manual curation and shared geometry

[data/manual-events.json](data/manual-events.json) contains `events` and
`overrides`. Overrides use an event's stable `id` and replace fields such as a
verified cost or complete `curation` feature. Manual entries still reference an
enabled registry source; source approval is not bypassed by manual entry.

The public `/events.json` feed has `schemaVersion`, `generatedAt`, per-source
freshness/status, and `events`. Each event has an `id`, `title`, explicit-offset
`startAt` and `endAt`, `cost: { label, isFree }`, `source: { id, name, url }`, and
`curation`. Optional descriptions and image URLs can accompany a listing.

`curation` uses the GeoJSON convention already read by the iOS `GeoJSONParser`:

| Visitor label | `properties.layerType` | Geometry | iOS model |
| --- | --- | --- | --- |
| Place | `poi` | `Point` | `POIData` |
| Route | `segment` | `LineString` | `SegmentData` |
| Area | `area` | `Polygon` | `AreaData` |

Feature properties include `name` and optional `category` and string-valued
`metadata` (including an address). Coordinates use `[longitude, latitude]`.
Polygon exterior rings must close. Event timing and source data live alongside
geometry so the iOS app can consume the same feed later. Full route and area
geometry is rendered and used when fitting the map to an event.

## Daily updates

[Refresh SF events](../.github/workflows/refresh-events.yml) runs daily at 13:17 UTC
(05:17 PDT / 06:17 PST) and supports manual dispatch on `main`. To refresh weekly,
change the cron to `17 13 * * 1`. GitHub schedules run from the default branch,
can be delayed, and can be disabled after inactivity in public repositories.
See [GitHub's schedule documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

The workflow validates and builds before committing only `website/public/events.json`
to `main`. Repository rules must permit the workflow's content write; otherwise
use the manual refresh command and commit through your normal review process.
A failed source keeps its previous validated events and original successful-refresh
timestamp. The interface uses San Francisco's current date, not the build date,
and does not show previous-day events as today's listings when a job fails.
Per-source `cancelledInstances` metadata keeps an unexpired cancelled
`id`/start/end instance suppressed through later source failures. If a
cancellation omits its dates, the collector uses a matching validated previous or
manual event's dates. Entries expire at their event end time, so a recurring event
can reuse the same source ID.

Connect Cloudflare's Git integration to `main` and include `website/**` in its
build watch paths so refreshed data is deployed. A local refresh alone does not
update the public site: its data must be committed and deployed. No Cloudflare
credentials are needed by the collection job with that setup.

## Deploy on Cloudflare

Cloudflare recommends Workers for new projects; this project uses Workers static
assets with no server runtime or database. See the
[Cloudflare static assets guide](https://developers.cloudflare.com/workers/static-assets/get-started/)
and [Astro Cloudflare guide](https://docs.astro.build/en/guides/deploy/cloudflare/).

In Cloudflare Workers & Pages, connect this repository and configure:

| Setting | Value |
| --- | --- |
| Root directory | `website` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Production branch | `main` |
| Node version | `22.23.2` |

`wrangler.jsonc` points to `dist/`. Set its `name` to your chosen Cloudflare Worker
name before deploying. For a manual deployment, authenticate with Cloudflare and
run from `website/`:

```sh
npm ci
npm run build
npx wrangler deploy
```

If you already use Cloudflare Pages, use the same root and build command with
`dist` as the output directory. This static Astro build needs no Cloudflare
adapter. The repository contains deployment configuration; it does not create
an account, public deployment, or custom domain on your behalf.
