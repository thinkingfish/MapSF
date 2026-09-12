import { farmersMarkets } from '../../config/farmers-markets.mjs';
import { geometryBounds } from '../client/view-model.mjs';

const titleKey = value => value.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const identities = farmersMarkets.map(market=>({
  id:market.id, titles:new Set([market.name,...market.aliases].map(titleKey)),
  bounds:geometryBounds(market.geometry),
}));

// Exact reviewed market name/alias and same start instant are required. A
// performance "at" a market is not the market itself. Venue pins may differ
// from route/area geometry; require the candidate extent within the venue plus
// a small geocoding allowance (~90–110 m), not merely the same neighbourhood.
export function marketOccurrenceKey(event) {
  const title=titleKey(event.title), [[west,south],[east,north]]=geometryBounds(event.curation.geometry);
  const market=identities.find(m=>m.titles.has(title)
    && west>=m.bounds[0][0]-0.001 && east<=m.bounds[1][0]+0.001
    && south>=m.bounds[0][1]-0.001 && north<=m.bounds[1][1]+0.001);
  return market ? `market:${market.id}:${Date.parse(event.startAt)}` : null;
}
