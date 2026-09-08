import { freeEventVenues, publicStreetEvent, excludedStreetEvent } from '../../config/free-event-venues.mjs';
const normalized = value => String(value || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
export function applyVenuePriceHint(event) {
  if (event.recurring) return event;
  const cost = event.cost.inferredFromVenue ? {label:'Cost not listed',isFree:false} : event.cost;
  if (cost.isFree || cost.hasExplicitPrice || cost.label !== 'Cost not listed') return event;
  const venue = normalized(event.curation?.properties?.name);
  let hint = freeEventVenues.find(rule => rule.names.some(name => normalized(name) === venue));
  const geometry = event.curation?.geometry?.type;
  const streetVenue = /\b(street|st|avenue|ave|boulevard|blvd|road|rd|blocks?)\b/i.test(venue);
  if (!hint && publicStreetEvent.test(event.title || '') && !excludedStreetEvent.test(event.title || '')
    && (geometry === 'LineString' || geometry === 'Polygon' || streetVenue)) hint = {id:'public-street-event'};
  if (hint) return {...event,cost:{label:'Free',isFree:true,inferredFromVenue:hint.id}};
  return event.cost.inferredFromVenue ? {...event,cost} : event;
}
