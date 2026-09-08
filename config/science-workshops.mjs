// Explicit dates from the operator's 2026–27 flyer, reviewed 2026-09-06.
// Review evidence and excluded programs: ../docs/mission-science-schedule-review.md.
// Do not replace these dates with an unbounded second-Saturday rule.
export const scienceWorkshops = [
  {
    id: 'mission-science-workshop-mission',
    name: 'Mission Science Workshop — Mission site community day',
    category: 'science-workshop',
    address: '3750 18th Street, San Francisco, CA 94114',
    // Apple place metadata; a venue point, not a surveyed entrance.
    coordinates: [-122.4271766, 37.7617582],
    coordinateSource: 'https://maps.apple.com/place?place-id=I558D35E4FECB1CD9',
    verifiedAt: '2026-09-06',
    validFrom: '2026-09-12',
    validThrough: '2027-06-12',
    source: {
      id: 'mission-science-workshop',
      name: 'Mission Science Workshop',
      url: 'https://www.missionscienceworkshop.org/visit',
    },
    scheduleSource: 'https://static.wixstatic.com/media/77a8ed_b6a21b2088bf40929015b4e3d698fe9b~mv2.jpg',
    residentFree: false,
    publicFreeRules: [
      { month: 9, day: 12 }, { month: 10, day: 10 },
      { month: 11, day: 14 }, { month: 12, day: 12 },
      { month: 1, day: 9 }, { month: 2, day: 13 },
      { month: 3, day: 13 }, { month: 4, day: 10 },
      { month: 5, day: 8 }, { month: 6, day: 12 },
    ],
    hours: { start: '10:00', end: '15:00' },
    admissionNote: 'Free public drop-in science exploration for all ages. Enter on Church Street between 17th and 18th Streets. School field trips and enrolled after-school programs require separate arrangements.',
  },
];
