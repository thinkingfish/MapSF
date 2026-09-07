These are small, verbatim HTML excerpts retrieved on 2026-09-06 from the publisher:

- `listing.html`: https://sfrecpark.org/Calendar.aspx — eventTitle_10445 through its More Details link.
- `detail.html`: https://sfrecpark.org/Calendar.aspx?EID=10445 — Event microdata body with local start time, visible time range, facility link, address and price.
- `facility.html`: https://sfrecpark.org/Facilities/Facility/Details/Golden-Gate-Bandshell-436 — hdn_MapSearchResults input; publisher facility ID 436 and its latitude/longitude.

The adapter accepts the coordinate mapping only when the event detail links that exact official facility and names Golden Gate Bandshell. The generic hdn_LatitudeForMap=39.5 and hdn_LongitudeForMap=-98.35 values on facility pages are default map centers and are deliberately not used.

HTML fixture line endings and trailing whitespace are normalized for version control.

Full-window collection was probed on 2026-09-06. `?view=list&year=2026&month=10&day=5` returned exactly two October 5 listings; September 6 returned seven. `daily.html` preserves the October 5 form action, list-view marker and complete calendars container. `daily-empty.html` preserves those same markers from `?view=list&year=2027&month=1&day=5`, whose calendars container was empty. Only unrelated surrounding navigation and scripts are omitted. A startDate/endDate range query did not restrict the response to the expected days, so the adapter deliberately requests all 30 explicit daily lists. Live lists had no pagination; same-day next links are supported and unexpected pager markup fails closed. Full collection checks response dates, caches duplicate event details, rejects clearly named unsupported venues, and reports coverage only after completing each day. Request/event budget exhaustion and failed or unrecognized responses fail collection.
