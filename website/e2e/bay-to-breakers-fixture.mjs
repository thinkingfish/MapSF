// Browser-only historical probe: never imported into the published event feed.
// Approximate manual trace, NOT certified race geometry or a navigation aid.
// Street sequence and western curves: SFMTA May 17, 2026 advisory and its race map.
export const sourceUrl = 'https://www.sfmta.com/project-updates/bay-breakers-service-impacts';
export const coordinates = [
  [-122.3935,37.7900],[-122.3960,37.7880],[-122.3990,37.7857],
  [-122.4020,37.7833],[-122.4050,37.7809],[-122.4080,37.7785],
  [-122.4133,37.7745],[-122.4148,37.7757],[-122.4168,37.7774],
  [-122.4200,37.7769],[-122.4240,37.7764],[-122.4280,37.7759],
  [-122.4320,37.7754],[-122.4369,37.7748],[-122.4372,37.7739],
  [-122.4400,37.7735],[-122.4450,37.7729],[-122.4490,37.7724],
  [-122.4532,37.7718],[-122.4552,37.7716],[-122.4570,37.7716],
  [-122.4585,37.7717],[-122.4598,37.7722],[-122.4608,37.7722],
  [-122.4622,37.7720],[-122.4640,37.7718],[-122.4660,37.7720],
  [-122.4678,37.7722],[-122.4690,37.7724],[-122.4706,37.7725],
  [-122.4722,37.7722],[-122.4740,37.7715],[-122.4752,37.7711],
  [-122.4765,37.7712],[-122.4775,37.7716],[-122.4790,37.7718],
  [-122.4805,37.7717],[-122.4820,37.7713],[-122.4832,37.7708],
  [-122.4848,37.7704],[-122.4860,37.7702],[-122.4878,37.7702],
  [-122.4892,37.7703],[-122.4908,37.7708],[-122.4920,37.7708],
  [-122.4930,37.7704],[-122.4940,37.7698],[-122.4955,37.7695],
  [-122.4980,37.7689],[-122.5005,37.7682],[-122.5025,37.7676],
  [-122.5042,37.7669],[-122.5056,37.7664],[-122.5065,37.7664],
  [-122.5070,37.7669],[-122.5075,37.7676],[-122.5080,37.7680],
  [-122.5096,37.7682],[-122.5098,37.7674],[-122.5097,37.7664],
  [-122.5095,37.7654],
];
export const historicalFeed = {
  schemaVersion: 1,
  generatedAt: '2026-05-17T13:00:00Z',
  coverage: { dates: ['2026-05-17'] },
  sources: [{ id: 'sfmta', name: 'SFMTA', url: sourceUrl, status: 'ok', lastSuccessfulAt: '2026-05-17T13:00:00Z', eventCount: 1 }],
  events: [{
    id: 'historical-bay-to-breakers-2026',
    title: 'Bay to Breakers 2026 · historical route review',
    // Synthetic display window; only the historical race date is source-verified.
    startAt: '2026-05-17T08:00:00-07:00', endAt: '2026-05-17T13:00:00-07:00',
    description: 'Historical May 17, 2026 race. Times are a synthetic browser-test window. Approximate route reconstructed from the SFMTA street sequence and map; not certified race geometry. Howard/Main → Howard → 9th → Hayes → Divisadero → Fell → JFK → Great Highway / Ocean Beach.',
    cost: { label: 'Historical race; registration price not verified', isFree: false },
    source: { id: 'sfmta', name: 'SFMTA', url: sourceUrl },
    curation: {
      type: 'Feature', geometry: { type: 'LineString', coordinates },
      properties: { name: 'Approximate 2026 course · Howard/Main to Ocean Beach', layerType: 'segment', metadata: { address: 'San Francisco, CA', provenance: sourceUrl, accuracy: 'Manual approximate trace of published 2026 route; not surveyed or certified.' } },
    },
  }],
};
