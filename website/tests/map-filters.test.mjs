import test from 'node:test';
import assert from 'node:assert/strict';
import {filterEvents, geometryIntersectsBounds} from '../src/client/view-model.mjs';
const bounds = [[0,0],[2,2]];
const line = coordinates => ({type:'LineString',coordinates});
const polygon = coordinates => ({type:'Polygon',coordinates});
test('map region includes points on edges and routes crossing without an inside vertex', () => {
  assert.equal(geometryIntersectsBounds({type:'Point',coordinates:[0,1]},bounds),true);
  assert.equal(geometryIntersectsBounds(line([[-1,1],[3,1]]),bounds),true);
  assert.equal(geometryIntersectsBounds(line([[-2,1],[1,4]]),bounds),false);
});
test('map region includes enclosing areas but excludes polygon holes', () => {
  const outer=[[-3,-3],[5,-3],[5,5],[-3,5],[-3,-3]];
  assert.equal(geometryIntersectsBounds(polygon([outer]),bounds),true);
  const hole=[[-1,-1],[-1,3],[3,3],[3,-1],[-1,-1]];
  assert.equal(geometryIntersectsBounds(polygon([outer,hole]),bounds),false);
  assert.equal(geometryIntersectsBounds(polygon([[[1,1],[3,1],[3,3],[1,3],[1,1]]]),bounds),true);
});
test('source, price and region filters combine', () => {
  const make=(id,source,isFree,coordinates)=>({id,source:{id:source},cost:{isFree},curation:{geometry:{type:'Point',coordinates}}});
  const events=[make('match','a',true,[1,1]),make('paid','a',false,[1,1]),make('other','b',true,[1,1]),make('outside','a',true,[4,4])];
  assert.deepEqual(filterEvents(events,{sourceIds:['a'],freeOnly:true,mapBounds:bounds}).map(e=>e.id),['match']);
  assert.deepEqual(filterEvents(events,{sourceIds:['a','b'],freeOnly:true,mapBounds:bounds}).map(e=>e.id),['match','other']);
  assert.equal(filterEvents(events).length,4);
});
