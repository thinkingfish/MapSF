---
status: open
opened: 2026-09-11
updated: 2026-09-11
---

# Time-of-day filter

## Goal

Add Morning, Afternoon, and Evening filtering with noon and 6pm cutoffs. An event spanning a cutoff belongs to every period it overlaps.

## Evidence

PR #15 was merged before this branch was created from main. Events and scheduled Free Places already carry explicit start/end timestamps. The existing render pipeline first chooses the SF calendar day and removes ended events on today.

## Implementation and decisions

- A native Time selector defaults to Any time. It wraps below Area on narrow screens.
- Use San Francisco local time regardless of the visitor's timezone. Morning is midnight–noon, Afternoon noon–6pm, Evening 6pm–midnight. End times are exclusive: ending exactly at noon does not match Afternoon.
- Clip overnight and multiday intervals to the selected day. DST clock changes occur within Morning and do not move the noon/6pm cutoffs.
- Filter both map features and list entries, including scheduled Free Places' opening hours. Compose with source, free-only, area, and viewport filters. Source selection still affects Events only.
- Clear filters restores Any time. Date changes and city map reset preserve the time choice. Ended events today remain excluded.
- No dependencies or iOS changes.

## Outcome

Local validation passed: 173 unit tests, production build, and 44 browser tests, including Morning/Afternoon/Evening selection and reset at 390px and 1280px with the browser timezone set to Asia/Tokyo. Independent review found no actionable defects. No deployment is claimed.

## Next steps

Review and merge the PR against main.

## Skills used

Superpowers verification and code review; local engineering-journal skill.
