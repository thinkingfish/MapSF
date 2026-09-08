// Date-specific Valencia LIVE extent, corroborated by the 2026 organizer schedule
// and SFMTA ISCOTT agenda; see docs/valencia-live-route-review.md.
export const valenciaLiveRoute = {
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
      [
        -122.4215784,
        37.761700908
      ],
      [
        -122.421425213,
        37.760101294
      ],
      [
        -122.421355418,
        37.759372454
      ],
      [
        -122.421271729,
        37.758498509
      ],
      [
        -122.421193865,
        37.757701417
      ],
      [
        -122.42111754,
        37.756902008
      ]
    ]
  }
};
export const valenciaLiveRouteDates = new Set(['2026-09-10', '2026-10-08']);
