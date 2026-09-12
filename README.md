# MapSF Today

MapSF is a web-first guide to today's San Francisco events on a map and in a
list, with places, routes, and areas. The Astro application lives at the repository
root and builds to a static site for Cloudflare. All web application and collection
code is JavaScript; no Python required.

The original native app is archived in [iOS/](iOS/README.md), with its Xcode project,
Swift source, bundled resources, and architecture notes preserved. Shared basemap
inputs remain in `maps/`; the tile pipeline continues to export its smaller offline
iOS subset alongside web tiles.

Historical specifications and plans under `docs/superpowers/` retain their original
layout references: former `website/` paths now refer to the repository root.

## Run locally

Requires Node.js 24.20.0 or later and pnpm 12.3.4.
The project pins Node.js 24.20.0 through `devEngines.runtime`; pnpm downloads
and uses this runtime for local scripts, including builds, tests, and refreshes.
The `.node-version` file keeps CI and Cloudflare builds on the same version.
The `packageManager` field pins pnpm for this project. If pnpm is not installed,
bootstrap it once with `npm install --global pnpm@12.3.4`.

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

Open the URL printed by Astro. Verify and build with:

```sh
pnpm test
pnpm run build
pnpm run preview
```

Browser checks use test-only fixtures (never public event data):

```sh
pnpm exec playwright install chromium
pnpm run test:browser
```

## Choose the sources

Record your decisions in the [source review checklist](SOURCE-REVIEW.md).
Its approval boxes do not automatically enable collection.

The sources in [config/sources.mjs](config/sources.mjs) have your recorded
approval. Collection requires both `approved: true` and `enabled: true`.
The integration status is documented in [SOURCE-STATUS.md](SOURCE-STATUS.md).

