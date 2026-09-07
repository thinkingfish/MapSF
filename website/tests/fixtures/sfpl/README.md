Actual publisher markup retrieved 2026-09-06 using curl. listing.html contains verbatim selected branch-marker and event-link excerpts from https://sfpl.org/events; detail.html contains a verbatim event-article excerpt from https://sfpl.org/events/2026/09/08/tutorial-meet-one-one-financial-counselor; calendar.ics is the full https://sfpl.org/sfpl-events/add-to-calendar/162171 response. Tests mutate these fixtures explicitly to exercise missing/cancelled cases. The published date display lacks AM/PM; calendar UTC times are authoritative. Coordinates are dynamically joined by the publisher's branch URL, never geocoded or guessed.

cancelled-title.html is the verbatim h1 excerpt retrieved 2026-09-06 from https://sfpl.org/events/2026/09/06/social-afternoon-board-games. It demonstrates the publisher's actual "Canceled:" title convention, independently of ICS STATUS.

Live verification on 2026-09-07 UTC also confirmed calendar URL node ID → UID correspondence for `/sfpl-events/add-to-calendar/106394` → `106394@sfpl.org` (https://sfpl.org/events/2026/09/07/storytime-toddlers) and `/sfpl-events/add-to-calendar/112116` → `112116@sfpl.org` (https://sfpl.org/events/2026/09/07/storytime-babies). Together with saved calendar.ics this supports stable title-cancellation tombstones even without remaining dates or geometry. An event with neither a calendar link nor UID cannot safely produce the matching tombstone.

The listing's `date-end-after` parameter uses the exact current San Francisco wall time, following the publisher's observed query format (`2026-09-06 17:19:19`); midnight would allow already-ended events to exhaust the bounded detail budget.

free-policy.html is a verbatim line excerpt from the same 2026-09-06 https://sfpl.org/events download. Only presence of its explicit “All programs and events are free and open to the public.” statement permits free pricing in collected records.

HTML fixture line endings and trailing whitespace are normalized for version control.
