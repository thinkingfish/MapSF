import { festivities } from '../../config/festivities.mjs';
import { geometryBounds } from '../client/view-model.mjs';
const titleKey=value=>value.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const identities=festivities.filter(f=>f.geometry).map(f=>({id:f.id,titles:new Set([f.name,...f.aliases].map(titleKey)),bounds:geometryBounds(f.geometry)}));
// Exact event names, start instants and nearby geometry only. Performances,
// after-parties and workshops mentioning the festival are separate events.
export function festivityOccurrenceKey(event){
 const title=titleKey(event.title),[[west,south],[east,north]]=geometryBounds(event.curation.geometry);
 const festival=identities.find(f=>f.titles.has(title)&&west>=f.bounds[0][0]-0.001&&east<=f.bounds[1][0]+0.001&&south>=f.bounds[0][1]-0.001&&north<=f.bounds[1][1]+0.001);
 return festival?`festivity:${festival.id}:${Date.parse(event.startAt)}`:null;
}
