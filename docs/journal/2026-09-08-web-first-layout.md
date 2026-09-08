---
status: open
opened: 2026-09-08
updated: 2026-09-08
---

# Web-first repository layout

## Goal

Make the Astro website the primary project at repository root and archive the existing iOS app under `iOS/`, as requested by the owner after merging the shared tile implementation.

## Evidence

The migration starts from `02179f9` on `main`. The website previously lived in `website/`; its package, workflows, tile scripts and deployment instructions depended on that location. Xcode references use paths relative to the project, so moving `MapSF.xcodeproj` and `MapSF/` together preserves them. Shared map inputs already live in `maps/basemap/` and remain there.

## Implementation and decisions

- Root now contains the Astro package, source, configuration, public assets, collectors and tests.
- `iOS/` contains the Xcode project, Swift source/resources, cover asset, README, architecture diagrams/generator and original iOS design notes.
- Shared tile profiles, source snapshot, iOS tile bytes and public URLs remain the same. The iOS export path is centralized in `scripts/tiles/paths.mjs`.
- Event/tile schedules run from root. Archived iOS architecture checks follow their new path.
- Production and preview Cloudflare settings must use repository root and commands without `--dir website`. This is an account setting change, not a claim of deployment.
- Historical planning records retain their context; current operator documentation uses current paths.

## Outcome

Root installation uses Node 24.20.0. All 136 unit tests, 34 browser tests, the production build and both archived architecture checks passed. All 44 app/project files match their pre-migration bytes. Tile adoption in a disposable copy, launched from an unrelated working directory, wrote only the new root/archive paths and preserved source/iOS checksums. Local Wrangler returned HTTP 200 for the app, sources, event feed, Markdown agent entry point and cached protobuf tiles. The change is not yet merged or deployed.

## Next steps

Independent review found no material findings. Open the PR and set Cloudflare production/preview root and commands before merging. Native app compilation remains a macOS/Xcode check if development resumes.

## Skills used

The existing planning/verification workflow and locally adopted engineering-journal skill guided this migration. Documentation work runs independently alongside path and build validation.
