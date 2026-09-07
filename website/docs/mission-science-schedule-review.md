# Mission Science Workshop schedule review

Reviewed 2026-09-06. The approved source is `mission-science-workshop`.

## Published Mission community days

[Visit](https://www.missionscienceworkshop.org/visit) and [Programs](https://www.missionscienceworkshop.org/programs) publish free public drop-in programs separately from booked school visits and enrolled after-school programs. The [current flyer](https://static.wixstatic.com/media/77a8ed_b6a21b2088bf40929015b4e3d698fe9b~mv2.jpg), linked from the homepage, Visit and Programs pages with the filename `Open Days SY 26-27 EN (2).jpg`, gives actual dates. The image was downloaded and visually inspected; do not rely on older search snippets that still show the 2025–26 flyer.

The Mission column lists September 12, October 10, November 14, December 12, January 9, February 13, March 13, April 10, May 8 and June 12, all 10 AM–3 PM. Years are interpreted from the operator's 2026–27 school-year filename and the weekday alignment: September–December 2026, January–June 2027. The catalog encodes only those dates and expires after June 12, 2027. It cannot repeat dates into another school year. No holiday or summer sessions are inferred.

The operator gives the address as 3750 18th Street and directs visitors to Church Street between 17th and 18th Streets. [Apple's Mission Science Workshop place](https://maps.apple.com/place?place-id=I558D35E4FECB1CD9) identifies that address, the operator website and phone, and provides `place:location:longitude=-122.4271766` and `place:location:latitude=37.7617582`. These are a verified venue point, not a surveyed entrance or an invented footprint.

## Excluded programs and remaining evidence

- Bayview's flyer column lists October 3, November 7, December 5, February 6, March 6 and May 1. Do not generate September, January, April or June dates merely from the first-Saturday prose. Address: 50 Pomona Street, inside Charles Drew Elementary. A verified workshop point is still needed; the school address alone does not establish coordinates or a workshop entrance.
- Excelsior's flyer column lists August 15, September 19, **October 18 (Sunday Street!)**, November 21, December 19, January 16, February 20, March 20, April 17, May 15 and June 19. October 17 is not a published session. Address: 4458 Mission Street. Authoritative venue coordinates remain unverified, so no Excelsior cards are generated.
- The flyer and Programs page give Tinker Tuesdays at Excelsior as **3–5:30 PM**, excluding winter and spring breaks. Programs also limits Tuesdays to the school year. Do not use 5 PM or generate every Tuesday year-round. Exact school-year and break boundaries applicable to this operator remain to be verified, as do its coordinates.
- Booked field trips, enrolled after-school programs, and mobile programs are not public drop-in sessions.

Review the live operator flyer and announcements before extending the catalog. The dates are a published planning schedule, not a live opening guarantee. No school calendar has been silently substituted for operator-specific holiday confirmation.

## Integration

`config/science-workshops.mjs` exports `scienceWorkshops` in the existing recurring places schema. Add it to the default `configuredPlaces` array in `src/lib/places.mjs`. This curated schedule is independent of feed ingestion: the source's feed adapter should stay disabled unless a separately verified ingestion path exists. Run `node --test website/tests/science-workshops.test.mjs` from the repository root.
