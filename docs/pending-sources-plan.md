# Pending source integration

Work from merged main on feat/pending-event-sources. Start with Civic Joy Fund,
then assess the other approved pending sources independently.

- Collect Civic Joy Fund's public Google Calendar ICS, discovered from the live
  Elfsight widget's active calendar configuration. Do not read widget demo events.
- Expand recurring events, exceptions, exclusions, and timezone transitions using
  JavaScript iCalendar parsing within the rolling 30-day window and strict limits.
- Use linked organizer data for verified venue coordinates. Preserve explicit
  street extents as routes with reviewed, date-scoped geometry; never infer a
  street festival's footprint from a single intersection. Publish a verified
  intersection or venue point when a full extent is unavailable.
- Test incomplete feeds, recurrence changes, cancellation, missing geometry, and
  collection caps before enabling. Retain source attribution and prior data on
  failure. Add public calendar subscription and collection methodology notes.
- Integrate other sources only where current schedules and geometry can be
  verified. Record specific blockers and evidence for the remainder.
- Validate live output, existing unit/browser suites, and submit a new PR.
