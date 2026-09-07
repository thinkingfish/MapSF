# Daily place suggestions and readability

User requests: larger main text, slightly darker gray text, remove map-type filter
buttons without redesigning filters; offer scheduled free museum days and
resident-free gardens after one-off events; curate museums separately; add Civic
Joy Fund events to the publisher list.

- Typography and map-type button removal: implemented; existing four browser checks pass.
- Recurring catalog/engine: separate garden and museum registries, official sources,
  explicit entry hours and eligibility, date rules in Pacific time, closure exceptions.
  Emit one GeoJSON-compatible place card per venue/day after one-offs; indicate
  when entry has ended today. Preserve all point/route/area rendering.
- Museum review document: a separate curation list with source evidence and pending
  candidates. No invented recurring free-day rules.
- Civic Joy Fund: inspect its provided event page, record in source registry and
  review artifact, enable only if extraction can meet current validation.
- UI: label the recurring section, keep it useful when feed is empty/unavailable,
  distinguish event and place counts, show admission conditions without a filter redesign.
- Verification: date/eligibility/closure tests, desktop/mobile production browser
  checks including order and empty feed, visual inspection, PR update.

Completed: separate museum and garden catalogs; recurring cards after one-offs; explicit eligibility and last entry; Civic Joy Fund approved but pending adapter; larger/darker type; search and geometry controls removed. Verified 56 unit tests, 6 production browser tests, mobile screenshot, architecture freshness, and diff whitespace. Review-found feed retry regression fixed and covered.
