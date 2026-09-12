import test from 'node:test';
import assert from 'node:assert/strict';
import {filterEvents, geometryIntersectsBounds, geometryBounds} from '../src/client/view-model.mjs';
const bounds = [[0,0],[2,2]];
const line = coordinates => ({type:'LineString',coordinates});
const polygon = coordinates => ({type:'Polygon',coordinates});
test('disconnected areas retain gaps and holes in viewport filtering and bounds', () => {
  const geometry={type:'MultiPolygon',coordinates:[
    [[[-3,-3],[5,-3],[5,5],[-3,5],[-3,-3]],[[-1,-1],[-1,3],[3,3],[3,-1],[-1,-1]]],
    [[[10,0],[12,0],[12,2],[10,2],[10,0]]],
  ]};
  assert.deepEqual(geometryBounds(geometry),[[-3,-3],[12,5]]);
  assert.equal(geometryIntersectsBounds(geometry,bounds),false);
  assert.equal(geometryIntersectsBounds(geometry,[[6,0],[8,2]]),false);
  assert.equal(geometryIntersectsBounds(geometry,[[10.5,0.5],[11,1]]),true);
});
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
  assert.deepEqual(filterEvents(events,{excludedSourceIds:['b'],freeOnly:true,mapBounds:bounds}).map(e=>e.id),['match']);
  assert.deepEqual(filterEvents(events,{excludedSourceIds:[],freeOnly:true,mapBounds:bounds}).map(e=>e.id),['match','other']);
  assert.equal(filterEvents(events).length,4);
});

test('source exclusions remove publishers without hiding Free Places or newly seen publishers', () => {
 const events=[{id:'a',source:{id:'a'},cost:{isFree:true}},{id:'b',source:{id:'b'},cost:{isFree:true}},
   {id:'place',source:{id:'a'},recurring:true,cost:{isFree:true}}];
 assert.deepEqual(filterEvents(events,{excludedSourceIds:['a']}).map(e=>e.id),['b','place']);
 assert.deepEqual(filterEvents(events,{excludedSourceIds:['a','b']}).map(e=>e.id),['place']);
});
