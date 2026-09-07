// Museum curation is maintained separately from gardens. See MUSEUM-REVIEW.md.
export const museums = [
  {
    id: 'asian-art-museum', name: 'Asian Art Museum', category: 'museum',
    address: '200 Larkin Street, San Francisco, CA 94102',
    // Apple's place:location latitude/longitude metadata identifies the actual
    // museum. This is a place point, not a surveyed entrance or a footprint.
    coordinates: [-122.416175, 37.7802677],
    coordinateSource: 'https://maps.apple.com/place?place-id=IB262B153BB40AD10',
    verifiedAt: '2026-09-06', validFrom: '2026-01-01', validThrough: '2026-12-31',
    source: { id: 'asian-art-museum', name: 'Asian Art Museum', url: 'https://about.asianart.org/ticketing/' },
    residentFree: false,
    publicFreeRules: [{ weekday: 0, nth: 1 }],
    closedWeekdays: [2, 3],
    hours: { start: '10:00', end: '17:00' },
    admissionNote: 'General admission only; special exhibitions cost extra. Advance timed tickets are encouraged.',
  },
];
