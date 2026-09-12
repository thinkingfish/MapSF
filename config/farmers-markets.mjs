// Reviewed operator schedules. See docs/journal/2026-09-11-farmers-markets.md.
// OSM-derived geometry: © OpenStreetMap contributors, ODbL 1.0.
// Points locate venues; polygons are mapped grounds, not surveyed stall layouts.
export const farmersMarkets = [
  {
    "id": "ferry-plaza",
    "name": "Ferry Plaza Farmers Market",
    "operator": "Foodwise",
    "url": "https://foodwise.org/markets/ferry-plaza-farmers-market/",
    "address": "Ferry Building, Embarcadero and Market Streets, San Francisco, CA",
    "geometry": {
      "type": "Point",
      "coordinates": [-122.3923704, 37.7952753]
    },
    "geometrySource": "https://www.openstreetmap.org/node/10651024023",
    "schedule": [
      {
        "weekdays": [
          6
        ],
        "start": "08:00",
        "end": "14:00"
      },
      {
        "weekdays": [2, 4],
        "start": "10:00",
        "end": "14:00"
      }
    ],
    "checks": [
      "Ferry Building, Embarcadero and Market Streets, San Francisco",
      "Saturday (8 am – 2 pm) and Tuesday & Thursday (10 am – 2 pm), year round"
    ],
    "reviewedAt": "2026-09-11",
    "validFrom": "2026-09-11",
    "validThrough": "2026-12-31",
    "excludedDates": [],
    "aliases": []
  },
  {
    "id": "alemany",
    "name": "Alemany Farmers Market",
    "operator": "Foodwise",
    "url": "https://foodwise.org/markets/alemany-farmers-market/",
    "address": "100 Alemany Boulevard, San Francisco, CA",
    "geometry": {
      "type": "Polygon",
      "coordinates": [
        [
          [-122.4108339, 37.7356603],
          [-122.4093103, 37.7366328],
          [-122.4091994, 37.7365451],
          [-122.4092888, 37.7363185],
          [-122.4094397, 37.7360773],
          [-122.4097139, 37.7357825],
          [-122.4100559, 37.7355412],
          [-122.4105273, 37.7353122],
          [-122.4108878, 37.7353268],
          [-122.4108632, 37.7355948],
          [-122.4108339, 37.7356603]
        ]
      ]
    },
    "geometrySource": "https://www.openstreetmap.org/way/367586034",
    "schedule": [
      {
        "weekdays": [
          6
        ],
        "start": "07:00",
        "end": "14:00"
      }
    ],
    "checks": [
      "100 Alemany Boulevard, San Francisco",
      "Saturday (7 am – 2 pm), year round"
    ],
    "reviewedAt": "2026-09-11",
    "validFrom": "2026-09-11",
    "validThrough": "2026-12-31",
    "excludedDates": [],
    "aliases": []
  },
  {
    "id": "mission",
    "name": "Mission Community Market",
    "operator": "Foodwise",
    "url": "https://foodwise.org/markets/mission-community-market/",
    "address": "22nd Street between Mission and Valencia, San Francisco, CA",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [-122.418747574, 37.755436936],
        [-122.419857943, 37.75536573],
        [-122.420964093, 37.755294782]
      ]
    },
    "geometrySource": "https://data.sfgov.org/resource/3psu-pn9h.json",
    "schedule": [
      {
        "weekdays": [
          4
        ],
        "start": "15:00",
        "end": "19:00"
      }
    ],
    "checks": [
      "22nd and Bartlett Streets, San Francisco",
      "Thursday (3 pm – 7 pm), mid March – mid November"
    ],
    "reviewedAt": "2026-09-11",
    "validFrom": "2026-09-11",
    "validThrough": "2026-12-31",
    "excludedDates": [],
    "aliases": [],
    "seasonThrough": "2026-11-12",
    "seasonSource": "https://foodwise.org/events/mission-community-market-last-day-of-the-season/"
  },
  {
    "id": "heart-of-city",
    "name": "Heart of the City Farmers Market",
    "operator": "Heart of the City Farmers Market",
    "url": "https://hotcfarmersmarket.org/find-us",
    "address": "Fulton Plaza between Hyde and Larkin, San Francisco, CA",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [-122.415126955, 37.779788527],
        [-122.416768093, 37.779584438]
      ]
    },
    "geometrySource": "https://data.sfgov.org/resource/3psu-pn9h.json",
    "schedule": [
      {
        "weekdays": [0, 3],
        "start": "07:00",
        "end": "16:00"
      }
    ],
    "checks": [
      "Fulton Plaza",
      "every Wednesday and Sunday from 7am to 4pm"
    ],
    "reviewedAt": "2026-09-11",
    "validFrom": "2026-09-11",
    "validThrough": "2026-12-31",
    "excludedDates": [
      "2026-12-24",
      "2026-12-25"
    ],
    "aliases": []
  },
  {
    "id": "clement",
    "name": "Clement Street Farmers Market",
    "operator": "Agricultural Institute of Marin",
    "url": "https://www.agriculturalinstitute.org/clement-st",
    "address": "244 Clement Street, San Francisco, CA",
    "geometry": {
      "type": "Point",
      "coordinates": [-122.4612258, 37.7830983]
    },
    "geometrySource": "https://www.openstreetmap.org/way/362162006",
    "schedule": [
      {
        "weekdays": [
          0
        ],
        "start": "09:00",
        "end": "14:00"
      }
    ],
    "checks": [
      "Clement Street Farmers Market",
      "Every Sunday, 9am - 2pm",
      "244 Clement St."
    ],
    "reviewedAt": "2026-09-11",
    "validFrom": "2026-09-11",
    "validThrough": "2026-12-31",
    "excludedDates": [],
    "aliases": [
      "Clement St. Farmers Market"
    ]
  },
  {
    "id": "stonestown",
    "name": "Stonestown Farmers Market",
    "operator": "Agricultural Institute of Marin",
    "url": "https://www.agriculturalinstitute.org/stonestown",
    "address": "501 Buckingham Way, San Francisco, CA",
    "geometry": {
      "type": "Point",
      "coordinates": [-122.4790533, 37.7297335]
    },
    "geometrySource": "https://www.agriculturalinstitute.org/stonestown",
    "schedule": [
      {
        "weekdays": [
          0
        ],
        "start": "09:00",
        "end": "13:00"
      }
    ],
    "checks": [
      "Stonestown Farmers Market",
      "Every Sunday, 9am - 1pm",
      "501 Buckingham Way"
    ],
    "reviewedAt": "2026-09-11",
    "validFrom": "2026-09-11",
    "validThrough": "2026-12-31",
    "excludedDates": [],
    "aliases": []
  },
  {
    "id": "fort-mason",
    "name": "Fort Mason Center Farmers Market",
    "operator": "California Farmers’ Markets Association",
    "url": "https://www.cafarmersmkts.com/fort-mason-center-farmers-market",
    "address": "Fort Mason Center, Marina Boulevard, San Francisco, CA",
    "geometry": {
      "type": "Point",
      "coordinates": [-122.4315658, 37.8061667]
    },
    "geometrySource": "https://www.openstreetmap.org/node/1478520965",
    "schedule": [
      {
        "weekdays": [
          0
        ],
        "start": "09:30",
        "end": "13:30"
      }
    ],
    "checks": [
      "Fort Mason Center",
      "Every Sunday, 9:30 am to 1:30 pm"
    ],
    "reviewedAt": "2026-09-11",
    "validFrom": "2026-09-11",
    "validThrough": "2026-12-31",
    "excludedDates": [],
    "aliases": [
      "Fort Mason Farmers Market"
    ]
  },
  {
    "id": "noe-valley",
    "name": "Noe Valley Farmers Market",
    "operator": "Noe Valley Farmers Market",
    "url": "https://www.noevalleyfarmersmarket.com/",
    "address": "Noe Valley Town Square, 3861 24th Street, San Francisco, CA",
    "geometry": {
      "type": "Point",
      "coordinates": [-122.42897955000001, 37.75137405]
    },
    "geometrySource": "https://www.openstreetmap.org/way/256784864",
    "schedule": [
      {
        "weekdays": [
          6
        ],
        "start": "08:00",
        "end": "13:00"
      }
    ],
    "checks": [
      "Noe Valley Town Square",
      "3861 24th St",
      "8am - 1pm, Saturdays"
    ],
    "reviewedAt": "2026-09-11",
    "validFrom": "2026-09-11",
    "validThrough": "2026-12-31",
    "excludedDates": [],
    "aliases": []
  },
  {
    "id": "outer-sunset",
    "name": "Outer Sunset Farmers Market & Mercantile",
    "operator": "Sunset Mercantile",
    "url": "https://sunsetmercantilesf.com/osfmm/",
    "address": "37th Avenue from Ortega to Quintara, San Francisco, CA",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [-122.495630257, 37.751526823],
        [-122.49550014, 37.749662077],
        [-122.495369765, 37.74779354]
      ]
    },
    "geometrySource": "https://data.sfgov.org/resource/3psu-pn9h.json",
    "schedule": [
      {
        "weekdays": [
          0
        ],
        "start": "09:00",
        "end": "14:00"
      }
    ],
    "checks": [
      "SUNDAYS",
      "9 am-2 pm",
      "37th Avenue at Ortega to Quintara"
    ],
    "reviewedAt": "2026-09-11",
    "validFrom": "2026-09-11",
    "validThrough": "2026-12-31",
    "excludedDates": [],
    "aliases": [
      "Outer Sunset Farmers Market"
    ]
  },
  {
    "id": "castro",
    "name": "Castro Farmers Market",
    "operator": "Pacific Coast Farmers’ Market Association",
    "url": "https://www.pcfma.org/castro",
    "address": "Noe Street between Market and Beaver, San Francisco, CA",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [-122.433178635, 37.765060651],
        [-122.43311272, 37.764373526],
        [-122.433074471, 37.764195713]
      ]
    },
    "geometrySource": "https://data.sfgov.org/resource/3psu-pn9h.json",
    "schedule": [
      {
        "weekdays": [
          3
        ],
        "start": "15:00",
        "end": "19:00"
      }
    ],
    "checks": [
      "270 Noe St., San Francisco",
      "Wednesdays 3:00 pm - 7:00 pm",
      "April 1st 2026 - November 18th 2026"
    ],
    "reviewedAt": "2026-09-11",
    "validFrom": "2026-09-11",
    "validThrough": "2026-12-31",
    "excludedDates": [],
    "aliases": [],
    "seasonThrough": "2026-11-18",
    "seasonSource": "https://www.pcfma.org/castro"
  },
  {
    "id": "fillmore",
    "name": "Fillmore Farmers Market",
    "operator": "Pacific Coast Farmers’ Market Association",
    "url": "https://www.pcfma.org/market/fillmore-farmers-market",
    "address": "1700 O’Farrell Street, San Francisco, CA",
    "geometry": {
      "type": "Point",
      "coordinates": [-122.4330022, 37.7840139]
    },
    "geometrySource": "https://www.pcfma.org/market/fillmore-farmers-market",
    "schedule": [
      {
        "weekdays": [
          6
        ],
        "start": "09:00",
        "end": "13:00"
      }
    ],
    "checks": [
      "1700 O'Farrell St., San Francisco",
      "Saturdays 9:00 am - 1:00 pm",
      "Year-Round"
    ],
    "reviewedAt": "2026-09-11",
    "validFrom": "2026-09-11",
    "validThrough": "2026-12-31",
    "excludedDates": [],
    "aliases": []
  },
  {
    "id": "inner-sunset",
    "name": "Inner Sunset Farmers Market",
    "operator": "Pacific Coast Farmers’ Market Association",
    "url": "https://www.pcfma.org/innersunset",
    "address": "1315 8th Avenue, San Francisco, CA",
    "geometry": {
      "type": "Point",
      "coordinates": [-122.4657866, 37.7636003]
    },
    "geometrySource": "https://www.pcfma.org/innersunset",
    "schedule": [
      {
        "weekdays": [
          0
        ],
        "start": "09:00",
        "end": "13:00"
      }
    ],
    "checks": [
      "1315 8th Ave., San Francisco",
      "Sundays 9:00 am - 1:00 pm",
      "Year-Round"
    ],
    "reviewedAt": "2026-09-11",
    "validFrom": "2026-09-11",
    "validThrough": "2026-12-31",
    "excludedDates": [],
    "aliases": []
  },
  {
    "id": "divisadero",
    "name": "Divisadero Farmers Market",
    "operator": "Pacific Coast Farmers’ Market Association",
    "url": "https://www.pcfma.org/divisadero",
    "address": "1377 Fell Street, San Francisco, CA",
    "geometry": {
      "type": "Point",
      "coordinates": [-122.4404278, 37.7733404]
    },
    "geometrySource": "https://www.pcfma.org/divisadero",
    "schedule": [
      {
        "weekdays": [
          0
        ],
        "start": "09:00",
        "end": "13:00"
      }
    ],
    "checks": [
      "1377 Fell St., San Francisco",
      "Sundays 9:00 am - 1:00 pm",
      "Year-Round"
    ],
    "reviewedAt": "2026-09-11",
    "validFrom": "2026-09-11",
    "validThrough": "2026-12-31",
    "excludedDates": [],
    "aliases": []
  },
  {
    "id": "hayes-valley",
    "name": "Hayes Valley Farmers Market",
    "operator": "Pacific Coast Farmers’ Market Association",
    "url": "https://www.pcfma.org/hayesvalley",
    "address": "450 Hayes Street, San Francisco, CA",
    "geometry": {
      "type": "Point",
      "coordinates": [-122.4239646, 37.7769099]
    },
    "geometrySource": "https://www.pcfma.org/hayesvalley",
    "schedule": [
      {
        "weekdays": [
          6
        ],
        "start": "10:00",
        "end": "14:00"
      }
    ],
    "checks": [
      "450 Hayes Street, San Francisco",
      "Saturdays 10:00 am - 2:00 pm",
      "Year-Round"
    ],
    "reviewedAt": "2026-09-11",
    "validFrom": "2026-09-11",
    "validThrough": "2026-12-31",
    "excludedDates": [],
    "aliases": []
  }
];
