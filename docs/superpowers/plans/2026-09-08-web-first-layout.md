# Web-first repository layout

Implement the owner's decision to archive the iOS app in `iOS/` and promote the Astro website to the repository root. Preserve application/data behavior and existing tile profiles.

- [x] Move Xcode source/project, iOS cover, architecture diagrams/generator and iOS design history together into `iOS/`. Retain project-relative references so the project remains openable.
- [x] Promote website source/config/public/data/tests/package files and merge its scripts/docs with root directories. Merge ignore rules; preserve local untracked skill files.
- [x] Repoint shared tile preparation/adoption, output validation and iOS consistency tests to root web paths and `iOS/MapSF/Resources/BaseMap/`. Keep shared inputs in `maps/` and existing manifest hashes unchanged.
- [x] Update Node/pnpm/CI workflow paths, scheduled event/tile refreshes, archived architecture checks and operational documentation. Root README presents the web app first and links the archive. Explain Cloudflare's root-directory and command migration for production and previews.
- [x] Verify frozen dependency install, unit/browser tests, root build, archived architecture generator, local Cloudflare serving, and tile adoption in a disposable copy. Check path references and byte-preserving archive moves. Review and open a PR.

Cloudflare account settings cannot be changed without authenticated access; repository changes and exact replacement settings will be ready for the owner before merging.
