import test from 'node:test';
import assert from 'node:assert/strict';
import {applyVenuePriceHint} from '../src/lib/venue-pricing.mjs';
import {filterEvents} from '../src/client/view-model.mjs';
import {scheduledPlacesForDay} from '../src/lib/places.mjs';
const event=(name,cost={label:'Cost not listed',isFree:false})=>({source:{id:'test'},cost,curation:{properties:{name}}});
test('Dolores Park is a missing-price hint, not a generated destination',()=>{
 const result=applyVenuePriceHint(event('Dolores Park'));
 assert.equal(result.cost.isFree,true);assert.equal(result.cost.inferredFromVenue,'mission-dolores-park');
 assert.equal(filterEvents([result],{freeOnly:true}).length,1);
 assert.equal(scheduledPlacesForDay('2026-09-07').some(e=>e.title==='Mission Dolores Park'),false);
});
test('venue defaults preserve explicit prices and do not match nearby venues',()=>{
 const paid=event('Mission Dolores Park',{label:'USD 20',isFree:false});
 assert.equal(applyVenuePriceHint(paid),paid);
 const nearby=event('Dolores Park Cafe');assert.equal(applyVenuePriceHint(nearby),nearby);
});

test('library branches, city parks and named GGP meadows receive missing-price defaults',()=>{
 for(const name of ['SF Public Library','San Francisco Main Public Library','Marina Branch Library','Washington Square','Precita Park','Golden Gate Park - Lindley Meadow']) assert.equal(applyVenuePriceHint(event(name)).cost.isFree,true,name);
 for(const name of ['Golden Gate Park','Japanese Tea Garden','Golden Gate Park Botanical Garden','de Young Museum','California Academy of Sciences','Hamilton Rec Center']) assert.equal(applyVenuePriceHint(event(name)).cost.isFree,false,name);
});
test('public street celebrations can be free without treating every route as free',()=>{
 const street=(title,cost)=>({...event('Valencia Street',cost),title,curation:{properties:{name:'Valencia Street'},geometry:{type:'LineString'}}});
 assert.equal(applyVenuePriceHint(street('Valencia Live!')).cost.isFree,true);
 assert.equal(applyVenuePriceHint(street('Valencia Street walking tour')).cost.isFree,false);
 assert.equal(applyVenuePriceHint(street('Street festival',{label:'USD 12',isFree:false})).cost.isFree,false);
 assert.equal(applyVenuePriceHint(event('Main Library',{label:'Cost not listed',isFree:false,hasExplicitPrice:true})).cost.isFree,false);
});

test('event publisher selections do not filter recurring Free Places',()=>{
 const recurring={...event('Garden'),source:{id:'garden-provider'},recurring:true,cost:{label:'Free',isFree:true}};
 assert.equal(filterEvents([recurring],{sourceIds:['sfpl']}).length,1);
});
