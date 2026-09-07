import { cityParkNames } from './city-park-names.mjs';
// User-curated missing-price hints, not guarantees. Explicit prices win.
// Names verified against https://sfpl.org/locations (2026-09-07).
const branches = ['Anza','Bayview','Bernal Heights','Chinatown','Eureka Valley','Excelsior','Glen Park','Golden Gate Valley','Ingleside','Marina','Merced','Mission','Mission Bay','Noe Valley','North Beach','Ocean View','Ortega','Park','Parkside','Portola','Potrero','Presidio','Richmond','Sunset','Visitacion Valley','West Portal','Western Addition'];
// https://www.sfrecpark.org/1871/Golden-Gate-Park-Meadows
const meadows = ['Hellman Hollow','Speedway Meadow','Lindley Meadow','Marx Meadow',"Mother's Meadow",'Peacock Meadow','Robin Williams Meadow','Sharon Meadow'];
export const freeEventVenues = [
  {id:'mission-dolores-park', names:['Mission Dolores Park','Dolores Park']},
  {id:'sfpl-libraries', names:[
    'San Francisco Public Library','SF Public Library','SFPL','Main Library',
    'San Francisco Main Public Library','San Francisco Main Library','SFPL Main Library',
    ...branches.flatMap(name=>[`${name} Library`,`${name} Branch Library`,`${name} Branch SFPL`,`SFPL ${name} Branch`,`San Francisco Public Library ${name} Branch`]),
  ]},
  {id:'golden-gate-park-meadows', names:meadows.flatMap(name=>[name,`Golden Gate Park ${name}`,`${name} Golden Gate Park`,`GGP ${name}`])},
  {id:'sf-city-parks', names:[...cityParkNames,'Marina Green','McLaren Park','Stern Grove','Mount Davidson Park','Patricia’s Green','Pioneer Park']},
];
// Only public street-event formats, not every activity with a street address.
export const publicStreetEvent = /\b(street fair|street festival|block party|night market|parade|summer streets|sunday streets|valencia\s*live)\b/i;
export const excludedStreetEvent = /\b(tour|race|marathon|fundrais\w*|ticket\w*)\b/i;
