import test from 'node:test';
import assert from 'node:assert/strict';
import { geometryIntersectsNeighborhood } from '../src/lib/neighborhoods.mjs';
import { filterEvents, geometryBounds } from '../src/client/view-model.mjs';
const ring=[[0,0],[4,0],[4,4],[0,4],[0,0]];
const polygon={type:'Polygon',coordinates:[ring,[[1,1],[3,1],[3,3],[1,3],[1,1]]]};
const point=coordinates=>({type:'Point',coordinates});
test('neighborhood points respect holes, concave edges and inclusive boundaries',()=>{
 assert.ok(geometryIntersectsNeighborhood(point([0,2]),polygon));
 assert.ok(geometryIntersectsNeighborhood(point([1,2]),polygon));
 assert.ok(!geometryIntersectsNeighborhood(point([2,2]),polygon));
 assert.ok(!geometryIntersectsNeighborhood(point([5,2]),polygon));
 const triangle={type:'Polygon',coordinates:[[[0,0],[4,0],[0,4],[0,0]]]};
 assert.ok(!geometryIntersectsNeighborhood(point([3,3]),triangle));
});
test('routes crossing a neighborhood count even with endpoints outside',()=>{
 assert.ok(geometryIntersectsNeighborhood({type:'LineString',coordinates:[[-1,0.5],[5,0.5]]},polygon));
 assert.ok(!geometryIntersectsNeighborhood({type:'LineString',coordinates:[[1.5,2],[2.5,2]]},polygon));
 assert.ok(!geometryIntersectsNeighborhood({type:'LineString',coordinates:[[-1,5],[5,5]]},polygon));
});
test('areas match edge intersections and either containment direction, respecting holes',()=>{
 const area=ring=>({type:'Polygon',coordinates:[ring]});
 assert.ok(geometryIntersectsNeighborhood(area([[-1,-1],[5,-1],[5,5],[-1,5],[-1,-1]]),polygon));
 assert.ok(geometryIntersectsNeighborhood(area([[0.1,0.1],[0.5,0.1],[0.5,0.5],[0.1,0.1]]),polygon));
 assert.ok(!geometryIntersectsNeighborhood(area([[1.2,1.2],[2,1.2],[2,2],[1.2,1.2]]),polygon));
});
test('multipart neighborhoods include islands and bounds fit all parts',()=>{
 const multi={type:'MultiPolygon',coordinates:[[ring],[[[7,7],[8,7],[8,8],[7,8],[7,7]]]]};
 assert.ok(geometryIntersectsNeighborhood(point([7.5,7.5]),multi));
 assert.ok(!geometryIntersectsNeighborhood(point([5,5]),multi));
 assert.deepEqual(geometryBounds(multi),[[0,0],[8,8]]);
});
test('neighborhood, price, source and viewport filters compose for events and free places',()=>{
 const event=(id,coordinates,recurring=false)=>({id,recurring,source:{id:'a'},cost:{isFree:true},curation:{geometry:point(coordinates)}});
 const events=[event('inside',[0.5,0.5]),event('hole',[2,2]),event('place',[0.5,0.5],true)];
 assert.deepEqual(filterEvents(events,{neighborhood:polygon}).map(e=>e.id),['inside','place']);
 assert.deepEqual(filterEvents(events,{neighborhood:polygon,excludedSourceIds:['a']}).map(e=>e.id),['place']);
 assert.equal(filterEvents(events,{neighborhood:polygon,mapBounds:[[3,3],[4,4]]}).length,0);
 events[0].cost.isFree=false;
 assert.deepEqual(filterEvents(events,{neighborhood:polygon,freeOnly:true}).map(e=>e.id),['place']);
});

test('shipped official layouts retain valid multipart geometry and unique IDs',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {validateNeighborhoodCollection}=await import('../src/lib/neighborhoods.mjs');
 for(const [layout,count] of [['analysis',41],['notification',37],['311',117],['election',26]]){
  const data=JSON.parse(await readFile(new URL(`../public/neighborhoods/${layout}.geojson`,import.meta.url),'utf8'));
  assert.equal(data.features.length,count);assert.ok(validateNeighborhoodCollection(data),layout);
 }
 assert.ok(!validateNeighborhoodCollection({type:'FeatureCollection',features:[]}));
});
test('multipart meadow events can intersect one part of a neighborhood',()=>{
 const meadow={type:'MultiPolygon',coordinates:[[[[0.1,0.1],[0.5,0.1],[0.5,0.5],[0.1,0.1]]],[[[8,8],[9,8],[9,9],[8,8]]]]};
 assert.ok(geometryIntersectsNeighborhood(meadow,polygon));
});

test('approved event areas partition all 41 source neighborhoods exactly once',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {validateNeighborhoodCollection}=await import('../src/lib/neighborhoods.mjs');
 const groups=JSON.parse(await readFile(new URL('../config/event-areas.json',import.meta.url)));
 const areas=JSON.parse(await readFile(new URL('../public/neighborhoods/event-areas.geojson',import.meta.url)));
 const source=JSON.parse(await readFile(new URL('../public/neighborhoods/analysis.geojson',import.meta.url)));
 assert.equal(groups.length,15);assert.equal(areas.features.length,15);assert.ok(validateNeighborhoodCollection(areas));
 assert.deepEqual(groups.flatMap(g=>g.members).sort(),source.features.map(f=>f.properties.name).sort());
 assert.deepEqual(groups.find(g=>g.name==='Bayview–Hunters Point').members,['Bayview Hunters Point']);
 assert.deepEqual(groups.find(g=>g.name==='Glen Park & Excelsior').members,['Glen Park','Outer Mission','Excelsior']);
 assert.deepEqual(groups.find(g=>g.name==='Portola, McLaren Park & Visitacion Valley').members,['Portola','McLaren Park','Visitacion Valley']);
});

test('dissolving approved groups preserves the combined source area',async()=>{
 const {readFile}=await import('node:fs/promises');
 const read=async path=>JSON.parse(await readFile(new URL(path,import.meta.url)));
 const groups=await read('../config/event-areas.json'),source=await read('../public/neighborhoods/analysis.geojson'),areas=await read('../public/neighborhoods/event-areas.geojson');
 const ringArea=ring=>{const [ox,oy]=ring[0];let sum=0;for(let i=1;i<ring.length;i++)sum+=(ring[i-1][0]-ox)*(ring[i][1]-oy)-(ring[i][0]-ox)*(ring[i-1][1]-oy);return Math.abs(sum/2);};
 const area=g=>(g.type==='MultiPolygon'?g.coordinates:[g.coordinates]).reduce((sum,p)=>sum+ringArea(p[0])-p.slice(1).reduce((s,r)=>s+ringArea(r),0),0);
 for(const group of groups){const expected=source.features.filter(f=>group.members.includes(f.properties.name)).reduce((sum,f)=>sum+area(f.geometry),0);const actual=area(areas.features.find(f=>f.properties.name===group.name).geometry);assert.ok(Math.abs(actual-expected)<expected*1e-7,group.name);}
});
