import { botanical, tea } from './garden-geometry.mjs';

// Reviewed against the operator's admission and travel pages on 2026-09-06.
// Coordinates are Google Maps *place targets* (!3d/!4d), not viewport centers,
// linked by https://gggp.org/visit/getting-here/. They identify the actual gardens,
// with reviewed area geometry and separate entrance points for two gardens.
const gardens = {
  category: 'garden',
  verifiedAt: '2026-09-06',
  validFrom: '2026-01-01',
  validThrough: '2026-12-31',
  residentFree: true,
  source: { id: 'gggp', name: 'Gardens of Golden Gate Park', url: 'https://gggp.org/visit/admissions-hours/' },
  residencySource: 'https://gggp.org/tickets/',
  coordinateSource: 'https://gggp.org/visit/getting-here/',
};

export const places = [
  {
    ...gardens,
    id: 'sf-botanical-garden', name: 'San Francisco Botanical Garden',
    address: '1199 9th Avenue, San Francisco, CA 94122',
    ...botanical,
    hours: { start: '07:30', end: 'botanical-seasonal', closingNote: 'Garden closes one hour after last entry.' },
    publicFreeRules: [{ weekday: 2, nth: 2 }, { month: 11, weekday: 4, nth: 4 }, { month: 12, day: 25 }, { month: 1, day: 1 }],
    earlyFree: { start: '07:30', end: '09:00' },
  },
  {
    ...gardens,
    id: 'japanese-tea-garden', name: 'Japanese Tea Garden',
    address: '75 Hagiwara Tea Garden Drive, San Francisco, CA 94118',
    ...tea,
    hours: { start: '09:00', end: 'tea-seasonal' },
    publicFreeRules: [],
    earlyFree: { weekdays: [1, 3, 5], start: '09:00', end: '10:00' },
  },
  {
    ...gardens,
    id: 'conservatory-of-flowers', name: 'Conservatory of Flowers',
    address: '100 John F. Kennedy Drive, San Francisco, CA 94118',
    coordinates: [-122.4602558, 37.7726187],
    hours: { start: '10:00', end: '16:00', closingNote: 'Conservatory closes at 4:30 PM.' },
    closedWeekdays: [3],
    closedDates: [{ from: '2026-01-21', through: '2026-02-04' }],
    publicFreeRules: [{ weekday: 2, nth: 1 }],
  },
];
