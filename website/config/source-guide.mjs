import { sources } from './sources.mjs';
import { places } from './places.mjs';
import { museums } from './museums.mjs';
const descriptions = {
  sfpl: ['San Francisco’s public library calendar includes readings, workshops, performances, and activities at neighborhood branches.', 'We check each day in the 30-day window, including additional results pages, and use the library’s calendar timestamps and branch locations.'],
  'sf-rec-park': ['The city’s Recreation and Parks calendar lists public activities and events in its parks and facilities.', 'We check the daily calendars across the full window. Published listings currently focus on the Golden Gate Bandshell, where we have verified the venue coordinates.'],
  'mission-local': ['A local newsroom with an events calendar covering arts, music, community gatherings, and neighborhood life.', 'We use its public calendar API, following every page in the requested date range. Dates, venue coordinates, and any listed prices come from the publisher.'],
  funcheap: ['A guide to free and inexpensive events in San Francisco and the Bay Area.', 'Planned: we still need reliable venue coordinates before adding its listings to the map.'],
  'sf-chronicle': ['The San Francisco Chronicle provides regional arts, entertainment, and event coverage.', 'Planned: its embedded event calendar needs a verified collection method.'],
  'ingleside-light': ['A neighborhood publication covering Ingleside and surrounding communities, including things-to-do roundups.', 'Planned: individual event dates and locations need to be extracted and checked separately from article publication dates.'],
  'richmond-sunset-news': ['Neighborhood coverage from the Richmond Review and Sunset Beacon, including community activities on the west side of the city.', 'Planned: we are identifying reliable event listings and verifying dates and locations.'],
  'marina-times': ['A neighborhood publication with arts, culture, and calendar coverage for San Francisco’s northern neighborhoods.', 'Planned: current event coverage and the freshness of calendar entries need verification.'],
  'civic-joy-fund': ['A community organization supporting public celebrations and neighborhood activities in San Francisco.', 'Planned: its embedded calendar needs a dedicated extractor and verified event locations.'],
};
export const eventSourceGuide = sources.filter(source => source.approved).map(source => ({
  id: source.id, name: source.name, url: source.listingUrl,
  status: source.enabled ? 'Collecting events' : 'Planned',
  description: descriptions[source.id]?.[0] ?? 'A source selected for local event coverage.',
  collection: descriptions[source.id]?.[1] ?? 'Collection details are being reviewed.',
}));
const operators = [...new Map([...places, ...museums].map(place => [place.source.id, place.source])).values()];
export const placeSourceGuide = operators.map(source => ({...source,
  status: 'Curated schedule',
  description: source.id === 'gggp'
    ? 'Official admission and hours for the San Francisco Botanical Garden, Japanese Tea Garden, and Conservatory of Flowers.'
    : 'Official museum ticketing information, including its first-Sunday free general admission program.',
  collection: 'We maintain a reviewed schedule with eligibility, opening days, last entry, known closures, and a review expiry. Check the official page for current restrictions and tickets.',
}));
export const mapSourceGuide = [{id:'openstreetmap',name:'OpenStreetMap',url:'https://www.openstreetmap.org/copyright',status:'Map data',description:'Community-maintained geographic data provides our background map.',collection:'The browser requests only the map tiles needed for interactive viewing and uses normal HTTP caching. Attribution stays visible. Automated tests use local tiles instead of the community service.'}];
export const sourceGuide = [...eventSourceGuide, ...placeSourceGuide, ...mapSourceGuide];
