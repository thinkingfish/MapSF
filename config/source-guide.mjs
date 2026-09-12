import { scienceWorkshops } from './science-workshops.mjs';
import { sources } from './sources.mjs';
import { places } from './places.mjs';
import { museums } from './museums.mjs';
const descriptions = {
  'sf-shakes': ['Free outdoor Shakespeare performances presented by the San Francisco Shakespeare Festival. This touring series includes venues outside San Francisco.', 'We read individual San Francisco performances from the reviewed 2026 production schedule, using city-verified venue points. End times use the organizer’s approximate running time. The season’s date range is not a daily schedule; each new season needs review.'],
  'from-the-e': ['A recurring community night market at Ocean Avenue and Mission Street in the Excelsior.', 'We read the organizer’s individual event pages for dates, times, cancellation status, and stated free admission. The Ocean/Mission intersection is verified against city street data and shown as a point. We do not infer dates from a monthly pattern.'],
  'sunday-streets': ['Livable City’s series of car-free neighborhood street celebrations across San Francisco.', 'Planned: verify dates, hours, and routes for each neighborhood occurrence. A verified meeting point is sufficient when the full route is unavailable. Other Livable City programs are separate events.'],
  'mission-science-workshop': ['Hands-on science and engineering activities for youth and families, with community workshops in the Mission, Excelsior, and Bayview.', 'We maintain the Mission site’s explicitly published 2026–27 community-day dates as a reviewed schedule. Other sites and weekly programs await complete date and location verification.'],
  sfpl: ['San Francisco’s public library calendar includes readings, workshops, performances, and activities at neighborhood branches.', 'We check each day in the 30-day window, including additional results pages, and use the library’s calendar timestamps and branch locations.'],
  'sf-rec-park': ['The city’s Recreation and Parks calendar lists public activities and events in its parks and facilities.', 'We check the daily calendars across the full window. Published listings currently focus on the Golden Gate Bandshell, where we have verified the venue coordinates.'],
  'mission-local': ['A local newsroom with an events calendar covering arts, music, community gatherings, and neighborhood life.', 'We use its public calendar API, following every page in the requested date range. Dates, venue coordinates, and any listed prices come from the publisher.'],
  funcheap: ['A guide to free and inexpensive events in San Francisco and the Bay Area.', 'Planned: we still need reliable venue coordinates before adding its listings to the map.'],
  'sf-chronicle': ['The San Francisco Chronicle provides regional arts, entertainment, and event coverage.', 'We query its public Evvnt calendar for each day, verify event dates and venue coordinates, and require complete results before recording coverage.'],
  'ingleside-light': ['A neighborhood publication covering Ingleside and surrounding communities, including things-to-do roundups.', 'Planned: individual event dates and locations need to be extracted and checked separately from article publication dates.'],
  'richmond-sunset-news': ['Neighborhood coverage from the Richmond Review and Sunset Beacon, including community activities on the west side of the city.', 'Planned: we are identifying reliable event listings and verifying dates and locations.'],
  'marina-times': ['A neighborhood publication with arts, culture, and calendar coverage for San Francisco’s northern neighborhoods.', 'Planned: current event coverage and the freshness of calendar entries need verification.'],
  'civic-joy-fund': ['A community organization supporting public celebrations and neighborhood activities in San Francisco.', 'We read the public Google Calendar behind its website, including recurring dates and exceptions. Linked organizer records verify cleanup meeting points, and city street data verifies festival intersection pins. Reviewed street geometry covers date-specific ValenciaLIVE events.'],
};
export const eventSourceGuide = sources.filter(source => source.approved && !scienceWorkshops.some(place => place.source.id === source.id)).map(source => ({
  id: source.id, name: source.name, url: source.listingUrl, group: source.group, seriesKind: source.seriesKind,
  status: source.enabled ? 'Collecting events' : 'Planned',
  description: descriptions[source.id]?.[0] ?? 'A source selected for local event coverage.',
  collection: descriptions[source.id]?.[1] ?? 'Collection details are being reviewed.',
}));
export const eventSourceGroups = [
  {id: 'publishers', name: 'Publishers and calendars'},
  {id: 'organizers', name: 'Venues and organizers'},
  {id: 'series', name: 'Recurring series'},
].map(group => ({...group, sources: eventSourceGuide.filter(source => source.group === group.id)}));
export const rssSourceGuide = sources.filter(source => source.approved && source.rss).map(source => ({
  id: source.id, name: source.name, ...source.rss,
}));
const operators = [...new Map([...places, ...museums, ...scienceWorkshops].map(place => [place.source.id, place.source])).values()];
export const placeSourceGuide = operators.map(source => ({...source,
  status: 'Curated schedule',
  description: descriptions[source.id]?.[0] ?? (source.id === 'gggp'
    ? 'Official admission and hours for the San Francisco Botanical Garden, Japanese Tea Garden, and Conservatory of Flowers.'
    : 'Official museum ticketing information, including its first-Sunday free general admission program.'),
  collection: descriptions[source.id]?.[1] ?? 'We maintain a reviewed schedule with eligibility, opening days, last entry, known closures, and a review expiry. Check the official page for current restrictions and tickets.',
}));
export const mapSourceGuide = [{id:'openstreetmap',name:'OpenStreetMap',url:'https://www.openstreetmap.org/copyright',status:'Map data',description:'Community-maintained geographic data provides our background map.',collection:'The browser requests only the map tiles needed for interactive viewing and uses normal HTTP caching. Attribution stays visible. Automated tests use local tiles instead of the community service.'}];
export const sourceGuide = [...eventSourceGuide, ...placeSourceGuide, ...mapSourceGuide];
