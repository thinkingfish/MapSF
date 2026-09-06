# Architecture diagram maintenance

The current `architecture-diagram` tool guided this redesign. The two generated
artifacts separate source structure from runtime behavior:

- `architecture.svg`: the single Xcode target, its Swift source groups, imported
  frameworks, and bundled content.
- `architecture-runtime.svg`: selected album loading, selection, and basemap flows.

The README embeds both with adjacent textual equivalents. The old hand-maintained
D2 diagram is superseded by `scripts/generate-architecture.py`; edit the generator,
not the SVG output. Run `python3 scripts/generate-architecture.py` to regenerate
both, or add `--check` to fail on stale output. CI runs the latter on pushes and PRs.

## Ground truth and limitations

The generator reads the actual PBXNativeTarget, synchronized groups, explicit
source phase, and package product membership from the OpenStep Xcode project.
It checks that discovered Swift files match target membership and appear in a
classified source group. File names come from that inventory. New groups, imports,
package products, target changes, or synchronized group exceptions fail loudly.
New files in an existing role appear automatically; oversized labels or groups
fail geometry checks and require a layout adjustment.

Runtime claims are checked with positive and negative source assertions, including
native MBTiles loading, cache writes, selection callbacks, environment injection,
one-shot location requests, unused PMTiles wiring, and the unconsumed query result.
These are targeted drift checks, not a Swift compiler or a proof of behavior.
Semantic changes that preserve the asserted strings still need reviewer attention.
The diagrams do not claim to model MapLibre's internal scheduler or every UI event.

## Charter: deviations from tool defaults

- This is a source composition view, not a package dependency graph. MapSF has one
  target; its folders are not modules. Alphabetical lists avoid implying a
  topological order. No thread model or thread swimlanes are inferred from SDK code.
- Python's standard library emits deterministic SVG directly. This is a small
  documentation-tool dependency, chosen because Swift/Xcode are unavailable on the
  Linux documentation runner. There is no renderer installation required to
  regenerate or check. The generator reads the checked-in build manifest instead
  of querying `xcodebuild`; it does not replace a macOS build validation.
- Runtime panels show three scoped flows, not an exhaustive process graph. Colors
  identify each box's role; literal Swift owner names bridge the two artifacts
  instead of separate module chips. SDK frameworks remain grouped in the structure
  view, while the runtime view identifies MapLibre's rendering role.
- The temporary style file and curation caches are separate storage nodes. The
  cover cache and location path are described in adjacent prose, outside the
  selected flows. The style's remote glyph declaration is documented, but is not
  drawn as an active network request because the current style has no symbol layers.
- Arrow direction means data/state propagation. Captions describe the transferred
  content and consumers; uniform short arrows carry no inline labels. Section
  numbers identify independent paths, not a total execution sequence.
- Automated checks cover SVG validity, deterministic freshness, box containment,
  sibling separation, centered multiline labels, connector alignment, and
  conservative text/connector collision bounds. Text estimates are not actual font
  metrics; rendered review remains necessary.

## Visual review

The repository owner is the visual reviewer. Inspect both SVGs at README size and
full size whenever changing the generator. Approval applies to that revision only.
The initial redesign was rasterized with CairoSVG and visually inspected by the
agent; the repository owner has also opened both SVGs for inspection. CairoSVG
is optional preview software, not a regeneration or CI dependency.
