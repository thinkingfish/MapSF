# Civic Joy Fund fixture

`valencia.ics` retains factual event and recurrence fields from Civic Joy Fund's
public Google Calendar, fetched September 6, 2026. Its calendar identity was read
from the active Google Calendar integration in the public Elfsight widget on
https://civicjoyfund.org/events. Inactive widget demo records are not collected.
The fixture excludes unrelated events, images, and article text. The retained
short description links the event organizer.

The organizer-linked Mobilize API supplies verified cleanup meeting coordinates;
fixture tests use reduced synthetic records matching that schema. The collector
requests its public organization feed rather than each event separately.

Valencia's date-specific street geometry is reviewed in
`docs/valencia-live-route-review.md`. Other festivals with verified locations publish as points, even without verified
extents. Calendar intersection pins do not define the full festival area.
