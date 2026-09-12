# Event source review and approval

Use this checklist to record your decisions about the source candidates.
Change `[ ]` to `[x]` to check a box. Leave approval unchecked for a source you
want to defer or reject, and record that decision in its notes.

**Reviewer:** ______Yao______________
**Review date:** ______Sep 6, 2026______________

Favor reliable, useful SF listings over volume. For each source, inspect a few
actual upcoming event pages: are the location, event date/time, cost, and original
organizer or booking link clear? Note any sections or event categories you want
included or excluded. An article's publication date is not an event date.

## San Francisco Public Library

Registry ID: `sfpl`
[Browse events](https://sfpl.org/events)
Configured collection URL: `https://sfpl.org/events`

- [X] Reviewed sample event pages.
- [X] I approve SFPL as a source for MapSF Today.

Sample event links:

- Paste a sample link here.

Scope, exclusions, or reason to defer/reject:

> Add notes here.

## San Francisco Recreation and Parks

Registry ID: `sf-rec-park`
[Browse calendar](https://sfrecpark.org/Calendar.aspx)
Configured collection URL: `https://sfrecpark.org/Calendar.aspx`

- [X] Reviewed sample event pages.
- [X] I approve SF Rec & Parks as a source for MapSF Today.

Sample event links:

- Paste a sample link here.

Scope, exclusions, or reason to defer/reject:

> Add notes here.

## Funcheap

Registry ID: `funcheap`
[Browse website](https://sf.funcheap.com/) · [Configured feed](https://sf.funcheap.com/today/)
Configured collection URL: `https://sf.funcheap.com/today/`

Review SF eligibility and each event's actual price; the source name alone does
not establish that an event is free.

- [X] Reviewed sample event pages.
- [X] I approve Funcheap as a source for MapSF Today.

Sample event links:

- Paste a sample link here.

Scope, exclusions, or reason to defer/reject:

> Add notes here.

## San Francisco Chronicle

Registry ID: `sf-chronicle`
[Browse entertainment](https://www.sfchronicle.com/entertainment/events/)
Configured collection URL: `https://www.sfchronicle.com/entertainment/events/`

Identify the specific event listings or sections you want. The configured
entertainment landing page is a candidate starting point, not a verified event feed.

- [X] Reviewed sample event pages.
- [X] I approve SF Chronicle as a source for MapSF Today.

Sample event links

- Paste a sample link here.

Scope, exclusions, or reason to defer/reject:

> Add notes here.

## Mission Local

Registry ID: `mission-local`
[Browse event calendar](https://missionlocal.org/events/) · [About the newsroom](https://missionlocal.org/about/)
Configured collection URL: `https://missionlocal.org/events/`

Neighborhood news with a public event calendar. Review upcoming occurrences and
organizer links. The initial search snapshot contained older listings; direct live collection
subsequently confirmed current events with explicit times and coordinates.

- [X] Reviewed sample event pages.
- [X] I approve Mission Local as a source for MapSF Today.

Sample event links:

- Paste a current event link here.

Scope, exclusions, or reason to defer/reject:

> Add notes here.

## The Ingleside Light

Registry ID: `ingleside-light`
[Browse Things To Do](https://www.inglesidelight.com/tag/things-to-do/)
Configured collection URL: `https://www.inglesidelight.com/tag/things-to-do/`

Greater Ingleside coverage, with weekly event roundups. Extract each event's own
dates, venue, cost, and organizer link; a roundup is not a single event.

- [X] Reviewed sample event pages.
- [X] I approve The Ingleside Light as a source for MapSF Today.

Sample event links:

- [September 1–7, 2026 event roundup](https://www.inglesidelight.com/projeto-novo-sf-show-and-other-greater-ingleside-events-for-sept-1-7-2026/)

Scope, exclusions, or reason to defer/reject:

> Add notes here.

## Richmond Review / Sunset Beacon

Registry ID: `richmond-sunset-news`
[Browse neighborhood news](https://richmondsunsetnews.com/) · [Coverage and publisher](https://richmondsunsetnews.com/about/)
Configured collection URL: `https://richmondsunsetnews.com/`

Covers the Richmond and Sunset districts and nearby west-side neighborhoods.
This is a discovery candidate: the homepage mixes news, opinion, and other
articles. Choose specific community-event coverage before implementing collection;
a verified structured event feed has not been identified. Detail discovery stays
at zero until that scope is established.

- [X] Reviewed sample event pages.
- [X] I approve Richmond Review / Sunset Beacon as a source for MapSF Today.

Sample event links:

- Paste a community-event article or calendar link here.

Scope, exclusions, or reason to defer/reject:

> Add notes here.

## Marina Times

Registry ID: `marina-times`
[Browse calendar](https://www.marinatimes.com/category/calendar) · [Publisher website](https://www.marinatimes.com/)
Configured collection URL: `https://www.marinatimes.com/category/calendar`

Candidate for Marina and nearby northern-neighborhood events. The calendar
includes local music and street-festival listings, but the search snapshot
contained older entries. Verify current event dates and organizer details before
using it for today's feed. Detail discovery stays at zero pending that check.

- [ ] Reviewed sample event pages.
- [X] I approve Marina Times as a source for MapSF Today.

Approval recorded from Yao’s instruction in conversation.

Sample event links:

- Paste a current event link here.

Scope, exclusions, or reason to defer/reject:

> Add notes here.

## Civic Joy Fund

Registry ID: `civic-joy-fund`
[Browse events](https://civicjoyfund.org/events)
Configured collection URL: `https://civicjoyfund.org/events`

Community events across San Francisco. The provided page currently has no
JSON-LD Event records; verify the calendar data, dates, and geometry before enabling
collection.

- [X] Add Civic Joy Fund as a source, requested by Yao in conversation.
- [ ] Verify publisher-specific event extraction and source-provided locations.

Scope or curation notes:

> Add notes here.

## Mission Science Workshop

Registry ID: `mission-science-workshop`
[Official website](https://www.missionscienceworkshop.org/) · [Programs](https://www.missionscienceworkshop.org/programs)
Configured collection URL: `https://www.missionscienceworkshop.org/`

- [X] Add Mission Science Workshop as a source, requested by Yao in conversation.
- [ ] Verify current school-year drop-in dates, holiday exceptions, and venue geometry.

Scope: public community drop-in activities at its Mission, Excelsior, and Bayview
workshops. School/group bookings are not public drop-in events. Collection is
pending schedule and location verification.

## Applying your decisions

This document records your approval; checking a box does not start collection.
The operational source list remains [config/sources.mjs](config/sources.mjs),
where the reviewed sources have `approved: true`, reflecting your saved
decisions and your approval of Marina Times and addition of Civic Joy Fund and Mission Science Workshop in conversation.
SFPL, SF Rec & Parks, Mission Local, the Chronicle, and Civic Joy Fund have verified collectors.
Mission Science Workshop has a reviewed Mission-site schedule shown with recurring
places. Remaining integration details are tracked in SOURCE-STATUS.md.
See [source integration status](SOURCE-STATUS.md) for evidence and remaining work.

Approved sources need their extraction verified against sample event pages before
being enabled in that registry. Enabled collectors meet that requirement. A listing must retain its source link, explicit event times,
cost label, and verified point, route, or area geometry. Missing information can
be completed through [manual curation](data/manual-events.json).

Implementation follow-up for each approved source:

Your saved checkmarks below are preserved. Technical verification and remaining
work are tracked per publisher in [SOURCE-STATUS.md](SOURCE-STATUS.md).

- [X] Confirm the collection URL and implement or adjust its adapter using the approved sample pages.
- [X] Verify extraction with saved fixtures, including missing information and cancellations.
- [X] Apply approved scope/exclusions and enable only approved, verified sources in the registry.
- [X] Run refresh, tests, and build; review the resulting event snapshot before deployment.

## KQED The Do List

Registry ID: `kqed`
[Browse The Do List](https://www.kqed.org/thedolist) · [KQED Arts RSS](https://ww2.kqed.org/arts/feed/)

- [x] Requested by Yao in conversation on September 11, 2026, with an SF-only scope.
- [x] Narrow Chinatown event-summary extraction and station geometry verified. Other event formats remain pending.

Include physical events at verified San Francisco venues. Exclude out-of-city venues, online-only offerings, and non-event articles. Decide by actual venue, not headline keywords: an article about a play set in Oakland can describe a performance in San Francisco. The regional Arts RSS is offered for direct subscription; it is not an SF-only event feed.

The source is enabled for reviewed SF event-summary formats, without claiming a full 30-day editorial search. [Feasibility evidence and next steps](docs/journal/2026-09-11-kqed-source.md).

## Direct series added September 11, 2026

- [x] SF Shakes — [Free Shakespeare in the Park](https://sfshakes.org/performance/free-shakes/), requested by Yao. San Francisco performances only.
- [x] [From the E — Excelsior Night Market](https://www.fromtheesf.com/), identified in the Excelsior column supplied by Yao for tracking recurring markets.
- [x] [Sunday Streets SF](https://sundaystreetssf.com/), requested as a recurring street-festival series.
- [x] SF Shakes and From the E: verified adapters and occurrence points; enabled September 11.
- [ ] Sunday Streets: verify current organizer hours and occurrence geometry before enabling. Source approval does not imply collection is ready.

See [source grouping and series evidence](docs/journal/2026-09-11-direct-series.md).
