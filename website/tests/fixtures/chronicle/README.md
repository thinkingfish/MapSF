# Chronicle public calendar fixture

`event.json` is a factual-field reduction of the first event returned on
2026-09-06 by:

https://discovery.evvnt.com/api/events?publisher_id=6745&fromDate=2026-09-06&toDate=2026-10-05&multipleEventInstances=true&hitsPerPage=30&page=0

The Chronicle page embeds the Evvnt calendar with publisher ID 6745:
https://www.sfchronicle.com/entertainment/events/

Descriptions, images, organizer contact details, and unrelated indexing fields
were removed. This is a test input only, never a public-feed fallback.
See `docs/pending-calendar-source-review.md` for live pagination evidence and
the single-page-per-day safeguard required by the adapter.