SFPL, SF Rec & Parks, Mission Local, the Chronicle, and Civic Joy Fund have verified publisher
collectors. Mission Science Workshop has a curated Mission-site community-day
schedule. SF Shakes and From the E collect verified individual occurrences. KQED is retained only as [internal discovery research](docs/journal/2026-09-11-kqed-source.md), not collected or exposed on the website. Sunday Streets awaits current occurrence hours and locations. Other sources await complete extraction or verified venue geometry. Approval and working collection are separate states.

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
pnpm run refresh
pnpm test
pnpm run build
```

The committed snapshot contains real collected listings. Refresh it before deployment
and let the scheduled workflow keep it current. Test fixtures never become fallback
public content. Fetched listings link to publisher pages without copying article
bodies; optional descriptions can be supplied through manual curation.

## Manual curation and shared geometry

[data/manual-events.json](data/manual-events.json) contains `events` and
`overrides`. Overrides use an event's stable `id` and replace fields such as a
verified cost or complete `curation` feature. Manual entries still reference an
enabled registry source; source approval is not bypassed by manual entry.

The public `/events.json` feed has `schemaVersion`, `generatedAt`, per-source
freshness/status, `coverage: { dates: ["YYYY-MM-DD", ...] }`, and `events`. Each event has an `id`, `title`, explicit-offset
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
Polygon exterior rings must close. Website events also support `area` / `MultiPolygon` for disconnected grounds; each component follows the same ring rules. The iOS mapping above remains Polygon-only. Event timing and source data live alongside
geometry so the iOS app can consume the same feed later. Full route and area
geometry is rendered and used when fitting the map to an event.

## Calendar date coverage

The calendar enables only dates explicitly present in the feed's `coverage.dates`.
A covered date means an approved, enabled publisher was checked for that date;
it does not promise a complete inventory of every event in San Francisco.
A covered date can have no matching events. Gaps between checked dates stay
unavailable, and recurring place schedules do not extend event-feed coverage.

Each enabled source records `coverage: { dates, checkedAt }` only after completing
the entire 30-day query. SFPL and Rec & Parks check dated calendar views; Mission
Local uses its public date-range API. Civic Joy Fund expands its public iCalendar
feed, with recurrence exceptions and linked organizer venue verification. Pagination, response date scope, empty
results, and request guards are verified before enabling the window.
Coverage is established before cost, cancellation, or geometry filtering. A
successfully checked date stays available even when its listings are empty or
none qualify for publication. Incomplete pagination, exhausted request budgets,
unexpected response dates, or unknown listing schemas fail the collection and
cannot establish a fresh 30-day window.

Offset timestamps are converted to Pacific dates, including overnight spans with
an exclusive ending instant. Invalid dates are ignored; coverage is bounded to
30 Pacific calendar dates starting today (today through today + 29), and spans
longer than 366 days are not expanded. Published events must overlap this window.
SFPL and Rec & Parks skip detail requests clearly beyond it based on listing dates.
A collection failure adds no coverage and retains useful prior dates with their
original `checkedAt`. A completed publisher check keeps fresh coverage even when
all records fail publication validation; existing event fallback and error status
are retained. Disabled or unapproved sources contribute nothing. Past
dates are removed because snapshots prune ended events; legacy snapshots without
coverage remain unknown. A successful refresh replaces that source's prior dates.
Manual events and overrides do not prove an automated publisher check and cannot
extend coverage; their source authorization and validation still apply.

## Daily updates

[Refresh SF events](.github/workflows/refresh-events.yml) runs daily at 13:17 UTC
(05:17 PDT / 06:17 PST) and supports manual dispatch on `main`. To refresh weekly,
change the cron to `17 13 * * 1`. GitHub schedules run from the default branch,
can be delayed, and can be disabled after inactivity in public repositories.
See [GitHub's schedule documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

The workflow validates and builds before committing only `public/events.json`
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

Connect Cloudflare's Git integration to `main` and watch repository-root web
files, including `public/events.json`, so refreshed data is deployed. Remove any
old `website/**`-only watch rule; watching all paths is the simplest setup.
A local refresh alone does not update the public site: its data must be committed and deployed. No Cloudflare
credentials are needed by the collection job with that setup.

## Deploy on Cloudflare

Cloudflare recommends Workers for new projects; this project uses Workers static
assets with no server runtime or database. See the
[Cloudflare static assets guide](https://developers.cloudflare.com/workers/static-assets/get-started/)
and [Astro Cloudflare guide](https://docs.astro.build/en/guides/deploy/cloudflare/).

In Cloudflare Workers & Pages, connect this repository and configure:

| Setting | Value |
| --- | --- |
| Root directory | `/` (repository root; the dashboard may show this as blank) |
| Build command | `pnpm run build` |
| Deploy command | `pnpm exec wrangler deploy` |
| Non-production deploy command | `pnpm exec wrangler versions upload` |
| Production branch | `main` |
| Node version | `24.20.0` |
| Build environment variable | `PNPM_VERSION=12.3.4` |

For an existing deployment, update **both production and preview build settings**
before relying on this layout. Change the old `website` root to repository root,
remove `--dir website` from build/deploy commands, and update any `website/**`
watch rules. Repository changes do not update saved Cloudflare dashboard settings;
changing them requires authenticated account access.

Commit only `pnpm-lock.yaml` as the dependency lockfile. CI uses
`pnpm install --frozen-lockfile`; `pnpm-workspace.yaml` records the native build
scripts required by the toolchain. The optional macOS `fsevents` rebuild is skipped
to avoid introducing a Python/node-gyp prerequisite.

`wrangler.jsonc` points to `dist/`. Set its `name` to your chosen Cloudflare Worker
name before deploying. For a manual deployment, authenticate with Cloudflare and
run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm exec wrangler deploy
```

If you already use Cloudflare Pages, use the same root and build command with
`dist` as the output directory. This static Astro build needs no Cloudflare
adapter. The repository contains deployment configuration; it does not create
an account, public deployment, or custom domain on your behalf.

## Recurring places

Verified garden admission schedules live in `config/places.mjs`; museums have their own `config/museums.mjs` catalog and [museum review list](MUSEUM-REVIEW.md). See [PLACES.md](PLACES.md) for eligibility, seasonal hours, closures, and review expiry. These cards follow one-off events and remain available when the event feed fails. Resident-only admission and ended entry windows are explicitly labeled.

The initial catalog includes the Botanical Garden, Japanese Tea Garden, Conservatory of Flowers, and Asian Art Museum first Sundays. The date controls, multi-select Event sources menu, and Free only checkbox narrow the listings. Event sources applies only to Events; Free Places uses separate schedule providers. The menu lists all publishers in the event snapshot, including those with no events on the selected day. All are checked initially; unchecking sources excludes them across date changes, and unchecking every source hides all Events while preserving Free Places. Events and Free Places are matching accordion sections, with only one open at a time. Panning or zooming automatically filters the list to the current map view, including intersecting routes and areas. Selecting a marker or event opens details without moving the camera; the city-reset control restores the SF view.

## Sources and map tiles

The public `/sources/` page describes all approved event publishers, planned integrations, official recurring admission sources, and collection methodology. Its footer links come from the same registry and venue catalogs as the site.

The web basemap serves its own Protomaps vector tiles and Noto Sans glyphs as Cloudflare static assets. Normal builds prepare them from checksum-verified inputs committed in `maps/basemap/`, without downloading map data. Browser tests render these real local assets and block external requests. The same regional archive supplies the smaller, offline iOS MBTiles bundle. See [TILES.md](TILES.md) for profiles, refresh/review commands, caching, and deployment.

Venue-based price defaults live in `config/free-event-venues.mjs` and the reviewed city-park inventory in `config/city-park-names.mjs`. They cover SFPL branches, outdoor city parks, named Golden Gate Park meadows, and public street celebrations. They fill missing event prices and retain inference metadata; an explicit publisher price wins. These venues do not create recurring destination cards.

## Agent mode

`/agent/index.md` is a plain-text entry point for agents and readers who do not
want to run JavaScript. The site footer links it, HTML pages advertise it with an
alternate link, and `/llms.txt` provides discovery instructions.

Every Astro build generates 30 dated Markdown documents at
`/agent/YYYY-MM-DD.md`, plus matching JSON at `/agent/YYYY-MM-DD.json` and
`/agent/sources.md`. The documents reuse event validation, deduplication,
venue-price hints, coverage, and curated Free Places schedules. They require no
server runtime or extra collection job; successful event refresh deployments
regenerate them along with the site.

Dates are San Francisco calendar dates. These exports cover the entire day,
including ended events, and do not apply the interactive site's source, price,
or map-viewport filters. Agents should compare event end times with the current
time. Dated paths deliberately avoid a build-time `/today` alias that could become
misleading after midnight or a failed deployment. Missing dates and unchecked
dates are not evidence that no events exist. Each file records both its build
time and the event feed generation time, source collection status, and coverage.

Daily JSON uses `schemaVersion: 1`, `date`, `timeZone`, `builtAt`, `generatedAt`,
`coverage` (`checked` or `not checked`), `freshness`, `fullDay`, `sources`, `events`,
and `freePlaces`. Both listing arrays use the existing event/curation schema,
including complete GeoJSON Point, LineString, Polygon, and MultiPolygon geometry. Free Places
retain eligibility, admission notes, and review validity; the browser-only
`entryEnded` flag is omitted because it would become stale. `cost.isFree` is not
a claim that every visitor qualifies: preserve eligibility and inferred-price
metadata. The original `/events.json` remains an event-only snapshot.

Publisher text is escaped in Markdown and descriptions are quoted as source
content. Cloudflare `_headers` serves Markdown as UTF-8 plain text with a
five-minute cache policy. Unit tests cover date/coverage semantics, admission
conditions, freshness, escaping, and geometry; HTTP tests read the built content
without a browser or JavaScript.

The front-page source dropdown is an explicit allowlist (`showInSourceFilter` in
`config/sources.mjs`) for broad calendars: SFPL, Rec & Parks, Mission Local, SF
Chronicle, and Civic Joy Fund. Individual venues, event series, and newly added
sources do not appear automatically. Their events retain attribution and stay
included when calendar sources are deselected; date, map, and price filters still
apply.

### Farmers markets

The 14 reviewed SF farmers markets in [config/farmers-markets.mjs](config/farmers-markets.mjs) appear under Events. The daily refresh checks their official schedule pages and expands the next 30 days, respecting seasonal ends, known exclusions and review expiry. They use points, routes or areas according to verified location evidence; individual markets do not add source-filter choices. Entry is free, but purchases cost extra. See the [market research and maintenance record](docs/journal/2026-09-11-farmers-markets.md) before changing schedules or extending them beyond 2026.

Annual festivities are tracked in [config/festivities.mjs](config/festivities.mjs). Only explicit, reviewed occurrences enter the next 30 days; annual dates are never guessed. Ready organizers are checked during the daily refresh, while incomplete editions stay internal. See the [festivities research record](docs/journal/2026-09-11-sf-festivities.md) for Pride, Carnaval, Bay to Breakers, Folsom and other editions, coordinate evidence and remaining review gaps. Individual festivities do not appear in the broad-source filter.
