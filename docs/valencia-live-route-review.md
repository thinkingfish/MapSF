# Valencia LIVE! route collection review

Reviewed September 6, 2026. This is a diagnosis and proposed curation record; it does not publish events or enable a source.

## Finding

Valencia LIVE! is absent from the current public event snapshot, rather than represented there by an incorrect point. The inspected snapshot (`generatedAt: 2026-09-07T04:11:50.149Z`) contained 11 events and no case-insensitive `Valencia` matches anywhere in event records. `website/data/manual-events.json` has no manual events or overrides.

There are two distinct collection gaps:

1. In `website/config/sources.mjs`, Civic Joy Fund is approved but disabled. Its live events-page HTML contains zero JSON-LD `Event` records and no Valencia text. It embeds Elfsight app `cf01baa9-f4cc-4f8a-948e-b927c33ff6be`. The current generic JSON-LD adapter cannot extract that widget merely by enabling the source.
2. In `website/scripts/refresh-events.mjs`, `normalizeJsonLd()` calls `sourcePoint(location)` and sets `layerType: 'poi'`. `sourcePoint()` accepts only `location.geo.latitude` / `longitude`. Publisher descriptions are deliberately omitted, and there is no extraction of “between 18th and 21st” into street geometry. Thus an event found through another enabled JSON-LD publisher would still need route curation. The existing schema and renderer already support `segment` / `LineString`; this is a collection/curation gap.

No approved publisher's extractable Valencia event record was established in this investigation. Civic Joy Fund's partnership with the event does not make the separate organizer website an approved source or justify attributing organizer data to Civic Joy Fund.

## Verified event facts

The [Valencia Corridor Merchants Association organizer page](https://www.visitvalenciastreet.com/live) explicitly publishes these dates and street boundaries under its **2026** season heading:

| Event dates | Valencia Street extent | Public event hours |
| --- | --- | --- |
| May 14 and June 11, 2026 | 16th Street to 19th Street | 5–10 p.m. Pacific |
| July 9 and August 13, 2026 | 17th Street to 20th Street | 5–10 p.m. Pacific |
| September 10 and October 8, 2026 | 18th Street to 21st Street | 5–10 p.m. Pacific |

The organizer identifies the celebration as free and all-ages. These are three-block extents for this published season; a generic 16th–21st footprint would misrepresent individual dates.

The [SFMTA ISCOTT March 26, 2026 agenda, page 5](https://www.sfmta.com/vi/media/44700/download?inline=) lists the same date-dependent Valencia boundaries. Its September/October item specifies that cross-street intersections remain open. The agenda's noon–11:59 p.m. closure windows are not the public party hours, and an agenda alone is not proof of final permit approval.

The organizer page also retains a conflicting “Sept. 12” music heading. The proposed curation uses the explicit 2026 schedule and location lists, corroborated by the SFMTA agenda and the [organizer's September 10 Eventbrite listing](https://www.eventbrite.com/e/valencia-live-2026-tickets-1987557518040), rather than that isolated music heading.

## Proposed September/October route

The route below joins the active Valencia centerlines from the City's [Streets – Active and Retired dataset](https://dev.socrata.com/foundry/data.sfgov.org/3psu-pn9h). The request to `https://data.sfgov.org/resource/3psu-pn9h.json` used `$where=street='VALENCIA' AND active=true` and `$limit=100`. All five segments joined at exactly equal coordinates; no approximate geocoding or invented street endpoints were needed.

| Centerline Network Number (CNN) | From | To |
| --- | --- | --- |
| 13064000 | 18th Street | 19th Street |
| 13065000 | 19th Street | Cunningham Place |
| 13066000 | Cunningham Place | 20th Street |
| 13067000 | 20th Street | Liberty Street |
| 13068000 | Liberty Street | 21st Street |

```json
{
  "type": "Feature",
  "properties": {
    "name": "Valencia Street · 18th to 21st",
    "layerType": "segment",
    "metadata": {
      "address": "Valencia Street between 18th and 21st streets, San Francisco, CA",
      "eventExtentSource": "https://www.visitvalenciastreet.com/live",
      "geometrySource": "https://data.sfgov.org/resource/3psu-pn9h.json",
      "centerlineNetworkNumbers": "13064000,13065000,13066000,13067000,13068000"
    }
  },
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [-122.4215784, 37.761700908],
      [-122.421425213, 37.760101294],
      [-122.421355418, 37.759372454],
      [-122.421271729, 37.758498509],
      [-122.421193865, 37.757701417],
      [-122.42111754, 37.756902008]
    ]
  }
}
```

This geometry represents the published main street extent for **September 10 and October 8, 2026 only**. It does not imply a pedestrian race, closed cross streets, an exact permitted footprint, or the same extent on every recurrence. The display windows would be `17:00:00-07:00` through `22:00:00-07:00` on each distinct date.

## Source decision and implementation proposal

- [ ] Owner approves the Valencia Corridor Merchants Association organizer page (`https://www.visitvalenciastreet.com/live`) as an event source.

After approval, add a bounded organizer-specific adapter or explicit curated event records attributed to that organizer. Preserve separate instances and date-specific street boundaries, use the verified centerline geometry, and record exact public event times. Verify saved fixtures before enabling collection. The generic JSON-LD normalizer should not guess a route from an event title or silently replace an explicit multi-block extent with a venue pin.

Approval is still pending. No source, adapter, public event, or manual override was changed by this review.

## Captured evidence in this workspace

These temporary artifacts support reproducibility during review; the event facts and proposed geometry above are retained in this document:

- `/tmp/civicjoy-valencia.html` — live Civic Joy Fund events-page HTML.
- `/tmp/valencia-organizer.html` — live organizer-page HTML.
- `/tmp/valencia-centerlines.json` — 28 active Valencia centerline records returned by DataSF.
- `/tmp/valencia-route-verified.json` — joined six-vertex route, CNN identifiers, date mapping, and provenance.

## Civic Joy Fund integration update

The approved Civic Joy Fund calendar now supplies the September 10 and October 8
2026 occurrences and explicitly links the organizer page as its event details.
Its public Google Calendar was discovered through the active Elfsight integration.
The collector uses the above reviewed geometry as supplemental date-specific
curation, retaining Civic Joy Fund calendar attribution and geometry provenance.
The organizer is not added as a separate collection source. This supersedes the
earlier ingestion-gap finding; unreviewed dates do not inherit this extent.
