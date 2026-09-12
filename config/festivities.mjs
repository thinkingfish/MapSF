import { hsbMeadows } from './hsb-meadows.mjs';
// Explicit organizer editions, never inferred annual recurrence.
// See docs/journal/2026-09-11-sf-festivities.md for evidence and review gaps.
export const festivities = [
  {
    "id": "autumn-moon",
    "name": "Chinatown Autumn Moon Festival",
    "operator": "Chinatown Merchants Association",
    "url": "https://www.moonfestival.org/",
    "edition": 2026,
    "dates": [
      "2026-09-19",
      "2026-09-20"
    ],
    "address": "Grant Avenue, California Street to Broadway, San Francisco, CA",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [
          -122.405938119,
          37.792450752
        ],
        [
          -122.406129483,
          37.793379705
        ],
        [
          -122.40622048,
          37.793831753
        ],
        [
          -122.406304986,
          37.794263627
        ],
        [
          -122.406475551,
          37.795144465
        ],
        [
          -122.406652352,
          37.79602475
        ],
        [
          -122.406827678,
          37.796901906
        ],
        [
          -122.406944629,
          37.797468973
        ],
        [
          -122.407016163,
          37.797822303
        ]
      ]
    },
    "geometrySource": "https://data.sfgov.org/resource/3psu-pn9h.json",
    "geometryNote": "Grant Avenue festival corridor, city street centerlines CNN 6392000–6399000. Side activities are not a surveyed perimeter.",
    "summary": "Free Chinatown street festival with performances, food vendors and family activities. Purchases cost extra.",
    "cost": {
      "label": "Free entry",
      "isFree": true
    },
    "pages": [
      {
        "url": "https://www.moonfestival.org/",
        "checks": [
          "2026 SF Chinatown Autumn Moon Festival",
          "September 19 - 20",
          "11am - 5pm",
          "Between California & Broadway",
          "FREE!"
        ]
      }
    ],
    "occurrences": [
      {
        "date": "2026-09-19",
        "start": "11:00",
        "end": "17:00"
      },
      {
        "date": "2026-09-20",
        "start": "11:00",
        "end": "17:00"
      }
    ],
    "aliases": [
      "Autumn Moon Festival",
      "SF Chinatown Autumn Moon Festival",
      "2026 SF Chinatown Autumn Moon Festival"
    ],
    "reviewedAt": "2026-09-11",
    "status": "reviewed"
  },
  {
    "id": "folsom",
    "name": "Folsom Street Fair",
    "operator": "Folsom Street",
    "url": "https://www.folsomstreet.org/folsom-street-fair",
    "edition": 2026,
    "dates": [
      "2026-09-27"
    ],
    "address": "Folsom Street at 9th Street, San Francisco, CA",
    "geometry": {
      "type": "Point",
      "coordinates": [
        -122.411610117,
        37.773769346
      ]
    },
    "geometrySource": "https://data.sfgov.org/resource/3psu-pn9h.json",
    "geometryNote": "Fair location pin at Folsom and 9th; the linked boundary map still describes 2025, so no 2026 perimeter is asserted.",
    "summary": "Adults 18+ only. Outdoor leather and fetish community fair. Entry does not require a ticket; a $10–20 donation is requested. The map pin locates the fair, not its full street closure.",
    "cost": {
      "label": "Free entry; donation requested · 18+",
      "isFree": true
    },
    "pages": [
      {
        "url": "https://www.folsomstreet.org/folsom-street-fair",
        "checks": [
          "SEPTEMBER 27, 2026 11AM - 6PM"
        ]
      },
      {
        "url": "https://www.folsomstreet.org/faq",
        "checks": [
          "Please do not bring children less than 18 years of age",
          "When you donate $10-20",
          "1286 Folsom Street at 9th Street"
        ]
      }
    ],
    "occurrences": [
      {
        "date": "2026-09-27",
        "start": "11:00",
        "end": "18:00"
      }
    ],
    "aliases": [
      "Folsom Street Fair 2026",
      "2026 Folsom Street Fair"
    ],
    "reviewedAt": "2026-09-11",
    "status": "reviewed"
  },
  {
    "id": "castro",
    "name": "Castro Street Fair",
    "operator": "Castro Street Fair",
    "url": "https://castrostreetfair.org/fair/",
    "edition": 2026,
    "dates": [
      "2026-10-04"
    ],
    "address": "Castro and Market Streets, San Francisco, CA",
    "geometry": {
      "type": "Point",
      "coordinates": [
        -122.435187962,
        37.762670708
      ]
    },
    "geometrySource": "https://data.sfgov.org/resource/3psu-pn9h.json",
    "geometryNote": "Organizer meeting intersection; general street closure guidance is not treated as a verified 2026 perimeter.",
    "summary": "Community street fair in the Castro. Free entry with a suggested $10–20 donation; food and other purchases cost extra.",
    "cost": {
      "label": "Free entry; donation requested",
      "isFree": true
    },
    "pages": [
      {
        "url": "https://castrostreetfair.org/fair/",
        "checks": [
          "October 4, 2026",
          "11:00 AM",
          "6:00 PM",
          "Castro & Market Street",
          "Suggested donation: $10 to $20"
        ]
      }
    ],
    "occurrences": [
      {
        "date": "2026-10-04",
        "start": "11:00",
        "end": "18:00"
      }
    ],
    "aliases": [
      "2026 Castro Street Fair"
    ],
    "reviewedAt": "2026-09-11",
    "status": "reviewed"
  },
  {
    "id": "hardly-strictly",
    "name": "Hardly Strictly Bluegrass",
    "operator": "Hardly Strictly Bluegrass",
    "url": "https://hardlystrictlybluegrass.com/info-faq-2026/",
    "edition": 2026,
    "dates": [
      "2026-10-02",
      "2026-10-03",
      "2026-10-04"
    ],
    "address": "Hellman Hollow, Lindley & Marx meadows, Golden Gate Park, San Francisco, CA",
    "geometry": hsbMeadows.geometry,
    "geometrySource": hsbMeadows.geometrySource,
    "geometryNote": "Three separate meadow grounds from OpenStreetMap; not the exact 2026 event perimeter or a claim that every part is accessible. Gaps between meadows are preserved. Directions use the separate JFK/Transverse entrance.",
    "summary": "Free music festival in Golden Gate Park. Listed opening times are gate opening times (11am Friday, 9am Saturday and Sunday); performances end at 7pm. The shaded areas trace Hellman Hollow, Lindley and Marx meadows; use the JFK/Transverse entrance for directions.",
    "cost": {
      "label": "Free; no tickets needed",
      "isFree": true
    },
    "pages": [
      {
        "url": "https://hardlystrictlybluegrass.com/info-faq-2026/",
        "checks": [
          "Fri Oct 2, Sat Oct 3, and Sun Oct 4, 2026",
          "11am on Friday",
          "9am Saturday & Sunday",
          "Performances end at 7pm daily",
          "JFK Drive and Transverse Drive",
          "FREE EVENT (NO TICKETS NEEDED)",
          "Hellman Hollow, Lindley & Marx meadows"
        ]
      }
    ],
    "occurrences": [
      {
        "date": "2026-10-02",
        "start": "11:00",
        "end": "19:00"
      },
      {
        "date": "2026-10-03",
        "start": "09:00",
        "end": "19:00"
      },
      {
        "date": "2026-10-04",
        "start": "09:00",
        "end": "19:00"
      }
    ],
    "aliases": [
      "Hardly Strictly Bluegrass 2026",
      "2026 Hardly Strictly Bluegrass"
    ],
    "reviewedAt": "2026-09-11",
    "status": "reviewed",
    "entrance": {
      "name": "JFK Drive and Transverse Drive — entrance 1",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -122.479895428,
          37.770495879
        ]
      },
      "source": "https://data.sfgov.org/resource/3psu-pn9h.json"
    },
    "geometryVersions": hsbMeadows.geometryVersions,
    "geometryLicense": "https://opendatacommons.org/licenses/odbl/1-0/",
    "geometryMapUrl": "https://www.openstreetmap.org/#map=16/37.7699/-122.4875"
  },
  {
    "id": "bay-to-breakers",
    "name": "Bay to Breakers",
    "operator": "Bay to Breakers",
    "url": "https://www.baytobreakers.com/12k",
    "edition": 2027,
    "dates": [
      "2027-05-16"
    ],
    "address": "Race start: Howard and Fremont Streets, San Francisco, CA",
    "geometry": {
      "type": "Point",
      "coordinates": [
        -122.395150932,
        37.789234699
      ]
    },
    "geometrySource": "https://data.sfgov.org/resource/3psu-pn9h.json",
    "geometryNote": "Verified 2027 start intersection only. The historical route fixture is not reused as a current course.",
    "summary": "12K race across San Francisco. Paid registration is required to participate. Times cover the first wave through finish-line closure; the pin marks the start, not the full course.",
    "cost": {
      "label": "Paid registration required",
      "isFree": false,
      "hasExplicitPrice": true
    },
    "pages": [
      {
        "url": "https://www.baytobreakers.com/12k",
        "checks": [
          "May 16, 2027",
          "8:00am",
          "1:00pm",
          "Howard",
          "Fremont",
          "Registration"
        ]
      }
    ],
    "occurrences": [
      {
        "date": "2027-05-16",
        "start": "08:00",
        "end": "13:00"
      }
    ],
    "aliases": [
      "Bay to Breakers 12K"
    ],
    "reviewedAt": "2026-09-11",
    "status": "reviewed"
  },
  {
    "id": "pride",
    "name": "San Francisco Pride",
    "operator": "San Francisco Pride",
    "url": "https://sfpride.org/",
    "edition": 2027,
    "dates": [
      "2027-06-26",
      "2027-06-27"
    ],
    "notes": "Weekend announced. Parade detail page still describes June 28, 2026; await 2027 parade date, hours and route confirmation.",
    "occurrences": [],
    "reviewedAt": "2026-09-11",
    "status": "pending-details"
  },
  {
    "id": "carnaval",
    "name": "Carnaval San Francisco",
    "operator": "Carnaval San Francisco",
    "url": "https://carnavalsanfrancisco.org/",
    "edition": 2027,
    "dates": [
      "2027-05-29",
      "2027-05-30"
    ],
    "notes": "Festival weekend and May 30 parade announced. Parade route: 24th/Bryant to Mission, then north to 15th. Parade hours are missing; festival page mixes 2026 details. Await edition-specific hours.",
    "occurrences": [],
    "reviewedAt": "2026-09-11",
    "status": "pending-details"
  },
  {
    "id": "fleet-week",
    "name": "San Francisco Fleet Week",
    "operator": "San Francisco Fleet Week",
    "url": "https://fleetweeksf.org/",
    "edition": 2026,
    "dates": [
      "2026-10-04",
      "2026-10-12"
    ],
    "notes": "Overall date range, not daily occurrences. Parade of Ships October 9, 11am–noon; air show October 9–11, noon–4pm. Verify public viewing coordinates and distinguish free viewing from paid seating before publication.",
    "occurrences": [],
    "reviewedAt": "2026-09-11",
    "status": "pending-details"
  },
  {
    "id": "italian-heritage",
    "name": "Italian Heritage Parade",
    "operator": "Italian Heritage Parade",
    "url": "https://sfitalianheritage.org/parade/",
    "edition": 2026,
    "dates": [
      "2026-10-11"
    ],
    "notes": "Free parade starts 12:30pm at Jefferson/Powell, along Columbus to Washington Square. Await end time; do not invent duration.",
    "occurrences": [],
    "reviewedAt": "2026-09-11",
    "status": "pending-details"
  },
  {
    "id": "chinese-new-year",
    "name": "Chinese New Year Parade",
    "operator": "Chinese New Year Festival & Parade",
    "url": "https://chineseparade.com/faq/",
    "edition": 2027,
    "dates": [
      "2027-02-20"
    ],
    "notes": "Starts 5:15pm. Free public viewing with optional paid bleachers. Await end time and edition-specific route verification.",
    "occurrences": [],
    "reviewedAt": "2026-09-11",
    "status": "pending-details"
  },
  {
    "id": "cherry-blossom",
    "name": "Northern California Cherry Blossom Festival",
    "operator": "Northern California Cherry Blossom Festival",
    "url": "https://sfcherryblossom.org/",
    "edition": 2026,
    "dates": [
      "2026-04-11",
      "2026-04-12",
      "2026-04-18",
      "2026-04-19"
    ],
    "notes": "Past edition only. Await 2027 announcement; do not extrapolate April weekends.",
    "occurrences": [],
    "reviewedAt": "2026-09-11",
    "status": "pending-details"
  },
  {
    "id": "nihonmachi",
    "name": "Nihonmachi Street Fair",
    "operator": "Nihonmachi Street Fair",
    "url": "https://www.nihonmachistreetfair.org/",
    "edition": 2027,
    "dates": [
      "2027-08-07",
      "2027-08-08"
    ],
    "notes": "Dates announced; await 2027 hours and verified venue geometry.",
    "occurrences": [],
    "reviewedAt": "2026-09-11",
    "status": "pending-details"
  }
];
